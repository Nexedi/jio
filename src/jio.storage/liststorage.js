/*global define, jIO */

/*jslint nomen: true*/
(function (jIO) {
  "use strict";

  function randomId() {
    // https://gist.github.com/gordonbrander/2230317
    return '_' + Math.random().toString(36).substr(2, 9);
  }

  function ListStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._signature_storage = jIO.createJIO({
      "type": "indexeddb",
      "database": randomId()
    });
    this._signature_storage.put("_", {
      list: []
    });
  }

  ListStorage.prototype.post = function () {
    var id = this._sub_storage.post.apply(this._sub_storage, arguments);
    this._signature_storage.get('_').then(function (storage) {
      this._signature_storage.put('_', { list: storage.list.concat(id) });
    }).fail(function (err) {
      throw err;
    });
    return id;
  };

  ListStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  ListStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };

  ListStorage.prototype.remove = function (id) {
    var updated_list = this._signature_storage.get("_")
      .list.filter(function (x) { return x !== id; });
    this._signature_storage.put("_", { list: updated_list });
  };

  ListStorage.prototype.list = function () {
    return this._sub_storage.get("_").then(function (storage) {
      return storage.list;
    });
  };

  jIO.addStorage("list", ListStorage);
}(jIO));
