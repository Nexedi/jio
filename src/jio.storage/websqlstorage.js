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
   * @class websqlStorage
   * @constructor
   */

  /*jslint unparam: true*/
  function sqlExec(db, transac, args) {
    return new RSVP.Promise(function (resolve, reject) {
      db.transaction(function (tx) {
        var len = transac.length,
          res = [],
          i;

        function transacSuccess(tx, results) {
          res.push(results);
          if (res.length === len) {
            resolve(res);
          }
        }
        function transacFailure(tx, error) {
          reject(error);
          return true;
        }
        for (i = 0; i < len; i += 1) {
          tx.executeSql(transac[i], args[i], transacSuccess, transacFailure);
        }
      }, function (tx, error) {
        reject(error);
      });
    });
  }
  /*jslint unparam: false*/

  function initDatabase(db) {
    var queries;

    queries = ["CREATE TABLE IF NOT EXISTS documents" +
               "(id VARCHAR PRIMARY KEY NOT NULL, data TEXT)",
               "CREATE TABLE IF NOT EXISTS attachment" +
               "(id VARCHAR, attachment VARCHAR, " +
               "CONSTRAINT un_id_attachment UNIQUE (id, attachment))",
               "CREATE TABLE IF NOT EXISTS blob" +
               "(id VARCHAR, attachment VARCHAR, part INT, blob TEXT)",
               "CREATE TRIGGER IF NOT EXISTS jIOremove " +
               "BEFORE DELETE ON documents FOR EACH ROW BEGIN DELETE " +
               "FROM attachment WHERE id = OLD.id;END;",
               "CREATE TRIGGER IF NOT EXISTS jIOremoveAttachment " +
               "BEFORE DELETE ON attachment FOR EACH ROW " +
               "BEGIN DELETE from blob WHERE id = OLD.id " +
               "AND attachment = OLD.attachment;END;"];
    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, queries, [[], [], [], [], []]);
      });
  }

  function websqlStorage(spec) {
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
    this._init_base = initDatabase(this._database);
  }

  websqlStorage.prototype.put = function (id, param) {
    var db = this._database,
      that = this,
      dataString = JSON.stringify(param);

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        return sqlExec(db, ["INSERT OR REPLACE INTO " +
                            "documents(id, data) VALUES(?,?)"],
                       [[id, dataString]]);
      })
      .push(function () {
        return id;
      });
  };

  websqlStorage.prototype.remove = function (id) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        return sqlExec(db, ["DELETE FROM documents WHERE id = ?"], [[id]]);
      })
      .push(function (result) {
        if (result[0].rowsAffected === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return id;
      });

  };

  websqlStorage.prototype.get = function (id) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        return sqlExec(db, ["SELECT data FROM documents WHERE id = ?"], [[id]]);
      })
      .push(function (result) {
        if (result[0].rows.length === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return JSON.parse(result[0].rows[0].data);
      });
  };

  websqlStorage.prototype.allAttachments = function (id) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        return sqlExec(db, ["SELECT id FROM documents WHERE id = ?"], [[id]]);
      })
      .push(function (result) {
        if (result[0].rows.length === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return sqlExec(db, ["SELECT attachment FROM attachment WHERE id = ?"],
                       [[id]]);
      })
      .push(function (result) {
        var len = result[0].rows.length,
          obj = {},
          i;

        for (i = 0; i < len; i += 1) {
          obj[result[0].rows[i].attachment] = {};
        }
        return obj;
      });
  };

  function sendBlobPart(blob, args, index, queue) {
    queue.push(function () {
      return jIO.util.readBlobAsDataURL(blob);
    })
      .push(function (strBlob) {
        args[index + 3].push(strBlob.currentTarget.result);
        return;
      });
  }

  websqlStorage.prototype.putAttachment = function (id, name, blob) {
    var db = this._database,
      that = this,
      partSize = this._blob_length;

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        return sqlExec(db, ["SELECT id FROM documents WHERE id = ?"], [[id]]);
      })
      .push(function (result) {
        var queries = [],
          args = [],
          blobSize = blob.size,
          queue = new RSVP.Queue(),
          i,
          index;

        if (result[0].rows.length === 0) {
          throw new jIO.util.jIOError("Cannot access subdocument", 404);
        }
        queries.push("INSERT OR REPLACE INTO attachment(id, attachment)" +
                     " VALUES(?, ?)");
        args.push([id, name]);
        queries.push("DELETE FROM blob WHERE id = ? AND attachment = ?");
        args.push([id, name]);
        queries.push("INSERT INTO blob(id, attachment, part, blob)" +
                     "VALUES(?, ?, ?, ?)");
        args.push([id, name, -1, blob.type || "application/octet-stream"]);

        for (i = 0, index = 0; i < blobSize; i += partSize, index += 1) {
          queries.push("INSERT INTO blob(id, attachment, part, blob)" +
                       "VALUES(?, ?, ?, ?)");
          args.push([id, name, index]);
          sendBlobPart(blob.slice(i, i + partSize), args, index, queue);
        }
        queue.push(function () {
          return sqlExec(db, queries, args);
        });
        return queue;
      });
  };

  websqlStorage.prototype.getAttachment = function (id, name, options) {
    var db = this._database,
      that = this,
      partSize = this._blob_length,
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

    start_index = Math.floor(start / partSize);
    if (start === 0) { start_index -= 1; }
    end_index =  Math.floor(end / partSize);
    if (end % partSize === 0) {
      end_index -= 1;
    }

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        var command = "SELECT part, blob FROM blob WHERE id = ? AND " +
          "attachment = ? AND part >= ?",
          args = [id, name, start_index];

        if (end !== -1) {
          command += " AND part <= ?";
          args.push(end_index);
        }
        return sqlExec(db, [command], [args]);
      })
      .push(function (response) {
        var i,
          blobArray = [],
          blob,
          type;

        response = response[0].rows;
        if (response.length === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        for (i = 0; i < response.length; i += 1) {
          if (response[i].part === -1) {
            type = response[i].blob;
            start_index += 1;
          } else {
            blobArray.push(jIO.util.dataURItoBlob(response[i].blob));
          }
        }
        if ((start === 0) && (options.end === undefined)) {
          return new Blob(blobArray, {type: type});
        }
        blob = new Blob(blobArray, {});
        return blob.slice(start - (start_index * partSize),
                          end === -1 ? blob.size :
                          end - (start_index * partSize),
                          "application/octet-stream");
      });
  };

  websqlStorage.prototype.removeAttachment = function (id, name) {
    var db = this._database,
      that = this;

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        return sqlExec(db, ["DELETE FROM attachment WHERE " +
                            "id = ? AND attachment = ?"], [[id, name]]);
      })
      .push(function (result) {
        if (result[0].rowsAffected === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return name;
      });
  };

  websqlStorage.prototype.hasCapacity = function (name) {
    return (name === "list" || (name === "include"));
  };

  websqlStorage.prototype.buildQuery = function (options) {
    var db = this._database,
      that = this,
      query =  "SELECT id";

    return new RSVP.Queue()
      .push(function () {
        return that._init_base;
      })
      .push(function () {
        if (options === undefined) { options = {}; }
        if (options.include_docs === true) {
          query += ", data AS doc";
        }
        query += " FROM documents ORDER BY id";
        return sqlExec(db, [query], [[]]);
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

  jIO.addStorage('websql', websqlStorage);

}(jIO, RSVP, Blob, openDatabase));
