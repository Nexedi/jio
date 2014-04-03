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
  }

  // XXX doc string
  function openRequestOnUpgradeNeeded(shared, event) {
    if (shared.aborted) { return; }
    shared.db = event.target.result;
    try {
      shared.store = shared.db.createObjectStore("metadata", {
        "keyPath": "_id"
        //"autoIncrement": true
      });
      // `createObjectStore` can throw InvalidStateError - open_req.onerror
      // and db.onerror won't be called.
      shared.store.createIndex("_id", "_id");
      // `store.createIndex` can throw an error
      shared.db_created = true;
      shared.store.transaction.oncomplete = function () {
        delete shared.store;
      };
    } catch (e) {
      shared.reject(e);
      shared.db.close();
      shared.aborted = true;
    }
  }

  IndexedDBStorage.prototype.createDBIfNecessary = function () {
    var shared = {}, open_req = indexedDB.open(this._database_name);
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
  IndexedDBStorage.prototype.getMetadata = function (id) {
    var onCancel, open_req = indexedDB.open(this._database_name);
    return new Promise(function (resolve, reject) {
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        // *Called at t + 1*
        var tx, store, get_req, err, res, db = open_req.result;
        try {
          db.onerror = function () {
            db.close();
          };
          tx = db.transaction("metadata", "readonly");
          // `db.transaction` can throw an error
          tx.onerror = function () {
            reject(err || tx.error);
            db.close();
          };
          tx.oncomplete = function () {
            // *Called at t + 3*
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
            db.close();
          };
          // we can cancel the transaction from here
          onCancel = function () {
            tx.abort();
            db.close();
          };
          store = tx.objectStore("metadata");
          get_req = store.get(id);
          get_req.onabort = function () {
            // if cancelled, the get_req should fail
            // and I hope the tx.onerror is called
            err = get_req.error;
          };
          get_req.onerror = get_req.onabort;
          get_req.onsuccess = function () {
            // *Called at t + 2*
            // if cancelled, this listener should not be called
            if (!get_req.result) {
              err = "not_found";
              return;
            }
            res = get_req.result;
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

  // XXX doc string
  IndexedDBStorage.prototype.putMetadata = function (metadata) {
    var onCancel, open_req = indexedDB.open(this._database_name);
    return new Promise(function (resolve, reject) {
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        // *Called at t + 1*
        var tx, store, db = open_req.result;
        try {
          tx = db.transaction("metadata", "readwrite");
          tx.onerror = function () {
            reject(tx.error);
            db.close();
          };
          tx.oncomplete = function () {
            // *Called at t + 3*
            resolve();
            db.close();
          };
          // we can cancel the transaction from here
          onCancel = function () {
            tx.abort();
            db.close();
          };
          store = tx.objectStore("metadata");
          store.put(metadata);
          // store.onsuccess = function () {
          //   // *Called at t + 2*
          // };
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

  // XXX doc string
  IndexedDBStorage.prototype.removeMetadata = function (id) {
    var onCancel, open_req = indexedDB.open(this._database_name);
    return new Promise(function (resolve, reject) {
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        // *Called at t + 1*
        var tx, store, db = open_req.result;
        try {
          tx = db.transaction("metadata", "readwrite");
          tx.onerror = function () {
            reject(tx.error);
            db.close();
          };
          tx.oncomplete = function () {
            // *Called at t + 3*
            resolve();
            db.close();
          };
          // we can cancel the transaction from here
          onCancel = function () {
            tx.abort();
            db.close();
          };
          store = tx.objectStore("metadata");
          store["delete"](id);
          // store.onsuccess = function () {
          //   // *Called at t + 2*
          // };
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

  // XXX doc string
  IndexedDBStorage.prototype.removeAttachments = function (id, attachment_ids) {
    /*jslint unparam: true */
    return new Promise(function (done) { done(); });
  };

  // XXX doc string
  IndexedDBStorage.prototype.get = function (command, param) {
    var shared = {"connector": this};
    new Promise(function (resolve, reject) {
      shared.reject = reject;

      // Open DB //
      var open_req = indexedDB.open(shared.connector._database_name);
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
      var open_req = indexedDB.open(shared.connector._database_name);
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
      var open_req = indexedDB.open(shared.connector._database_name);
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
      var open_req = indexedDB.open(shared.connector._database_name);
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

  // XXX doc string
  IndexedDBStorage.prototype.getList = function (option) {
    var rows = [], onCancel, open_req = indexedDB.open(this._database_name);
    return new Promise(function (resolve, reject, notify) {
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        var tx, store, index, date, index_req, db = open_req.result;
        try {
          tx = db.transaction("metadata", "readonly");
          onCancel = function () {
            tx.abort();
            db.close();
          };
          store = tx.objectStore("metadata");
          index = store.index("_id");

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
