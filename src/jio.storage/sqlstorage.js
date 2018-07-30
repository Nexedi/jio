/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Sql Storage. Type = "sql".
 * sql "database" storage.
 */
/*global Blob, jIO, RSVP, SQL*/
/*jslint nomen: true*/

(function (Blob, jIO, RSVP, SQL) {
  "use strict";

  var sqlStorageKey = 'jio_sql',
    sqlTable = "jiosearch";

  function initSQLDb(indexFields) {
    var db = new SQL.Database(),
      fields = ["id"].concat(indexFields);
    db.run("CREATE TABLE " + sqlTable + " ( " + fields.join(", ") + ");");
    return db;
  }

  function loadSQLDb(storage, indexFields) {
    var db = null;

    return storage
      .getAttachment(sqlStorageKey, sqlStorageKey, {
        format: 'array_buffer'
      })
      .push(function (data) {
        db = new SQL.Database(data);
      }, function () {
        db = initSQLDb(indexFields);
      })
      .push(function () {
        return db;
      });
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
    if (!spec.index_sub_storage) {
      throw new TypeError(
        "SQL 'index_sub_storage' must be provided."
      );
    }
    this._index_sub_storage = jIO.createJIO(spec.index_sub_storage);
    if (!this._index_sub_storage.hasCapacity('getAttachment')) {
      throw new TypeError(
        "SQL 'index_sub_storage' must have getAttachment capacity."
      );
    }

    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._index_fields = spec.index_fields;
  }

  SqlStorage.prototype._getDb = function () {
    var context = this;

    if (this._db) {
      return new RSVP.Queue().push(function () {
        return context._db;
      });
    }

    return loadSQLDb(
      this._index_sub_storage,
      this._index_fields
    ).push(function (db) {
      context._db = db;
      return context._db;
    });
  };

  SqlStorage.prototype._resetDb = function (indexFields) {
    this._index_fields = indexFields;
    this._db = initSQLDb(indexFields);
  };

  SqlStorage.prototype._saveDb = function () {
    var context = this;

    return this._getDb()
      .push(function (db) {
        var data = db["export"](); // jslint throws error
        return context._index_sub_storage.putAttachment(
          sqlStorageKey,
          sqlStorageKey,
          new Blob([data])
        );
      });
  };

  SqlStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  SqlStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };

  SqlStorage.prototype.post = function (doc) {
    var context = this,
      indexFields = this._index_fields;

    return this._sub_storage.post.apply(this._sub_storage, arguments)
      .push(function (id) {
        return context._getDb().push(function (db) {
          db.run(
            "INSERT INTO " + sqlTable + dbValues(indexFields),
            docToParams(id, doc)
          );
          return context._saveDb();
        });
      });
  };

  SqlStorage.prototype.put = function (id, doc) {
    var context = this,
      indexFields = this._index_fields;

    return this._sub_storage.put.apply(this._sub_storage, arguments)
      .push(function () {
        return context._getDb();
      })
      .push(function (db) {
        db.run(
          "UPDATE " + sqlTable + dbSet(indexFields) + " WHERE id=:id",
          docToParams(id, doc)
        );
        return context._saveDb();
      });
  };

  SqlStorage.prototype.remove = function (id) {
    var context = this;

    return this._sub_storage.remove(id)
      .push(function () {
        return context._getDb();
      })
      .push(function (db) {
        db.run("DELETE FROM " + sqlTable + " WHERE id=:id", {
          ":id": id
        });
        return context._saveDb();
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
      parsed_query = jIO.QueryFactory.create(options.query);

    return new RSVP.Queue()
      .push(function () {
        return context._getDb();
      })
      .push(function (db) {
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
}(Blob, jIO, RSVP, SQL));
