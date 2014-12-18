/*jslint indent: 2, maxlen: 80, nomen: true, sloppy: true */
/*global exports, Blob, FileReader, RSVP, hex_sha256, XMLHttpRequest,
  constants, console */

/**
 * Do not exports these tools unless they are not writable, not configurable.
 */

exports.util = {};

/**
 * Inherits the prototype methods from one constructor into another. The
 * prototype of `constructor` will be set to a new object created from
 * `superConstructor`.
 *
 * @param  {Function} constructor The constructor which inherits the super
 *   one
 * @param  {Function} superConstructor The super constructor
 */
function inherits(constructor, superConstructor) {
  constructor.super_ = superConstructor;
  constructor.prototype = Object.create(superConstructor.prototype, {
    "constructor": {
      "configurable": true,
      "enumerable": false,
      "writable": true,
      "value": constructor
    }
  });
}

/**
 * Clones jsonable object in depth
 *
 * @param  {A} object The jsonable object to clone
 * @return {A} The cloned object
 */
function jsonDeepClone(object) {
  var tmp = JSON.stringify(object);
  if (tmp === undefined) {
    return undefined;
  }
  return JSON.parse(tmp);
}
exports.util.jsonDeepClone = jsonDeepClone;


/**
 * Update a dictionary by adding/replacing key values from another dict.
 * Enumerable values equal to undefined are also used.
 *
 * @param  {Object} original The dict to update
 * @param  {Object} other The other dict
 * @return {Object} The updated original dict
 */
function dictUpdate(original, other) {
  var k;
  for (k in other) {
    if (other.hasOwnProperty(k)) {
      original[k] = other[k];
    }
  }
  return original;
}
exports.util.dictUpdate = dictUpdate;

/**
 * Like 'dict.clear()' in python. Delete all dict entries.
 *
 * @method dictClear
 * @param  {Object} self The dict to clear
 */
function dictClear(dict) {
  var i;
  for (i in dict) {
    if (dict.hasOwnProperty(i)) {
      delete dict[i];
      // dictClear(dict);
      // break;
    }
  }
}
exports.util.dictClear = dictClear;

/**
 * Filter a dict to keep only values which keys are in `keys` list.
 *
 * @param  {Object} dict The dict to filter
 * @param  {Array} keys The key list to keep
 */
function dictFilter(dict, keys) {
  var i, buffer = [];
  for (i = 0; i < keys.length; i += 1) {
    buffer[i] = dict[keys[i]];
  }
  dictClear(dict);
  for (i = 0; i < buffer.length; i += 1) {
    dict[keys[i]] = buffer[i];
  }
}
exports.util.dictFilter = dictFilter;

/**
 * Gets all elements of an array and classifies them in a dict of array.
 * Dict keys are element types, and values are list of element of type 'key'.
 *
 * @param  {Array} array The array of elements to pop
 * @return {Object} The type dict
 */
function arrayValuesToTypeDict(array) {
  var i, l, type_object = {}, type, v;
  for (i = 0, l = array.length; i < l; i += 1) {
    v = array[i];
    type = Array.isArray(v) ? "array" : typeof v;
    /*jslint ass: true */
    (type_object[type] = type_object[type] || []).push(v);
  }
  return type_object;
}


/**
 * Concatenate a `string` `n` times.
 *
 * @param  {String} string The string to concat
 * @param  {Number} n The number of time to concat
 * @return {String} The concatenated string
 */
function concatStringNTimes(string, n) {
  /*jslint plusplus: true */
  var res = "";
  while (--n >= 0) { res += string; }
  return res;
}

/**
 * JSON stringify a value. Object keys are sorted in order to make a kind of
 * deepEqual thanks to a simple string comparison.
 *
 *     JSON.stringify({"a": "b", "c": "d"}) ===
 *       JSON.stringify({"c": "d", "a": "b"})                 // false
 *
 *     deepEqual({"a": "b", "c": "d"}, {"c": "d", "a": "b"}); // true
 *
 *     uniqueJSONStringify({"a": "b", "c": "d"}) ===
 *       uniqueJSONStringify({"c": "d", "a": "b"})            // true
 *
 * @param  {Any} value The value to stringify
 * @param  {Function,Array} [replacer] A function to replace values during parse
 * @param  {String,Number} [space] Causes the result to be pretty-printed
 * @return {String} The unique JSON stringified value
 */
