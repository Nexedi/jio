/*jslint indent: 2, maxlen: 80 */
/*global define, exports, window, localStorage, ok, deepEqual, sinon */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    module(exports);
  }
  if (typeof window === 'object') {
    window.test_util = {};
    module(window.test_util);
  }
}(['exports'], function (exports) {
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

  /**
   * A useful tool to set/get json object into the localStorage
   */
  exports.jsonlocalstorage = {
    clear: function () {
      return localStorage.clear();
    },
    getItem: function (item) {
      var value = localStorage.getItem(item);
      return value === null ? null : JSON.parse(value);
    },
    setItem: function (item, value) {
      return localStorage.setItem(item, JSON.stringify(value));
    },
    removeItem: function (item) {
      return localStorage.removeItem(item);
    }
  };

  //////////////////////////////////////////////////////////////////////////////
  // Deprecated

  function spyJioCallback(result_type, value, message) {
    return function (err, response) {
      var val;
      switch (result_type) {
      case 'value':
        val = err || response;
        break;
      case 'status':
        val = (err || {}).status;
        break;
      case 'jobstatus':
        val = (err ? 'fail' : 'done');
        break;
      default:
        ok(false, "Unknown case " + result_type);
        break;
      }
      deepEqual(val, value, message);
    };
  }
  exports.spyJioCallback = spyJioCallback;

  function ospy(o, result_type, value, message, function_name) {
    function_name = function_name || 'f';
    o[function_name] = function (err, response) {
      var val;
      switch (result_type) {
      case 'value':
        val = err || response;
        break;
      case 'status':
        val = (err || {}).status;
        break;
      case 'jobstatus':
        val = (err ? 'fail' : 'done');
        break;
      default:
        ok(false, "Unknown case " + result_type);
        break;
      }
      deepEqual(val, value, message);
    };
    sinon.spy(o, function_name);
  }
  exports.ospy = ospy;

  function otick(o, a, b) {
    var tick = 1, function_name = 'f';
    if (typeof a === 'number' && !isNaN(a)) {
      tick = a;
      a = b;
    }
    if (typeof a === 'string') {
      function_name = a;
    }
    o.clock.tick(tick);
    if (!o[function_name].calledOnce) {
      if (o[function_name].called) {
        ok(false, 'too much results');
      } else {
        ok(false, 'no response');
      }
    }
  }
  exports.otick = otick;

}));
