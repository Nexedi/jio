/*jslint nomen: true*/
(function (jIO) {
  "use strict";

  /**
   * The jIO DateUpdaterStorage extension
   *
   * @class DateUpdaterStorage
   * @constructor
   */

  function updateDocument(doc, property_list) {
    var i, len = property_list.length;
    for (i = 0; i < len; i += 1) {
      doc[property_list[i]] = new Date().toUTCString().replace('GMT', '+0000');
    }
    return doc;
  }

  function DateUpdaterStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._property_list = spec.property_list || [];
  }

  DateUpdaterStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  DateUpdaterStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  DateUpdaterStorage.prototype.post = function (doc) {
    doc = updateDocument(doc, this._property_list);
    return this._sub_storage.post(doc);
  };
  DateUpdaterStorage.prototype.put = function (id, doc) {
    doc = updateDocument(doc, this._property_list);
    return this._sub_storage.put(id, doc);
  };
  DateUpdaterStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  DateUpdaterStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  DateUpdaterStorage.prototype.putAttachment = function (id) {
    var storage = this, argument_list = arguments;
    return this._sub_storage.get(id)
      .push(function (doc) {
        return storage.put(id, doc);
      })
      .push(function () {
        return storage._sub_storage.putAttachment.apply(
          storage._sub_storage,
          argument_list
        );
      });
  };
  DateUpdaterStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };
  DateUpdaterStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };
  DateUpdaterStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };
  DateUpdaterStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage,
                                              arguments);
  };

  jIO.addStorage('dateupdater', DateUpdaterStorage);

}(jIO));
