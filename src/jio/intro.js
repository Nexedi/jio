(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports, require('rsvp'), require('sha256'));
  }
  window.jIO = {};
  module(window.jIO, RSVP, {hex_sha256: hex_sha256});
}(['exports', 'rsvp', 'sha256'], function (exports, RSVP, sha256) {
  "use strict";

  var hex_sha256 = sha256.hex_sha256;
