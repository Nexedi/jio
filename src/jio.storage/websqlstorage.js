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

  function sqlExec(db, transac, args) {
    return new RSVP.Promise(function (resolve, reject) {
      db.transaction(function (tx) {
        /*jslint unparam: true*/
        tx.executeSql(transac, args,
                      function (tx, results) {
            resolve(results);
          },
                      function (tx, error) {
            reject(error);
          });
      });
      /*jslint unparam: false*/
    });
  }

  function createDatabase(db) {
    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "CREATE TABLE IF NOT EXISTS documents" +
                       "(id VARCHAR PRIMARY KEY NOT NULL, data TEXT)");
      })
      .push(function () {
        return sqlExec(db, "CREATE TABLE IF NOT EXISTS metadata" +
                       "(doc VARCHAR, prop VARCHAR, stringValue " +
                       "TEXT, nbrValue INT)");
      })
      .push(function () {
        return sqlExec(db, "CREATE TABLE IF NOT EXISTS attachment" +
                       "(id VARCHAR, attachment VARCHAR, " +
                       "CONSTRAINT un_id_attachment UNIQUE (id, attachment))");
      })
      .push(function () {
        return sqlExec(db, "CREATE TABLE IF NOT EXISTS blob" +
                       "(id VARCHAR, attachment VARCHAR, part INT, blob TEXT)");
      })
      .push(function () {
        return sqlExec(db, "CREATE TRIGGER IF NOT EXISTS jIOremove " +
                       "BEFORE DELETE ON documents FOR EACH ROW BEGIN DELETE " +
                       "FROM metadata WHERE doc = OLD.id; DELETE FROM  " +
                       "attachment WHERE id = OLD.id;END;");
      })
      .push(function () {
        return sqlExec(db, "CREATE TRIGGER IF NOT EXISTS jIOupdate " +
                       "BEFORE INSERT ON documents FOR EACH ROW BEGIN " +
                       "DELETE FROM metadata WHERE doc = NEW.id;END;");
      })
      .push(function () {
        return sqlExec(db, "CREATE TRIGGER IF NOT EXISTS jIOremoveAttachment" +
                       "BEFORE DELETE ON attachment FOR EACH ROW " +
                       "BEGIN DELETE from blob WHERE id = OLD.id " +
                       "AND attachment = OLD.attachment;END;");
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
    createDatabase(this._database);
  }

  function addProperty(db, id, prop, value) {
    var type = typeof value;

    if (type === "string") {
      return (sqlExec(db, "INSERT INTO metadata(doc, prop, stringValue) " +
                         "VALUES(?, ?, ?)",
                         [id, prop, value]));
    }
    if (type === "number") {
      return (sqlExec(db, "INSERT INTO metadata(doc, prop, nbrValue) " +
                         "VALUES(?, ?, ?)",
                         [id, prop, value]));
    }
  }

  websqlStorage.prototype.put = function (id, param) {
    var db = this._database,
      dataString = JSON.stringify(param),
      i,
      arrayLen;

    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "INSERT OR REPLACE INTO " +
                       "documents(id, data) VALUES(?,?)",
                       [id, dataString]);
      })
      .push(function () {
        var prop;

        for (prop in param) {
          if (param.hasOwnProperty(prop)) {
            if (param[prop] instanceof Array) {
              arrayLen = param[prop].length;
              for (i = 0; i < arrayLen; i += 1) {
                addProperty(db, id, prop, param[prop][i]);
              }
            } else {
              addProperty(db, id, prop, param[prop]);
            }
          }
        }
        return id;
      });
  };

  websqlStorage.prototype.remove = function (id) {
    var db = this._database;

    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "DELETE FROM documents WHERE id = ?", [id]);
      })
      .push(function (result) {
        if (result.rowsAffected === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return id;
      });

  };

  websqlStorage.prototype.get = function (id) {
    var db = this._database;

    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "SELECT data FROM documents WHERE id = ?", [id]);
      })
      .push(function (result) {
        if (result.rows.length === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return JSON.parse(result.rows[0].data);
      });
  };

  websqlStorage.prototype.allAttachments = function (id) {
    var db = this._database;

    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "SELECT COUNT(*) FROM documents WHERE id = ?", [id]);
      })
      .push(function (result) {
        if (result.rows[0]["COUNT(*)"] === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return sqlExec(db, "SELECT attachment FROM attachment WHERE id = ?",
                       [id]);
      })
      .push(function (result) {
        var len = result.rows.length,
          obj = {},
          i;

        for (i = 0; i < len; i += 1) {
          obj[result.rows[i].attachment] = {};
        }
        return obj;
      });
  };

  websqlStorage.prototype.allDocs = function () {
    var db = this._database;

    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "SELECT id FROM documents");
      });
  };

  function sendBlobPart(db, id, name, blob, nbSlice) {
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsDataURL(blob);
      })
      .push(function (strBlob) {
        strBlob = strBlob.currentTarget.result;
        return sqlExec(db, "INSERT INTO blob(id, attachment, part, blob)" +
                       "VALUES(?, ?, ?, ?)", [id, name, nbSlice, strBlob]);
      });
  }

  websqlStorage.prototype.putAttachment = function (id, name, blob) {
    var db = this._database,
      partSize = this._blob_length;

    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "SELECT COUNT(*) FROM documents WHERE id = ?", [id]);
      })
      .push(function (result) {
        if (result.rows[0]["COUNT(*)"] === 0) {
          throw new jIO.util.jIOError("Cannot access subdocument", 404);
        }
        return sqlExec(db, "INSERT OR REPLACE INTO attachment(id, attachment)" +
                " VALUES(?, ?)", [id, name]);
      })
      .push(function () {
        return sqlExec(db, "DELETE FROM blob WHERE " +
                       "id = ? AND attachment = ?", [id, name]);
      })
      .push(function () {
        return sqlExec(db, "INSERT INTO " +
                       "blob(id, attachment, part, blob) VALUES(?, ?, ?, ?)",
                       [id, name, -1, blob.type || "application/octet-stream"]);
      })
      .push(function () {
        var blobSize = blob.size,
          i,
          index;

        for (i = 0, index = 0; i < blobSize; i += partSize, index += 1) {
          sendBlobPart(db, id, name, blob.slice(i, i + partSize), index);
        }
      });
  };

  websqlStorage.prototype.getAttachment = function (id, name, options) {
    var db = this._database,
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
        var command = "SELECT part, blob FROM blob WHERE id = ? AND " +
          "attachment = ? AND part >= ?",
          args = [id, name, start_index];

        if (end !== -1) {
          command += " AND part <= ?";
          args.push(end_index);
        }
        return sqlExec(db, command, args);
      })
      .push(function (response) {
        var i,
          blobArray = [],
          blob,
          type;

        response = response.rows;
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
    var db = this._database;

    return new RSVP.Queue()
      .push(function () {
        return sqlExec(db, "DELETE FROM attachment WHERE " +
                       "id = ? AND attachment = ?", [id, name]);
      })
      .push(function (result) {
        if (result.rowsAffected === 0) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        return id;
      });
  };

  jIO.addStorage('websql', websqlStorage);

}(jIO, RSVP, Blob, openDatabase));
