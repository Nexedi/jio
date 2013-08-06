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
  window.jIO = module(hex_md5);
}(['md5'], function (hex_md5) {
  "use strict";

  var localstorage;
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
        delete localStorage[item];
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
          return value === undefined ?
              null : JSON.parse(pseudo_localStorage[item]);
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
