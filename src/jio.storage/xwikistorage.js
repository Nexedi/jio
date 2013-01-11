/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global toSend: true, jIO: true, jQuery: true, Base64: true */

  /**
   * JIO XWiki based storage. Type = 'xwiki'.
   * Edits XWiki documents as html using html editor.
   * Test this code using the following inputs:
   *
{"type":"xwiki","username":"Admin","password":"admin","xwikiurl":"http://127.0.0
.1:8080/xwiki","space":"OfficeJS"}
   */

(function ($, Base64) {

  var newXWikiStorage = function (spec, my) {
    var that, priv, escapeDocId, restoreDocId,
      doWithFormToken, getDates, super_serialized;

    /** The input configuration. */
    spec = spec || {};

    /** The "public" object which will have methods called on it. */
    that = my.basicStorage(spec, my);

    /** "private" fields. */
    priv = {
      username: spec.username || '',
      password: spec.password || '',
      xwikiurl: spec.xwikiurl || '',
      space: spec.space || ''
    };

    //--------------------- Private Functions ---------------------//
    /** Escape a document ID by URL escaping all '/' characters. */
    escapeDocId = function (docId) {
      // jslint: replaced "." with [\w\W]
      return docId.replace(/[\w\W]html$/, '').split('/').join('%2F');
    };

    /** Restore a document id from the escaped form. */
    restoreDocId = function (escapedDocId) {
      return escapedDocId.split('%2F').join('/') + '.html';
    };

    /**
     * Get the Anti-CSRF token and do something with it.
     *
     * @param docId document id of document which you have permission to edit.
     * @param whatToDo function which is called with form token as parameter.
     */
    doWithFormToken = function (docId, whatToDo) {
      var url = priv.xwikiurl + '/bin/edit/' + priv.space + '/' +
        escapeDocId(docId) + '?editor=wiki&cachebuster=' + Date.now();
      $.ajax({
        url: url,
        type: "GET",
        async: true,
        dataType: 'text',
        headers: {
          'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
            priv.password)
        },
        success: function (html) {
          whatToDo($(html).find('input[name=form_token]').attr('value'));
        }
      });
    };
    /**
     * Get the creation and modification dates for a page.
     *
     * @param docId the ID of the document.
     * @param callWhenDone callback, will be called when function finishes.
     */
    getDates = function (docId, callWhenDone) {
    // http://127.0.0.1:8080/xwiki/rest/wikis/xwiki/
    //  spaces/Main/pages/<pageName>
      var map = {};
      $.ajax({
        url: priv.xwikiurl + '/rest/wikis/' + 'xwiki' + '/spaces/' + priv.space
          + '/pages/' + escapeDocId(docId) + '?cachebuster=' + Date.now(),
        type: "GET",
        async: true,
        dataType: 'xml',
        headers: {
          'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
            priv.password)
        },
        success: function (xmlData) {
          $(xmlData).find('modified').each(function () {
            map._last_modified = Date.parse($(this).text());
          });
          $(xmlData).find('created').each(function () {
            map._creation_date = Date.parse($(this).text());
          });
          callWhenDone();
        }
      });
      return map;
    };

    //--------------------- Public Functions ---------------------//
    /** Get a serialized form of the module state. */
    super_serialized = that.serialized;
    that.serialized = function () {
      var o = super_serialized(), key;
      for (key in priv) {
        if (priv.hasOwnProperty(key)) {
          o[key] = priv[key];
        }
      }
      return o;
    };
    /** Check that the storage module is properly setup. */
    that.validateState = function () {
      var key;
      for (key in priv) {
        if (priv.hasOwnProperty(key) && !priv[key]) {
          return 'Must specify "' + key + '".';
        }
      }
      return '';
    };
    /** Alias to put() */
    that.post = function (command) {
      that.put(command);
    };
    /**
     * Saves a document as an XWikiDocument.
     *
     * @param command must contain document ID and document content.
     */
    that.put = function (command) {
      doWithFormToken(command.getDocId(), function (formToken) {
        if (!formToken) {
          throw new Error("missing form token");
        }
        $.ajax({
          url: priv.xwikiurl + '/bin/preview/' + priv.space + '/' +
            escapeDocId(command.getDocId()),
          type: "POST",
          async: true,
          dataType: 'text',
          headers: {
            'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
              priv.password)
          },
          data: {
            parent: '',
            title: '',
            xredirect: '',
            language: 'en',
            RequiresHTMLConversion: 'content',
            content_syntax: 'xwiki/2.1',
            content: command.getDocContent(),
            xeditaction: 'edit',
            comment: 'Saved by OfficeJS',
            action_saveandcontinue: 'Save & Continue',
            syntaxId: 'xwiki/2.1',
            xhidden: 0,
            minorEdit: 0,
            ajax: true,
            form_token: formToken
          },
          success: function () {
            that.success({
              ok: true,
              id: command.getDocId()
            });
          }
        });
      });
    }; // end put
    /**
     * Loads a document from the XWiki storage.
     */
    that.get = function (command) {
      // /bin/view/Main/WebHomee?xpage=plain
      /**
       * Protocol specification:
       * {
       *     "_id": "somePage",
       *     "content": "aoeu",
       *     "_creation_date": 1348154789478,
       *     "_last_modified": 1348154789478
       * }
       */
      var doc,
        pendingRequests = 2,
        finishedRequest = function () {
          pendingRequests -= 1;
          if (pendingRequests < 1) {
            that.success(doc);
          }
        };
      doc = (function () {
        var resultMap = getDates(command.getDocId(), finishedRequest);
        $.ajax({
          url: priv.xwikiurl + '/bin/get/' + priv.space + '/' +
            escapeDocId(command.getDocId()) + '?xpage=plain&cachebuster=' +
            Date.now(),
          type: "GET",
          async: true,
          dataType: 'text',
          headers: {
            'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
              priv.password)
          },
          success: function (html) {
            resultMap.content = html;
            finishedRequest();
          }
        });
        return resultMap;
      }());
      doc._id = command.getDocId();
    }; // end get

    /**
     * Gets a document list from the xwiki storage.
     * It will retreive an array containing files meta data owned by
     * the user.
     * @method allDocs
     */
    that.allDocs = function (command) {
      // http://127.0.0.1:8080/xwiki/rest/wikis/xwiki/spaces/Main/pages
      $.ajax({
        url: priv.xwikiurl + '/rest/wikis/' + 'xwiki' + '/spaces/' +
          priv.space + '/pages?cachebuster=' + Date.now(),
        type: "GET",
        async: true,
        dataType: 'xml',
        headers: {
          'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
            priv.password)
        },
        success: function (xmlData) {
          /** Protocol definition:
           *  {
           *    "total_rows":2,
           *    "rows":[{
           *        "id":"b",
           *        "key":"b",
           *        "value":{
           *          "content":"aoeu",
           *          "_creation_date":1348154789478,
           *          "_last_modified":1348154789478
           *        }
           *      },
           *      {
           *        "id":"oeau",
           *        "key":"oeau",
           *        "value"{
           *          "content":"oeu",
           *          "_creation_date":1348154834680,
           *          "_last_modified":1348154834680
           *        }
           *      }
           *    ]
           *  }
           */
          var totalRows = 0,
            data = [],
            // The number of async calls which are waiting to return.
            outstandingCalls = 0,
            toSend;
          $(xmlData).find('name').each(function () {
            outstandingCalls += 1;
            var id = restoreDocId($(this).text()),
              entry = {
                'id': id,
                'key': id,
                'value': getDates(id, function () {
                  outstandingCalls -= 1;
                  if (outstandingCalls < 1) {
                    that.success(toSend);
                  }
                })
              };
            data[totalRows += 1] = entry;
          });
          toSend = {
            'total_rows': totalRows,
            'rows': data
          };
          /* TODO: Include the content if requested.
                if (!command.getOption('metadata_only')) {
                    getContent();
                } else {
                    that.success(toSend);
                }
                */
        },
        error: function (type) {
          if (type.status === 404) {
            type.message = 'Cannot find "' + command.getDocId() +
              '"informations.';
            type.reason = 'missing';
            that.error(type);
          } else {
            type.reason = 'Cannot get "' + command.getDocId() +
              '"informations';
            type.message = type.reason + '.';
            that.retry(type);
          }
        }
      });
    };
    /**
     * Removes a document from the XWiki storage.
     */
    that.remove = function (command) {
    // http://127.0.0.1:8080/xwiki/bin/delete/Main/WebHomee?
    // confirm=1&form_token= //r7x0oGBSk2EFm2fxVULfFA
      doWithFormToken(command.getDocId(), function (formToken) {
        $.ajax({
          url: priv.xwikiurl + '/bin/delete/' + priv.space + '/' +
            escapeDocId(command.getDocId()),
          type: "POST",
          async: true,
          dataType: 'text',
          headers: {
            'Authorization': 'Basic ' + Base64.encode(priv.username + ':' +
              priv.password)
          },
          data: {
            confirm: 1,
            form_token: formToken
          },
          success: function () {
            that.success({
              ok: true,
              id: command.getDocId()
            });
          }
        });
      });
    }; // end remove
    return that;
  };
  jIO.addStorageType('xwiki', newXWikiStorage);
}(jQuery, Base64));