/*jslint nomen: true*/
/*global RSVP, jiodate*/
(function (jIO) {
  "use strict";

  //local mod/frozen remote
  //local del/remote mod

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
   * The jIO HistoryStorage extension
   *
   * @class HistoryStorage
   * @constructor
   */
  function HistoryStorage(spec) {

    this._sub_storage = jIO.createJIO({
      type: "query",
      sub_storage: spec.sub_storage
    });
  }

  HistoryStorage.prototype.get = function (id_in) {

    // Query to get the last edit made to this document
    var substorage = this._sub_storage,
      metadata_query = function (id) {
        return "doc_id: " + id + " AND ((op: put) OR (op: remove))";
      },
      options = {
        query: metadata_query(id_in),
        sort_on: [["timestamp", "descending"]],
        limit: [0, 1]
      };

    return substorage.allDocs(options)
      .push(function (results) {
        if (results.data.rows.length > 0) {
          return substorage.get(results.data.rows[0].id);
        }
        throw new jIO.util.jIOError(
          "HistoryStorage: cannot find object '" + id_in + "' (0)",
          404
        );
      })
      .push(function (result) {
        if (result.op === "put") {
          return result.doc;
        }
        throw new jIO.util.jIOError(
          "HistoryStorage: cannot find object '" + id_in + "' (removed)",
          404
        );

      // If no documents returned in first query, check if the id is encoding
      // revision information
      }, function () {
        var steps,
          steps_loc = id_in.lastIndexOf("_-");
        // If revision signature is not in id_in, than return 404, since id
        // is not found
        if (steps_loc === -1) {
          throw new jIO.util.jIOError(
            "HistoryStorage: cannot find object '" + id_in + "' (1)",
            404
          );
        }

        // If revision signature is found, query storage based on this
        steps = Number(id_in.slice(steps_loc + 2));
        id_in = id_in.slice(0, steps_loc);
        options = {
          query: metadata_query(id_in),
          sort_on: [["timestamp", "descending"]],
          limit: [steps, 1]
        };
        return substorage.allDocs(options)
          .push(function (results) {
            if (results.data.rows.length > 0) {
              return substorage.get(results.data.rows[0].id);
            }
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id_in + "' (2)",
              404
            );
          })
          .push(function (result) {
            if (result.op === "put") {
              return result.doc;
            }
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id_in +
                "' (removed) (1)",
              404
            );
          });
      });
  };

  HistoryStorage.prototype.post = function (metadata) {
    return this._sub_storage.post(metadata);
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
    var substorage = this._sub_storage,
      options = {
        query: "(doc_id: " + id + ") AND " +
          "((op: putAttachment) OR (op: removeAttachment))",
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
      metadata_query = function (id) {
        return "(doc_id: " + id +
          ") AND (name: " + name +
          ") AND ((op: putAttachment) OR (op: removeAttachment))";
      },
      options = {
        query: metadata_query(id),
        sort_on: [["timestamp", "descending"]],
        limit: [0, 1]
      };
    return substorage.allDocs(options)
      .push(function (results) {
        if (results.data.rows.length > 0) {
          return substorage.get(results.data.rows[0].id);
        }
        throw new jIO.util.jIOError(
          "HistoryStorage: cannot find object '" + id + "' (0)",
          404
        );
      })
      .push(function (result) {
        if (result.op === "putAttachment") {
          return substorage.getAttachment(result.timestamp, result.name);
          //return result.blob;
        }
        throw new jIO.util.jIOError(
          "HistoryStorage: cannot find object '" + id + "' (removed)",
          404
        );

      // If no documents returned in first query, check if the id is encoding
      // revision information
      }, function () {
        var steps,
          steps_loc = id.lastIndexOf("_-");
        // If revision signature is not in id_in, than return 404, since id
        // is not found
        if (steps_loc === -1) {
          throw new jIO.util.jIOError(
            "HistoryStorage: cannot find object '" + id + "' (1)",
            404
          );
        }

        // If revision signature is found, query storage based on this
        steps = Number(id.slice(steps_loc + 2));
        id = id.slice(0, steps_loc);
        options = {
          query: metadata_query(id),
          sort_on: [["timestamp", "descending"]],
          limit: [steps, 1]
        };
        return substorage.allDocs(options)
          .push(function (results) {
            if (results.data.rows.length > 0) {
              return substorage.get(results.data.rows[0].id);
            }
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id + "' (2)",
              404
            );
          })
          .push(function (result) {
            if (result.op === "putAttachment") {
              return substorage.getAttachment(result.timestamp, result.name);
              //return result.blob;
            }
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id + "' (removed) (1)",
              404
            );
          });
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
    if (options.message === "give all docs") {
      return this._sub_storage.allDocs(options.opts);
    }
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
    var meta_options = {
        // XXX: I don't believe it's currently possible to query on 
        // sub-attributes so for now, we just use the inputted query, which 
        // obviously will fail
        //query: "",//(op: put) OR (op: remove)",

        // XXX: same here, we cannot sort correctly because we cannot access
        // attributes of doc
        query: "(op: remove) OR (op: put)",
        sort_on: options.sort_on
      },
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

    return this._sub_storage.allDocs(meta_options)

      // Get all documents found in query
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
          results[ind].doc._REVISION = revision_tracker[docum.doc_id];
          results[ind].doc.op = docum.op;
        }

        // Create a new query to only get non-removed revisions and abide by
        // whatever the inputted query says
        latest_rev_query = jIO.QueryFactory.create(
          "(_REVISION: >= 0) AND (op: put)"
        );
        if (rev_query) {
          latest_rev_query.query_list[0] = options.query;
        } else {
          latest_rev_query.query_list[0] = jIO.QueryFactory.create(
            "(_REVISION: = 0)"
          );
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

          // Format results to be expected output of allDocs
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
            return {
              doc: current_doc.doc,
              value: val,
              id: current_doc.doc_id
            };
          });
      });
  };

  jIO.addStorage('history', HistoryStorage);

}(jIO));