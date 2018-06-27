/*jslint nomen: true*/
/*global RSVP, SimpleQuery, ComplexQuery*/
(function (jIO, RSVP, SimpleQuery, ComplexQuery) {
  "use strict";

  // Used to distinguish between operations done within the same millisecond
  function generateUniqueTimestamp(time) {

    // XXX: replace this with UUIDStorage function call to S4() when it becomes
    // publicly accessible
    var uuid = ('0000' + Math.floor(Math.random() * 0x10000)
      .toString(16)).slice(-4),
      //timestamp = Date.now().toString();
      timestamp = time.toString();
    return timestamp + "-" + uuid;
  }

  function isTimestamp(id) {
    //A timestamp is of the form 
    //"[13 digit number]-[4 numbers/lowercase letters]"
    var re = /^[0-9]{13}-[a-z0-9]{4}$/;
    return re.test(id);
  }

  function throwCantFindError(id) {
    throw new jIO.util.jIOError(
      "HistoryStorage: cannot find object '" + id + "'",
      404
    );
  }

  function throwRemovedError(id) {
    throw new jIO.util.jIOError(
      "HistoryStorage: cannot find object '" + id + "' (removed)",
      404
    );
  }

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

    if (isTimestamp(id_in)) {

      // Try to treat id_in as a timestamp instead of a name
      return this._sub_storage.get(id_in)
        .push(function (result) {
          if (result.op === "put") {
            return result.doc;
          }
          throwCantFindError(id_in);
        }, function (error) {
          if (error.status_code === 404 &&
              error instanceof jIO.util.jIOError) {
            throwRemovedError(id_in);
          }
          throw error;
        });
    }

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
              });
          }
          throwRemovedError(id_in);
        }
        throwCantFindError(id_in);
      });
  };

  HistoryStorage.prototype.put = function (id, data) {

    if (isTimestamp(id)) {
      throw new jIO.util.jIOError(
        "Document cannot have id of the same form as a timestamp",
        422
      );
    }
    var timestamp = generateUniqueTimestamp(Date.now()),
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
    var timestamp = generateUniqueTimestamp(Date.now() - 1),
      metadata = {
        // XXX: remove this attribute once query can sort_on id
        timestamp: timestamp,
        doc_id: id,
        op: "remove"
      };
    return this._sub_storage.put(timestamp, metadata);
  };

  HistoryStorage.prototype.allAttachments = function (id) {
    // XXX: allAttachments with timestamp:
    // should return all non-removed attachments at this point in time
    var substorage = this._sub_storage,
      query_obj,
      query_removed_check,
      options,
      query_doc_id,
      options_remcheck;

    if (isTimestamp(id)) {
      query_doc_id = new SimpleQuery({
        operator: "<=",
        key: "timestamp",
        value: id
      });
    } else {
      query_doc_id = new SimpleQuery({key: "doc_id", value: id});
    }

    query_removed_check = new ComplexQuery({
      operator: "AND",
      query_list: [
        query_doc_id,
        new ComplexQuery({
          operator: "OR",
          query_list: [
            new SimpleQuery({key: "op", value: "put"}),
            new SimpleQuery({key: "op", value: "remove"})
          ]
        })
      ]
    });

    query_obj = new ComplexQuery({
      operator: "AND",
      query_list: [
        query_doc_id,
        new ComplexQuery({
          operator: "OR",
          query_list: [
            new SimpleQuery({key: "op", value: "putAttachment"}),
            new SimpleQuery({key: "op", value: "removeAttachment"})
          ]
        })
      ]
    });


    options_remcheck = {
      query: query_removed_check,
      select_list: ["op", "timestamp"],
      //limit: [0, 1],
      sort_on: [["timestamp", "descending"]]
    };
    options = {
      query: query_obj,
      sort_on: [["timestamp", "descending"]],
      select_list: ["op", "name"]
    };

    return this._sub_storage.allDocs(options_remcheck)
      .push(function (results) {
        if (results.data.total_rows > 0) {
          if (results.data.rows[0].value.op === "remove") {
            throwRemovedError(id);
          }
        } else {
          throwCantFindError(id);
        }
      })
      .push(function () {
        return substorage.allDocs(options);
      })
      .push(function (results) {
        var seen = {},
          attachments = [],
          attachment_promises = [],
          ind,
          entry;
        // Only return attachments if:
        // (it is the most recent revision) AND (it is a putAttachment)
        attachments = results.data.rows.filter(function (docum) {
          if (!seen.hasOwnProperty(docum.value.name)) {
            var output = (docum.value.op === "putAttachment");
            seen[docum.value.name] = {};
            return output;
          }
        });
        // Assembles object of attachment_name: attachment_object
        for (ind = 0; ind < attachments.length; ind += 1) {
          entry = attachments[ind];
          attachment_promises[entry.value.name] =
            substorage.getAttachment(entry.id, entry.value.name);
        }

        return RSVP.hash(attachment_promises);
      });
  };

  HistoryStorage.prototype.putAttachment = function (id, name, blob) {
    var timestamp = generateUniqueTimestamp(Date.now()),
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

    if (isTimestamp(id)) {
      return this._sub_storage.getAttachment(id, name)
        .push(undefined, function (error) {
          if (error.status_code === 404 &&
              error instanceof jIO.util.jIOError) {
            throwCantFindError(id);
          }
          throw error;
        });
    }

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
            throwRemovedError(id);
          }
          return substorage.getAttachment(results.data.rows[0].id, name);
        }
        throwCantFindError(id);
      });
  };

  HistoryStorage.prototype.removeAttachment = function (id, name) {
    var timestamp = generateUniqueTimestamp(Date.now()),
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
    // XXX: if include_revisions, we should also include the document results
    // for different edits of attachments
    // Set default values
    if (options === undefined) {options = {}; }
    if (options.query === undefined) {options.query = ""; }
    if (options.sort_on === undefined) {options.sort_on = []; }
    if (options.select_list === undefined) {options.select_list = []; }
    if (options.include_revisions === undefined) {
      options.include_revisions = false;
    }
    options.sort_on.push(["timestamp", "descending"]);
    options.query = jIO.QueryFactory.create(options.query);

    var meta_options,
      substorage = this._sub_storage,

    // Check if query involved _timestamp.
    // If not, use default behavior and only query on latest revisions
      rev_query = options.include_revisions,
      doc_id_name,
      timestamp_name;

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
          docs_to_query,
          i;
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

        // If any documents have property _doc_id, __doc_id, etc, then set
        // doc_id_name to the first string which is not a property of any
        // of the documents
        doc_id_name = "_doc_id";
        timestamp_name = "_timestamp";
        for (i = 0; i < results.length; i += 1) {
          while (results[i].doc.hasOwnProperty(doc_id_name)) {
            doc_id_name = "_" + doc_id_name;
          }
          while (results[i].doc.hasOwnProperty(timestamp_name)) {
            timestamp_name = "_" + timestamp_name;
          }
        }

        docs_to_query = results.map(function (docum) {
          // If it's a "remove" operation then it has no doc property
          if (!docum.hasOwnProperty("doc")) {
            docum.doc = {};
          }
          docum.doc[doc_id_name] = docum.doc_id;
          docum.doc[timestamp_name] = docum.timestamp;
          return docum.doc;
        });
        options.select_list.push(doc_id_name);
        options.select_list.push(timestamp_name);
        query_matches = options.query.exec(docs_to_query, options);
        return query_matches;
      })
        // Format the results of the query, and return
        .push(function (query_matches) {
        return query_matches.map(function (docum) {
          var doc_id = docum[doc_id_name],
            time = docum[timestamp_name];
          delete docum[timestamp_name];
          delete docum[doc_id_name];
          return {
            doc: {},
            value: docum,
            id: doc_id,
            timestamp: time
          };
        });
      });
  };

  jIO.addStorage('history', HistoryStorage);

}(jIO, RSVP, SimpleQuery, ComplexQuery));