/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/

/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, $: true, btoa: true  */

// JIO Dav Storage Description :
// {
//   type: "dav",
//   url: {string}
// }

// {
//   type: "dav",
//   url: {string},
//   auth_type: {string}, (optional)
//     - "auto" (default) (not implemented)
//     - "basic"
//     - "digest" (not implemented)
//   realm: {string}, (optional)
//     - undefined (default) (not implemented)
//     - "<string>" realm name (not implemented)
//   username: {string},
//   password: {string}  (optional)
// }

// {
//   type: "dav",
//   url: {string},
//   encoded_login: {string}
// }

// {
//   type: "dav",
//   url: {string},
//   secured_login: {string} (not implemented)
// }

// NOTE: to get the authentication type ->
// curl --verbose  -X OPTION http://domain/
// In the headers: "WWW-Authenticate: Basic realm="DAV-upload"

// URL Characters convertion:
// If I want to retrieve the file which id is -> http://100%.json
// http://domain/collection/http://100%.json cannot be applied
// - '/' is col separator,
// - '%' is special char
// - '.' document and attachment separator
// http://100%.json will become
// - http:%2F%2F100%25.json to avoid bad request ('/', '%' -> '%2F', '%25')
// - http:%2F%2F100%25_.json to avoid ids conflicts ('.' -> '_.')
// - http:%252F%252F100%2525_.json to avoid request bad interpretation
//   ('%', '%25')
// The file will be saved as http:%2F%2F100%25_.json

