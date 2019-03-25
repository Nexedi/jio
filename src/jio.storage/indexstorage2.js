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
    this._sub_storage = jIO.createJIO(description.sub_storage);
    this._database_name = "jio:" + description.database;
    this._index_keys = description.index_keys || [];
    this._version = description.version || undefined;
  }

  IndexStorage2.prototype.hasCapacity = function (name) {
    return (name === 'query') || (name === 'limit') || (name === 'list') ||
      this._sub_storage.hasCapacity(name);
  };

  function handleUpgradeNeeded(evt, index_keys) {
    var db = evt.target.result, store, i, current_indices;

    if (!(db.objectStoreNames[0])) {
      store = db.createObjectStore("index-store", {
        keyPath: "id",
        autoIncrement: false
      });
    } else {
      store = evt.target.transaction.objectStore('index-store');
    }
    current_indices = new Set(store.indexNames);
    for (i = 0; i < index_keys.length; i += 1) {
      if (!(current_indices.has(index_keys[i]))) {
        db.deleteObjectStore("index-store");
        store = db.createObjectStore("index-store", {
          keyPath: "id",
          autoIncrement: false
        });
        current_indices = new Set();
        break;
      }
    }
    for (i = 0; i < index_keys.length; i += 1) {
      if (!(current_indices.has('Index-' + index_keys[i]))) {
        store.createIndex('Index-' + index_keys[i],
          'doc.' + index_keys[i], { unique: false });
      }
      current_indices.delete('Index-' + index_keys[i]);
    }
    current_indices = Array.from(current_indices);
    for (i = 0; i < current_indices.length; i += 1) {
      store.deleteIndex(current_indices[i]);
    }
  }

  function waitForOpenIndexedDB(db_name, version, index_keys, callback) {
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
      request.onupgradeneeded = function (evt) {
        handleUpgradeNeeded(evt, index_keys);
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

  function waitForIDBRequest(request) {
    return new RSVP.Promise(function (resolve, reject) {
      request.onerror = reject;
      request.onsuccess = resolve;
    });
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

  IndexStorage2.prototype._runQuery = function (key, value, limit) {
    var context = this;
    return new RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(context._database_name, context._version,
          context._index_keys, function (db) {
            return waitForTransaction(db, ["index-store"], "readonly",
              function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store")
                  .index("Index-" + key).getAll(value, limit))
                  .then(function (evt) {
                    return evt.target.result;
                  });
              });
          });
      });
  };

  IndexStorage2.prototype.buildQuery = function (options) {
    var context = this, query;
    if (options.query) {
      query = parseStringToObject(options.query);
      if (query.type === 'simple') {
        if (context._index_keys.indexOf(query.key) !== -1) {
          return context._runQuery(query.key, query.value, options.limit)
            .push(function (result) {
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
    return waitForOpenIndexedDB(context._database_name, context._version,
      context._index_keys, function (db) {
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
          context._index_keys, function (db) {
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

  IndexStorage2.prototype.repair = function () {
    var context = this, promise_list = [], i;
    return context._sub_storage.allDocs()
      .push(function (result) {
        for (i = 0; i < result.data.total_rows; i += 1) {
          promise_list.push(context.put(result.data.rows[i].id,
            filterDocValues(result.data.rows[i].value, context._index_keys)));
        }
        return RSVP.all(promise_list);
      });
  };

  jIO.addStorage("index2", IndexStorage2);
}(indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, parseStringToObject));