/*jslint indent: 2, maxlen: 80, nomen: true, regexp: true, unparam: true */
/*global define, RSVP, jIO */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(RSVP, jIO);
}(['rsvp', 'jio'], function (RSVP, jIO) {
  "use strict";


  /**
   * The jIO QueryStorage extension
   *
   * @class QueryStorage
   * @constructor
   */
  function RangeStorage(spec) {
    this._sub_storage = spec.sub_storage;
    this._key_schema = spec.key_schema;
  }


  /**
   * Get a document
   * Parameters are passed through to the sub storage.
   *
   * @method get
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.get = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.get.apply(substorage, args).
      then(command.success, command.error, command.notify);
  };


  /**
   * Create a document in the sub storage.
   * Parameters are passed through to the sub storage.
   *
   * @method post
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.post = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.post.apply(substorage, args).
      then(command.success, command.error, command.notify);
  };


  /**
   * Create or update a document in the sub storage.
   * Parameters are passed through to the sub storage.
   *
   * @method put
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.put = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.put.apply(substorage, args).
      then(command.success, command.error, command.notify);
  };


  /**
   * Remove a document.
   * Parameters are passed through to the sub storage.
   *
   * @method remove
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.remove = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.remove.apply(substorage, args).
      then(command.success, command.error, command.notify);
  };


  /**
   * Get an attachment.
   * Parameters are passed through to the sub storage.
   *
   * @method getAttachment
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.getAttachment = function (command, param) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.getAttachment.apply(substorage, args).
      then(function (result) {
        param._start = param._start === undefined ? 0 : param._start;
        param._end = param._end === undefined ? result.data.size :
            param._end;
        if (param._start < 0 || param._end < 0) {
          throw ({"status": 404, "reason": "invalide _start, _end",
                  "message": "_start and _end must be positive"});
        }
        if (param._start > param._end) {
          throw ({"status": 404, "reason": "invalide offset",
                  "message": "start is great then end"});
        }
        result.data = result.data.slice(param._start, param._end);
        return result;
      }).
      then(command.success, command.error, command.notify);
  };


  /**
   * Add an attachment to a document.
   * Parameters are passed through to the sub storage.
   *
   * @method putAttachment
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.putAttachment = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.putAttachment.apply(substorage, args).
      then(command.success, command.error, command.notify);
  };


  /**
   * Remove an attachment.
   * Parameters are passed through to the sub storage.
   *
   * @method removeAttachment
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.removeAttachment = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.removeAttachment.apply(substorage, args).
      then(command.success, command.error, command.notify);
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
  RangeStorage.prototype.allDocs = function (command, param, options) {
    var that = this,
      substorage = command.storage(this._sub_storage),
      // we need the full documents in order to perform the query, will
      // remove them later if they were not required.
      include_docs = (options.include_docs || options.query) ? true : false;

    substorage.allDocs({
      "include_docs": include_docs
    }).then(function (response) {

      var data_rows = response.data.rows, docs = {}, row, i, l;

      if (!include_docs) {
        return response;
      }

      if (options.include_docs) {
        for (i = 0, l = data_rows.length; i < l; i += 1) {
          row = data_rows[i];
          docs[row.id] = JSON.parse(JSON.stringify(row.doc));
          row.doc._id = row.id;
          data_rows[i] = row.doc;
        }
      } else {
        for (i = 0, l = data_rows.length; i < l; i += 1) {
          row = data_rows[i];
          row.doc._id = row.id;
          data_rows[i] = row.doc;
        }
      }

      if (options.select_list) {
        options.select_list.push("_id");
      }

      return jIO.QueryFactory.create(options.query || "", that._key_schema).
        exec(data_rows, options).
        then(function (filtered_docs) {
          // reconstruct filtered rows, preserving the order from docs
          if (options.include_docs) {
            for (i = 0, l = filtered_docs.length; i < l; i += 1) {
              filtered_docs[i] = {
                "id": filtered_docs[i]._id,
                "doc": docs[filtered_docs[i]._id],
                "value": options.select_list ? filtered_docs[i] : {}
              };
              delete filtered_docs[i].value._id;
            }
          } else {
            for (i = 0, l = filtered_docs.length; i < l; i += 1) {
              filtered_docs[i] = {
                "id": filtered_docs[i]._id,
                "value": options.select_list ? filtered_docs[i] : {}
              };
              delete filtered_docs[i].value._id;
            }
          }
          response.data.rows = filtered_docs;
          response.data.total_rows = filtered_docs.length;
          return response;
        });

    }).then(command.success, command.error, command.notify);
  };


  /**
   * Check a document
   * Parameters are passed through to the sub storage.
   *
   * @method check
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.check = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.check.apply(substorage, args).
      then(command.success, command.error, command.notify);
  };


  /**
   * Repair a document
   * Parameters are passed through to the sub storage.
   *
   * @method repair
   * @param  {Object} command The JIO command
   */
  RangeStorage.prototype.repair = function (command) {
    var args = [].slice.call(arguments, 1), substorage;
    substorage = command.storage(this._sub_storage);
    substorage.repair.apply(substorage, args).
      then(command.success, command.error, command.notify);
  };


  jIO.addStorage('range', RangeStorage);

}));
