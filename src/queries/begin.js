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
// define([module_name], [dependencies], module);
(function (module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(module);
  }
  window.complex_queries = module();
}(function () {
  "use strict";
  var to_export = {};

  /**
   * Add a secured (write permission denied) property to an object.
   *
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
