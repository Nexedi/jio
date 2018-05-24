/*jslint nomen: true*/
/*global RSVP, jiodate*/
(function (jIO) {
  "use strict";

  /**
   * The jIO BryanStorage extension
   *
   * @class BryanStorage
   * @constructor
   */
  function BryanStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  BryanStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  BryanStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };

  // Not implemented for IndexedDB
  BryanStorage.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage, arguments);
  };

  BryanStorage.prototype.put = function (id, new_metadata) {
    var substorage = this._sub_storage;

    return this.get(id)
      .push(
        function (metadata) {
          // Increments existing "_revision" attribute
          new_metadata._revision = metadata._revision + 1;
          return substorage.put(id, new_metadata);
        },
        function () {
          // Creates new attribute "_revision" = 0
          new_metadata._revision = 0;
          return substorage.put(id, new_metadata);
        }
      );
  };

  BryanStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  BryanStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  BryanStorage.prototype.putAttachment = function (id, name, data) {

    // Save pointer to substorage for use in nested function
    var substorage = this._sub_storage;

    // First, get document metadata to update "_revision"
    return this.get(id, name)

      // Increment "_revision" parameter in document
      .push(function (metadata) {
        var new_metadata = metadata;

        // "_revision" is guaranteed to exist since the document already exists
        new_metadata._revision = metadata._revision + 1;
        return substorage.put(id, new_metadata);
      })

      // After metadata updates successfully, perform putAttachment
      .push(function () {
        return substorage.putAttachment(id, name, data);
      });
  };

  BryanStorage.prototype.removeAttachment = function (id, name) {

    // Save pointer to substorage for use in nested function
    var substorage = this._sub_storage;

    // First, get document metadata to update "_revision"
    return this.get(id, name)

      // Increment "_revision" parameter in document
      .push(function (metadata) {
        var new_metadata = metadata;

        // "_revision" is guaranteed to exist since the document already exists
        new_metadata._revision = metadata._revision + 1;
        return substorage.put(id, new_metadata);
      })

      // After metadata updates successfully, perform removeAttachment
      .push(function () {
        return substorage.removeAttachment(id, name);
      });
  };

  // Not implemented for IndexedDB
  BryanStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };
  BryanStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.removeAttachment.apply(this._sub_storage, name);
  };
  BryanStorage.prototype.buildQuery = function (options) {
    return this._sub_storage.removeAttachment.apply(this._sub_storage, options);
  };

  jIO.addStorage('bryan', BryanStorage);

}(jIO));
