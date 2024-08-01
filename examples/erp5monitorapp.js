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
    console.log("ERP55Monitor spec:", spec);
    if (!spec.sub_storage || spec.sub_storage.type !== 'erp5') {
      throw new TypeError("ERP55Monitor subtorage must be erp5 type");
    }
    this._sub_storage = spec.sub_storage;
  }

  ERP55Monitor.prototype.get = function (id) {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  ERP55Monitor.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage, arguments);
  };

  ERP55Monitor.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };

  ERP55Monitor.prototype.hasCapacity = function (capacity) {
    return (capacity === "list") || (capacity === "limit") || (capacity === "include");
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