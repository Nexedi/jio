/*
 * Copyright 2014, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */

/**
 * JIO Indexed Database Storage.
 *
 * A local browser "database" storage greatly more powerful than localStorage.
 *
 * Description:
 *
 *    {
 *      "type": "indexeddb",
 *      "database": <string>
 *    }
 *
 * The database name will be prefixed by "jio:", so if the database property is
 * "hello", then you can manually reach this database with
 * `indexedDB.open("jio:hello");`. (Or
 * `indexedDB.deleteDatabase("jio:hello");`.)
 *
 * For more informations:
 *
 * - http://www.w3.org/TR/IndexedDB/
 * - https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB
 */

/*jslint nomen: true */
/*global indexedDB, jIO, RSVP, Blob, Math, IDBKeyRange, IDBOpenDBRequest,
        DOMError, DOMException, Set*/

(function (indexedDB, jIO, RSVP, Blob, Math, IDBKeyRange, IDBOpenDBRequest,
           DOMError, DOMException, Set) {
  "use strict";

  // Read only as changing it can lead to data corruption
  var UNITE = 2000000,
    INDEX_PREFIX = 'doc.';

  function IndexedDBStorage(description) {
    if (typeof description.database !== "string" ||
        description.database === "") {
      throw new TypeError("IndexedDBStorage 'database' description property " +
                          "must be a non-empty string");
    }
    this._database_name = "jio:" + description.database;
    this._version = description.version;
    this._index_key_list = description.index_key_list || [];
  }

  IndexedDBStorage.prototype.hasCapacity = function (name) {
    return ((name === "list") || (name === "include"));
  };

  function buildKeyPath(key_list) {
    return key_list.join("_");
  }

  function handleUpgradeNeeded(evt, index_key_list) {
    var db = evt.target.result,
      store,
      current_store_list = Array.from(db.objectStoreNames),
      current_index_list,
      i,
      index_key;

    if (current_store_list.indexOf("metadata") === -1) {
      store = db.createObjectStore("metadata", {
        keyPath: "_id",
        autoIncrement: false
      });
      // It is not possible to use openKeyCursor on keypath directly
      // https://www.w3.org/Bugs/Public/show_bug.cgi?id=19955
      store.createIndex("_id", "_id", {unique: true});
    } else {
      store = evt.target.transaction.objectStore("metadata");
    }

    current_index_list = new Set(store.indexNames);
    current_index_list.delete("_id");
    for (i = 0; i < index_key_list.length; i += 1) {
      // Prefix the index name to prevent conflict with _id
      index_key = INDEX_PREFIX + index_key_list[i];
      if (current_index_list.has(index_key)) {
        current_index_list.delete(index_key);
      } else {
        store.createIndex(index_key, index_key,
                          {unique: false});
      }
    }
    current_index_list = Array.from(current_index_list);
    for (i = 0; i < current_index_list.length; i += 1) {
      store.deleteIndex(current_index_list[i]);
    }

    if (current_store_list.indexOf("attachment") === -1) {
      store = db.createObjectStore("attachment", {
        keyPath: "_key_path",
        autoIncrement: false
      });
      store.createIndex("_id", "_id", {unique: false});
    }

    if (current_store_list.indexOf("blob") === -1) {
      store = db.createObjectStore("blob", {
        keyPath: "_key_path",
        autoIncrement: false
      });
      store.createIndex("_id_attachment",
                        ["_id", "_attachment"], {unique: false});
      store.createIndex("_id", "_id", {unique: false});
    }
  }

  function waitForOpenIndexedDB(storage, callback) {
    var request,
      db_name = storage._database_name;

    function canceller() {
      if ((request !== undefined) && (request.result !== undefined)) {
        request.result.close();
      }
    }

    function resolver(resolve, reject) {
      // Open DB //
      request = indexedDB.open(db_name, storage._version);
      request.onerror = function (error) {
        canceller();
        if ((error !== undefined) &&
            (error.target instanceof IDBOpenDBRequest) &&
            ((error.target.error instanceof DOMError) ||
             (error.target.error instanceof DOMException))) {
          reject(new jIO.util.jIOError(
            "Connection to: " + db_name + " failed: " +
              error.target.error.message,
            500
          ));
        } else {
          reject(error);
        }
      };

      request.onabort = function () {
        canceller();
        reject("Aborting connection to: " + db_name);
      };

      request.ontimeout = function () {
        reject("Connection to: " + db_name + " timeout");
      };

      request.onblocked = function () {
        canceller();
        reject("Connection to: " + db_name + " was blocked");
      };

      // Create DB if necessary //
      request.onupgradeneeded = function (evt) {
        handleUpgradeNeeded(evt, storage._index_key_list);
      };

      request.onversionchange = function () {
        canceller();
        reject(db_name + " was upgraded");
      };

      request.onsuccess = function () {
        var result;
        try {
          result = callback(request.result);
        } catch (error) {
          reject(error);
        }
        return new RSVP.Queue(result)
          .push(function (final_result) {
            canceller();
            resolve(final_result);
          }, function (error) {
            canceller();
            reject(error);
          });
      };
    }

    return new RSVP.Promise(resolver, canceller);
  }

  function waitForTransaction(db, stores, flag, callback) {
    var tx = db.transaction(stores, flag);
    function canceller() {
      try {
        tx.abort();
      } catch (unused) {
        // Transaction already finished
        return;
      }
    }
    function resolver(resolve, reject) {
      var result;
      try {
        result = callback(tx);
      } catch (error) {
        reject(error);
      }
      tx.oncomplete = function () {
        return new RSVP.Queue(result)
          .push(resolve, function (error) {
            canceller();
            reject(error);
          });
      };
      tx.onerror = reject;
      tx.onabort = reject;
    }
    return new RSVP.Promise(resolver, canceller);
  }

  function waitForIDBRequest(request) {
    return new RSVP.Promise(function (resolve, reject) {
      request.onerror = reject;
      request.onsuccess = resolve;
    });
  }

  function waitForAllSynchronousCursor(request, callback) {
    var force_cancellation = false;

    function canceller() {
      force_cancellation = true;
    }

    function resolver(resolve, reject) {
      request.onerror = reject;
      request.onsuccess = function (evt) {
        var cursor = evt.target.result;
        if (cursor && !force_cancellation) {
          try {
            callback(cursor);
          } catch (error) {
            reject(error);
          }
          // continue to next iteration
          cursor["continue"]();
        } else {
          resolve();
        }
      };
    }
    return new RSVP.Promise(resolver, canceller);
  }

  IndexedDBStorage.prototype.buildQuery = function (options) {
    var result_list = [],
      context = this;

    function pushIncludedMetadata(cursor) {
      result_list.push({
        "id": cursor.primaryKey,
        "value": {},
        "doc": cursor.value.doc
      });
    }

    function pushMetadata(cursor) {
      result_list.push({
        "id": cursor.primaryKey,
        "value": {}
      });
    }

    return new RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(context, function (db) {
          return waitForTransaction(db, ["metadata"], "readonly",
                                    function (tx) {
              var key = "_id";
              if (options.include_docs === true) {
                return waitForAllSynchronousCursor(
                  tx.objectStore("metadata").index(key).openCursor(),
                  pushIncludedMetadata
                );
              }
              return waitForAllSynchronousCursor(
                tx.objectStore("metadata").index(key).openKeyCursor(),
                pushMetadata
              );
            });
        });
      })
      .push(function () {
        return result_list;
      });
  };

  IndexedDBStorage.prototype.get = function (id) {
    var context = this;
    return new RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(context, function (db) {
          return waitForTransaction(db, ["metadata"], "readonly",
                                    function (tx) {
              return waitForIDBRequest(tx.objectStore("metadata").get(id));
            });
        });
      })
      .push(function (evt) {
        if (evt.target.result) {
          return evt.target.result.doc;
        }
        throw new jIO.util.jIOError(
          "IndexedDB: cannot find object '" + id + "' in the 'metadata' store",
          404
        );
      });
  };

  IndexedDBStorage.prototype.allAttachments = function (id) {
    var attachment_dict = {},
      context = this;

    function addEntry(cursor) {
      attachment_dict[cursor.primaryKey.slice(cursor.key.length + 1)] = {};
    }

    return new RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(context, function (db) {
          return waitForTransaction(db, ["metadata", "attachment"], "readonly",
                                    function (tx) {
              return RSVP.all([
                waitForIDBRequest(tx.objectStore("metadata").get(id)),
                waitForAllSynchronousCursor(
                  tx.objectStore("attachment").index("_id")
                    .openKeyCursor(IDBKeyRange.only(id)),
                  addEntry
                )
              ]);
            });
        });
      })
      .push(function (result_list) {
        var evt = result_list[0];
        if (!evt.target.result) {
          throw new jIO.util.jIOError(
            "IndexedDB: cannot find object '" + id +
              "' in the 'metadata' store",
            404
          );
        }

        return attachment_dict;
      });
  };

  IndexedDBStorage.prototype.put = function (id, metadata) {
    return waitForOpenIndexedDB(this, function (db) {
      return waitForTransaction(db, ["metadata"], "readwrite",
                                function (tx) {
          return waitForIDBRequest(tx.objectStore("metadata").put({
            "_id": id,
            "doc": metadata
          }));
        });
    });
  };

  IndexedDBStorage.prototype.remove = function (id) {
    return waitForOpenIndexedDB(this, function (db) {
      return waitForTransaction(db, ["metadata", "attachment", "blob"],
                                "readwrite", function (tx) {

          var promise_list = [],
            metadata_store = tx.objectStore("metadata"),
            attachment_store = tx.objectStore("attachment"),
            blob_store = tx.objectStore("blob");

          function deleteAttachment(cursor) {
            promise_list.push(
              waitForIDBRequest(attachment_store.delete(cursor.primaryKey))
            );
          }
          function deleteBlob(cursor) {
            promise_list.push(
              waitForIDBRequest(blob_store.delete(cursor.primaryKey))
            );
          }

          return RSVP.all([
            waitForIDBRequest(metadata_store.delete(id)),
            waitForAllSynchronousCursor(
              attachment_store.index("_id")
                              .openKeyCursor(IDBKeyRange.only(id)),
              deleteAttachment
            ),
            waitForAllSynchronousCursor(
              blob_store.index("_id")
                        .openKeyCursor(IDBKeyRange.only(id)),
              deleteBlob
            ),
          ])
            .then(function () {
              return RSVP.all(promise_list);
            });
        });
    });
  };

  IndexedDBStorage.prototype.getAttachment = function (id, name, options) {
    if (options === undefined) {
      options = {};
    }
    var start,
      end,
      array_buffer_list = [],
      context = this;

    start = options.start || 0;
    end = options.end;

    // Stream the blob content
    if ((start !== 0) || (end !== undefined)) {

      if (start < 0 || ((end !== undefined) && (end < 0))) {
        throw new jIO.util.jIOError(
          "_start and _end must be positive",
          400
        );
      }
      if ((end !== undefined) && (start > end)) {
        throw new jIO.util.jIOError("_start is greater than _end",
                                    400);
      }

      return new RSVP.Queue()
        .push(function () {
          return waitForOpenIndexedDB(context, function (db) {
            return waitForTransaction(db, ["blob"], "readonly",
                                      function (tx) {
                var key_path = buildKeyPath([id, name]),
                  blob_store = tx.objectStore("blob"),
                  start_index,
                  end_index,
                  promise_list = [];


                start_index = Math.floor(start / UNITE);
                if (end !== undefined) {
                  end_index =  Math.floor(end / UNITE);
                  if (end % UNITE === 0) {
                    end_index -= 1;
                  }
                }

                function getBlobKey(cursor) {
                  var index = parseInt(
                    cursor.primaryKey.slice(key_path.length + 1),
                    10
                  );

                  if ((start !== 0) && (index < start_index)) {
                    // No need to fetch blobs at the start
                    return;
                  }
                  if ((end !== undefined) && (index > end_index)) {
                    // No need to fetch blobs at the end
                    return;
                  }

                  // Sort the blob by their index
                  promise_list.splice(
                    index - start_index,
                    0,
                    waitForIDBRequest(blob_store.get(cursor.primaryKey))
                  );
                }

                // Get all blob keys to check if they must be fetched
                return waitForAllSynchronousCursor(
                  blob_store.index("_id_attachment")
                    .openKeyCursor(IDBKeyRange.only([id, name])),
                  getBlobKey
                )
                  .then(function () {
                    return RSVP.all(promise_list);
                  });
              });
          });
        })
        .push(function (result_list) {
          // No need to keep the IDB open
          var blob,
            index,
            i;

          for (i = 0; i < result_list.length; i += 1) {
            array_buffer_list.push(result_list[i].target.result.blob);
          }
          blob = new Blob(array_buffer_list,
                          {type: "application/octet-stream"});
          index = Math.floor(start / UNITE) * UNITE;
          if (end === undefined) {
            end = blob.size;
          } else {
            end = end - index;
          }
          return blob.slice(start - index, end,
                            "application/octet-stream");
        });
    }

    // Request the full blob
    return new RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(context, function (db) {
          return waitForTransaction(db, ["attachment", "blob"], "readonly",
                                    function (tx) {
              var key_path = buildKeyPath([id, name]),
                attachment_store = tx.objectStore("attachment"),
                blob_store = tx.objectStore("blob");

              function getBlob(cursor) {
                var index = parseInt(
                  cursor.primaryKey.slice(key_path.length + 1),
                  10
                );

                // Sort the blob by their index
                array_buffer_list.splice(
                  index,
                  0,
                  cursor.value.blob
                );
              }

              return RSVP.all([
                // Get the attachment info (mime type)
                waitForIDBRequest(attachment_store.get(
                  key_path
                )),
                // Get all needed blobs
                waitForAllSynchronousCursor(
                  blob_store.index("_id_attachment")
                    .openCursor(IDBKeyRange.only([id, name])),
                  getBlob
                )
              ]);
            });
        });

      })
      .push(function (result_list) {
        // No need to keep the IDB open
        var blob,
          attachment = result_list[0].target.result;

        // Should raise if key is not good
        if (!attachment) {
          throw new jIO.util.jIOError(
            "IndexedDB: cannot find object '" +
                buildKeyPath([id, name]) +
                "' in the 'attachment' store",
            404
          );
        }

        blob = new Blob(array_buffer_list,
                        {type: attachment.info.content_type});
        if (blob.size !== attachment.info.length) {
          throw new jIO.util.jIOError(
            "IndexedDB: attachment '" +
                buildKeyPath([id, name]) +
                "' in the 'attachment' store is broken",
            500
          );
        }
        return blob;
      });
  };

  IndexedDBStorage.prototype.putAttachment = function (id, name, blob) {
    var context = this;
    return new RSVP.Queue()
      .push(function () {
        // Split the blob first
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (event) {
        var array_buffer = event.target.result,
          blob_part = [],
          total_size = blob.size,
          handled_size = 0;

        while (handled_size < total_size) {
          blob_part.push(array_buffer.slice(handled_size,
                                            handled_size + UNITE));
          handled_size += UNITE;
        }

        return waitForOpenIndexedDB(context, function (db) {
          return waitForTransaction(db, ["attachment", "blob"], "readwrite",
                                    function (tx) {
              var blob_store,
                promise_list,
                delete_promise_list = [],
                key_path = buildKeyPath([id, name]),
                i;
              // First write the attachment info on top of previous
              promise_list = [
                waitForIDBRequest(tx.objectStore("attachment").put({
                  "_key_path": key_path,
                  "_id": id,
                  "_attachment": name,
                  "info": {
                    "content_type": blob.type,
                    "length": blob.size
                  }
                }))
              ];
              // Then, write all blob parts on top of previous
              blob_store = tx.objectStore("blob");
              for (i = 0; i < blob_part.length; i += 1) {
                promise_list.push(
                  waitForIDBRequest(blob_store.put({
                    "_key_path": buildKeyPath([id, name, i]),
                    "_id" : id,
                    "_attachment" : name,
                    "_part" : i,
                    "blob": blob_part[i]
                  }))
                );
              }

              function deleteEntry(cursor) {
                var index = parseInt(
                  cursor.primaryKey.slice(key_path.length + 1),
                  10
                );
                if (index >= blob_part.length) {
                  delete_promise_list.push(
                    waitForIDBRequest(blob_store.delete(cursor.primaryKey))
                  );
                }
              }

              // Finally, remove all remaining blobs
              promise_list.push(
                waitForAllSynchronousCursor(
                  blob_store.index("_id_attachment")
                            .openKeyCursor(IDBKeyRange.only([id, name])),
                  deleteEntry
                )
              );

              return RSVP.all(promise_list)
                .then(function () {
                  if (delete_promise_list.length) {
                    return RSVP.all(delete_promise_list);
                  }
                });
            });
        });
      });
  };

  IndexedDBStorage.prototype.removeAttachment = function (id, name) {
    return waitForOpenIndexedDB(this, function (db) {
      return waitForTransaction(db, ["attachment", "blob"], "readwrite",
                                function (tx) {
          var promise_list = [],
            attachment_store = tx.objectStore("attachment"),
            blob_store = tx.objectStore("blob");

          function deleteEntry(cursor) {
            promise_list.push(
              waitForIDBRequest(blob_store.delete(cursor.primaryKey))
            );
          }

          return RSVP.all([
            waitForIDBRequest(
              attachment_store.delete(buildKeyPath([id, name]))
            ),
            waitForAllSynchronousCursor(
              blob_store.index("_id_attachment")
                        .openKeyCursor(IDBKeyRange.only([id, name])),
              deleteEntry
            )
          ])
            .then(function () {
              return RSVP.all(promise_list);
            });

        });
    });
  };

  jIO.addStorage("indexeddb", IndexedDBStorage);
}(indexedDB, jIO, RSVP, Blob, Math, IDBKeyRange, IDBOpenDBRequest, DOMError,
  DOMException, Set));
