/*jslint nomen: true*/
/*global RSVP, FileReader*/
// JIO MemoryIndex Storage Description :
//defenition = {
//  type: "memoryindex",
//  index: {
//    property_id1: null,
//    property_id2: function (obj) {
//      if (!obj.property_id1) {
//        return obj.property_id2;
//      }
//    }
//  },
//  sub_storage: {}
//};

(function (jIO, RSVP) {
  "use strict";

  /**
   * The jIO MemoryIndex extension
   *
   * @class MemoryIndex
   * @constructor
   */
  function substorage(method_name) {
    return function () {
      return this._sub_storage[method_name].apply(this._sub_storage, arguments);
    };
  }

  function get_value(obj, property_name) {
    var value;
    if (property_name.constructor === String) {
      value = obj[property_name];
    } else {
      value = property_name(obj);
    }
    return value;
  }

  function MemoryIndex(spec) {
    var indexes = spec.index || {},
      _indexes = {},
      index_name;
    this.select_list = spec.select_list || [];
    this.index = indexes;
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._indexes = _indexes;
    for (index_name in indexes) {
      if (indexes.hasOwnProperty(index_name)) {
        _indexes[index_name] = {};
      }
    }
    this.memory_reindex();
  }

  MemoryIndex.prototype.memory_reindex = function () {
    var indexes = this.index || {},
      _indexes = this._indexes,
      index_name,
      property_name,
      row,
      i,
      value,
      select_list = this.select_list.slice();
    for (index_name in indexes) {
      if (indexes.hasOwnProperty(index_name)) {
        select_list.push(index_name);
      }
    }
    return this._sub_storage.allDocs({select_list: select_list})
      .push(function (result) {
        var index_name;
        for (i = 0; i < result.data.total_rows; i += 1) {
          row = result.data.rows[i];
          for (index_name in indexes) {
            if (indexes.hasOwnProperty(index_name)) {
              property_name = indexes[index_name] || index_name;
              value = get_value(row.value, property_name);
              if (value) {
                _indexes[index_name][value] = row.id;
              }
            }
          }
        }
      });
  };

  MemoryIndex.prototype._find_key = function (index_name, value) {
    return this._indexes[index_name][value];
  };

  MemoryIndex.prototype.find = function (index_name, value) {
    var key = this._find_key(index_name, value),
      queue;
    if (key) {
      queue = this._sub_storage.get(key)
        .push(function (data) {
          data.id = key;
          return data;
        });
    } else {
      queue = RSVP.Queue()
        .push(function () {
          throw new jIO.util.jIOError("Cannot find document", 404);
        });
    }
    return queue;
  };

  MemoryIndex.prototype.put = function (key, value_to_save) {
    var property_name,
      indexes = this.index,
      _indexes = this._indexes,
      value,
      sub_storage = this._sub_storage;
    return sub_storage.put.apply(sub_storage, arguments)
      .push(function () {
        var index_name;
        for (index_name in indexes) {
          if (indexes.hasOwnProperty(index_name)) {
            property_name = indexes[index_name] || index_name;
            value = get_value(value_to_save, property_name);
            if (value) {
              _indexes[index_name][value] = key;
            }
          }
        }
      });
  };

  MemoryIndex.prototype.remove = function (key) {
    var property_name,
      indexes = this.index,
      _indexes = this._indexes,
      value,
      value_to_remove,
      sub_storage = this._sub_storage;
    return sub_storage.get(key)
      .push(function (result) {
        value_to_remove = result;
        return sub_storage.remove(key);
      })
      .push(function () {
        var index_name;
        for (index_name in indexes) {
          if (indexes.hasOwnProperty(index_name)) {
            property_name = indexes[index_name] || index_name;
            value = get_value(value_to_remove, property_name);
            if (value) {
              delete _indexes[index_name][value];
            }
          }
        }
      });
  };

  MemoryIndex.prototype.post = substorage('get');
  MemoryIndex.prototype.post = substorage('post');
  MemoryIndex.prototype.repair = substorage('repair');
  MemoryIndex.prototype.allDocs = substorage('allDocs');
  MemoryIndex.prototype.hasCapacity = substorage('hasCapacity');
  MemoryIndex.prototype.buildQuery = substorage('buildQuery');
  MemoryIndex.prototype.allAttachments = substorage('allAttachments');
  MemoryIndex.prototype.getAttachment = substorage('getAttachment');
  MemoryIndex.prototype.putAttachment = substorage('putAttachment');
  MemoryIndex.prototype.removeAttachment = substorage('removeAttachment');

  jIO.addStorage('memoryindex', MemoryIndex);

}(jIO, RSVP));
