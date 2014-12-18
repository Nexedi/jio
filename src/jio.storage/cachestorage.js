/*jslint nomen: true, maxlen: 200*/
/*global RSVP, console*/
(function (jIO) {
  "use strict";

  /**
   * The jIO CacheStorage extension
   *
   * @class CacheStorage
   * @constructor
   */

  // XXX Delete entry when put post delete
  function enqueueDefer(storage, callback) {
    var deferred = storage._current_deferred;

    // Unblock queue
    if (deferred !== undefined) {
      deferred.resolve("Another event added");
    }

    // Add next callback
    try {
      storage._service_queue.push(callback);
    } catch (error) {
      throw new Error("Cache storage already crashed... " +
                      storage._service_queue.rejectedReason.toString());
    }

    // Block the queue
    deferred = RSVP.defer();
    storage._current_deferred = deferred;
    storage._service_queue.push(function () {
      return deferred.promise;
    });

  }



  function CacheStorage(spec) {
    this._cache_storage = jIO.createJIO(spec.cache_storage);
    this._sub_storage = jIO.createJIO(spec.sub_storage);

    this._service_queue = new RSVP.Queue();
    enqueueDefer(this, function () {return; });

  }

  CacheStorage.prototype.get = function () {
    var context = this,
      argument_list = arguments;
    return this._cache_storage.get.apply(this._cache_storage, arguments)
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 404)) {
          return context._sub_storage.get.apply(context._sub_storage, argument_list)
            .push(function (document) {

              var clone = JSON.parse(JSON.stringify(document));
              // XXX Deep clone
              clone._id = argument_list[0]._id;

              enqueueDefer(context, function () {
                return context._cache_storage.put(clone);
              });

              return document;
            });
        }
        throw error;
      });
  };

  CacheStorage.prototype.post = function (param) {
    var context = this;
    return this._cache_storage.post.apply(this._cache_storage, arguments)
      .push(function (id) {
        // XXX Deep clone
        param._id = id;
        enqueueDefer(context, function () {
          return context._sub_storage.put(param)
            .push(undefined, function (error) {
              console.warn(error);
              console.warn(param);
              throw error;
            });
        });
        return id;
      });
  };
  CacheStorage.prototype.put = function () {
    var context = this,
      argument_list = arguments;
    return this._cache_storage.put.apply(this._cache_storage, arguments)
      .push(function (result) {
        enqueueDefer(context, function () {
          return context._sub_storage.put.apply(context._sub_storage, argument_list);
        });
        return result;
      });
  };
  CacheStorage.prototype.remove = function () {
    var context = this,
      argument_list = arguments;
    return this._cache_storage.remove.apply(this._cache_storage, arguments)
      .push(function (result) {
        enqueueDefer(context, function () {
          return context._sub_storage.remove.apply(context._sub_storage, argument_list);
        });
        return result;
      });
  };
  CacheStorage.prototype.getAttachment = function () {
    var context = this,
      argument_list = arguments;
    return this._cache_storage.getAttachment.apply(this._cache_storage, arguments)
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 404)) {
          return context._sub_storage.getAttachment.apply(context._sub_storage, argument_list)
            .push(function (blob) {

              enqueueDefer(context, function () {
                return context._cache_storage.putAttachment(argument_list[0], blob);
              });

              return blob;
            });
        }
        throw error;
      });
  };
  CacheStorage.prototype.putAttachment = function () {
    var context = this,
      argument_list = arguments;
    return this._cache_storage.putAttachment.apply(this._cache_storage, arguments)
      .push(function (result) {
        enqueueDefer(context, function () {
          return context._sub_storage.putAttachment.apply(context._sub_storage, argument_list);
        });
        return result;
      });
  };
  CacheStorage.prototype.removeAttachment = function () {
    var context = this,
      argument_list = arguments;
    return this._cache_storage.removeAttachment.apply(this._cache_storage, arguments)
      .push(function (result) {
        enqueueDefer(context, function () {
          return context._sub_storage.removeAttachment.apply(context._sub_storage, argument_list);
        });
        return result;
      });
  };
  CacheStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };
  CacheStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
  };

  jIO.addStorage('cache', CacheStorage);

}(jIO));
