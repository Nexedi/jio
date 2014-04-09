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

  /**
   * Test if the a value is a date
   *
   * @param  {String,Number,Date} date The date to test
   * @return {Boolean} true if success, else false
   */
  function isDate(date) {
    return !isNaN((new Date(date === null ? undefined : date)).getTime());
  }

  /**
   * Executes a sequence of *then* callbacks. It acts like
   * `smth().then(callback).then(callback)...`. The first callback is called
   * with no parameter.
   *
   * Elements of `then_list` array can be a function or an array contaning at
   * most three *then* callbacks: *onFulfilled*, *onRejected*, *onNotified*.
   *
   * When `cancel()` is executed, each then promises are cancelled at the same
   * time.
   *
   *     sequence(then_list): Promise
   *
   * @param  {Array} then_list An array of *then* callbacks
   * @return {Promise} A new promise
   */
  function sequence(then_list) {
    var promise_list = [];
    return new Promise(function (resolve, reject, notify) {
      var i, length = then_list.length;
      promise_list[0] = new Promise(function (resolve) {
        resolve();
      });
      for (i = 0; i < length; i += 1) {
        if (Array.isArray(then_list[i])) {
          promise_list[i + 1] = promise_list[i].
            then(then_list[i][0], then_list[i][1], then_list[i][2]);
        } else {
          promise_list[i + 1] = promise_list[i].then(then_list[i]);
        }
      }
      promise_list[i].then(resolve, reject, notify);
    }, function () {
      var i, length = promise_list.length;
      for (i = 0; i < length; i += 1) {
        promise_list[i].cancel();
      }
    });
  }

  function success(promise) {
    return promise.then(null, function (reason) { return reason; });
  }

  // /**
  //  * Awaits for an answer from one promise only. Promises are cancelled only
  //  * by calling `first(promise_list).cancel()`.
  //  *
  //  *     first(promise_list): Promise
  //  *
  //  * @param  {Array} promise_list An array of promises
  //  * @return {Promise} A new promise
  //  */
  // function first(promise_list) {
  //   var length = promise_list.length;
  //   promise_list = promise_list.slice();
  //   return new Promise(function (resolve, reject, notify) {
  //     var index, count = 0;
  //     function rejecter(answer) {
  //       count += 1;
  //       if (count === length) {
  //         return reject(answer);
  //       }
  //     }
  //     function notifier(index) {
  //       return function (notification) {
  //         notify({
  //           "index": index,
  //           "value": notification
  //         });
  //       };
  //     }
  //     for (index = 0; index < length; index += 1) {
  //       promise_list[index].then(resolve, rejecter, notifier(index));
  //     }
  //   }, function () {
  //     var index;
  //     for (index = 0; index < length; index += 1) {
  //       promise_list[index].cancel();
  //     }
  //   });
  // }

  /**
   * Responds with the last resolved promise answer recieved. If all promises
   * are rejected, it returns the latest rejected promise answer
   * received. Promises are cancelled only by calling
   * `last(promise_list).cancel()`.
   *
   *     last(promise_list): Promise
   *
   * @param  {Array} promise_list An array of promises
   * @return {Promise} A new promise
   */
  function last(promise_list) {
    var length = promise_list.length;
    promise_list = promise_list.slice();
    return new Promise(function (resolve, reject, notify) {
      var index, last_answer, count = 0, error_count = 0;
      function resolver() {
        return function (answer) {
          count += 1;
          if (count === length) {
            return resolve(answer);
          }
          last_answer = answer;
        };
      }
      function rejecter() {
        return function (answer) {
          error_count += 1;
          if (error_count === length) {
            return reject(answer);
          }
          count += 1;
          if (count === length) {
            return resolve(last_answer);
          }
        };
      }
      function notifier(index) {
        return function (notification) {
          notify({
            "index": index,
            "value": notification
          });
        };
      }
      for (index = 0; index < length; index += 1) {
        promise_list[index].then(resolver(), rejecter(), notifier(index));
      }
    }, function () {
      var index;
      for (index = 0; index < length; index += 1) {
        promise_list[index].cancel();
      }
    });
  }

  /**
   * Responds with the last modified document recieved. If all promises are
   * rejected, it returns the latest rejected promise answer received. Promises
   * are cancelled only by calling `lastModified(promise_list).cancel()`. USE
   * THIS FUNCTION ONLY FOR GET METHOD!
   *
   *     lastModified(promise_list): Promise
   *
   * @param  {Array} promise_list An array of promises
   * @return {Promise} A new promise
   */
  function lastModified(promise_list) {
    var length = promise_list.length;
    promise_list = promise_list.slice();
    return new Promise(function (resolve, reject, notify) {
      var index, last_good_answer, last_answer, count = 0, error_count = 0;
      function resolver(answer) {
        last_answer = answer;
        if (last_good_answer === undefined) {
          if (isDate(answer.data.modified)) {
            last_good_answer = answer;
          }
        } else {
          if (isDate(answer.data.modified)) {
            if (new Date(last_good_answer.data.modified) <
                new Date(answer.data.modified)) {
              last_good_answer = answer;
            }
          }
        }
        count += 1;
        if (count === length) {
          return resolve(last_good_answer);
        }
      }
      function rejecter(answer) {
        error_count += 1;
        if (error_count === length) {
          return reject(answer);
        }
        count += 1;
        if (count === length) {
          return resolve(last_good_answer || last_answer);
        }
      }
      function notifier(index) {
        return function (notification) {
          notify({
            "index": index,
            "value": notification
          });
        };
      }
      for (index = 0; index < length; index += 1) {
        promise_list[index].then(resolver, rejecter, notifier(index));
      }
    }, function () {
      var index;
      for (index = 0; index < length; index += 1) {
        promise_list[index].cancel();
      }
    });
  }

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
    console.log("Starting synchro");
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
    console.log('winner', winner_str);

    // document synchronisation
    for (i = 0, l = answer_list.length; i < l; i += 1) {
      answer = answer_list[i];
      if (!answer) { continue; }
      if (i === winner_index) { continue; }
      if (answer === 404) {
        delete winner._id;
        console.log("Synchronizing (post) " + winner_index + " to " + i);
        promise_list.push(command.storage(this._storage_list[i]).post(winner));
        winner._id = winner_id;
        // delete _id AND reassign _id -> avoid modifying document before
        // resolving the get method.
        continue;
      }
      delete answer._attachments;
      if (uniqueJSONStringify(answer) !== winner_str) {
        console.log("Synchronizing (put) " + winner_index + " to " + i);
        promise_list.push(command.storage(this._storage_list[i]).put(winner));
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
      promise_list[index] = success(
        command.storage(this._storage_list[index]).post(metadata, option)
      );
    }
    sequence([function () {
      return last(promise_list);
    }, [command.success, command.error]]);
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
    sequence([function () {
      return last(promise_list);
    }, [command.success, command.error]]);
  };

  ReplicateStorage.prototype.putAttachment = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] = success(
        command.storage(this._storage_list[index]).putAttachment(param, option)
      );
    }
    sequence([function () {
      return last(promise_list);
    }, [command.success, command.error]]);
  };

  ReplicateStorage.prototype.remove = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] = success(
        command.storage(this._storage_list[index]).remove(param, option)
      );
    }
    sequence([function () {
      return last(promise_list);
    }, [command.success, command.error]]);
  };

  ReplicateStorage.prototype.removeAttachment = function (
    command,
    param,
    option
  ) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] = success(
        command.storage(this._storage_list[index]).
          removeAttachment(param, option)
      );
    }
    sequence([function () {
      return last(promise_list);
    }, [command.success, command.error]]);
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
          console.log(index, answer);
          count += 1;
          if (count === 1) {
            resolve(answer);
          }
          answer_list[index] = answer;
          console.log(count, error_count, length);
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
          console.log(count, error_count, length);
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
      promise_list[index] = success(
        command.storage(this._storage_list[index]).getAttachment(param, option)
      );
    }
    sequence([function () {
      return last(promise_list);
    }, [command.success, command.error]]);
  };

  ReplicateStorage.prototype.allDocs = function (command, param, option) {
    /*jslint unparam: true */
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        success(command.storage(this._storage_list[index]).allDocs(option));
    }
    sequence([function () {
      return all(promise_list);
    }, function (answers) {
      // merge responses
      var i, j, k, found, rows;
      // browsing answers
      for (i = 0; i < answers.length; i += 1) {
        if (answers[i].result === "success") {
          if (!rows) {
            rows = answers[i].data.rows;
          } else {
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
      }
      return {"data": {"total_rows": (rows || []).length, "rows": rows || []}};
    }, [command.success, command.error]]);
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
    var storage_list = this._storage_list, length = storage_list.length;

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
      var i, tmp, winner, winner_str, promise_list = [],
        metadata_dict = {}, not_found_dict = {}, modified_list = [];
      for (i = 0; i < answers.length; i += 1) {
        if (answers[i].result !== "success") {
          not_found_dict[i] = true;
        } else {
          metadata_dict[i] = answers[i].data;
          tmp = metadata_dict[i].modified;
          tmp = new Date(tmp === undefined ? NaN : tmp);
          tmp.index = i;
          modified_list.push(tmp);
        }
      }
      modified_list.sort();

      if (modified_list.length === 0) {
        // do nothing because no document was found
        return [];
      }

      tmp = modified_list.pop();
      winner = metadata_dict[tmp.index];
      winner_str = uniqueJSONStringify(winner);
      tmp = tmp.index;

      // if no document has valid modified metadata
      // just take the first one and replicate to the other one

      for (i = 0; i < length; i += 1) {
        if (i !== tmp && winner_str !== uniqueJSONStringify(metadata_dict[i])) {
          // console.log("Synchronizing document `" + winner_str +
          //             "` into storage number " + i + " by doing a `" +
          //             (not_found_dict[i] ? "post" : "put") + "`. ");
          promise_list.push(
            storage_list[i][not_found_dict[i] ? "post" : "put"](winner)
          );
        }
      }
      return all(promise_list);
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
