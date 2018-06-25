/*jslint nomen: true*/
/*global RSVP, SimpleQuery, ComplexQuery*/
(function (jIO, RSVP, SimpleQuery, ComplexQuery) {
  "use strict";

  // Used to distinguish between operations done within the same millisecond
  var unique_timestamp = function (time) {

    // XXX: replace this with UUIDStorage function call to S4() when it becomes
    // publicly accessible
    var uuid = ('0000' + Math.floor(Math.random() * 0x10000)
      .toString(16)).slice(-4),
      //timestamp = Date.now().toString();
      timestamp = time.toString();
    return timestamp + "-" + uuid;
  },
    looks_like_timestamp = function (id) {
      //1529928772623-02e6
      //A timestamp is of the form 
      //"[13 digit number]-[4 numbers/lowercase letters]"
      var re = /^[0-9]{13}-[a-z0-9]{4}$/;
      return re.test(id);
    };


  /**
   * The jIO HistoryStorage extension
   *
   * @class HistoryStorage
   * @constructor
   */
  function HistoryStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._timestamps = {};
  }

  HistoryStorage.prototype.get = function (id_in) {

    // Query to get the last edit made to this document
    var substorage = this._sub_storage,

      // Include id_in as value in query object for safety
      metadata_query = new ComplexQuery({
        operator: "AND",
        query_list: [
          new SimpleQuery({key: "doc_id", value: id_in}),
          new ComplexQuery({
            operator: "OR",
            query_list: [
              new SimpleQuery({key: "op", value: "remove"}),
              new SimpleQuery({key: "op", value: "put"})
            ]
          })
        ]
      }),
      options = {
        query: metadata_query,
        select_list: ["op"],
        limit: [0, 1],
        sort_on: [["timestamp", "descending"]]
      };
    return substorage.allDocs(options)
      .push(function (results) {
        if (results.data.rows.length > 0) {
          if (results.data.rows[0].value.op === "put") {
            return substorage.get(results.data.rows[0].id)
              .push(function (result) {
                return result.doc;
              }, function (error) {
                if (error.status_code === 400 &&
                    error instanceof jIO.util.jIOError) {
                  throw new jIO.util.jIOError(
                    "HistoryStorage: cannot find object '" + id_in +
                      "'",
                    404
                  );
                }
              });
          }
          throw new jIO.util.jIOError(
            "HistoryStorage: cannot find object '" + id_in + "' (removed)",
            404
          );
        }
        // Try again by treating id_in as a timestamp instead of a name
        return substorage.get(id_in)
          .push(function (result) {
            if (result.op === "put") {
              return result.doc;
            }
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id_in +
                "' (removed)",
              404
            );
          }, function (error) {
            if (error.status_code === 400 &&
                error instanceof jIO.util.jIOError) {
              throw new jIO.util.jIOError(
                "HistoryStorage: cannot find object '" + id_in + "'",
                404
              );
            }
          });
      });
  };

  HistoryStorage.prototype.put = function (id, data) {
    if (data.hasOwnProperty("_timestamp")) {
      throw new jIO.util.jIOError(
        "Document cannot have metadata attribute '_timestamp'",
        422
      );
    }
    if (data.hasOwnProperty("_doc_id")) {
      throw new jIO.util.jIOError(
        "Document cannot have metadata attribute '_doc_id'",
        422
      );
    }
    if (looks_like_timestamp(id)) {
      throw new jIO.util.jIOError(
        "Document cannot have id of the same form as a timestamp",
        422
      );
    }
    var timestamp = unique_timestamp(Date.now()),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        doc: data,
        op: "put"
      };
    if (this._timestamps.hasOwnProperty(id)) {
      this._timestamps[id].push(timestamp);
    } else {
      this._timestamps[id] = [timestamp];
    }
    return this._sub_storage.put(timestamp, metadata);
  };

  HistoryStorage.prototype.remove = function (id) {
    var timestamp = unique_timestamp(Date.now() - 1),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        op: "remove"
      };
    this._timestamps[id].push(timestamp);
    return this._sub_storage.put(timestamp, metadata);
  };

  HistoryStorage.prototype.allAttachments = function (id) {
    // XXX: If instead you passed a timestamp in as `id`, we could retrieve all
    // the attachments of the document at that point in time.  Not sure if this
    // would be useful.
    var substorage = this._sub_storage,
      // Include id as value in query object for safety (as opposed to string
      // concatenation)
      query_obj = new ComplexQuery({
        operator: "AND",
        query_list: [
          new SimpleQuery({key: "doc_id", value: id}),
          new ComplexQuery({
            operator: "OR",
            query_list: [
              new SimpleQuery({key: "op", value: "putAttachment"}),
              new SimpleQuery({key: "op", value: "removeAttachment"})
            ]
          })
        ]
      }),

      // Only query for attachment edits
      options = {
        query: query_obj,
        sort_on: [["timestamp", "descending"]],
        select_list: ["op", "timestamp", "name"]
      };
    return this._sub_storage.allDocs(options)
      .push(function (results) {
        var seen = {},
          attachments = [],
          attachment_promises = [],
          ind,
          entry;
        attachments = results.data.rows.filter(function (docum) {
          if (!seen.hasOwnProperty(docum.value.name)) {
            var output = (docum.value.op === "putAttachment");
            seen[docum.value.name] = {};
            return output;
          }
        });
        for (ind = 0; ind < attachments.length; ind += 1) {
          entry = attachments[ind];
          attachment_promises[entry.value.name] =
            substorage.getAttachment(entry.id, entry.value.name);
        }
        return RSVP.hash(attachment_promises);
      });
  };

  HistoryStorage.prototype.putAttachment = function (id, name, blob) {
    var timestamp = unique_timestamp(Date.now()),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        name: name,
        op: "putAttachment"
      },
      substorage = this._sub_storage;
    if (this._timestamps[id].hasOwnProperty(name)) {
      this._timestamps[id][name].push(timestamp);
    } else {
      this._timestamps[id][name] = [timestamp];
    }
    return this._sub_storage.put(timestamp, metadata)
      .push(function () {
        return substorage.putAttachment(timestamp, name, blob);
      });
  };

  HistoryStorage.prototype.getAttachment = function (id, name) {

    // Query to get the last edit made to this document
    var substorage = this._sub_storage,

      // Include id_in as value in query object for safety
      // "doc_id: id AND
      //  (op: remove OR ((op: putAttachment OR op: removeAttachment) AND
      //  name: name))"
      metadata_query = new ComplexQuery({
        operator: "AND",
        query_list: [
          new SimpleQuery({key: "doc_id", value: id}),
          new ComplexQuery({
            operator: "OR",
            query_list: [
              new SimpleQuery({key: "op", value: "remove"}),
              new ComplexQuery({
                operator: "AND",
                query_list: [
                  new ComplexQuery({
                    operator: "OR",
                    query_list: [
                      new SimpleQuery({key: "op", value: "putAttachment"}),
                      new SimpleQuery({key: "op", value: "removeAttachment"})
                    ]
                  }),
                  new SimpleQuery({key: "name", value: name})
                ]
              })
            ]
          })
        ]
      }),
      options = {
        query: metadata_query,
        sort_on: [["timestamp", "descending"]],
        limit: [0, 1],
        select_list: ["op", "name"]
      };
    return substorage.allDocs(options)
      .push(function (results) {
        if (results.data.rows.length > 0) {
          if (results.data.rows[0].value.op === "remove" ||
              results.data.rows[0].value.op === "removeAttachment") {
            throw new jIO.util.jIOError(
              "HistoryStorage: cannot find object '" + id + "' (removed)",
              404
            );
          }
          return substorage.getAttachment(results.data.rows[0].id, name)
            .push(undefined, function (error) {
              if (error.status_code === 404 &&
                  error instanceof jIO.util.jIOError) {
                throw new jIO.util.jIOError(
                  "HistoryStorage: cannot find object '" + id + "'",
                  404
                );
              }
              throw error;
            });
        }
        return substorage.getAttachment(id, name)
          .push(undefined, function (error) {
            if (error.status_code === 404 &&
                error instanceof jIO.util.jIOError) {
              throw new jIO.util.jIOError(
                "HistoryStorage: cannot find object '" + id + "'",
                404
              );
            }
            throw error;
          });
      });
  };

  HistoryStorage.prototype.removeAttachment = function (id, name) {
    var timestamp = unique_timestamp(Date.now()),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        name: name,
        op: "removeAttachment"
      };
    this._timestamps[id][name].push(timestamp);
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

    if (query_obj instanceof ComplexQuery) {
      query_stack.push(query_obj);
    } else {
      rev_query = (query_obj.key === "_timestamp");
    }
    // Traverse through query tree to find mentions of _timestamp
    // and stop as soon as it is found once
    while (query_stack.length > 0 && (!rev_query)) {
      query_obj = query_stack.pop();
      for (ind = 0; ind < query_obj.query_list.length; ind += 1) {
        if (query_obj.query_list[ind].hasOwnProperty("query_list")) {
          query_stack.push(query_obj.query_list[ind]);
        } else if (query_obj.query_list[ind].key === "_timestamp") {
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
        var seen = {},
          query_matches,
          docs_to_query;
        // If !rev_query, then by default only consider latest revisions of 
        // documents
        results = results.filter(function (docum) {
          if (rev_query) {
            return docum.op === "put";
          }
          if (!seen.hasOwnProperty(docum.doc_id)) {
            seen[docum.doc_id] = {};
            return docum.op === "put";
          }
          return false;
        });
        docs_to_query = results.map(function (docum) {
          // If it's a "remove" operation
          if (!docum.hasOwnProperty("doc")) {
            docum.doc = {};
          }
          docum.doc._doc_id = docum.doc_id;
          docum.doc._timestamp = docum.timestamp;
          return docum.doc;
        });
        options.select_list.push("_doc_id");
        query_matches = options.query.exec(docs_to_query, options);
        return query_matches;
      })
        // Format the results of the query, and return
        .push(function (query_matches) {
        return query_matches.map(function (docum) {
          var doc_id = docum._doc_id;
          delete docum._timestamp;
          delete docum._doc_id;
          return {
            doc: {},
            value: docum,
            id: doc_id
          };
        });
      });
  };

  jIO.addStorage('history', HistoryStorage);

}(jIO, RSVP, SimpleQuery, ComplexQuery));