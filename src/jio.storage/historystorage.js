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
    if (spec.hasOwnProperty("include_revisions")) {
      this._include_revisions = spec.include_revisions;
    } else {
      this._include_revisions = false;
    }
  }

  HistoryStorage.prototype.get = function (id_in) {

    // Query to get the last edit made to this document
    var substorage = this._sub_storage,
      doc_id_query,
      metadata_query,
      options;

    if (this._include_revisions) {
      doc_id_query = new SimpleQuery({
        operator: "<=",
        key: "timestamp",
        value: id_in
      });
    } else {
      doc_id_query = new SimpleQuery({key: "doc_id", value: id_in});
    }

    // Include id_in as value in query object for safety
    metadata_query = new ComplexQuery({
      operator: "AND",
      query_list: [
        doc_id_query,
        new ComplexQuery({
          operator: "OR",
          query_list: [
            new SimpleQuery({key: "op", value: "remove"}),
            new SimpleQuery({key: "op", value: "put"})
          ]
        })
      ]
    });
    options = {
      query: metadata_query,
      select_list: ["op"],
      limit: [0, 1],
      sort_on: [["timestamp", "descending"]]
    };


    return substorage.allDocs(options)
      .push(function (results) {
        if (results.data.total_rows > 0) {
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
      options_remcheck,
      include_revs = this._include_revisions,
      have_seen_id = false;

    if (include_revs) {
      query_doc_id = new SimpleQuery({
        operator: "<=",
        key: "timestamp",
        value: id
      });
    } else {
      query_doc_id = new SimpleQuery({key: "doc_id", value: id});
      have_seen_id = true;
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
      limit: [0, 1],
      sort_on: [["timestamp", "descending"]]
    };
    options = {
      query: query_obj,
      sort_on: [["timestamp", "descending"]],
      select_list: ["op", "name"]
    };

    return this._sub_storage.allDocs(options_remcheck)
      // Check the document exists and is not removed
      .push(function (results) {
        if (results.data.total_rows > 0) {
          if (results.data.rows[0].id === id) {
            have_seen_id = true;
          }
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

        // If input mapped to a real timestamp, then the first query result must
        // have the inputted id.  Otherwise, unexpected results could arise
        // by inputting nonsensical strings as id when include_revisions = true
        if (include_revs &&
            results.data.total_rows > 0 &&
            results.data.rows[0].id !== id &&
            !have_seen_id) {
          throwCantFindError(id);
        }


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

    if (this._include_revisions) {
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
        if (results.data.total_rows > 0) {
          // XXX: issue if attachments are put on a removed document
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
  HistoryStorage.prototype.hasCapacity = function (name) {
    return name === 'list' || name === 'include';
  };


  HistoryStorage.prototype.buildQuery = function (options) {
    // Set default values
    if (options === undefined) {options = {}; }
    if (options.query === undefined) {options.query = ""; }
    if (options.sort_on === undefined) {options.sort_on = []; }
    if (options.select_list === undefined) {options.select_list = []; }
    if (options.include_revisions === undefined) {
      options.include_revisions = false;
    }
    options.query = jIO.QueryFactory.create(options.query);

    var meta_options  = {
      query: "",
      sort_on: [["timestamp", "descending"]],
      select_list: ["doc", "op", "doc_id"]
    },
      include_revs = this._include_revisions;

    return this._sub_storage.allDocs(meta_options)
      .push(function (results) {
        results = results.data.rows;
        var seen = {},
          docs_to_query,
          i;

        if (include_revs) {

          // We only query on versions mapping to puts or putAttachments
          results = results.map(function (docum, ind) {
            var data_key;
            if (docum.value.op === "put") {
              return docum;
            }
            if (docum.value.op === "remove") {
              docum.value.doc = {};
              return docum;
            }
            if (docum.value.op === "putAttachment" ||
                docum.value.op === "removeAttachment") {

              // putAttachment document does not contain doc metadata, so we
              // add it from the most recent non-removed put on same id
              docum.value.doc = {};
              for (i = ind + 1; i < results.length; i += 1) {
                if (results[i].value.doc_id === docum.value.doc_id) {
                  if (results[i].value.op === "put") {
                    for (data_key in results[i].value.doc) {
                      if (results[i].value.doc.hasOwnProperty(data_key)) {
                        docum.value.doc[data_key] =
                          results[i].value.doc[data_key];
                      }
                    }
                    return docum;
                  }
                  // If most recent metadata edit before the attachment edit 
                  // was a remove, then leave doc empty
                  if (results[i].value.op === "remove") {
                    return docum;
                  }
                }
              }
            }
            return false;
          });
        } else {

          // Only query on latest revisions of non-removed documents/attachment
          // edits
          results = results.map(function (docum, ind) {
            var data_key;
            if (docum.value.op === "put") {
              // Mark as read and include in query
              if (!seen.hasOwnProperty(docum.value.doc_id)) {
                seen[docum.value.doc_id] = {};
                return docum;
              }

            } else if (docum.value.op === "remove" ||
                      docum.value.op === "removeAttachment") {
              // Mark as read but do not include in query
              seen[docum.value.doc_id] = {};

            } else if (docum.value.op === "putAttachment") {
              // If latest edit, mark as read, add document metadata from most
              // recent put, and add to query
              if (!seen.hasOwnProperty(docum.value.doc_id)) {
                seen[docum.value.doc_id] = {};
                docum.value.doc = {};
                for (i = ind + 1; i < results.length; i += 1) {
                  if (results[i].value.doc_id === docum.value.doc_id) {
                    if (results[i].value.op === "put") {
                      for (data_key in results[i].value.doc) {
                        if (results[i].value.doc.hasOwnProperty(data_key)) {
                          docum.value.doc[data_key] =
                            results[i].value.doc[data_key];
                        }
                      }
                      return docum;
                    }
                    if (results[i].value.op === "remove") {
                      // If most recent edit on document was a remove before
                      // this attachment, then don't include attachment in query
                      return false;
                    }
                  }
                }
              }
            }
            return false;
          });
        }
        docs_to_query = results

          // Filter out all docs flagged as false in previous map call
          .filter(function (docum) {
            return docum;
          })

          // Put into correct format to be passed back to query storage
          .map(function (docum) {
            docum.doc = docum.value.doc;
            docum.id = docum.value.doc_id;
            delete docum.value.doc_id;
            delete docum.value.op;

            if (options.include_docs) {
              docum.doc = docum.value.doc;
            } else {
              docum.doc = {};
            }

            docum.value = {};
            return docum;
          });
        return docs_to_query;
      });
  };

  jIO.addStorage('history', HistoryStorage);

}(jIO, RSVP, SimpleQuery, ComplexQuery));