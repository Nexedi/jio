/*jslint nomen: true */
/*global Blob, sinon*/
(function (jIO, QUnit, Blob, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    domain = "https://example.org",
    utils = {callback: function () {return true; }};

  /////////////////////////////////////////////////////////////////
  // davStorage constructor
  /////////////////////////////////////////////////////////////////
  module("httpStorage.constructor");

  test("default parameters", function () {
    var jio = jIO.createJIO({
      type: "http"
    });

    equal(jio.__type, "http");
    deepEqual(jio.__storage._catch_error, false);
    deepEqual(jio.__storage._timeout, 0);
  });

  test("Test callback", function () {
    var jio = jIO.createJIO({
      type: "http"
    }, utils);

    deepEqual(jio.__storage._utils.callback(), true);
  });

  test("Storage store catch_error", function () {
    var jio = jIO.createJIO({
      type: "http",
      catch_error: true
    });

    equal(jio.__type, "http");
    deepEqual(jio.__storage._catch_error, true);
    deepEqual(jio.__storage._timeout, 0);
  });

  test("Storage with timeout", function () {
    var jio = jIO.createJIO({
      type: "http",
      timeout: 1000
    });

    equal(jio.__type, "http");
    deepEqual(jio.__storage._timeout, 1000);
  });
  /////////////////////////////////////////////////////////////////
  // httpStorage.get
  /////////////////////////////////////////////////////////////////
  module("httpStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get document", function () {
    var id = domain + "/id1/";
    this.server.respondWith("HEAD", id, [200, {
      "Content-Type": "text/xml-foo"
    }, '']);
    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          "Content-Type": "text/xml-foo",
          "Status": 200
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with a not expected status", function () {
    var id = domain + "/id1/";
    this.server.respondWith("HEAD", id, [500, {
      "Content-Type": "text/xml-foo"
    }, '']);
    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        equal(error.target.status, 500);
      })
      .always(function () {
        start();
      });
  });

  test("get document with 404 status", function () {
    var id = domain + "/id1/";

    stop();
    expect(3);

    this.jio.get(id)
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find url " + id);
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get document with a not expected status and catch error", function () {
    var id = domain + "/id1/";
    this.server.respondWith("HEAD", id, [500, {
      "Content-Type": "text/xml-foo"
    }, '']);

    this.jio = jIO.createJIO({
      type: "http",
      catch_error: true
    });

    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          "Content-Type": "text/xml-foo",
          "Status": 500
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // httpStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("httpStorage.allAttachments", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get document with attachment", function () {
    stop();
    expect(1);

    this.jio.allAttachments('/id')
      .then(function (result) {
        deepEqual(result, {
          enclosure: {}
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // httpStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("httpStorage.getAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("forbidden attachment", function () {
    var id = domain + "/id1/";

    stop();
    expect(3);

    this.jio.getAttachment(
      id,
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(
          error.message,
          "Forbidden attachment: https://example.org/id1/ , attachment1"
        );
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get attachment", function () {
    var id = domain + "/id1/";

    this.server.respondWith("GET", id, [200, {
      "Content-Type": "text/xml-foo"
    }, "foo\nbaré"]);

    stop();
    expect(3);

    this.jio.getAttachment(id, 'enclosure')
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "text/xml-foo", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, "foo\nbaré",
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  test("get attachment with a not expected status", function () {
    var id = domain + "/id1/";
    this.server.respondWith("GET", id, [500, {
      "Content-Type": "text/xml-foo"
    }, '']);
    stop();
    expect(1);

    this.jio.getAttachment(id, 'enclosure')
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        equal(error.target.status, 500);
      })
      .always(function () {
        start();
      });
  });

  test("get attachment with 404 status", function () {
    var id = domain + "/id1/";

    stop();
    expect(3);

    this.jio.getAttachment(id, 'enclosure')
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find url " + id);
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get attachment with unexpected status and catch error", function () {
    var id = domain + "/id1/";
    this.server.respondWith("GET", id, [500, {
      "Content-Type": "text/xml-foo"
    }, 'foo\nbaré']);

    this.jio = jIO.createJIO({
      type: "http",
      catch_error: true
    });

    stop();
    expect(3);

    this.jio.getAttachment(id, 'enclosure')
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "text/xml-foo", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, "foo\nbaré",
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // httpStorage timeout set
  /////////////////////////////////////////////////////////////////
  module("httpStorage.timeout", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http",
        timeout: 1000
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get document with timeout set", function () {
    var id = domain + "/id1/";
    this.server.respondWith("HEAD", id, [200, {
      "Content-Type": "text/xml-foo"
    }, '']);
    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          "Content-Type": "text/xml-foo",
          "Status": 200
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // httpStorage request timeout
  /////////////////////////////////////////////////////////////////
  module("httpStorage.requesttimeout", {
    setup: function () {

      this.jio = jIO.createJIO({
        type: "http",
        timeout: 1
      });
    }
  });

  test("get document will timeout", function () {
    var id = domain + "/id1/";
    stop();
    expect(3);

    this.jio.get(id)
      .then(function (result) {
        ok(false, result);
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

}(jIO, QUnit, Blob, sinon));
