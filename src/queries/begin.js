/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/

/**
 * Provides some function to use complex queries with item list
 *
 * @module complex_queries
 */
var complex_queries;
(function () {
  "use strict";
  var to_export = {}, module_name = "complex_queries";
  /**
   * Add a secured (write permission denied) property to an object.
   * @method defineProperty
   * @param  {Object} object The object to fill
   * @param  {String} key The object key where to store the property
   * @param  {Any} value The value to store
   */
  function _export(key, value) {
    Object.defineProperty(to_export, key, {
      "configurable": false,
      "enumerable": true,
      "writable": false,
      "value": value
    });
  }
