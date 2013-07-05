/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global _export: true */

/**
 * Escapes regexp special chars from a string.
 *
 * @param  {String} string The string to escape
 * @return {String} The escaped string
 */
function stringEscapeRegexpCharacters(string) {
  if (typeof string === "string") {
    return string.replace(/([\\\.\$\[\]\(\)\{\}\^\?\*\+\-])/g, "\\$1");
  }
}

_export("stringEscapeRegexpCharacters", stringEscapeRegexpCharacters);

/**
 * A sort function to sort items by key
 *
 * @param  {String} key The key to sort on
 * @param  {String} [way="ascending"] 'ascending' or 'descending'
 * @return {Function} The sort function
 */
function sortFunction(key, way) {
  if (way === 'descending') {
    return function (a, b) {
      return a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0;
    };
  }
  return function (a, b) {
    return a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0;
  };
}

/**
 * Clones all native object in deep. Managed types: Object, Array, String,
 * Number, Boolean, null.
 *
 * @param  {A} object The object to clone
 * @return {A} The cloned object
 */
function deepClone(object) {
  var i, cloned;
  if (Object.prototype.toString.call(object) === "[object Array]") {
    cloned = [];
    for (i = 0; i < object.length; i += 1) {
      cloned[i] = deepClone(object[i]);
    }
    return cloned;
  }
  if (typeof object === "object") {
    cloned = {};
    for (i in object) {
      if (object.hasOwnProperty(i)) {
        cloned[i] = deepClone(object[i]);
      }
    }
    return cloned;
  }
  return object;
}

/**
 * Inherits the prototype methods from one constructor into another. The
 * prototype of `constructor` will be set to a new object created from
 * `superConstructor`.
 *
 * @param  {Function} constructor The constructor which inherits the super one
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
 * Does nothing
 */
function emptyFunction() {}

/**
 * Filter a list of items, modifying them to select only wanted keys. If
 * `clone` is true, then the method will act on a cloned list.
 *
 * @param  {Array} select_option Key list to keep
 * @param  {Array} list The item list to filter
 * @param  {Boolean} [clone=false] If true, modifies a clone of the list
 * @return {Array} The filtered list
 */
function select(select_option, list, clone) {
  var i, j, new_item;
  if (clone) {
    list = deepClone(list);
  }
  for (i = 0; i < list.length; i += 1) {
    new_item = {};
    for (j = 0; j < select_option.length; j += 1) {
      new_item[select_option[j]] = list[i][select_option[j]];
    }
    for (j in new_item) {
      if (new_item.hasOwnProperty(j)) {
        list[i] = new_item;
        break;
      }
    }
  }
  return list;
}

_export('select', select);

/**
 * Sort a list of items, according to keys and directions. If `clone` is true,
 * then the method will act on a cloned list.
 *
 * @param  {Array} sort_on_option List of couples [key, direction]
 * @param  {Array} list The item list to sort
 * @param  {Boolean} [clone=false] If true, modifies a clone of the list
 * @return {Array} The filtered list
 */
function sortOn(sort_on_option, list, clone) {
  var sort_index;
  if (clone) {
    list = deepClone(list);
  }
  for (sort_index = sort_on_option.length - 1; sort_index >= 0;
       sort_index -= 1) {
    list.sort(sortFunction(
      sort_on_option[sort_index][0],
      sort_on_option[sort_index][1]
    ));
  }
  return list;
}

_export('sortOn', sortOn);

/**
 * Limit a list of items, according to index and length. If `clone` is true,
 * then the method will act on a cloned list.
 *
 * @param  {Array} limit_option A couple [from, length]
 * @param  {Array} list The item list to limit
 * @param  {Boolean} [clone=false] If true, modifies a clone of the list
 * @return {Array} The filtered list
 */
function limit(limit_option, list, clone) {
  if (clone) {
    list = deepClone(list);
  }
  list.splice(0, limit_option[0]);
  if (limit_option[1]) {
    list.splice(limit_option[1]);
  }
  return list;
}

_export('limit', limit);

/**
 * Convert a search text to a regexp.
 *
 * @param  {String} string The string to convert
 * @param  {String} [wildcard_character=undefined] The wildcard chararter
 * @return {RegExp} The search text regexp
 */
function convertStringToRegExp(string, wildcard_character) {
  return new RegExp("^" + stringEscapeRegexpCharacters(string).replace(
    stringEscapeRegexpCharacters(wildcard_character),
    '.*'
  ) + "$");
}

_export('convertStringToRegExp', convertStringToRegExp);
