/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, $: true, Base64: true  */
// test here: http://enable-cors.org/
//http://metajack.im/2010/01/19/crossdomain-ajax-for-xmpp-http-binding-made-easy
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

  // ==================== Attributes  ====================
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

  priv.restoreDots = function (url) {
    var clean_url = url.replace(/_\./g, '.');
    return clean_url;
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
    var docid = command.getDocId(),
      secured_docid,
      url;

    // no docId
    if (!(typeof docid === "string" && docid !== "")) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Cannot create document which id is undefined",
        "reason": "Document id is undefined"
      });
      return;
    }

    // no cross domain ajax
    if (priv.checkCors === false) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Browser does not support cross domain ajax requests",
        "reason": "cors is undefined"
      });
      return;
    }

    secured_docid = priv.secureDocId(command.getDocId());
    url = priv.url + '/' + priv.underscoreFileExtenisons(secured_docid);
    // see if the document exists
    $.ajax({
      url: url + '?_=' + Date.now(),
      type: "GET",
      async: true,
      dataType: 'text',
      crossdomain : true,
      headers : {
        Authorization: 'Basic ' + Base64.encode(
          priv.username + ':' + priv.password
        )
      },
      // xhrFields: {withCredentials: 'true'},
      success: function () {
        if (type === 'POST') {
          // POST the document already exists
          that.error({
            "status": 409,
            "statusText": "Conflicts",
            "error": "conflicts",
            "message": "Cannot create a new document",
            "reason": "Document already exists"
          });
          return;
        }
        // PUT update document
        $.ajax({
          url: url,
          type: type,
          data: JSON.stringify(command.getDoc()),
          async: true,
          crossdomain: true,
          headers : {
            Authorization: 'Basic ' + Base64.encode(
              priv.username + ':' + priv.password
            )
          },
          // xhrFields: {withCredentials: 'true'},
          success: function () {
            that.success({
              ok: true,
              id: command.getDocId()
            });
          },
          error: function () {
            that.error({
              "status": 409,
              "statusText": "Conflicts",
              "error": "conflicts",
              "message": "Cannot modify document",
              "reason": "Error trying to write to remote storage"
            });
          }
        });
      },
      error: function (err) {
        // Firefox returns 0 instead of 404 on CORS?
        if (err.status === 404 || err.status === 0) {
          $.ajax({
            url: url,
            type: 'PUT',
            data: JSON.stringify(command.getDoc()),
            async: true,
            crossdomain: true,
            headers : {
              Authorization: 'Basic ' + Base64.encode(
                priv.username + ':' + priv.password
              )
            },
            // xhrFields: {withCredentials: 'true'}, 
            success: function () {
              that.success({
                ok: true,
                id: command.getDocId()
              });
            },
            error: function () {
              that.error({
                "status": 409,
                "statusText": "Conflicts",
                "error": "conflicts",
                "message": "Cannot modify document",
                "reason": "Error trying to write to remote storage"
              });
            }
          });

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
    });
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
      attachment_url;

    // no docId
    if (!(typeof docid === "string" && docid !== "")) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Cannot create document which id is undefined",
        "reason": "Document id is undefined"
      });
      return;
    }

    // no cross domain ajax
    if (priv.checkCors === false) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Browser does not support cross domain ajax requests",
        "reason": "cors is undefined"
      });
      return;
    }
    secured_docid = priv.secureDocId(docid);
    url = priv.url + '/' + priv.underscoreFileExtenisons(secured_docid);

    // see if the underlying document exists
    $.ajax({
      url: url + '?_=' + Date.now(),
      type: 'GET',
      async: true,
      dataType: 'text',
      crossdomain : true,
      headers : {
        Authorization: 'Basic ' + Base64.encode(
          priv.username + ':' + priv.password
        )
      },
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
        $.ajax({
          url: url + '?_=' + Date.now(),
          type: 'PUT',
          data: JSON.stringify(doc),
          async: true,
          crossdomain: true,
          headers : {
            Authorization: 'Basic ' + Base64.encode(
              priv.username + ':' + priv.password
            )
          },
          // xhrFields: {withCredentials: 'true'},
          success: function () {
            secured_attachmentid = priv.secureDocId(command.getAttachmentId());
            attachment_url = url + '.' +
              priv.underscoreFileExtenisons(secured_attachmentid);
            $.ajax({
              url: attachment_url + '?_=' + Date.now(),
              type: 'PUT',
              data: JSON.stringify(command.getDoc()),
              async: true,
              crossdomain: true,
              headers : {
                Authorization: 'Basic ' + Base64.encode(
                  priv.username + ':' + priv.password
                )
              },
              // xhrFields: {withCredentials: 'true'},
              success: function () {
                that.success({
                  ok: true,
                  id: command.getDocId() + '/' + command.getAttachmentId()
                });
              },
              error: function () {
                that.error({
                  "status": 409,
                  "statusText": "Conflicts",
                  "error": "conflicts",
                  "message": "Cannot modify document",
                  "reason": "Error trying to save attachment to remote storage"
                });
                return;
              }
            });
          },
          error: function () {
            that.error({
              "status": 409,
              "statusText": "Conflicts",
              "error": "conflicts",
              "message": "Cannot modify document",
              "reason": "Error trying to write to remote storage"
            });
            return;
          }
        });
      },
      error: function () {
        //  the document does not exist
        that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Impossible to add attachment",
          "reason": "Document not found"
        });
        return;
      }
    });
  };

  /**
   * Get a document or attachment from distant storage
   * @method  get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    var docid = command.getDocId(),
      doc,
      url,
      secured_docid,
      secured_attachmentid,
      attachment_url;

    // no docId
    if (!(typeof docid === "string" && docid !== "")) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Cannot create document which id is undefined",
        "reason": "Document id is undefined"
      });
      return;
    }
    // no cors support
    if (priv.checkCors === false) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Browser does not support cross domain ajax requests",
        "reason": "cors is undefined"
      });
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
      $.ajax({
        url: attachment_url + '?_=' + Date.now(),
        type: 'GET',
        async: true,
        dataType: 'text',
        crossdomain : true,
        headers : {
          Authorization: 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
          )
        },
        success: function (response) {
          doc = JSON.parse(response);
          that.success(doc);
        },
        error: function () {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Cannot find the attachment",
            "reason": "Attachment does not exist"
          });
        }
      });
    } else {

      // get document
      $.ajax({
        url: url + '?_=' + Date.now(),
        type: 'GET',
        async: true,
        dataType: 'text',
        crossdomain : true,
        headers : {
          Authorization: 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
          )
        },
        success: function (response) {
          // metadata_only should not be handled by jIO, as it is a
          // webDav only option, shouldn't it?
          // ditto for content_only
          doc = JSON.parse(response);
          that.success(doc);
        },
        error: function () {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Cannot find the document",
            "reason": "Document does not exist"
          });
        }
      });
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
      attachment_list = [], i, j, k = 1, deleteAttachment;

    // no docId
    if (!(typeof docid === "string" && docid !== "")) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Cannot create document which id is undefined",
        "reason": "Document id is undefined"
      });
    }
    // no cors support
    if (priv.checkCors === false) {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Browser does not support cross domain ajax requests",
        "reason": "cors is undefined"
      });
    }

    secured_docid = priv.secureDocId(command.getDocId());
    url = priv.url + '/' + priv.underscoreFileExtenisons(secured_docid);

    // remove attachment
    if (typeof command.getAttachmentId() === "string") {
      secured_attachmentid = priv.secureDocId(command.getAttachmentId());
      attachment_url = url + '.' + priv.underscoreFileExtenisons(
        secured_attachmentid
      );

      $.ajax({
        url: attachment_url + '?_=' + Date.now(),
        type: 'DELETE',
        async: true,
        crossdomain : true,
        headers : {
          Authorization: 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
          )
        },
        success: function () {
          // retrieve underlying document
          $.ajax({
            url: url + '?_=' + Date.now(),
            type: 'GET',
            async: true,
            dataType: 'text',
            crossdomain : true,
            headers : {
              Authorization: 'Basic ' + Base64.encode(
                priv.username + ':' + priv.password
              )
            },
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
                  $.ajax({
                    url: url + '?_=' + Date.now(),
                    type: 'PUT',
                    data: JSON.stringify(doc),
                    async: true,
                    crossdomain: true,
                    headers : {
                      Authorization: 'Basic ' + Base64.encode(
                        priv.username + ':' + priv.password
                      )
                    },
                    // xhrFields: {withCredentials: 'true'},
                    success: function () {
                      that.success({
                        "ok": true,
                        "id": command.getDocId() + '/' +
                          command.getAttachmentId()
                      });
                    },
                    error: function () {
                      that.error({
                        "status": 409,
                        "statusText": "Conflicts",
                        "error": "conflicts",
                        "message": "Cannot modify document",
                        "reason": "Error trying to update document attachments"
                      });
                    }
                  });
                } else {
                  // sure this if-else is needed?
                  that.error({
                    "status": 404,
                    "statusText": "Not Found",
                    "error": "not_found",
                    "message": "Cannot find the document",
                    "reason": "Error trying to update document attachments"
                  });
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
              that.error({
                "status": 404,
                "statusText": "Not Found",
                "error": "not_found",
                "message": "Cannot find the document",
                "reason": "Document does not exist"
              });
            }
          });
        },
        error: function () {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Cannot find the attachment",
            "reason": "Error trying to remove attachment"
          });
        }
      });
    // remove document
    } else {

      // get document to also remove all attachments
      $.ajax({
        url: url + '?_=' + Date.now(),
        type: 'GET',
        async: true,
        dataType: 'text',
        crossdomain : true,
        headers : {
          Authorization: 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
          )
        },
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
          $.ajax({
            url: url + '?_=' + Date.now(),
            type: 'DELETE',
            async: true,
            crossdomain : true,
            headers : {
              Authorization: 'Basic ' + Base64.encode(
                priv.username + ':' + priv.password
              )
            },
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
                  $.ajax({
                    url: attachment_url + '?_=' + Date.now(),
                    type: 'DELETE',
                    async: true,
                    crossdomain : true,
                    headers : {
                      Authorization: 'Basic ' + Base64.encode(
                        priv.username + ':' + priv.password
                      )
                    },
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
                      that.error({
                        "status": 404,
                        "statusText": "Not Found",
                        "error": "not_found",
                        "message": "Cannot find the attachment",
                        "reason": "Error trying to remove attachment"
                      });
                    }
                  });
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
              that.error({
                "status": 404,
                "statusText": "Not Found",
                "error": "not_found",
                "message": "Cannot find the document",
                "reason": "Error trying to remove document"
              });
            }
          });
        },
        error: function () {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Cannot find the document",
            "reason": "Document does not exist"
          });
        }
      });
    }
  };

  /**
   * Gets a document list from a distant dav storage
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
      o = {};

    o.getContent = function (file) {
      var docid = priv.secureDocId(file.id),
        url = priv.url + '/' + docid;

      $.ajax({
        url: url + '?_=' + Date.now(),
        type: 'GET',
        async: true,
        dataType: 'text',
        headers: {
          'Authorization': 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
          )
        },
        success: function (content) {
          file.doc = JSON.parse(content);
          rows.push(file);
          am.call(o, 'success');
        },
        error: function (type) {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Cannot find the document",
            "reason": "Cannot get a document from DAVStorage"
          });
          am.call(o, 'error', [type]);
        }
      });
    };

    o.getDocumentList = function () {
      url = priv.url + '/';
      $.ajax({
        url: url + '?_=' + Date.now(),
        type: 'PROPFIND',
        async: true,
        dataType: "xml",
        crossdomain : true,
        headers : {
          Authorization: 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
          ),
          Depth: '1'
        },
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
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Cannot find the document",
            "reason": "Cannot get a document list from DAVStorage"
          });
          am.call(o, 'retry', [type]);
        }
      });
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