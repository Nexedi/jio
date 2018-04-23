/*jslint nomen: true*/
(function (jIO) {
  "use strict";

  /**
   * The jIO RandomStorage extension
   *
   * @class RandomStorage
   * @constructor
   */
  function RandomStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  RandomStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  RandomStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  RandomStorage.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage, arguments);
  };
  RandomStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };
  RandomStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  RandomStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  RandomStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  RandomStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };
  RandomStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };
  RandomStorage.prototype.buildQuery = function (options) {
    var limit;
    if (options.sort_on[0][0] === 'random') {
      limit = options.limit;
      delete options.limit;
    }
    return this._sub_storage.buildQuery.apply(this._sub_storage,
                                              arguments)
      .push(function (result) {
        // Random shuffle the result when random is present in the options.
        if (options.sort_on[0][0] === 'random') {
          var final_result = [],
            random_number;

          while (limit[1] && result.length - limit[0]) {
            random_number = Math.floor(Math.random() * result.length);
            random_number = random_number === result.length ?
                result.length - 1 : random_number;
            final_result.push(result.splice(random_number, 1)[0]);
            limit[1] -= 1;
          }

          return final_result;
        }
        return result;
      });
  };

  jIO.addStorage('random', RandomStorage);

}(jIO));
