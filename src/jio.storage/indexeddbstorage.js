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
 *      "database": <string>,
 *      "version": <number>, (default is `1`)
 *      "indices": <array of strings>
 *    }
 *
 * The database name will be prefixed by "jio:", so if the database property is
 * "hello", then you can manually reach this database with
 * `indexedDB.open("jio:hello", <version>);`. (Or
 * `indexedDB.deleteDatabase("jio:hello");`.)
 *
 * For more informations:
 *
 * - http://www.w3.org/TR/IndexedDB/
 * - https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB
 */

/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, module, require, indexedDB, jIO, RSVP */

(function (dependencies, factory) {
  "use strict";
  if (typeof define === "function" && define.amd) {
    return define(dependencies, factory);
  }
  if (typeof module === "object" && module !== null &&
      typeof module.exports === "object" && module.exports !== null &&
      typeof require === "function") {
    module.exports = factory.apply(null, dependencies.map(require));
    return;
  }
  factory(jIO, RSVP);
}(["jio", "rsvp"], function (jIO, RSVP) {
  "use strict";

  var Promise = RSVP.Promise, generateUuid = jIO.util.generateUuid;

  // XXX doc string
  function metadataObjectToString(value) {
    var i, l;
    if (Array.isArray(value)) {
      for (i = 0, l = value.length; i < l; i += 1) {
        value[i] = metadataObjectToString(value[i]);
      }
      return value;
    }
    if (typeof value === "object" && value !== null) {
      return value.content;
    }
    return value;
  }

  /**
   *     new IndexedDBStorage(description)
   *
   * Creates a storage object designed for jIO to store documents into
   * indexedDB.
   *
   * @class IndexedDBStorage
   * @constructor
   */
  function IndexedDBStorage(description) {
    if (typeof description.database !== "string" ||
        description.database === "") {
      throw new TypeError("IndexedDBStorage 'database' description property " +
                          "must be a non-empty string");
    }
    this._database_name = "jio:" + description.database;
    if (Array.isArray(description.indices)) {
      this._indices = description.indices;
    } else {
      this._indices = [];
    }
    if (typeof description.version === "number" &&
        isFinite(description.version)) {
      this._version = description.version;
    } else {
      this._version = 1;
    }
    function checkIndexedValue(indexed) {
      if (typeof indexed !== "string" || indexed === "") {
        throw new TypeError("IndexedDBStorage 'indices' must be an " +
                            "array of non empty strings.");
      }
    }
    var i, l, index;
    for (i = 0, l = this._indices.length; i < l; i += 1) {
      index = this._indices[i];
      if (!Array.isArray(index)) {
        index = [index];
      }
      index.forEach(checkIndexedValue);
    }
  }

  // XXX doc string
  function openRequestOnUpgradeNeeded(shared, event) {
    if (shared.aborted) { return; }
    shared.db = event.target.result;
    try {
      try {
        shared.store = shared.db.createObjectStore("metadata", {
          "keyPath": "_id"
          //"autoIncrement": true
        });
      } catch (e0) {
        // store already exists
        shared.store = event.target.transaction.objectStore("metadata");
      }
      // `createObjectStore` can throw InvalidStateError - open_req.onerror
      // and db.onerror won't be called.
      try {
        shared.store.createIndex("_id", "_id");
        // `store.createIndex` can throw an error
      } catch (ignore) {
        // index already exists
      }

      var i, l, index;
      for (i = 0, l = shared.connector._indices.length; i < l; i += 1) {
        index = shared.connector._indices[i];
        try {
          //console.log('creating index', JSON.stringify(index), index);
          shared.store.createIndex(JSON.stringify(index), index);
        } catch (ignore) {
          // index already exist
        }
      }

      try {
        shared.store = shared.db.createObjectStore("attachment", {
          "keyPath": ["id", "attachment"]
        });
      } catch (ignore) {
        // store already exists
      }

      try {
        shared.store.createIndex("id,attachment", ["id", "attachment"]);
      } catch (ignore) {
        // index already exist
      }

      shared.store.transaction.oncomplete = function () {
        delete shared.store;
      };

      shared.db_created = true;
    } catch (e) {
      shared.reject(e);
      shared.db.close();
      shared.aborted = true;
    }
  }

  IndexedDBStorage.prototype.createDBIfNecessary = function () {
    var shared = {"connector": this}, open_req = indexedDB.open(
      this._database_name,
      this._version
    );
    // No request.abort() is provided so we cannot cancel database creation
    return new Promise(function (resolve, reject) {
      shared.reject = reject;
      open_req.onupgradeneeded =
        openRequestOnUpgradeNeeded.bind(open_req, shared);
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        // *Called at t + 3*
        open_req.result.close();
        resolve(shared.db_created ? "created" : "no_content");
      };
    });
  };

  // XXX doc string
  IndexedDBStorage.prototype.get = function (command, param) {
    var shared = {"connector": this};
    new Promise(function (resolve, reject) {
      shared.reject = reject;

      // Open DB //
      var open_req = indexedDB.open(
        shared.connector._database_name,
        shared.connector._version
      );
      open_req.onerror = function (event) {
        reject(event.target.errorCode);
      };

      // Create DB if necessary //
      open_req.onupgradeneeded =
        openRequestOnUpgradeNeeded.bind(open_req, shared);

      open_req.onsuccess = function (event) {
        if (shared.aborted) { return; }
        try {
          shared.db = event.target.result;
          // Open transaction //
          shared.tx = shared.db.transaction("metadata", "readonly");
          shared.tx.onerror = function () {
            reject(shared.tx.error);
            shared.db.close();
          };
          shared.onCancel = function () {
            shared.tx.abort();
            shared.db.close();
          };

          // Get index //
          shared.store = shared.tx.objectStore("metadata");
          shared.index_request = shared.store.index("_id");

          // Get metadata //
          shared.index_request.get(param._id).onsuccess = function (event) {
            if (shared.aborted) { return; }
            if (event.target.result === undefined) {
              reject({"status": 404});
              return;
            }
            shared.final_result = {"data": event.target.result};
          };

          // Respond to jIO //
          shared.tx.oncomplete = function () {
            resolve(shared.final_result);
            shared.db.close();
          };
        } catch (e1) {
          reject(e1);
          shared.db.close();
        }
      };
    }).then(command.success, command.error, command.notify);
  };

  // XXX doc string
  IndexedDBStorage.prototype.post = function (command, metadata) {
    var shared = {"connector": this};
    if (!metadata._id) {
      metadata._id = generateUuid();
    }
    new Promise(function (resolve, reject) {
      shared.reject = reject;

      // Open DB //
      var open_req = indexedDB.open(
        shared.connector._database_name,
        shared.connector._version
      );
      open_req.onerror = function (event) {
        reject(event.target.errorCode);
      };

      // Create DB if necessary //
      open_req.onupgradeneeded =
        openRequestOnUpgradeNeeded.bind(open_req, shared);

      open_req.onsuccess = function (event) {
        if (shared.aborted) { return; }
        try {
          shared.db = event.target.result;
          // Open transaction //
          shared.tx = shared.db.transaction("metadata", "readwrite");
          shared.tx.onerror = function () {
            reject(shared.tx.error);
            shared.db.close();
          };
          shared.onCancel = function () {
            shared.tx.abort();
            shared.db.close();
          };

          // Get index //
          shared.store = shared.tx.objectStore("metadata");
          shared.index_request = shared.store.index("_id");

          // Get metadata //
          shared.index_request.get(metadata._id).onsuccess = function (event) {
            if (shared.aborted) { return; }
            if (event.target.result !== undefined) {
              shared.db.close();
              reject({"status": 409, "reason": "document already exist"});
              return;
            }
            delete metadata._attachments;
            // Push metadata //
            shared.store.put(metadata);
          };

          shared.tx.oncomplete = function () {
            // Respond to jIO //
            shared.db.close();
            resolve({"id": metadata._id});
          };
        } catch (e1) {
          reject(e1);
          shared.db.close();
        }
      };
    }).then(command.success, command.error, command.notify);
  };

  // XXX doc string
  IndexedDBStorage.prototype.put = function (command, metadata) {
    var shared = {"connector": this};
    new Promise(function (resolve, reject) {
      shared.reject = reject;

      // Open DB //
      var open_req = indexedDB.open(
        shared.connector._database_name,
        shared.connector._version
      );
      open_req.onerror = function (event) {
        reject(event.target.errorCode);
      };

      // Create DB if necessary //
      open_req.onupgradeneeded =
        openRequestOnUpgradeNeeded.bind(open_req, shared);

      open_req.onsuccess = function (event) {
        if (shared.aborted) { return; }
        try {
          shared.db = event.target.result;
          // Open transaction //
          shared.tx = shared.db.transaction("metadata", "readwrite");
          shared.tx.onerror = function () {
            reject(shared.tx.error);
            shared.db.close();
          };
          shared.onCancel = function () {
            shared.tx.abort();
            shared.db.close();
          };

          // Get index //
          shared.store = shared.tx.objectStore("metadata");
          shared.index = shared.store.index("_id");

          // Get metadata //
          shared.index.get(metadata._id).onsuccess = function (event) {
            if (shared.aborted) { return; }
            var i, l, key, array, data;
            if (event.target.result !== undefined) {
              shared.found = true;
              data = event.target.result;
              // Update metadata //
              array = Object.keys(metadata);
              for (i = 0, l = array.length; i < l; i += 1) {
                key = array[i];
                metadata[key] = metadataObjectToString(metadata[key]);
              }
              if (data._attachments) {
                metadata._attachments = data._attachments;
              }
            } else {
              delete metadata._attachments;
            }
            // Push metadata //
            shared.store.put(metadata);
          };

          shared.tx.oncomplete = function () {
            // Respond to jIO //
            shared.db.close();
            resolve({"status": shared.found ? 204 : 201});
          };
        } catch (e1) {
          reject(e1);
          shared.db.close();
        }
      };
    }).then(command.success, command.error, command.notify);
  };

  // XXX doc string
  IndexedDBStorage.prototype.remove = function (command, param) {
    var shared = {"connector": this};
    new Promise(function (resolve, reject) {
      shared.reject = reject;

      // Open DB //
      var open_req = indexedDB.open(
        shared.connector._database_name,
        shared.connector._version
      );
      open_req.onerror = function (event) {
        reject(event.target.errorCode);
      };

      // Create DB if necessary //
      open_req.onupgradeneeded =
        openRequestOnUpgradeNeeded.bind(open_req, shared);

      open_req.onsuccess = function (event) {
        if (shared.aborted) { return; }
        try {
          shared.db = event.target.result;
          // Open transaction //
          shared.tx = shared.db.transaction("metadata", "readwrite");
          shared.tx.onerror = function () {
            reject(shared.tx.error);
            shared.db.close();
          };
          shared.onCancel = function () {
            shared.tx.abort();
            shared.db.close();
          };

          // Get index //
          shared.store = shared.tx.objectStore("metadata");
          shared.index = shared.store.index("_id");

          // Get metadata //
          shared.index.get(param._id).onsuccess = function (event) {
            if (shared.aborted) { return; }
            if (event.target.result === undefined) {
              shared.db.close();
              reject({"status": 404});
              return;
            }
            // Delete metadata //
            shared.store["delete"](param._id);
            // XXX Delete attachments //
          };

          shared.tx.oncomplete = function () {
            // Respond to jIO //
            shared.db.close();
            resolve();
          };
        } catch (e1) {
          reject(e1);
          shared.db.close();
        }
      };
    }).then(command.success, command.error, command.notify);
  };

  function makeUnsupportedOptionsError(rejected_options) {
    throw {
      "status": 501,
      "error": "UnsupportedOptionError",
      "reason": "unsupported option",
      "arguments": rejected_options
    };
  }

  // XXX doc string
  IndexedDBStorage.prototype.getList = function (option) {
    var rejected_options = [], supported_options = {
      "limit": true,
      "select_list": true,
      "include_docs": true,
      "partial_query": true
    }, rows = [], onCancel, open_req, indexeddbstorage = this;
    Object.keys(option).forEach(function (opt) {
      if (!supported_options[opt]) {
        rejected_options.push(opt);
      }
    });
    if (rejected_options.length) {
      throw makeUnsupportedOptionsError(rejected_options);
    }
    open_req = indexedDB.open(this._database_name, this._version);
    return new Promise(function (resolve, reject, notify) {
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        var tx, store, index, date, index_req, db = open_req.result;
        try {
          if (option.partial_query !== undefined) {
            // translate query to a string like
            // "\"metadata\"" or "[\"metadata1\",\"metadata2\"]"
            option.partial_query =
              jIO.QueryFactory.create(option.partial_query);
            //console.log("original query (as object)", option.partial_query);
            if (option.partial_query.type === "simple") {
              option.partial_query = JSON.stringify(option.partial_query.key);
            } else if (option.partial_query.operator === "AND") {
              option.partial_query =
                JSON.stringify(
                  option.partial_query.query_list.map(function (query) {
                    if (query.type === "simple") {
                      return query.key;
                    }
                    throw makeUnsupportedOptionsError(["partial_query"]);
                  })
                );
            } else {
              throw makeUnsupportedOptionsError(["partial_query"]);
            }
            // choose good index according to translated query
            indexeddbstorage._indices.some(function (indexed) {
              indexed = JSON.stringify(indexed);
              if (indexed === option.partial_query) {
                index = indexed;
                return true;
              }
              return false;
            });
            if (index === undefined) {
              throw makeUnsupportedOptionsError(["partial_query"]);
            }
          }

          tx = db.transaction("metadata", "readonly");
          onCancel = function () {
            tx.abort();
            db.close();
          };
          store = tx.objectStore("metadata");
          //console.log('using index', index || "_id");
          index = store.index(index || "_id");

          index_req = index.openCursor();
          date = Date.now();
          index_req.onsuccess = function (event) {
            var cursor = event.target.result, now, value, i, key;
            if (cursor) {
              // Called for each matching record.

              // notification management
              now = Date.now();
              if (date <= now - 1000) {
                notify({"loaded": rows.length});
                date = now;
              }

              // option.limit management
              if (Array.isArray(option.limit)) {
                if (option.limit.length > 1) {
                  if (option.limit[0] > 0) {
                    option.limit[0] -= 1;
                    cursor["continue"]();
                    return;
                  }
                  if (option.limit[1] <= 0) {
                    // end
                    index_req.onsuccess({"target": {}});
                    return;
                  }
                  option.limit[1] -= 1;
                } else {
                  if (option.limit[0] <= 0) {
                    // end
                    index_req.onsuccess({"target": {}});
                    return;
                  }
                  option.limit[0] -= 1;
                }
              }

              value = {};
              // option.select_list management
              if (option.select_list) {
                for (i = 0; i < option.select_list.length; i += 1) {
                  key = option.select_list[i];
                  value[key] = cursor.value[key];
                }
              }

              // option.include_docs management
              if (option.include_docs) {
                rows.push({
                  "id": cursor.value._id,
                  "doc": cursor.value,
                  "value": value
                });
              } else {
                rows.push({
                  "id": cursor.value._id,
                  "value": value
                });
              }

              // continue to next iteration
              cursor["continue"]();
            } else {
              notify({"loaded": rows.length});
              // No more matching records.
              resolve({"data": {"rows": rows, "total_rows": rows.length}});
              db.close();
            }
          };
        } catch (e) {
          reject(e);
          db.close();
        }
      };
    }, function () {
      if (typeof onCancel === "function") {
        onCancel();
      }
    });
  };

  IndexedDBStorage.prototype.allDocs = function (command, param, option) {
    /*jslint unparam: true */
    this.createDBIfNecessary().
      then(this.getList.bind(this, option)).
      then(command.success, command.error, command.notify);
  };

  IndexedDBStorage.prototype.check = function (command) {
    command.success();
  };

  IndexedDBStorage.prototype.repair = function (command) {
    command.success();
  };

  jIO.addStorage("indexeddb", IndexedDBStorage);

}));
