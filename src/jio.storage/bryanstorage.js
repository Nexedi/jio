/*jslint nomen: true*/
/*global RSVP, jiodate*/
(function (jIO) {
  "use strict";

  var unique_timestamp = function () {
    // Used to distinguish between operations done within the same millisecond
    var uuid = ('0000' + Math.floor(Math.random() * 0x10000)
      .toString(16)).slice(-4),
      timestamp = Date.now().toString();
    return timestamp + "-" + uuid;
  };

  /**
   * The jIO BryanStorage extension
   *
   * @class BryanStorage
   * @constructor
   */
  function BryanStorage(spec) {

    this._sub_storage = jIO.createJIO({
      type: "query",
      sub_storage: spec.sub_storage
    });
  }

  BryanStorage.prototype.get = function (id_in) {

    // Query to get the last edit made to this document
    var substorage = this._sub_storage,
      options = {
        query: "doc_id: " + id_in,
        sort_on: [["timestamp", "descending"]],
        limit: [0, 1]
      };
    return substorage.allDocs(options)
      .push(function (results) {
        if (results.data.rows.length > 0) {
          return substorage.get(results.data.rows[0].id);
        }
        throw new jIO.util.jIOError(
          "bryanstorage: cannot find object '" + id_in + "'",
          404
        );
      })
      .push(function (result) {
        // If last edit was a remove, throw a 'not found' error
        if (result.op === "remove") {
          throw new jIO.util.jIOError(
            "bryanstorage: cannot find object '" + id_in + "' (removed)",
            404
          );
        }
        // If last edit was a put, return the document data
        if (result.op === "put") {
          return result.doc;
        }
      });
  };

  BryanStorage.prototype.post = function (metadata) {
    return this._sub_storage.post(metadata);
  };

  BryanStorage.prototype.put = function (id, data) {
    var timestamp = unique_timestamp(),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        doc: data,
        op: "put"
      };
    return this._sub_storage.put(timestamp, metadata);
  };

  BryanStorage.prototype.remove = function (id) {
    var timestamp = unique_timestamp(),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        op: "remove"
      };
    return this._sub_storage.put(timestamp, metadata);
  };

  BryanStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
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
  BryanStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  BryanStorage.prototype.buildQuery = function (options) {
    return this._sub_storage.buildQuery(options);
  };

  jIO.addStorage('bryan', BryanStorage);

}(jIO));