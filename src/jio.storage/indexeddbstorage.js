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

/*jslint indent: 2, maxlen: 80 */
/*global define, module, indexedDB, jIO, RSVP */

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
  IndexedDBStorage.prototype.createDBIfNecessary = function () {
    var status, open_req = indexedDB.open(this._database_name);
    // No request.abort() is provided so we cannot cancel database creation
    return new Promise(function (resolve, reject) {
      open_req.onupgradeneeded = function () {
        // *Called at t + 1*
        var store, db = open_req.result;
        // If we reach this point, the database is created.
        // There is no way to cancel the operation from here.
        // So let's continue.
        try {
          store = db.createObjectStore("metadata", {
            "keyPath": "_id"
          });
          // `createObjectStore` can throw InvalidStateError - open_req.onerror
          // and db.onerror won't be called.
          store.createIndex("_id", "_id");
          // `store.createIndex` can throw an error
          status = "created";
          // store.transaction.oncomplete = function () {
          //   // *Called at t + 2*
          // };
        } catch (e) {
          reject(e);
          db.close();
        }
      };
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        // *Called at t + 3*
        open_req.result.close();
        resolve(status || "no_content");
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
          store.delete(id);
          // store.onsuccess = function () {
          //   // *Called at t + 2*
          // };
        } catch (e) {
          console.log(e);
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
    this.createDBIfNecessary().
      then(this.getMetadata.bind(this, param._id)).
      then(function (data) {
        command.success({"data": data});
      }, command.error, command.notify);
  };

  // XXX doc string
  IndexedDBStorage.prototype.post = function (command, metadata) {
    var promise;
    promise = this.createDBIfNecessary();
    if (metadata._id) {
      promise = promise.
        then(this.getMetadata.bind(this, metadata._id)).
        then(function () {
          throw "conflict";
        }, function (error) {
          if (error === "not_found") {
            return;
          }
          throw error;
        });
    } else {
      metadata._id = generateUuid();
    }
    promise.then(this.putMetadata.bind(this, metadata)).
      then(function () {
        command.success({"id": metadata._id});
      }, command.error, command.notify);
  };

  // XXX doc string
  IndexedDBStorage.prototype.put = function (command, metadata) {
    var status;
    this.createDBIfNecessary().
      then(this.getMetadata.bind(this, metadata._id)).
      then(null, function (error) {
        if (error === "not_found") {
          status = "created";
          return {};
        }
        throw error;
      }).
      then(function (data) {
        var i, l, key, array;
        array = Object.keys(metadata);
        for (i = 0, l = array.length; i < l; i += 1) {
          key = array[i];
          metadata[key] = metadataObjectToString(metadata[key]);
        }
        if (data._attachments) {
          metadata._attachments = data._attachments;
        }
      }).
      then(this.putMetadata.bind(this, metadata)).
      then(function () {
        command.success(status || "no_content");
      }, command.error, command.notify);
  };

  // XXX doc string
  IndexedDBStorage.prototype.remove = function (command, param) {
    var this_ = this;
    this.createDBIfNecessary().
      then(this.getMetadata.bind(this, param._id)).
      then(function (metadata) {
        var attachments = metadata._attachments, promise;
        promise = this_.removeMetadata(param._id);
        if (typeof attachments === "object" && attachments !== null) {
          promise.then(function (answer) {
            return this_.removeAttachments(
              param._id,
              Object.keys(attachments)
            ).then(null, function () { return; }).
              then(function () { return answer; });
          });
        }
        return promise;
      }).
      then(command.success, command.error, command.notify);
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
          index_req.onsuccess = function () {
            var cursor = index_req.result, now;
            if (cursor) {
              // Called for each matching record.
              if (option.include_docs) {
                rows.push({
                  "id": cursor.value._id,
                  "doc": cursor.value,
                  "value": {}
                });
              } else {
                rows.push({
                  "id": cursor.value._id,
                  "value": {}
                });
              }
              now = Date.now();
              if (date <= now - 1000) {
                notify({"loaded": rows.length});
                date = now;
              }
              cursor.continue();
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
