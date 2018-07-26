/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Sql Storage. Type = "sql".
 * sql "database" storage.
 */
/*global Blob, jIO, RSVP, SQL, localStorage, ArrayBuffer, Uint8Array*/
/*jslint nomen: true*/

(function (jIO, RSVP, SQL, localStorage, ArrayBuffer, Uint8Array) {
  "use strict";

  var sqlStorageKey = 'jio_sql',
    sqlTable = "jiosearch";

  function str2ua(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    return new Uint8Array(buf);
  }

  function ua2str(ua) {
    return String.fromCharCode.apply(null, ua);
  }

  function resetDb(indexFields) {
    var db = new SQL.Database(),
      fields = ["id"].concat(indexFields);
    db.run("CREATE TABLE " + sqlTable + " ( " + fields.join(", ") + ");");
    return db;
  }

  function initDb(indexFields) {
    var data = localStorage.getItem(sqlStorageKey),
      uInt8Array = data ? str2ua(data) : null;

    if (uInt8Array) {
      return new SQL.Database(uInt8Array);
    }

    return resetDb(indexFields);
  }

  function saveDb(db) {
    var data = ua2str(db["export"]()); // jslint throws errorx
    localStorage.setItem(sqlStorageKey, data);
  }

  function docToParams(id, doc) {
    var data = {};
    Object.keys(doc).forEach(function (key) {
      data[":" + key] = doc[key];
    });
    data[":id"] = id.toString();
    return data;
  }

  function dbValues(indexFields) {
    return " VALUES (:id, " + indexFields.map(function (field) {
      return ":" + field;
    }).join(", ") + ")";
  }

  function dbSet(indexFields) {
    return " SET " + indexFields.map(function (field) {
      return field + " = :" + field;
    }).join(", ");
  }

  function dbOrderBy(fields) {
    return (fields || []).map(function (field) {
      return field[0] + " " + (field[1] === "descending" ? "DESC" : "ASC");
    }).join(", ");
  }

  function dbWhere(fields, operator) {
    var where = "",
      field,
      i;
    for (i = 0; i < fields.length; i = i + 1) {
      field = fields[i];
      where += field.key + " LIKE \"%" + field.value + "%\"";
      if (i !== fields.length - 1) {
        where += " " + (field.operator || operator) + " ";
      }
    }
    return where;
  }

  function filterJSON(json, fields) {
    if (!fields || !fields.length) {
      return json;
    }
    var data = {};
    fields.forEach(function (field) {
      if (json.hasOwnProperty(field)) {
        data[field] = json[field];
      }
    });
    return data;
  }

  /**
    * The jIO sql.js extension
    *
    * @class SqlStorage
    * @constructor
    */
  function SqlStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this.__index_fields = spec.index_fields;
    this.__db = initDb(spec.index_fields || []);
  }

  SqlStorage.prototype.__resetDb = function (indexFields) {
    this.__index_fields = indexFields;
    this.__db = resetDb(indexFields);
  };

  SqlStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  SqlStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };

  SqlStorage.prototype.post = function (doc) {
    var db = this.__db,
      indexFields = this.__index_fields;

    return this._sub_storage.post.apply(this._sub_storage, arguments)
      .push(function (id) {
        db.run(
          "INSERT INTO " + sqlTable + dbValues(indexFields),
          docToParams(id, doc)
        );
        saveDb(db);
      });
  };

  SqlStorage.prototype.put = function (id, doc) {
    var db = this.__db,
      indexFields = this.__index_fields;

    return this._sub_storage.put.apply(this._sub_storage, arguments)
      .push(function () {
        db.run(
          "UPDATE " + sqlTable + dbSet(indexFields) + " WHERE id=:id",
          docToParams(id, doc)
        );
        saveDb(db);
      });
  };

  SqlStorage.prototype.remove = function (id) {
    var db = this.__db;

    return this._sub_storage.remove(id)
      .push(function () {
        db.run("DELETE FROM " + sqlTable + " WHERE id=:id", {
          ":id": id
        });
        saveDb(db);
      });
  };

  SqlStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };

  SqlStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };

  SqlStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };

  SqlStorage.prototype.repair = function () {
    // rebuild db?
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  SqlStorage.prototype.hasCapacity = function (name) {
    var this_storage_capacity_list = ["limit",
                                      "sort",
                                      "select",
                                      "query"];

    if (this_storage_capacity_list.indexOf(name) !== -1) {
      return true;
    }
    if (name === "list") {
      return this._sub_storage.hasCapacity(name);
    }
    return false;
  };

  SqlStorage.prototype.buildQuery = function (options) {
    if (!options.query) {
      return this._sub_storage.buildQuery(options);
    }

    var context = this,
      db = this.__db,
      parsed_query = jIO.QueryFactory.create(options.query);

    return new RSVP.Queue()
      .push(function () {
        var query = "SELECT id FROM " + sqlTable,
          where = dbWhere(
            parsed_query.query_list || [parsed_query],
            parsed_query.operator
          ),
          orderBy = dbOrderBy(options.sort_on),
          limit = options.limit;

        if (where) {
          query += " WHERE " + where;
        }

        if (orderBy) {
          query += " ORDER BY " + orderBy;
        }

        if (limit) {
          query += " LIMIT " + limit.join(", ");
        }

        return db.prepare(query);
      })
      .push(function (result) {
        var ids = [];
        while (result.step()) {
          ids.push(result.get()[0]);
        }
        result.free();

        return RSVP.all(ids.map(function (id) {
          return context.get(id).push(function (doc) {
            return {
              id: id,
              value: filterJSON(doc, options.select_list)
            };
          });
        }));
      });
  };

  jIO.addStorage('sql', SqlStorage);

}(jIO, RSVP, SQL, localStorage, ArrayBuffer, Uint8Array));
