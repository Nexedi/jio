/*
 * JIO extension for resource replication.
 * Copyright (C) 2013  Nexedi SA
 *
 *   This library is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This library is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, module, require, jIO, RSVP */

(function (factory) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(["jio", "rsvp"], function () {
      return factory(require);
    });
  }
  if (typeof require === 'function') {
    module.exports = factory(require);
    return;
  }
  factory(function (name) {
    return {
      "jio": jIO,
      "rsvp": RSVP
    }[name];
  });
}(function (require) {
  "use strict";

  var Promise = require('rsvp').Promise,
    all = require('rsvp').all,
    addStorageFunction = require('jio').addStorage,
    uniqueJSONStringify = require('jio').util.uniqueJSONStringify;

  function success(promise) {
    return promise.then(null, function (reason) { return reason; });
  }

  /**
   *     firstFulfilled(promises): promises< last_fulfilment_value >
   *
   * Responds with the first resolved promise answer recieved. If all promises
   * are rejected, it returns the latest rejected promise answer
   * received. Promises are cancelled only by calling
   * `firstFulfilled(promises).cancel()`.
   *
   * @param  {Array} promises An array of promises
   * @return {Promise} A new promise
   */
  function firstFulfilled(promises) {
    var length = promises.length;

    function onCancel() {
      var i, l, promise;
      for (i = 0, l = promises.length; i < l; i += 1) {
        promise = promises[i];
        if (typeof promise.cancel === "function") {
          promise.cancel();
        }
      }
    }

    return new Promise(function (resolve, reject, notify) {
      var i, count = 0;
      function resolver(answer) {
        resolve(answer);
        onCancel();
      }

      function rejecter(answer) {
        count += 1;
        if (count === length) {
          return reject(answer);
        }
      }

      for (i = 0; i < length; i += 1) {
        promises[i].then(resolver, rejecter, notify);
      }
    }, onCancel);
  }

  // //////////////////////////////////////////////////////////////////////

  // /**
  //  * An Universal Unique ID generator
  //  *
  //  * @return {String} The new UUID.
  //  */
  // function generateUuid() {
  //   function S4() {
  //     return ('0000' + Math.floor(
  //       Math.random() * 0x10000 /* 65536 */
  //     ).toString(16)).slice(-4);
  //   }
  //   return S4() + S4() + "-" +
  //     S4() + "-" +
  //     S4() + "-" +
  //     S4() + "-" +
  //     S4() + S4() + S4();
  // }

  function ReplicateStorage(spec) {
    if (!Array.isArray(spec.storage_list)) {
      throw new TypeError("ReplicateStorage(): " +
                          "storage_list is not of type array");
    }
    this._storage_list = spec.storage_list;
  }

  ReplicateStorage.prototype.syncGetAnswerList = function (command,
                                                           answer_list) {
    var i, l, answer, answer_modified_date, winner, winner_modified_date,
      winner_str, promise_list = [], winner_index, winner_id;
    /*jslint continue: true */
    for (i = 0, l = answer_list.length; i < l; i += 1) {
      answer = answer_list[i];
      if (!answer || answer === 404) { continue; }
      if (!winner) {
        winner = answer;
        winner_index = i;
        winner_modified_date = new Date(answer.data.modified).getTime();
      } else {
        answer_modified_date = new Date(answer.data.modified).getTime();
        if (isFinite(answer_modified_date) &&
            answer_modified_date > winner_modified_date) {
          winner = answer;
          winner_index = i;
          winner_modified_date = answer_modified_date;
        }
      }
    }
    winner = winner.data;
    if (!winner) { return; }
    // winner_attachments = winner._attachments;
    delete winner._attachments;
    winner_id = winner._id;
    winner_str = uniqueJSONStringify(winner);

    // document synchronisation
    for (i = 0, l = answer_list.length; i < l; i += 1) {
      answer = answer_list[i];
      if (!answer) { continue; }
      if (i === winner_index) { continue; }
      if (answer === 404) {
        delete winner._id;
        promise_list.push(success(
          command.storage(this._storage_list[i]).post(winner)
        ));
        winner._id = winner_id;
        // delete _id AND reassign _id -> avoid modifying document before
        // resolving the get method.
        continue;
      }
      delete answer._attachments;
      if (uniqueJSONStringify(answer.data) !== winner_str) {
        promise_list.push(success(
          command.storage(this._storage_list[i]).put(winner)
        ));
      }
    }
    return all(promise_list);
    // XXX .then synchronize attachments
  };

  ReplicateStorage.prototype.post = function (command, metadata, option) {
    var promise_list = [], index, length = this._storage_list.length;
    // if (!isDate(metadata.modified)) {
    //   command.error(
    //     409,
    //     "invalid 'modified' metadata",
   //     "The metadata 'modified' should be a valid date string or date object"
    //   );
    //   return;
    // }
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).post(metadata, option);
    }
    firstFulfilled(promise_list).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.put = function (command, metadata, option) {
    var promise_list = [], index, length = this._storage_list.length;
    // if (!isDate(metadata.modified)) {
    //   command.error(
    //     409,
    //     "invalid 'modified' metadata",
   //     "The metadata 'modified' should be a valid date string or date object"
    //   );
    //   return;
    // }
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).put(metadata, option);
    }
    firstFulfilled(promise_list).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.putAttachment = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).putAttachment(param, option);
    }
    firstFulfilled(promise_list).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.remove = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).remove(param, option);
    }
    firstFulfilled(promise_list).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.removeAttachment = function (
    command,
    param,
    option
  ) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).
        removeAttachment(param, option);
    }
    firstFulfilled(promise_list).
      then(command.success, command.error, command.notify);
  };

  /**
   * Respond with the first get answer received and synchronize the document to
   * the other storages in the background.
   */
  ReplicateStorage.prototype.get = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length,
      answer_list = [], this_ = this;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).get(param, option);
    }

    new Promise(function (resolve, reject, notify) {
      var count = 0, error_count = 0;
      function resolver(index) {
        return function (answer) {
          count += 1;
          if (count === 1) {
            resolve(answer);
          }
          answer_list[index] = answer;
          if (count + error_count === length && count > 0) {
            this_.syncGetAnswerList(command, answer_list);
          }
        };
      }

      function rejecter(index) {
        return function (reason) {
          error_count += 1;
          if (reason.status === 404) {
            answer_list[index] = 404;
          }
          if (error_count === length) {
            reject(reason);
          }
          if (count + error_count === length && count > 0) {
            this_.syncGetAnswerList(command, answer_list);
          }
        };
      }

      for (index = 0; index < length; index += 1) {
        promise_list[index].then(resolver(index), rejecter(index), notify);
      }
    }, function () {
      for (index = 0; index < length; index += 1) {
        promise_list[index].cancel();
      }
    }).then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.getAttachment = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).getAttachment(param, option);
    }
    firstFulfilled(promise_list).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.allDocs = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        success(command.storage(this._storage_list[index]).allDocs(option));
    }
    all(promise_list).then(function (answers) {
      // merge responses
      var i, j, k, found, rows;
      // browsing answers
      for (i = 0; i < answers.length; i += 1) {
        if (answers[i].result === "success") {
          rows = answers[i].data.rows;
          break;
        }
      }
      for (i += 1; i < answers.length; i += 1) {
        if (answers[i].result === "success") {
          // browsing answer rows
          for (j = 0; j < answers[i].data.rows.length; j += 1) {
            found = false;
            // browsing result rows
            for (k = 0; k < rows.length; k += 1) {
              if (rows[k].id === answers[i].data.rows[j].id) {
                found = true;
                break;
              }
            }
            if (!found) {
              rows.push(answers[i].data.rows[j]);
            }
          }
        }
      }
      return {"data": {"total_rows": (rows || []).length, "rows": rows || []}};
    }).then(command.success, command.error, command.notify);
    /*jslint unparam: true */
  };

  ReplicateStorage.prototype.check = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).check(param, option);
    }
    return all(promise_list).
      then(function () { return; }).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.repair = function (command, param, option) {
    var storage_list = this._storage_list, length = storage_list.length,
      this_ = this;

    if (typeof param._id !== 'string' || !param._id) {
      command.error("bad_request");
      return;
    }

    storage_list = storage_list.map(function (description) {
      return command.storage(description);
    });

    function repairSubStorages() {
      var promise_list = [], i;
      for (i = 0; i < length; i += 1) {
        promise_list[i] = storage_list[i].repair(param, option);
      }
      return all(promise_list);
    }

    function getSubStoragesDocument() {
      var promise_list = [], i;
      for (i = 0; i < length; i += 1) {
        promise_list[i] = success(storage_list[i].get(param));
      }
      return all(promise_list);
    }

    function synchronizeDocument(answers) {
      return this_.syncGetAnswerList(answers.map(function (answer) {
        if (answer.result === "success") {
          return answer;
        }
        if (answer.status === 404) {
          return 404;
        }
      }));
    }

    function checkAnswers(answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        if (answers[i].result !== "success") {
          throw answers[i];
        }
      }
    }

    return repairSubStorages().
      then(getSubStoragesDocument).
      then(synchronizeDocument).
      then(checkAnswers).
      then(command.success, command.error, command.notify);
  };

  addStorageFunction('replicate', ReplicateStorage);

}));
