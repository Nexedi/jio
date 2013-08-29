/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global exports, deepClone, jsonDeepClone */

/**
 * A class to manipulate metadata
 *
 * @class Metadata
 * @constructor
 */
function Metadata(metadata) {
  if (arguments.length > 0) {
    if (typeof metadata !== 'object' ||
        Object.getPrototypeOf(metadata || []) !== Object.prototype) {
      throw new TypeError("Metadata(): Optional argument 1 is not an object");
    }
    this._dict = metadata;
  } else {
    this._dict = {};
  }
}

Metadata.prototype.format = function () {
  return this.update(this._dict);
};

Metadata.prototype.check = function () {
  var k;
  for (k in this._dict) {
    if (this._dict.hasOwnProperty(k)) {
      if (k[0] !== '_') {
        if (!Metadata.checkValue(this._dict[k])) {
          return false;
        }
      }
    }
  }
  return true;
};

Metadata.prototype.update = function (metadata) {
  var k;
  for (k in metadata) {
    if (metadata.hasOwnProperty(k)) {
      if (k[0] === '_') {
        this._dict[k] = jsonDeepClone(metadata[k]);
      } else {
        this._dict[k] = Metadata.normalizeValue(metadata[k]);
      }
      if (this._dict[k] === undefined) {
        delete this._dict[k];
      }
    }
  }
  return this;
};

Metadata.prototype.get = function (key) {
  return this._dict[key];
};

Metadata.prototype.add = function (key, value) {
  var i;
  if (key[0] === '_') {
    return this;
  }
  if (this._dict[key] === undefined) {
    this._dict[key] = Metadata.normalizeValue(value);
    if (this._dict[key] === undefined) {
      delete this._dict[key];
    }
    return this;
  }
  if (!Array.isArray(this._dict[key])) {
    this._dict[key] = [this._dict[key]];
  }
  value = Metadata.normalizeValue(value);
  if (value === undefined) {
    return this;
  }
  if (!Array.isArray(value)) {
    value = [value];
  }
  for (i = 0; i < value.length; i += 1) {
    this._dict[key][this._dict[key].length] = value[i];
  }
  return this;
};

Metadata.prototype.set = function (key, value) {
  if (key[0] === '_') {
    this._dict[key] = JSON.parse(JSON.stringify(value));
  } else {
    this._dict[key] = Metadata.normalizeValue(value);
  }
  if (this._dict[key] === undefined) {
    delete this._dict[key];
  }
  return this;
};

Metadata.prototype.remove = function (key) {
  delete this._dict[key];
  return this;
};


Metadata.prototype.forEach = function (key, fun) {
  var k, i, value, that = this;
  if (typeof key === 'function') {
    fun = key;
    key = undefined;
  }
  function forEach(key, fun) {
    value = that._dict[key];
    if (!Array.isArray(that._dict[key])) {
      value = [value];
    }
    for (i = 0; i < value.length; i += 1) {
      if (typeof value[i] === 'object') {
        fun.call(that, key, deepClone(value[i]), i);
      } else {
        fun.call(that, key, {'content': value[i]}, i);
      }
    }
  }
  if (key === undefined) {
    for (k in this._dict) {
      if (this._dict.hasOwnProperty(k)) {
        forEach(k, fun);
      }
    }
  } else {
    forEach(key, fun);
  }
  return this;
};

Metadata.prototype.toFullDict = function () {
  var dict = {};
  this.forEach(function (key, value, index) {
    dict[key] = dict[key] || [];
    dict[key][index] = value;
  });
  return dict;
};

Metadata.asJsonableValue = function (value) {
  switch (typeof value) {
  case 'string':
  case 'boolean':
    return value;
  case 'number':
    if (isFinite(value)) {
      return value;
    }
    return null;
  case 'object':
    if (value === null) {
      return null;
    }
    if (value instanceof Date) {
      // XXX this block is to enable phantomjs and browsers compatibility with
      // Date.prototype.toJSON when it is a invalid date. In phantomjs, it
      // returns `"Invalid Date"` but in browsers it returns `null`. Here, the
      // result will always be `null`.
      if (isNaN(value.getTime())) {
        return null;
      }
    }
    if (typeof value.toJSON === 'function') {
      return Metadata.asJsonableValue(value.toJSON());
    }
    return value; // dict, array
  // case 'undefined':
  default:
    return null;
  }
};

Metadata.isDict = function (o) {
  return typeof o === 'object' &&
    Object.getPrototypeOf(o || []) === Object.prototype;
};

Metadata.isContent = function (c) {
  return typeof c === 'string' ||
    (typeof c === 'number' && isFinite(c)) ||
    typeof c === 'boolean';
};

Metadata.contentValue = function (value) {
  if (Array.isArray(value)) {
    return Metadata.contentValue(value[0]);
  }
  if (Metadata.isDict(value)) {
    return value.content;
  }
  return value;
};

Metadata.normalizeArray = function (value) {
  var i;
  value = value.slice();
  i = 0;
  while (i < value.length) {
    value[i] = Metadata.asJsonableValue(value[i]);
    if (Metadata.isDict(value[i])) {
      value[i] = Metadata.normalizeObject(value[i]);
      if (value[i] === undefined) {
        value.splice(i, 1);
      } else {
        i += 1;
      }
    } else if (Metadata.isContent(value[i])) {
      i += 1;
    } else {
      value.splice(i, 1);
    }
  }
  if (value.length === 0) {
    return;
  }
  if (value.length === 1) {
    return value[0];
  }
  return value;
};

Metadata.normalizeObject = function (value) {
  var i, count = 0, ok = false, new_value = {};
  for (i in value) {
    if (value.hasOwnProperty(i)) {
      value[i] = Metadata.asJsonableValue(value[i]);
      if (Metadata.isContent(value[i])) {
        new_value[i] = value[i];
        if (new_value[i] === undefined) {
          delete new_value[i];
        }
        count += 1;
        if (i === 'content') {
          ok = true;
        }
      }
    }
  }
  if (ok === false) {
    return;
  }
  if (count === 1) {
    return new_value.content;
  }
  return new_value;
};

Metadata.normalizeValue = function (value) {
  value = Metadata.asJsonableValue(value);
  if (Metadata.isContent(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return Metadata.normalizeArray(value);
  }
  if (Metadata.isDict(value)) {
    return Metadata.normalizeObject(value);
  }
};

Metadata.checkArray = function (value) {
  var i;
  for (i = 0; i < value.length; i += 1) {
    if (Metadata.isDict(value[i])) {
      if (!Metadata.checkObject(value[i])) {
        return false;
      }
    } else if (!Metadata.isContent(value[i])) {
      return false;
    }
  }
  return true;
};

Metadata.checkObject = function (value) {
  var i, ok = false;
  for (i in value) {
    if (value.hasOwnProperty(i)) {
      if (Metadata.isContent(value[i])) {
        if (i === 'content') {
          ok = true;
        }
      } else {
        return false;
      }
    }
  }
  if (ok === false) {
    return false;
  }
  return true;
};

Metadata.checkValue = function (value) {
  if (Metadata.isContent(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return Metadata.checkArray(value);
  }
  if (Metadata.isDict(value)) {
    return Metadata.checkObject(value);
  }
  return false;
};

exports.Metadata = Metadata;
