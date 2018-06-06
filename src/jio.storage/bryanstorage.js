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

      // Decide return based on last edit type
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
    if (options.sort_on === undefined) {
      options.sort_on = [];
    }
    if (options.limit === undefined) {
      options.limit = [0, -1];
    }
    options.sort_on.push(["timestamp", "descending"]);
    var meta_options = {
      // XXX: I don't believe it's currently possible to query on sub-attributes
      // so for now, we just use the inputted query, which obviously will fail
      query: options.query,

      // XXX: same here, we cannot sort correctly because we cannot access
      // attributes of doc
      sort_on: options.sort_on
    },
      substorage = this._sub_storage,
      max_num_docs = options.limit[1],
      first_doc = options.limit[0];

    return this._sub_storage.allDocs(meta_options)
      .push(function (results) {
        var promises = results.data.rows.map(function (data) {
          return substorage.get(data.id);
        });
        return RSVP.all(promises);
      })
      .push(function (results_array) {
        var clean_data = [],
          ind,
          seen_docs = [],
          current_doc,
          counter = 0;
        if (max_num_docs === -1) {
          max_num_docs = results_array.length;
        }
        for (ind = 0; ind < results_array.length; ind += 1) {
          current_doc = results_array[ind];

          // If the latest version of this document has not yet been 
          // included in query result
          if (seen_docs[current_doc.doc_id] !== true) {

            // If the latest edit was a put operation, add it to query 
            // results
            if (current_doc.op === "put") {
              if (counter >= first_doc) {
                clean_data.push({
                  doc: {},
                  value: {},
                  id: current_doc.doc_id
                });
                if (clean_data.length === max_num_docs) {
                  return clean_data;
                }
              }
              counter += 1;
            }
            // Mark document as read so no older edits are considered
            seen_docs[current_doc.doc_id] = true;
          }
        }
        // In passing results back to allDocs, formatting of query is handled
        return clean_data;
      });
  };

  jIO.addStorage('bryan', BryanStorage);

}(jIO));