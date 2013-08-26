/*jslint indent: 2, maxlen: 80, nomen: true, sloppy: true */
/*global exports, Blob, FileReader, Deferred, hex_sha256 */

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
 * Clones jsonable object in deep
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
 * Clones all native object in deep. Managed types: Object, Array, String,
 * Number, Boolean, Function, null.
 *
 * It can also clone object which are serializable, like Date.
 *
 * To make a class serializable, you need to implement the `toJSON` function
 * which returns a JSON representation of the object. The return value is used
 * as first parameter of the object constructor.
 *
 * @param  {A} object The object to clone
 * @return {A} The cloned object
 */
function deepClone(object) {
  var i, cloned;
  if (Array.isArray(object)) {
    cloned = [];
    for (i = 0; i < object.length; i += 1) {
      cloned[i] = deepClone(object[i]);
    }
    return cloned;
  }
  if (object === null) {
    return null;
  }
  if (typeof object === 'object') {
    if (Object.getPrototypeOf(object) === Object.prototype) {
      cloned = {};
      for (i in object) {
        if (object.hasOwnProperty(i)) {
          cloned[i] = deepClone(object[i]);
        }
      }
      return cloned;
    }
    if (object instanceof Date) {
      // XXX this block is to enable phantomjs and browsers compatibility with
      // Date.prototype.toJSON when it is a invalid date. In phantomjs, it
      // returns `"Invalid Date"` but in browsers it returns `null`. In
      // browsers, give `null` as parameter to `new Date()` doesn't return an
      // invalid date.

      // Clonning date with `return new Date(object)` make problems on Firefox.
      // I don't know why...  (Tested on Firefox 23)

      if (isFinite(object.getTime())) {
        return new Date(object.toJSON());
      }
      return new Date("Invalid Date");
    }
    // clone serializable objects
    if (typeof object.toJSON === 'function') {
      return new (Object.getPrototypeOf(object).constructor)(object.toJSON());
    }
    // cannot clone
    return object;
  }
  return object;
}
exports.util.deepClone = deepClone;

/**
 * Update a dictionnary by adding/replacing key values from another dict.
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
 * A faster version of `array.indexOf(value)` -> `indexOf(value, array)`
 *
 * @param  {Any} value The value to search for
 * @param  {Array} array The array to browse
 * @return {Number} index of value, -1 otherwise
 */
function indexOf(value, array) {
  var i;
  for (i = 0; i < array.length; i += 1) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}
exports.util.indexOf = indexOf;

/**
 * Gets all elements of an array and classifies them in a dict of array.
 * Dict keys are element types, and values are list of element of type 'key'.
 *
 * @param  {Array} array The array of elements to pop
 * @return {Object} The type dict
 */
function arrayValuesToTypeDict(array) {
  var i, type, types = {};
  for (i = 0; i < array.length; i += 1) {
    type = Array.isArray(array[i]) ? 'array' : typeof array[i];
    if (!types[type]) {
      types[type] = [array[i]];
    } else {
      types[type][types[type].length] = array[i];
    }
  }
  return types;
}

/**
 * An Universal Unique ID generator
 *
 * @return {String} The new UUID.
 */
function generateUuid() {
  function S4() {
    return ('0000' + Math.floor(
      Math.random() * 0x10000 /* 65536 */
    ).toString(16)).slice(-4);
  }
  return S4() + S4() + "-" +
    S4() + "-" +
    S4() + "-" +
    S4() + "-" +
    S4() + S4() + S4();
}
exports.util.generateUuid = generateUuid;

/**
 * Returns the number with the lowest value
 *
 * @param  {Number} *values The values to compare
 * @return {Number} The minimum
 */
function min() {
  var i, val;
  for (i = 1; i < arguments.length; i += 1) {
    if (val === undefined || val > arguments[i]) {
      val = arguments[i];
    }
  }
  return val;
}
exports.util.min = min;

/**
 * Returns the number with the greatest value
 *
 * @param  {Number} *values The values to compare
 * @return {Number} The maximum
 */
function max() {
  var i, val;
  for (i = 1; i < arguments.length; i += 1) {
    if (val === undefined || val < arguments[i]) {
      val = arguments[i];
    }
  }
  return val;
}
exports.util.max = max;

/**
 * JSON stringify a value. Dict keys are sorted in order to make a kind of
 * deepEqual thanks to a simple strict equal string comparison.
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
 * @param  {Function} [replacer] A function to replace values during parse
 */
function uniqueJSONStringify(value, replacer) {
  function subStringify(value, key) {
    var i, res;
    if (typeof replacer === 'function') {
      value = replacer(key, value);
    }
    if (Array.isArray(value)) {
      res = [];
      for (i = 0; i < value.length; i += 1) {
        res[res.length] = subStringify(value[i], i);
        if (res[res.length - 1] === undefined) {
          res[res.length - 1] = 'null';
        }
      }
      return '[' + res.join(',') + ']';
    }
    if (typeof value === 'object' && value !== null &&
        typeof value.toJSON !== 'function') {
      res = [];
      for (i in value) {
        if (value.hasOwnProperty(i)) {
          res[res.length] = subStringify(value[i], i);
          if (res[res.length - 1] !== undefined) {
            res[res.length - 1] = JSON.stringify(i) + ":" + res[res.length - 1];
          } else {
            res.length -= 1;
          }
        }
      }
      res.sort();
      return '{' + res.join(',') + '}';
    }
    return JSON.stringify(value);
  }
  return subStringify(value, '');
}
exports.util.uniqueJSONStringify = uniqueJSONStringify;

function makeBlobDigest(blob) {
  var deferred = new Deferred(), fr = new FileReader();
  fr.onload = function () {
    deferred.resolve('sha256-' + hex_sha256(fr.result));
  };
  fr.onerror = function () {
    deferred.reject();        // XXX
  };
  fr.readAsBinaryString(blob);
  return deferred.promise();
}
exports.util.makeBlobDigest = makeBlobDigest;

function makeBinaryStringDigest(string) {
  return 'sha256-' + hex_sha256(string);
}
exports.util.makeBinaryStringDigest = makeBinaryStringDigest;

function blobAsBinaryString(blob) {
  var deferred = new Deferred(), fr = new FileReader();
  fr.onload = function () {
    deferred.resolve(fr.result);
  };
  fr.onerror = function () {
    deferred.reject();        // XXX
  };
  fr.readAsBinaryString(blob);
  return deferred.promise();
}
exports.util.blobAsBinaryString = blobAsBinaryString;

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
