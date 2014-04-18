/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global Query, RSVP, deepClone */

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
  throw new TypeError("Query.stringEscapeRegexpCharacters(): " +
                      "Argument no 1 is not of type 'string'");
}

Query.stringEscapeRegexpCharacters = stringEscapeRegexpCharacters;

/**
 * Convert metadata values to array of strings. ex:
 *
 *     "a" -> ["a"],
 *     {"content": "a"} -> ["a"]
 *
 * @param  {Any} value The metadata value
 * @return {Array} The value in string array format
 */
function metadataValueToStringArray(value) {
  var i, new_value = [];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    value = [value];
  }
  for (i = 0; i < value.length; i += 1) {
    if (typeof value[i] === 'object') {
      new_value[i] = value[i].content;
    } else {
      new_value[i] = value[i];
    }
  }
  return new_value;
}

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
      // this comparison is 5 times faster than json comparison
      var i, l;
      a = metadataValueToStringArray(a[key]) || [];
      b = metadataValueToStringArray(b[key]) || [];
      l = a.length > b.length ? a.length : b.length;
      for (i = 0; i < l; i += 1) {
        if (a[i] === undefined) {
          return 1;
        }
        if (b[i] === undefined) {
          return -1;
        }
        if (a[i] > b[i]) {
          return -1;
        }
        if (a[i] < b[i]) {
          return 1;
        }
      }
      return 0;
    };
  }
  if (way === 'ascending') {
    return function (a, b) {
      // this comparison is 5 times faster than json comparison
      var i, l;
      a = metadataValueToStringArray(a[key]) || [];
      b = metadataValueToStringArray(b[key]) || [];
      l = a.length > b.length ? a.length : b.length;
      for (i = 0; i < l; i += 1) {
        if (a[i] === undefined) {
          return -1;
        }
        if (b[i] === undefined) {
          return 1;
        }
        if (a[i] > b[i]) {
          return 1;
        }
        if (a[i] < b[i]) {
          return -1;
        }
      }
      return 0;
    };
  }
  throw new TypeError("Query.sortFunction(): " +
                      "Argument 2 must be 'ascending' or 'descending'");
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
function emptyFunction() {
  return;
}

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
  if (!Array.isArray(select_option)) {
    throw new TypeError("jioquery.select(): " +
                        "Argument 1 is not of type Array");
  }
  if (!Array.isArray(list)) {
    throw new TypeError("jioquery.select(): " +
                        "Argument 2 is not of type Array");
  }
  if (clone === true) {
    list = deepClone(list);
  }
  for (i = 0; i < list.length; i += 1) {
    new_item = {};
    for (j = 0; j < select_option.length; j += 1) {
      if (list[i].hasOwnProperty([select_option[j]])) {
        new_item[select_option[j]] = list[i][select_option[j]];
      }
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

Query.select = select;

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
  if (!Array.isArray(sort_on_option)) {
    throw new TypeError("jioquery.sortOn(): " +
                        "Argument 1 is not of type 'array'");
  }
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

Query.sortOn = sortOn;

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
  if (!Array.isArray(limit_option)) {
    throw new TypeError("jioquery.limit(): " +
                        "Argument 1 is not of type 'array'");
  }
  if (!Array.isArray(list)) {
    throw new TypeError("jioquery.limit(): " +
                        "Argument 2 is not of type 'array'");
  }
  if (clone) {
    list = deepClone(list);
  }
  if (limit_option.length > 1) {
    list.splice(0, limit_option[0]);
    if (limit_option[1]) {
      list.length = limit_option[1];
    }
  } else if (limit_option.length === 1) {
    list.length = limit_option[0];
  }
  return list;
}

Query.limit = limit;

/**
 * Convert a search text to a regexp.
 *
 * @param  {String} string The string to convert
 * @param  {Boolean} [use_wildcard_character=true] Use wildcard "%" and "_"
 * @return {RegExp} The search text regexp
 */
function searchTextToRegExp(string, use_wildcard_characters) {
  if (typeof string !== 'string') {
    throw new TypeError("jioquery.searchTextToRegExp(): " +
                        "Argument 1 is not of type 'string'");
  }
  if (use_wildcard_characters === false) {
    return new RegExp("^" + stringEscapeRegexpCharacters(string) + "$");
  }
  return new RegExp("^" + stringEscapeRegexpCharacters(string).replace(
    /%/g,
    ".*"
  ).replace(
    /_/g,
    "."
  ) + "$");
}

Query.searchTextToRegExp = searchTextToRegExp;

/**
 * sequence(thens): Promise
 *
 * Executes a sequence of *then* callbacks. It acts like
 * `smth().then(callback).then(callback)...`. The first callback is called with
 * no parameter.
 *
 * Elements of `thens` array can be a function or an array contaning at most
 * three *then* callbacks: *onFulfilled*, *onRejected*, *onNotified*.
 *
 * When `cancel()` is executed, each then promises are cancelled at the same
 * time.
 *
 * @param  {Array} thens An array of *then* callbacks
 * @return {Promise} A new promise
 */
function sequence(thens) {
  var promises = [];
  return new RSVP.Promise(function (resolve, reject, notify) {
    var i;
    promises[0] = new RSVP.Promise(function (resolve) {
      resolve();
    });
    for (i = 0; i < thens.length; i += 1) {
      if (Array.isArray(thens[i])) {
        promises[i + 1] = promises[i].
          then(thens[i][0], thens[i][1], thens[i][2]);
      } else {
        promises[i + 1] = promises[i].then(thens[i]);
      }
    }
    promises[i].then(resolve, reject, notify);
  }, function () {
    var i;
    for (i = 0; i < promises.length; i += 1) {
      promises[i].cancel();
    }
  });
}
