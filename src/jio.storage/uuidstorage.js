/*jslint nomen: true*/
(function (jIO) {
  "use strict";

  /**
   * The jIO UUIDStorage extension
   *
   * @class UUIDStorage
   * @constructor
   */
  function UUIDStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  UUIDStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  UUIDStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  UUIDStorage.prototype.post = function (param) {

    function S4() {
      return ('0000' + Math.floor(
        Math.random() * 0x10000 /* 65536 */
      ).toString(16)).slice(-4);
    }

    var id = S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();

    return this.put(id, param);
  };
  UUIDStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };
  UUIDStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  UUIDStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  UUIDStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  UUIDStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };
  UUIDStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };
  UUIDStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage,
                                              arguments);
  };

  jIO.addStorage('uuid', UUIDStorage);

}(jIO));
