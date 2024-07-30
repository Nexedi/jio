/*
 * Copyright 2016, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global jIO, RSVP */

(function (jIO, RSVP) {
  "use strict";
  /**
   * Monitor erp5 layer to wrap erp5 storages for monitor app
   *
   * @class ERP55Monitor
   * @constructor
   */
  function ERP55Monitor(spec) {
    this._sub_storage = spec;
    //TODO check substorage?
    if (typeof spec.url !== 'string') {
      throw new TypeError("ERP55Monitor is not of type string");
    }
  }

  ERP55Monitor.prototype.get = function (id) {
    var i,
      context = this,
      arg = arguments,
      result = this._sub_storage.get.apply(this._sub_storage, arg);

    result
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return context._storage_list[j].get.apply(context._storage_list[j],
                                                    arg)
            .push(function (doc) {
              index = j;
              return doc;
            });
        }
        throw error;
      });

    return result
      .push(function (doc) {
        return [0, doc];
      });
  };

  ERP55Monitor.prototype.hasCapacity = function (capacity) {
    return (capacity === "list") || (capacity === "include");
  };

  ERP55Monitor.prototype.buildQuery = function (options) {
    //TODO handle limit and add storage info
    var promise_list = [],
      id_dict = {},
      sub_storage;
    sub_storage = this._sub_storage;
    return new RSVP.Queue()
      .push(function () {
        return sub_storage.buildQuery.apply(sub_storage, arguments);
      })
      .push(function (result_list) {
        //TODO add substorage and handle result
        return result_list;
      });
  };

  jIO.addStorage('erp5monitor', ERP55Monitor);

}(jIO, RSVP));