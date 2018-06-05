/*jslint nomen: true*/
/*global RSVP, jiodate*/
(function (jIO) {
  "use strict";

  // Metadata keys included for internal revisioning, but not shown to user
  //var _revision_metadata = ["_revision", "_doc_id"];

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
    return this._sub_storage.get(id_in);
  };

  BryanStorage.prototype.post = function (metadata) {
    // Uses UuidStorage post
    return this._sub_storage.post(metadata);
  };

  BryanStorage.prototype.put = function (id, new_metadata) {
    var storage = this,
      substorage = this._sub_storage,
      previous_data;

    return this._sub_storage.get(id)
      .push(function (latest_data) {

        // Prepare to post the current doc as a deprecated version
        previous_data = latest_data;
        previous_data._deprecated = "true";
        previous_data._doc_id = id;

        // Get most recent deprecated version's _revision attribute
        var options = {
          query: '(_doc_id: "' + id + '")',
          sort_on: [['_revision', 'descending']],
          limit: [0, 1]
        };
        //return substorage.buildQuery(options);
        return substorage.allDocs(options);

      })
      .push(function (query_results) {
        if (query_results.data.rows.length > 0) {
          var doc_id = query_results.data.rows[0].id;
          return substorage.get(doc_id);
        }
        throw new jIO.util.jIOError(
          "bryanstorage: query returned no results.'",
          404
        );
      })
      .push(function (doc) {
        previous_data._revision = doc._revision + 1;
        return storage.post(previous_data);
      },
        function () {
          // If the query turned up no results, 
          // there was exactly 1 version previously.
          if (previous_data !== undefined) {
            previous_data._revision = 0;
            return storage.post(previous_data);
          }
        })
      // No matter what happened, need to put new document in
      .push(function () {
        return substorage.put(id, new_metadata);
      });
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
  BryanStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  BryanStorage.prototype.buildQuery = function (options) {
    if (options === undefined) {
      options = {query: ""};
    }
    if (options.query !== "") {
      options.query = "(" + options.query + ") AND ";
    }
    options.query = options.query + 'NOT (_deprecated: "true")';
    return this._sub_storage.buildQuery(options);
  };

  jIO.addStorage('bryan', BryanStorage);

}(jIO));