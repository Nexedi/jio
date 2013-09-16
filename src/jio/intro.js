(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports, require('promy'), require('sha256'));
  }
  window.jIO = {};
  module(window.jIO, promy, {hex_sha256: hex_sha256});
}(['exports', 'promy', 'sha256'], function (exports, promy, sha256) {
  "use strict";

  var hex_sha256 = sha256.hex_sha256, Deferred = promy.Deferred;