function uniqueJSONStringify(value, replacer, space) {
  var indent, key_value_space = "";
  if (typeof space === "string") {
    if (space !== "") {
      indent = space;
      key_value_space = " ";
    }
  } else if (typeof space === "number") {
    if (isFinite(space) && space > 0) {
      indent = concatStringNTimes(" ", space);
      key_value_space = " ";
    }
  }

  function uniqueJSONStringifyRec(key, value, deep) {
    var i, l, res, my_space;
    if (value && typeof value.toJSON === "function") {
      value = value.toJSON();
    }
    if (typeof replacer === "function") {
      value = replacer(key, value);
    }

    if (indent) {
      my_space = concatStringNTimes(indent, deep);
    }
    if (Array.isArray(value)) {
      res = [];
      for (i = 0; i < value.length; i += 1) {
        res[res.length] = uniqueJSONStringifyRec(i, value[i], deep + 1);
        if (res[res.length - 1] === undefined) {
          res[res.length - 1] = "null";
        }
      }
      if (res.length === 0) { return "[]"; }
      if (indent) {
        return "[\n" + my_space + indent +
          res.join(",\n" + my_space + indent) +
          "\n" + my_space + "]";
      }
      return "[" + res.join(",") + "]";
    }
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(replacer)) {
        res = replacer.reduce(function (p, c) {
          p.push(c);
          return p;
        }, []);
      } else {
        res = Object.keys(value);
      }
      res.sort();
      for (i = 0, l = res.length; i < l; i += 1) {
        key = res[i];
        res[i] = uniqueJSONStringifyRec(key, value[key], deep + 1);
        if (res[i] !== undefined) {
          res[i] = JSON.stringify(key) + ":" + key_value_space + res[i];
        } else {
          res.splice(i, 1);
          l -= 1;
          i -= 1;
        }
      }
      if (res.length === 0) { return "{}"; }
      if (indent) {
        return "{\n" + my_space + indent +
          res.join(",\n" + my_space + indent) +
          "\n" + my_space + "}";
      }
      return "{" + res.join(",") + "}";
    }
    return JSON.stringify(value);
  }
  return uniqueJSONStringifyRec("", value, 0);
}
exports.util.uniqueJSONStringify = uniqueJSONStringify;

function makeBinaryStringDigest(string) {
  return 'sha256-' + hex_sha256(string);
}
exports.util.makeBinaryStringDigest = makeBinaryStringDigest;

function readBlobAsBinaryString(blob) {
  var fr = new FileReader();
  return new RSVP.Promise(function (resolve, reject, notify) {
    fr.addEventListener("load", resolve);
    fr.addEventListener("error", reject);
    fr.addEventListener("progress", notify);
    fr.readAsBinaryString(blob);
  }, function () {
    fr.abort();
  });
}
exports.util.readBlobAsBinaryString = readBlobAsBinaryString;

/**
 * Acts like `Array.prototype.concat` but does not create a copy of the original
 * array. It extends the original array and return it.
 *
 * @param  {Array} array The array to extend
 * @param  {Any} [args]* Values to add in the array
 * @return {Array} The original array
 */
function arrayExtend(array) { // args*
  var i, j;
  for (i = 1; i < arguments.length; i += 1) {
    if (Array.isArray(arguments[i])) {
      for (j = 0; j < arguments[i].length; j += 1) {
        array[array.length] = arguments[i][j];
      }
    } else {
      array[array.length] = arguments[i];
    }
  }
  return array;
}
exports.util.arrayExtend = arrayExtend;

/**
 * Acts like `Array.prototype.concat` but does not create a copy of the original
 * array. It extends the original array from a specific position and return it.
 *
 * @param  {Array} array The array to extend
 * @param  {Number} position The position where to extend
 * @param  {Any} [args]* Values to add in the array
 * @return {Array} The original array
 */
function arrayInsert(array, position) { // args*
  var array_part = array.splice(position, array.length - position);
  arrayExtend.apply(null, arrayExtend([
  ], [array], Array.prototype.slice.call(arguments, 2)));
  return arrayExtend(array, array_part);
}
exports.util.arrayInsert = arrayInsert;

/**
 * Guess if the method is a writer or a reader.
 *
 * @param  {String} method The method name
 * @return {String} "writer", "reader" or "unknown"
 */
function methodType(method) {
  switch (method) {
  case "post":
  case "put":
  case "putAttachment":
  case "remove":
  case "removeAttachment":
  case "repair":
    return 'writer';
  case "get":
  case "getAttachment":
  case "allDocs":
  case "check":
    return 'reader';
  default:
    return 'unknown';
  }
}

