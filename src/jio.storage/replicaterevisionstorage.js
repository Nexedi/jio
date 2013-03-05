/*jslint indent: 2, maxlen: 80, nomen: true */
/*global jIO: true */
/**
 * JIO Replicate Revision Storage.
 * It manages storages that manage revisions and conflicts.
 * Description:
 * {
 *     "type": "replicaterevision",
 *     "storage_list": [
 *         <sub storage description>,
 *         ...
 *     ]
 * }
 */
jIO.addStorageType('replicaterevision', function (spec, my) {
  "use strict";
  var that, priv = {};
  spec = spec || {};
  that = my.basicStorage(spec, my);

  priv.storage_list_key = "storage_list";
  priv.storage_list = spec[priv.storage_list_key];
  priv.emptyFunction = function () {};

  that.specToStore = function () {
    var o = {};
    o[priv.storage_list_key] = priv.storage_list;
    return o;
  };

  /**
   * Generate a new uuid
   * @method generateUuid
   * @return {string} The new uuid
   */
  priv.generateUuid = function () {
    var S4 = function () {
      var i, string = Math.floor(
        Math.random() * 0x10000 /* 65536 */
      ).toString(16);
      for (i = string.length; i < 4; i += 1) {
        string = "0" + string;
      }
      return string;
    };
    return S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();
  };

  /**
   * Create an array containing dictionnary keys
   * @method dictKeys2Array
   * @param  {object} dict The object to convert
   * @return {array} The array of keys
   */
  priv.dictKeys2Array = function (dict) {
    var k, newlist = [];
    for (k in dict) {
      if (dict.hasOwnProperty(k)) {
        newlist.push(k);
      }
    }
    return newlist;
  };

  /**
   * Checks a revision format
   * @method checkRevisionFormat
   * @param  {string} revision The revision string
   * @return {boolean} True if ok, else false
   */
  priv.checkRevisionFormat = function (revision) {
    return (/^[0-9]+-[0-9a-zA-Z_]+$/.test(revision));
  };

  /**
   * Clones an object in deep (without functions)
   * @method clone
   * @param  {any} object The object to clone
   * @return {any} The cloned object
   */
  priv.clone = function (object) {
    var tmp = JSON.stringify(object);
    if (tmp === undefined) {
      return undefined;
    }
    return JSON.parse(tmp);
  };

  /**
   * Like addJob but also return the method and the index of the storage
   * @method send
   * @param  {string} method The request method
   * @param  {number} index The storage index
   * @param  {object} doc The document object
   * @param  {object} option The request object
   * @param  {function} callback The callback. Parameters:
   * - {string} The request method
   * - {number} The storage index
   * - {object} The error object
   * - {object} The response object
   */
  priv.send = function (method, index, doc, option, callback) {
    var wrapped_callback_success, wrapped_callback_error;
    callback = callback || priv.emptyFunction;
    wrapped_callback_success = function (response) {
      callback(method, index, undefined, response);
    };
    wrapped_callback_error = function (err) {
      callback(method, index, err, undefined);
    };
    that.addJob(
      method,
      priv.storage_list[index],
      doc,
      option,
      wrapped_callback_success,
      wrapped_callback_error
    );
  };

  /**
   * Use "send" method to all sub storages.
   * Calling "callback" for each storage response.
   * @method sendToAll
   * @param  {string} method The request method
   * @param  {object} doc The document object
   * @param  {object} option The request option
   * @param  {function} callback The callback. Parameters:
   * - {string} The request method
   * - {number} The storage index
   * - {object} The error object
   * - {object} The response object
   */
  priv.sendToAll = function (method, doc, option, callback) {
    var i;
    for (i = 0; i < priv.storage_list.length; i += 1) {
      priv.send(method, i, doc, option, callback);
    }
  };

  /**
   * Use "send" method to all sub storages.
   * Calling "callback" for each storage response.
   * @method sendToAll
   * @param  {string} method The request method
   * @param  {object} doc The document object
   * @param  {object} option The request option
   * @param  {function} callback The callback. Parameters:
   * - {string} The request method
   * - {number} The storage index
   * - {object} The error object
   * - {object} The response object
   */
  priv.sendToAllFastestResponseOnly = function (method, doc, option, callback) {
    var i, callbackWrapper, error_count, last_error;
    error_count = 0;
    callbackWrapper = function (method, index, err, response) {
      if (err) {
        error_count += 1;
        last_error = err;
        if (error_count === priv.storage_list.length) {
          return callback(err, response);
        }
      }
      callback(err, response);
    };
    for (i = 0; i < priv.storage_list.length; i += 1) {
      priv.send(method, i, doc, option, callbackWrapper);
    }
  };

  /**
   * Checks if the sub storage are identical
   * @method check
   * @param  {object} command The JIO command
   */
  that.check = function (command) {
    function callback(err, response) {
      if (err) {
        return that.error(err);
      }
      that.success(response);
    }
    priv.check(
      command.cloneDoc(),
      command.cloneOption(),
      callback
    );
  };

  /**
   * Repair the sub storages to make them identical
   * @method repair
   * @param  {object} command The JIO command
   */
  that.repair = function (command) {
    function callback(err, response) {
      if (err) {
        return that.error(err);
      }
      that.success(response);
    }
    priv.repair(
      command.cloneDoc(),
      command.cloneOption(),
      true,
      callback
    );
  };

  priv.check = function (doc, option, success, error) {
    priv.repair(doc, option, false, success, error);
  };

  priv.repair = function (doc, option, repair, callback) {
    var functions = {};
    callback = callback || priv.emptyFunction;
    option = option || {};
    functions.begin = function () {
    // };
    // functions.repairAllSubStorages = function () {
      var i;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        priv.send(
          repair ? "repair" : "check",
          i,
          doc,
          option,
          functions.repairAllSubStoragesCallback
        );
      }
    };
    functions.repair_sub_storages_count = 0;
    functions.repairAllSubStoragesCallback = function (method,
                                                       index, err, response) {
      if (err) {
        return that.error(err);
      }
      functions.repair_sub_storages_count += 1;
      if (functions.repair_sub_storages_count === priv.storage_list.length) {
        functions.getAllDocuments(functions.newParam(
          doc,
          option,
          repair
        ));
      }
    };
    functions.newParam = function (doc, option, repair) {
      var param = {
        "doc": doc,
        "option": option,
        "repair": repair,
        "responses": {
          "count": 0,
          "list": [
            // 0: response0
            // 1: response1
            // 2: response2
          ],
          "stats": {
            // responseA: [0, 1]
            // responseB: [2]
          },
          "stats_items": [
            // 0: [responseA, [0, 1]]
            // 1: [responseB, [2]]
          ]
        },
        "conflicts": {
          // revC: true
          // revD: true
        },
        "deal_result_state": "ok",
        "my_rev": undefined
      };
      param.responses.list.length = priv.storage_list.length;
      return param;
    };
    functions.getAllDocuments = function (param) {
      var i, doc = priv.clone(param.doc), option = priv.clone(param.option);
      option.conflicts = true;
      option.revs = true;
      option.revs_info = true;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        // if the document is not loaded
        priv.send("get", i, doc, option, functions.dealResults(param));
      }
      functions.finished_count += 1;
    };
    functions.dealResults = function (param) {
      return function (method, index, err, response) {
        var response_object = {};
        if (param.deal_result_state !== "ok") {
          // deal result is in a wrong state, exit
          return;
        }
        if (err) {
          if (err.status !== 404) {
            // get document failed, exit
            param.deal_result_state = "error";
            callback({
              "status": 40,
              "statusText": "Check Failed",
              "error": "check_failed",
              "message": "An error occured on the sub storage",
              "reason": err.reason
            }, undefined);
            return;
          }
        }
        // success to get the document
        // add the response in memory
        param.responses.count += 1;
        param.responses.list[index] = response;

        // add the conflicting revision for other synchronizations
        functions.addConflicts(param, (response || {})._conflicts);
        if (param.responses.count !== param.responses.list.length) {
          // this is not the last response, wait for the next response
          return;
        }

        // this is now the last response
        functions.makeResponsesStats(param.responses);
        if (param.responses.stats_items.length === 1) {
          // the responses are equals!
          response_object.ok = true;
          response_object.id = param.doc._id;
          if (doc._rev) {
            response_object.rev = doc._rev;
            // "rev": (typeof param.responses.list[0] === "object" ?
            //         param.responses.list[0]._rev : undefined)
          }
          callback(undefined, response_object);
          return;
        }
        // the responses are different
        if (param.repair === false) {
          // do not repair
          callback({
            "status": 41,
            "statusText": "Check Not Ok",
            "error": "check_not_ok",
            "message": "Some documents are different in the sub storages",
            "reason": "Storage contents differ"
          }, undefined);
          return;
        }
        // repair
        functions.synchronizeAllSubStorage(param);
        if (param.option.synchronize_conflicts !== false) {
          functions.synchronizeConflicts(param);
        }
      };
    };
    functions.addConflicts = function (param, list) {
      var i;
      list = list || [];
      for (i = 0; i < list.length; i += 1) {
        param.conflicts[list[i]] = true;
      }
    };
    functions.makeResponsesStats = function (responses) {
      var i, str_response;
      for (i = 0; i < responses.count; i += 1) {
        str_response = JSON.stringify(responses.list[i]);
        if (responses.stats[str_response] === undefined) {
          responses.stats[str_response] = [];
          responses.stats_items.push([
            str_response,
            responses.stats[str_response]
          ]);
        }
        responses.stats[str_response].push(i);
      }
    };
    functions.synchronizeAllSubStorage = function (param) {
      var i, j, len = param.responses.stats_items.length;
      for (i = 0; i < len; i += 1) {
        // browsing responses
        for (j = 0; j < len; j += 1) {
          // browsing storage list
          if (i !== j) {
            functions.synchronizeResponseToSubStorage(
              param,
              param.responses.stats_items[i][0],
              param.responses.stats_items[j][1]
            );
          }
        }
      }
      functions.finished_count -= 1;
    };
    functions.synchronizeResponseToSubStorage = function (
      param,
      response,
      storage_list
    ) {
      var i, new_doc;
      if (response === undefined) {
        // no response to sync
        return;
      }
      for (i = 0; i < storage_list.length; i += 1) {
        new_doc = JSON.parse(response);
        new_doc._revs = new_doc._revisions;
        delete new_doc._rev;
        delete new_doc._revisions;
        delete new_doc._conflicts;
        functions.finished_count += 1;
        priv.send(
          "put",
          storage_list[i],
          new_doc,
          param.option,
          functions.finished
        );
      }
    };
    functions.synchronizeConflicts = function (param) {
      var rev, new_doc, new_option;
      new_option = priv.clone(param.option);
      new_option.synchronize_conflict = false;
      for (rev in param.conflicts) {
        if (param.conflicts.hasOwnProperty(rev)) {
          new_doc = priv.clone(param.doc);
          new_doc._rev = rev;
          // no need to synchronize all the conflicts again, do it once
          functions.getAllDocuments(functions.newParam(
            new_doc,
            new_option,
            param.repair
          ));
        }
      }
    };
    functions.finished_count = 0;
    functions.finished = function () {
      var response_object = {};
      functions.finished_count -= 1;
      if (functions.finished_count === 0) {
        response_object.ok = true;
        response_object.id = doc._id;
        if (doc._rev) {
          response_object.rev = doc._rev;
        }
        callback(undefined, response_object);
      }
    };
    functions.begin();
  };

  /**
   * The generic method to use
   * @method genericRequest
   * @param  {object} command The JIO command
   * @param  {string} method The method to use
   */
  that.genericRequest = function (command, method) {
    var doc = command.cloneDoc();
    doc._id = doc._id || priv.generateUuid();
    priv.sendToAllFastestResponseOnly(
      method,
      doc,
      command.cloneOption(),
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
      }
    );
  };

  /**
   * Post the document metadata to all sub storages
   * @method post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    that.genericRequest(command, "put");
  };

  /**
   * Put the document metadata to all sub storages
   * @method put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    that.genericRequest(command, "post");
  };

  /**
   * Put an attachment to a document to all sub storages
   * @method putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    that.genericRequest(command, "putAttachment");
  };

  /**
   * Get the document from all sub storages, get the fastest.
   * @method get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    that.genericRequest(command, "get");
  };

  /**
   * Get the attachment from all sub storages, get the fastest.
   * @method getAttachment
   * @param  {object} command The JIO command
   */
  that.getAttachment = function (command) {
    that.genericRequest(command, "getAttachment");
  };

  /**
   * Remove the document from all sub storages.
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    that.genericRequest(command, "remove");
  };

  /**
   * Remove the attachment from all sub storages.
   * @method remove
   * @param  {object} command The JIO command
   */
  that.removeAttachment = function (command) {
    that.genericRequest(command, "removeAttachment");
  };

  return that;
});
