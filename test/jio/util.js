/*global setTimeout*/
(function (jIO, QUnit, setTimeout) {
  "use strict";
  var test = QUnit.test,
    equal = QUnit.equal,
    stop = QUnit.stop,
    start = QUnit.start,
    expect = QUnit.expect,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // util.stringify
  /////////////////////////////////////////////////////////////////
  module("util.stringify");
  test("is stable", function () {
    var str = jIO.util.stringify;
    // https://developer.mozilla.org/search?q=stringify
    equal(str({}), '{}');
    equal(str(true), 'true');
    equal(str('foo'), '"foo"');
    equal(str([1, 'false', false]), '[1,"false",false]');
    equal(str({ x: 5 }), '{"x":5}');
    equal(str(new Date(Date.UTC(2006, 0, 2, 15, 4, 5))),
          '"2006-01-02T15:04:05.000Z"');
    equal(str({ x: 5, y: 6, z: 7 }), '{"x":5,"y":6,"z":7}');
    equal(str({ z: 7, y: 6, x: 5 }), '{"x":5,"y":6,"z":7}');
    equal(str({ z: "", y: undefined, x: 5 }), '{"x":5,"z":""}');
    equal(str(Object.create(null, { x: { value: 'x', enumerable: false },
                                    y: { value: 'y', enumerable: true } })),
          '{"y":"y"}');

  });

  /////////////////////////////////////////////////////////////////
  // util.ajax
  /////////////////////////////////////////////////////////////////
  module("util.ajax", {
    setup: function () {
      var context = this;

      this.jioerror = jIO.util.jIOError;
      this.error_spy = {};
      function fakejIOError(message, status_code) {
        context.error_spy.message = message;
        context.error_spy.status_code = status_code;
      }
      fakejIOError.prototype = new Error();
      fakejIOError.prototype.constructor = fakejIOError;
      jIO.util.jIOError = fakejIOError;
    },

    teardown: function () {
      jIO.util.jIOError = this.jioerror;
    }
  });

  test("ajax timeout", function () {
    var timeout = 1,
      context = this;

    stop();
    expect(2);

    jIO.util.ajax({
      type: 'GET',
      url: "//www.foo/com/bar",
      timeout: timeout
    });

    setTimeout(function () {
      start();
      equal(context.error_spy.message, "Gateway Timeout");
      equal(context.error_spy.status_code, 504);
    }, 10);

  });
}(jIO, QUnit, setTimeout));