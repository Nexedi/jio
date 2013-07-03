/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint indent:2, maxlen: 80, nomen: true */
/*global jIO: true, exports: true, define: true */

/**
 * Provides a split storage for JIO. This storage splits data
 * and store them in the sub storages defined on the description.
 *
 *     {
 *       "type": "split",
 *       "storage_list": [<storage description>, ...]
 *     }
 */
(function () {
  "use strict";

  /**
   * Get the real type of an object
   *
   * @param  {Any} value The value to check
   * @return {String} The value type
   */
  function type(value) {
    // returns "String", "Object", "Array", "RegExp", ...
    return (/^\[object ([a-zA-Z]+)\]$/).exec(
      Object.prototype.toString.call(value)
    )[1];
  }

  /**
   * Generate a new uuid
   *
   * @method generateUuid
   * @private
   * @return {String} The new uuid
   */
  function generateUuid() {
    function S4() {
      /* 65536 */
      var i, string = Math.floor(
        Math.random() * 0x10000
      ).toString(16);
      for (i = string.length; i < 4; i += 1) {
        string = '0' + string;
      }
      return string;
    }
    return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() +
      S4() + S4();
  };

  /**
   * The split storage class used by JIO.
   *
   * A split storage instance is able to i/o on several sub storages with
   * split documents.
   *
   * @class splitStorage
   */
  function splitStorage(spec, my) {
    var that = my.basicStorage(spec, my), priv = {};

    /**
     * The list of sub storages we want to use to store part of documents.
     *
     * @attribute storage_list
     * @private
     * @type {Array} Array of storage descriptions
     */
    priv.storage_list = spec.storage_list;

    //////////////////////////////////////////////////////////////////////
    // Overrides

    /**
     * Overrides the original {{#crossLink "storage/specToStore:method"}}
     * specToStore method{{/crossLink}}.
     *
     * @method specToStore
     * @return {Object} The specificities to store
     */
    that.specToStore = function () {
      return {"storage_list": priv.storage_list};
    };

    /**
     * TODO validateState
     */

    //////////////////////////////////////////////////////////////////////
    // Tools

    /**
     * Send a command to all sub storages. All the response are returned
     * in a list. The index of the response correspond to the storage_list
     * index. If an error occurs during operation, the callback is called with
     * `callback(err, undefined)`. The response is given with
     * `callback(undefined, response_list)`.
     *
     * `doc` is the document informations but can also be a list of dedicated
     * document informations. In this case, each document is associated to one
     * sub storage.
     *
     * @method send
     * @private
     * @param  {String} method The command method
     * @param  {Object,Array} doc The document information to send to each sub
     *   storages or a list of dedicated document
     * @param  {Object} option The command option
     * @param  {Function} callback Called at the end
     */
    priv.send = function (method, doc, option, callback) {
      var i, answer_list = [], failed = false;
      function onEnd() {
        i += 1;
        if (i === priv.storage_list.length) {
          callback(undefined, answer_list);
        }
      }
      function onSuccess(i) {
        return function (response) {
          if (!failed) {
            answer_list[i] = response;
          }
          onEnd();
        };
      }
      function onError(i) {
        return function (err) {
          if (!failed) {
            failed = true;
            err.index = i;
            callback(err, undefined);
          }
        };
      }
      if (type(doc) !== "Array") {
        for (i = 0; i < priv.storage_list.length; i += 1) {
          that.addJob(
            method,
            priv.storage_list[i],
            doc,
            option,
            onSuccess(i),
            onError(i)
          );
        }
      } else {
        for (i = 0; i < priv.storage_list.length; i += 1) {
          that.addJob(
            method,
            priv.storage_list[i],
            doc[i],
            option,
            onSuccess(i),
            onError(i)
          );
        }
      }
      i = 0;
    };

    /**
     * Split document metadata then store them to the sub storages.
     *
     * @method postOrPut
     * @private
     * @param  {Object} doc A serialized document object
     * @param  {Object} option Command option properties
     */
    priv.postOrPut = function (doc, option) {
      var i, data, doc_list = [], doc_underscores = {};
      if (!doc._id) {
        doc._id = generateUuid();
      }
      for (i in doc) {
        if (doc.hasOwnProperty(i)) {
          if (i[0] === "_") {
            doc_underscores[i] = doc[i];
            delete doc[i];
          }
        }
      }
      data = JSON.stringify(doc);
      for (i = 0; i < priv.storage_list.length; i += 1) {
        doc_list[i] = JSON.parse(JSON.stringify(doc_underscores));
        doc_list[i].data = data.slice(
          (data.length / priv.storage_list.length) * i,
          (data.length / priv.storage_list.length) * (i + 1)
        );
      }
      priv.send('put', doc_list, option, function (err, response) {
        if (err) {
          err.message = "Unable to post document";
          delete err.index;
          return that.error(err);
        }
        that.success({"ok": true, "id": doc_underscores._id});
      });
    };

    //////////////////////////////////////////////////////////////////////
    // JIO commands

    /**
     * Split document metadata then store them to the sub storages.
     *
     * @method post
     * @param  {Command} command The JIO command
     */
    that.post = function (command) {
      priv.postOrPut(command.cloneDoc(), command.cloneOption());
    };

    /**
     * Split document metadata then store them to the sub storages.
     *
     * @method put
     * @param  {Command} command The JIO command
     */
    that.put = function (command) {
      priv.postOrPut(command.cloneDoc(), command.cloneOption());
    };

    /**
     * Puts an attachment to the sub storages.
     *
     * @method putAttachment
     * @param  {Command} command The JIO command
     */
    that.putAttachment = function (command) {
      var i, attachment_list = [], data = command.getAttachmentData();
      for (i = 0; i < priv.storage_list.length; i += 1) {
        attachment_list[i] = command.cloneDoc();
        attachment_list[i]._data = data.slice(
          (data.length / priv.storage_list.length) * i,
          (data.length / priv.storage_list.length) * (i + 1)
        );
      }
      priv.send(
        'putAttachment',
        attachment_list,
        command.cloneOption(),
        function (err, response) {
          if (err) {
            err.message = "Unable to put attachment";
            delete err.index;
            return that.error(err);
          }
          that.success({
            "ok": true,
            "id": command.getDocId(),
            "attachment": command.getAttachmentId()
          });
        }
      );
    };

    /**
     * Gets splited document metadata then returns real document.
     *
     * @method get
     * @param  {Command} command The JIO command
     */
    that.get = function (command) {
      var doc, option, data, attachments;
      doc = command.cloneDoc();
      option = command.cloneOption();
      priv.send('get', doc, option, function (err, response) {
        var i, k;
        if (err) {
          err.message = "Unable to post document";
          delete err.index;
          return that.error(err);
        }
        doc = '';
        for (i = 0; i < response.length; i += 1) {
          doc += response[i].data;
        }
        doc = JSON.parse(doc);
        for (i = 0; i < response.length; i += 1) {
          for (k in response[i]) {
            if (response[i].hasOwnProperty(k)) {
              if (k[0] === "_") {
                doc[k] = response[i][k];
              }
            }
          }
          if (response[i]._attachments) {
            doc._attachments = doc._attachments || {};
            for (k in response[i]._attachments) {
              if (response[i]._attachments.hasOwnProperty(k)) {
                doc._attachments[k] = doc._attachments[k] || {
                  "length": 0,
                  "digest": "",
                  "content_type": "",
                };
                doc._attachments[k].length +=
                response[i]._attachments[k].length;
                doc._attachments[k].digest = (
                  doc._attachments[k].digest ?
                    doc._attachments[k].digest + " " : ""
                ) + response[i]._attachments[k].digest;
                doc._attachments[k].content_type =
                  response[i]._attachments[k].content_type;
              }
            }
          }
        }
        doc._id = command.getDocId();
        that.success(doc);
      });
    };

    /**
     * Removes a document from the sub storages.
     *
     * @method remove
     * @param  {Command} command The JIO command
     */
    that.remove = function (command) {
      priv.send(
        'remove',
        command.cloneDoc(),
        command.cloneOption(),
        function (err, response_list) {
          if (err) {
            err.message = "Unable to remove document";
            delete err.index;
            return that.error(err);
          }
          that.success({"id": command.getDocId(), "ok": true});
        }
      );
    };

    /**
     * Removes an attachment from the sub storages.
     *
     * @method removeAttachment
     * @param  {Command} command The JIO command
     */
    that.removeAttachment = function (command) {
      var doc = command.cloneDoc();
      priv.send(
        'removeAttachment',
        doc,
        command.cloneOption(),
        function (err, response_list) {
          if (err) {
            err.message = "Unable to remove attachment";
            delete err.index;
            return that.error(err);
          }
          that.success({
            "id": doc._id,
            "attachment": doc._attachment,
            "ok": true
          });
        }
      );
    };

    return that;
  } // end of splitStorage

  //////////////////////////////
  // exports to JIO
  if (typeof define === "function" && define.amd) {
    define(['jio'], function (jio) {
      jio.addStorageType('split', splitStorage);
    });
  } else if (typeof require === "function") {
    require('jio').addStorageType('split', splitStorage);
  } else if (typeof jIO === "object") {
    jIO.addStorageType('split', splitStorage);
  } else {
    throw new Error("Unable to export splitStorage to JIO.");
  }
}());
