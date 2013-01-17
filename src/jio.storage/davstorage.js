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

  /**
   * If some other parameters is needed, it returns an error message.
   * @method validateState
   * @return {string} '' -> ok, 'message' -> error
   */
  that.validateState = function () {
    if (priv.secured_username && priv.url) {
      return '';
    }
    return 'Need at least 2 parameters: "username" and "url".';
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

  priv.checkCors = function(){
    return $.support.cors;
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
    var doc = command.getDocId(),
        secured_docid;

    // no docId
    if (!(typeof doc === "string" && doc !== "")) {
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
    url = priv.url + '/' + secured_docid;

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
      success: function (content) {
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
        } else {
          // PUT update document
          $.ajax({
            url: url + '?_=' + Date.now(),
            type: type,
            data: command.getDoc(),
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
            error: function (type) {
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
        }
      },
      error: function (err) {
        if (err.status === 404) {
          $.ajax({
            url: url + '?_=' + Date.now(),
            // must always use put, POST only seems to work on collections
            type: 'PUT',
            data: command.getDoc(),
            async: true,
            crossdomain: true,
            headers : {
              Authorization: 'Basic ' + Base64.encode(
                priv.username + ':' + priv.password
                )
              },
            // xhrFields: {withCredentials: 'true'}, 
            success: function (response) {
              that.success({
                ok: true,
                id: command.getDocId()
              });
            },
            error: function (type) {
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

        } else {
          // error accessing remote storage
          that.error({
            "status": err.status,
            "statusText": err.statusText,
            "error": "error",
            "message": err.message,
            "reason": "Failed to access remote storage"
          });
          return;
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
    var docid = command.getDocId(), doc,
        secured_docid, secured_attachmentid, attachment_url;

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
    url = priv.url + '/' + secured_docid;

    // see if the underlying document exists ||
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
          data: doc,
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
            attachment_url = url + '/' + secured_attachmentid;

            $.ajax({
              url: attachment_url + '?_=' + Date.now(),
              type: 'PUT',
              data: command.getDoc(),
              async: true,
              crossdomain: true,
              headers : {
                Authorization: 'Basic ' + Base64.encode(
                  priv.username + ':' + priv.password
                  )
                },
              // xhrFields: {withCredentials: 'true'},
              success: function (response) {
                that.success({
                  ok: true,
                  id: command.getDocId()+'/'+command.getAttachmentId()
                });
              },
              error: function (type) {
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
          error: function (type) {
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
    var docid = command.getDocId(), doc,
        secured_docid, secured_attachmentid, attachment_url;

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

    if (typeof command.getAttachmentId() === "string") {
      secured_attachmentid = priv.secureDocId(command.getAttachmentId());
      attachment_url = url + '/' + secured_attachmentid;
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
        error: function (type) {
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
      secured_docid = priv.secureDocId(command.getDocId());
      url = priv.url + '/' + secured_docid;

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
        error: function (type) {
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
    var docid = command.getDocId(), doc,
        secured_docid, secured_attachmentid, attachment_url,
        attachment_list = [], i, j, k = 1;

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
    url = priv.url + '/' + secured_docid;

    if (typeof command.getAttachmentId() === "string") {
      secured_attachmentid = priv.secureDocId(command.getAttachmentId());
      attachment_url = url + '/' + secured_attachmentid;
      // remove attachment
      $.ajax({
        url: attachment_url + '?_=' + Date.now(),
        type: 'REMOVE',
        async: true,
        crossdomain : true,
        headers : {
          Authorization: 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
            )
          },
        success: function (response) {
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
                    data: doc,
                    async: true,
                    crossdomain: true,
                    headers : {
                      Authorization: 'Basic ' + Base64.encode(
                        priv.username + ':' + priv.password
                        )
                      },
                    // xhrFields: {withCredentials: 'true'},
                    success: function (response) {
                      that.success({
                        "ok": true,
                        "id": command.getDocId()+'/'+command.getAttachmentId()
                      });
                    },
                    error: function (type) {
                      that.error({
                        "status": 409,
                        "statusText": "Conflicts",
                        "error": "conflicts",
                        "message": "Cannot modify document",
                        "reason": "Error trying to update document attachments"
                      });
                      return;
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
            error: function (type) {
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
        error: function (type) {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Cannot find the attachment",
            "reason": "Error trying to remove attachment"
          });
        }
      });
    } else {
      secured_docid = priv.secureDocId(command.getDocId());
      url = priv.url + '/' + secured_docid;

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
          doc = JSON.parse(response);
          // prepare attachment loop
          if (typeof doc._attachments === "object") {
            // prepare list of attachments
            for (i in doc._attachments) {
              if (doc._attachments.hasOwnProperty(i)) {
                attachment_list.push(i);
              }
            }
          }
          // delete document
          $.ajax({
            url: url + '?_=' + Date.now(),
            type: 'REMOVE',
            async: true,
            crossdomain : true,
            headers : {
              Authorization: 'Basic ' + Base64.encode(
                priv.username + ':' + priv.password
                )
              },
            success: function (response) {
              j = attachment_list.length;
              // no attachments, done
              if (j === 0) {
                that.success({
                  "ok": true,
                  "id": command.getDocId()
                });
              } else {
                for (i = 0; i < j; i += 1) {
                  secured_attachmentid = priv.secureDocId(attachment_list[i]);
                  attachment_url = url + '/' + secured_attachmentid;

                  $.ajax({
                    url: attachment_url + '?_=' + Date.now(),
                    type: 'REMOVE',
                    async: true,
                    crossdomain : true,
                    headers : {
                      Authorization: 'Basic ' + Base64.encode(
                        priv.username + ':' + priv.password
                        )
                      },
                    success: function (response) {
                      // all deleted, return response, need k as async couter
                      if (j === k){
                        that.success({
                          "ok": true,
                          "id": command.getDocId()
                        });
                      } else {
                        k += 1;
                      }
                    },
                    error: function (type) {
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
              }
            },
            error: function (type) {
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
        error: function (type) {
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
   * Gets a document list from a distant dav storage.
   * @method allDocs
   */
  that.allDocs = function (command) {
    var rows = [],
      am = priv.newAsyncModule(),
      o = {};

    o.getContent = function (file) {
      $.ajax({
        url: priv.url + '/' + priv.secured_username + '/' +
          priv.secured_application_name + '/' + priv.secureDocId(file.id) +
          '?_=' + Date.now(),
        type: "GET",
        async: true,
        dataType: 'text', // TODO : is it necessary ?
        headers: {
          'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
            priv.password)
        },
        success: function (content) {
          file.value.content = content;
          // WARNING : files can be disordered because
          // of asynchronous action
          rows.push(file);
          am.call(o, 'success');
        },
        error: function (type) {
          type.error = type.statusText; // TODO : to lower case
          type.reason = 'Cannot get a document ' +
            'content from DAVStorage';
          type.message = type.message + '.';
          am.call(o, 'error', [type]);
        }
      });
    };
    o.getDocumentList = function () {
      $.ajax({
        url: priv.url + '/' + priv.secured_username + '/' +
          priv.secured_application_name + '/' + '?_=' + Date.now(),
        async: true,
        type: 'PROPFIND',
        dataType: 'xml',
        headers: {
          'Authorization': 'Basic ' + Base64.encode(
            priv.username + ':' + priv.password
          ),
          Depth: '1'
        },
        // xhrFields: {withCredentials: 'true'}, // cross domain
        success: function (xmlData) {
          var response = $(xmlData).find('D\\:response, response'),
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
              if (file.id === '.htaccess' || file.id === '.htpasswd') {
                return;
              }
              $(data).find('lp1\\:getlastmodified, getlastmodified').each(
                function () {
                  file.value._last_modified = new Date(
                    $(this).text()
                  ).getTime();
                }
              );
              $(data).find('lp1\\:creationdate, creationdate').each(
                function () {
                  file.value._creation_date = new Date(
                    $(this).text()
                  ).getTime();
                }
              );
              if (!command.getOption('metadata_only')) {
                am.call(o, 'getContent', [file]);
              } else {
                rows.push(file);
                am.call(o, 'success');
              }
            }
          });
        },
        error: function (type) {
          if (type.status === 404) {
            type.error = 'not_found';
            type.reason = 'missing';
            am.call(o, 'error', [type]);
          } else {
            type.error = type.statusText; // TODO : to lower case
            type.reason =
              'Cannot get a document list from DAVStorage';
            type.message = type.reason + '.';
            am.call(o, 'retry', [type]);
          }
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
    am.call(o, 'getDocumentList');
  }; // end allDocs

  return that;
});