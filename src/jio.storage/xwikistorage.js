/*jslint
    indent: 2,
    maxlen: 80,
    plusplus: true,
    nomen: true,
    regexp: true
*/
/*global
    define: true,
    exports: true,
    require: true,
    jIO: true,
    jQuery: true,
    window: true,
    XMLHttpRequest,
    FormData
*/
/**
 * JIO XWiki Storage. Type = 'xwiki'.
 * XWiki Document/Attachment storage.
 */
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(require('jio'), require('jquery'));
  }
  module(jIO, jQuery);
}([
  'jio',
  'jquery'
], function (jIO, $) {
  "use strict";

  function detectWiki() {
    // try first the meta tag, then look for js,
    // then finally fail over to 'xwiki'...
    return $('meta[name="wiki"]').attr('content') ||
      (window.XWiki || {}).currentWiki ||
      'xwiki';
  }

  function detectXWikiURL(wiki) {
    var loc, action, idx;
    loc = window.location.href;
    action = (window.XWiki || {}).contextAction || 'view';
    idx = loc.indexOf('/wiki/' + wiki + '/' + action + '/');
    if (idx !== -1) {
      return loc.substring(0, idx);
    }
    idx = loc.indexOf('/bin/' + action + '/');
    if (idx !== -1) {
      // single wiki host:port/xwiki/bin/view/Main/WebHome
      return loc.substring(0, idx);
    }
    throw new Error("Unable to detect XWiki URL");
  }

  /**
   * Checks if an object has no enumerable keys
   *
   * @param  {Object} obj The object
   * @return {Boolean} true if empty, else false
   */
  function objectIsEmpty(obj) {
    var k;
    for (k in obj) {
      if (obj.hasOwnProperty(k)) {
        return false;
      }
    }
    return true;
  }

  function detectIsPathBasedMultiwiki(xwikiurl) {
    var loc = window.location.href;
    if (loc.indexOf(xwikiurl + '/wiki/') === 0) { return true; }
    if (loc.indexOf(xwikiurl + '/bin/') === 0) { return false; }
    // warn the user that we're unusure?
    return false;
  }

  /**
   * The JIO XWikiStorage extension
   *
   * @class XWikiStorage
   * @constructor
   */
  function XWikiStorage(spec) {

    spec = spec || {};
    var priv = {};

    // the wiki to store stuff in
    priv.wiki = spec.wiki || detectWiki();

    // URL location of the wiki
    // XWiki doesn't currently allow cross-domain requests.
    priv.xwikiurl = (spec.xwikiurl !== undefined)
      ? spec.xwikiurl : detectXWikiURL(priv.wiki);

    // Which URL to load for getting the Anti-CSRF form token, used for testing.
    priv.formTokenPath = spec.formTokenPath || priv.xwikiurl;

    priv.pathBasedMultiwiki = (spec.pathBasedMultiwiki !== undefined)
      ? spec.pathBasedMultiwiki : detectIsPathBasedMultiwiki(priv.xwikiurl);

    /**
     * Get the Space and Page components of a documkent ID.
     *
     * @param id the document id.
     * @return a map of { 'space':<Space>, 'page':<Page> }
     */
    priv.getParts = function (id) {

      if (id.indexOf('/') === -1) {
        return {
          space: 'Main',
          page: id
        };
      }
      return {
        space: id.substring(0, id.indexOf('/')),
        page: id.substring(id.indexOf('/') + 1)
      };
    };

    /**
     * Get the Anti-CSRF token and do something with it.
     *
     * @param andThen function which is called with (formToken, err)
     *                as parameters.
     */
    priv.doWithFormToken = function (andThen) {
      $.ajax({
        url: priv.formTokenPath,
        type: "GET",
        async: true,
        dataType: 'text',
        success: function (html) {
          var m, token;
          // this is unreliable
          //var token = $('meta[name=form_token]', html).attr("content");
          m = html.match(/<meta name="form_token" content="(\w*)"\/>/);
          token = (m && m[1]) || null;
          if (!token) {
            andThen(null, {
              "status": 404,
              "statusText": "Not Found",
              "error": "err_form_token_not_found",
              "message": "Anti-CSRF form token was not found in page",
              "reason": "XWiki main page did not contain expected " +
                        "Anti-CSRF form token"
            });
          } else {
            andThen(token, null);
          }
        },
        error: function (jqxhr, err, cause) {
          andThen(null, {
            "status": jqxhr.status,
            "statusText": jqxhr.statusText,
            "error": err,
            "message": "Could not get Anti-CSRF form token from [" +
                priv.xwikiurl + "]",
            "reason": cause
          });
        }
      });
    };

    /**
     * Get the REST read URL for a document.
     *
     * @param docId the id of the document.
     * @return the REST URL for accessing this document.
     */
    priv.getDocRestURL = function (docId) {
      var parts = priv.getParts(docId);
      return priv.xwikiurl + '/rest/wikis/'
        + priv.wiki + '/spaces/' + parts.space + '/pages/' + parts.page;
    };

    priv.getURL = function (action, space, page) {
      var out = [priv.xwikiurl];
      if (!priv.pathBasedMultiwiki) {
        out.push('bin');
      } else {
        out.push('wiki', priv.wiki);
      }
      out.push(action, space, page);
      return out.join('/');
    };

    /*
     * Wrapper for the xwikistorage based on localstorage JiO store.
     */
    priv._storage = this._storage = {
      /**
       * Get content of an XWikiDocument.
       *
       * @param docId the document ID.
       * @param andThen a callback taking (doc, err), doc being the document
       *                json object and err being the error if any.
       */
      getItem: function (docId, andThen) {

        function attachSuccess(doc, jqxhr) {
          var out = {}, xd;
          if (jqxhr.status !== 200) {
            andThen(null, {
              "status": jqxhr.status,
              "statusText": jqxhr.statusText,
              "error": "",
              "message": "Failed to get attachments for document [" +
                  docId + "]",
              "reason": ""
            });
            return;
          }
          try {
            xd = $(jqxhr.responseText);
            xd.find('attachment').each(function () {
              var attach = {}, attachXML = $(this);
              attachXML.find('mimeType').each(function () {
                attach.content_type = $(this).text();
              });
              attachXML.find('size').each(function () {
                attach.length = Number($(this).text());
              });
              attach.digest = "unknown-0";
              attachXML.find('name').each(function () {
                out[$(this).text()] = attach;
              });
            });
            doc._attachments = out;
            andThen(doc, null);
          } catch (err) {
            andThen(null, {
              status: 500,
              statusText: "internal error",
              error: err,
              message: err.message,
              reason: ""
            });
          }
        }

        function getAttachments(doc) {
          $.ajax({
            url: priv.getDocRestURL(docId) + '/attachments',
            type: "GET",
            async: true,
            dataType: 'xml',
            complete: function (jqxhr) {
              attachSuccess(doc, jqxhr);
            }
          });
        }

        function success(jqxhr) {
          var out, xd;
          out = {};
          try {
            xd = $(jqxhr.responseText);
            xd.find('modified').each(function () {
              out._last_modified = Date.parse($(this).text());
            });
            xd.find('created').each(function () {
              out._creation_date = Date.parse($(this).text());
            });
            xd.find('title').each(function () { out.title = $(this).text(); });
            xd.find('parent').each(function () {
              out.parent = $(this).text();
            });
            xd.find('syntax').each(function () {
              out.syntax = $(this).text();
            });
            xd.find('content').each(function () {
              out.content = $(this).text();
            });
            out._id = docId;
            getAttachments(out);
          } catch (err) {
            andThen(null, {
              status: 500,
              statusText: "internal error",
              error: err,
              message: err.message,
              reason: ""
            });
          }
        }

        $.ajax({
          url: priv.getDocRestURL(docId),
          type: "GET",
          async: true,
          dataType: 'xml',

          // Use complete instead of success and error because phantomjs
          // sometimes causes error to be called with http return code 200.
          complete: function (jqxhr) {
            if (jqxhr.status === 404) {
              andThen(null, null);
              return;
            }
            if (jqxhr.status !== 200) {
              andThen(null, {
                "status": jqxhr.status,
                "statusText": jqxhr.statusText,
                "error": "",
                "message": "Failed to get document [" + docId + "]",
                "reason": ""
              });
              return;
            }
            success(jqxhr);
          }
        });
      },

      /**
       * Get content of an XWikiAttachment.
       *
       * @param attachId the attachment ID.
       * @param andThen a callback taking (attach, err), attach being the
       *                attachment blob and err being the error if any.
       */
      getAttachment: function (docId, fileName, andThen) {
        var xhr, parts, url;
        // need to do this manually, jquery doesn't support returning blobs.
        xhr = new XMLHttpRequest();
        parts = priv.getParts(docId);
        url = priv.getURL('download', parts.space, parts.page) +
          '/' + fileName + '?cb=' + Math.random();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';

        xhr.onload = function () {
          if (xhr.status === 200) {
            var contentType = xhr.getResponseHeader("Content-Type");
            if (contentType.indexOf(';') > -1) {
              contentType = contentType.substring(0, contentType.indexOf(';'));
            }
            andThen(xhr.response);
          } else {
            andThen(null, {
              "status": xhr.status,
              "statusText": xhr.statusText,
              "error": "err_network_error",
              "message": "Failed to get attachment ["
                  + docId + "/" + fileName + "]",
              "reason": "Error getting data from network"
            });
          }
        };

        xhr.send();
      },

      /**
       * Store an XWikiDocument.
       *
       * @param id the document identifier.
       * @param doc the document JSON object containing
       *            "parent", "title", "content", and/or "syntax" keys.
       * @param andThen a callback taking (err), err being the error if any.
       */
      setItem: function (id, doc, andThen) {
        priv.doWithFormToken(function (formToken, err) {
          if (err) {
            andThen(err);
            return;
          }
          var parts = priv.getParts(id);
          $.ajax({
            url: priv.getURL('preview', parts.space, parts.page),
            type: "POST",
            async: true,
            dataType: 'text',
            data: {
              parent: doc.parent || '',
              title: doc.title || '',
              xredirect: '',
              language: 'en',
  //            RequiresHTMLConversion: 'content',
  //            content_syntax: doc.syntax || 'xwiki/2.1',
              content: doc.content || '',
              xeditaction: 'edit',
              comment: 'Saved by JiO',
              action_saveandcontinue: 'Save & Continue',
              syntaxId: doc.syntax || 'xwiki/2.1',
              xhidden: 0,
              minorEdit: 0,
              ajax: true,
              form_token: formToken
            },
            success: function () {
              andThen(null);
            },
            error: function (jqxhr, err, cause) {
              andThen({
                "status": jqxhr.status,
                "statusText": jqxhr.statusText,
                "error": err,
                "message": "Failed to store document [" + id + "]",
                "reason": cause
              });
            }
          });
        });
      },

      /**
       * Store an XWikiAttachment.
       *
       * @param docId the ID of the document to attach to.
       * @param fileName the attachment file name.
       * @param mimeType the MIME type of the attachment content.
       * @param blob the attachment content.
       * @param andThen a callback taking one parameter, the error if any.
       */
      setAttachment: function (docId, fileName, blob, andThen) {
        priv.doWithFormToken(function (formToken, err) {
          var parts, fd, xhr;
          if (err) {
            andThen(err);
            return;
          }
          parts = priv.getParts(docId);
          fd = new FormData();
          fd.append("filepath", blob, fileName);
          fd.append("form_token", formToken);
          xhr = new XMLHttpRequest();
          xhr.open(
            'POST',
            priv.getURL('upload', parts.space, parts.page),
            true
          );
          xhr.onload = function () {
            if (xhr.status === 302 || xhr.status === 200) {
              andThen(null);
            } else {
              andThen({
                "status": xhr.status,
                "statusText": xhr.statusText,
                "error": "err_network_error",
                "message": "Failed to store attachment ["
                    + docId + "/" + fileName + "]",
                "reason": "Error posting data"
              });
            }
          };
          xhr.send(fd);
        });
      },

      removeItem: function (id, andThen) {
        priv.doWithFormToken(function (formToken, err) {
          if (err) {
            andThen(err);
            return;
          }
          var parts = priv.getParts(id);
          $.ajax({
            url: priv.getURL('delete', parts.space, parts.page),
            type: "POST",
            async: true,
            dataType: 'text',
            data: {
              confirm: '1',
              form_token: formToken
            },
            success: function () {
              andThen(null);
            },
            error: function (jqxhr, err, cause) {
              andThen({
                "status": jqxhr.status,
                "statusText": jqxhr.statusText,
                "error": err,
                "message": "Failed to delete document [" + id + "]",
                "reason": cause
              });
            }
          });
        });
      },

      removeAttachment: function (docId, fileName, andThen) {
        var parts = priv.getParts(docId);
        priv.doWithFormToken(function (formToken, err) {
          if (err) {
            andThen(err);
            return;
          }
          $.ajax({
            url: priv.getURL('delattachment', parts.space, parts.page) +
              '/' + fileName,
            type: "POST",
            async: true,
            dataType: 'text',
            data: {
              ajax: '1',
              form_token: formToken
            },
            success: function () {
              andThen(null);
            },
            error: function (jqxhr, err, cause) {
              andThen({
                "status": jqxhr.status,
                "statusText": jqxhr.statusText,
                "error": err,
                "message": "Failed to delete attachment ["
                    + docId + '/' + fileName + "]",
                "reason": cause
              });
            }
          });
        });
      },

      /**
       * Gets a document list from the xwiki storage.
       * It will retreive an array containing files meta data owned by
       * the user.
       * @method allDocs
       */
      allDocs: function (includeDocs, andThen) {
        var getData = function (callback) {
          $.ajax({
            url: priv.xwikiurl + '/rest/wikis/xwiki/pages?cb=' + Date.now(),
            type: "GET",
            async: true,
            dataType: 'xml',
            success: function (xmlData) {
              var data = [];
              $(xmlData).find('fullName').each(function () {
                data[data.length] = $(this).text();
              });
              callback(data);
            },
            error: function (error) {
              andThen(null, error);
            }
          });
        };

        getData(function (rows, err) {
          var i, next;
          next = function (i) {
            priv._storage.getItem(rows[i].id, function (doc, err) {
              if (err) {
                andThen(null, err);
                return;
              }
              rows[i].doc = doc;
              if (i < rows.length) {
                next(i + 1);
              } else {
                andThen(rows);
              }
            });
          };
          if (err) {
            return andThen(null, err);
          }
          for (i = 0; i < rows.length; i++) {
            rows[i] = {
              id: rows[i],
              key: rows[i],
              value: {}
            };
          }
          if (includeDocs) {
            next(0);
          } else {
            andThen(rows);
          }
        });
      }
    };
  }

  /**
   * Create a document in local storage.
   *
   * @method post
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to store
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.post = function (command, metadata) {
    var doc_id = metadata._id, that = this;
    if (!doc_id) {
      doc_id = jIO.util.generateUuid();
    }
    that._storage.getItem(doc_id, function (doc, err) {
      if (err) {
        command.error(err);
        return;
      }
      if (doc === null) {
        // the document does not exist
        doc = jIO.util.deepClone(metadata);
        doc._id = doc_id;
        delete doc._attachments;
        that._storage.setItem(doc_id, doc, function (err) {
          if (err) {
            command.error(
              "failed",
              "failed to upload document",
              String(err)
            );
          } else {
            command.success({"id": doc_id});
          }
        });
      } else {
        // the document already exists
        command.error(
          "conflict",
          "document exists",
          "Cannot create a new document"
        );
      }
    });
  };

  /**
   * Create or update a document in local storage.
   *
   * @method put
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to store
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.put = function (command, metadata) {
    var tmp, status, that = this;
    that._storage.getItem(metadata._id, function (doc, err) {
      if (err) {
        command.error(err);
        return;
      }
      if (doc === null || doc === undefined) {
        //  the document does not exist
        doc = jIO.util.deepClone(metadata);
        delete doc._attachments;
        status = "created";
      } else {
        // the document already exists
        tmp = jIO.util.deepClone(metadata);
        tmp._attachments = doc._attachments;
        doc = tmp;
        status = "no_content";
      }
      // write
      that._storage.setItem(metadata._id, doc, function (err) {
        if (err) { command.error(err); return; }
        command.success(status);
      });
    });
  };

  /**
   * Add an attachment to a document
   *
   * @method putAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.putAttachment = function (command, param) {
    var that = this, status = "created";
    that._storage.getItem(param._id, function (doc, err) {
      if (err) {
        return command.error(err);
      }
      if (doc === null) {
        //  the document does not exist
        return command.error(
          "not_found",
          "missing",
          "Impossible to add attachment"
        );
      }

      // the document already exists
      // download data
      if ((doc._attachments || {})[param._attachment]) {
        status = "no_content";
      }
      that._storage.setAttachment(param._id,
                                  param._attachment,
                                  param._blob,
                                  function (err) {
          if (err) {
            command.error(err);
          } else {
            // XWiki doesn't do digests of attachments
            // so we'll calculate it on the client side.
            jIO.util.readBlobAsBinaryString(param._blob).then(function (e) {
              command.success(status,
                  {"digest": jIO.util.makeBinaryStringDigest(e.target.result)}
                );
            });
          }
        });
    });
  };

  /**
   * Get a document
   *
   * @method get
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.get = function (command, param) {
    this._storage.getItem(param._id, function (ret, err) {
      if (err) { command.error(err); return; }
      if (ret === null) {
        command.error(
          "not_found",
          "missing",
          "Cannot find document"
        );
      } else {
        command.success({"data": ret});
      }
    });
  };

  /**
   * Get an attachment
   *
   * @method getAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.getAttachment = function (command, param) {
    var that = this;
    that._storage.getItem(param._id, function (doc, err) {
      if (err) {
        return command.error(err);
      }
      if (doc === null) {
        return command.error(
          "not_found",
          "missing document",
          "Cannot find document"
        );
      }
      if (typeof doc._attachments !== 'object' ||
          typeof doc._attachments[param._attachment] !== 'object') {
        return command.error(
          "not_found",
          "missing attachment",
          "Cannot find attachment"
        );
      }
      that._storage.getAttachment(param._id, param._attachment,
                                  function (blob, err) {
          var attach = doc._attachments[param._attachment];
          if (err) {
            return command.error(err);
          }
          if (blob.size !== attach.length) {
            return command.error(
              "incomplete",
              "attachment size incorrect",
              "expected [" + attach.size + "] bytes, got [" + blob.size + "]"
            );
          }
          command.success({
            "data": blob,
            "digest": attach.digest || "",
            "content_type": attach.content_type || ""
          });
        });
    });
  };

  /**
   * Remove a document
   *
   * @method remove
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.remove = function (command, param) {
    this._storage.removeItem(param._id, function (err) {
      if (err) {
        command.error(err);
      } else {
        command.success();
      }
    });
  };

  /**
   * Remove an attachment
   *
   * @method removeAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.removeAttachment = function (command, param) {
    var that = this;
    that._storage.getItem(param._id, function (doc, err) {
      if (err) {
        return command.error(err);
      }
      if (typeof doc !== 'object' || doc === null) {
        return command.error(
          "not_found",
          "missing document",
          "Document not found"
        );
      }
      if (typeof doc._attachments !== "object" ||
          typeof doc._attachments[param._attachment] !== "object") {
        return command.error(
          "not_found",
          "missing attachment",
          "Attachment not found"
        );
      }
      that._storage.removeAttachment(param._id, param._attachment,
                                     function (err) {
          if (err) {
            command.error(err);
          } else {
            command.success();
          }
        });
    });
  };

  /**
   * Get all filenames belonging to a user from the document index
   *
   * @method allDocs
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.allDocs = function (command, param, options) {
    var i, document_list, document_object, delete_id, that = this;
    param.unused = true;
    document_list = [];
    if (options.query === undefined && options.sort_on === undefined &&
        options.select_list === undefined &&
        options.include_docs === undefined) {

      that._storage.allDocs(options.include_docs, function (rows, err) {
        if (err) {
          return command.error(err);
        }
        command.success({"data": {"rows": rows, "total_rows": rows.length}});
      });

    } else {

      that._storage.allDocs(true, function (rows, err) {
        if (err) {
          return command.error(err);
        }
        for (i = 0; i < rows.length; i++) {
          document_list.push(rows[i].doc);
        }
      });

      options.select_list = options.select_list || [];
      if (options.select_list.indexOf("_id") === -1) {
        options.select_list.push("_id");
        delete_id = true;
      }
      if (options.include_docs === true) {
        document_object = {};
        document_list.forEach(function (meta) {
          document_object[meta._id] = meta;
        });
      }
      jIO.QueryFactory.create(options.query || "", this._key_schema).
        exec(document_list, options).then(function () {
          document_list = document_list.map(function (value) {
            var o = {
              "id": value._id,
              "key": value._id
            };
            if (options.include_docs === true) {
              o.doc = document_object[value._id];
              delete document_object[value._id];
            }
            if (delete_id) {
              delete value._id;
            }
            o.value = value;
            return o;
          });
          command.success({"data": {
            "total_rows": document_list.length,
            "rows": document_list
          }});
        });
    }
  };

  /**
   * Check the storage or a specific document
   *
   * @method check
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   */
  XWikiStorage.prototype.check = function (command, param) {
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
  XWikiStorage.prototype.repair = function (command, param) {
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
  XWikiStorage.prototype.genericRepair = function (command, param, repair) {

    var that = this, final_result;

    function referenceAttachment(param, attachment) {
      if (param.referenced_attachments.indexOf(attachment) !== -1) {
        return;
      }
      var i = param.unreferenced_attachments.indexOf(attachment);
      if (i !== -1) {
        param.unreferenced_attachments.splice(i, 1);
      }
      param.referenced_attachments[param.referenced_attachments.length] =
        attachment;
    }

    function attachmentFound(param, attachment) {
      if (param.referenced_attachments.indexOf(attachment) !== -1) {
        return;
      }
      if (param.unreferenced_attachments.indexOf(attachment) !== -1) {
        return;
      }
      param.unreferenced_attachments[param.unreferenced_attachments.length] =
        attachment;
    }

    function repairOne(param, repair) {
      var i, doc, modified;
      doc = that._storage.getItem(param._id);
      if (doc === null) {
        return; // OK
      }

      // check document type
      if (typeof doc !== 'object' || doc === null) {
        // wrong document
        if (!repair) {
          return {"error": true, "answers": [
            "conflict",
            "corrupted",
            "Document is unrecoverable"
          ]};
        }
        // delete the document
        that._storage.removeItem(param._id);
        return; // OK
      }
      // good document type
      // repair json document
      if (!repair) {
        if (!(new jIO.Metadata(doc).check())) {
          return {"error": true, "answers": [
            "conflict",
            "corrupted",
            "Some metadata might be lost"
          ]};
        }
      } else {
        modified = jIO.util.uniqueJSONStringify(doc) !==
          jIO.util.uniqueJSONStringify(new jIO.Metadata(doc).format()._dict);
      }
      if (doc._attachments !== undefined) {
        if (typeof doc._attachments !== 'object') {
          if (!repair) {
            return {"error": true, "answers": [
              "conflict",
              "corrupted",
              "Attachments are unrecoverable"
            ]};
          }
          delete doc._attachments;
          that._storage.setItem(param._id, doc);
          return; // OK
        }
        for (i in doc._attachments) {
          if (doc._attachments.hasOwnProperty(i)) {
            // check attachment existence
            if (that._storage.getItem(param._id + "/" + i) !== 'string') {
              if (!repair) {
                return {"error": true, "answers": [
                  "conflict",
                  "missing attachment",
                  "Attachment \"" + i + "\" of \"" + param._id + "\" is missing"
                ]};
              }
              delete doc._attachments[i];
              if (objectIsEmpty(doc._attachments)) {
                delete doc._attachments;
              }
              modified = true;
            } else {
              // attachment exists
              // check attachment metadata
              // check length
              referenceAttachment(param, param._id + "/" + doc._attachments[i]);
              if (doc._attachments[i].length !== undefined &&
                  typeof doc._attachments[i].length !== 'number') {
                if (!repair) {
                  return {"error": true, "answers": [
                    "conflict",
                    "corrupted",
                    "Attachment metadata length corrupted"
                  ]};
                }
                // It could take a long time to get the length, no repair.
                // length can be omited
                delete doc._attachments[i].length;
              }
              // It could take a long time to regenerate the hash, no check.
              // Impossible to discover the attachment content type.
            }
          }
        }
      }
      if (modified) {
        that._storage.setItem(param._id, doc);
      }
      // OK
    }

    function repairAll(param, repair) {
      var i, result;
      for (i in that._database) {
        if (that._database.hasOwnProperty(i)) {
          // browsing every entry

          // is part of the user space
          if (/^[^\/]+\/[^\/]+$/.test(i)) {
            // this is an attachment
            attachmentFound(param, i);
          } else if (/^[^\/]+$/.test(i)) {
            // this is a document
            param._id = i;
            result = repairOne(param, repair);
            if (result) {
              return result;
            }
          } else {
            // this is pollution
            that._storage.removeItem(i);
          }
        }
      }
      // remove unreferenced attachments
      for (i = 0; i < param.unreferenced_attachments.length; i += 1) {
        that._storage.removeItem(param.unreferenced_attachments[i]);
      }
    }

    param.referenced_attachments = [];
    param.unreferenced_attachments = [];
    if (typeof param._id === 'string') {
      final_result = repairOne(param, repair) || {};
    } else {
      final_result = repairAll(param, repair) || {};
    }
    if (final_result.error) {
      return command.error.apply(command, final_result.answers || []);
    }
    command.success.apply(command, final_result.answers || []);
  };

  jIO.addStorage('xwiki', XWikiStorage);

}));
