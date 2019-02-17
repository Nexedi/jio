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
  }

  ListStorage.prototype.list = function () {
    // lazily initialize the list in _signature_storage
    var ctx = this;
    return this._signature_storage.get('_').then(function (list) {
      return list;
    }).fail(function () {
      return ctx._signature_storage.put('_', []).then(function () {
        return [];
      });
    });
  };

  ListStorage.prototype.post = function () {
    var ctx = this;
    return this._sub_storage.post.apply(this._sub_storage, arguments)
      .then(function (id) {
        return ctx.list().then(function (list) {
          list.push(id);
          return ctx._signature_storage.put('_', list).then(function () {
            return id;
          });
        });
      });
  };

  ListStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  ListStorage.prototype.put = function () {
    var ctx = this;
    return this._sub_storage.put.apply(this._sub_storage, arguments)
      .then(function (id) {
        return ctx.list().then(function (list) {
          list.push(id);
          return ctx._signature_storage.put('_', list).then(function () {
            return id;
          });
        });
      });
  };

  ListStorage.prototype.remove = function (id) {
    var updated_list = this._signature_storage.get("_")
      .list.filter(function (x) { return x !== id; });
    this._signature_storage.put("_", { list: updated_list });
  };

  jIO.addStorage("list", ListStorage);
}(jIO));
