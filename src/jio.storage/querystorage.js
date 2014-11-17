/*jslint nomen: true*/
/*global console*/
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
  QueryStorage.prototype.allDocs = function (options) {
    console.log(options);
//     var context = this,
    var substorage = this._sub_storage;
//       // we need the full documents in order to perform the query, will
//       // remove them later if they were not required.
//       include_docs = (options.include_docs || options.query) ? true : false;

    return substorage.allDocs.apply(substorage, arguments);
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
