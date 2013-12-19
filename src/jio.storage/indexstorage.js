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
/*global window, exports, require, define, jIO, RSVP, complex_queries */

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
  if (typeof exports === 'object') {
    return module(
      exports,
      require('jio'),
      require('rsvp'),
      require('complex_queries')
    );
  }
  window.index_storage = {};
  module(window.index_storage, jIO, RSVP, complex_queries);
}([
  'exports',
  'jio',
  'rsvp',
  'complex_queries'
], function (exports, jIO, RSVP, complex_queries) {
  "use strict";

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
      if (typeof meta._id !== "string" || meta._id === "") {
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
        // throw new ReferenceError("Not Found");
        return;
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
          if (typeof database_meta !== 'object' ||
              Object.getPrototypeOf(database_meta || []) !== Object.prototype ||
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
      if (typeof that._location[doc._id] !== "number") {
        throw new TypeError("Different Index");
      }
      db_doc = that._database(that._location[doc._id])._id;
      if (db_doc !== doc._id) {
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
      if (!Array.isArray(that._database)) {
        that._database = [];
      }
      while (i < that._database.length) {
        meta = that._database[i];
        if (typeof meta === 'object' &&
            Object.getPrototypeOf(meta || []) === Object.prototype &&
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
     * @method toJSON
     * @return {Object} The serialized version
     */
    that.toJSON = function () {
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
   * Return the similarity percentage (1 >= p >= 0) between two index lists.
   *
   * @param  {Array} list_a An index list
   * @param  {Array} list_b Another index list
   * @return {Number} The similarity percentage
   */
  function similarityPercentage(list_a, list_b) {
    var ai, bi, count = 0;
    for (ai = 0; ai < list_a.length; ai += 1) {
      for (bi = 0; bi < list_b.length; bi += 1) {
        if (list_a[ai] === list_b[bi]) {
          count += 1;
          break;
        }
      }
    }
    return count / (list_a.length > list_b.length ?
                    list_a.length : list_b.length);
  }

  /**
   * The JIO index storage constructor
   *
   * @class IndexStorage
   * @constructor
   */
  function IndexStorage(spec) {
    var i;
    if (!Array.isArray(spec.indices)) {
      throw new TypeError("IndexStorage 'indices' must be an array of " +
                          "objects.");
    }
    this._indices = spec.indices;
    if (typeof spec.sub_storage !== 'object' ||
        Object.getPrototypeOf(spec.sub_storage || []) !== Object.prototype) {
      throw new TypeError("IndexStorage 'sub_storage' must be a storage " +
                          "description.");
    }
    // check indices IDs
    for (i = 0; i < this._indices.length; i += 1) {
      if (typeof this._indices[i].id !== "string" ||
          this._indices[i].id === "") {
        throw new TypeError("IndexStorage " +
                            "'indices[x].id' must be a non empty string");
      }
      if (!Array.isArray(this._indices[i].index)) {
        throw new TypeError("IndexStorage " +
                            "'indices[x].index' must be a string array");
      }
    }
    this._sub_storage = spec.sub_storage;
  }

  /**
   * Select the good index to use according to a select list.
   *
   * @method selectIndex
   * @param  {Array} select_list An array of strings
   * @return {Number} The index index
   */
  IndexStorage.prototype.selectIndex = function (select_list) {
    var i, tmp, selector = {"index": 0, "similarity": 0};
    for (i = 0; i < this._indices.length; i += 1) {
      tmp = similarityPercentage(select_list, this._indices[i].index);
      if (tmp > selector.similarity) {
        selector.index = i;
        selector.similarity = tmp;
      }
    }
    return selector.index;
  };

  IndexStorage.prototype.getIndexDatabase = function (command, index) {
    index = this._indices[index];
    function makeNewIndex() {
      return new JSONIndex({
        "_id": index.id,
        "_attachment": index.attachment || "body",
        "indexing": index.index
      });
    }
    return command.storage(
      index.sub_storage || this._sub_storage
    ).getAttachment({
      "_id": index.id,
      "_attachment": index.attachment || "body"
    }).then(function (response) {
      return jIO.util.readBlobAsText(response.data);
    }).then(function (e) {
      try {
        e = JSON.parse(e.target.result);
        e._id = index.id;
        e._attachment = index.attachment || "body";
      } catch (e1) {
        return makeNewIndex();
      }
      return new JSONIndex(e);
    }, function (err) {
      if (err.status === 404) {
        return makeNewIndex();
        // go back to fulfillment channel
      }
      throw err;
      // propagate err
    });
  };

  IndexStorage.prototype.getIndexDatabases = function (command) {
    var i, promises = [];
    for (i = 0; i < this._indices.length; i += 1) {
      promises[promises.length] = this.getIndexDatabase(command, i);
    }
    return RSVP.all(promises);
  };

  IndexStorage.prototype.storeIndexDatabase = function (command, database,
                                                        index) {
    var that = this;
    index = this._indices[index];
    function putAttachment() {
      return command.storage(
        index.sub_storage || that._sub_storage
      ).putAttachment({
        "_id": index.id,
        "_attachment": index.attachment || "body",
        "_data": JSON.stringify(database),
        "_content_type": "application/json"
      });
    }
    function createDatabaseAndPutAttachmentIfPossible(err) {
      var metadata;
      if (err.status === 404) {
        metadata = {"_id": index.id};
        if (typeof index.metadata === 'object' &&
            // adding metadata
            index.metadata !== null &&
            !Array.isArray(index.metadata)) {
          metadata = jIO.util.dictUpdate(metadata, index.metadata);
        }
        return command.storage(
          index.sub_storage || that._sub_storage
        ).post(metadata).then(putAttachment, null, function () {
          throw null; // stop post progress propagation
        });
      }
      throw err;
    }
    return putAttachment().
      then(null, createDatabaseAndPutAttachmentIfPossible);
  };

  IndexStorage.prototype.storeIndexDatabases = function (command, databases) {
    var i, promises = [];
    for (i = 0; i < this._indices.length; i += 1) {
      if (databases[i] !== undefined) {
        promises[promises.length] =
          this.storeIndexDatabase(command, databases[i], i);
      }
    }
    return RSVP.all(promises);
  };


  /**
   * Generic method for 'post', 'put', 'get' and 'remove'. It delegates the
   * command to the sub storage and update the databases.
   *
   * @method genericCommand
   * @param  {String} method The method to use
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to post
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.genericCommand = function (method, command,
                                                    metadata, option) {
    var that = this, generic_response;
    function updateAndStoreIndexDatabases(responses) {
      var i, database_list = responses[0];
      generic_response = responses[1];
      if (method === 'get') {
        jIO.util.dictUpdate(metadata, generic_response.data);
      }
      metadata._id = generic_response.id;
      if (method === 'remove') {
        for (i = 0; i < database_list.length; i += 1) {
          database_list[i].remove(metadata);
        }
      } else {
        for (i = 0; i < database_list.length; i += 1) {
          database_list[i].put(metadata);
        }
      }
      return that.storeIndexDatabases(command, database_list);
    }

    function allProgress(progress) {
      if (progress.index === 1) {
        progress.value.percentage *= 0.7; // 0 to 70%
        command.notify(progress.value);
      }
      throw null; // stop propagation
    }

    function success() {
      command.success(generic_response);
    }

    function storeProgress(progress) {
      progress.percentage = (0.3 * progress.percentage) + 70; // 70 to 100%
      command.notify(progress);
    }

    RSVP.all([
      this.getIndexDatabases(command),
      command.storage(this._sub_storage)[method](metadata, option)
    ]).then(updateAndStoreIndexDatabases, null, allProgress).
      then(success, command.error, storeProgress);
  };

  /**
   * Post the document metadata and update the index
   *
   * @method post
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to post
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.post = function (command, metadata, option) {
    this.genericCommand('post', command, metadata, option);
  };

  /**
   * Update the document metadata and update the index
   *
   * @method put
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to put
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.put = function (command, metadata, option) {
    this.genericCommand('put', command, metadata, option);
  };

  /**
   * Add an attachment to a document (no index modification)
   *
   * @method putAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.putAttachment = function (command, param, option) {
    command.storage(this._sub_storage).putAttachment(param, option).
      then(command.success, command.error, command.notify);
  };

  /**
   * Get the document metadata
   *
   * @method get
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.get = function (command, param, option) {
    this.genericCommand('get', command, param, option);
  };

  /**
   * Get the attachment.
   *
   * @method getAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.getAttachment = function (command, param, option) {
    command.storage(this._sub_storage).getAttachment(param, option).
      then(command.success, command.error, command.notify);
  };

  /**
   * Remove document - removing documents updates index!.
   *
   * @method remove
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.remove = function (command, param, option) {
    this.genericCommand('remove', command, param, option);
  };

  /**
   * Remove attachment
   *
   * @method removeAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} option The command option
   */
  IndexStorage.prototype.removeAttachment = function (command, param, option) {
    command.storage(this._sub_storage).removeAttachment(param, option).
      then(command.success, command.error, command.notify);
  };

  /**
   * Gets a document list from the substorage
   *
   * @method allDocs
   * @param  {Object} command The JIO command
   * @param  {Object} param The command parameters
   * @param  {Object} option The command option
   * @param  {Boolean} [option.include_docs=false] Also retrieve the actual
   *                   document content.
   */
  IndexStorage.prototype.allDocs = function (command, param, option) { // XXX
    /*jslint unparam: true */
    var index = this.selectIndex(option.select_list || []), delete_id, now;
    option.select_list = (
      Array.isArray(option.select_list) ? option.select_list : []
    );
    if (option.select_list.indexOf("_id") === -1) {
      option.select_list.push("_id");
      delete_id = true;
    }
    if (option.include_docs) {
      now = Date.now();
      option.select_list.push("_" + now);
    }
    this.getIndexDatabase(command, index).then(function (db) {
      var i, id;
      db = db._database;
      if (option.include_docs) {
        // XXX find another way to manage include_docs option!!
        for (i = 0; i < db.length; i += 1) {
          db[i]["_" + now] = db[i];
        }
      }
      complex_queries.QueryFactory.create(option.query || '').
        exec(db, option);
      for (i = 0; i < db.length; i += 1) {
        id = db[i]._id;
        if (delete_id) {
          delete db[i]._id;
        }
        if (option.include_docs) {
          db[i] = {
            "id": id,
            "value": db[i],
            "doc": db[i]["_" + now]
          };
          delete db[i].doc["_" + now];
        } else {
          db[i] = {
            "id": id,
            "value": db[i]
          };
        }
      }
      command.success(200, {"data": {"total_rows": db.length, "rows": db}});
    }, function (err) {
      if (err.status === 404) {
        return command.success(200, {"data": {"total_rows": 0, "rows": []}});
      }
      command.error(err);
    });
  };

  // IndexStorage.prototype.check = function (command, param, option) { // XXX
  //   this.repair(command, true, param, option);
  // };

  // IndexStorage.prototype.repairIndexDatabase = function (
  //   command,
  //   index,
  //   just_check,
  //   param,
  //   option
  // ) { // XXX
  //   var i, that = this;
  //   command.storage(this._sub_storage).allDocs({'include_docs': true}).then(
  //     function (response) {
  //       var db_list = [], db = new JSONIndex({
  //         "_id": param._id,
  //         "_attachment": that._indices[index].attachment || "body",
  //         "indexing": that._indices[index].index
  //       });
  //       for (i = 0; i < response.rows.length; i += 1) {
  //         db.put(response.rows[i].doc);
  //       }
  //       db_list[index] = db;
  //       if (just_check) {
  //       this.getIndexDatabase(command, option, index, function (current_db) {
  //           if (db.equals(current_db)) {
  //             return command.success({"ok": true, "id": param._id});
  //           }
  //           return command.error(
  //             "conflict",
  //             "corrupted",
  //             "Database is not up to date"
  //           );
  //         });
  //       } else {
  //         that.storeIndexDatabaseList(command, db_list, {}, function () {
  //           command.success({"ok": true, "id": param._id});
  //         });
  //       }
  //     },
  //     function (err) {
  //       err.message = "Unable to repair the index database";
  //       command.error(err);
  //     }
  //   );
  // };

  // IndexStorage.prototype.repairDocument = function (
  //   command,
  //   just_check,
  //   param,
  //   option
  // ) { // XXX
  //   var i, that = this;
  //   command.storage(this._sub_storage).get(param, {}).then(
  //     function (response) {
  //       response._id = param._id;
  //       that.getIndexDatabaseList(command, option, function (database_list) {
  //         if (just_check) {
  //           for (i = 0; i < database_list.length; i += 1) {
  //             try {
  //               database_list[i].checkDocument(response);
  //             } catch (e) {
  //               return command.error(
  //                 "conflict",
  //                 e.message,
  //                 "Corrupt index database"
  //               );
  //             }
  //           }
  //           command.success({"_id": param._id, "ok": true});
  //         } else {
  //           for (i = 0; i < database_list.length; i += 1) {
  //             database_list[i].put(response);
  //           }
  //           that.storeIndexDatabaseList(
  //             command,
  //             database_list,
  //             option,
  //             function () {
  //               command.success({"ok": true, "id": param._id});
  //             }
  //           );
  //         }
  //       });
  //     },
  //     function (err) {
  //       err.message = "Unable to repair document";
  //       return command.error(err);
  //     }
  //   );
  // };

  // IndexStorage.prototype.repair = function (command, just_check, param,
  //                                           option) { // XXX
  //   var database_index = -1, i, that = this;
  //   for (i = 0; i < this._indices.length; i += 1) {
  //     if (this._indices[i].id === param._id) {
  //       database_index = i;
  //       break;
  //     }
  //   }
  //   command.storage(this._sub_storage).repair(param, option).then(
  //     function () {
  //       if (database_index !== -1) {
  //         that.repairIndexDatabase(
  //           command,
  //           database_index,
  //           just_check,
  //           param,
  //           option
  //         );
  //       } else {
  //         that.repairDocument(command, just_check, param, option);
  //       }
  //     },
  //     function (err) {
  //       err.message = "Could not repair sub storage";
  //       command.error(err);
  //     }
  //   );
  // };

  jIO.addStorage("index", IndexStorage);

  exports.createDescription = function () {
    // XXX
    return;
  };

}));
