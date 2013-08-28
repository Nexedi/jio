(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports);
  }
  window.jIO = {};
  module(window.jIO, {hex_sha256: hex_sha256});
}(['exports', 'sha256'], function (exports, sha256) {
  "use strict";

  var hex_sha256 = sha256.hex_sha256;
