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
    resolve = require('rsvp').resolve,
    addStorageFunction = require('jio').addStorage,
    uniqueJSONStringify = require('jio').util.uniqueJSONStringify,
    chain = resolve(),
    cache = {};

  function logandreturn() {
    var args = [].slice.call(arguments);
    console.log.apply(console, args.map(JSON.stringify));
    return args[args.length - 1];
  }

  function logandthrow() {
    var args = [].slice.call(arguments);
    console.warn.apply(console, args.map(JSON.stringify));
    throw args[args.length - 1];
  }

  function success(promise) {
    return promise.then(null, function (reason) { return reason; });
  }

  //////////////////////////////////////////////////////////////////////

  function RowFIFO() {
    this.index = 0;
    this.end = 0;
    this.length = 0;
    this.ids = {};
  }

  RowFIFO.prototype.extend = function (array) {
    var i, l, value;
    for (i = 0, l = array.length; i < l; i += 1) {
      value = array[i];
      if (this.ids[value.id]) { return; }
      this.ids[value.id] = true;
      this[this.end] = value;
      this.end += 1;
      this.length += 1;
    }
    return this;
  };

  RowFIFO.prototype.push = function () {
    this.extend([].slice.call(arguments));
    return this.length;
  };

  RowFIFO.prototype.shift = function () {
    if (this.index >= this.end) { return; }
    this.length -= 1;
    var val = this[this.index];
    delete this[this.index];
    delete this.ids[val.id];
    this.index += 1;
    return val;
  };

  function exportAllDocsRowsToFIFO(this_storage, allDocs) {
    var fifo;
    fifo = this_storage._cache.rowsToSynchronize =
      this_storage._cache.rowsToSynchronize || new RowFIFO();
    fifo.extend(allDocs.data.rows);
  }

  //////////////////////////////////////////////////////////////////////

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

  function allFulfilled(promises) {
    var length = promises.length;

    function onCancel() {
      var i;
      for (i = 0; i < promises.length; i += 1) {
        if (typeof promises[i].cancel === "function") {
          promises[i].cancel();
        }
      }
    }

    if (length === 0) {
      return new Promise(function (done) { done([]); });
    }

    return new Promise(function (resolve, reject, notify) {
      var i, count = 0, error_count = 0, results = [];
      function resolver(i) {
        return function (value) {
          count += 1;
          results[i] = value;
          if (count === length) {
            resolve(results);
          }
        };
      }

      function rejecter(err) {
        error_count += 1;
        count += 1;
        if (error_count === length) {
          reject(err);
        }
      }

      for (i = 0; i < length; i += 1) {
        promises[i].then(resolver(i), rejecter, notify);
      }
    }, onCancel);
  }

  function arrayShifter(array, callback) {
    var cancelled, p1 = resolve(), p2;
    return new Promise(function (done, fail, notify) {
      var value;
      function next() {
        if (array.length) {
          try {
            value = callback.call(null, array.shift(), array);
          } catch (e) {
            return fail(e);
          }
          if (cancelled) { return; }
          if (value && typeof value.then === "function") {
            p1 = value;
            p2 = value.then(next, fail, notify);
          } else {
            p2 = p2.then(next, fail, notify);
          }
          return;
        }
        done();
      }
      p2 = p1.then(next);
    }, function () {
      cancelled = true;
      if (typeof p1.cancel === "function") { p1.cancel(); }
      if (typeof p2.cancel === "function") { p2.cancel(); }
    });
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

  // /**
 //  * This buffer can queue actions with the `exec` method. If an action is not
  //  * in execution, then its `exec` method will return the action promise,
  //  * otherwise it queues the new given action. The first set action will be
  //  * executed at "t + 1", and after action end, the next action is executed.
  //  *
  //  * @class ActionBuffer
  //  * @constructor
  //  */
  // function ActionBuffer() {
  //   this._buffers = {};
  // }

  // ActionBuffer.prototype._shift = function (name) {
  //   var buffer = this._buffers[name];
  //   if (buffer) {
  //     if (buffer.length > 1) {
  //       buffer.shift();
  //       return;
  //     }
  //     delete this._buffers[name];
  //   }
  // };

  // ActionBuffer.prototype.exec = function (name, action) {
  //   var p, res, buffer = this._buffers[name], this_ = this;
  //   function shiftAndReturn(answer) {
  //     this_._shift(name);
  //     return answer;
  //   }
  //   function shiftAndThrow(reason) {
  //     this_._shift(name);
  //     throw reason;
  //   }
  //   if (buffer) {
  //     if (buffer.length > 1) {
  //       return buffer[1];
  //     }
 //     buffer.push(buffer[0].then(action).then(shiftAndReturn, shiftAndThrow));
  //     return buffer[1];
  //   }
  //   p = RSVP.resolve();
  //   res = p.then(function () {
  //     this_._shift(name);
  //     return action();
  //   }).then(shiftAndReturn, shiftAndThrow);
  //   this._buffers[name] = [null, res];
  //   return res;
  // };

  //////////////////////////////////////////////////////////////////////

  function ReplicateStorage(spec) {
    if (!Array.isArray(spec.storage_list)) {
      throw new TypeError("ReplicateStorage(): " +
                          "storage_list is not of type array");
    }
    var str = uniqueJSONStringify(spec);
    cache[str] = cache[str] || {};
    this._cache = cache[str];
    this._storage_list = spec.storage_list;
    if (typeof spec.cache_storage === "object" && spec.cache_storage !== null) {
      this._cache_storage = spec.cache_storage;
    }
  }

  ReplicateStorage.prototype.syncRowFIFO = function (command) {
    if (this._cache.syncRowFIFO) {
      return this._cache.syncRowFIFO;
    }

    var storage_list = this._storage_list, it = this, cache_storage, p;
    if (this._cache_storage) {
      cache_storage = command.storage(this._cache_storage);
    }

    storage_list = storage_list.map(function (description) {
      return command.storage(description);
    });

    function doNothing() {
      return;
    }

    function getSubStoragesDocument(id) {
      return all(storage_list.map(function (storage) {
        return success(storage.get({"_id": id}));
      }));
    }

    function removeSubStorageDocuments(id) {
      return all(storage_list.map(function (storage) {
        return success(storage.remove({"_id": id}));
      }));
    }

    function synchronizeDocument(answers) {
      return it.syncGetAnswerList(command, answers);
    }

    function is404Answer(answer) {
      return answer.status === 404;
    }

    function isSuccessAnswer(answer) {
      return answer.result === "success";
    }

    function checkAnswers(id, answers) {
      if (cache_storage) {
        if (answers.every(is404Answer)) {
          cache_storage.remove({"_id": id});
        } else if (answers.every(isSuccessAnswer)) {
          cache_storage.remove({"_id": id});
        }
      }
    }

    function deleteCache() {
      delete it._cache.syncRowFIFO;
    }

    if (cache_storage) {
      p = cache_storage.allDocs().then(function (answer) {
        exportAllDocsRowsToFIFO(it, answer);
      });
    } else {
      p = chain;
    }

    /*
     * `a` and `b` are storage get responses, `c` is cache storage:
     *
     * - a 404 -> b 404 > c remove sync
     *
     * `a` and `b` are storage sync responses, `c` is cache storage:
     *
     * - a ok > b ok > c remove sync
     * - a ko > b ok
     * - a ko > b ko
     */
    p = p.then(function () {
      return arrayShifter(it._cache.rowsToSynchronize, function (row) {
        if (cache_storage) {
          return cache_storage.get({"_id": row.id}).then(function (answer) {
            if (answer.data.state === "Deleted") {
              return removeSubStorageDocuments(row.id).
                then(checkAnswers.bind(null, row.id), doNothing);
            }
            return getSubStoragesDocument(row.id).
              then(synchronizeDocument).
              then(checkAnswers.bind(null, row.id), doNothing);
          }, function (reason) {
            if (reason.status === 404) {
              return getSubStoragesDocument(row.id).
                then(synchronizeDocument).
                then(checkAnswers.bind(null, row.id), doNothing);
            }
            throw reason;
          });
        }
        return getSubStoragesDocument(row.id).
          then(synchronizeDocument).
          then(null, doNothing);
      });
    });
    p.then(deleteCache, deleteCache);
    this._cache.syncRowFIFO = p;
    return p;
  };

  ReplicateStorage.prototype.syncGetAnswerList = function (command,
                                                           answer_list) {
    var i, l, answer, answer_modified_date, winner, winner_modified_date,
      winner_str, promise_list = [], winner_index, winner_id;
    /*jslint continue: true */
    for (i = 0, l = answer_list.length; i < l; i += 1) {
      answer = answer_list[i];
      if (!answer || answer.result !== "success") { continue; }
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
      if (!answer) {
        promise_list.push(resolve({"status": 0}));
        continue;
      }
      if (i === winner_index) {
        promise_list.push(resolve({"result": "success"}));
        continue;
      }
      if (answer.status === 404) {
        delete winner._id;
        promise_list.push(success(
          command.storage(this._storage_list[i]).post(winner)
        ));
        winner._id = winner_id;
        // delete _id AND reassign _id -> avoid modifying document before
        // resolving the get method.
        continue;
      }
      if (answer.result === "success") {
        delete answer._attachments;
        if (uniqueJSONStringify(answer.data) !== winner_str) {
          promise_list.push(success(
            command.storage(this._storage_list[i]).put(winner)
          ));
          continue;
        }
        promise_list.push(resolve({"result": "success"}));
        continue;
      }
      promise_list.push(resolve({"status": 0}));
    }
    return all(promise_list);
    // XXX .then synchronize attachments
  };

  /**
   * Post a document, returns the first response received.
   *
   * `a` and `b` are storage put responses, `c` is cache storage:
   *
   * - a ok > b ok
   * - a ko > c put sync > b ok
   */
  ReplicateStorage.prototype._post = function (command, metadata, option) {
    var promises, error_count = 0, thiz = this, cache_promise;
    return new Promise(function (done, fail, notify) {
      promises = thiz._storage_list.map(function (desc) {
        return chain.then(function () {
          return command.storage(desc).post(metadata, option);
        }).then(function (a) {
          if (typeof metadata._id !== "string" || metadata._id === "") {
            metadata._id = a.id;
          }
          if (thiz._cache_storage && cache_promise === 0) {
            // the metadata is set, but the cache needs to be updated
            cache_promise = command.storage(thiz._cache_storage).put({
              "_id": metadata._id,
              "state": "Updated"
            });
          }
          done(a);
          return a;
        }, function (e) {
          if (thiz._cache_storage && !cache_promise &&
              typeof metadata._id === "string" && metadata._id !== "") {
            cache_promise = command.storage(thiz._cache_storage).put({
              "_id": metadata._id,
              "state": "Updated"
            });
          } else {
            cache_promise = 0;
          }
          error_count += 1;
          if (error_count === promises.length) {
            fail(e);
          }
          throw e;
        }, notify);
      });
    }, function () {
      promises.forEach(function (promise) {
        promise.cancel();
      });
    });
  };

  /**
   * Put a document, returns the first response received.
   *
   * `a` and `b` are storage put responses, `c` is cache storage:
   *
   * - a ok > b ok > c remove sync
   * - a ko > c put sync > b ok
   */
  ReplicateStorage.prototype._put = function (command, metadata, option) {
    var promises, error_count = 0, count = 0, thiz = this, cache_promise;
    return new Promise(function (done, fail, notify) {
      promises = thiz._storage_list.map(function (desc) {
        return chain.then(function () {
          return command.storage(desc).put(metadata, option);
        }).then(function (a) {
          if (thiz._cache_storage) {
            count += 1;
            if (count === promises.length) {
              command.storage(thiz._cache_storage).remove({
                "_id": metadata._id
              });
            }
          }
          done(a);
          return a;
        }, function (e) {
          if (thiz._cache_storage && !cache_promise) {
            cache_promise = command.storage(thiz._cache_storage).put({
              "_id": metadata._id,
              "state": "Updated"
            });
          }
          error_count += 1;
          if (error_count === promises.length) {
            fail(e);
          }
          throw e;
        }, notify);
      });
    }, function () {
      promises.forEach(function (promise) {
        promise.cancel();
      });
    });
  };

  /**
   * Remove a document, returns the first response received.
   *
   * `a` and `b` are storage put responses, `c` is cache storage:
   *
   * - a ok > b ok > c remove sync
   * - a !404 > c put sync > b ok
   */
  ReplicateStorage.prototype._remove = function (command, metadata, option) {
    var promises, error_count = 0, count = 0, thiz = this, cache_promise;
    return new Promise(function (done, fail, notify) {
      promises = thiz._storage_list.map(function (desc) {
        return chain.then(function () {
          return command.storage(desc).remove(metadata, option);
        }).then(function (a) {
          if (thiz._cache_storage) {
            count += 1;
            if (count === promises.length) {
              command.storage(thiz._cache_storage).remove({
                "_id": metadata._id
              });
            }
          }
          done(a);
          return a;
        }, function (e) {
          if (e.status !== 404 && thiz._cache_storage && !cache_promise) {
            cache_promise = command.storage(thiz._cache_storage).put({
              "_id": metadata._id,
              "state": "Deleted"
            });
          }
          error_count += 1;
          if (error_count === promises.length) {
            fail(e);
          }
          throw e;
        }, notify);
      });
    }, function () {
      promises.forEach(function (promise) {
        promise.cancel();
      });
    });
  };

  ReplicateStorage.prototype.post = function (command, metadata, option) {
    return this._post(command, metadata, option).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.put = function (command, metadata, option) {
    return this._put(command, metadata, option).
      then(command.success, command.error, command.notify);
  };

  ReplicateStorage.prototype.remove = function (command, param, option) {
    return this._remove(command, param, option).
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

  // /**
//  * Respond with the first get answer received and synchronize the document to
  //  * the other storages in the background.
  //  */
  // ReplicateStorage.prototype.get = function (command, param, option) {
  //   var promise_list = [], index, length = this._storage_list.length,
  //     answer_list = [], this_ = this;
  //   for (index = 0; index < length; index += 1) {
  //     promise_list[index] =
  //       command.storage(this._storage_list[index]).get(param, option);
  //   }

  //   new Promise(function (resolve, reject, notify) {
  //     var count = 0, error_count = 0;
  //     function resolver(index) {
  //       return function (answer) {
  //         count += 1;
  //         if (count === 1) {
  //           resolve(answer);
  //         }
  //         answer_list[index] = answer;
  //         if (count + error_count === length && count > 0) {
  //           this_.syncGetAnswerList(command, answer_list);
  //         }
  //       };
  //     }

  //     function rejecter(index) {
  //       return function (reason) {
  //         error_count += 1;
  //         if (reason.status === 404) {
  //           answer_list[index] = 404;
  //         }
  //         if (error_count === length) {
  //           reject(reason);
  //         }
  //         if (count + error_count === length && count > 0) {
  //           this_.syncGetAnswerList(command, answer_list);
  //         }
  //       };
  //     }

  //     for (index = 0; index < length; index += 1) {
  //       promise_list[index].then(resolver(index), rejecter(index), notify);
  //     }
  //   }, function () {
  //     for (index = 0; index < length; index += 1) {
  //       promise_list[index].cancel();
  //     }
  //   }).then(command.success, command.error, command.notify);
  // };

  /**
   * Respond with the first get answer received and synchronize the document to
   * the other storages in the background.
   */
  ReplicateStorage.prototype.get = function (command, param, option) {
    var promise_list = [], index, length = this._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).get(param, option);
    }

    new Promise(function (resolve, reject, notify) {
      var count = 0, error_count = 0;
      function resolver(answer) {
        count += 1;
        if (count === 1) {
          resolve(answer);
        }
      }

      function rejecter(reason) {
        error_count += 1;
        if (error_count === length) {
          reject(reason);
        }
      }

      for (index = 0; index < length; index += 1) {
        promise_list[index].then(resolver, rejecter, notify);
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

  ReplicateStorage.prototype._allDocs = function (command, param, option) {
    var promise_list = [], index, me = this, length = me._storage_list.length;
    for (index = 0; index < length; index += 1) {
      promise_list[index] =
        command.storage(this._storage_list[index]).allDocs(option);
    }
    /*jslint unparam: true */
    return allFulfilled(promise_list).then(function (answers) {
      /*jslint unparam: false */
      // merge responses
      var i, j, k, found, rows;
      // browsing answers
      for (i = 0; i < answers.length; i += 1) {
        if (answers[i]) {
          rows = answers[i].data.rows;
          break;
        }
      }
      for (i += 1; i < answers.length; i += 1) {
        if (answers[i]) {
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
    }).then(function (answer) {
      exportAllDocsRowsToFIFO(me, answer);
      me.syncRowFIFO(command);
      return answer;
    });
  };

  ReplicateStorage.prototype.allDocs = function (command, param, option) {
    return this._allDocs(command, param, option).
      then(command.success, command.error, command.notify);
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
        promise_list[i] = success(storage_list[i].repair(param, option));
      }
      return all(promise_list);
    }

    function returnThe404ReasonsElseNull(reason) {
      if (reason.status === 404) {
        return 404;
      }
      return null;
    }

    function getSubStoragesDocument() {
      var promise_list = [], i;
      for (i = 0; i < length; i += 1) {
        promise_list[i] =
          storage_list[i].get(param).then(null, returnThe404ReasonsElseNull);
      }
      return all(promise_list);
    }

    function synchronizeDocument(answers) {
      return this_.syncGetAnswerList(command, answers);
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