/**
 *     forEach(array, callback[, thisArg]): Promise
 *
 * It executes the provided `callback` once for each element of the array with
 * an assigned value asynchronously. If the `callback` returns a promise, then
 * the function will wait for its fulfillment before executing the next
 * iteration.
 *
 * `callback` is invoked with three arguments:
 *
 * - the element value
 * - the element index
 * - the array being traversed
 *
 * If a `thisArg` parameter is provided to `forEach`, it will be passed to
 * `callback` when invoked, for use as its `this` value.  Otherwise, the value
 * `undefined` will be passed for use as its `this` value.
 *
 * Unlike `Array.prototype.forEach`, you can stop the iteration by throwing
 * something, or by doing a `cancel` to the returned promise if it is
 * cancellable promise.
 *
 * Inspired by `Array.prototype.forEach` from Mozilla Developer Network.
 *
 * @param  {Array} array The array to parse
 * @param  {Function} callback Function to execute for each element.
 * @param  {Any} [thisArg] Value to use as `this` when executing `callback`.
 * @param  {Promise} A new promise.
 */
function forEach(array, fn, thisArg) {
  if (arguments.length === 0) {
    throw new TypeError("missing argument 0 when calling function forEach");
  }
  if (!Array.isArray(array)) {
    throw new TypeError(array + " is not an array");
  }
  if (arguments.length === 1) {
    throw new TypeError("missing argument 1 when calling function forEach");
  }
  if (typeof fn !== "function") {
    throw new TypeError(fn + " is not a function");
  }
  var cancelled, current_promise = RSVP.resolve();
  return new RSVP.Promise(function (done, fail, notify) {
    var i = 0;
    function next() {
      if (cancelled) {
        fail(new Error("Cancelled"));
        return;
      }
      if (i < array.length) {
        current_promise =
          current_promise.then(fn.bind(thisArg, array[i], i, array));
        current_promise.then(next, fail, notify);
        i += 1;
        return;
      }
      done();
    }
    next();
  }, function () {
    cancelled = true;
    if (typeof current_promise.cancel === "function") {
      current_promise.cancel();
    }
  });
}
exports.util.forEach = forEach;

/**
 *     range(stop, callback): Promise
 *     range(start, stop[, step], callback): Promise
 *
 * It executes the provided `callback` once for each step between `start` and
 * `stop`. If the `callback` returns a promise, then the function will wait
 * for its fulfillment before executing the next iteration.
 *
 * `callback` is invoked with one argument:
 *
 * - the index of the step
 *
 * `start`, `stop` and `step` must be finite numbers. If `step` is not
 * provided, then the default step will be `1`. If `start` and `step` are not
 * provided, `start` will be `0` and `step` will be `1`.
 *
 * Inspired by `range()` from Python 3 built-in functions.
 *
 *     range(10, function (index) {
 *       return notifyIndex(index);
 *     }).then(onDone, onError, onNotify);
 *
 * @param  {Number} [start=0] The start index
 * @param  {Number} stop The stop index
 * @param  {Number} [step=1] One step
 * @param  {Function} callback Function to execute on each iteration.
 * @param  {Promise} A new promise with no fulfillment value.
 */
function range(start, stop, step, callback) {
  var type_object, cancelled, current_promise;
  type_object = arrayValuesToTypeDict([start, stop, step, callback]);

  if (type_object["function"].length !== 1) {
    throw new TypeError("range(): only one callback is needed");
  }
  start = type_object.number.length;
  if (start < 1) {
    throw new TypeError("range(): 1, 2 or 3 numbers are needed");
  }
  if (start > 3) {
    throw new TypeError("range(): only 1, 2 or 3 numbers are needed");
  }

  callback = type_object["function"][0];

  if (start === 1) {
    start = 0;
    stop = type_object.number[0];
    step = 1;
  }

  if (start === 2) {
    start = type_object.number[0];
    stop = type_object.number[1];
    step = 1;
  }

  if (start === 3) {
    start = type_object.number[0];
    stop = type_object.number[1];
    step = type_object.number[2];
    if (step === 0) {
      throw new TypeError("range(): step must not be zero");
    }
  }

  type_object = undefined;
  current_promise = RSVP.resolve();
  return new RSVP.Promise(function (done, fail, notify) {
    var i = start, test;
    function next() {
      if (cancelled) {
        fail(new Error("Cancelled"));
        return;
      }
      test = step > 0 ? i < stop : i > stop;
      if (test) {
        current_promise = current_promise.then(callback.bind(null, i));
        current_promise.then(next, fail, notify);
        i += step;
        return;
      }
      done();
    }
    next();
  }, function () {
    cancelled = true;
    if (typeof current_promise.cancel === "function") {
      current_promise.cancel();
    }
  });
}
exports.util.range = range;
