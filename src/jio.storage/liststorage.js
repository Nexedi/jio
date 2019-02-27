/*global define, jIO, RSVP */

/*jslint nomen: true*/
(function (jIO) {
// (function (jIO, RSVP) {
  "use strict";

  function ListStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._index_storage = jIO.createJIO(spec.index_storage);
    this._index_initialized = false;
    this._index_tmp = []; // temporary array to put ids
    this._index_removed_tmp = []; // temp array to put removed ids
  }

  ListStorage.prototype.buildQuery = function () {
    return this.getIndex();
  };

  ListStorage.prototype.hasCapacity = function (name) {
    if (name === 'list') {
      return true;
    }
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  ListStorage.prototype.getIndex = function () {
    // in brief:
    // pull all ids from _index_tmp and put them in the _index_storage
    // and remove ids from _index_removed_tmp
    // and then return the new '_' entry
    var ctx = this,
      tmp = this._index_tmp,
      removed_tmp = this._index_removed_tmp;
    ctx._index_tmp = [];
    ctx._index_removed_tmp = [];
    if (!ctx._index_initialized) {
      ctx._index_initialized = true;
      tmp = tmp.filter(function (id) {
        return removed_tmp.indexOf(id) === -1;
      });
      return this._index_storage.put('_', tmp)
        .then(function () {
          return tmp;
        });
    }
    return ctx._index_storage.get('_').then(function (index) {
      var newIndex = index.concat(tmp);
      newIndex = newIndex.filter(function (id) {
        return removed_tmp.indexOf(id) === -1;
      });
      return ctx._index_storage.put('_', newIndex)
        .then(function () {
          return newIndex;
        });
    });
  };

  ListStorage.prototype.post = function () {
    var ctx = this;
    return this._sub_storage.post.apply(this._sub_storage, arguments)
      .then(function (id) {
        ctx._index_tmp.push(id);
        return id;
      });
  };

  ListStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  ListStorage.prototype.put = function () {
    var ctx = this;
    return this._sub_storage.put.apply(this._sub_storage, arguments)
      .then(function (id) {
        ctx._index_tmp.push(id);
        return id;
      });
  };

  ListStorage.prototype.remove = function () {
    var ctx = this;
    return this._sub_storage.remove.apply(this._sub_storage, arguments)
      .then(function (id) {
        ctx._index_removed_tmp.push(id);
        return id;
      });
  };

  jIO.addStorage("list", ListStorage);
}(jIO));
// }(jIO, RSVP));
