/*
 * JIO extension for resource indexing.
 * Copyright (C) 2013  Nexedi SA
 *
 *   This library is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This library is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, regexp: true */
/*global jIO, define, complex_queries */

/**
 * JIO Index Storage.
 * Manages indexes for specified storages.
 * Description:
 * {
 *   "type": "index",
 *   "indices": [{
 *     "id": "index_title_subject.json", // doc id where to store indices
 *     "index": ["title", "subject"], // metadata to index
 *     "attachment": "youhou", // default "body"
 *     "metadata": { // default {}
 *       "type": "Dataset",
 *       "format": "application/json",
 *       "date": "yyyy-mm-ddTHH:MM:SS+HH:MM",
 *       "title": "My index database",
 *       "creator": "Me"
 *     },
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
 *   "type": "Dataset",
 *   "format": "application/json",
 *   "date": "yyyy-mm-ddTHH:MM:SS+HH:MM",
 *   "title": "My index database",
 *   "creator": "Me",
 *   "_attachments": {
 *     "youhou": {
 *       "length": Num,
 *       "digest": "XXX",
 *       "content_type": "application/json"
 *     }
 *   }
 * }
 * Attachment "youhou"
 * {
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
 *   "_attachments": {
 *     "body": {..}
 *   }
 * }
 * Attachment "body"
 * {
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
// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, complex_queries);
}(['jio', 'complex_queries'], function (jIO, complex_queries) {
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
   * Tool to get the date in W3C date format "2011-12-13T14:15:16+01:00"
   *
   * @param  {Any} date The new Date() parameter
   * @return {String} The date in W3C date format
   */
  function w3cDate(date) {
    var d = new Date(date), offset = -d.getTimezoneOffset();
    return (
      d.getFullYear() + "-" +
        (d.getMonth() + 1) + "-" +
        d.getDate() + "T" +
        d.getHours() + ":" +
        d.getMinutes() + ":" +
        d.getSeconds() +
        (offset < 0 ? "-" : "+") +
        (offset / 60) + ":" +
        (offset % 60)
    ).replace(/[0-9]+/g, function (found) {
      if (found.length < 2) {
        return '0' + found;
      }
      return found;
    });
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
     * The attachment id
     *
     * @property _attachment
     * @type String
     */
    that._attachment = spec._attachment;

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
      var k, needed_meta = {}, ok = false;
      if (typeof meta._id !== "string" && meta._id !== "") {
        throw new TypeError("Corrupted Metadata");
      }
      for (k in meta) {
        if (meta.hasOwnProperty(k)) {
          if (k[0] === "_") {
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
          typeof that._attachment !== "string" ||
          that._attachment === "" ||
          !Array.isArray(that._free) ||
          !Array.isArray(that._indexing) ||
          typeof that._location !== 'object' ||
          Array.isArray(that._location) ||
          !Array.isArray(that._database) ||
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
        "getAttachment",
        priv.indices[number].sub_storage || priv.sub_storage,
        {
          "_id": priv.indices[number].id,
          "_attachment": priv.indices[number].attachment || "body"
        },
        option,
        function (response) {
          try {
            response = JSON.parse(response);
            response._id = priv.indices[number].id;
            response._attachment = priv.indices[number].attachment || "body";
            callback(new JSONIndex(response));
          } catch (e) {
            return that.error(generateErrorObject(
              e.message,
              "Repair is necessary",
              "corrupt"
            ));
          }
        },
        function (err) {
          if (err.status === 404) {
            callback(new JSONIndex({
              "_id": priv.indices[number].id,
              "_attachment": priv.indices[number].attachment || "body",
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
              "_attachment": priv.indices[index].attachment || "body",
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
          try {
            response = JSON.parse(response);
            response._id = priv.indices[index].id;
            response._attachment = priv.indices[index].attachment || "body";
            response_list[index] = new JSONIndex(response);
          } catch (e) {
            return that.error(generateErrorObject(
              e.message,
              "Repair is necessary",
              "corrupt"
            ));
          }
          count += 1;
          if (count === priv.indices.length) {
            callback(response_list);
          }
        };
      };
      for (i = 0; i < priv.indices.length; i += 1) {
        that.addJob(
          "getAttachment",
          priv.indices[i].sub_storage || priv.sub_storage,
          {
            "_id": priv.indices[i].id,
            "_attachment": priv.indices[i].attachment || "body"
          },
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
      var i, count = 0, count_max = 0;
      function onAttachmentResponse(response) {
        count += 1;
        if (count === count_max) {
          callback({"ok": true});
        }
      }
      function onAttachmentError(err) {
        err.message = "Unable to store index database.";
        that.error(err);
      }
      function putAttachment(i) {
        that.addJob(
          "putAttachment",
          priv.indices[i].sub_storage || priv.sub_storage,
          {
            "_id": database_list[i]._id,
            "_attachment": database_list[i]._attachment,
            "_data": JSON.stringify(database_list[i].serialized()),
            "_mimetype": "application/json"
          },
          option,
          onAttachmentResponse,
          onAttachmentError
        );
      }
      function post(i) {
        var doc = priv.indices[i].metadata || {};
        doc._id = database_list[i]._id;
        that.addJob(
          "post", // with id
          priv.indices[i].sub_storage || priv.sub_storage,
          doc,
          option,
          function (response) {
            putAttachment(i);
          },
          function (err) {
            if (err.status === 409) {
              return putAttachment(i);
            }
            err.message = "Unable to store index database.";
            that.error(err);
          }
        );
      }
      for (i = 0; i < priv.indices.length; i += 1) {
        if (database_list[i] !== undefined) {
          count_max += 1;
          post(i);
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
            "_attachment": priv.indices[index].attachment || "body",
            "indexing": priv.indices[index].index
          });
          for (i = 0; i < response.rows.length; i += 1) {
            db.put(response.rows[i].doc);
          }
          db_list[index] = db;
          if (just_check) {
            priv.getIndexDatabase(option, index, function (current_db) {
              if (db.equals(current_db)) {
                return that.success({"ok": true, "id": command.getDocId()});
              }
              return that.error(generateErrorObject(
                "Different Index",
                "Check failed",
                "corrupt index database"
              ));
            });
          } else {
            priv.storeIndexDatabaseList(db_list, {}, function () {
              that.success({"ok": true, "id": command.getDocId()});
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

  jIO.addStorageType("indexed", indexStorage);
}));
