(function (jIO, QUnit) {
  "use strict";
  var test = QUnit.test,
    equal = QUnit.equal,
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
    equal(str({y: "y", testnull: null}),
          '{"testnull":null,"y":"y"}');

  });

}(jIO, QUnit));