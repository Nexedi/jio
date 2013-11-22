/*jslint indent: 2, maxlen: 80, nomen: true */
/*global jIO, define */

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
// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO);
}(['jio'], function (jIO) {
  "use strict";
  jIO.addStorageType('replicaterevision', function (spec) {
    var that = this, priv = {};
    spec = spec || {};

    priv.storage_list_key = "storage_list";
    priv.storage_list = spec[priv.storage_list_key];
    priv.emptyFunction = function () {
      return;
    };

    /**
     * Generate a new uuid
     *
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
     *
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
     *
     * @param  {string} revision The revision string
     * @return {boolean} True if ok, else false
     */
    priv.checkRevisionFormat = function (revision) {
      return (/^[0-9]+-[0-9a-zA-Z_]+$/.test(revision));
    };

    /**
     * Clones an object in deep (without functions)
     *
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
     *
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
    priv.send = function (command, method, index, doc, option, callback) {
      var wrapped_callback_success, wrapped_callback_error;
      callback = callback || priv.emptyFunction;
      wrapped_callback_success = function (response) {
        callback(method, index, undefined, response);
      };
      wrapped_callback_error = function (err) {
        callback(method, index, err, undefined);
      };
      if (method === 'allDocs') {
        command.storage(priv.storage_list[index]).allDocs(option).
          then(wrapped_callback_success, wrapped_callback_error);
      } else {
        command.storage(priv.storage_list[index])[method](doc, option).
          then(wrapped_callback_success, wrapped_callback_error);
      }
    };

    /**
     * Use "send" method to all sub storages.
     * Calling "callback" for each storage response.
     *
     * @param  {string} method The request method
     * @param  {object} doc The document object
     * @param  {object} option The request option
     * @param  {function} callback The callback. Parameters:
     * - {string} The request method
     * - {number} The storage index
     * - {object} The error object
     * - {object} The response object
     */
    priv.sendToAll = function (command, method, doc, option, callback) {
      var i;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        priv.send(command, method, i, doc, option, callback);
      }
    };

    /**
     * Use "send" method to all sub storages.
     * Calling "callback" only with the first response
     *
     * @param  {string} method The request method
     * @param  {object} doc The document object
     * @param  {object} option The request option
     * @param  {function} callback The callback. Parameters:
     * - {string} The request method
     * - {object} The error object
     * - {object} The response object
     */
    priv.sendToAllFastestResponseOnly = function (command, method,
                                                  doc, option, callback) {
      var i, callbackWrapper, error_count;
      error_count = 0;
      callbackWrapper = function (method, index, err, response) {
        /*jslint unparam: true */
        if (err) {
          error_count += 1;
          if (error_count === priv.storage_list.length) {
            return callback(method, err, response);
          }
        }
        callback(method, err, response);
      };
      for (i = 0; i < priv.storage_list.length; i += 1) {
        priv.send(command, method, i, doc, option, callbackWrapper);
      }
    };

    /**
     * Use "sendToAll" method, calling "callback" at the last response with
     * the response list
     *
     * @param  {string} method The request method
     * @param  {object} doc The document object
     * @param  {object} option The request option
     * @return {function} callback The callback. Parameters:
     * - {string} The request method
     * - {object} The error object
     * - {object} The response object
     */
    priv.sendToAllGetResponseList = function (command, method,
                                              doc, option, callback) {
      var wrapper, callback_count = 0, response_list = [], error_list = [];
      response_list.length = priv.storage_list.length;
      wrapper = function (method, index, err, response) {
        /*jslint unparam: true */
        error_list[index] = err;
        response_list[index] = response;
        callback_count += 1;
        if (callback_count === priv.storage_list.length) {
          callback(error_list, response_list);
        }
      };
      priv.sendToAll(command, method, doc, option, wrapper);
    };

    /**
     * Checks if the sub storage are identical
     * @method check
     * @param  {object} command The JIO command
     */
    that.check = function (command, param, option) {
      function callback(err) {
        if (err) {
          return command.error(err);
        }
        command.success();
      }
      if (!param._id) {
        return callback({
          "status": 501
        });
      }
      priv.check(
        command,
        param,
        option,
        callback
      );
    };

    /**
     * Repair the sub storages to make them identical
     * @method repair
     * @param  {object} command The JIO command
     */
    that.repair = function (command, param, option) {
      function callback(err) {
        if (err) {
          return command.error(err);
        }
        command.success();
      }
      if (!param._id) {
        return callback({
          "status": 501
        });
      }
      priv.repair(
        command,
        param,
        option,
        true,
        callback
      );
    };

    priv.check = function (command, doc, option, success, error) {
      priv.repair(command, doc, option, false, success, error);
    };

    priv.repair = function (command, doc, option, repair, callback) {
      var functions = {};
      callback = callback || priv.emptyFunction;
      option = option || {};
      functions.begin = function () {
        // };
        // functions.repairAllSubStorages = function () {
        var i;
        for (i = 0; i < priv.storage_list.length; i += 1) {
          priv.send(
            command,
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
        /*jslint unparam: true */
        if (err) {
          return command.error(err);
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
          "doc": doc, // the document to repair
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
            ],
            "attachments": {
              // attachmentA : {_id: attachmentA, _revs_info, _mimetype: ..}
              // attachmentB : {_id: attachmentB, _revs_info, _mimetype: ..}
            }
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
        var i, metadata, cloned_option;
        metadata = priv.clone(param.doc);
        cloned_option = priv.clone(param.option);
        option.conflicts = true;
        option.revs = true;
        option.revs_info = true;
        for (i = 0; i < priv.storage_list.length; i += 1) {
          // if the document is not loaded
          priv.send(command, "get", i,
                    metadata, cloned_option, functions.dealResults(param));
        }
        functions.finished_count += 1;
      };
      functions.dealResults = function (param) {
        return function (method, index, err, response) {
          /*jslint unparam: true */
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
                "status": "conflict",
                "message": "An error occured on the sub storage",
                "reason": err.reason
              }, undefined);
              return;
            }
          }
          response = response.data;
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
              "status": "conflict",
              "message": "Some documents are different in the sub storages",
              "reason": "Storage contents differ"
            }, undefined);
            return;
          }
          // repair
          functions.getAttachments(param);
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
      functions.getAttachments = function (param) {
        var response, parsed_response, attachment;
        for (response in param.responses.stats) {
          if (param.responses.stats.hasOwnProperty(response)) {
            parsed_response = JSON.parse(response);
            for (attachment in parsed_response._attachments) {
              if ((parsed_response._attachments).hasOwnProperty(attachment)) {
                functions.get_attachment_count += 1;
                priv.send(
                  command,
                  "getAttachment",
                  param.responses.stats[response][0],
                  {
                    "_id": param.doc._id,
                    "_attachment": attachment,
                    "_rev": JSON.parse(response)._rev
                  },
                  param.option,
                  functions.getAttachmentsCallback(
                    param,
                    attachment,
                    param.responses.stats[response]
                  )
                );
              }
            }
          }
        }
      };
      functions.get_attachment_count = 0;
      functions.getAttachmentsCallback = function (param, attachment_id) {
        return function (method, index, err, response) {
          /*jslint unparam: true */
          if (err) {
            callback({
              "status": "conflict",
              "message": "Unable to retreive attachments",
              "reason": err.reason
            }, undefined);
            return;
          }
          response = response.data;
          functions.get_attachment_count -= 1;
          param.responses.attachments[attachment_id] = response;
          if (functions.get_attachment_count === 0) {
            functions.synchronizeAllSubStorage(param);
            if (param.option.synchronize_conflicts !== false) {
              functions.synchronizeConflicts(param);
            }
          }
        };
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
        var i, new_doc, attachment_to_put = [];
        if (response === undefined) {
          // no response to sync
          return;
        }
        new_doc = JSON.parse(response);
        new_doc._revs = new_doc._revisions;
        delete new_doc._rev;
        delete new_doc._revisions;
        delete new_doc._conflicts;
        for (i in new_doc._attachments) {
          if (new_doc._attachments.hasOwnProperty(i)) {
            attachment_to_put.push({
              "_id": i,
              "_mimetype": new_doc._attachments[i].content_type,
              "_revs_info": new_doc._revs_info
            });
          }
        }
        for (i = 0; i < storage_list.length; i += 1) {
          functions.finished_count += attachment_to_put.length || 1;
          priv.send(
            command,
            "put",
            storage_list[i],
            new_doc,
            param.option,
            functions.putAttachments(param, attachment_to_put)
          );
        }
        functions.finished_count += 1;
        functions.finished();
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
      functions.putAttachments = function (param, attachment_to_put) {
        return function (method, index, err, response) {
          /*jslint unparam: true */
          var i, attachment;
          if (err) {
            return callback({
              "status": 40,
              "statusText": "Check Failed",
              "error": "check_failed",
              "message": "Unable to copy attachments",
              "reason": err.reason
            }, undefined);
          }
          for (i = 0; i < attachment_to_put.length; i += 1) {
            attachment = {
              "_id": param.doc._id,
              "_attachment": attachment_to_put[i]._id,
              "_mimetype": attachment_to_put[i]._mimetype,
              "_revs_info": attachment_to_put[i]._revs_info,
              // "_revs_info": param.responses.list[index]._revs_info,
              "_data": param.responses.attachments[attachment_to_put[i]._id]
            };
            priv.send(
              command,
              "putAttachment",
              index,
              attachment,
              option,
              functions.putAttachmentCallback(param)
            );
          }
          if (attachment_to_put.length === 0) {
            functions.finished();
          }
        };
      };
      functions.putAttachmentCallback = function (param) {
        /*jslint unparam: true */
        return function (method, index, err, response) {
          if (err) {
            return callback(err, undefined);
          }
          functions.finished();
        };
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
    that.genericRequest = function (command, method, param, option) {
      var doc = param;
      doc._id = doc._id || priv.generateUuid();
      priv.sendToAllFastestResponseOnly(
        command,
        method,
        doc,
        option,
        function (method, err, response) {
          /*jslint unparam: true */
          if (err) {
            return command.error(err);
          }
          command.success(response);
        }
      );
    };

    /**
     * Post the document metadata to all sub storages
     * @method post
     * @param  {object} command The JIO command
     */
    that.post = function (command, metadata, option) {
      that.genericRequest(command, "put", metadata, option);
    };

    /**
     * Put the document metadata to all sub storages
     * @method put
     * @param  {object} command The JIO command
     */
    that.put = function (command, metadata, option) {
      that.genericRequest(command, "post", metadata, option);
    };

    /**
     * Put an attachment to a document to all sub storages
     * @method putAttachment
     * @param  {object} command The JIO command
     */
    that.putAttachment = function (command, param, option) {
      that.genericRequest(command, "putAttachment", param, option);
    };

    /**
     * Get the document from all sub storages, get the fastest.
     * @method get
     * @param  {object} command The JIO command
     */
    that.get = function (command, param, option) {
      that.genericRequest(command, "get", param, option);
    };

    /**
     * Get the attachment from all sub storages, get the fastest.
     * @method getAttachment
     * @param  {object} command The JIO command
     */
    that.getAttachment = function (command, param, option) {
      that.genericRequest(command, "getAttachment", param, option);
    };

    /**
     * Remove the document from all sub storages.
     * @method remove
     * @param  {object} command The JIO command
     */
    that.remove = function (command, param, option) {
      that.genericRequest(command, "remove", param, option);
    };

    /**
     * Remove the attachment from all sub storages.
     * @method remove
     * @param  {object} command The JIO command
     */
    that.removeAttachment = function (command, param, option) {
      that.genericRequest(command, "removeAttachment", param, option);
    };

    return that;
  });
}));
