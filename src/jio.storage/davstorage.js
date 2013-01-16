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

  // wedDav methods rfc4918
  // PROPFIND
  // PROPPATCH
  // MCKOL
  // GET 
  //    > resource = return content of element  xyz.abc
  //    > collection > allDocs
  //    > attachment = return content of element  xyz_.abc/att.def
  // HEAD
  // POST
  // DELETE
  // PUT
  // COPY
  // MOVE
  // LOCK
  // UNLOCK

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
          // remove first or can webDav overwrite?
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

  that.post = function (command) {
    priv.putOrPost(command, 'POST');
  };

  /**
   * Saves a document in the distant dav storage.
   * @method put
   */
  that.put = function (command) {
    priv.putOrPost(command, 'PUT');
  }; // end put

  /**
   * Loads a document from a distant dav storage.
   * @method get
   */
  that.get = function (command) {
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

    // get attachment
    if (typeof command.getAttachmentId() === "string") {
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
        success: function (response) {
          that.success(response)
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
      // get document
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
        success: function (response) {
          that.success(response)
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

  that.get = function (command) {
    var secured_docid = priv.secureDocId(command.getDocId()),
      doc = {},
      getContent = function () {
        $.ajax({
          url: priv.url + '/' + priv.secured_username + '/' +
            priv.secured_application_name + '/' + secured_docid + '?_=' +
            Date.now(),
          type: "GET",
          async: true,
          dataType: 'text', // TODO is it necessary ?
          headers: {
            'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
              priv.password)
          },
          // xhrFields: {withCredentials: 'true'}, // cross domain
          success: function (content) {
            doc.content = content;
            that.success(doc);
          },
          error: function (type) {
            type.error = type.statusText; // TODO : to lower case
            if (type.status === 404) {
              type.message = 'Document "' + command.getDocId() +
                '" not found.';
              type.reason = 'missing';
              that.error(type);
            } else {
              type.reason =
                'An error occured when trying to get "' +
                  command.getDocId() + '"';
              type.message = type.reason + '.';
              that.retry(type);
            }
          }
        });
      };
    doc._id = command.getDocId();
    // NOTE : if (command.getOption('content_only') { return getContent(); }
    // Get properties
    $.ajax({
      url: priv.url + '/' + priv.secured_username + '/' +
        priv.secured_application_name + '/' +
        secured_docid + '?_=' + Date.now(),
      type: "PROPFIND",
      async: true,
      dataType: 'xml',
      headers: {
        'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
          priv.password)
      },
      success: function (xmlData) {
        $(xmlData).find('lp1\\:getlastmodified, getlastmodified').each(
          function () {
            doc._last_modified = new Date($(this).text()).getTime();
          }
        );
        $(xmlData).find('lp1\\:creationdate, creationdate').each(
          function () {
            doc._creation_date = new Date($(this).text()).getTime();
          }
        );
        if (!command.getOption('metadata_only')) {
          getContent();
        } else {
          that.success(doc);
        }
      },
      error: function (type) {
        if (type.status === 404) {
          type.message = 'Cannot find "' + command.getDocId() +
            '" informations.';
          type.reason = 'missing';
          that.error(type);
        } else {
          type.reason = 'Cannot get "' + command.getDocId() +
            '" informations';
          type.message = type.reason + '.';
          that.retry(type);
        }
      }
    });
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

  /**
   * Removes a document from a distant dav storage.
   * @method remove
   */
  that.remove = function (command) {

    var secured_docid = priv.secureDocId(command.getDocId());
    $.ajax({
      url: priv.url + '/' + priv.secured_username + '/' +
        priv.secured_application_name + '/' + secured_docid + '?_=' +
        Date.now(),
      type: "DELETE",
      async: true,
      headers: {
        'Authorization': 'Basic ' + Base64.encode(
          priv.username + ':' + priv.password
        )
      },
      // xhrFields: {withCredentials: 'true'}, // cross domain
      // jslint: removed params data, state, type
      success: function () {
        that.success({
          ok: true,
          id: command.getDocId()
        });
      },
      error: function (type) {
        if (type.status === 404) {
          //that.success({ok:true,id:command.getDocId()});
          type.error = 'not_found';
          type.reason = 'missing';
          type.message = 'Cannot remove missing file.';
          that.error(type);
        } else {
          type.reason = 'Cannot remove "' + that.getDocId() + '"';
          type.message = type.reason + '.';
          that.retry(type);
        }
      }
    });
  };
  return that;
});