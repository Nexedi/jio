/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint indent: 2, maxlen: 80, nomen: true, regexp: true, unparam: true */
/*global define, window, jIO, promy, btoa, DOMParser */

// JIO Dav Storage Description :
// {
//   type: "dav",
//   url: {string}
//   // No Authentication Here
// }

// {
//   type: "dav",
//   url: {string},
//   basic_login: {string} // Basic authentication
// }

// NOTE: to get the authentication type ->
// curl --verbose  -X OPTION http://domain/
// In the headers: "WWW-Authenticate: Basic realm="DAV-upload"

// URL Characters convertion:
// If I want to retrieve the file which id is -> http://100%.json
// http://domain/collection/http://100%.json cannot be applied
// - '/' is col separator,
// - '?' is url/parameter separator
// - '%' is special char
// - '.' document and attachment separator
// http://100%.json will become
// - http:%2F%2F100%25.json to avoid bad request ('/', '%' -> '%2F', '%25')
// - http:%2F%2F100%25_.json to avoid ids conflicts ('.' -> '_.')
// - http:%252F%252F100%2525_.json to avoid request bad interpretation
//   ('%', '%25')
// The file will be saved as http:%2F%2F100%25_.json

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  window.dav_storage = {};
  module(window.dav_storage, promy, jIO);
}(['exports', 'promy', 'jio'], function (exports, promy, jIO) {
  "use strict";

  /**
   * Removes the last character if it is a "/". "/a/b/c/" become "/a/b/c"
   *
   * @param  {String} string The string to modify
   * @return {String} The modified string
   */
  function removeLastSlashes(string) {
    return string.replace(/\/*$/, '');
  }

  /**
   * Tool to create a ready to use JIO storage description for Dav Storage
   *
   * @param  {String} url The url
   * @param  {String} [auth_type] The authentication type: 'none', 'basic' or
   *   'digest'
   * @param  {String} [realm] The realm
   * @param  {String} [username] The username
   * @param  {String} [password] The password
   * @return {Object} The dav storage description
   */
  function createDescription(url, auth_type, realm, username, password) {
    if (typeof url !== 'string') {
      throw new TypeError("dav_storage.createDescription(): URL: " +
                          "Argument 1 is not of type string");
    }

    function checkUserAndPwd(username, password) {
      if (typeof username !== 'string') {
        throw new TypeError("dav_storage.createDescription(): Username: " +
                            "Argument 4 is not of type string");
      }
      if (typeof password !== 'string') {
        throw new TypeError("dav_storage.createDescription(): Password: " +
                            "Argument 5 is not of type string");
      }
    }

    switch (auth_type) {
    case 'none':
      return {
        "type": "dav",
        "url": removeLastSlashes(url)
      };
    case 'basic':
      checkUserAndPwd(username, password);
      return {
        "type": "dav",
        "url": removeLastSlashes(url),
        "basic_login": btoa(username + ":" + password)
      };
    case 'digest':
      // XXX
      realm.toString();
      throw new Error("Not Implemented");
    default:
      throw new TypeError("dav_storage.createDescription(): " +
                          "Authentication type: " +
                          "Argument 2 is not 'none', 'basic' nor 'digest'");
    }
  }
  exports.createDescription = createDescription;

  /**
   * Changes spaces to %20, / to %2f, % to %25 and ? to %3f
   *
   * @param  {String} name The name to secure
   * @return {String} The secured name
   */
  function secureName(name) {
    return encodeURI(name).replace(/\//g, '%2F').replace(/\?/g, '%3F');
  }

  /**
   * Restores the original name from a secured name
   *
   * @param  {String} secured_name The secured name to restore
   * @return {String} The original name
   */
  function restoreName(secured_name) {
  return decodeURI(secured_name.replace(/%3F/ig, '?').replace(/%2F/ig, '/'));
  }

  /**
   * Convert document id and attachment id to a file name
   *
   * @param  {String} doc_id The document id
   * @param  {String} attachment_id The attachment id (optional)
   * @return {String} The file name
   */
  function idsToFileName(doc_id, attachment_id) {
    doc_id = secureName(doc_id).replace(/\./g, '_.');
    if (typeof attachment_id === "string") {
      attachment_id = secureName(attachment_id).replace(/\./g, '_.');
      return doc_id + "." + attachment_id;
    }
    return doc_id;
  }

  /**
   * Convert a file name to a document id (and attachment id if there)
   *
   * @param  {String} file_name The file name to convert
   * @return {Array} ["document id", "attachment id"] or ["document id"]
   */
  function fileNameToIds(file_name) {
    return file_name.replace(/.\.(?:\.)?/g, function (substr) {
      if (substr[0] === '_') {
        if (substr[2] === '.') {
          return '. ';
        }
        return '.';
      }
      return substr[0] + ' ';
    }).split(' ').map(restoreName);
  }

  function promiseSucceed(promise) {
    var deferred = new promy.Deferred();
    promise.then(
      deferred.resolve.bind(deferred),
      deferred.resolve.bind(deferred),
      deferred.notify.bind(deferred)
    );
    return deferred.promise;
  }

  /**
   * An ajax object to do the good request according to the auth type
   */
  var ajax = {
    "none": function (method, type, url, data) {
      var headers;
      if (method === "PROPFIND") {
        headers.Depth = "1";
      }
      return jIO.util.ajax({
        "type": method,
        "url": url,
        "dataType": type,
        "data": data,
        "headers": headers
      });
    },
    "basic": function (method, type, url, data, login) {
      var headers = {"Authorization": "Basic " + login};
      if (method === "PROPFIND") {
        headers.Depth = "1";
      }
      return jIO.util.ajax({
        "type": method,
        "url": url,
        "dataType": type,
        "data": data,
        "headers": headers
      });
    },
    "digest": function () {
      // XXX
      throw new TypeError("DavStorage digest not implemented");
    }
  };

  /**
   * The JIO WebDAV Storage extension
   *
   * @class DavStorage
   * @constructor
   */
  function DavStorage(spec) {
    if (typeof spec.url !== 'string') {
      throw new TypeError("DavStorage 'url' is not of type string");
    }
    this._url = removeLastSlashes(spec.url);
    // XXX digest login
    if (typeof spec.basic_login === 'string') {
      this._auth_type = 'basic';
      this._login = spec.basic_login;
    } else {
      this._auth_type = 'none';
    }
  }

  DavStorage.prototype._put = function (metadata) {
    return ajax[this._auth_type](
      "PUT",
      "text",
      this._url + '/' + idsToFileName(metadata._id) + "?_=" + Date.now(),
      JSON.stringify(metadata),
      this._login
    );
  };

  DavStorage.prototype._putAttachment = function (param) {
    return ajax[this._auth_type](
      "PUT",
      null,
      this._url + '/' + idsToFileName(param._id, param._attachment) +
        "?_=" + Date.now(),
      param._blob,
      this._login
    );
  };

  DavStorage.prototype._get = function (param) {
    return ajax[this._auth_type](
      "GET",
      "text",
      this._url + '/' + idsToFileName(param._id),
      null,
      this._login
    ).then(function (e) {
      try {
        return {"target": {
          "status": e.target.status,
          "statusText": e.target.statusText,
          "response": JSON.parse(e.target.response)
        }};
      } catch (err) {
        throw {"target": {
          "status": 0,
          "statusText": "Parse error"
        }};
      }
    });
  };

  DavStorage.prototype._getAttachment = function (param) {
    return ajax[this._auth_type](
      "GET",
      "blob",
      this._url + '/' + idsToFileName(param._id, param._attachment),
      null,
      this._login
    );
  };

  DavStorage.prototype._remove = function (param) {
    return ajax[this._auth_type](
      "DELETE",
      null,
      this._url + '/' + idsToFileName(param._id) + "?_=" + Date.now(),
      null,
      this._login
    );
  };

  DavStorage.prototype._removeAttachment = function (param) {
    return ajax[this._auth_type](
      "DELETE",
      null,
      this._url + '/' + idsToFileName(param._id, param._attachment) +
        "?_=" + Date.now(),
      null,
      this._login
    );
  };

  DavStorage.prototype._allDocs = function (param) {
    return ajax[this._auth_type](
      "PROPFIND",
      "text",
      this._url + '/',
      null,
      this._login
    ).then(function (e) {
      var i, rows = [], row, responses = new DOMParser().parseFromString(
        e.target.response,
        "text/xml"
      ).querySelectorAll(
        "D\\:response, response"
      );
      if (responses.length === 1) {
        return {"target": {"response": {
          "total_rows": 0,
          "rows": []
        }, "status": 200}};
      }
      // exclude parent folder and browse
      for (i = 1; i < responses.length; i += 1) {
        row = {
          "id": "",
          "value": {}
        };
        row.id = responses[i].querySelector("D\\:href, href").
          textContent.split('/').slice(-1)[0];
        row.id = fileNameToIds(row.id);
        if (row.id.length !== 1) {
         row = undefined;
        } else {
         row.id = row.id[0];
        }
        if (row !== undefined) {
          rows[rows.length] = row;
        }
      }
      return {"target": {"response": {
        "total_rows": rows.length,
        "rows": rows
      }, "status": 200}};
    });
  };

  // JIO COMMANDS //

  // wedDav methods rfc4918 (short summary)
  // COPY     Reproduces single resources (files) and collections (directory
  //          trees). Will overwrite files (if specified by request) but will
  //          respond 209 (Conflict) if it would overwrite a tree
  // DELETE   deletes files and directory trees
  // GET      just the vanilla HTTP/1.1 behaviour
  // HEAD     ditto
  // LOCK     locks a resources
  // MKCOL    creates a directory
  // MOVE     Moves (rename or copy) a file or a directory tree. Will
  //          'overwrite' files (if specified by the request) but will respond
  //          209 (Conflict) if it would overwrite a tree.
  // OPTIONS  If WebDAV is enabled and available for the path this reports the
  //          WebDAV extension methods
  // PROPFIND Retrieves the requested file characteristics, DAV lock status
  //          and 'dead' properties for individual files, a directory and its
  //          child files, or a directory tree
  // PROPPATCHset and remove 'dead' meta-data properties
  // PUT      Update or create resource or collections
  // UNLOCK   unlocks a resource

  // Notes: all Ajax requests should be CORS (cross-domain)
  // adding custom headers triggers preflight OPTIONS request!
  // http://remysharp.com/2011/04/21/getting-cors-working/

  DavStorage.prototype.postOrPut = function (method, command, metadata) {
    metadata._id = metadata._id || jIO.util.generateUuid();
    var o = {
      error_message: "DavStorage, unable to get metadata.",
      notify_message: "Getting metadata",
      percentage: [0, 30],
      notifyProgress: function (e) {
        command.notify({
          "method": method,
          "message": o.notify_message,
          "loaded": e.loaded,
          "total": e.total,
          "percentage": (e.loaded / e.total) *
            (o.percentage[1] - o.percentage[0]) +
            o.percentage[0]
        });
      },
      putMetadata: function (e) {
        metadata._attachments = e.target.response._attachments;
        o.notify_message = "Updating metadata";
        o.error_message = "DavStorage, unable to update document.";
        o.percentage = [30, 100];
        this._put(metadata).progress(o.notifyProgress).
          done(o.success).fail(o.reject);
      }.bind(this),
      errorDocumentExists: function (e) {
        command.error(
          "conflict",
          "Document exists",
          "DavStorage, cannot overwrite document metadata."
        );
      },
      putMetadataIfPossible: function (e) {
        if (e.target.status !== 404) {
          return command.reject(
            e.target.status,
            e.target.statusText,
            o.error_message
          );
        }
        o.percentage = [30, 100];
        o.notify_message = "Updating metadata";
        o.error_message = "DavStorage, unable to create document.";
        this._put(metadata).progress(o.notifyProgress).
          done(o.success).fail(o.reject);
      }.bind(this),
      success: function (e) {
        command.success(e.target.status, {"id": metadata._id});
      },
      reject: function (e) {
        command.reject(
          e.target.status,
          e.target.statusText,
          o.error_message
        );
      }
    };

    this._get(metadata).progress(o.notifyProgress).
      done(method === 'post' ? o.errorDocumentExists : o.putMetadata).
      fail(o.putMetadataIfPossible);
  };

  /**
   * Creates a new document if not already exists
   *
   * @method post
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to put
   * @param  {Object} options The command options
   */
  DavStorage.prototype.post = function (command, metadata) {
    this.postOrPut('post', command, metadata);
  };


  /**
   * Creates or updates a document
   *
   * @method put
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to post
   * @param  {Object} options The command options
   */
  DavStorage.prototype.put = function (command, metadata) {
    this.postOrPut('put', command, metadata);
  };

  /**
   * Add an attachment to a document
   *
   * @method putAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  DavStorage.prototype.putAttachment = function (command, param) {
    var o = {
      error_message: "DavStorage unable to put attachment",
      percentage: [0, 30],
      notify_message: "Getting metadata",
      notifyProgress: function (e) {
        if (e === null) {
          return;
        }
        command.notify({
          "method": "putAttachment",
          "message": o.notify_message,
          "loaded": e.loaded,
          "total": e.total,
          "percentage": (e.loaded / e.total) *
            (o.percentage[1] - o.percentage[0]) +
            o.percentage[0]
        });
      },
      putAttachmentAndReadBlob: function (e) {
        o.percentage = [30, 70];
        o.notify_message = "Putting attachment";
        o.remote_metadata = e.target.response;
        return promy.join(
          this._putAttachment(param),
          jIO.util.readBlobAsBinaryString(param._blob)
        ).then(null, null, function (e) {
          // propagate only putAttachment progress
          if (e.index === 0) {
            return e.answer;
          }
          return null;
        });
      }.bind(this),
      putMetadata: function (answers) {
        o.percentage = [70, 100];
        o.notify_message = "Updating metadata";
        o.remote_metadata._id = param._id;
        o.remote_metadata._attachments = o.remote_metadata._attachments || {};
        o.remote_metadata._attachments[param._attachment] = {
          "length": param._blob.size,
          "digest": jIO.util.makeBinaryStringDigest(answers[1].target.result),
          "content_type": param._blob.type
        };
        return this._put(o.remote_metadata);
      }.bind(this),
      success: function (e) {
        command.success(e.target.status);
      },
      reject: function (e) {
        command.reject(
          e.target.status,
          e.target.statusText,
          o.error_message
        );
      }
    };

    this._get(param).
      then(o.putAttachmentAndReadBlob).
      then(o.putMetadata).
      done(o.success).fail(o.reject).progress(o.notifyProgress);
  };

  /**
   * Retrieve metadata
   *
   * @method get
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  DavStorage.prototype.get = function (command, param) {
    var o = {
      notifyGetProgress: function (e) {
        command.notify({
          "method": "get",
          "message": "Getting metadata",
          "loaded": e.loaded,
          "total": e.total,
          "percentage": (e.loaded / e.total) * 100 // 0% to 100%
        });
      },
      success: function (e) {
        command.success(e.target.status, {"data": e.target.response});
      },
      reject: function (e) {
        command.reject(
          e.target.status,
          e.target.statusText,
          "DavStorage, unable to get document."
        );
      }
    };

    this._get(param).
      done(o.success).fail(o.reject).progress(o.notifyGetProgress);
  };

  /**
   * Retriev a document attachment
   *
   * @method getAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  DavStorage.prototype.getAttachment = function (command, param) {
    var o = {
      error_message: "DavStorage, unable to get attachment.",
      percentage: [0, 30],
      notify_message: "Getting metedata",
      "Not Found": "missing document",
      notifyProgress: function (e) {
        command.notify({
          "method": "getAttachment",
          "message": o.notify_message,
          "loaded": e.loaded,
          "total": e.total,
          "percentage": (e.loaded / e.total) *
            (o.percentage[1] - o.percentage[0]) +
            o.percentage[0]
        });
      },
      getAttachment: function (e) {
        var attachment = e.target.response._attachments &&
          e.target.response._attachments[param._attachment];
        if (typeof attachment !== 'object' || attachment === null) {
          throw {"target": {
            "status": 404,
            "statusText": "missing attachment"
          }};
        }
        delete o["Not Found"];
        o.notify_message = "Retrieving attachment";
        o.percentage = [30, 100];
        o.digest = attachment.digest;
        return this._getAttachment(param);
      }.bind(this),
      success: function (e) {
        command.success(e.target.status, {
          "data": e.target.response,
          "digest": o.digest
        });
      },
      reject: function (e) {
        command.reject(
          e.target.status,
          o[e.target.statusText] || e.target.statusText,
          o.error_message
        );
      }
    };

    this._get(param).
      then(o.getAttachment).
      done(o.success).fail(o.reject).progress(o.notifyProgress);
  };

  /**
   * Remove a document
   *
   * @method remove
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  DavStorage.prototype.remove = function (command, param) {
    var o = {
      error_message: "DavStorage, unable to get metadata.",
      notify_message: "Getting metadata",
      percentage: [0, 70],
      notifyProgress: function (e) {
        if (e === null) {
          return;
        }
        command.notify({
          "method": "remove",
          "message": o.notify_message,
          "loaded": e.loaded,
          "total": e.total,
          "percentage": (e.loaded / e.total) *
            (o.percentage[1] - o.percentage[0]) + o.percentage[0]
        });
      },
      removeDocument: function (e) {
        o.get_result = e;
        o.percentage = [70, 80];
        o.notify_message = "Removing document";
        o.error_message = "DavStorage, unable to remove document";
        return this._remove(param);
      }.bind(this),
      removeAllAttachments: function (e) {
        var k, requests = [], attachments;
        attachments = o.get_result.target.response._attachments;
        o.remove_result = e;
        if (typeof attachments === 'object' && attachments !== null) {
          for (k in attachments) {
            if (attachments.hasOwnProperty(k)) {
              requests[requests.length] = promiseSucceed(
                this._removeAttachment({
                  "_id": param._id,
                  "_attachment": k
                })
              );
            }
          }
        }
        if (requests.length === 0) {
          return;
        }
        o.count = 0;
        o.nb_requests = requests.length;
        return promy.join.apply(null, requests).then(null, null, function (e) {
          if (e.answer.loaded === e.answer.total) {
            o.count += 1;
            command.notify({
              "method": "remove",
              "message": "Removing all associated attachments",
              "loaded": o.count,
              "total": o.nb_requests,
              "percentage": jIO.util.min(
                o.count / o.nb_requests * 20 + 80,
                100
              )
            });
          }
          return null;
        });
      }.bind(this),
      success: function () {
        command.success(o.remove_result.target.status);
      },
      reject: function (e) {
        return command.reject(
          e.target.status,
          e.target.statusText,
          o.error_message
        );
      }
    };

    this._get(param).
      then(o.removeDocument).
      then(o.removeAllAttachments).
      done(o.success).fail(o.reject).progress(o.notifyProgress);
  };

  /**
   * Remove an attachment
   *
   * @method removeAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  DavStorage.prototype.removeAttachment = function (command, param) {
    var o = {
      error_message: "DavStorage, an error occured while getting metadata.",
      percentage: [0, 40],
      notify_message: "Getting metadata",
      notifyProgress: function (e) {
        command.notify({
          "method": "remove",
          "message": o.notify_message,
          "loaded": e.loaded,
          "total": e.total,
          "percentage": (e.loaded / e.total) *
            (o.percentage[1] - o.percentage[0]) +
            o.percentage[0]
        });
      },
      updateMetadata: function (e) {
        var k, doc = e.target.response, attachment;
        attachment = doc._attachments && doc._attachments[param._attachment];
        o.error_message = "DavStorage, document attachment not found.";
        if (typeof attachment !== 'object' || attachment === null) {
          throw {"target": {
            "status": 404,
            "statusText": "missing attachment"
          }};
        }
        delete doc._attachments[param._attachment];
        for (k in doc._attachments) {
          if (doc._attachments.hasOwnProperty(k)) {
            break;
          }
        }
        if (k === undefined) {
          delete doc._attachments;
        }
        o.percentage = [40, 80];
        o.notify_message = "Updating metadata";
        o.error_message = "DavStorage, an error occured " +
          "while updating metadata.";
        return this._put(doc);
      }.bind(this),
      removeAttachment: function () {
        o.percentage = [80, 100];
        o.notify_message = "Removing attachment";
        o.error_message = "DavStorage, an error occured " +
          "while removing attachment.";
        return this._removeAttachment(param);
      }.bind(this),
      success: function (e) {
        command.success(e.status);
      },
      reject: function (e) {
        return command.reject(
          e.target.status,
          e.target.statusText,
          o.error_message
        );
      }
    };

    this._get(param).
      then(o.updateMetadata).
      then(o.removeAttachment).
      done(o.success).fail(o.reject).progress(o.notifyProgress);
  };

  /**
   * Retrieve a list of present document
   *
   * @method allDocs
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   * @param  {Boolean} [options.include_docs=false]
   *   Also retrieve the actual document content.
   */
  DavStorage.prototype.allDocs = function (command, param, options) {
    var o = {
      error_message: "DavStorage, an error occured while " +
        "retrieving document list",
      max_percentage: options.include_docs === true ? 20 : 100,
      notifyAllDocsProgress: function (e) {
        command.notify({
          "method": "remove",
          "message": "Retrieving document list",
          "loaded": e.loaded,
          "total": e.total,
          "percentage": (e.loaded / e.total) * o.max_percentage
        });
      },
      getAllMetadataIfNecessary: function (e) {
        var requests = [];
        o.alldocs_result = e;
        if (options.include_docs !== true ||
            e.target.response.rows.length === 0) {
          return;
        }

        e.target.response.data.rows.forEach(function (row) {
          requests[requests.length] = this._get({"_id": row.id}).
            done(function (e) {
              row.doc = e.target.response;
            });
        });

        o.count = 0;
        o.nb_requests = requests.length;
        o.error_message = "DavStorage, an error occured while " +
          "getting document metadata";
        return promy.join.apply(null, requests).then(null, null, function (e) {
          if (e.answer.loaded === e.answer.total) {
            o.count += 1;
            command.notify({
              "method": "allDocs",
              "message": "Getting all documents metadata",
              "loaded": o.count,
              "total": o.nb_requests,
              "percentage": jIO.util.min(
                o.count / o.nb_requests * 80 + 20,
                100
              )
            });
          }
          return null;
        });
      }.bind(this),
      success: function () {
        command.success(o.alldocs_result.target.status, {
          "data": o.alldocs_result.target.response
        });
      },
      reject: function (e) {
        return command.reject(
          e.target.status,
          e.target.statusText,
          o.error_message
        );
      }
    };

    this._allDocs(param, options).
      then(o.getAllMetadataIfNecessary).
      done(o.success).fail(o.reject).progress(o.notifyProgress);
  };

  jIO.addStorage('dav', DavStorage);

}));
