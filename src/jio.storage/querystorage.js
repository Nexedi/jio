/*jslint nomen: true, maxlen: 200*/
/*global console, RSVP*/
(function (jIO) {
  "use strict";

  /**
   * The jIO QueryStorage extension
   *
   * @class QueryStorage
   * @constructor
   */
  function QueryStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._key_schema = spec.key_schema;
  }

  QueryStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
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

  /**
   * Retrieve documents.
   * This method performs an .allDocs() call on the substorage,
   * retrieving everything, then runs a query on the result.
   *
   * @method allDocs
   * @param  {Object} command The given parameters
   * @param  {Object} options The command options
   */
  QueryStorage.prototype.hasCapacity = function (name) {
    if (name === "list") {
      return this._sub_storage.hasCapacity(name);
    }
    return true;
  };
  QueryStorage.prototype.buildQuery = function (options) {
    var substorage = this._sub_storage,
      context = this,
//       sub_query_result,
      sub_options = {},
      is_manual_query_needed = false,
      is_manual_include_needed = false;

    if (substorage.hasCapacity("list")) {

      // Can substorage handle the queries if needed?
      try {
        if (((options.query !== undefined) && (!substorage.hasCapacity("query"))) ||
            ((options.sort_on !== undefined) && (!substorage.hasCapacity("sort"))) ||
            ((options.select_list !== undefined) && (!substorage.hasCapacity("select"))) ||
            ((options.limit !== undefined) && (!substorage.hasCapacity("limit")))) {
          sub_options.query = options.query;
          sub_options.sort_on = options.sort_on;
          sub_options.select_list = options.select_list;
          sub_options.limit = options.limit;
        }
      } catch (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 501)) {
          is_manual_query_needed = true;
        } else {
          throw error;
        }
      }

      // Can substorage include the docs if needed?
      try {
        if ((is_manual_query_needed || (options.include_docs === true)) && (!substorage.hasCapacity("include"))) {
          sub_options.include_docs = options.include_docs;
        }
      } catch (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 501)) {
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
          if (is_manual_include_needed) {
            len = result.length;
            for (i = 0; i < len; i += 1) {
              include_query_list.push(
                substorage.get({"_id": result[i].id})
              );
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
//             sub_query_result = result;
            len = result.length;
            for (i = 0; i < len; i += 1) {
              data_rows.push(result[i].doc);
            }
            if (options.select_list) {
              options.select_list.push("_id");
            }
            result = jIO.QueryFactory.create(options.query || "", context._key_schema).
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
                id: result[i]._id,
                value: options.select_list ? result[i] : {},
                doc: {}
              };
              if (options.select_list) {
                // Does not work if user manually request _id
                delete element.value._id;
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

//           if (options.include_docs) {
//             for (i = 0, l = filtered_docs.length; i < l; i += 1) {
//               filtered_docs[i] = {
//                 "id": filtered_docs[i]._id,
//                 "doc": docs[filtered_docs[i]._id],
//                 "value": options.select_list ? filtered_docs[i] : {}
//               };
//               delete filtered_docs[i].value._id;
//             }
//           } else {
//             for (i = 0, l = filtered_docs.length; i < l; i += 1) {
//               filtered_docs[i] = {
//                 "id": filtered_docs[i]._id,
//                 "value": options.select_list ? filtered_docs[i] : {}
//               };
//               delete filtered_docs[i].value._id;
//             }
//           }
//           response.data.rows = filtered_docs;
//           response.data.total_rows = filtered_docs.length;
//           return response;
//         });

//       return jIO.QueryFactory.create(options.query || "", that._key_schema).
//         exec(data_rows, options).
//         then(function (filtered_docs) {
//           // reconstruct filtered rows, preserving the order from docs
//           if (options.include_docs) {
//             for (i = 0, l = filtered_docs.length; i < l; i += 1) {
//               filtered_docs[i] = {
//                 "id": filtered_docs[i]._id,
//                 "doc": docs[filtered_docs[i]._id],
//                 "value": options.select_list ? filtered_docs[i] : {}
//               };
//               delete filtered_docs[i].value._id;
//             }
//           } else {
//             for (i = 0, l = filtered_docs.length; i < l; i += 1) {
//               filtered_docs[i] = {
//                 "id": filtered_docs[i]._id,
//                 "value": options.select_list ? filtered_docs[i] : {}
//               };
//               delete filtered_docs[i].value._id;
//             }
//           }
//           response.data.rows = filtered_docs;
//           response.data.total_rows = filtered_docs.length;
//           return response;
//         });

    }

//       }).then(function (response) {
// 
//         ((options.include_docs === undefined) || context.hasCapacity("include")) &&
//     }
// 
//       return context.buildQuery.apply(context, arguments);
//     }
// 
// //       // we need the full documents in order to perform the query, will
// //       // remove them later if they were not required.
// //       include_docs = (options.include_docs || options.query) ? true : false;
// 
//     console.log("QueryStorage: calling substorage buildQuery");
//     return substorage.buildQuery.apply(substorage, arguments);


//     return substorage.buildQuery.apply(substorage, arguments)
//       .push(function (result) {
//       });

//     substorage.allDocs({
//       "include_docs": include_docs
//     }).then(function (response) {
// 
//       var data_rows = response.data.rows, docs = {}, row, i, l;
// 
//       if (!include_docs) {
//         return response;
//       }
// 
//       if (options.include_docs) {
//         for (i = 0, l = data_rows.length; i < l; i += 1) {
//           row = data_rows[i];
//           docs[row.id] = JSON.parse(JSON.stringify(row.doc));
//           row.doc._id = row.id;
//           data_rows[i] = row.doc;
//         }
//       } else {
//         for (i = 0, l = data_rows.length; i < l; i += 1) {
//           row = data_rows[i];
//           row.doc._id = row.id;
//           data_rows[i] = row.doc;
//         }
//       }
// 
//       if (options.select_list) {
//         options.select_list.push("_id");
//       }
// 
//       return jIO.QueryFactory.create(options.query || "", that._key_schema).
//         exec(data_rows, options).
//         then(function (filtered_docs) {
//           // reconstruct filtered rows, preserving the order from docs
//           if (options.include_docs) {
//             for (i = 0, l = filtered_docs.length; i < l; i += 1) {
//               filtered_docs[i] = {
//                 "id": filtered_docs[i]._id,
//                 "doc": docs[filtered_docs[i]._id],
//                 "value": options.select_list ? filtered_docs[i] : {}
//               };
//               delete filtered_docs[i].value._id;
//             }
//           } else {
//             for (i = 0, l = filtered_docs.length; i < l; i += 1) {
//               filtered_docs[i] = {
//                 "id": filtered_docs[i]._id,
//                 "value": options.select_list ? filtered_docs[i] : {}
//               };
//               delete filtered_docs[i].value._id;
//             }
//           }
//           response.data.rows = filtered_docs;
//           response.data.total_rows = filtered_docs.length;
//           return response;
//         });
// 
//     }).then(command.success, command.error, command.notify);
  };

  jIO.addStorage('query', QueryStorage);

}(jIO));
