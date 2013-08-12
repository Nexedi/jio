/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports, require('md5'));
  }
  window.jIO = {};
  module(window.jIO, {hex_md5: hex_md5});
}(['exports', 'md5'], function (exports, md5) {
  "use strict";

  var localstorage, hex_md5 = md5.hex_md5;
  if (typeof localStorage !== "undefined") {
    localstorage = {
      getItem: function (item) {
        var value = localStorage.getItem(item);
        return value === null ? null : JSON.parse(value);
      },
      setItem: function (item, value) {
        return localStorage.setItem(item, JSON.stringify(value));
      },
      removeItem: function (item) {
        return localStorage.removeItem(item);
      },
      clone: function () {
        return JSON.parse(JSON.stringify(localStorage));
      }
    };
  } else {
    (function () {
      var pseudo_localStorage = {};
      localstorage = {
        getItem: function (item) {
          var value = pseudo_localStorage[item];
          return value === undefined ? null : JSON.parse(value);
        },
        setItem: function (item, value) {
          pseudo_localStorage[item] = JSON.stringify(value);
        },
        removeItem: function (item) {
          delete pseudo_localStorage[item];
        },
        clone: function () {
          return JSON.parse(JSON.stringify(pseudo_localStorage));
        }
      };
    }());
  }
