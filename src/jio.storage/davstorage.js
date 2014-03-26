/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint indent: 2, maxlen: 80, nomen: true, regexp: true, unparam: true */
/*global define, window, jIO, RSVP, btoa, DOMParser, Blob */

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
  module(window.dav_storage, RSVP, jIO);
}(['exports', 'rsvp', 'jio'], function (exports, RSVP, jIO) {
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
      attachment_id = secureName(attachment_id);
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
    /*jslint regexp: true */
    file_name = /^((?:_\.|[^\.])*)(?:\.(.*))?$/.exec(file_name);
    if (file_name === null ||
        (file_name[1] &&
         file_name[1].length === 0)) {
      return [];
    }
    if (file_name[2]) {
      if (file_name[2].length > 0) {
        return [restoreName(file_name[1].replace(/_\./g, '.')),
                restoreName(file_name[2])];
      }
      return [];
    }
    return [restoreName(file_name[1].replace(/_\./g, '.'))];
  }

  function promiseSucceed(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      promise.then(resolve, reject, notify);
    }, function () {
      promise.cancel();
    });
  }

  /**
   * An ajax object to do the good request according to the auth type
   */
  var ajax = {
    "none": function (method, type, url, data) {
      var headers = {};
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
          "response": JSON.parse(e.target.responseText)
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
        e.target.responseText,
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
    var that = this, o = {
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
        that._put(metadata).then(o.success, o.reject, o.notifyProgress);
      },
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
        that._put(metadata).then(o.success, o.reject, o.notifyProgress);
      },
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

    this._get(metadata).then(
      method === 'post' ? o.errorDocumentExists : o.putMetadata,
      o.putMetadataIfPossible,
      o.notifyProgress
    );
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
    var that = this, o = {
      error_message: "DavStorage unable to put attachment",
      percentage: [0, 30],
      notify_message: "Getting metadata",
      notifyProgress: function (e) {
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
        return RSVP.all([
          that._putAttachment(param),
          jIO.util.readBlobAsBinaryString(param._blob)
        ]).then(null, null, function (e) {
          // propagate only putAttachment progress
          if (e.index === 0) {
            return e.value;
          }
          throw null;
        });
      },
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
        return that._put(o.remote_metadata);
      },
      success: function (e) {
        command.success(e.target.status, {
          "digest": o.remote_metadata._attachments[param._attachment].digest
        });
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
      then(o.success, o.reject, o.notifyProgress);
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

    this._get(param).then(o.success, o.reject, o.notifyGetProgress);
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
    var that = this, o = {
      error_message: "DavStorage, unable to get attachment.",
      percentage: [0, 30],
      notify_message: "Getting metedata",
      "404": "missing document", // Not Found
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
        delete o["404"];
        if (typeof attachment !== 'object' || attachment === null) {
          throw {"target": {
            "status": 404,
            "statusText": "missing attachment"
          }};
        }
        o.type = attachment.content_type || "application/octet-stream";
        o.notify_message = "Retrieving attachment";
        o.percentage = [30, 100];
        o.digest = attachment.digest;
        return that._getAttachment(param);
      },
      success: function (e) {
        command.success(e.target.status, {
          "data": new Blob([e.target.response], {"type": o.type}),
          "digest": o.digest
        });
      },
      reject: function (e) {
        command.reject(
          e.target.status,
          o[e.target.status] || e.target.statusText,
          o.error_message
        );
      }
    };

    this._get(param).
      then(o.getAttachment).
      then(o.success, o.reject, o.notifyProgress);
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
    var that = this, o = {
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
        return that._remove(param);
      },
      removeAllAttachments: function (e) {
        var k, requests = [], attachments;
        attachments = o.get_result.target.response._attachments;
        o.remove_result = e;
        if (typeof attachments === 'object' && attachments !== null) {
          for (k in attachments) {
            if (attachments.hasOwnProperty(k)) {
              requests[requests.length] = promiseSucceed(
                that._removeAttachment({
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
        return RSVP.all(requests).then(null, null, function (e) {
          if (e.value.loaded === e.value.total) {
            o.count += 1;
            command.notify({
              "method": "remove",
              "message": "Removing all associated attachments",
              "loaded": o.count,
              "total": o.nb_requests,
              "percentage": Math.min(
                o.count / o.nb_requests * 20 + 80,
                100
              )
            });
          }
          return null;
        });
      },
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
      then(o.success, o.reject, o.notifyProgress);
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
    var that = this, o = {
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
        return that._put(doc);
      },
      removeAttachment: function () {
        o.percentage = [80, 100];
        o.notify_message = "Removing attachment";
        o.error_message = "DavStorage, an error occured " +
          "while removing attachment.";
        return that._removeAttachment(param);
      },
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
      then(o.success, o.reject, o.notifyProgress);
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
    var that = this, o = {
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

        e.target.response.rows.forEach(function (row) {
          requests[requests.length] = that._get({"_id": row.id}).
            then(function (e) {
              row.doc = e.target.response;
            });
        });

        o.count = 0;
        o.nb_requests = requests.length;
        o.error_message = "DavStorage, an error occured while " +
          "getting document metadata";
        return RSVP.all(requests).then(null, null, function (e) {
          if (e.value.loaded === e.value.total) {
            o.count += 1;
            command.notify({
              "method": "allDocs",
              "message": "Getting all documents metadata",
              "loaded": o.count,
              "total": o.nb_requests,
              "percentage": Math.min(
                o.count / o.nb_requests * 80 + 20,
                100
              )
            });
          }
          throw null;
        });
      },
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
      then(o.success, o.reject, o.notifyProgress);
  };

  /**
   * Check the storage or a specific document
   *
   * @method check
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  DavStorage.prototype.check = function (command, param) {
    this.genericRepair(command, param, false);
  };

  /**
   * Repair the storage or a specific document
   *
   * @method repair
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  DavStorage.prototype.repair = function (command, param) {
    this.genericRepair(command, param, true);
  };

  /**
   * A generic method that manage check or repair command
   *
   * @method genericRepair
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Boolean} repair If true then repair else just check
   */
  DavStorage.prototype.genericRepair = function (command, param, repair) {

    var that = this, repair_promise;

    // returns a jio object
    function getAllFile() {
      return ajax[that._auth_type](
        "PROPFIND",
        "text",
        that._url + '/',
        null,
        that._login
      ).then(function (e) { // on success
        var i, length, rows = new DOMParser().parseFromString(
          e.target.responseText,
          "text/xml"
        ).querySelectorAll(
          "D\\:response, response"
        );
        if (rows.length === 1) {
          return {"status": 200, "data": []};
        }
        // exclude parent folder and browse
        rows = [].slice.call(rows);
        rows.shift();
        length = rows.length;
        for (i = 0; i < length; i += 1) {
          rows[i] = rows[i].querySelector("D\\:href, href").
            textContent.split('/').slice(-1)[0];
        }
        return {"data": rows, "status": 200};
        // rows -> [
        //   'file_path_1',
        //   ...
        // ]
      }, function (e) { // on error
        // convert into jio error object
        // then propagate
        throw {"status": e.target.status,
               "reason": e.target.statusText};
      });
    }

    // returns jio object
    function repairOne(shared, repair) {
      var modified = false, document_id = shared._id;
      return that._get({"_id": document_id}).then(function (event) {
        var attachment_id, metadata = event.target.response;

        // metadata should be an object
        if (typeof metadata !== 'object' || metadata === null ||
            Array.isArray(metadata)) {
          if (!repair) {
            throw {
              "status": "conflict",
              "reason": "corrupted",
              "message": "Bad metadata found in document \"" +
                document_id + "\""
            };
          }
          return {};
        }

        // check metadata content
        if (!repair) {
          if (!(new jIO.Metadata(metadata).check())) {
            return {
              "status": "conflict",
              "reason": "corrupted",
              "message": "Some metadata might be lost"
            };
          }
        } else {
          modified = (
            jIO.util.uniqueJSONStringify(metadata) !==
              jIO.util.uniqueJSONStringify(
                new jIO.Metadata(metadata).format()._dict
              )
          );
        }

        // check metadata id
        if (metadata._id !== document_id) {
          // metadata id is different than file
          // this is not a critical thing
          modified = true;
          metadata._id = document_id;
        }

        // check attachment metadata container
        if (metadata._attachments &&
            (typeof metadata._attachments !== 'object' ||
             Array.isArray(metadata._attachments))) {
          // is not undefined nor object
          if (!repair) {
            throw {
              "status": "conflict",
              "reason": "corrupted",
              "message": "Bad attachment metadata found in document \"" +
                document_id + "\""
            };
          }
          delete metadata._attachments;
          modified = true;
        }

        // check every attachment metadata
        if (metadata._attachments) {
          for (attachment_id in metadata._attachments) {
            if (metadata._attachments.hasOwnProperty(attachment_id)) {
              // check attachment metadata type
              if (typeof metadata._attachments[attachment_id] !== 'object' ||
                  metadata._attachments[attachment_id] === null ||
                  Array.isArray(metadata._attachments[attachment_id])) {
                // is not object
                if (!repair) {
                  throw {
                    "status": "conflict",
                    "reason": "corrupted",
                    "message": "Bad attachment metadata found in document \"" +
                      document_id + "\", attachment \"" +
                      attachment_id + "\""
                  };
                }
                metadata._attachments[attachment_id] = {};
                modified = true;
              }
              // check attachment existency if all attachment are listed
              if (shared.referenced_dict) {
                if (shared.unreferenced_dict[metadata._id] &&
                    shared.unreferenced_dict[metadata._id][attachment_id]) {
                  // attachment seams to exist but is not referenced
                  shared.referenced_dict[metadata._id] =
                    shared.referenced_dict[metadata._id] || {};
                  shared.referenced_dict[metadata._id][attachment_id] = true;
                  delete shared.unreferenced_dict[metadata._id][attachment_id];
                } else if (
                  !(shared.referenced_dict[metadata._id] &&
                    shared.referenced_dict[metadata._id][attachment_id])
                ) {
                  // attachment doesn't exist, remove attachment id
                  if (!repair) {
                    throw {
                      "status": "conflict",
                      "reason": "attachment missing",
                      "message": "Attachment \"" +
                        attachment_id + "\" from document \"" +
                        document_id + "\" is missing"
                    };
                  }
                  delete metadata._attachments[attachment_id];
                  modified = true;
                }
              }
            }
          }
        }
        return {
          "modified": modified,
          "metadata": metadata
        };
      }, function (event) { // on error
        // convert into jio error object
        // then propagate
        throw {"status": event.target.status,
               "reason": event.target.statustext};
      }).then(function (dict) {
        if (dict.modified) {
          return this._put(dict.metadata);
        }
        return null;
      }).then(function () {
        return "no_content";
      });
    }

    // returns jio object
    function repairAll(shared, repair) {
      return getAllFile().then(function (answer) {
        var index, data = answer.data, length = data.length, id_list,
          document_list = [];
        for (index = 0; index < length; index += 1) {
          // parsing all files
          id_list = fileNameToIds(data[index]);
          if (id_list.length === 1) {
            // this is a document
            document_list[document_list.length] = id_list[0];
          } else if (id_list.length === 2) {
            // this is an attachment
            // reference it
            shared.unreferenced_dict[id_list[0]] =
              shared.unreferenced_dict[id_list[0]] || {};
            shared.unreferenced_dict[id_list[0]][id_list[1]] = true;
          } else {
            shared.unknown_file_list.push(data[index]);
          }
        }
        length = document_list.length;
        for (index = 0; index < length; index += 1) {
          shared._id = document_list[index];
          document_list[index] = repairOne(shared, repair);
        }

        function removeFile(name) {
          return ajax[that._auth_type](
            "DELETE",
            null,
            that._url + '/' + name + "?_=" + Date.now(),
            null,
            that._login
          );
        }

        function errorEventConverter(event) {
          throw {"status": event.target.status,
                 "reason": event.target.statusText};
        }

        length = shared.unknown_file_list.length;
        for (index = 0; index < length; index += 1) {
          document_list.push(
            removeFile(shared.unknown_file_list[index]).
              then(null, errorEventConverter)
          );
        }

        return RSVP.all(document_list);
      }).then(function () {
        return "no_content";
      });
    }

    if (typeof param._id === 'string') {
      repair_promise = repairOne(param, repair);
    } else {
      param.referenced_attachment_path_dict = {};
      param.unreferenced_attachment_path_dict = {};
      param.unknown_file_list = [];
      repair_promise = repairAll(param, repair);
    }

    repair_promise.then(command.success, command.error, command.notify);

  };

  jIO.addStorage('dav', DavStorage);

}));
