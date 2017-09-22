/*
 * Copyright 2014, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
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

  function openIndexedDB(jio_storage) {
    var db_name = jio_storage._database_name;
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
        resolve(request.result);
      };
    }
    // XXX Canceller???
    return new RSVP.Queue()
      .push(function () {
        return new RSVP.Promise(resolver);
      });
  }

  function openTransaction(db, stores, flag, autoclosedb) {
    var tx = db.transaction(stores, flag);
    if (autoclosedb !== false) {
      tx.oncomplete = function () {
        db.close();
      };
    }
    tx.onabort = function () {
      db.close();
    };
    return tx;
  }

  function handleCursor(request, callback, resolve, reject) {
    request.onerror = function (error) {
      if (request.transaction) {
        request.transaction.abort();
      }
      reject(error);
    };

    request.onsuccess = function (evt) {
      var cursor = evt.target.result;
      if (cursor) {
        // XXX Wait for result
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

  IndexedDBStorage.prototype.buildQuery = function (options) {
    var result_list = [];

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
    return openIndexedDB(this)
      .push(function (db) {
        return new RSVP.Promise(function (resolve, reject) {
          var tx = openTransaction(db, ["metadata"], "readonly");
          if (options.include_docs === true) {
            handleCursor(tx.objectStore("metadata").index("_id").openCursor(),
              pushIncludedMetadata, resolve, reject);
          } else {
            handleCursor(tx.objectStore("metadata").index("_id")
                            .openKeyCursor(), pushMetadata, resolve, reject);
          }
        });
      })
      .push(function () {
        return result_list;
      });
  };

  function handleGet(store, id, resolve, reject) {
    var request = store.get(id);
    request.onerror = reject;
    request.onsuccess = function () {
      if (request.result) {
        resolve(request.result);
      } else {
        reject(new jIO.util.jIOError(
          "IndexedDB: cannot find object '" + id + "' in the '" +
            store.name + "' store",
          404
        ));
      }
    };
  }

  IndexedDBStorage.prototype.get = function (id) {
    return openIndexedDB(this)
      .push(function (db) {
        return new RSVP.Promise(function (resolve, reject) {
          var transaction = openTransaction(db, ["metadata"], "readonly");
          handleGet(
            transaction.objectStore("metadata"),
            id,
            resolve,
            reject
          );
        });
      })
      .push(function (result) {
        return result.doc;
      });
  };

  IndexedDBStorage.prototype.allAttachments = function (id) {
    var attachment_dict = {};

    function addEntry(cursor) {
      attachment_dict[cursor.value._attachment] = {};
    }

    return openIndexedDB(this)
      .push(function (db) {
        return new RSVP.Promise(function (resolve, reject) {
          var transaction = openTransaction(db, ["metadata", "attachment"],
            "readonly");
          function getAttachments() {
            handleCursor(
              transaction.objectStore("attachment").index("_id")
                .openCursor(IDBKeyRange.only(id)),
              addEntry,
              resolve,
              reject
            );
          }
          handleGet(
            transaction.objectStore("metadata"),
            id,
            getAttachments,
            reject
          );
        });
      })
      .push(function () {
        return attachment_dict;
      });
  };

  function handleRequest(request, resolve, reject) {
    request.onerror = reject;
    request.onsuccess = function () {
      resolve(request.result);
    };
  }

  IndexedDBStorage.prototype.put = function (id, metadata) {
    return openIndexedDB(this)
      .push(function (db) {
        return new RSVP.Promise(function (resolve, reject) {
          var transaction = openTransaction(db, ["metadata"], "readwrite");
          handleRequest(
            transaction.objectStore("metadata").put({
              "_id": id,
              "doc": metadata
            }),
            resolve,
            reject
          );
        });
      });
  };

  function deleteEntry(cursor) {
    cursor["delete"]();
  }

  IndexedDBStorage.prototype.remove = function (id) {
    var resolved_amount = 0;
    return openIndexedDB(this)
      .push(function (db) {
        return new RSVP.Promise(function (resolve, reject) {
          function resolver() {
            if (resolved_amount < 2) {
              resolved_amount += 1;
            } else {
              resolve();
            }
          }
          var transaction = openTransaction(db, ["metadata", "attachment",
                                            "blob"], "readwrite");
          handleRequest(
            transaction.objectStore("metadata")["delete"](id),
            resolver,
            reject
          );
          // XXX Why not possible to delete with KeyCursor?
          handleCursor(transaction.objectStore("attachment").index("_id")
              .openCursor(IDBKeyRange.only(id)),
            deleteEntry,
            resolver,
            reject
            );
          handleCursor(transaction.objectStore("blob").index("_id")
              .openCursor(IDBKeyRange.only(id)),
            deleteEntry,
            resolver,
            reject
            );
        });
      });
  };

  IndexedDBStorage.prototype.getAttachment = function (id, name, options) {
    var transaction,
      type,
      start,
      end;
    if (options === undefined) {
      options = {};
    }
    return openIndexedDB(this)
      .push(function (db) {
        return new RSVP.Promise(function (resolve, reject) {
          transaction = openTransaction(
            db,
            ["attachment", "blob"],
            "readonly"
          );
          function getBlob(attachment) {
            var total_length = attachment.info.length,
              result_list = [],
              store = transaction.objectStore("blob"),
              start_index,
              end_index;
            type = attachment.info.content_type;
            start = options.start || 0;
            end = options.end || total_length;
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
            end_index =  Math.floor(end / UNITE) - 1;
            if (end % UNITE === 0) {
              end_index -= 1;
            }
            function resolver(result) {
              result_list.push(result);
              resolve(result_list);
            }
            function getPart(i) {
              return function (result) {
                if (result) {
                  result_list.push(result);
                }
                i += 1;
                handleGet(store,
                  buildKeyPath([id, name, i]),
                  (i <= end_index) ? getPart(i) : resolver,
                  reject
                  );
              };
            }
            getPart(start_index - 1)();
          }
        // XXX Should raise if key is not good
          handleGet(transaction.objectStore("attachment"),
            buildKeyPath([id, name]),
            getBlob,
            reject
            );
        });
      })
      .push(function (result_list) {
        var array_buffer_list = [],
          blob,
          i,
          index,
          len = result_list.length;
        for (i = 0; i < len; i += 1) {
          array_buffer_list.push(result_list[i].blob);
        }
        if ((options.start === undefined) && (options.end === undefined)) {
          return new Blob(array_buffer_list, {type: type});
        }
        index = Math.floor(start / UNITE) * UNITE;
        blob = new Blob(array_buffer_list, {type: "application/octet-stream"});
        return blob.slice(start - index, end - index,
                          "application/octet-stream");
      });
  };

  function removeAttachment(transaction, id, name, resolve, reject) {
      // XXX How to get the right attachment
    function deleteContent() {
      handleCursor(
        transaction.objectStore("blob").index("_id_attachment")
          .openCursor(IDBKeyRange.only([id, name])),
        deleteEntry,
        resolve,
        reject
      );
    }
    handleRequest(
      transaction.objectStore("attachment")["delete"](
        buildKeyPath([id, name])
      ),
      deleteContent,
      reject
    );
  }

  IndexedDBStorage.prototype.putAttachment = function (id, name, blob) {
    var blob_part = [],
      transaction,
      db;

    return openIndexedDB(this)
      .push(function (database) {
        db = database;

        // Split the blob first
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (event) {
        var array_buffer = event.target.result,
          total_size = blob.size,
          handled_size = 0;

        while (handled_size < total_size) {
          blob_part.push(array_buffer.slice(handled_size,
                                            handled_size + UNITE));
          handled_size += UNITE;
        }
        if (total_size === 0) {
          blob_part.push(blob);
        }

        // Remove previous attachment
        transaction = openTransaction(db, ["attachment", "blob"], "readwrite");
        return new RSVP.Promise(function (resolve, reject) {
          function write() {
            var len = blob_part.length - 1,
              attachment_store = transaction.objectStore("attachment"),
              blob_store = transaction.objectStore("blob");
            function putBlobPart(i) {
              return function () {
                i += 1;
                handleRequest(
                  blob_store.put({
                    "_key_path": buildKeyPath([id, name, i]),
                    "_id" : id,
                    "_attachment" : name,
                    "_part" : i,
                    "blob": blob_part[i]
                  }),
                  (i < len) ? putBlobPart(i) : resolve,
                  reject
                );
              };
            }
            handleRequest(
              attachment_store.put({
                "_key_path": buildKeyPath([id, name]),
                "_id": id,
                "_attachment": name,
                "info": {
                  "content_type": blob.type,
                  "length": blob.size
                }
              }),
              putBlobPart(-1),
              reject
            );
          }
          removeAttachment(transaction, id, name, write, reject);
        });
      });
  };

  IndexedDBStorage.prototype.removeAttachment = function (id, name) {
    return openIndexedDB(this)
      .push(function (db) {
        var transaction = openTransaction(db, ["attachment", "blob"],
                                          "readwrite");
        return new RSVP.Promise(function (resolve, reject) {
          removeAttachment(transaction, id, name, resolve, reject);
        });
      });
  };

  jIO.addStorage("indexeddb", IndexedDBStorage);
}(indexedDB, jIO, RSVP, Blob, Math, IDBKeyRange, IDBOpenDBRequest, DOMError));
