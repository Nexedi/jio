/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/
/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, $: true, btoa: true  */
jIO.addStorageType('dav', function (spec, my) {

  spec = spec || {};
  var that, priv, super_serialized;
  that = my.basicStorage(spec, my);
  priv = {};
  super_serialized = that.serialized;

  priv.secureDocId = function (string) {
    var split = string.split('/'),
      i;
    if (split[0] === '') {
      split = split.slice(1);
    }
    for (i = 0; i < split.length; i += 1) {
      if (split[i] === '') {
        return '';
      }
    }
    return split.join('%2F');
  };
  priv.convertSlashes = function (string) {
    return string.split('/').join('%2F');
  };

  priv.restoreSlashes = function (string) {
    return string.split('%2F').join('/');
  };

  /**
   * Checks if an object has no enumerable keys
   * @method objectIsEmpty
   * @param  {object} obj The object
   * @return {boolean} true if empty, else false
   */
  priv.objectIsEmpty = function (obj) {
    var k;
    for (k in obj) {
      if (obj.hasOwnProperty(k)) {
        return false;
      }
    }
    return true;
  };

  priv.username = spec.username || '';
  priv.secured_username = priv.convertSlashes(priv.username);
  priv.password = spec.password || '';
  priv.url = spec.url || '';

  that.serialized = function () {
    var o = super_serialized();
    o.username = priv.username;
    o.url = priv.url;
    o.password = priv.password;
    return o;
  };

  priv.newAsyncModule = function () {
    var async = {};
    async.call = function (obj, function_name, arglist) {
      obj._wait = obj._wait || {};
      if (obj._wait[function_name]) {
        obj._wait[function_name] -= 1;
        return function () {};
      }
      // ok if undef or 0
      arglist = arglist || [];
      return obj[function_name].apply(obj[function_name], arglist);
    };
    async.neverCall = function (obj, function_name) {
      obj._wait = obj._wait || {};
      obj._wait[function_name] = -1;
    };
    async.wait = function (obj, function_name, times) {
      obj._wait = obj._wait || {};
      obj._wait[function_name] = times;
    };
    async.end = function () {
      async.call = function () {};
    };
    return async;
  };

  /**
   * Checks if a browser supports cors (cross domain ajax requests)
   * @method checkCors
   * @return {boolean} true if supported, else false
   */
  priv.checkCors = function () {
    return $.support.cors;
  };

  /**
   * Replaces last "." with "_." in document filenames
   * @method underscoreFileExtenisons
   * @param {string} url url to clean up
   * @return {string} clean_url cleaned up URL
   */
  priv.underscoreFileExtenisons = function (url) {
    var clean_url = url.replace(/,\s(\w+)$/, "_.$1");
    return clean_url;
  };

  /**
   * Replaces "_." with "." in document filenames
   * @method restoreDots
   * @param {string} url url to clean up
   * @return {string} clean_url cleaned up URL
   */
  priv.restoreDots = function (url) {
    var clean_url = url.replace(/_\./g, '.');
    return clean_url;
  };

  /**
   * Runs all ajax requests for davStorage
   * @method ajax
   * @param {object} ajax_object The request parameters
   */
  priv.ajax = function (ajax_object) {
    $.ajax({
      url: ajax_object.url,
      type: ajax_object.type,
      async: true,
      dataType: ajax_object.dataType || null,
      data: ajax_object.data || null,
      crossdomain : true,
      headers : {
        Authorization: 'Basic ' + btoa(
          priv.username + ':' + priv.password
        ),
        Depth: ajax_object.headers === undefined ? null :
            ajax_object.headers.depth
      },
      // xhrFields: {withCredentials: 'true'},
      success: ajax_object.success,
      error: ajax_object.error
    });
  };

  /**
   * Creates error objects for this storage
   * @method createError
   * @param {string} url url to clean up
   * @return {object} error The error object
   */
  priv.createError = function (status, message, reason) {
    var error = {};

    switch (status) {
    case 404:
      error.status = status;
      error.statusText = "Not found";
      error.error = "not_found";
      error.message = message;
      error.reason = reason;
      break;

    case 405:
      error.status = status;
      error.statusText = "Method Not Allowed";
      error.error = "method_not_allowed";
      error.message = message;
      error.reason = reason;
      break;

    case 409:
      error.status = status;
      error.statusText = "Conflicts";
      error.error = "conflicts";
      error.message = message;
      error.reason = reason;
      break;
    }
    return error;
  };

  /**
   * Check if method can be run on browser
   * @method support
   */
  priv.support = function (docid) {
    // no docId
    if (!(typeof docid === "string" && docid !== "")) {
      that.error(priv.createError(405, "Can't create document without id",
        "Document id is undefined"
        ));
      return true;
    }
    // no cross domain ajax
    if (priv.checkCors === false) {
      that.error(priv.createError(405,
        "Browser does not support cross domain ajax", "CORS is undefined"
        ));
      return true;
    }
  };

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


  priv.putOrPost = function (command, type) {
    var docid = command.getDocId(), secured_docid, url, ajax_object;

    if (priv.support(docid)) {
      return;
    }

    secured_docid = priv.secureDocId(command.getDocId());
    url = priv.url + '/' + priv.underscoreFileExtenisons(secured_docid);

    ajax_object = {
      url: url + '?_=' + Date.now(),
      type: "GET",
      dataType: "text",
      success: function () {
        if (type === 'POST') {
          // POST the document already exists
          that.error(priv.createError(409,
            "Cannot create a new document", "Document already exists"
            ));
          return;
        }
        ajax_object = {
          url: url,
          type: type,
          data: JSON.stringify(command.getDoc()),
          success: function () {
            that.success({
              ok: true,
              id: command.getDocId()
            });
          },
          error: function () {
            that.error(priv.createError(409, "Cannot modify document",
              "Error writing to remote storage"
              ));
          }
        };
        priv.ajax(ajax_object);
      },
      error: function (err) {
        // Firefox returns 0 instead of 404 on CORS?
        if (err.status === 404 || err.status === 0) {
          ajax_object = {
            url: url,
            type: "PUT",
            data: JSON.stringify(command.getDoc()),
            success: function () {
              that.success({
                ok: true,
                id: command.getDocId()
              });
            },
            error: function () {
              that.error(priv.createError(409,
                "Cannot modify document", "Error writing to remote storage"
                ));
            }
          };
          priv.ajax(ajax_object);
        } else {
          // error accessing remote storage
          that.error({
            "status": err.status,
            "statusText": err.statusText,
            "error": "error",
            "message": err.message,
            "reason": "Failed to access remote storage"
          });
        }
      }
    };
    priv.ajax(ajax_object);
  };

  /**
   * Creates a new document
   * @method  post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    priv.putOrPost(command, 'POST');
  };

  /**
   * Creates or updates a document
   * @method  put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    priv.putOrPost(command, 'PUT');
  };

  /**
   * Add an attachment to a document
   * @method  putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    var docid = command.getDocId(),
      doc,
      url,
      secured_docid,
      secured_attachmentid,
      attachment_url,
      ajax_object;

    priv.support(docid);

    secured_docid = priv.secureDocId(docid);
    url = priv.url + '/' + priv.underscoreFileExtenisons(secured_docid);

    ajax_object = {
      url: url + '?_=' + Date.now(),
      type: 'GET',
      dataType: 'text',
      success: function (response) {
        doc = JSON.parse(response);

        // the document exists - update document
        doc._attachments = doc._attachments || {};
        doc._attachments[command.getAttachmentId()] = {
          "content_type": command.getAttachmentMimeType(),
          "digest": "md5-" + command.md5SumAttachmentData(),
          "length": command.getAttachmentLength()
        };
        // put updated document data
        ajax_object = {
          url: url + '?_=' + Date.now(),
          type: 'PUT',
          data: JSON.stringify(doc),
          success: function () {
            secured_attachmentid = priv.secureDocId(command.getAttachmentId());
            attachment_url = url + '.' +
              priv.underscoreFileExtenisons(secured_attachmentid);
            ajax_object = {
              url: attachment_url + '?_=' + Date.now(),
              type: 'PUT',
              data: JSON.stringify(command.getDoc()),
              success: function () {
                that.success({
                  ok: true,
                  id: command.getDocId() + '/' + command.getAttachmentId()
                });
              },
              error: function () {
                that.error(priv.createError(409,
                  "Cannot modify document", "Error when saving attachment"
                  ));
                return;
              }
            };
            priv.ajax(ajax_object);
          },
          error: function () {
            that.error(priv.createError(409,
              "Cannot modify document", "Error writing to remote storage"
              ));
            return;
          }
        };
        priv.ajax(ajax_object);
      },
      error: function () {
        //  the document does not exist
        that.error(priv.createError(404,
          "Impossible to add attachment", "Document not found"
          ));
        return;
      }
    };
    // see if the underlying document exists
    priv.ajax(ajax_object);
  };

  /**
   * Get a document or attachment from distant storage
   * Options:
   * - {boolean} revs Add simple revision history (false by default).
   * - {boolean} revs_info Add revs info (false by default).
   * - {boolean} conflicts Add conflict object (false by default).
   * @method  get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    var docid = command.getDocId(),
      doc,
      url,
      secured_docid,
      secured_attachmentid,
      attachment_url,
      ajax_object;

    if (priv.support(docid)) {
      return;
    }

    secured_docid = priv.secureDocId(command.getDocId());
    url = priv.url + '/' + priv.underscoreFileExtenisons(secured_docid);

    if (typeof command.getAttachmentId() === "string") {
      secured_attachmentid = priv.secureDocId(command.getAttachmentId());
      attachment_url = url + '.' + priv.underscoreFileExtenisons(
        secured_attachmentid
      );
      // get attachment
      ajax_object = {
        url: attachment_url + '?_=' + Date.now(),
        type: "GET",
        dataType: "text",
        success: function (response) {
          doc = JSON.parse(response);
          that.success(doc);
        },
        error: function () {
          that.error(priv.createError(404,
            "Cannot find the attachment", "Attachment does not exist"
            ));
        }
      };
      priv.ajax(ajax_object);
    } else {
      // get document
      ajax_object = {
        url: url + '?_=' + Date.now(),
        type: "GET",
        dataType: "text",
        success: function (response) {
          // metadata_only should not be handled by jIO, as it is a
          // webDav only option, shouldn't it?
          // ditto for content_only
          doc = JSON.parse(response);
          that.success(doc);
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
   * Remove a document or attachment
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
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
  that.allDocs = function (command) {
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

  return that;
});