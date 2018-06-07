/*jslint nomen: true*/
/*global RSVP, jiodate*/
(function (jIO) {
  "use strict";

  // Used to distinguish between operations done within the same millisecond
  var unique_timestamp = function () {

    // XXX: replace this with UUIDStorage function call to S4() when it becomes
    // publicly accessible
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
    this._lastseen = undefined;
  }

  BryanStorage.prototype.get = function (id_in, revision) {

    // Default behavior, get() returns the most recent revision
    if (revision === undefined) {
      revision = {
        steps: 0,
        path: "absolute"
      };
    }

    // Default type of traversal is absolute:
    // "absolute" -- step backward in chronological order of changes to document
    // "consistent" -- step backward in chronological order of only edits the
    //    most recent version is based on.  Other branches of edits are ignored
    if (revision.path === undefined) {
      revision.path = "absolute";
    }

    // Query to get the last edit made to this document
    var storage = this,
      substorage = this._sub_storage,
      options = {
        query: "doc_id: " + id_in,
        sort_on: [["timestamp", "descending"]]
      };

    // In "absolute" path, .get returns the revision.steps-most-recent revision
    if (revision.path === "absolute") {
      options.limit = [revision.steps, 1];

    // In "consistent path, .get returns the most recent revision and looks 
    // deeper into history with the result's .lastseen attribute
    } else if (revision.path === "consistent") {
      options.limit = [0, 1];
    }
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

        // Function used to chain together substorage.get's for "consistent"
        // traversal
        function recurse_get(result) {
          if (result.lastseen === undefined) {
            throw new jIO.util.jIOError(
              "bryanstorage: cannot find object '" +
                id_in +
                "' (end of history)",
              404
            );
          }
          return substorage.get(result.lastseen);
        }

        // If last edit was a remove, throw a 'not found' error
        if (result.op === "remove" && revision.path === "absolute") {
          throw new jIO.util.jIOError(
            "bryanstorage: cannot find object '" + id_in + "' (removed)",
            404
          );
        }

        if (result.op === "put") {

          // The query for "absolute" traversal returns exactly the document
          // requested
          if (revision.path === "absolute" || revision.steps === 0) {
            storage._lastseen = result.timestamp;
            return result.doc;
          }
          if (revision.path === "consistent") {


            // Chain together promises to access history of document
            var promise = substorage.get(result.lastseen);
            while (revision.steps > 1) {
              promise = promise.push(recurse_get);
              revision.steps -= 1;
            }

            // Once at desired depth, update storage._lastseen and return doc
            return promise.push(function (result) {
              storage._lastseen = result.timestamp;
              if (result.op === "remove") {
                throw new jIO.util.jIOError(
                  "bryanstorage: cannot find object '" +
                    result.doc_id +
                    "' (removed)",
                  404
                );
              }
              return result.doc;
            });
          }
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
        op: "put",
        lastseen: this._lastseen
      };
    this._lastseen = timestamp;
    //console.log(metadata.doc.k, timestamp, metadata.lastseen);
    return this._sub_storage.put(timestamp, metadata);
  };

  BryanStorage.prototype.remove = function (id) {
    var timestamp = unique_timestamp(),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        op: "remove",
        lastseen: this._lastseen
      };
    this._lastseen = timestamp;
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