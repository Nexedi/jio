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

(function (root, dependencies, factory) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, function () {
      return factory(require);
    });
  }
  if (typeof require === 'function') {
    module.exports = factory(require);
    return;
  }
  root.replicate_storage = factory(function (name) {
    return {
      "jio": jIO,
      "rsvp": RSVP
    }[name];
  });
}(this, ['jio', 'rsvp'], function (require) {
  "use strict";

  var Promise = require('rsvp').Promise,
    all = require('rsvp').all,
    addStorageFunction = require('jio').addStorage;

  /**
   * Test if the a value is a date
   *
   * @param  {String,Number,Date} date The date to test
   * @return {Boolean} true if success, else false
   */
  function isDate(date) {
    if (!isNaN((new Date(date === null ? undefined : date)).getTime())) {
      return true;
    }
    return false;
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
    return new Promise(function (resolve, reject, notify) {
      /*jslint unparam: true*/
      promise.then(resolve, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  /**
   * Awaits for an answer from one promise only. Promises are cancelled only
   * by calling `first(promise_list).cancel()`.
   *
   *     first(promise_list): Promise
   *
   * @param  {Array} promise_list An array of promises
   * @return {Promise} A new promise
   */
  function first(promise_list) {
    var length = promise_list.length;
    promise_list = promise_list.slice();
    return new Promise(function (resolve, reject, notify) {
      var index, count = 0;
      function rejecter(answer) {
        count += 1;
        if (count === length) {
          return reject(answer);
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
        promise_list[index].then(resolve, rejecter, notifier(index));
      }
    }, function () {
      var index;
      for (index = 0; index < length; index += 1) {
        promise_list[index].cancel();
      }
    });
  }

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

  ReplicateStorage.prototype.post = function (command, metadata, option) {
    var promise_list = [], index, length = this._storage_list.length;
    if (!isDate(metadata.modified)) {
      command.error(
        409,
        "invalid 'modified' metadata",
        "The metadata 'modified' should be a valid date string or date object"
      );
      return;
    }
    for (index = 0; index < length; index += 1) {
      promise_list[index] = success(
        command.storage(this._storage_list[index]).post(metadata, option)
      );
    }
    sequence([function () {
      return first(promise_list);
    }, [command.success, command.error]]);
  };

  ReplicateStorage.prototype.put = function (command, metadata, option) {
    var promise_list = [], index, length = this._storage_list.length;
    if (!isDate(metadata.modified)) {
      command.error(
        409,
        "invalid 'modified' metadata",
        "The metadata 'modified' should be a valid date string or date object"
      );
      return;
    }
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).put(metadata, option);
    }
    sequence([function () {
      return first(promise_list);
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
      return first(promise_list);
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

  ReplicateStorage.prototype.get = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).get(param, option);
    }
    sequence([function () {
      return lastModified(promise_list);
    }, [command.success, command.error]]);
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
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).allDocs(param, option);
    }
    sequence([function () {
      return last(promise_list);
    }, [command.success, command.error]]);
  };

  ReplicateStorage.prototype.check = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] = success(
        command.storage(this._storage_list[index]).check(param, option)
      );
    }
    sequence([function () {
      return all(promise_list);
    }, [command.success, command.error]]);
  };

  ReplicateStorage.prototype.repair = function (command, param) {
    var promise_list = [], index, that, length = this._storage_list.length;
    that = this;
    if (typeof param._id !== 'string' || !param._id) {
      command.success();
      return;
    }
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        success(command.storage(this._storage_list[index]).get(param));
    }
    sequence([function () {
      return all(promise_list);
    }, function (answers) {
      var i, list = [], winner = null;
      for (i = 0; i < answers.length; i += 1) {
        console.log(i, answers[i].result, answers[i].data || answers[i].status);
        if (answers[i].result === "success") {
          if (isDate(answers[i].data.modified)) {
            list[i] = answers.data;
            if (winner === null ||
                new Date(winner.modified) <
                new Date(answers[i].data.modified)) {
              winner = answers[i].data;
            }
          }
        } else if (answers[i].status === 404) {
          list[i] = 0;
        }
      }
      for (i = 0; i < list.length; i += 1) {
        if (list[i] && new Date(list[i].modified) < new Date(winner.modified)) {
          console.log('put', i, winner);
          list[i] = success(command.storage(that._storage_list[i]).put(winner));
        } else if (list[i] === 0) {
          console.log('post', i, winner);
          list[i] = jIO.util.dictUpdate({}, winner);
          delete list[i]._id;
          list[i] =
            success(command.storage(that._storage_list[i]).post(list[i]));
        }
      }
      list = list.reduce(function (previous, current) {
        if (current) {
          previous.push(current);
        }
        return previous;
      }, []);
      return all(list);
    }, function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        if (answers[i].result !== "success") {
          return command.error(409);
        }
      }
      command.success();
    }]);
  };

  addStorageFunction('replicate', ReplicateStorage);

}));
