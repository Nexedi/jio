/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Websql Storage. Type = "websql".
 * websql "database" storage.
 */
/*global Blob, jIO, RSVP, openDatabase*/
/*jslint nomen: true*/

(function (jIO, RSVP, Blob, openDatabase) {

  "use strict";

  /**
   * The JIO Websql Storage extension
   *
   * @class WebSQLStorage
   * @constructor
   */

  function queueSql(db, query_list, argument_list) {
    return new RSVP.Promise(function (resolve, reject) {
      /*jslint unparam: true*/
      db.transaction(function (tx) {
        var len = query_list.length,
          result_list = [],
          i;

        function resolveTransaction(tx, result) {
          result_list.push(result);
          if (result_list.length === len) {
            resolve(result_list);
          }
        }
        function rejectTransaction(tx, error) {
          reject(error);
          return true;
        }
        for (i = 0; i < len; i += 1) {
          tx.executeSql(query_list[i], argument_list[i], resolveTransaction,
                        rejectTransaction);
        }
      }, function (tx, error) {
        reject(error);
      });
      /*jslint unparam: false*/
    });
  }

  function initDatabase(db) {
    var query_list = [
      "CREATE TABLE IF NOT EXISTS document" +
        "(id VARCHAR PRIMARY KEY NOT NULL, data TEXT)",
      "CREATE TABLE IF NOT EXISTS attachment" +
        "(id VARCHAR, attachment VARCHAR, part INT, blob TEXT)",
      "CREATE TRIGGER IF NOT EXISTS removeAttachment " +
        "BEFORE DELETE ON document FOR EACH ROW " +
        "BEGIN DELETE from attachment WHERE id = OLD.id;END;",
      "CREATE INDEX IF NOT EXISTS index_document ON document (id);",
      "CREATE INDEX IF NOT EXISTS index_attachment " +
        "ON attachment (id, attachment);"
    ];
    return new RSVP.Queue()
      .push(function () {
        return queueSql(db, query_list, []);
      });
  }

  function WebSQLStorage(spec) {
    if (typeof spec.database !== 'string' || !spec.database) {
      throw new TypeError("database must be a string " +
                          "which contains more than one character.");
    }
    this._database = openDatabase("jio:" + spec.database,
                                  '1.0', '', 2 * 1024 * 1024);
    if (spec.blob_length &&
        (typeof spec.blob_length !== "number" ||
         spec.blob_length < 20)) {
      throw new TypeError("blob_len parameter must be a number >= 20");
    }
    this._blob_length = spec.blob_length || 2000000;
    this._init_db_promise = initDatabase(this._database);
  }

  WebSQLStorage.prototype.put = function (id, param) {
    var db = this._database,
      that = this,
      data_string = JSON.stringify(param);

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        return queueSql(db, ["INSERT OR REPLACE INTO " +
                            "document(id, data) VALUES(?,?)"],
                       [[id, data_string]]);
      })
      .push(function () {
        return id;
      });
  };

  WebSQLStorage.prototype.remove = function (id) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        return queueSql(db, ["DELETE FROM document WHERE id = ?"], [[id]]);
      })
      .push(function (result_list) {
        if (result_list[0].rowsAffected === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return id;
      });

  };

  WebSQLStorage.prototype.get = function (id) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        return queueSql(db, ["SELECT data FROM document WHERE id = ?"],
                        [[id]]);
      })
      .push(function (result_list) {
        if (result_list[0].rows.length === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return JSON.parse(result_list[0].rows[0].data);
      });
  };

  WebSQLStorage.prototype.allAttachments = function (id) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        return queueSql(db, [
          "SELECT id FROM document WHERE id = ?",
          "SELECT DISTINCT attachment FROM attachment WHERE id = ?"
        ], [[id], [id]]);
      })
      .push(function (result_list) {
        if (result_list[0].rows.length === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }

        var len = result_list[1].rows.length,
          obj = {},
          i;

        for (i = 0; i < len; i += 1) {
          obj[result_list[1].rows[i].attachment] = {};
        }
        return obj;
      });
  };

  function sendBlobPart(blob, argument_list, index, queue) {
    queue.push(function () {
      return jIO.util.readBlobAsDataURL(blob);
    })
      .push(function (strBlob) {
        argument_list[index + 2].push(strBlob.target.result);
        return;
      });
  }

  WebSQLStorage.prototype.putAttachment = function (id, name, blob) {
    var db = this._database,
      that = this,
      part_size = this._blob_length;

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        return queueSql(db, ["SELECT id FROM document WHERE id = ?"], [[id]]);
      })
      .push(function (result) {
        var query_list = [],
          argument_list = [],
          blob_size = blob.size,
          queue = new RSVP.Queue(),
          i,
          index;

        if (result[0].rows.length === 0) {
          throw new jIO.util.jIOError("Cannot access subdocument", 404);
        }
        query_list.push("DELETE FROM attachment WHERE id = ? " +
                        "AND attachment = ?");
        argument_list.push([id, name]);
        query_list.push("INSERT INTO attachment(id, attachment, part, blob)" +
                     "VALUES(?, ?, ?, ?)");
        argument_list.push([id, name, -1,
                            blob.type || "application/octet-stream"]);

        for (i = 0, index = 0; i < blob_size; i += part_size, index += 1) {
          query_list.push("INSERT INTO attachment(id, attachment, part, blob)" +
                       "VALUES(?, ?, ?, ?)");
          argument_list.push([id, name, index]);
          sendBlobPart(blob.slice(i, i + part_size), argument_list, index,
                       queue);
        }
        queue.push(function () {
          return queueSql(db, query_list, argument_list);
        });
        return queue;
      });
  };

  WebSQLStorage.prototype.getAttachment = function (id, name, options) {
    var db = this._database,
      that = this,
      part_size = this._blob_length,
      start,
      end,
      start_index,
      end_index;

    if (options === undefined) { options = {}; }
    start = options.start || 0;
    end = options.end || -1;

    if (start < 0 || (options.end !== undefined && options.end < 0)) {
      throw new jIO.util.jIOError("_start and _end must be positive",
                                  400);
    }
    if (start > end && end !== -1) {
      throw new jIO.util.jIOError("_start is greater than _end",
                                  400);
    }

    start_index = Math.floor(start / part_size);
    if (start === 0) { start_index -= 1; }
    end_index =  Math.floor(end / part_size);
    if (end % part_size === 0) {
      end_index -= 1;
    }

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        var command = "SELECT part, blob FROM attachment WHERE id = ? AND " +
          "attachment = ? AND part >= ?",
          argument_list = [id, name, start_index];

        if (end !== -1) {
          command += " AND part <= ?";
          argument_list.push(end_index);
        }
        return queueSql(db, [command], [argument_list]);
      })
      .push(function (response_list) {
        var i,
          response,
          blob_array = [],
          blob,
          type;

        response = response_list[0].rows;
        if (response.length === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        for (i = 0; i < response.length; i += 1) {
          if (response[i].part === -1) {
            type = response[i].blob;
            start_index += 1;
          } else {
            blob_array.push(jIO.util.dataURItoBlob(response[i].blob));
          }
        }
        if ((start === 0) && (options.end === undefined)) {
          return new Blob(blob_array, {type: type});
        }
        blob = new Blob(blob_array, {});
        return blob.slice(start - (start_index * part_size),
                          end === -1 ? blob.size :
                          end - (start_index * part_size),
                          "application/octet-stream");
      });
  };

  WebSQLStorage.prototype.removeAttachment = function (id, name) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        return queueSql(db, ["DELETE FROM attachment WHERE " +
                            "id = ? AND attachment = ?"], [[id, name]]);
      })
      .push(function (result) {
        if (result[0].rowsAffected === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return name;
      });
  };

  WebSQLStorage.prototype.hasCapacity = function (name) {
    return (name === "list" || (name === "include"));
  };

  WebSQLStorage.prototype.buildQuery = function (options) {
    var db = this._database,
      that = this,
      query =  "SELECT id";

    return new RSVP.Queue()
      .push(function () {
        return that._init_db_promise;
      })
      .push(function () {
        if (options === undefined) { options = {}; }
        if (options.include_docs === true) {
          query += ", data AS doc";
        }
        query += " FROM document";
        return queueSql(db, [query], [[]]);
      })
      .push(function (result) {
        var array = [],
          len = result[0].rows.length,
          i;

        for (i = 0; i < len; i += 1) {
          array.push(result[0].rows[i]);
          array[i].value = {};
          if (array[i].doc !== undefined) {
            array[i].doc = JSON.parse(array[i].doc);
          }
        }
        return array;
      });
  };

  jIO.addStorage('websql', WebSQLStorage);

}(jIO, RSVP, Blob, openDatabase));
