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

  BryanStorage.prototype.get = function (id_in) {
    var options = {
      //query: 'id: "' + id_in + '"',
      //sort_on: [['_revision', 'descending']],
      //id: "tmp",
      include_docs: true
    };
    return this._sub_storage.allDocs(options)

      // Return document with most recent revision
      .push(function (results) {
        //<0 => a < b
        var sorted_results = results.data.rows.sort(function (a, b) {
          if (b.doc.id !== id_in || !b) {return -1; }
          if (a.doc.id !== id_in || !a) {return 1; }
          return b.doc._revision - a.doc._revision;
        });
        if (sorted_results.length > 0 && sorted_results[0].doc.id === id_in) {
          return sorted_results[0].doc;
        }
        return [];
      });
  };


  // Not implemented for IndexedDB
  BryanStorage.prototype.post = function (metadata) {

    function S4() {
      return ('0000' + Math.floor(
        Math.random() * 0x10000 // 65536
      ).toString(16)).slice(-4);
    }
    var id = S4() + S4() + "-" +
        S4() + "-" +
        S4() + "-" +
        S4() + "-" +
        S4() + S4() + S4();

    return this._sub_storage.put(id, metadata);
  };

  BryanStorage.prototype.put = function (id, new_metadata) {
    var storage = this;
    new_metadata.id = id;
    return storage.get(id)
      .push(
        function (metadata) {

          // Increments existing "_revision" attribute
          if (metadata.hasOwnProperty('_revision')) {
            new_metadata._revision = metadata._revision + 1;
          } else {
            new_metadata._revision = 0;
          }
          //return storage.post.apply(substorage, new_metadata);
          return storage.post(new_metadata);
        },
        function () {
          // Creates new attribute "_revision" = 0
          new_metadata._revision = 0;
          return storage.post(new_metadata);
        }
      );
  };

  BryanStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
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
  BryanStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
  };

  jIO.addStorage('bryan', BryanStorage);

}(jIO));
