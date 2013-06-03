/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global _export: true */

/**
 * Create a class, manage inheritance, static methods,
 * protected attributes and can hide methods or/and secure methods
 *
 * @method newClass
 * @param  {Class} Class Classes to inherit from (0..n). The last class
 *                       parameter will inherit from the previous one, and so on
 * @param  {Object} option Class option (0..n)
 * @param  {Boolean} [option.secure_methods=false] Make methods not configurable
 *                                                 and not writable
 * @param  {Boolean} [option.hide_methods=false] Make methods not enumerable
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

  function postCreate(that) {
    // modify the object according to 'option'
    var key;
    if (option) {
      for (key in that) {
        if (that.hasOwnProperty(key)) {
          if (typeof that[key] === "function") {
            Object.defineProperty(that, key, {
              configurable: option.secure_methods ? false : true,
              enumerable: option.hide_methods ? false : true,
              writable: option.secure_methods ? false : true,
              value: that[key]
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
    postCreate(this);
    return this;
  };
  option = option || {};
  option.static_methods = option.static_methods || {};
  for (j in option.static_methods) {
    if (option.static_methods.hasOwnProperty(j)) {
      new_class[j] = option.static_methods[j];
    }
  }
  postCreate(new_class);
  return new_class;
}

/**
 * Escapes regexp special chars from a string.
 * @method stringEscapeRegexpCharacters
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
 * Convert a search text to a regexp.
 * @method convertSearchTextToRegExp
 * @param  {String} string The string to convert
 * @param  {String} [wildcard_character=undefined] The wildcard chararter
 * @return {RegExp} The search text regexp
 */
function convertSearchTextToRegExp(string, wildcard_character) {
  return new RegExp("^" + stringEscapeRegexpCharacters(string).replace(
    stringEscapeRegexpCharacters(wildcard_character),
    '.*'
  ) + "$");
}
_export("convertSearchTextToRegExp", convertSearchTextToRegExp);

// XXX
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
