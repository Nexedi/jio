/*jslint nomen: true*/
/*global RSVP*/
(function (jIO, RSVP) {
  "use strict";

  // Used to distinguish between operations done within the same millisecond
  var unique_timestamp = function () {

    // XXX: replace this with UUIDStorage function call to S4() when it becomes
    // publicly accessible
    var uuid = ('0000' + Math.floor(Math.random() * 0x10000)
      .toString(16)).slice(-4),
      timestamp = Date.now().toString();
    return timestamp + "-" + uuid;
  },
    // Helper function for getAttachment
    findAttachment = function (substorage, name, metadata_query, steps) {
      var options = {
        query: metadata_query,
        sort_on: [["timestamp", "descending"], ["op", "ascending"]],
        select_list: ["op", "name"]
      };
      return substorage.allDocs(options)
        .push(function (results) {
          var ind,
            id = metadata_query.value,
            count = 0;
          // At the least, a document needs to have been put and an attachment
          // needs to have been put
          if (results.data.rows.length > 1) {
            for (ind = 0; ind < results.data.rows.length; ind += 1) {

              // Cannot get the attachment of a removed document
              if (results.data.rows[ind].value.op === "remove") {
                throw new jIO.util.jIOError(
                  "HistoryStorage: cannot find attachment '" + name +
                      "' of object '" + id + "' (removed)",
                  404
                );
              }

              // Make sure to get the correct revision of the attachment
              // and throw 404 error if it was removed
              if (results.data.rows[ind].value.name === name) {
                if (count === steps) {
                  if (results.data.rows[ind].value.op === "removeAttachment") {
                    throw new jIO.util.jIOError(
                      "HistoryStorage: cannot find attachment '" + name +
                          "' of object '" + id + "' (removed)",
                      404
                    );
                  }
                  return substorage.getAttachment(
                    results.data.rows[ind].id,
                    name
                  );
                }
                count += 1;
              }
            }
          }
          throw new jIO.util.jIOError(
            "HistoryStorage: cannot find attachment '" + name +
                  "' of object '" + id + "'",
            404
          );
        });
    },
    findDoc = function (substorage, metadata_query, steps) {
      var options = {
        query: metadata_query,
        sort_on: [["timestamp", "descending"]],
        select_list: ["op"],
        limit: [steps, 1]
      };
      return substorage.allDocs(options)
        .push(function (results) {
          var id_in = metadata_query.query_list[0].value;
          if (results.data.rows.length > 0) {
            if (results.data.rows[0].value.op === "put") {
              return substorage.get(results.data.rows[0].id)
                .push(function (result) {
                  return result.doc;
                });
            }
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id_in + "' (removed)",
              404
            );
          }
          throw new jIO.util.jIOError(
            "HistoryStorage: cannot find object '" + id_in + "'",
            404
          );
        });
    };


  /**
   * The jIO HistoryStorage extension
   *
   * @class HistoryStorage
   * @constructor
   */
  function HistoryStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  HistoryStorage.prototype.get = function (id_in) {

    // Query to get the last edit made to this document
    var substorage = this._sub_storage,
      metadata_query;

    // Include id_in as value in query object for safety
    metadata_query = jIO.QueryFactory.create(
      "(doc_id: undefined) AND ((op: put) OR (op: remove))"
    );
    metadata_query.query_list[0].value = id_in;

    return findDoc(substorage, metadata_query, 0)
      .push(undefined,
        // If no documents returned in first query, check if the id is encoding
        // revision information
        function (error) {

          if (!(error instanceof jIO.util.jIOError) ||
              (error.status_code !== 404) ||
              (error.message !== "HistoryStorage: cannot find object '" +
                id_in + "'")) {
            throw error;
          }

          // "_-" is the revision signature used to indicate a previous revision
          var steps,
            steps_loc = id_in.lastIndexOf("_-");

          // If the revision signature '_-' is not contained in the id, then
          // the first findDoc call should have found the id if it exists
          if (steps_loc === -1) {
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id_in + "'",
              404
            );
          }

          // If revision signature is found, query storage based on this
          steps = Number(id_in.slice(steps_loc + 2));
          id_in = id_in.slice(0, steps_loc);
          metadata_query.query_list[0].value = id_in;
          return findDoc(substorage, metadata_query, steps);
        });
  };

  HistoryStorage.prototype.put = function (id, data) {
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

  HistoryStorage.prototype.remove = function (id) {
    var timestamp = unique_timestamp(),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        op: "remove"
      };
    return this._sub_storage.put(timestamp, metadata);
  };

  HistoryStorage.prototype.allAttachments = function (id) {
    // XXX: Do we need to be able to retrieve older revisions with 
    // allAttachments?

    var substorage = this._sub_storage,
      query_obj,
      options;

    // Include id as value in query object for safety (as opposed to string
    // concatenation)
    query_obj = jIO.QueryFactory.create(
      "(doc_id: undefined) AND ((op: putAttachment) OR (op: removeAttachment))"
    );
    query_obj.query_list[0].value = id;

    // Only query for attachment edits
    options = {
      query: query_obj,
      sort_on: [["timestamp", "descending"]]
    };
    return this._sub_storage.allDocs(options)
      .push(function (results) {
        var promises = results.data.rows.map(function (data) {
            return substorage.get(data.id);
          });
        return RSVP.all(promises);
      })
      .push(function (results) {
        var seen = {},
          attachments = {},
          ind,
          doc;
        // Only include attachments whose most recent edit is a putAttachment
        // (and not a removeAttachment)
        for (ind = 0; ind < results.length; ind += 1) {
          doc = results[ind];
          if (!seen.hasOwnProperty(doc.name)) {
            if (doc.op === "putAttachment") {
              attachments[doc.name] = {};
            }
            seen[doc.name] = {};
          }
        }
        return attachments;
      });
  };

  HistoryStorage.prototype.putAttachment = function (id, name, blob) {
    var timestamp = unique_timestamp(),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        name: name,
        op: "putAttachment"
      },
      substorage = this._sub_storage;
    return this._sub_storage.put(timestamp, metadata)
      .push(function () {
        return substorage.putAttachment(timestamp, name, blob);
      });
  };

  HistoryStorage.prototype.getAttachment = function (id, name) {

    // Query to get the last edit made to this document
    var substorage = this._sub_storage,
      metadata_query;

    // Include id_in as value in query object for safety
    metadata_query = jIO.QueryFactory.create(
      "(doc_id: undefined)"
    );
    metadata_query.value = id;
    return findAttachment(substorage, name, metadata_query, 0)
      .push(undefined,

        // If no documents returned in first query, check if the id is encoding
        // revision information
        function (error) {

          if (!(error instanceof jIO.util.jIOError) ||
              (error.status_code !== 404) ||
              (error.message !== "HistoryStorage: cannot find attachment '" +
                  name + "' of object '" + id + "'")) {
            throw error;
          }

          var steps,
            steps_loc = name.lastIndexOf("_-");

          // If revision signature is not in id_in, than return 404, since id
          // is not found
          if (steps_loc === -1) {
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find attachment '" + name +
                "' of object '" + id + "'",
              404
            );
          }

          // If revision signature is found, query storage based on this
          steps = Number(name.slice(steps_loc + 2));
          name = name.slice(0, steps_loc);
          return findAttachment(substorage, name, metadata_query, steps);
        });
  };

  HistoryStorage.prototype.removeAttachment = function (id, name) {
    var timestamp = unique_timestamp(),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        name: name,
        op: "removeAttachment"
      };
    return this._sub_storage.put(timestamp, metadata);
  };
  HistoryStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };
  HistoryStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  HistoryStorage.prototype.buildQuery = function (options) {
    // Set default values
    if (options === undefined) {
      options = {};
    }
    if (options.query === undefined) {
      options.query = "";
    }
    if (options.sort_on === undefined) {
      options.sort_on = [];
    }
    if (options.select_list === undefined) {
      options.select_list = [];
    }
    options.sort_on.push(["timestamp", "descending"]);
    options.query = jIO.QueryFactory.create(options.query);
    var meta_options,
      substorage = this._sub_storage,

    // Check if query involved _REVISION.  If not, we will later place a 
    // (*) AND (_REVISION: =0) as the default handling of revisions
      rev_query = false,
      query_obj = options.query,
      query_stack = [],
      ind;
    if (query_obj.hasOwnProperty("query_list")) {
      query_stack.push(query_obj);
    } else {
      rev_query = (query_obj.key === "_REVISION");
    }
    // Traverse through query tree to find mentions of _REVISION
    // and stop as soon as it is found once
    while (query_stack.length > 0 && (!rev_query)) {
      query_obj = query_stack.pop();
      for (ind = 0; ind < query_obj.query_list.length; ind += 1) {
        if (query_obj.query_list[ind].hasOwnProperty("query_list")) {
          query_stack.push(query_obj.query_list[ind]);
        } else if (query_obj.query_list[ind].key === "_REVISION") {
          rev_query = true;
          break;
        }
      }
    }

    // Query for all edits putting or removing documents (and nothing about
    // attachments)
    meta_options = {
      query: "(op: remove) OR (op: put)",
      sort_on: options.sort_on
    };
    return this._sub_storage.allDocs(meta_options)

      // Get all documents found in query
      // XXX: Once include_docs is implemented, this step can be simplified
      .push(function (results) {
        var promises = results.data.rows.map(function (data) {
          return substorage.get(data.id);
        });
        return RSVP.all(promises);
      })

      .push(function (results) {
        // Label all documents with their current revision status
        var docum,
          revision_tracker = {},
          latest_rev_query,
          results_reduced;
        for (ind = 0; ind < results.length; ind += 1) {
          docum = results[ind];
          if (revision_tracker.hasOwnProperty(docum.doc_id)) {
            revision_tracker[docum.doc_id] += 1;
          } else {
            revision_tracker[docum.doc_id] = 0;
          }
          if (docum.op === "remove") {
            docum.doc = {};
          }

          // Add op and _REVISION to the docum.doc (temporarily) so the
          // document can be matched manually with the inputted query
          results[ind].doc._REVISION = revision_tracker[docum.doc_id];
          results[ind].doc.op = docum.op;
        }

        // Create a new query to only get non-removed revisions and abide by
        // whatever the inputted query says
        latest_rev_query = jIO.QueryFactory.create(
          "(_REVISION: >= 0) AND (op: put)"
        );

        // If query does not use _REVISION, then by default set _REVISION := 0
        if (rev_query) {
          latest_rev_query.query_list[0] = options.query;
        } else {
          latest_rev_query.query_list[0] = jIO.QueryFactory.create(
            "(_REVISION: = 0)"
          );

          // Check if options.query is nonempty
          if (options.query.type === "simple" ||
              options.query.type === "complex") {
            latest_rev_query.query_list.push(options.query);
          }
        }
        //return results
        results_reduced = results
          // Only return results which match latest_rev_query
          .filter(function (docum) {
            var filtered_res = latest_rev_query.match(docum.doc);

            // Remove extra metadata used in revision query
            delete docum.doc.op;
            delete docum.doc._REVISION;
            return filtered_res;
          });
        return results_reduced

          // Only return the correct range of valid results specified by
          // options.limit
          .filter(function (doc, ind) {
            if (doc && options.hasOwnProperty("limit")) {
              return (ind >= options.limit[0] &&
                options.limit[1] + options.limit[0] > ind);
            }
            return true;
          })

          // Return certain attributes in .val as specified by
          // options.select_list
          .map(function (current_doc) {
            var val = {},
              ind,
              key;
            for (ind = 0; ind < options.select_list.length; ind += 1) {
              key = options.select_list[ind];
              if (current_doc.doc.hasOwnProperty(key)) {
                val[key] = current_doc.doc[key];
              }
            }
            // Format results to be expected output of allDocs
            return {
              doc: current_doc.doc,
              value: val,
              id: current_doc.doc_id
            };
          });
      });
  };

  jIO.addStorage('history', HistoryStorage);

}(jIO, RSVP));