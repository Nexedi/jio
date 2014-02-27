/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint indent:2, maxlen: 80, nomen: true */
/*global jIO, define, Blob */

/**
 * Provides a split storage for JIO. This storage splits data
 * and store them in the sub storages defined on the description.
 *
 *     {
 *       "type": "split",
 *       "storage_list": [<storage description>, ...]
 *     }
 */
// define([dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO);
}(['jio'], function (jIO) {
  "use strict";

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
  }

  /**
   * Select a storage to put the document part
   *
   * @method selectStorage
   * @private
   * @return {Object} The selected storage
   */
  function selectStorage(arg, iteration) {
    var step = iteration % arg.length;
    return arg[step];
  }

  /**
   * Class to merge allDocs responses from several sub storages.
   *
   * @class AllDocsResponseMerger
   * @constructor
   */
  function AllDocsResponseMerger() {

    /**
     * A list of allDocs response.
     *
     * @attribute response_list
     * @type {Array} Contains allDocs responses
     * @default []
     */
    this.response_list = [];
  }
  AllDocsResponseMerger.prototype.constructor = AllDocsResponseMerger;

  /**
   * Add an allDocs response to the response list.
   *
   * @method addResponse
   * @param  {Object} response The allDocs response.
   * @return {AllDocsResponseMerger} This
   */
  AllDocsResponseMerger.prototype.addResponse = function (response) {
    this.response_list.push(response);
    return this;
  };

  /**
   * Add several allDocs responses to the response list.
   *
   * @method addResponseList
   * @param  {Array} response_list An array of allDocs responses.
   * @return {AllDocsResponseMerger} This
   */
  AllDocsResponseMerger.prototype.addResponseList = function (response_list) {
    var i;
    for (i = 0; i < response_list.length; i += 1) {
      this.response_list.push(response_list[i]);
    }
    return this;
  };

  /**
   * Merge the response_list to one allDocs response.
   *
   * The merger will find rows with the same id in order to merge them, thanks
   * to the onRowToMerge method. If no row correspond to an id, rows with the
   * same id will be ignored.
   *
   * @method merge
   * @param  {Object} [option={}] The merge options
   * @param  {Boolean} [option.include_docs=false] Tell the merger to also
   *   merge metadata if true.
   * @return {Object} The merged allDocs response.
   */
  AllDocsResponseMerger.prototype.merge = function (option) {
    var result = [], row, to_merge = [], tmp, i;
    if (this.response_list.length === 0) {
      return [];
    }
    /*jslint ass: true */
    while ((row = this.response_list[0].data.rows.shift()) !== undefined) {
      to_merge[0] = row;
      for (i = 1; i < this.response_list.length; i += 1) {
        to_merge[i] = AllDocsResponseMerger.listPopFromRowId(
          this.response_list[i].data.rows,
          row.id
        );
        if (to_merge[i] === undefined) {
          break;
        }
      }
      tmp = this.onRowToMerge(to_merge, option || {});
      if (tmp !== undefined) {
        result[result.length] = tmp;
      }
    }
    this.response_list = [];
    return {"total_rows": result.length, "rows": result};
  };

  /**
   * This method is called when the merger want to merge several rows with the
   * same id.
   *
   * @method onRowToMerge
   * @param  {Array} row_list An array of rows.
   * @param  {Object} [option={}] The merge option.
   * @param  {Boolean} [option.include_docs=false] Also merge the metadata if
   *   true
   * @return {Object} The merged row
   */
  AllDocsResponseMerger.prototype.onRowToMerge = function (row_list, option) {
    var i, k, new_row = {"value": {}}, data = "";
    option = option || {};
    for (i = 0; i < row_list.length; i += 1) {
      new_row.id = row_list[i].id;
      if (row_list[i].key) {
        new_row.key = row_list[i].key;
      }
      if (option.include_docs) {
        new_row.doc = new_row.doc || {};
        for (k in row_list[i].doc) {
          if (row_list[i].doc.hasOwnProperty(k)) {
            if (k[0] === "_") {
              new_row.doc[k] = row_list[i].doc[k];
            }
          }
        }
        data += row_list[i].doc.data;
      }
    }
    if (option.include_docs) {
      try {
        data = JSON.parse(data);
      } catch (e) { return undefined; }
      for (k in data) {
        if (data.hasOwnProperty(k)) {
          new_row.doc[k] = data[k];
        }
      }
    }
    return new_row;
  };

  /**
   * Search for a specific row and pop it. During the search operation, all
   * parsed rows are stored on a dictionnary in order to be found instantly
   * later.
   *
   * @method listPopFromRowId
   * @param  {Array} rows The row list
   * @param  {String} doc_id The document/row id
   * @return {Object/undefined} The poped row
   */
  AllDocsResponseMerger.listPopFromRowId = function (rows, doc_id) {
    var row;
    if (!rows.dict) {
      rows.dict = {};
    }
    if (rows.dict[doc_id]) {
      row = rows.dict[doc_id];
      delete rows.dict[doc_id];
      return row;
    }
    /*jslint ass: true*/
    while ((row = rows.shift()) !== undefined) {
      if (row.id === doc_id) {
        return row;
      }
      rows.dict[row.id] = row;
    }
  };


  /**
   * The split storage class used by JIO.
   *
   * A split storage instance is able to i/o on several sub storages with
   * split documents.
   *
   * @class SplitStorage
   */
  function SplitStorage(spec) {
    var that = this, priv = {};

    /**
     * The list of sub storages we want to use to store part of documents.
     *
     * @attribute storage_list
     * @private
     * @type {Array} Array of storage descriptions
     */
    priv.storage_list = spec.storage_list;

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
    priv.send = function (command, method, doc, option, callback) {
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
      //dans quel cas le doc peut-il etre un array ?
      //doc_list LENGTH != priv.storage_list LENGTH

      if (!Array.isArray(doc)) {
        for (i = 0; i < doc.length; i += 1) {
          //fonction pour définir le storage en cours
          var currentServer = selectStorage(priv.storage_list, i, doc.length);

          
          console.log('current server :'+currentServer);
          if (method === 'allDocs') {
            command.storage(currentServer)[method](option).
              then(onSuccess(i), onError(i));
          } else {
            command.storage(currentServer)[method](doc, option).
              then(onSuccess(i), onError(i));
          }
        }
      } else {
        for (i = 0; i < doc.length; i += 1) {
          var currentServer = selectStorage(priv.storage_list, i, doc.length);
          console.log('current server :'+currentServer);
          // we assume that alldocs is not called if the there is several docs
          command.storage(priv.storage_list[i])[method](doc[i], option).
            then(onSuccess(i), onError(i));
        }
      }

      //default splitstorage method
      /*
      if (!Array.isArray(doc)) {
        for (i = 0; i < priv.storage_list.length; i += 1) {
          if (method === 'allDocs') {
            command.storage(priv.storage_list[i])[method](option).
              then(onSuccess(i), onError(i));
          } else {
            command.storage(priv.storage_list[i])[method](doc, option).
              then(onSuccess(i), onError(i));
          }
        }
      } else {
        for (i = 0; i < priv.storage_list.length; i += 1) {
          // we assume that alldocs is not called if the there is several docs
          command.storage(priv.storage_list[i])[method](doc[i], option).
            then(onSuccess(i), onError(i));
        }
      }
      */


      //re-init
      i = 0;
    };

    /**
     * Split document metadata then store them to the sub storages.
     *
     * @method postOrPut
     * @private
     * @param  {Object} doc A serialized document object
     * @param  {Object} option Command option properties
     * @param  {String} method The command method ('post' or 'put')
     */
    priv.postOrPut = function (command, doc, option, method) {
      var i, data, doc_list = [], doc_underscores = {};
      if (!doc._id) {
        doc._id = generateUuid(); // XXX should let gidstorage guess uid
        //a posteriori, completer l'id avec l'index de découpage
      }
      for (i in doc) {
        //si le doc a la clé
        if (doc.hasOwnProperty(i)) {
          //si l'index 0 de i est un undersore
          console.log('i')
          console.log(i);
          if (i[0] === "_") {
            doc_underscores[i] = doc[i];
            delete doc[i];
          }
        }
      }
      data = JSON.stringify(doc);
      //decoupage plus fin ?
      //option ? !base 100
      //for (i = 0; i < priv.storage_list.length; i += 1) {
        //doc_list[i] = JSON.parse(JSON.stringify(doc_underscores));
        //doc_list[i].data = data.slice(
          //(data.length / priv.storage_list.length) * i,
          //(data.length / priv.storage_list.length) * (i + 1)
        //);
        //console.info('doc_list[i].data');
        //console.log(doc_list[i].data);
      //}


      for (i = 0; i < 100; i += 1) {
        doc_list[i] = JSON.parse(JSON.stringify(doc_underscores));
        doc_list[i]._id = doc_list[i]._id +'_'+i;
        doc_list[i].data = data.slice(
          (data.length / 100) * i,
          (data.length / 100) * (i + 1)
        );
      }

      priv.send(command, method, doc_list, option, function (err) {
        if (err) {
          err.message = "Unable to " + method + " document";
          delete err.index;
          return command.error(err);
        }
        command.success({"id": doc_underscores._id});
      });
    };

    //////////////////////////////////////////////////////////////////////
    // JIO commands

    /**
     * Split document metadata then store them to the sub storages.
     *
     * @method post
     * @param  {Object} command The JIO command
     */
    that.post = function (command, metadata, option) {
      priv.postOrPut(command, metadata, option, 'post');
    };

    /**
     * Split document metadata then store them to the sub storages.
     *
     * @method put
     * @param  {Object} command The JIO command
     */
    that.put = function (command, metadata, option) {
      priv.postOrPut(command, metadata, option, 'put');
    };

    /**
     * Puts an attachment to the sub storages.
     *
     * @method putAttachment
     * @param  {Object} command The JIO command
     */
    that.putAttachment = function (command, param, option) {
      var i, attachment_list = [], data = param._blob;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        attachment_list[i] = jIO.util.deepClone(param);
        attachment_list[i]._blob = data.slice(
          data.size * i / priv.storage_list.length,
          data.size * (i + 1) / priv.storage_list.length,
          data.type
        );
      }
      priv.send(
        command,
        'putAttachment',
        attachment_list,
        option,
        function (err) {
          if (err) {
            err.message = "Unable to put attachment";
            delete err.index;
            return command.error(err);
          }
          command.success();
        }
      );
    };

    /**
     * Gets splited document metadata then returns real document.
     *
     * @method get
     * @param  {Object} command The JIO command
     */
    that.get = function (command, param, option) {
      var doc = param;
      priv.send(command, 'get', doc, option, function (err, response) {
        var i, k;
        if (err) {
          err.message = "Unable to get document";
          delete err.index;
          return command.error(err);
        }
        doc = '';
        for (i = 0; i < response.length; i += 1) {
          response[i] = response[i].data;
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
        }
        delete doc._attachments;
        for (i = 0; i < response.length; i += 1) {
          if (response[i]._attachments) {
            for (k in response[i]._attachments) {
              if (response[i]._attachments.hasOwnProperty(k)) {
                doc._attachments = doc._attachments || {};
                doc._attachments[k] = doc._attachments[k] || {
                  "length": 0,
                  "content_type": ""
                };
                doc._attachments[k].length += response[i]._attachments[k].
                  length;
                // if (response[i]._attachments[k].digest) {
                //   if (doc._attachments[k].digest) {
                //     doc._attachments[k].digest += " " + response[i].
                //       _attachments[k].digest;
                //   } else {
                //     doc._attachments[k].digest = response[i].
                //       _attachments[k].digest;
                //   }
                // }
                doc._attachments[k].content_type = response[i]._attachments[k].
                  content_type;
              }
            }
          }
        }
        command.success({"data": doc});
      });
    };

    /**
     * Gets splited document attachment then returns real attachment data.
     *
     * @method getAttachment
     * @param  {Object} command The JIO command
     */
    that.getAttachment = function (command, param, option) {
      priv.send(command, 'getAttachment', param, option, function (
        err,
        response
      ) {
        if (err) {
          err.message = "Unable to get attachment";
          delete err.index;
          return command.error(err);
        }

        command.success({"data": new Blob(response.map(function (answer) {
          return answer.data;
        }), {"type": response[0].data.type})});
      });
    };

    /**
     * Removes a document from the sub storages.
     *
     * @method remove
     * @param  {Object} command The JIO command
     */
    that.remove = function (command, param, option) {
      priv.send(
        command,
        'remove',
        param,
        option,
        function (err) {
          if (err) {
            err.message = "Unable to remove document";
            delete err.index;
            return command.error(err);
          }
          command.success();
        }
      );
    };

    /**
     * Removes an attachment from the sub storages.
     *
     * @method removeAttachment
     * @param  {Object} command The JIO command
     */
    that.removeAttachment = function (command, param, option) {
      priv.send(
        command,
        'removeAttachment',
        param,
        option,
        function (err) {
          if (err) {
            err.message = "Unable to remove attachment";
            delete err.index;
            return command.error(err);
          }
          command.success();
        }
      );
    };

    /**
     * Retreive a list of all document in the sub storages.
     *
     * If include_docs option is false, then it returns the document list from
     * the first sub storage. Else, it will merge results and return.
     *
     * @method allDocs
     * @param  {Object} command The JIO command
     */
    that.allDocs = function (command, param, option) {
      option = {"include_docs": option.include_docs};
      priv.send(
        command,
        'allDocs',
        param,
        option,
        function (err, response_list) {
          var all_docs_merger;
          if (err) {
            err.message = "Unable to retrieve document list";
            delete err.index;
            return command.error(err);
          }
          all_docs_merger = new AllDocsResponseMerger();
          all_docs_merger.addResponseList(response_list);
          return command.success({"data": all_docs_merger.merge(option)});
        }
      );
    };

  } // end of splitStorage

  jIO.addStorage('split', SplitStorage);
}));
