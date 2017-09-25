/*jslint nomen: true */
/*global Blob, sinon*/
(function (jIO, QUnit, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    //throws = QUnit.throws,
    tokens = ["sample_token1", "sample_token2"];

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage constructor
  /////////////////////////////////////////////////////////////////
  module("AutomaticAPIStorage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "automaticapi",
      access_tokens: tokens
    });
    equal(jio.__type, "automaticapi");
    deepEqual(jio.__storage._access_tokens, tokens);
  });

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage.get
  /////////////////////////////////////////////////////////////////
  module("AutomaticAPIStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "automaticapi",
        access_token: tokens
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.get("get1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id get1/ is forbidden (not starting with /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.get("/get1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /get1 is forbidden (not ending with /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    stop();
    expect(3);

    this.jio.get("/inexistent/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: /inexistent/");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("handle unauthorized", function () {
    var url = "https://api.automatic.com/vehicle/";
    this.server.respondWith("GET", url, [401, {
      "Content-Type": "application/json"
    }, '{"error":"err_unauthorized","detail":"Invalid token."}\n']);
    stop();
    expect(3);

    this.jio.get("/0/vehicle/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Invalid token provided, Unauthorized.");
        equal(error.status_code, 401);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get list of something", function () {
    var url = "https://api.automatic.com/vehicle/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"_metadata":{"count":1,"next":null,"previous":null},' +
      '"results":[{"id": "V_example"}]}' ]);
    url = "https://api.automatic.com/users/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "0"}' ]);
    stop();
    expect(1);

    this.jio.get("/all/vehicle/")
      .then(function (result) {
        deepEqual(result, [{
          'path': '/vehicle/V_example/',
          'reference': '/0/vehicle/V_example/',
          'type': 'vehicle',
          'started_at': null,
          'ended_at': null,
          'user': '0'
        }], "Check list type");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get single element", function () {
    var url = "https://api.automatic.com/trip" +
      "/T_randomtrip";
    this.server.respondWith("GET", url, [200, {
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/json'
    }, '{"id":"T_randomtrip",' +
      '"url":"https://api.automatic.com/trip/T_randomtrip/"}']);
    url = "https://api.automatic.com/users/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "0"}' ]);
    stop();
    expect(1);

    this.jio.get("/0/trip/T_randomtrip")
      .then(function (result) {
        deepEqual(result, {
          'path': '/trip/T_randomtrip/',
          'reference': '/0/trip/T_randomtrip/',
          'type': 'trip',
          'started_at': null,
          'ended_at': null,
          'user': '0'
        }, "Check single element type");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("queryStorage.buildQuery", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "automaticapi",
        access_token: tokens
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("query started_at, ended_at taken into account", function () {
    var url = "https://api.automatic.com/trip/";
    this.server.respondWith("GET", url, [200, {
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/json'
    }, '{"_metadata":{"count":1,"next":null,"previous":null},' +
      '"results":[{"id": "T_example", "started_at": "2017-06-17T16:45:41Z"' +
      ', "ended_at": "2017-06-17T16:46:38Z"}]}']);
    url = "https://api.automatic.com/users/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "0"}' ]);
    stop();
    expect(4);

    this.jio.buildQuery('started_at > "2017-06-17T18:45:41Z"')
      .then(function (result) {
        deepEqual(result, [], "Check no result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
    this.jio.buildQuery('started_at > "2017-06-17T14:45:41Z"')
      .then(function (result) {
        deepEqual(result, [{
          'path': '/trip/T_example/',
          'reference': '/0/trip/T_example/',
          'type': 'trip',
          'started_at': "2017-06-17T16:45:41Z",
          'ended_at': "2017-06-17T16:46:38Z",
          'user': '0'
        }], "Check trip is returned in result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
    this.jio.buildQuery('ended_at > "2017-06-17T18:45:41Z"')
      .then(function (result) {
        deepEqual(result, [], "Check no result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
    this.jio.buildQuery('ended_at < "2017-06-17T18:45:41Z"')
      .then(function (result) {
        deepEqual(result, [{
          'path': '/trip/T_example/',
          'reference': '/0/trip/T_example/',
          'type': 'trip',
          'started_at': "2017-06-17T16:45:41Z",
          'ended_at': "2017-06-17T16:46:38Z",
          'user': '0'
        }], "Check trip is returned in result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


}(jIO, QUnit, Blob, sinon));