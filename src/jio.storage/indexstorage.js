/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, regexp: true */
/*global jIO: true, localStorage: true, define: true, complex_queries: true */

/**
 * JIO Index Storage.
 * Manages indexes for specified storages.
 * Description:
 * {
 *   "type": "index",
 *   "indices": [{
 *     "id": "index_title_subject.json", // doc id where to store indices
 *     "index": ["title", "subject"] // metadata to index
 *     "sub_storage": <sub storage where to store index>
 *                    (default equal to parent sub_storage field)
 *   }, {
 *     "id": "index_year.json",
 *     "index": "year"
 *     ...
 *   }],
 *   "sub_storage": <sub storage description>
 * }
 *
 * Sent document metadata will be:
 * index_titre_subject.json
 * {
 *   "_id": "index_title_subject.json",
 *   "indexing": ["title", "subject"],
 *   "free": [0],
 *   "location": {
 *     "foo": 1,
 *     "bar": 2,
 *     ...
 *   },
 *   "database": [
 *     {},
 *     {"_id": "foo", "title": "...", "subject": ...},
 *     {"_id": "bar", "title": "...", "subject": ...},
 *     ...
 *   ]
 * }
 *
 * index_year.json
 * {
 *   "_id": "index_year.json",
 *   "indexing": ["year"],
 *   "free": [1],
 *   "location": {
 *     "foo": 0,
 *     "bar": 2,
 *     ...
 *   },
 *   "database": [
 *     {"_id": "foo", "year": "..."},
 *     {},
 *     {"_id": "bar", "year": "..."},
 *     ...
 *   ]
 * }
 *
 * A put document will be indexed to the free location if exist, else it will be
 * indexed at the end of the database. The document id will be indexed, also, in
 * 'location' to quickly replace metadata.
 *
 * Only one or two loops are executed:
 * - one to filter retrieved document list (no query -> no loop)
 * - one to format the result to a JIO response
 */
