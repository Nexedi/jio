/*
 * Promy: Promises library
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

/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global setInterval, setTimeout, clearInterval, clearTimeout */

(function (dependencies, module) {
  "use strict";
  /*global define, exports, window */
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    module(exports);
  }
  if (typeof window === 'object') {
    window.promy = {};
    module(window.promy);
  }
}(['exports'], function (exports) {
  "use strict";

  var UNRESOLVED = 0, RESOLVED = 1, REJECTED = 2, CANCELLED = 3;

  /**
   * thenItem(item, [onSucess], [onError], [onProgress]): any
   *
   * Execute one of the given callback when the item is fulfilled. If the item
   * is not a promise, then onSuccess is called with the item as first
   * parameter.
   *
   * @param  {Any} item A promise, deferred or a simple value
   * @param  {Function} [onSuccess] The callback to call on resolve
   * @param  {Function} [onError] The callback to call on reject
   * @param  {Function} [onProgress] The callback to call on notify
   */
  function thenItem(item, onSuccess, onError, onProgress) {
    if (typeof item === 'object' && item !== null) {
      if (typeof item.promise === 'object' && item.promise !== null &&
          typeof item.promise.then === 'function') {
        // item seams to be a Deferred
        return item.promise.then(
          onSuccess,
          onError,
          onProgress
        );
      }
      if (typeof item.then === 'function') {
        // item seams to be a Promise
        return item.then(
          onSuccess,
          onError,
          onProgress
        );
      }
    }
    return onSuccess(item);
  }

  /**
   * promiseResolve(promise, answers): any
   *
   * Resolve the promise with the given answers.
   *
   * @param  {Promise} promise The promise to resolve
   * @param  {Array} answers The arguments to give
   */
  function promiseResolve(promise, answers) {
    var array;
    if (promise._state === UNRESOLVED) {
      promise._state = RESOLVED;
      promise._answers = answers;
      array = promise._onResolve.slice();
      setTimeout(function () {
        var i;
        for (i = 0; i < array.length; i += 1) {
          try {
            array[i].apply(promise, promise._answers);
          } catch (ignore) {} // errors will never be retrieved by global
        }
      });
      // free the memory
      promise._onResolve = undefined;
      promise._onReject = undefined;
      promise._onProgress = undefined;
    }
  }

  /**
   * promiseReject(promise, answers): any
   *
   * Reject the promise with the given answers.
   *
   * @param  {Promise} promise The promise to reject
   * @param  {Array} answers The arguments to give
   */
  function promiseReject(promise, answers) {
    var array;
    if (promise._state === UNRESOLVED) {
      promise._state = REJECTED;
      promise._answers = answers;
      array = promise._onReject.slice();
      setTimeout(function () {
        var i;
        for (i = 0; i < array.length; i += 1) {
          try {
            array[i].apply(promise, promise._answers);
          } catch (ignore) {} // errors will never be retrieved by global
        }
      });
      // free the memory
      promise._onResolve = undefined;
      promise._onReject = undefined;
      promise._onProgress = undefined;
    }
  }

  /**
   * promiseNotify(promise, answers): any
   *
   * Notify the promise with the given answers.
   *
   * @param  {Promise} promise The promise to notify
   * @param  {Array} answers The arguments to give
   */
  function promiseNotify(promise, answers) {
    var i;
    if (promise._onProgress) {
      for (i = 0; i < promise._onProgress.length; i += 1) {
        try {
          promise._onProgress[i].apply(promise, answers);
        } catch (ignore) {} // errors will never be retrieved by global
      }
    }
  }

  /**
   * Promise(cancel)
   *
   * @class Promise
   * @constructor
   */
  function Promise(cancel) {
    this._onReject = [];
    this._onResolve = [];
    this._onProgress = [];
    this._state = UNRESOLVED;
    if (typeof cancel === 'function') {
      this.promise._cancel = cancel;
    }
  }

  ////////////////////////////////////////////////////////////
  // http://wiki.commonjs.org/wiki/Promises/A
  // then(fulfilledHandler, errorHandler, progressHandler)

  /**
   * then([onSuccess], [onError], [onProgress]): Promise
   *
   * Returns a new Promise with the return value of the `onSuccess` or `onError`
   * callback as first parameter. If the pervious promise is resolved, the
   * `onSuccess` callback is called. If rejected, the `onError` callback is
   * called. If notified, `onProgress` is called.
   *
   *     Deferred.when(1).
   *       then(function (one) { return one + 1; }).
   *       then(console.log); // shows 2
   *
   * @method then
   * @param  {Function} [onSuccess] The callback to call on resolve
   * @param  {Function} [onError] The callback to call on reject
   * @param  {Function} [onProgress] The callback to call on notify
   * @return {Promise} The new promise
   */
  Promise.prototype.then = function (onSuccess, onError, onProgress) {
    /*global Deferred*/
    var defer, next = new this.constructor(this._cancel), that = this;
    defer = new Deferred();
    defer.promise = next;
    switch (this._state) {
    case RESOLVED:
      if (typeof onSuccess === 'function') {
        setTimeout(function () {
          try {
            thenItem(
              onSuccess.apply(that, that._answers),
              defer.resolve.bind(defer),
              defer.reject.bind(defer)
            );
          } catch (e) {
            defer.reject(e);
          }
        });
      } else {
        setTimeout(function () {
          defer.resolve.apply(defer, that._answers);
        });
      }
      break;
    case REJECTED:
      if (typeof onError === 'function') {
        setTimeout(function () {
          var result;
          try {
            result = onError.apply(that, that._answers);
            if (result === undefined) {
              return defer.reject.apply(defer, that._answers);
            }
            thenItem(
              result,
              defer.reject.bind(defer),
              defer.reject.bind(defer)
            );
          } catch (e) {
            defer.reject(e);
          }
        });
      } else {
        setTimeout(function () {
          defer.reject.apply(defer, that._answers);
        });
      }
      break;
    case UNRESOLVED:
      if (typeof onSuccess === 'function') {
        this._onResolve.push(function () {
          try {
            thenItem(
              onSuccess.apply(that, arguments),
              defer.resolve.bind(defer),
              defer.reject.bind(defer),
              defer.notify.bind(defer)
            );
          } catch (e) {
            defer.reject(e);
          }
        });
      } else {
        this._onResolve.push(function () {
          defer.resolve.apply(defer, arguments);
        });
      }
      if (typeof onError === 'function') {
        this._onReject.push(function () {
          try {
            thenItem(
              onError.apply(that, that._answers),
              defer.reject.bind(defer),
              defer.reject.bind(defer)
            );
          } catch (e) {
            defer.reject(e);
          }
        });
      } else {
        this._onReject.push(function () {
          defer.reject.apply(defer, that._answers);
        });
      }
      if (typeof onProgress === 'function') {
        this._onProgress.push(function () {
          var result;
          try {
            result = onProgress.apply(that, arguments);
            if (result === undefined) {
              defer.notify.apply(defer, arguments);
            } else {
              defer.notify(result);
            }
          } catch (e) {
            defer.notify.apply(defer, arguments);
          }
        });
      } else {
        this._onProgress.push(function () {
          defer.notify.apply(defer, arguments);
        });
      }
      break;
    default:
      break;
    }
    return next;
  };

  // p.resolve() ?
  // p.reject() ?
  // p.notify() ?

  /**
   * p.cancel(): p
   *
   * Cancels the operation by calling promise._cancel().
   *
   * @method cancel
   * @return {Promise} this
   */
  Promise.prototype.cancel = function () {
    if (this._state === UNRESOLVED) {
      this._state = CANCELLED;
      if (typeof this._cancel === 'function') {
        this._cancel();
      }
      this._onResolve = undefined;
      this._onReject = undefined;
      this._onProgress = undefined;
    }
    return this;
  };

  /**
   * p.timeout(delay): p
   *
   * Reject the promise with an Error("Timeout") and cancel the operation.
   *
   * @method timeout
   * @param  {Number} delay The delay before rejection
   * @return {Promise} this
   */
  Promise.prototype.timeout = function (delay) {
    return exports.choose(this, exports.delay(delay).then(function () {
      throw new Error("Timeout (" + delay + ")");
    }));
  };

  ////////////////////////////////////////////////////////////
  // http://wiki.commonjs.org/wiki/Promises/A
  // get(propertyName)

  /**
   * get(property): Promise
   *
   * Get the property of the promise response as first parameter of the new
   * Promise.
   *
   *     Deferred.when({'a': 'b'}).get('a').then(console.log); // shows 'b'
   *
   * @method get
   * @param  {String} property The object property name
   * @return {Promise} The promise
   */
  Promise.prototype.get = function (property) {
    return this.then(function (dict) {
      return dict[property];
    });
  };

  ////////////////////////////////////////////////////////////
  // http://wiki.commonjs.org/wiki/Promises/A
  // call(functionName, arg1, arg2, ...)

  /**
   * call(function_name, *args): Promise
   *
   *     Deferred.when({'a': console.log}).call('a', 'b'); // shows 'b'
   *
   * @method call
   * @param  {String} function_name The function to call
   * @param  {Any} *[args] The function arguments
   * @return {Promise} A new promise
   */
  Promise.prototype.call = function (function_name) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.then(function (dict) {
      return dict[function_name].apply(dict, args);
    });
  };

  /**
   * put(property, value): Promise
   *
   * Put a property value from a promise response and return the registered
   * value as first parameter of the new Promise.
   *
   *     Deferred.when({'a': 'b'}).put('a', 'c').then(console.log); // shows 'c'
   *
   * @method put
   * @param  {String} property The object property name
   * @param  {Any} value The value to put
   * @return {Promise} A new promise
   */
  Promise.prototype.put = function (property, value) {
    return this.then(function (dict) {
      dict[property] = value;
      return dict[property];
    });
  };

  /**
   * del(property): Promise
   *
   * Delete a property value from a promise response and return the property
   * value as first parameter of the new Promise.
   *
   *     Deferred.when({'a': 'b'}).del('a').then(console.log);
   *     // shows undefined
   *
   * @method del
   * @param  {String} property The object property name
   * @return {Promise} A new promise
   */
  Promise.prototype.del = function (property) {
    return this.then(function (dict) {
      delete dict[property];
      return dict[property];
    });
  };

  /**
   * p.done(callback): p
   *
   * Call the callback on resolve.
   *
   *     Deferred.when(1).
   *       done(function (one) { return one + 1; }).
   *       done(console.log); // shows 1
   *
   * @method done
   * @param  {Function} callback The callback to call on resolve
   * @return {Promise} This promise
   */
  Promise.prototype.done = function (callback) {
    var that = this;
    if (typeof callback !== 'function') {
      return this;
    }
    switch (this._state) {
    case RESOLVED:
      setTimeout(function () {
        try {
          callback.apply(that, that._answers);
        } catch (ignore) {} // errors will never be retrieved by global
      });
      break;
    case UNRESOLVED:
      this._onResolve.push(callback);
      break;
    default:
      break;
    }
    return this;
  };

  /**
   * p.fail(callback): p
   *
   * Call the callback on reject.
   *
   *     promisedTypeError().
   *       fail(function (e) { name_error(); }).
   *       fail(console.log); // shows TypeError
   *
   * @method fail
   * @param  {Function} callback The callback to call on reject
   * @return {Promise} This promise
   */
  Promise.prototype.fail = function (callback) {
    var that = this;
    if (typeof callback !== 'function') {
      return this;
    }
    switch (this._state) {
    case REJECTED:
      setTimeout(function () {
        try {
          callback.apply(that, that._answers);
        } catch (ignore) {} // errors will never be retrieved by global
      });
      break;
    case UNRESOLVED:
      this._onReject.push(callback);
      break;
    default:
      break;
    }
    return this;
  };

  /**
   * p.progress(callback): p
   *
   * Call the callback on notify.
   *
   *     Promise.delay(100, 10).
   *       progress(function () { return null; }).
   *       progress(console.log); // does not show null
   *
   * @method progress
   * @param  {Function} callback The callback to call on notify
   * @return {Promise} This promise
   */
  Promise.prototype.progress = function (callback) {
    if (typeof callback !== 'function') {
      return this;
    }
    switch (this._state) {
    case UNRESOLVED:
      this._onProgress.push(callback);
      break;
    default:
      break;
    }
    return this;
  };

  /**
   * p.always(callback): p
   *
   * Call the callback on resolve or on reject.
   *
   *     sayHello().
   *       done(iAnswer).
   *       fail(iHeardNothing).
   *       always(iKeepWalkingAnyway);
   *
   * @method always
   * @param  {Function} callback The callback to call on resolve or on reject
   * @return {Promise} This promise
   */
  Promise.prototype.always = function (callback) {
    var that = this;
    if (typeof callback !== 'function') {
      return this;
    }
    switch (this._state) {
    case RESOLVED:
    case REJECTED:
      setTimeout(function () {
        try {
          callback.apply(that, that._answers);
        } catch (ignore) {} // errors will never be retrieved by global
      });
      break;
    case UNRESOLVED:
      that._onReject.push(callback);
      that._onResolve.push(callback);
      break;
    default:
      break;
    }
    return this;
  };

  exports.Promise = Promise;

  /**
   * Deferred(cancel)
   *
   * @class Deferred
   * @constructor
   */
  function Deferred(cancel) {
    this.promise = new Promise(cancel);
  }

  /**
   * resolve(*args): any
   *
   * Resolves the promise with the given arguments.
   *
   * @method resolve
   * @param  {Any} *[args] The arguments to give
   */
  Deferred.prototype.resolve = function () {
    return promiseResolve(this.promise, arguments);
  };

  /**
   * reject(*args): any
   *
   * Rejects the promise with the given arguments.
   *
   * @method reject
   * @param  {Any} *[args] The arguments to give
   */
  Deferred.prototype.reject = function () {
    return promiseReject(this.promise, arguments);
  };

  /**
   * notify(*args): any
   *
   * Notifies the promise with the given arguments.
   *
   * @method notify
   * @param  {Any} *[args] The arguments to give
   */
  Deferred.prototype.notify = function () {
    return promiseNotify(this.promise, arguments);
  };

  exports.Deferred = Deferred;

  //////////////////////////////////////////////////////////////////////
  // Inspired by Task.js

  /**
   * now(value): Promise
   *
   * Converts an ordinary value into a fulfilled promise.
   *
   * @param  {Any} value The value to use
   * @return {Promise} The resolved promise
   */
  exports.now = function (value) {
    var deferred = new Deferred();
    deferred.resolve(value);
    return deferred.promise;
  };

  /**
   * join(*promises): Promise
   *
   * Produces a promise that is resolved when all the given promises are
   * resolved. The resolved value is an array of each of the resolved values of
   * the given promises.
   *
   * If any of the promises is rejected, the joined promise is rejected with the
   * same error, and any remaining unfulfilled promises are cancelled.
   *
   * @param  {Promise} *[promises] The promises to join
   * @return {Promise} A new promise
   */
  exports.join = function () {
    var promises, results = [], i, count = 0, deferred;
    promises = Array.prototype.slice.call(arguments);
    function cancel() {
      var j;
      for (j = 0; j < promises.length; j += 1) {
        promises[j].cancel();
      }
    }
    deferred = new Deferred(cancel);
    function succeed(j) {
      return function (answer) {
        results[j] = answer;
        count += 1;
        if (count !== promises.length) {
          return;
        }
        deferred.resolve(results);
      };
    }
    function failed(answer) {
      cancel();
      deferred.reject(answer);
    }
    function notify(j) {
      return function (answer) {
        deferred.notify({
          "promise": this,
          "index": j,
          "answer": answer
        });
      };
    }
    for (i = 0; i < promises.length; i += 1) {
      promises[i].then(succeed(i), failed, notify(i));
    }
    return deferred.promise;
  };

  /**
   * choose(*promises): Promise
   *
   * Produces a promise that is fulfilled when any one of the given promises is
   * fulfilled. As soon as one of the promises is fulfilled, whether by being
   * resolved or rejected, all the other promises are cancelled.
   *
   * @param  {Promise} *[promises] The promises to use
   * @return {Promise} A new promise
   */
  exports.choose = function () {
    var promises, i, deferred;
    promises = Array.prototype.slice.call(arguments);
    function cancel() {
      var j;
      for (j = 0; j < promises.length; j += 1) {
        promises[j].cancel();
      }
    }
    deferred = new Deferred(cancel);
    function succeed(answer) {
      cancel();
      deferred.resolve(answer);
    }
    function failed(answer) {
      cancel();
      deferred.reject(answer);
    }
    function notify(j) {
      return function (answer) {
        deferred.notify({
          "promise": this,
          "index": j,
          "answer": answer
        });
      };
    }
    for (i = 0; i < promises.length; i += 1) {
      promises[i].then(succeed, failed, notify(i));
    }
    return deferred.promise;
  };

  /**
   * sleep(delay[, every]): Promise
   *
   * Resolve the promise after `timeout` milliseconds and notfies us every
   * `every` milliseconds.
   *
   *     Deferred.delay(50, 10).then(console.log, console.error, console.log);
   *     // // shows
   *     // 10 // from progress
   *     // 20 // from progress
   *     // 30 // from progress
   *     // 40 // from progress
   *     // 50 // from progress
   *     // 50 // from success
   *
   * @param  {Number} delay In milliseconds
   * @param  {Number} [every] In milliseconds
   * @return {Promise} A new promise
   */
  exports.sleep = function (delay, every) {
    var deferred, timeout, interval, now = 0;
    function cancel() {
      clearTimeout(timeout);
      clearInterval(interval);
    }
    deferred = new Deferred(cancel);
    if (typeof every === 'number' && isFinite(every)) {
      interval = setInterval(function () {
        now += every;
        deferred.notify(now);
      }, every);
    }
    timeout = setTimeout(function () {
      clearInterval(interval);
      deferred.notify(delay);
      deferred.resolve(delay);
    }, delay);
    return deferred.promise;
  };

  ////////////////////////////////////////////////////////////
  // http://wiki.commonjs.org/wiki/Promises/B
  // when(value, callback, errback_opt)

  /**
   * when(item, [onSuccess], [onError], [onProgress]): Promise
   *
   * Return an item as first parameter of the promise answer. If item is of
   * type Promise, the method will just return the promise. If item is of type
   * Deferred, the method will return the deferred promise.
   *
   *     Deferred.when('a').then(console.log); // shows 'a'
   *
   * @param  {Any} item The item to use
   * @param  {Function} [onSuccess] The callback called on success
   * @param  {Function} [onError] the callback called on error
   * @param  {Function} [onProgress] the callback called on progress
   * @return {Promise} The promise
   */
  exports.when = function (item, onSuccess, onError, onProgress) {
    if (typeof item === 'object' && item !== null) {
      if (typeof item.promise === 'object' && item.promise !== null &&
          typeof item.promise.then === 'function') {
        // item seams to be a Deferred
        return item.promise.then(onSuccess, onError, onProgress);
      }
      if (typeof item.then === 'function') {
        // item seams to be a Promise
        return item.then(onSuccess, onError, onProgress);
      }
    }
    // item is just a value, convert into fulfilled promise
    var deferred = new Deferred(), promise;
    if (typeof onSuccess === 'function') {
      promise = deferred.promise.then(onSuccess);
    } else {
      promise = deferred.promise;
    }
    deferred.resolve(item);
    return promise;
  };

  ////////////////////////////////////////////////////////////
  // http://wiki.commonjs.org/wiki/Promises/B
  // get(object, name)

  /**
   * get(dict, property): Promise
   *
   * Return the dict property as first parameter of the promise answer.
   *
   *     Deferred.get({'a': 'b'}, 'a').then(console.log); // shows 'b'
   *
   * @param  {Object} dict The object to use
   * @param  {String} property The object property name
   * @return {Promise} The promise
   */
  exports.get = function (dict, property) {
    var p = new Deferred();
    try {
      p.resolve(dict[property]);
    } catch (e) {
      p.reject(e);
    }
    return p;
  };

  ////////////////////////////////////////////////////////////
  // http://wiki.commonjs.org/wiki/Promises/B
  // put(object, name, value)

  /**
   * put(dict, property, value): Promise
   *
   * Set and return the dict property as first parameter of the promise answer.
   *
   *     Deferred.put({'a': 'b'}, 'a', 'c').then(console.log); // shows 'c'
   *
   * @param  {Object} dict The object to use
   * @param  {String} property The object property name
   * @param  {Any} value The value
   * @return {Promise} The promise
   */
  exports.put = function (dict, property, value) {
    var p = new Deferred();
    try {
      dict[property] = value;
      p.resolve(dict[property]);
    } catch (e) {
      p.reject(e);
    }
    return p;
  };

  ////////////////////////////////////////////////////////////
  // http://wiki.commonjs.org/wiki/Promises/B
  // del(object, name)

  /**
   * del(dict, property): Promise
   *
   * Delete and return the dict property as first parameter of the promise
   * answer.
   *
   *     Deferred.del({'a': 'b'}, 'a').then(console.log); // shows undefined
   *
   * @param  {Object} dict The object to use
   * @param  {String} property The object property name
   * @return {Promise} The promise
   */
  exports.del = function (dict, property) {
    var p = new Deferred();
    try {
      delete dict[property];
      p.resolve(dict[property]);
    } catch (e) {
      p.reject(e);
    }
    return p;
  };

}));
