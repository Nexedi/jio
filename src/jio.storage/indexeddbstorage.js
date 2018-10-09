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
        DOMError, Event*/

(function (indexedDB, jIO, RSVP, Blob, Math, IDBKeyRange, IDBOpenDBRequest,
           DOMError) {
  "use strict";

  // Read only as changing it can lead to data corruption
  var UNITE = 2000000;

  function IndexedDBStorage(description) {
    if (typeof description.database !== "string" ||
        description.database === "") {
      throw new TypeError("IndexedDBStorage 'database' description property " +
                          "must be a non-empty string");
    }
    this._database_name = "jio:" + description.database;
  }

  IndexedDBStorage.prototype.hasCapacity = function (name) {
    return ((name === "list") || (name === "include"));
  };

  function buildKeyPath(key_list) {
    return key_list.join("_");
  }

  function handleUpgradeNeeded(evt) {
    var db = evt.target.result,
      store;

    store = db.createObjectStore("metadata", {
      keyPath: "_id",
      autoIncrement: false
    });
    // It is not possible to use openKeyCursor on keypath directly
    // https://www.w3.org/Bugs/Public/show_bug.cgi?id=19955
    store.createIndex("_id", "_id", {unique: true});

    store = db.createObjectStore("attachment", {
      keyPath: "_key_path",
      autoIncrement: false
    });
    store.createIndex("_id", "_id", {unique: false});

    store = db.createObjectStore("blob", {
      keyPath: "_key_path",
      autoIncrement: false
    });
    store.createIndex("_id_attachment",
                      ["_id", "_attachment"], {unique: false});
    store.createIndex("_id", "_id", {unique: false});
  }

  function waitForOpenIndexedDB(db_name, callback) {
    function resolver(resolve, reject) {
      // Open DB //
      var request = indexedDB.open(db_name);
      request.onerror = function (error) {
        if (request.result) {
          request.result.close();
        }
        if ((error !== undefined) &&
            (error.target instanceof IDBOpenDBRequest) &&
            (error.target.error instanceof DOMError)) {
          reject("Connection to: " + db_name + " failed: " +
                 error.target.error.message);
        } else {
          reject(error);
        }
      };

      request.onabort = function () {
        request.result.close();
        reject("Aborting connection to: " + db_name);
      };

      request.ontimeout = function () {
        request.result.close();
        reject("Connection to: " + db_name + " timeout");
      };

      request.onblocked = function () {
        request.result.close();
        reject("Connection to: " + db_name + " was blocked");
      };

      // Create DB if necessary //
      request.onupgradeneeded = handleUpgradeNeeded;

      request.onversionchange = function () {
        request.result.close();
        reject(db_name + " was upgraded");
      };

      request.onsuccess = function () {
        return new RSVP.Queue()
          .push(function () {
            return callback(request.result);
          })
          .push(function (result) {
            request.result.close();
            resolve(result);
          }, function (error) {
            request.result.close();
            reject(error);
          });
      };
    }

    return new RSVP.Promise(resolver);
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
        return new RSVP.Queue()
          .push(function () {
            return result;
          })
          .push(resolve, function (error) {
            canceller();
            reject(error);
          });
      };
      tx.onerror = function (error) {
        canceller();
        reject(error);
      };
      tx.onabort = function (evt) {
        reject(evt.target);
      };
      return tx;
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
        "id": cursor.key,
        "value": {},
        "doc": cursor.value.doc
      });
    }

    function pushMetadata(cursor) {
      result_list.push({
        "id": cursor.key,
        "value": {}
      });
    }

    return new RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(context._database_name, function (db) {
          return waitForTransaction(db, ["metadata"], "readonly",
                                    function (tx) {
              if (options.include_docs === true) {
                return waitForAllSynchronousCursor(
                  tx.objectStore("metadata").index("_id").openCursor(),
                  pushIncludedMetadata
                );
              }
              return waitForAllSynchronousCursor(
                tx.objectStore("metadata").index("_id").openKeyCursor(),
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
        return waitForOpenIndexedDB(context._database_name, function (db) {
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
        return waitForOpenIndexedDB(context._database_name, function (db) {
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
    return waitForOpenIndexedDB(this._database_name, function (db) {
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
    return waitForOpenIndexedDB(this._database_name, function (db) {
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
    var db_name = this._database_name,
      start,
      end,
      array_buffer_list = [];

    start = options.start || 0;
    end = options.end;

    return new RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(db_name, function (db) {
          return waitForTransaction(db, ["attachment", "blob"], "readonly",
                                    function (tx) {
              var key_path = buildKeyPath([id, name]),
                attachment_store = tx.objectStore("attachment"),
                blob_store = tx.objectStore("blob");
              /*
                start_index,
                end_index,
                i;
*/

              function getBlob(cursor) {
                var index = parseInt(
                  cursor.primaryKey.slice(key_path.length + 1),
                  10
                ),
                  i = index;
                // Extend array size
                while (i > array_buffer_list.length) {
                  array_buffer_list.push(null);
                  i -= 1;
                }
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

/*

              

                .then(function (evt) {


                  if (end > total_length) {
                    end = total_length;
                  }
                  if (start < 0 || end < 0) {
                    throw new jIO.util.jIOError(
                      "_start and _end must be positive",
                      400
                    );
                  }
                  if (start > end) {
                    throw new jIO.util.jIOError("_start is greater than _end",
                                                400);
                  }
                  start_index = Math.floor(start / UNITE);
                  end_index =  Math.floor(end / UNITE);
                  if (end % UNITE === 0) {
                    end_index -= 1;
                  }

                  for (i = start_index; i <= end_index; i += 1) {
                    promise_list.push(
                      waitForIDBRequest(store.get(buildKeyPath([id, name, i])))
                    );
                  }
                });

*/
      })
      .push(function (result_list) {
        // No need to keep the IDB open
        var blob,
          index,
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

        if ((options.start === undefined) && (options.end === undefined)) {
          blob = new Blob(array_buffer_list,
                          {type: attachment.info.content_type});
          if (blob.length !== attachment.info.total_length) {
            throw new jIO.util.jIOError(
              "IndexedDB: attachment '" +
                  buildKeyPath([id, name]) +
                  "' in the 'attachment' store is broken",
              500
            );
          }
          return blob;
        }
        index = Math.floor(start / UNITE) * UNITE;
        blob = new Blob(array_buffer_list, {type: "application/octet-stream"});
        return blob.slice(start - index, end - index,
                          "application/octet-stream");
      });

  };

  IndexedDBStorage.prototype.putAttachment = function (id, name, blob) {
    var db_name = this._database_name;
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

        return waitForOpenIndexedDB(db_name, function (db) {
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
    return waitForOpenIndexedDB(this._database_name, function (db) {
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
}(indexedDB, jIO, RSVP, Blob, Math, IDBKeyRange, IDBOpenDBRequest, DOMError));
