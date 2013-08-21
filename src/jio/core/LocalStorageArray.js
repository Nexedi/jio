
/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global localStorage */

// keywords: js, javascript, store on local storage as array

function LocalStorageArray(namespace) {
  var index, next;

  function nextId() {
    var i = next;
    next += 1;
    return i;
  }

  this.length = function () {
    return index.length;
  };

  this.truncate = function (length) {
    var i;
    if (length === index.length) {
      return this;
    }
    if (length > index.length) {
      index.length = length;
      localStorage[namespace + '.index'] = JSON.stringify(index);
      return this;
    }
    while (length < index.length) {
      i = index.pop();
      if (i !== undefined && i !== null) {
        delete localStorage[namespace + '.' + i];
      }
    }
    localStorage[namespace + '.index'] = JSON.stringify(index);
    return this;
  };

  this.get = function (i) {
    return JSON.parse(localStorage[namespace + '.' + index[i]] || 'null');
  };

  this.set = function (i, value) {
    if (index[i] === undefined || index[i] === null) {
      index[i] = nextId();
      localStorage[namespace + '.' + index[i]] = JSON.stringify(value);
      localStorage[namespace + '.index'] = JSON.stringify(index);
    } else {
      localStorage[namespace + '.' + index[i]] = JSON.stringify(value);
    }
    return this;
  };

  this.append = function (value) {
    index[index.length] = nextId();
    localStorage[namespace + '.' + index[index.length - 1]] =
      JSON.stringify(value);
    localStorage[namespace + '.index'] = JSON.stringify(index);
    return this;
  };

  this.pop = function (i) {
    var value, key;
    if (i === undefined || i === null) {
      key = namespace + '.' + index[index.length - 1];
      index.pop();
    } else {
      if (i < 0 || i >= index.length) {
        return null;
      }
      key = namespace + '.' + i;
      index.splice(i, 1);
    }

    value = localStorage[key];

    if (index.length === 0) {
      delete localStorage[namespace + '.index'];
    } else {
      localStorage[namespace + '.index'] = JSON.stringify(index);
    }
    delete localStorage[key];

    return JSON.parse(value || 'null');
  };

  this.clear = function () {
    var i;
    for (i = 0; i < index.length; i += 1) {
      delete localStorage[namespace + '.' + index[i]];
    }
    index = [];
    delete localStorage[namespace + '.index'];
    return this;
  };

  this.reload = function () {
    var i;
    index = JSON.parse(localStorage[namespace + '.index'] || '[]');
    next = 0;
    for (i = 0; i < index.length; i += 1) {
      if (next < index[i]) {
        next = index[i];
      }
    }
    return this;
  };

  this.toArray = function () {
    var i, list = [];
    for (i = 0; i < index.length; i += 1) {
      list[list.length] = this.get(i);
    }
    return list;
  };

  this.update = function (list) {
    if (!Array.isArray(list)) {
      throw new TypeError("LocalStorageArray().saveArray(): " +
                          "Argument 1 is not of type 'array'");
    }
    var i, location;
    // update previous values
    for (i = 0; i < list.length; i += 1) {
      location = index[i];
      if (location === undefined || location === null) {
        location = nextId();
        index[i] = location;
      }
      localStorage[namespace + '.' + location] =
        JSON.stringify(list[i]);
    }
    // remove last ones
    while (list.length < index.length) {
      location = index.pop();
      if (location !== undefined && location !== null) {
        delete localStorage[namespace + '.' + location];
      }
    }
    // store index
    localStorage[namespace + '.index'] = JSON.stringify(index);
    return this;
  };

  this.reload();
}

LocalStorageArray.saveArray = function (namespace, list) {
  if (!Array.isArray(list)) {
    throw new TypeError("LocalStorageArray.saveArray(): " +
                        "Argument 2 is not of type 'array'");
  }
  var local_storage_array = new LocalStorageArray(namespace).clear(), i;
  for (i = 0; i < list.length; i += 1) {
    local_storage_array.append(list[i]);
  }
};