(function () {
  "use strict";

  var error_dict = {
    "Corrupted Index": {
      "status": 24,
      "statusText": "Corrupt",
      "error": "corrupt",
      "reason": "corrupted index database"
    },
    "Corrupted Metadata": {
      "status": 24,
      "statusText": "Corrupt",
      "error": "corrupt",
      "reason": "corrupted document"
    },
    "Not Found": {
      "status": 404,
      "statusText": "Not Found",
      "error": "not_found",
      "reason": "missing document"
    },
    "Conflict": {
      "status": 409,
      "statusText": "Conflicts",
      "error": "conflicts",
      "reason": "already exist"
    },
    "Different Index": {
      "status": 40,
      "statusText": "Check failed",
      "error": "check_failed",
      "reason": "incomplete database"
    }
  };

  /**
   * Generate a JIO Error Object
   *
   * @method generateErrorObject
   * @param  {String} name The error name
   * @param  {String} message The error message
   * @param  {String} [reason] The error reason
   * @return {Object} A jIO error object
   */
  function generateErrorObject(name, message, reason) {
    if (!error_dict[name]) {
      return {
        "status": 0,
        "statusText": "Unknown",
        "error": "unknown",
        "message": message,
        "reason": reason || "unknown"
      };
    }
    return {
      "status": error_dict[name].status,
      "statusText": error_dict[name].statusText,
      "error": error_dict[name].error,
      "message": message,
      "reason": reason || error_dict[name].reason
    };
  }

  /**
   * Get the real type of an object
   * @method type
   * @param  {Any} value The value to check
   * @return {String} The value type
   */
  function type(value) {
    // returns "String", "Object", "Array", "RegExp", ...
    return (/^\[object ([a-zA-Z]+)\]$/).exec(
      Object.prototype.toString.call(value)
    )[1];
  }

  /**
   * Generate a new uuid
   * @method generateUuid
   * @return {string} The new uuid
   */
  function generateUuid() {
    var S4 = function () {
      var i, string = Math.floor(
        Math.random() * 0x10000 /* 65536 */
      ).toString(16);
      for (i = string.length; i < 4; i += 1) {
        string = "0" + string;
      }
      return string;
    };
    return S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();
  }

  /**
   * A JSON Index manipulator
   *
   * @class JSONIndex
   * @constructor
   */
  function JSONIndex(spec) {
    var that = this;
    spec = spec || {};

    /**
     * The document id
     *
     * @property _id
     * @type String
     */
    that._id = spec._id;

    /**
     * The array with metadata key to index
     *
     * @property _indexing
     * @type Array
     */
    that._indexing = spec.indexing || [];

    /**
     * The array of free location index
     *
     * @property _free
     * @type Array
     * @default []
     */
    that._free = spec.free || [];

    /**
     * The dictionnary document id -> database index
     *
     * @property _location
     * @type Object
     * @default {}
     */
    that._location = spec.location || {};

    /**
     * The database array containing document metadata
     *
     * @property _database
     * @type Array
     * @default []
     */
    that._database = spec.database || [];

    /**
     * Adds a metadata object in the database, replace if already exist
     *
     * @method put
     * @param  {Object} meta The metadata to add
     * @return {Boolean} true if added, false otherwise
     */
    that.put = function (meta) {
      var underscored_meta_re = /^_.*$/, k, needed_meta = {}, ok = false;
      if (typeof meta._id !== "string" && meta._id !== "") {
        throw new TypeError("Corrupted Metadata");
      }
      for (k in meta) {
        if (meta.hasOwnProperty(k)) {
          if (underscored_meta_re.test(k)) {
            if (k === "_id") {
              needed_meta[k] = meta[k];
            }
          } else if (that._indexing_object[k]) {
            needed_meta[k] = meta[k];
            ok = true;
          }
        }
      }
      if (ok) {
        if (typeof that._location[meta._id] === "number") {
          that._database[that._location[meta._id]] = needed_meta;
        } else if (that._free.length > 0) {
          k = that._free.shift();
          that._database[k] = needed_meta;
          that._location[meta._id] = k;
        } else {
          that._database.push(needed_meta);
          that._location[meta._id] = that._database.length - 1;
        }
        return true;
      }
      if (typeof that._location[meta._id] === "number") {
        that.remove(meta);
      }
      return false;
    };

    /**
     * Removes a metadata object from the database if exist
     *
     * @method remove
     * @param  {Object} meta The metadata to remove
     */
    that.remove = function (meta) {
      if (typeof meta._id !== "string") {
        throw new TypeError("Corrupted Metadata");
      }
      if (typeof that._location[meta._id] !== "number") {
        throw new ReferenceError("Not Found");
      }
      that._database[that._location[meta._id]] = null;
      that._free.push(that._location[meta._id]);
      delete that._location[meta._id];
    };

    /**
     * Checks if the index database document is correct
     *
     * @method check
     */
    that.check = function () {
      var id, database_meta;
      if (typeof that._id !== "string" ||
          that._id === "" ||
          type(that._free) !== "Array" ||
          type(that._indexing) !== "Array" ||
          type(that._location) !== "Object" ||
          type(that._database) !== "Array" ||
          that._indexing.length === 0) {
        throw new TypeError("Corrupted Index");
      }
      for (id in that._location) {
        if (that._location.hasOwnProperty(id)) {
          database_meta = that._database[that._location[id]];
          if (type(database_meta) !== "Object" ||
              database_meta._id !== id) {
            throw new TypeError("Corrupted Index");
          }
        }
      }
    };

    that.equals = function (json_index) {
      function equalsDirection(a, b) {
        var k;
        for (k in a._location) {
          if (a._location.hasOwnProperty(k)) {
            if (b._location[k] === undefined ||
                JSON.stringify(b._database[b._location[k]]) !==
                JSON.stringify(a._database[a._location[k]])) {
              return false;
            }
          }
        }
        return true;
      }
      if (!equalsDirection(that, json_index)) {
        return false;
      }
      if (!equalsDirection(json_index, that)) {
        return false;
      }
      return true;
    };

    that.checkDocument = function (doc) {
      var i, key, db_doc;
      if (typeof that._location[doc._id] !== "number" ||
          (db_doc = that._database(that._location[doc._id])._id) !== doc._id) {
        throw new TypeError("Different Index");
      }
      for (i = 0; i < that._indexing.length; i += 1) {
        key = that._indexing[i];
        if (doc[key] !== db_doc[key]) {
          throw new TypeError("Different Index");
        }
      }
    };

    /**
     * Recreates database indices and remove free space
     *
     * @method repair
     */
    that.repair = function () {
      var i = 0, meta;
      that._free = [];
      that._location = {};
      if (type(that._database) !== "Array") {
        that._database = [];
      }
      while (i < that._database.length) {
        meta = that._database[i];
        if (type(meta) === "Object" &&
            typeof meta._id === "string" && meta._id !== "" &&
            !that._location[meta._id]) {
          that._location[meta._id] = i;
          i += 1;
        } else {
          that._database.splice(i, 1);
        }
      }
    };

    /**
     * Returns the serialized version of this object (not cloned)
     *
     * @method serialized
     * @return {Object} The serialized version
     */
    that.serialized = function () {
      return {
        "_id": that._id,
        "indexing": that._indexing,
        "free": that._free,
        "location": that._location,
        "database": that._database
      };
    };

    that.check();
    that._indexing_object = {};
    that._indexing.forEach(function (meta_key) {
      that._indexing_object[meta_key] = true;
    });
  }

  /**
   * The JIO index storage constructor
   */
  function indexStorage(spec, my) {
    var that, priv = {};

    that = my.basicStorage(spec, my);

    priv.indices = spec.indices;
    priv.sub_storage = spec.sub_storage;

    // Overrides

    that.specToStore = function () {
      return {
        "indices": priv.indices,
        "sub_storage": priv.sub_storage
      };
    };

    /**
     * Return the similarity percentage (1 >= p >= 0) between two index lists.
     *
     * @method similarityPercentage
     * @param  {Array} list_a An index list
     * @param  {Array} list_b Another index list
     * @return {Number} The similarity percentage
     */
    priv.similarityPercentage = function (list_a, list_b) {
      var ai, bi, count = 0;
      for (ai = 0; ai < list_a.length; ai += 1) {
        for (bi = 0; bi < list_b.length; bi += 1) {
          if (list_a[ai] === list_b[bi]) {
            count += 1;
          }
        }
      }
      return count / (list_a.length > list_b.length ?
                      list_a.length : list_b.length);
    };

    /**
     * Select the good index to use according to a select list.
     *
     * @method selectIndex
     * @param  {Array} select_list An array of strings
     * @return {Number} The index index
     */
    priv.selectIndex = function (select_list) {
      var i, tmp, selector = {"index": 0, "similarity": 0};
      for (i = 0; i < priv.indices.length; i += 1) {
        tmp = priv.similarityPercentage(select_list,
                                        priv.indices[i].index);
        if (tmp > selector.similarity) {
          selector.index = i;
          selector.similarity = tmp;
        }
      }
      return selector.index;
    };

    /**
     * Get a database
     *
     * @method getIndexDatabase
     * @param  {Object} option The command option
     * @param  {Number} number The location in priv.indices
     * @param  {Function} callback The callback
     */
    priv.getIndexDatabase = function (option, number, callback) {
      that.addJob(
        "get",
        priv.indices[number].sub_storage || priv.sub_storage,
        {"_id": priv.indices[number].id},
        option,
        function (response) {
          callback(new JSONIndex(response));
        },
        function (err) {
          if (err.status === 404) {
            callback(new JSONIndex({
              "_id": priv.indices[number].id,
              "indexing": priv.indices[number].index
            }));
            return;
          }
          err.message = "Unable to get index database.";
          that.error(err);
        }
      );
    };

    /**
     * Gets a list containing all the databases set in the storage description.
     *
     * @method getIndexDatabaseList
     * @param  {Object} option The command option
     * @param  {Function} callback The result callback(database_list)
     */
    priv.getIndexDatabaseList = function (option, callback) {
      var i, count = 0, callbacks = {}, response_list = [];
      callbacks.error = function (index) {
        return function (err) {
          if (err.status === 404) {
            response_list[index] = new JSONIndex({
              "_id": priv.indices[index].id,
              "indexing": priv.indices[index].index
            });
            count += 1;
            if (count === priv.indices.length) {
              callback(response_list);
            }
            return;
          }
          err.message = "Unable to get index database.";
          that.error(err);
        };
      };
      callbacks.success = function (index) {
        return function (response) {
          response_list[index] = new JSONIndex(response);
          count += 1;
          if (count === priv.indices.length) {
            callback(response_list);
          }
        };
      };
      for (i = 0; i < priv.indices.length; i += 1) {
        that.addJob(
          "get",
          priv.indices[i].sub_storage || priv.sub_storage,
          {"_id": priv.indices[i].id},
          option,
          callbacks.success(i),
          callbacks.error(i)
        );
      }
    };

    /**
     * Saves all the databases to the remote(s).
     *
     * @method storeIndexDatabaseList
     * @param  {Array} database_list The database list
     * @param  {Object} option The command option
     * @param  {Function} callback The result callback(err, response)
     */
    priv.storeIndexDatabaseList = function (database_list, option, callback) {
      var i, count = 0, count_max = 0, onResponse, onError;
      onResponse = function (response) {
        count += 1;
        if (count === count_max) {
          callback({"ok": true});
        }
      };
      onError = function (err) {
        err.message = "Unable to store index database.";
        that.error(err);
      };
      for (i = 0; i < priv.indices.length; i += 1) {
        if (database_list[i] !== undefined) {
          count_max += 1;
          that.addJob(
            "put",
            priv.indices[i].sub_storage || priv.sub_storage,
            database_list[i].serialized(),
            option,
            onResponse,
            onError
          );
        }
      }
    };

    /**
     * A generic request method which delegates the request to the sub storage.
     * On response, it will index the document from the request and update all
     * the databases.
     *
     * @method genericRequest
     * @param  {Command} command The JIO command
     * @param  {Function} method The request method
     */
    priv.genericRequest = function (command, method) {
      var doc = command.cloneDoc(), option = command.cloneOption();
      that.addJob(
        method,
        priv.sub_storage,
        doc,
        option,
        function (response) {
          switch (method) {
          case "post":
          case "put":
          case "remove":
            doc._id = response.id;
            priv.getIndexDatabaseList(option, function (database_list) {
              var i;
              switch (method) {
              case "post":
              case "put":
                for (i = 0; i < database_list.length; i += 1) {
                  database_list[i].put(doc);
                }
                break;
              case "remove":
                for (i = 0; i < database_list.length; i += 1) {
                  database_list[i].remove(doc);
                }
                break;
              default:
                break;
              }
              priv.storeIndexDatabaseList(database_list, option, function () {
                that.success({"ok": true, "id": doc._id});
              });
            });
            break;
          default:
            that.success(response);
            break;
          }
        },
        function (err) {
          return that.error(err);
        }
      );
    };

    /**
     * Post the document metadata and update the index
     * @method post
     * @param  {object} command The JIO command
     */
    that.post = function (command) {
      priv.genericRequest(command, 'post');
    };

    /**
     * Update the document metadata and update the index
     * @method put
     * @param  {object} command The JIO command
     */
    that.put = function (command) {
      priv.genericRequest(command, 'put');
    };

    /**
     * Add an attachment to a document (no index modification)
     * @method putAttachment
     * @param  {object} command The JIO command
     */
    that.putAttachment = function (command) {
      priv.genericRequest(command, 'putAttachment');
    };

    /**
     * Get the document metadata
     * @method get
     * @param  {object} command The JIO command
     */
    that.get = function (command) {
      priv.genericRequest(command, 'get');
    };

    /**
     * Get the attachment.
     * @method getAttachment
     * @param  {object} command The JIO command
     */
    that.getAttachment = function (command) {
      priv.genericRequest(command, 'getAttachment');
    };

    /**
     * Remove document - removing documents updates index!.
     * @method remove
     * @param  {object} command The JIO command
     */
    that.remove = function (command) {
      priv.genericRequest(command, 'remove');
    };

    /**
     * Remove attachment
     * @method removeAttachment
     * @param  {object} command The JIO command
     */
    that.removeAttachment = function (command) {
      priv.genericRequest(command, 'removeAttachment');
    };

    /**
     * Gets a document list from the substorage
     * Options:
     * - {boolean} include_docs Also retrieve the actual document content.
     * @method allDocs
     * @param  {object} command The JIO command
     */
    that.allDocs = function (command) {
      var option = command.cloneOption(),
        index = priv.selectIndex(option.select_list || []);
      // Include docs option is ignored, if you want to get all the document,
      // don't use index storage!

      option.select_list = option.select_list || [];
      option.select_list.push("_id");
      priv.getIndexDatabase(option, index, function (db) {
        var i, id;
        db = db._database;
        complex_queries.QueryFactory.create(option.query || '').
          exec(db, option);
        for (i = 0; i < db.length; i += 1) {
          id = db[i]._id;
          delete db[i]._id;
          db[i] = {
            "id": id,
            "key": id,
            "value": db[i],
          };
        }
        that.success({"total_rows": db.length, "rows": db});
      });
    };

    that.check = function (command) {
      that.repair(command, true);
    };

    priv.repairIndexDatabase = function (command, index, just_check) {
      var i, option = command.cloneOption();
      that.addJob(
        'allDocs',
        priv.sub_storage,
        {},
        {'include_docs': true},
        function (response) {
          var db_list = [], db = new JSONIndex({
            "_id": command.getDocId(),
            "indexing": priv.indices[index].index
          });
          for (i = 0; i < response.rows.length; i += 1) {
            db.put(response.rows[i].doc);
          }
          db_list[index] = db;
          if (just_check) {
            priv.getIndexDatabase(option, index, function (current_db) {
              if (db.equals(current_db)) {
                return that.success({"ok": true, "_id": command.getDocId()});
              }
              return that.error(generateErrorObject(
                "Different Index",
                "Check failed",
                "corrupt index database"
              ));
            });
          } else {
            priv.storeIndexDatabaseList(db_list, {}, function () {
              that.success({"ok": true, "_id": command.getDocId()});
            });
          }
        },
        function (err) {
          err.message = "Unable to repair the index database";
          that.error(err);
        }
      );
    };

    priv.repairDocument = function (command, just_check) {
      var i, option = command.cloneOption();
      that.addJob(
        "get",
        priv.sub_storage,
        command.cloneDoc(),
        {},
        function (response) {
          response._id = command.getDocId();
          priv.getIndexDatabaseList(option, function (database_list) {
            if (just_check) {
              for (i = 0; i < database_list.length; i += 1) {
                try {
                  database_list[i].checkDocument(response);
                } catch (e) {
                  return that.error(generateErrorObject(
                    e.message,
                    "Check failed",
                    "corrupt index database"
                  ));
                }
              }
              that.success({"_id": command.getDocId(), "ok": true});
            } else {
              for (i = 0; i < database_list.length; i += 1) {
                database_list[i].put(response);
              }
              priv.storeIndexDatabaseList(database_list, option, function () {
                that.success({"ok": true, "id": command.getDocId()});
              });
            }
          });
        },
        function (err) {
          err.message = "Unable to repair document";
          return that.error(err);
        }
      );
    };

    that.repair = function (command, just_check) {
      var database_index = -1, i;
      for (i = 0; i < priv.indices.length; i += 1) {
        if (priv.indices[i].id === command.getDocId()) {
          database_index = i;
          break;
        }
      }
      that.addJob(
        "repair",
        priv.sub_storage,
        command.cloneDoc(),
        command.cloneOption(),
        function (response) {
          if (database_index !== -1) {
            priv.repairIndexDatabase(command, database_index, just_check);
          } else {
            priv.repairDocument(command, just_check);
          }
        },
        function (err) {
          err.message = "Could not repair sub storage";
          that.error(err);
        }
      );
    };

    return that;
  }


  if (typeof exports === "object") {
    // nodejs export module
    Object.defineProperty(exports, "jio_index_storage", {
      configurable: false,
      enumerable: true,
      writable: false,
      value: indexStorage
    });
  } else if (typeof define === "function" && define.amd) {
    // requirejs export
    define(indexStorage);
  } else {
    // classical browser and web workers JIO export
    jIO.addStorageType("indexed", indexStorage);
  }
}());
