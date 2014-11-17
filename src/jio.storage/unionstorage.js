/*jslint nomen: true */

/**
 * JIO Union Storage. Type = 'union'.
 * This provide a unified access other multiple storage.
 * New document are created in the first sub storage.
 * Document are searched in each sub storage until it is found.
 * 
 *
 * Storage Description:
 *
 *     {
 *       "type": "union",
 *       "storage_list": [
 *         sub_storage_description_1,
 *         sub_storage_description_2,
 *
 *         sub_storage_description_X,
 *       ]
 *     }
 *
 * @class UnionStorage
 */

(function (jIO) {
  "use strict";

  /**
   * The JIO UnionStorage extension
   *
   * @class UnionStorage
   * @constructor
   */
  function UnionStorage(spec) {
    if (!Array.isArray(spec.storage_list)) {
      throw new jIO.util.jIOError("storage_list is not an Array", 400);
    }
    var i;
    this._storage_list = [];
    for (i = 0; i < spec.storage_list.length; i += 1) {
      this._storage_list.push(jIO.createJIO(spec.storage_list[i]));
    }
  }

  UnionStorage.prototype._getWithStorageIndex = function () {
    var i,
      index = 0,
      context = this,
      arg = arguments,
      result = this._storage_list[0].get.apply(this._storage_list[0], arg);

    function handle404(j) {
      result
        .push(undefined, function (error) {
          if ((error instanceof jIO.util.jIOError) &&
              (error.status_code === 404)) {
            return context._storage_list[j].get.apply(context._storage_list[j],
                                                      arg)
              .push(function (doc) {
                index = j;
                return doc;
              });
          }
          throw error;
        });
    }

    for (i = 1; i < this._storage_list.length; i += 1) {
      handle404(i);
    }
    return result
      .push(function (doc) {
        return [index, doc];
      });
  };

  /*
   * Get a document
   * Try on each substorage on after the other
   */
  UnionStorage.prototype.get = function () {
    return this._getWithStorageIndex.apply(this, arguments)
      .push(function (result) {
        return result[1];
      });
  };

  /*
   * Post a document
   * Simply store on the first substorage
   */
  UnionStorage.prototype.post = function () {
    return this._storage_list[0].post.apply(this._storage_list[0], arguments);
  };

  /*
   * Put a document
   * Search the document location, and modify it in its storage.
   */
  UnionStorage.prototype.put = function () {
    var arg = arguments,
      context = this;
    return this._getWithStorageIndex({"_id": arg[0]._id})
      .push(function (result) {
        // Storage found, modify in it directly
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.put.apply(sub_storage, arg);
      });
  };

  /*
   * Remove a document
   * Search the document location, and remove it from its storage.
   */
  UnionStorage.prototype.remove = function () {
    var arg = arguments,
      context = this;
    return this._getWithStorageIndex({"_id": arg[0]._id})
      .push(function (result) {
        // Storage found, remove from it directly
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.remove.apply(sub_storage, arg);
      });
  };

  jIO.addStorage('union', UnionStorage);

}(jIO));
