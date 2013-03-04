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
  my.env = my.env || spec.env || {};
  priv.emptyFunction = function () {};

  that.specToStore = function () {
    var o = {};
    o[priv.storage_list_key] = priv.storage_list;
    o.env = my.env;
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
   * Generates the next revision
   * @method generateNextRevision
   * @param  {number|string} previous_revision The previous revision
   * @param  {string} docid The document id
   * @return {string} The next revision
   */
  priv.generateNextRevision = function (previous_revision, docid) {
    my.env[docid].id += 1;
    if (typeof previous_revision === "string") {
      previous_revision = parseInt(previous_revision.split("-")[0], 10);
    }
    return (previous_revision + 1) + "-" + my.env[docid].id.toString();
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
   * Initalize document environment object
   * @method initEnv
   * @param  {string} docid The document id
   * @return {object} The reference to the environment
   */
  priv.initEnv = function (docid) {
    my.env[docid] = {
      "id": 0,
      "distant_revisions": {},
      "my_revisions": {},
      "last_revisions": []
    };
    return my.env[docid];
  };

  priv.updateEnv = function (doc_env, doc_env_rev, index, doc_rev) {
    doc_env.last_revisions[index] = doc_rev;
    if (doc_rev !== undefined) {
      if (!doc_env.my_revisions[doc_env_rev]) {
        doc_env.my_revisions[doc_env_rev] = [];
        doc_env.my_revisions[doc_env_rev].length = priv.storage_list.length;
      }
      doc_env.my_revisions[doc_env_rev][index] = doc_rev;
      doc_env.distant_revisions[doc_rev] = doc_env_rev;
    }
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

////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
  /**
   * Post the document metadata to all sub storages
   * @method post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    var functions = {}, doc_env, revs_info, doc, my_rev;
    functions.begin = function () {
      doc = command.cloneDoc();

      if (typeof doc._rev === "string" && !priv.checkRevisionFormat(doc._rev)) {
        that.error({
          "status": 31,
          "statusText": "Wrong Revision Format",
          "error": "wrong_revision_format",
          "message": "The document previous revision does not match " +
            "^[0-9]+-[0-9a-zA-Z]+$",
          "reason": "Previous revision is wrong"
        });
        return;
      }
      if (typeof doc._id !== "string") {
        doc._id = priv.generateUuid();
      }
      if (priv.post_allowed === undefined) {
        priv.post_allowed = true;
      }
      doc_env = my.env[doc._id];
      if (!doc_env || !doc_env.id) {
        doc_env = priv.initEnv(doc._id);
      }
      my_rev = priv.generateNextRevision(doc._rev || 0, doc._id);
      functions.sendDocument();
    };
    functions.sendDocument = function () {
      var i, cloned_doc;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        cloned_doc = priv.clone(doc);
        if (typeof cloned_doc._rev === "string" &&
            doc_env.my_revisions[cloned_doc._rev] !== undefined) {
          cloned_doc._rev = doc_env.my_revisions[cloned_doc._rev][i];
        }
        priv.send(
          doc_env.last_revisions[i] === "unique_" + i ||
            priv.put_only ? "put" : "post",
          i,
          cloned_doc,
          command.cloneOption(),
          functions.checkSendResult
        );
      }
    };
    functions.checkSendResult = function (method, index, err, response) {
      if (err) {
        if (err.status === 409) {
          if (method !== "put") {
            functions.sendDocumentIndex(
              "put",
              index,
              functions.checkSendResult
            );
            return;
          }
        }
        priv.updateEnv(doc_env, my_rev, index, null);
        functions.error(err);
        return;
      }
      // success
      priv.updateEnv(
        doc_env,
        my_rev,
        index,
        response.rev || "unique_" + index
      );
      functions.success({"ok": true, "id": doc._id, "rev": my_rev});
    };
    functions.success = function (response) {
      // can be called once
      that.success(response);
      functions.success = priv.emptyFunction;
    };
    functions.error_count = 0;
    functions.error = function (err) {
      functions.error_count += 1;
      if (functions.error_count === priv.storage_list.length) {
        that.error(err);
        functions.error = priv.emptyFunction;
      }
    };
    functions.begin();
  };

  /**
   * Put the document metadata to all sub storages
   * @method put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    priv.put_only = true;
    that.post(command);
  };

  /**
   * Put an attachment to a document to all sub storages
   * @method putAttachment
   * @param  {object} command The JIO command
   */
  // that.putAttachment = function (command) {

  // };

  /**
   * Get the document or attachment from all sub storages, get the fastest.
   * @method get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    var functions = {}, doc_env, doc, my_rev, revs_array = [];
    functions.begin = function () {
      var i;
      doc = command.cloneDoc();

      doc_env = my.env[doc._id];
      if (!doc_env || !doc_env.id) {
        // document environment is not set
        doc_env = priv.initEnv(doc._id);
      }
      // document environment is set now
      revs_array.length = priv.storage_list.length;
      my_rev = doc._rev;
      if (my_rev) {
        functions.update_env = false;
      }
      for (i = 0; i < priv.storage_list.length; i += 1) {
        // request all sub storages
        if (doc_env.my_revisions[my_rev]) {
          // if my_rev exist, convert it to distant revision
          doc._rev = doc_env.my_revisions[my_rev][i];
        }
        priv.send("get", i, doc, command.cloneOption(), functions.callback);
      }
    };
    functions.update_env = true;
    functions.callback = function (method, index, err, response) {
      if (err) {
        revs_array[index] = null;
        functions.error(err);
        return;
      }
      doc_env.last_revisions[index] = response._rev || "unique_" + index;
      revs_array[index] = response._rev || "unique_" + index;
      if (doc_env.distant_revisions[response._rev || "unique_" + index]) {
        // the document revision is already known
        if (functions.update_env === true) {
          my_rev = doc_env.distant_revisions[response._rev ||
                                             "unique_" + index];
        }
      } else {
        // the document revision is unknown
        if (functions.update_env === true) {
          my_rev = priv.generateNextRevision(0, doc._id);
          doc_env.my_revisions[my_rev] = revs_array;
          doc_env.distant_revisions[response._rev || "unique_" + index] =
            my_rev;
        }
        functions.update_env = false;
      }
      response._rev = my_rev;
      functions.success(response);
    };
    functions.success = function (response) {
      var i, start, tmp, tmp_object;
      functions.success = priv.emptyFunction;
      if (doc_env.my_revisions[my_rev]) {
        // this was not a specific revision
        // we can convert revisions recieved by the sub storage
        if (response._conflicts) {
          // convert conflicting revisions to replicate revisions
          tmp_object = {};
          for (i = 0; i < response._conflicts.length; i += 1) {
            tmp_object[doc_env.distant_revisions[response._conflicts[i]] ||
                       response._conflicts[i]] = true;
          }
          response._conflicts = priv.dictKeys2Array(tmp_object);
        }
        if (response._revisions) {
          // convert revisions history to replicate revisions
          tmp_object = {};
          start = response._revisions.start;
          for (i = 0; i < response._revisions.ids.length; i += 1, start -= 1) {
            tmp = doc_env.distant_revisions[
              start + "-" + response._revisions.ids[i]
            ];
            if (tmp) {
              response._revisions.ids[i] = tmp.split("-").slice(1).join("-");
            }
          }
        }
        if (response._revs_info) {
          // convert revs info to replicate revisions
          for (i = 0; i < response._revs_info.length; i += 1) {
            tmp = doc_env.distant_revisions[response._revs_info[i].rev];
            if (tmp) {
              response._revs_info[i].rev = tmp;
            }
          }
        }
      }
      that.success(response);
    };
    functions.error_count = 0;
    functions.error = function (err) {
      functions.error_count += 1;
      if (functions.error_count === priv.storage_list.length) {
        that.error(err);
        functions.error = priv.emptyFunction;
      }
    };
    functions.begin();
  };

  /**
   * Remove the document or attachment from all sub storages.
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    var functions = {}, doc_env, revs_info, doc, my_rev;
    functions.begin = function () {
      doc = command.cloneDoc();

      if (typeof doc._rev === "string" && !priv.checkRevisionFormat(doc._rev)) {
        that.error({
          "status": 31,
          "statusText": "Wrong Revision Format",
          "error": "wrong_revision_format",
          "message": "The document previous revision does not match " +
            "^[0-9]+-[0-9a-zA-Z]+$",
          "reason": "Previous revision is wrong"
        });
        return;
      }
      doc_env = my.env[doc._id];
      if (!doc_env || !doc_env.id) {
        doc_env = priv.initEnv(doc._id);
      }
      my_rev = priv.generateNextRevision(doc._rev || 0, doc._id);
      functions.sendDocument();
    };
    functions.sendDocument = function () {
      var i, cloned_doc;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        cloned_doc = priv.clone(doc);
        if (typeof cloned_doc._rev === "string" &&
            doc_env.my_revisions[cloned_doc._rev] !== undefined) {
          cloned_doc._rev = doc_env.my_revisions[cloned_doc._rev][i];
        }
        priv.send(
          "remove",
          i,
          cloned_doc,
          command.cloneOption(),
          functions.checkSendResult
        );
      }
      that.end();
    };
    functions.checkSendResult = function (method, index, err, response) {
      if (err) {
        priv.updateEnv(doc_env, my_rev, index, null);
        functions.error(err);
        return;
      }
      // success
      priv.updateEnv(
        doc_env,
        my_rev,
        index,
        response.rev || "unique_" + index
      );
      functions.success({"ok": true, "id": doc._id, "rev": my_rev});
    };
    functions.success = function (response) {
      // can be called once
      that.success(response);
      functions.success = priv.emptyFunction;
    };
    functions.error_count = 0;
    functions.error = function (err) {
      functions.error_count += 1;
      if (functions.error_count === priv.storage_list.length) {
        that.error(err);
        functions.error = priv.emptyFunction;
      }
    };
    functions.begin();
  };

  return that;
});
