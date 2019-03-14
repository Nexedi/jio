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
    this._sub_storage = jIO.createJIO(description.sub_storage);
    this._database_name = "jio:" + description.database;
    this._index_keys = description.index_keys || [];
  }

  IndexStorage2.prototype.hasCapacity = function (name) {
    var this_storage_capacity_list = ["limit",
                                      "select",
                                      "list",
                                      "query"];

    if (this_storage_capacity_list.indexOf(name) !== -1) {
      return true;
    }
  };

  function checkArrayEquality(array1, array2) {
    if (array1.length !== array2.length) {
      return false;
    }
    var i;
    array1 = array1.sort();
    array2 = array2.sort();
    for (i = 0; i < array1.length; i += 1) {
      if (array1[i] !== array2[i]) {
        return false;
      }
    }
    return true;
  }

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
            var store, current_indices, db_version, required_indices;
            store = request.result.transaction('index-store')
              .objectStore('index-store');
            current_indices = store.indexNames;
            db_version = request.result.version;
            required_indices = index_keys.map(
              function (value) {return 'Index-' + value; }
            );
            if (!(checkArrayEquality(required_indices,
                Array.from(current_indices)))) {
              request.result.close();
              return waitForOpenIndexedDB(db_name, db_version + 1,
                index_keys, callback);
            }
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
    for (i = 0; i < keys.length; i += 1) {
      if (doc[keys[i]]) {
        filtered_doc[keys[i]] = doc[keys[i]];
      } else {
        throw new jIO.util.jIOError(
          "Index key '" + keys[i] + "' not found in document",
          404
        );
      }
    }
    return filtered_doc;
  }

  IndexStorage2.prototype._runQuery = function (index, value, limit) {
    var context = this;
    return new RSVP.Queue()
      .push(function () {
        if ((context._index_keys.indexOf(index) === -1)) {
          try {
            context._sub_storage.hasCapacity("query");
          } catch (error) {
            throw new jIO.util.jIOError("No index for '" + index +
              "' key and substorage doesn't support queries", 404);
          }
          return context._sub_storage.buildQuery(
            { "query": index + ":" + value }
          );
        }
        return waitForOpenIndexedDB(context._database_name, undefined,
          context._index_keys, function (db) {
            return waitForTransaction(db, ["index-store"], "readonly",
              function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store")
                  .index("Index-" + index).getAll(value, limit))
                  .then(function (evt) {
                    return evt.target.result;
                  });
              });
          });
      });
  };

  IndexStorage2.prototype._processQueryObject = function (object, limit) {
    var promise_list = [], context = this, i, j, query_result = new Set();
    return RSVP.Queue()
      .push(function () {
        if (object.type === "simple") {
          return context._runQuery(object.key, object.value, limit);
        }
        if (object.type === "complex") {
          for (i = 0; i < object.query_list.length; i += 1) {
            promise_list.push(context
              ._processQueryObject(object.query_list[i]));
          }
          return RSVP.all(promise_list)
            .then(function (result) {
              if (object.operator === "OR") {
                for (i = 0; i < result.length; i += 1) {
                  for (j = 0; j < result[i].length; j += 1) {
                    query_result.add(result[i][j]);
                  }
                }
                return Array.from(query_result);
              }
              if (object.operator === "AND") {
                var temp_set = new Set();
                for (i = 0; i < result[0].length; i += 1) {
                  query_result.add(result[0][i].id);
                }
                for (i = 1; i < result.length; i += 1) {
                  for (j = 0; j < result[i].length; j += 1) {
                    if (query_result.has(result[i][j].id)) {
                      temp_set.add(result[i][j]);
                    }
                  }
                  query_result = temp_set;
                  temp_set = new Set();
                }
                return Array.from(query_result);
              }
            });
        }
      });
  };

  IndexStorage2.prototype.buildQuery = function (options) {
    var context = this;
    if (options.query) {
      return this._processQueryObject(parseStringToObject(options.query),
        options.limit)
        .push(function (result) {
          return result.map(function (value) {
            return {
              "id": value.id,
              "value": filterDocValues(value.doc,
                options.select_list || [])
            };
          });
        });
    }
    return waitForOpenIndexedDB(context._database_name, undefined,
      context._index_keys, function (db) {
        return waitForTransaction(db, ["index-store"], "readonly",
          function (tx) {
            return waitForIDBRequest(tx.objectStore("index-store")
              .getAll(undefined, options.limit))
              .then(function (evt) {
                return evt.target.result.map(function (value) {
                  return {
                    "id": value.id,
                    "value": filterDocValues(value.doc,
                      options.select_list || [])
                  };
                });
              });
          });
      });
  };

  IndexStorage2.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype.put = function (id, value) {
    var context = this;
    return context._sub_storage.put(id, value)
      .push(function () {
        return waitForOpenIndexedDB(context._database_name, undefined,
          context._index_keys, function (db) {
            return waitForTransaction(db, ["index-store"], "readwrite",
              function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store").put({
                  "id": id,
                  "doc": filterDocValues(value, context._index_keys)
                }));
              });
          });
      });
  };

  IndexStorage2.prototype.post = function (value) {
    var context = this;
    return context._sub_storage.post(value)
      .push(function (id) {
        return waitForOpenIndexedDB(context._database_name, undefined,
          context._index_keys, function (db) {
            return waitForTransaction(db, ["index-store"], "readwrite",
              function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store").put({
                  "id": id,
                  "doc": filterDocValues(value, context._index_keys)
                }))
                  .then(function () {
                    return id;
                  });
              });
          });
      });
  };

  IndexStorage2.prototype.remove = function (id) {
    var context = this;
    return context._sub_storage.remove(id)
      .push(function () {
        return waitForOpenIndexedDB(context._database_name, undefined,
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

  jIO.addStorage("index2", IndexStorage2);
}(indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, parseStringToObject));