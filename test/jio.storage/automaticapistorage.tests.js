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
        access_tokens: tokens
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
    var url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "usertest"}' ]);
    url = "https://api.automatic.com/trip/T_inexistent/";
    this.server.respondWith("GET", url, [404, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"error": "err_object_not_found"}' ]);
    stop();
    expect(3);

    this.jio.get("/usertest/trip/T_inexistent/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, 'Cannot find document:' +
          ' /usertest/trip/T_inexistent/, Error: ' +
          '{"error": "err_object_not_found"}');
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get invalid id document", function () {
    stop();
    expect(3);

    this.jio.get("/inexistent/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Invalid id.");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get on /all/... is invalid", function () {
    var url = "https://api.automatic.com/trip/T_whatever/";
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "application/json"
    }, '{}\n']);

    stop();
    expect(3);

    this.jio.get("/all/trip/T_whatever/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Invalid id.");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("handle unauthorized in Automatic", function () {
    var url = "https://api.automatic.com/trip/T_whatever/";
    this.server.respondWith("GET", url, [401, {
      "Content-Type": "application/json"
    }, '{"error":"err_unauthorized","detail":"Invalid token."}\n']);
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "usertest2"}' ]);

    stop();
    expect(3);

    this.jio.get("/usertest/trip/T_whatever/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: /usertest/trip/T_whatever/"
          + ", Error: No valid token for user: usertest");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get single element", function () {
    var url = "https://api.automatic.com/trip/T_randomtrip/";
    this.server.respondWith(function (xhr) {
      if (xhr.url !== 'https://api.automatic.com/trip/T_randomtrip/') {
        return;
      }
      if (xhr.requestHeaders.Authorization &&
          xhr.requestHeaders.Authorization === 'Bearer sample_token1') {
        xhr.respond(200, { "Content-Type": "application/json" },
          '{"id":"T_randomtrip",' +
          '"url":"https://api.automatic.com/trip/T_randomtrip/"}\n');
        return;
      }
      xhr.respond(404, { "Content-Type": "application/json" },
        '{"error":"err_unauthorized","detail":"Invalid token."}\n');
    });
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "usertest"}' ]);
    stop();
    expect(1);

    this.jio.get("/usertest/trip/T_randomtrip/")
      .then(function (result) {
        deepEqual(result, {
          'automatic_path': '/trip/T_randomtrip/',
          'reference': '/usertest/trip/T_randomtrip/',
          'id': '/usertest/trip/T_randomtrip/',
          'type': 'trip',
          'start_date': null,
          'stop_date': null,
          'automatic_user': 'usertest'
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
  // AutomaticAPIStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("AutomaticAPIStorage.getAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "automaticapi",
        access_tokens: tokens
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

    this.jio.getAttachment("get1/", "whatever")
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

    this.jio.getAttachment("/get1", 'whatever')
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

  test("get inexistent document's attachment", function () {
    var url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "usertest"}' ]);
    url = "https://api.automatic.com/trip/T_inexistent/";
    this.server.respondWith("GET", url, [404, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"error": "err_object_not_found"}' ]);
    stop();
    expect(3);

    this.jio.getAttachment("/usertest/trip/T_inexistent/", 'whatever')
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, 'Cannot find document:' +
          ' /usertest/trip/T_inexistent/, Error: ' +
          '{"error": "err_object_not_found"}');
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get invalid id document's attachment", function () {
    stop();
    expect(3);

    this.jio.getAttachment("/inexistent/", 'whatever')
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Invalid id.");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment on /all/... is invalid", function () {
    var url = "https://api.automatic.com/trip/T_whatever/";
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "application/json"
    }, '{}\n']);

    stop();
    expect(3);

    this.jio.getAttachment("/all/trip/T_whatever/", 'whatever')
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Invalid id.");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("handle unauthorized in Automatic", function () {
    var url = "https://api.automatic.com/trip/T_whatever/";
    this.server.respondWith("GET", url, [401, {
      "Content-Type": "application/json"
    }, '{"error":"err_unauthorized","detail":"Invalid token."}\n']);
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "usertest2"}' ]);

    stop();
    expect(3);

    this.jio.getAttachment("/usertest/trip/T_whatever/", 'whatever')
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: /usertest/trip/T_whatever/"
          + ", Error: No valid token for user: usertest");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment on single element", function () {
    var url = "https://api.automatic.com/trip/T_randomtrip/";
    this.server.respondWith(function (xhr) {
      if (xhr.url !== 'https://api.automatic.com/trip/T_randomtrip/') {
        return;
      }
      if (xhr.requestHeaders.Authorization &&
          xhr.requestHeaders.Authorization === 'Bearer sample_token1') {
        xhr.respond(200, { "Content-Type": "application/json" },
          '{"id":"T_randomtrip",' +
          '"url":"https://api.automatic.com/trip/T_randomtrip/"}\n');
        return;
      }
      xhr.respond(404, { "Content-Type": "application/json" },
        '{"error":"err_unauthorized","detail":"Invalid token."}\n');
    });
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "usertest"}' ]);
    stop();
    expect(1);

    this.jio.getAttachment("/usertest/trip/T_randomtrip/", 'data', {format:
      'text'}).then(function (result) {
      deepEqual(result, '{"id":"T_randomtrip",' +
        '"url":"https://api.automatic.com/trip/T_randomtrip/"}',
        "Check single element type");
    })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("AutomaticAPIStorage.allAttachments", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "automaticapi",
        access_tokens: tokens
      });
    }
  });

  test("only attachment is data", function () {
    stop();
    expect(1);

    this.jio.allAttachments('/usertest/trip/T_trip/').then(function (result) {
      deepEqual(result, {data: null});
    }).fail(function (error) {
      ok(false, error);
    }).always(function () {
      start();
    });
  });

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("AutomaticAPIStorage.buildQuery", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "automaticapi",
        access_tokens: tokens
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("query start_date, stop_date taken into account", function () {
    var url;
    this.server.respond(function (xhr) {
      if (xhr.url.indexOf('https://api.automatic.com/trip/') === -1) {
        return;
      }
      if (xhr.requestHeaders.Authorization &&
          xhr.requestHeaders.Authorization === 'Bearer sample_token1') {
        xhr.respond(200, { "Content-Type": "application/json" },
          '{"_metadata":{"count":1,"next":null,"previous":null},' +
          '"results":[{"id": "T_example", "started_at": "2017-06-17T16:45:41Z"'
          + ', "ended_at": "2017-06-17T16:46:38Z"' +
          ', "url": "https://api.automatic.com/trip/T_example/",' +
          '"type": "trip"}]}');
        return;
      }
      xhr.respond(200, { "Content-Type": "application/json" },
        '{"_metadata":{"count":0,"next":null,"previous":null},' +
        '"results":[]}');
    });
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "0"}' ]);
    stop();
    expect(4);

    this.jio.buildQuery({
      query: 'start_date:>"2017-06-17T18:45:41Z" AND type:="trip"'
    })
      .then(function (result) {
        deepEqual(result, [], "Check no result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
    this.jio.buildQuery({
      query: 'start_date:>"2017-06-17T14:45:41Z" AND type:="trip"'
    })
      .then(function (result) {
        deepEqual(result, [{
          'automatic_path': '/trip/T_example/',
          'reference': '/0/trip/T_example/',
          'id': '/0/trip/T_example/',
          'type': 'trip',
          'start_date': "2017-06-17T16:45:41Z",
          'stop_date': "2017-06-17T16:46:38Z",
          'automatic_user': '0'
        }], "Check trip is returned in result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        stop();
      })
      .always(function () {
        start();
      });
    this.jio.buildQuery({
      query: 'stop_date:>"2017-06-17T18:45:41Z" AND type:="trip"'
    })
      .then(function (result) {
        deepEqual(result, [], "Check no result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        stop();
      })
      .always(function () {
        start();
      });
    this.jio.buildQuery({
      query: 'stop_date:<"2017-06-17T18:45:41Z" AND type:="trip"'
    })
      .then(function (result) {
        deepEqual(result, [{
          'automatic_path': '/trip/T_example/',
          'reference': '/0/trip/T_example/',
          'id': '/0/trip/T_example/',
          'type': 'trip',
          'start_date': "2017-06-17T16:45:41Z",
          'stop_date': "2017-06-17T16:46:38Z",
          'automatic_user': '0'
        }], "Check trip is returned in result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        stop();
      })
      .always(function () {
        start();
      });
  });

  test("get list of something", function () {
    var url;
    this.server.respond(function (xhr) {
      if (xhr.url.indexOf('https://api.automatic.com/vehicle/') === -1) {
        return;
      }
      if (xhr.requestHeaders.Authorization &&
          xhr.requestHeaders.Authorization === 'Bearer sample_token1') {
        xhr.respond(200, { "Content-Type": "application/json" },
          '{"_metadata":{"count":1,"next":null,"previous":null},' +
          '"results":[{"id": "V_example", ' +
          ' "url": "https://api.automatic.com/vehicle/V_example/"}]}');
        return;
      }
      xhr.respond(200, { "Content-Type": "application/json" },
        '{"_metadata":{"count":0,"next":null,"previous":null},' +
        '"results":[]}');
    });
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "0"}' ]);
    stop();
    expect(1);

    this.jio.buildQuery({
      query: 'type:="vehicle"'
    })
      .then(function (result) {
        deepEqual(result, [{
          'automatic_path': '/vehicle/V_example/',
          'reference': '/0/vehicle/V_example/',
          'id': '/0/vehicle/V_example/',
          'type': 'vehicle',
          'start_date': null,
          'stop_date': null,
          'automatic_user': '0'
        }], "Check vehicle list is returned");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("fail nicely when nothing is returned", function () {
    var url;
    this.server.respond(function (xhr) {
      if (xhr.url.indexOf('https://api.automatic.com/vehicle/') === -1) {
        return;
      }
      if (xhr.requestHeaders.Authorization &&
          xhr.requestHeaders.Authorization === 'Bearer sample_token1') {
        xhr.respond(200, { "Content-Type": "application/json" },
          '{"_metadata":{"count":1,"next":null,"previous":null},' +
          '"results":[{"id": "V_example", ' +
          ' "url": "https://api.automatic.com/vehicle/V_example/"}]}');
        return;
      }
      xhr.respond(200, { "Content-Type": "application/json" },
        '{"_metadata":{"count":0,"next":null,"previous":null},' +
        '"results":[]}');
    });
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [404, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"detail": "Object not found", "error": "err_object_not_found"}' ]);
    stop();
    expect(1);

    this.jio.buildQuery({
      query: 'type:="vehicle"'
    })
      .then(function (result) {
        deepEqual(result, [], "Check nothing is returned");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get list of something, check that next url works", function () {
    var url;
    this.server.respond(function (xhr) {
      if (xhr.url.indexOf('https://api.automatic.com/vehicle/') === -1) {
        return;
      }
      if (xhr.requestHeaders.Authorization &&
          xhr.requestHeaders.Authorization === 'Bearer sample_token1') {
        xhr.respond(200, { "Content-Type": "application/json" },
          '{"_metadata":{"count":1,"next": ' +
          '"https://api.automatic.com/specific/nexturl/","previous":null},' +
          '"results":[{"id": "V_example", ' +
          ' "url": "https://api.automatic.com/vehicle/V_example/"}]}');
        return;
      }
      xhr.respond(200, { "Content-Type": "application/json" },
        '{"_metadata":{"count":0,"next":null,"previous":null},' +
        '"results":[]}');
    });
    url = "https://api.automatic.com/user/me/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"id": "0"}' ]);
    url = "https://api.automatic.com/specific/nexturl/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"_metadata":{"count":1,"next":null,"previous":null},' +
        '"results":[{"id": "V_example2", ' +
        ' "url": "https://api.automatic.com/vehicle/V_example2/"}]}' ]);
    stop();
    expect(1);

    this.jio.buildQuery({
      query: 'type:="vehicle"'
    })
      .then(function (result) {
        deepEqual(result, [{
          'automatic_path': '/vehicle/V_example/',
          'reference': '/0/vehicle/V_example/',
          'id': '/0/vehicle/V_example/',
          'type': 'vehicle',
          'start_date': null,
          'stop_date': null,
          'automatic_user': '0'
        }, {
          'automatic_path': '/vehicle/V_example2/',
          'reference': '/0/vehicle/V_example2/',
          'id': '/0/vehicle/V_example2/',
          'type': 'vehicle',
          'start_date': null,
          'stop_date': null,
          'automatic_user': '0'
        }], "Check vehicle list is returned");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


}(jIO, QUnit,  sinon));