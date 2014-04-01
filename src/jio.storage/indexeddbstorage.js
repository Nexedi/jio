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

  var Promise = RSVP.Promise;

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
    var status, request = indexedDB.open(this._database_name);
    // No request.abort() is provided so we cannot cancel database creation
    return new Promise(function (resolve, reject) {
      request.onupgradeneeded = function () {
        // If we reach this point, the database is created.
        // There is no way to cancel the operation from here.
        // So let's continue.
        var db = request.result;
        db.createObjectStore("metadata", {
          "keyPath": "_id"
        });
        status = "created";
      };
      request.onerror = function () {
        var db = request.result;
        if (db) { db.close(); }
        reject(request.error);
      };
      request.onsuccess = function () {
        request.result.close();
        resolve(status || "no_content");
      };
    });
  };

  // XXX doc string
  IndexedDBStorage.prototype.getMetadata = function (id) {
    var onCancel, request = indexedDB.open(this._database_name);
    return new Promise(function (resolve, reject) {
      request.onerror = function () {
        var db = request.result;
        reject(request.error);
        if (db) { db.close(); }
      };
      request.onsuccess = function () {
        try {
          var db, tx, store, getrequest;
          db = request.result;
          tx = db.transaction("metadata", "readonly");
          store = tx.objectStore("metadata");
          // we can cancel the transaction from here
          onCancel = function () {
            tx.abort();
            db.close();
          };
          getrequest = store.get(id);
          getrequest.onabort = function () {
            // if cancelled, the getrequest should fail
            reject(getrequest.error);
            db.close();
          };
          getrequest.onerror = getrequest.onabort;
          getrequest.onsuccess = function () {
            // if cancelled, this function should not be called
            if (!getrequest.result) {
              reject("not_found");
              return;
            }
            resolve(getrequest.result);
            db.close();
          };
        } catch (e) {
          reject(e);
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
    var onCancel, request = indexedDB.open(this._database_name);
    return new Promise(function (resolve, reject) {
      request.onerror = function () {
        var db = request.result;
        reject(request.error);
        if (db) { db.close(); }
      };
      request.onsuccess = function () {
        try {
          var db, tx, store;
          db = request.result;
          tx = db.transaction("metadata", "readwrite");
          store = tx.objectStore("metadata");
          // we can cancel the transaction from here
          onCancel = function () {
            tx.abort();
            db.close();
          };
          store.put(metadata);
          tx.oncomplete = function () {
            resolve();
            db.close();
          };
        } catch (e) {
          reject(e);
        }
      };
    }, function () {
      if (typeof onCancel === "function") {
        onCancel();
      }
    });
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

  jIO.addStorage("indexeddb", IndexedDBStorage);

}));
