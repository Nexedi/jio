/*
 * Copyright 2013, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */
(function (jIO, QUnit) {
  "use strict";
  var test = QUnit.test,
    equal = QUnit.equal,
    stop = QUnit.stop,
    start = QUnit.start,
    expect = QUnit.expect,
    module = QUnit.module,
    ok = QUnit.ok;

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

  /////////////////////////////////////////////////////////////////
  // util.ajax
  /////////////////////////////////////////////////////////////////
  module("util.ajax");

  test("ajax timeout", function () {
    var timeout = 1;

    stop();
    expect(3);

    return new RSVP.Queue()
      .then(function () {
        return jIO.util.ajax({
          type: 'GET',
          url: "https://www.example.org/com/bar",
          timeout: timeout
        });
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Gateway Timeout");
        equal(error.status_code, 504);
      })
      .always(function () {
        start();
      });
  });
}(jIO, QUnit));