/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global _export: true */

/**
 * Create a class, manage inheritance, static methods,
 * protected attributes and can hide methods or/and secure methods
 *
 * @param  {Class} Class Classes to inherit from (0..n). The last class
 *                       parameter will inherit from the previous one, and so on
 * @param  {Object} option Class option (0..n)
 * @param  {Boolean} [option.secure_methods=false] Make methods not configurable
 *                                                 and not writable
 * @param  {Boolean} [option.hide_methods=false] Make methods not enumerable
 * @param  {Boolean} [option.secure_static_methods=true] Make static methods not
 *                                                       configurable and not
 *                                                       writable
 * @param  {Boolean} [option.hide_static_methods=false] Make static methods not
 *                                                      enumerable
 * @param  {Object} [option.static_methods={}] Object of static methods
 * @param  {Function} constructor The new class constructor
 * @return {Class} The new class
 */
function newClass() {
  var j, k, constructors = [], option, new_class;

  for (j = 0; j < arguments.length; j += 1) {
    if (typeof arguments[j] === "function") {
      constructors.push(arguments[j]);
    } else if (typeof arguments[j] === "object") {
      option = option || {};
      for (k in arguments[j]) {
        if (arguments[j].hasOwnProperty(k)) {
          option[k] = arguments[j][k];
        }
      }
    }
  }

  function postObjectCreation(that) {
    // modify the object according to 'option'
    var key;
    if (option) {
      for (key in that) {
        if (that.hasOwnProperty(key)) {
          if (typeof that[key] === "function") {
            Object.defineProperty(that, key, {
              "configurable": option.secure_methods ? false : true,
              "enumerable": option.hide_methods ? false : true,
              "writable": option.secure_methods ? false : true,
              "value": that[key]
            });
          }
        }
      }
    }
  }

  function postClassCreation(that) {
    // modify the object according to 'option'
    var key;
    if (option) {
      for (key in that) {
        if (that.hasOwnProperty(key)) {
          if (typeof that[key] === "function") {
            Object.defineProperty(that, key, {
              "configurable": option.secure_static_methods ===
                false ? true : false,
              "enumerable": option.hide_static_methods ? false : true,
              "writable": option.secure_static_methods === false ? true : false,
              "value": that[key]
            });
          }
        }
      }
    }
  }

  new_class = function (spec, my) {
    var i;
    spec = spec || {};
    my = my || {};
    // don't use forEach !
    for (i = 0; i < constructors.length; i += 1) {
      constructors[i].apply(this, [spec, my]);
    }
    postObjectCreation(this);
    return this;
  };
  option = option || {};
  option.static_methods = option.static_methods || {};
  for (j in option.static_methods) {
    if (option.static_methods.hasOwnProperty(j)) {
      new_class[j] = option.static_methods[j];
    }
  }
  postClassCreation(new_class);
  return new_class;
}

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
