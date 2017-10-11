/*jslint nomen: true*/
/*global RSVP, jiodate*/
(function (jIO, RSVP, jiodate) {
  "use strict";

  function dateType(str) {
    return jiodate.JIODate(new Date(str).toISOString());
  }

  function initKeySchema(storage, spec) {
    var property;
    for (property in spec.schema) {
      if (spec.schema.hasOwnProperty(property)) {
        if (spec.schema[property].type === "string" &&
            spec.schema[property].format === "date-time") {
          storage._key_schema.key_set[property] = {
            read_from: property,
            cast_to: "dateType"
          };
          if (storage._key_schema.cast_lookup.dateType === undefined) {
            storage._key_schema.cast_lookup.dateType = dateType;
          }
        } else {
          throw new jIO.util.jIOError(
            "Wrong schema for property: " + property,
            400
          );
        }
      }
    }
  }

  /**
   * The jIO QueryStorage extension
   *
   * @class QueryStorage
   * @constructor
   */
  function QueryStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._key_schema = {key_set: {}, cast_lookup: {}};
    initKeySchema(this, spec);
  }

  QueryStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  QueryStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  QueryStorage.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage, arguments);
  };
  QueryStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };
  QueryStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  QueryStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  QueryStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  QueryStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };
  QueryStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  QueryStorage.prototype.hasCapacity = function (name) {
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
  QueryStorage.prototype.buildQuery = function (options) {
    var substorage = this._sub_storage,
      context = this,
      sub_options = {},
      is_manual_query_needed = false,
      is_manual_include_needed = false;

    if (substorage.hasCapacity("list")) {

      // Can substorage handle the queries if needed?
      try {
        if (((options.query === undefined) ||
             (substorage.hasCapacity("query"))) &&
            ((options.sort_on === undefined) ||
             (substorage.hasCapacity("sort"))) &&
            ((options.select_list === undefined) ||
             (substorage.hasCapacity("select"))) &&
            ((options.limit === undefined) ||
             (substorage.hasCapacity("limit")))) {
          sub_options.query = options.query;
          sub_options.sort_on = options.sort_on;
          sub_options.select_list = options.select_list;
          sub_options.limit = options.limit;
        }
      } catch (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 501)) {
          is_manual_query_needed = true;
        } else {
          throw error;
        }
      }

      // Can substorage include the docs if needed?
      try {
        if ((is_manual_query_needed ||
            (options.include_docs === true)) &&
            (substorage.hasCapacity("include"))) {
          sub_options.include_docs = true;
        }
      } catch (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 501)) {
          is_manual_include_needed = true;
        } else {
          throw error;
        }
      }

      return substorage.buildQuery(sub_options)

        // Include docs if needed
        .push(function (result) {
          var include_query_list = [result],
            len,
            i;

          function safeGet(j) {
            var id = result[j].id;
            return substorage.get(id)
              .push(function (doc) {
                // XXX Can delete user data!
                doc._id = id;
                return doc;
              }, function (error) {
                // Document may have been dropped after listing
                if ((error instanceof jIO.util.jIOError) &&
                    (error.status_code === 404)) {
                  return;
                }
                throw error;
              });
          }

          if (is_manual_include_needed) {
            len = result.length;
            for (i = 0; i < len; i += 1) {
              include_query_list.push(safeGet(i));
            }
            result = RSVP.all(include_query_list);
          }
          return result;
        })
        .push(function (result) {
          var original_result,
            len,
            i;
          if (is_manual_include_needed) {
            original_result = result[0];
            len = original_result.length;
            for (i = 0; i < len; i += 1) {
              original_result[i].doc = result[i + 1];
            }
            result = original_result;
          }
          return result;

        })

        // Manual query if needed
        .push(function (result) {
          var data_rows = [],
            len,
            i;
          if (is_manual_query_needed) {
            len = result.length;
            for (i = 0; i < len; i += 1) {
              result[i].doc.__id = result[i].id;
              data_rows.push(result[i].doc);
            }
            if (options.select_list) {
              options.select_list.push("__id");
            }
            result = jIO.QueryFactory.create(options.query || "",
                                             context._key_schema).
              exec(data_rows, options);
          }
          return result;
        })

        // reconstruct filtered rows, preserving the order from docs
        .push(function (result) {
          var new_result = [],
            element,
            len,
            i;
          if (is_manual_query_needed) {
            len = result.length;
            for (i = 0; i < len; i += 1) {
              element = {
                id: result[i].__id,
                value: options.select_list ? result[i] : {},
                doc: {}
              };
              if (options.select_list) {
                // Does not work if user manually request __id
                delete element.value.__id;
              }
              if (options.include_docs) {
                // XXX To implement
                throw new Error("QueryStorage does not support include docs");
              }
              new_result.push(element);
            }
            result = new_result;
          }
          return result;
        });

    }
  };

  jIO.addStorage('query', QueryStorage);

}(jIO, RSVP, jiodate));
