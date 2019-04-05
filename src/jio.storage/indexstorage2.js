/*
 * Copyright 2019, Nexedi SA
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
/*jslint nomen: true */
/*global indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, Event,
      parseStringToObject, Set*/

(function (indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError,
  parseStringToObject) {
  "use strict";

  function IndexStorage2(description) {
    if (typeof description.database !== "string" ||
        description.database === "") {
      throw new TypeError("IndexStorage2 'database' description property " +
        "must be a non-empty string");
    }
    if (description.index_keys && !(description.index_keys instanceof Array)) {
      throw new TypeError("IndexStorage2 'index_keys' description property " +
        "must be an Array");
    }
    this._sub_storage_description = description.sub_storage;
    this._sub_storage = jIO.createJIO(description.sub_storage);
    this._database_name = "jio:" + description.database;
    this._index_keys = description.index_keys || [];
    this._version = description.version || undefined;
  }

  IndexStorage2.prototype.hasCapacity = function (name) {
    return (name === 'query') || (name === 'limit') || (name === 'list') ||
        this._sub_storage.hasCapacity(name);
  };

  function isSubset(set1, set2) {
    var i, values;
    values = Array.from(set2);
    for (i = 0; i < values.length; i += 1) {
      if (!set1.has(values[i])) {
        return false;
      }
    }
    return true;
  }

  function filterDocValues(doc, keys) {
    var filtered_doc = {}, i;
    if (keys) {
      for (i = 0; i < keys.length; i += 1) {
        filtered_doc[keys[i]] = doc[keys[i]];
      }
      return filtered_doc;
    }
    return doc;
  }

  function waitForIDBRequest(request) {
    return new RSVP.Promise(function (resolve, reject) {
      request.onerror = reject;
      request.onsuccess = resolve;
    });
  }

  function VirtualIDB(description) {
    this._write_operations = description.write_operations;
  }

  VirtualIDB.prototype.put = function () {
    this._write_operations.put.push(arguments);
  };

  VirtualIDB.prototype.hasCapacity = function (name) {
    return (name === 'list') || (name === 'select');
  };

  VirtualIDB.prototype.get = function (id) {
    throw new jIO.util.jIOError("Cannot find document: " + id, 404);
  };

  VirtualIDB.prototype.buildQuery = function () {
    return [];
  };

  jIO.addStorage("virtualidb", VirtualIDB);

  function getVirtualIDB(write_operations, sub_storage_description) {
    return jIO.createJIO({
      type: "replicate",
      local_sub_storage: sub_storage_description,
      check_local_modification: false,
      check_local_deletion: false,
      check_local_creation: true,
      check_remote_modification: false,
      check_remote_creation: false,
      check_remote_deletion: false,
      remote_sub_storage: {
        type: "virtualidb",
        write_operations: write_operations,
      },
      signature_sub_storage: {
        type: "query",
        sub_storage: {
          type: "memory"
        }
      }
    });
  }

  function handleUpgradeNeeded(evt, index_keys, sub_storage_description) {
    var db = evt.target.result, store, i, current_indices, required_indices,
      put_promise_list = [], repair_promise, repeatUntilPromiseFulfilled,
      write_operations;
    required_indices = new Set(index_keys.map(function (name) {
      return 'Index-' + name;
    }));
    if (db.objectStoreNames[0] === 'index-store') {
      store = evt.target.transaction.objectStore('index-store');
    }

    current_indices = new Set(store ? store.indexNames : []);
    if (isSubset(current_indices, required_indices)) {
      if (!store) {
        return;
      }
      for (i = 0; i < store.indexNames.length; i += 1) {
        if (!required_indices.has(store.indexNames[i])) {
          store.deleteIndex(store.indexNames[i]);
        }
      }
    } else {
      if (store) {
        db.deleteObjectStore('index-store');
        current_indices.clear();
      }
      store = db.createObjectStore('index-store', {
        keyPath: 'id',
        autoIncrement: false
      });
      for (i = 0; i < index_keys.length; i += 1) {
        store.createIndex('Index-' + index_keys[i],
          'doc.' + index_keys[i], { unique: false });
      }

      write_operations = {put: []};
      repair_promise = getVirtualIDB(write_operations, sub_storage_description)
        .repair();
      repeatUntilPromiseFulfilled = function repeatUntilPromiseFulfilled(req) {
        req.onsuccess = function () {
          if (repair_promise.isRejected) {
            evt.target.transaction.abort();
            return;
          }
          if (repair_promise.isFulfilled) {
            for (i = 0; i < write_operations.put.length; i += 1) {
              put_promise_list.push(waitForIDBRequest(store.put({
                id: write_operations.put[i][0],
                doc: filterDocValues(write_operations.put[i][1], index_keys)
              })));
            }
            write_operations.put = [];
            return RSVP.all(put_promise_list);
          }
          return repeatUntilPromiseFulfilled(store.getAll());
        };
      };
      repeatUntilPromiseFulfilled(store.getAll());
    }
  }

  function waitForOpenIndexedDB(db_name, version, index_keys,
    sub_storage_description, callback) {
    function resolver(resolve, reject) {
      // Open DB //
      var request = indexedDB.open(db_name, version);
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
          reject(error.target.error);
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
      request.onupgradeneeded = function (evt) {
        handleUpgradeNeeded(evt, index_keys, sub_storage_description);
      };

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

  IndexStorage2.prototype._iterateCursor = function (on, query, limit) {
    return new RSVP.Promise(function (resolve, reject) {
      var result_list = [], count = 0, cursor;
      cursor = on.openKeyCursor(query);
      cursor.onsuccess = function (cursor) {
        if (cursor.target.result && count !== limit) {
          count += 1;
          result_list.push({id: cursor.target.result.primaryKey, value: {}});
          cursor.target.result.continue();
        } else {
          resolve(result_list);
        }
      };
      cursor.onerror = function (error) {
        reject(error.message);
      };
    });
  };

  IndexStorage2.prototype._runQuery = function (key, value, limit) {
    var context = this;
    return waitForOpenIndexedDB(context._database_name, context._version,
      context._index_keys, context._sub_storage_description, function (db) {
        return waitForTransaction(db, ["index-store"], "readonly",
          function (tx) {
            return context._iterateCursor(tx.objectStore("index-store")
              .index("Index-" + key), value, limit);
          });
      });
  };

  IndexStorage2.prototype.buildQuery = function (options) {
    var context = this, query;
    if (options.query && !options.include_docs && !options.sort_on &&
        !options.select_list) {
      query = parseStringToObject(options.query);
      if (query.type === 'simple') {
        if (context._index_keys.indexOf(query.key) !== -1) {
          return context._runQuery(query.key, query.value, options.limit)
            .then(function (result) {
              return result.map(function (value) {
                return {
                  id: value.id,
                  value: {}
                };
              });
            });
        }
      }
    }
    return context._sub_storage.allDocs(options)
      .push(function (result) {
        return result.data.rows;
      });
  };

  IndexStorage2.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype._put = function (id, value) {
    var context = this;
    if (context._index_keys.length === 0) {
      return;
    }
    return waitForOpenIndexedDB(context._database_name, context._version,
      context._index_keys, context._sub_storage_description, function (db) {
        return waitForTransaction(db, ["index-store"], "readwrite",
          function (tx) {
            return waitForIDBRequest(tx.objectStore("index-store").put({
              "id": id,
              "doc": filterDocValues(value, context._index_keys)
            }));
          });
      });
  };

  IndexStorage2.prototype.put = function (id, value) {
    var context = this;
    return context._sub_storage.put(id, value)
      .push(function () {
        return context._put(id, value);
      });
  };

  IndexStorage2.prototype.post = function (value) {
    var context = this;
    return context._sub_storage.post(value)
      .push(function (id) {
        return context._put(id, value);
      });
  };

  IndexStorage2.prototype.remove = function (id) {
    var context = this;
    return context._sub_storage.remove(id)
      .push(function () {
        return waitForOpenIndexedDB(context._database_name, context._version,
          context._index_keys, context._sub_storage_description, function (db) {
            return waitForTransaction(db, ["index-store"], "readwrite",
              function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store")
                  .delete(id));
              });
          });
      });
  };

  IndexStorage2.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
      arguments);
  };

  jIO.addStorage("index2", IndexStorage2);
}(indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, parseStringToObject));