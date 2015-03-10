/*jslint indent: 2, maxlen: 80 */
/*global define, exports, window, require, localStorage, start, ok, deepEqual,
  sinon, setTimeout, clearTimeout */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    module(exports, require('sinon_qunit'));
  }
  if (typeof window === 'object') {
    window.test_util = {};
    module(window.test_util);
  }
}(['exports', 'sinon_qunit'], function (exports) {
  "use strict";

  //////////////////////////////////////////////////////////////////////////////
  // Tools

  /**
   * Test if the string is an Uuid
   *
   * @param  {String} uuid The string to test
   * @return {Boolean} true if is uuid, else false
   */
  function isUuid(uuid) {
    var x = "[0-9a-fA-F]";
    if (typeof uuid !== "string") {
      return false;
    }
    return (uuid.match(
      "^" + x + "{8}-" + x + "{4}-" +
        x + "{4}-" + x + "{4}-" + x + "{12}$"
    ) === null ? false : true);
  }
  exports.isUuid = isUuid;

}));
