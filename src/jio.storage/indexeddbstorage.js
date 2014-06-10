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
/*global define, module, require, indexedDB, jIO, RSVP, Blob*/

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


  /**
   * creat 3 objectStores
   * @param {string} the name of the database
   */
  function openIndexedDB(db_name) {
    var request;
    function resolver(resolve, reject) {
      // Open DB //
      request = indexedDB.open(db_name);
      request.onerror = reject;

      // Create DB if necessary //
      request.onupgradeneeded = function (evt) {
        var db = evt.target.result,
          store;
        store = db.createObjectStore("metadata", {
          "keyPath": "_id"
           //"autoIncrement": true
        });
        store.createIndex("_id", "_id");


        store = db.createObjectStore("attachment", {
          "keyPath": "_id"
           //"autoIncrement": true
        });
        store.createIndex("_id", "_id");

        store = db.createObjectStore("blob", {
          "keyPath": ["_id", "_attachment"]
         //"autoIncrement": true
        });
        store.createIndex("_id_attachment", ["_id", "_attachment"]);
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
    }
    return new RSVP.Promise(resolver);
  }




  IndexedDBStorage.prototype.createDBIfNecessary = function () {
    return openIndexedDB(this._database_name);
  };

  /**
   *put a data into a store object
   *@param {ObjectStore} store The objectstore
   *@param {Object} metadata The data to put in
   *@return a new promise
   */
  function putIndexedDB(store, metadata, readData) {
    var request,
      resolver;
    try {
      request = store.put(metadata);
      resolver = function (resolve, reject) {
        request.onerror = reject;
        request.onsuccess = function () {
          resolve(metadata);
        };
      };
      return new RSVP.Promise(resolver);
    } catch (e) {
      return putIndexedDB(store, {"_id": metadata._id,
                                  "_attachment" : metadata._attachment,
                                  "blob": readData});
    }
  }




  /**
   * get a data from a store object
   * @param {ObjectStore} store The objectstore
   * @param {String} id The data id
   * return a new promise
   */
  function getIndexedDB(store, id) {
    function resolver(resolve, reject) {
      var request = store.get(id);
      request.onerror = reject;
      request.onsuccess = function () {
        resolve(request.result);
      };
    }
    return new RSVP.Promise(resolver);
  }

  /**
   * delete a data of a store object
   * @param {ObjectStore} store The objectstore
   * @param {String} id The data id
   * @return a new promise
   *
   */
  function removeIndexedDB(store, id) {
    function resolver(resolve, reject) {
      var request = store["delete"](id);
      request.onerror = reject;
      request.onsuccess = resolve;
    }
    return new RSVP.Promise(resolver);
  }

  /**
   * research an id in a store
   * @param {ObjectStore} store The objectstore
   * @param {String} id The index id
   * @param {var} researchID The data id
   * return a new promise
   */
  function researchIndexedDB(store, id, researchID) {
    function resolver(resolve) {
      var index = store.index(researchID);
      index.get(id).onsuccess = function (evt) {
        resolve({"result" : evt.target.result, "store": store});
      };
    }
    return new RSVP.Promise(resolver);
  }


  function promiseResearch(transaction, id, table, researchID) {
    var store = transaction.objectStore(table);
    return researchIndexedDB(store, id, researchID);
  }

  /**
   * put or post a metadata into objectstore:metadata,attachment
   * @param {function} open The function to open a basedata
   * @param {function} research The function to reserach
   * @param {function} ongoing  The function to process
   * @param {function} end      The completed function
   * @param {Object}  command   The JIO command
   * @param {Object}  metadata  The data to put
   */
  IndexedDBStorage.prototype._putOrPost =
        function (open, research, ongoing, end, command, metadata) {
      var jio_storage = this,
        transaction,
        global_db,
        result;

      new RSVP.Queue()
        .push(function () {
          //open a database
          return open(jio_storage._database_name);
        })
        .push(function (db) {
          global_db = db;
          transaction =  db.transaction(["metadata",
                                         "attachment"], "readwrite");
          //research in metadata
          return research(transaction, metadata._id, "metadata", "_id");
        })
        .push(function (researchResult) {
          return ongoing(researchResult);
        })
        .push(function (ongoingResult) {
          //research in attachment
          result = ongoingResult;
          return research(transaction, metadata._id, "attachment", "_id");
        })
        .push(function (researchResult) {
          //create an id in attachment si necessary
          if (researchResult.result === undefined) {
            putIndexedDB(researchResult.store, {"_id": metadata._id});
          } else {
            return end(result);
          }
        })
        .push(function () {
          return end(result);
        })
        .push(undefined, function (error) {
          // Check if transaction is ongoing, if so, abort it
          if (transaction !== undefined) {
            transaction.abort();
          }
          if (global_db !== undefined) {
            global_db.close();
          }
          throw error;
        })
        .push(command.success, command.error, command.notify);
    };




  /**
   * Retrieve data
   *
   *@param {Object} command The JIO command
   *@param {Object} param The command parameters
   */
  IndexedDBStorage.prototype.get = function (command, param) {
    var jio_storage = this,
      transaction,
      global_db,
      meta;
    new RSVP.Queue()
      .push(function () {
        return openIndexedDB(jio_storage._database_name);
      })
      .push(function (db) {
        global_db = db;
        transaction =  db.transaction(["metadata", "attachment"], "readwrite");
        var store = transaction.objectStore("metadata");
        return getIndexedDB(store, param._id);
      })
      .push(function (result) {
        if (result) {
         //get a part data from metadata
          meta = result;
          var store = transaction.objectStore("attachment");
          return getIndexedDB(store, param._id);
        }
        throw ({"status": 404, "reason": "Not Found",
                "message": "IndexeddbStorage, unable to get document."});
      })
      .push(function (result) {
        //get the reste data from attachment
        if (result._attachment) {
          meta._attachment = result._attachment;
        }
        return ({"data": meta});
      })
      .push(undefined, function (error) {
        // Check if transaction is ongoing, if so, abort it
        if (transaction !== undefined) {
          transaction.abort();
        }
        if (global_db !== undefined) {
          global_db.close();
        }
        throw error;
      })
      .push(command.success, command.error, command.notify);
  };


  /**
   * Remove a document
   *
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   */
  IndexedDBStorage.prototype.remove = function (command, param) {
    var jio_storage = this,
      transaction,
      global_db,
      queue = new RSVP.Queue();
    queue.push(function () {
      return openIndexedDB(jio_storage._database_name);
    })
        .push(function (db) {
        global_db = db;
        transaction =  db.transaction(["metadata",
                                       "attachment", "blob"], "readwrite");
        return promiseResearch(transaction, param._id, "metadata", "_id");
      })
       .push(function (resultResearch) {
        if (resultResearch.result === undefined) {
          throw ({"status": 404, "reason": "Not Found",
                  "message": "IndexeddbStorage, unable to get metadata."});
        }
        //delete metadata
        return removeIndexedDB(resultResearch.store, param._id);
      })
       .push(function () {
        var store = transaction.objectStore("attachment");
        return getIndexedDB(store, param._id);
      })
       .push(function (result) {
        if (result._attachment) {
          var i, l, key, array, func, store;
          array = Object.keys(result._attachment);
          store = transaction.objectStore("blob");
          for (i = 0, l = array.length; i < l; i += 1) {
            key = array[i];
            //delete blob
            func = removeIndexedDB(store, [param._id, key]);
            queue.push(func);
          }
        }
      })
        .push(function () {
        var store = transaction.objectStore("attachment");
        //delete attachment
        return removeIndexedDB(store, param._id);
      })
        .push(function () {
        return ({"status": 204});
      })
        .push(undefined, function (error) {
        // Check if transaction is ongoing, if so, abort it
        if (transaction !== undefined) {
          transaction.abort();
        }
        if (global_db !== undefined) {
          global_db.close();
        }
        throw error;
      })
        .push(command.success, command.error, command.notify);
  };



  /**
   * Creates a new document if not already existes
   * @param {Object} command The JIO command
   * @param {Object} metadata The metadata to put
   */
  IndexedDBStorage.prototype.post = function (command, metadata) {
    var that = this;
    if (!metadata._id) {
      metadata._id = generateUuid();
    }
    function promiseOngoingPost(researchResult) {
      if (researchResult.result === undefined) {
        delete metadata._attachment;
        return putIndexedDB(researchResult.store, metadata);
      }
      throw ({"status": 409, "reason": "Document exists"});
    }

    function promiseEndPost(metadata) {
      return ({"id": metadata._id});
    }

    that._putOrPost(openIndexedDB, promiseResearch,
                            promiseOngoingPost, promiseEndPost,
                            command, metadata);

  };
  /**
   * Creates or updates a document
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to post
   */
  IndexedDBStorage.prototype.put = function (command, metadata) {
    var that = this,
      found;
    function promiseOngoingPut(researchResult) {
      var key;
      for (key in metadata) {
        if (metadata.hasOwnProperty(key)) {
          metadata[key] = metadataObjectToString(metadata[key]);
        }
      }
      delete metadata._attachment;
      if (researchResult.result !== undefined) {
        found = true;
      }
      return putIndexedDB(researchResult.store, metadata);
    }

    function promiseEndPut() {
      return {"status": (found ? 204 : 201) };
    }
    that._putOrPost(openIndexedDB, promiseResearch,
                  promiseOngoingPut, promiseEndPut,
                  command, metadata);

  };




  /**
   * Retrieve a list of present document
   *
   * @method allDocs
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} options The command options
   * @param  {Boolean} [options.include_docs=false]
   *   Also retrieve the actual document content.
   */
  IndexedDBStorage.prototype.getListMetadata = function (option) {
    var rows = [], onCancel, open_req = indexedDB.open(this._database_name);
    return new Promise(function (resolve, reject, notify) {
      open_req.onerror = function () {
        if (open_req.result) { open_req.result.close(); }
        reject(open_req.error);
      };
      open_req.onsuccess = function () {
        var tx, date, j = 0, index_req, db = open_req.result;
        try {
          tx = db.transaction(["metadata", "attachment"], "readonly");
          onCancel = function () {
            tx.abort();
            db.close();
          };
          index_req = tx.objectStore("metadata").index("_id").openCursor();
          date = Date.now();
          index_req.onsuccess = function (event) {
            var cursor = event.target.result, now, value, i, key;
            if (cursor) {
              // Called for each matching record
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
              index_req = tx.objectStore("attachment").
                    index("_id").openCursor();
              index_req.onsuccess = function (event) {
                //second table
                cursor = event.target.result;
                if (cursor) {
                  value = {};
                  if (cursor.value._attachment) {
                    if (option.select_list) {
                      for (i = 0; i < option.select_list.length; i += 1) {
                        key = option.select_list[i];
                        value[key] = cursor.value._attachment[key];
                      }
                    }
                    //add info of attachment into metadata
                    rows[j].value._attachment = value;
                    if (option.include_docs) {
                      rows[j].doc._attachment = cursor.value._attachment;
                    }
                  }
                  j += 1;
                  cursor["continue"]();
                } else {
                  notify({"loaded": rows.length});
                  resolve({"data": {"rows": rows, "total_rows": rows.length}});
                  db.close();
                }
              };
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


  /**
   * Add an attachment to a document
   *
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The data
   *
   */
  IndexedDBStorage.prototype.putAttachment = function (command, metadata) {
    var jio_storage = this,
      transaction,
      global_db,
      BlobInfo,
      readResult;
    jIO.util.readBlobAsArrayBuffer(metadata._blob)
      .then(function (event) {
        readResult = event.target.result;
        BlobInfo = {
          "content_type": metadata._blob.type,
          "length": metadata._blob.size
        };
        new RSVP.Queue()
            .push(function () {
            return openIndexedDB(jio_storage._database_name);
          })
            .push(function (db) {
            global_db = db;
            transaction = db.transaction(["attachment",
                    "blob"], "readwrite");
            return promiseResearch(transaction,
                                   metadata._id, "attachment", "_id");
          })
            .push(function (researchResult) {
            if (researchResult.result === undefined) {
              throw ({"status": 404, "reason": "Not Found",
                "message": "indexeddbStorage unable to put attachment"});
            }
        //update attachment
            researchResult.result._attachment = researchResult.
                result._attachment || {};
            researchResult.result._attachment[metadata._attachment] =
                    (BlobInfo === undefined) ? "BlobInfo" : BlobInfo;
            return putIndexedDB(researchResult.store, researchResult.result);
          })
          .push(function () {
        //put in blob
            var store = transaction.objectStore("blob");
            return putIndexedDB(store, {"_id": metadata._id,
              "_attachment" : metadata._attachment,
              "blob": metadata._blob}, readResult);
          }).push(function () {
            return {"status": 204};
          })
          .push(undefined, function (error) {
        // Check if transaction is ongoing, if so, abort it
            if (transaction !== undefined) {
              transaction.abort();
            }
            if (global_db !== undefined) {
              global_db.close();
            }
            throw error;
          })
            .push(command.success, command.error, command.notify);
      });
  };



  /**
   * Retriev a document attachment
   *
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameter
   */
  IndexedDBStorage.prototype.getAttachment = function (command, param) {
    var jio_storage = this,
      transaction,
      global_db,
      _id_attachment = [param._id, param._attachment];
    new RSVP.Queue()
            .push(function () {
        return openIndexedDB(jio_storage._database_name);
      })
            .push(function (db) {
        global_db = db;
        transaction = db.transaction(["blob"], "readwrite");
        //check if the attachment exists
        return promiseResearch(transaction, _id_attachment,
               "blob", "_id_attachment");
      })
            .push(function (researchResult) {
        if (researchResult.result === undefined) {
          throw ({"status": 404, "reason": "missing attachment",
            "message": "IndexeddbStorage, unable to get attachment."});
        }
        return getIndexedDB(researchResult.store, _id_attachment);
      })
        .push(function (result) {
          //get data
        if (result.blob.byteLength !== undefined) {
          result.blob = new Blob([result.blob],
                                {type: "text/plain"});
        }
        return ({ "data": result.blob});
      })
      .push(undefined, function (error) {
        // Check if transaction is ongoing, if so, abort it
        if (transaction !== undefined) {
          transaction.abort();
        }
        if (global_db !== undefined) {
          global_db.close();
        }
        throw error;
      })
            .push(command.success, command.error, command.notify);
  };


  /**
   * Remove an attachment
   *
   * @method removeAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   */
  IndexedDBStorage.prototype.removeAttachment = function (command, param) {
    var jio_storage = this,
      transaction,
      global_db,
      _id_attachment = [param._id, param._attachment];
    new RSVP.Queue()
        .push(function () {
        return openIndexedDB(jio_storage._database_name);
      })
        .push(function (db) {
        global_db = db;
        transaction = db.transaction(["attachment", "blob"], "readwrite");
        //check if the attachment exists
        return promiseResearch(transaction, _id_attachment,
                               "blob", "_id_attachment");
      })
        .push(function (researchResult) {
        if (researchResult.result === undefined) {
          throw ({"status": 404, "reason": "missing attachment",
                  "message":
                  "IndexeddbStorage, document attachment not found."});
        }
        return removeIndexedDB(researchResult.store, _id_attachment);
      })
       .push(function () {
        //updata attachment
        var store = transaction.objectStore("attachment");
        return getIndexedDB(store, param._id);
      })
       .push(function (result) {
        delete result._attachment[param._attachment];
        var store = transaction.objectStore("attachment");
        return putIndexedDB(store, result);
      })
       .push(function () {
        return ({ "status": 204 });
      })
       .push(undefined, function (error) {
        // Check if transaction is ongoing, if so, abort it
        if (transaction !== undefined) {
          transaction.abort();
        }
        if (global_db !== undefined) {
          global_db.close();
        }
        throw error;
      })
        .push(command.success, command.error, command.notify);
  };


  IndexedDBStorage.prototype.allDocs = function (command, param, option) {
    /*jslint unparam: true */
    this.createDBIfNecessary().
      then(this.getListMetadata.bind(this, option)).
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
