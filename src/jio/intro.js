(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports);
  }
  window.jIO = {};
  module(window.jIO);
}(['exports'], function (exports) {

    /**
     * Add a secured (write permission denied) property to an object.
     *
     * @method defineConstant
     * @param  {Object} object The object to fill
     * @param  {String} key The object key where to store the property
     * @param  {Any} value The value to store
     */
    function defineConstant(object, key, value) {
      Object.defineProperty(object, key, {
        "configurable": false,
        "enumerable": true,
        "writable": false,
        "value": value
      });
      return object;
    }

    /**
     * Secures all enumerable functions from an object, making them
     * not configurable, not writable, not enumerable.
     *
     * @method secureMethods
     * @param {Object} object The object to secure
     */
    function secureMethods(object) {
      var key;
      for (key in object) {
        if (object.hasOwnProperty(key)) {
          if (typeof object[key] === "function") {
            Object.defineProperty(object, key, {
              "configurable": false,
              "enumerable": false,
              "writable": false,
              "value": object[key]
            });
          }
        }
      }
      return object;
    }

    /**
     * Inherits the prototype methods from one constructor into another. The
     * prototype of `constructor` will be set to a new object created from
     * `superConstructor`.
     *
     * @param  {Function} constructor The constructor which inherits the super
     *   one
     * @param  {Function} superConstructor The super constructor
     */
    function inherits(constructor, superConstructor) {
      constructor.super_ = superConstructor;
      constructor.prototype = Object.create(superConstructor.prototype, {
        "constructor": {
          "configurable": true,
          "enumerable": false,
          "writable": true,
          "value": constructor
        }
      });
    }