jIO.addStorageType("dav", function (spec, my) {
  var priv = {}, that = my.basicStorage(spec, my), dav = {};

  // ATTRIBUTES //
  priv.url = null;
  priv.username = null;
  priv.password = null;
  priv.encoded_login = null;

  // CONSTRUCTOR //
  /**
   * Init the dav storage connector thanks to the description
   * @method __init__
   * @param  {object} description The description object
   */
  priv.__init__ = function (description) {
    priv.url = description.url || "";
    priv.url = priv.removeSlashIfLast(priv.url);
    // if (description.secured_login) {
    //    not implemented
    // } else
    if (description.encoded_login) {
      priv.encoded_login = description.encoded_login;
    } else if (description.auth_type) {
      if (description.auth_type === "basic") {
        priv.encoded_login = "Basic " +
          btoa((description.username || "") + ":" +
               (description.password || ""));
      }
    } else {
      priv.encoded_login = "";
    }
  };

  // OVERRIDES //
  that.specToStore = function () {
    // TODO: secured password
    // The encoded_login can be seen by anyone, we must find a way to secure it!
    // secured_login = encrypt(encoded_login)
    // encoded_login = decrypt(secured_login)
    return {
      "url": priv.url,
      "encoded_login": priv.encoded_login
    };
  };

  that.validateState = function () {
    if (typeof priv.url !== "string" || priv.url === "") {
      return "The webDav server URL is not provided";
    }
    if (priv.encoded_login === null) {
      return "Impossible to create the authorization";
    }
    return "";
  };

  // TOOLS //
  /**
   * Generate a new uuid
   * @method generateUuid
   * @return {string} The new uuid
   */
  priv.generateUuid = function () {
    var S4 = function () {
      /* 65536 */
      var i, string = Math.floor(
        Math.random() * 0x10000
      ).toString(16);
      for (i = string.length; i < 4; i += 1) {
        string = "0" + string;
      }
      return string;
    };
    return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() +
      S4() + S4();
  };

  // /**
  //  * Clones an object in deep
  //  * @method clone
  //  * @param  {object} object The object to clone
  //  * @return {object} The cloned object
  //  */
  // priv.clone = function (object) {
  //   var tmp = JSON.stringify(object);
  //   if (tmp === undefined) {
  //     return undefined;
  //   }
  //   return JSON.parse(tmp);
  // };

  /**
   * Replace substrings to another strings
   * @method recursiveReplace
   * @param  {string} string The string to do replacement
   * @param  {array} list_of_replacement An array of couple
   * ["substring to select", "selected substring replaced by this string"].
   * @return {string} The replaced string
   */
  priv.recursiveReplace = function (string, list_of_replacement) {
    var i, split_string = string.split(list_of_replacement[0][0]);
    if (list_of_replacement[1]) {
      for (i = 0; i < split_string.length; i += 1) {
        split_string[i] = priv.recursiveReplace(
          split_string[i],
          list_of_replacement.slice(1)
        );
      }
    }
    return split_string.join(list_of_replacement[0][1]);
  };

  /**
   * Changes / to %2F, % to %25 and . to _.
   * @method secureName
   * @param  {string} name The name to secure
   * @return {string} The secured name
   */
  priv.secureName = function (name) {
    return priv.recursiveReplace(name, [["/", "%2F"], ["%", "%25"]]);
  };

  /**
   * Restores the original name from a secured name
   * @method restoreName
   * @param  {string} secured_name The secured name to restore
   * @return {string} The original name
   */
  priv.restoreName = function (secured_name) {
    return priv.recursiveReplace(secured_name, [["%2F", "/"], ["%25", "%"]]);
  };

  /**
   * Convert document id and attachment id to a file name
   * @method idsToFileName
   * @param  {string} doc_id The document id
   * @param  {string} attachment_id The attachment id (optional)
   * @return {string} The file name
   */
  priv.idsToFileName = function (doc_id, attachment_id) {
    doc_id = priv.secureName(doc_id).split(".").join("_.");
    if (typeof attachment_id === "string") {
      attachment_id = priv.secureName(attachment_id).split(".").join("_.");
      return doc_id + "." + attachment_id;
    }
    return doc_id;
  };

  /**
   * Removes the last character if it is a "/". "/a/b/c/" become "/a/b/c"
   * @method removeSlashIfLast
   * @param  {string} string The string to modify
   * @return {string} The modified string
   */
  priv.removeSlashIfLast = function (string) {
    if (string[string.length - 1] === "/") {
      return string.slice(0, -1);
    }
    return string;
  };

  /**
   * Modify an ajax object to add default values
   * @method makeAjaxObject
   * @param  {string} file_name The file name to add to the url
   * @param  {object} ajax_object The ajax object to override
   * @return {object} A new ajax object with default values
   */
  priv.makeAjaxObject = function (file_name, method, ajax_object) {
    ajax_object.type = method || ajax_object.type || "GET";
    ajax_object.url = priv.url + "/" + priv.secureName(file_name) +
      "?_=" + Date.now();
    ajax_object.async = ajax_object.async === false ? false : true;
    ajax_object.crossdomain = ajax_object.crossdomain === false ? false : true;
    ajax_object.headers = ajax_object.headers || {};
    ajax_object.headers.Authorization = ajax_object.headers.Authorization ||
      priv.encoded_login;
    return ajax_object;
  };

  /**
   * Runs all ajax requests for davStorage
   * @method ajax
   * @param  {string} doc_id The document id
   * @param  {string} attachment_id The attachment id, can be undefined
   * @param  {string} method The request method
   * @param  {object} ajax_object The request parameters (optional)
   */
  priv.ajax = function (doc_id, attachment_id, method, ajax_object) {
    var new_ajax_object = JSON.parse(JSON.stringify(ajax_object) || "{}");
    console.log(priv.makeAjaxObject(
      priv.idsToFileName(doc_id, attachment_id),
      method,
      new_ajax_object
    ));
    return $.ajax(priv.makeAjaxObject(
      priv.idsToFileName(doc_id, attachment_id),
      method,
      new_ajax_object
    ));//.always(then || function () {});
  };

  /**
   * Creates error objects for this storage
   * @method createError
   * @param {string} url url to clean up
   * @return {object} error The error object
   */
  priv.createError = function (status, message, reason) {
    var error = {
      "status": status,
      "message": message,
      "reason": reason
    };
    switch (status) {
    case 404:
      error.statusText = "Not found";
      break;
    case 405:
      error.statusText = "Method Not Allowed";
      break;
    case 409:
      error.statusText = "Conflicts";
      break;
    case 24:
      error.statusText = "Broken Document";
      break;
    }
    error.error = error.statusText.toLowerCase().split(" ").join("_");
    return error;
  };

  /**
   * Converts ajax error object to a JIO error object
   * @method ajaxErrorToJioError
   * @param  {object} ajax_error_object The ajax error object
   * @param  {string} message The error message
   * @param  {string} reason The error reason
   * @return {object} The JIO error object
   */
  priv.ajaxErrorToJioError = function (ajax_error_object, message, reason) {
    var jio_error_object = {};
    jio_error_object.status = ajax_error_object.status;
    jio_error_object.statusText = ajax_error_object.statusText;
    jio_error_object.error =
      ajax_error_object.statusText.toLowerCase().split(" ").join("_");
    jio_error_object.message = message;
    jio_error_object.reason = reason;
    return jio_error_object;
  };

  /**
   * Function that create an object containing jQuery like callbacks
   * @method makeJQLikeCallback
   * @return {object} jQuery like callback methods
   */
  priv.makeJQLikeCallback = function () {
    var result = null, emptyFun = function () {}, jql = {
      "respond": function () {
        result = arguments;
      },
      "to_return": {
        "always": function (func) {
          if (result) {
            func.apply(func, result);
            jql.to_return.always = emptyFun;
          } else {
            jql.respond = func;
          }
          return jql.to_return;
        },
        "then": function (func) {
          if (result) {
            func(result[1]);
            jql.to_return.then = emptyFun;
          } else {
            jql.respond = function (err, response) {
              func(response);
            };
          }
          return jql.to_return;
        }
      }
    };
    return jql;
  };

  // DAV REQUESTS //
  /**
   * Retrieve a document
   * @method dav.getDocument
   * @param  {string} doc_id The document id
   * @param  {function} then The callback(err, response)
   */
  dav.getDocument = function (doc_id) {
    var doc, jql = priv.makeJQLikeCallback();
    priv.ajax(doc_id, undefined, "GET").always(function (one, state, three) {
      if (state !== "success") {
        jql.respond(priv.ajaxErrorToJioError(
          one,
          "Cannot retrieve document",
          "Unknown error"
        ), undefined);
      } else {
        try {
          doc = JSON.parse(one);
        } catch (e) {
          return jql.respond(priv.createError(
            24,
            "Cannot parse document",
            "Document is broken"
          ), undefined);
        }
        // document health is good
        jql.respond(undefined, doc);
      }
    });
    return jql.to_return;
  };

  dav.putDocument = function (doc) {
    // TODO
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

  /**
   * Creates a new document
   * @method  post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    var doc_id = command.getDocId() || priv.generateUuid();
    priv.ajax(doc_id, undefined, "GET").always(function (one, state, three) {
      if (state !== "success") {
        if (one.status === 404) {
          // the document does not already exist
          // updating document
          priv.ajax(doc_id, undefined, "PUT", {
            "dataType": "text",
            "data": JSON.stringify(command.cloneDoc())
          }).always(function (one, state, three) {
            if (state !== "success") {
              // an error occured
              that.retry(priv.ajaxErrorToJioError(
                one,
                "An error occured when trying to PUT data",
                "Unknown"
              ));
            } else {
              // document updated
              that.success({
                "ok": true,
                "id": doc_id
              });
            }
          });
        } else {
          // an error occured
          that.retry(priv.ajaxErrorToJioError(
            one,
            "An error occured when trying to GET data",
            "Unknown"
          ));
        }
      } else {
        // the document already exists
        that.error(priv.createError(
          405,
          "Cannot create document",
          "Document already exists"
        ));
      }
    });
  };

  /**
   * Creates or updates a document
   * @method  put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    var doc_id = command.getDocId();
    priv.ajax(doc_id, undefined, "PUT", {
      "dataType": "text",
      "data": JSON.stringify(command.cloneDoc())
    }).always(function (one, state, three) {
      if (state !== "success") {
        // an error occured
        that.retry(priv.ajaxErrorToJioError(
          one,
          "Cannot update document",
          "Unknown error"
        ));
      } else {
        // document updated
        that.success({
          "ok": true,
          "id": doc_id
        });
      }
    });
  };

  /**
   * Add an attachment to a document
   * @method  putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    var doc = null, doc_id = command.getDocId(), attachment_id, tmp;
    attachment_id = command.getAttachmentId();
    priv.ajax(doc_id, undefined, "GET").always(function (one, state, three) {
      if (state !== "success") {
        // document not found or error
        tmp = that.retry;
        if (one.status === 404) {
          tmp = that.error;
        }
        tmp(priv.ajaxErrorToJioError(
          one,
          "Cannot update document",
          "Unknown error"
        ));
      } else {
        try {
          doc = JSON.parse(one);
        } catch (e) {
          return that.error(priv.createError(
            24,
            "Cannot upload attachment",
            "Document is broken"
          ));
        }
        // document health is good
        doc._attachments = doc._attachments || {};
        doc._attachments[attachment_id] = {
          "length": command.getAttachmentLength(),
          "digest": "md5-" + command.md5SumAttachmentData(),
          "content_type": command.getAttachmentMimeType()
        };
        // put the attachment
        priv.ajax(doc_id, attachment_id, "PUT", {
          "dataType": "text",
          "data": command.getAttachmentData()
        }).always(function (one, state, three) {
          if (state !== "success") {
            // an error occured
            that.retry(priv.ajaxErrorToJioError(
              one,
              "An error occured when trying to PUT data",
              "Unknown"
            ));
          } else {
            // update the document
            priv.ajax(doc_id, undefined, "PUT", {
              "dataType": "text",
              "data": JSON.stringify(doc)
            }).always(function (one, state, three) {
              if (state !== "success") {
                that.retry(priv.ajaxErrorToJioError(
                  one,
                  "An error occured when trying to PUT data",
                  "Unknown"
                ));
              } else {
                that.success({
                  "ok": true,
                  "id": doc_id,
                  "attachment": attachment_id
                });
              }
            });
          }
        });
      }
    });
  };

  /**
   * Get a document
   * @method  get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    dav.getDocument(command.getDocId()).always(function (err, response) {
      if (err) {
        if (err.status === 404) {
          return that.error(err);
        }
        return that.retry(err);
      }
      return that.success(response);
    });
  };

  /**
   * Remove a document or attachment
   * @method remove
   * @param  {object} command The JIO command
   */
  that._remove = function (command) {
    var docid = command.getDocId(), doc, url,
      secured_docid, secured_attachmentid, attachment_url,
      attachment_list = [], i, j, k = 1, deleteAttachment, ajax_object;

    if (priv.support(docid)) {
      return;
    }

    secured_docid = priv.secureDocId(command.getDocId());
    url = priv.url + '/' + priv.underscoreFileExtenisons(secured_docid);

    // remove attachment
    if (typeof command.getAttachmentId() === "string") {
      secured_attachmentid = priv.secureDocId(command.getAttachmentId());
      attachment_url = url + '.' + priv.underscoreFileExtenisons(
        secured_attachmentid
      );
      ajax_object = {
        url: attachment_url + '?_=' + Date.now(),
        type: "DELETE",
        success: function () {
          // retrieve underlying document
          ajax_object = {
            url: url + '?_=' + Date.now(),
            type: "GET",
            dataType: "text",
            success: function (response) {
              // underlying document
              doc = JSON.parse(response);

              // update doc._attachments
              if (typeof doc._attachments === "object") {
                if (typeof doc._attachments[command.getAttachmentId()] ===
                    "object") {
                  delete doc._attachments[command.getAttachmentId()];
                  if (priv.objectIsEmpty(doc._attachments)) {
                    delete doc._attachments;
                  }
                  // PUT back to server
                  ajax_object = {
                    url: url + '?_=' + Date.now(),
                    type: 'PUT',
                    data: JSON.stringify(doc),
                    success: function () {
                      that.success({
                        "ok": true,
                        "id": command.getDocId() + '/' +
                          command.getAttachmentId()
                      });
                    },
                    error: function () {
                      that.error(priv.createError(409,
                        "Cannot modify document", "Error saving attachment"
                        ));
                    }
                  };
                  priv.ajax(ajax_object);
                } else {
                  // sure this if-else is needed?
                  that.error(priv.createError(404,
                    "Cannot find document", "Error updating attachment"
                    ));
                }
              } else {
                // no attachments, we are done
                that.success({
                  "ok": true,
                  "id": command.getDocId() + '/' + command.getAttachmentId()
                });
              }
            },
            error: function () {
              that.error(priv.createError(404,
                "Cannot find the document", "Document does not exist"
                ));
            }
          };
          priv.ajax(ajax_object);
        },
        error: function () {
          that.error(priv.createError(404,
            "Cannot find the attachment", "Error removing attachment"
            ));
        }
      };
      priv.ajax(ajax_object);
    // remove document incl. all attachments
    } else {
      ajax_object = {
        url: url + '?_=' + Date.now(),
        type: 'GET',
        dataType: 'text',
        success: function (response) {
          var x;
          doc = JSON.parse(response);
          // prepare attachment loop
          if (typeof doc._attachments === "object") {
            // prepare list of attachments
            for (x in doc._attachments) {
              if (doc._attachments.hasOwnProperty(x)) {
                attachment_list.push(x);
              }
            }
          }
          // delete document
          ajax_object = {
            url: url + '?_=' + Date.now(),
            type: 'DELETE',
            success: function () {
              j = attachment_list.length;
              // no attachments, done
              if (j === 0) {
                that.success({
                  "ok": true,
                  "id": command.getDocId()
                });
              } else {
                deleteAttachment = function (attachment_url, j, k) {
                  ajax_object = {
                    url: attachment_url + '?_=' + Date.now(),
                    type: 'DELETE',
                    success: function () {
                      // all deleted, return response, need k as async couter
                      if (j === k) {
                        that.success({
                          "ok": true,
                          "id": command.getDocId()
                        });
                      } else {
                        k += 1;
                      }
                    },
                    error: function () {
                      that.error(priv.createError(404,
                        "Cannot find attachment", "Error removing attachment"
                        ));
                    }
                  };
                  priv.ajax(ajax_object);
                };
                for (i = 0; i < j; i += 1) {
                  secured_attachmentid = priv.secureDocId(attachment_list[i]);
                  attachment_url = url + '.' + priv.underscoreFileExtenisons(
                    secured_attachmentid
                  );
                  deleteAttachment(attachment_url, j, k);
                }
              }
            },
            error: function () {
              that.error(priv.createError(404,
                "Cannot find the document", "Error removing document"
                ));
            }
          };
          priv.ajax(ajax_object);
        },
        error: function () {
          that.error(priv.createError(404,
            "Cannot find the document", "Document does not exist"
            ));
        }
      };
      priv.ajax(ajax_object);
    }
  };

  /**
   * Gets a document list from a distant dav storage
   * Options:
   * - {boolean} include_docs Also retrieve the actual document content.
   * @method allDocs
   * @param  {object} command The JIO command
   */
  //{
  // "total_rows": 4,
  // "rows": [
  //    {
  //    "id": "otherdoc",
  //    "key": "otherdoc",
  //    "value": {
  //      "rev": "1-3753476B70A49EA4D8C9039E7B04254C"
  //    }
  //  },{...}
  // ]
  //}
  that._allDocs = function (command) {
    var rows = [], url,
      am = priv.newAsyncModule(),
      o = {},
      ajax_object;

    o.getContent = function (file) {
      var docid = priv.secureDocId(file.id),
        url = priv.url + '/' + docid;
      ajax_object = {
        url: url + '?_=' + Date.now(),
        type: 'GET',
        dataType: 'text',
        success: function (content) {
          file.doc = JSON.parse(content);
          rows.push(file);
          am.call(o, 'success');
        },
        error: function (type) {
          that.error(priv.createError(404,
            "Cannot find the document", "Can't get document from storage"
            ));
          am.call(o, 'error', [type]);
        }
      };
      priv.ajax(ajax_object);
    };
    o.getDocumentList = function () {
      url = priv.url + '/';
      ajax_object = {
        url: url + '?_=' + Date.now(),
        type: "PROPFIND",
        dataType: "xml",
        headers : { depth: '1' },
        success: function (xml) {
          var response = $(xml).find('D\\:response, response'),
            len = response.length;

          if (len === 1) {
            return am.call(o, 'success');
          }
          am.wait(o, 'success', len - 2);
          response.each(function (i, data) {
            if (i > 0) { // exclude parent folder
              var file = {
                value: {}
              };
              $(data).find('D\\:href, href').each(function () {
                var split = $(this).text().split('/');
                file.id = split[split.length - 1];
                file.id = priv.restoreSlashes(file.id);
                file.key = file.id;
              });
              if (command.getOption('include_docs')) {
                am.call(o, 'getContent', [file]);
              } else {
                rows.push(file);
                am.call(o, 'success');
              }
            }
          });
        },
        error: function (type) {
          that.error(priv.createError(404,
            "Cannot find the document", "Can't get document list"
            ));
          am.call(o, 'retry', [type]);
        }
      };
      priv.ajax(ajax_object);
    };
    o.retry = function (error) {
      am.neverCall(o, 'retry');
      am.neverCall(o, 'success');
      am.neverCall(o, 'error');
      that.retry(error);
    };
    o.error = function (error) {
      am.neverCall(o, 'retry');
      am.neverCall(o, 'success');
      am.neverCall(o, 'error');
      that.error(error);
    };
    o.success = function () {
      am.neverCall(o, 'retry');
      am.neverCall(o, 'success');
      am.neverCall(o, 'error');
      that.success({
        total_rows: rows.length,
        rows: rows
      });
    };
    // first get the XML list
    am.call(o, 'getDocumentList');
  };

  priv.__init__(spec);
  return that;
});
