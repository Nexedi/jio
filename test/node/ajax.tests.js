/*
 * Copyright 2019, Nexedi SA
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
/*global FormData, sinon, RSVP, jIO, QUnit*/
(function (jIO, QUnit, FormData) {
  "use strict";
  var test = QUnit.test,
    equal = QUnit.equal,
    deepEqual = QUnit.deepEqual,
    stop = QUnit.stop,
    start = QUnit.start,
    expect = QUnit.expect,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // util.ajax
  /////////////////////////////////////////////////////////////////
  module("node.ajax", {
    setup: function () {
      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("FormData handling", function () {
    stop();
    expect(3);

    var url = "https://www.example.org/com/bar",
      server = this.server;

    this.server.respondWith("POST", url, [200, {}, 'OK']);

    return new RSVP.Queue()
      .then(function () {
        var form_data = new FormData();
        form_data.append("foo", "bar");
        return jIO.util.ajax({
          type: 'POST',
          url: url,
          data: form_data,
          headers: {"bar": "foo"}
        });
      })
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url);
        equal(server.requests[0].requestBody, undefined);
        deepEqual(server.requests[0].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
      })
      .always(function () {
        start();
      });
  });
}(jIO, QUnit, FormData));