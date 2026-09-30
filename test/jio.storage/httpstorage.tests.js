/*
 * Copyright 2017, Nexedi SA
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
/*jslint nomen: true */
/*global Blob, sinon*/
(function (jIO, QUnit, Blob, sinon) {
  "use strict";
  var test = QUnit.test,
    start,
    module = QUnit.module,
    domain = "https://example.org";

  /////////////////////////////////////////////////////////////////
  // davStorage constructor
  /////////////////////////////////////////////////////////////////
  module("httpStorage.constructor");

  test("default parameters", function (assert) {
    var jio = jIO.createJIO({
      type: "http"
    });

    assert.equal(jio.__type, "http");
    assert.deepEqual(jio.__storage._catch_error, false);
    assert.deepEqual(jio.__storage._timeout, 0);
  });

  test("Storage store catch_error", function (assert) {
    var jio = jIO.createJIO({
      type: "http",
      catch_error: true
    });

    assert.equal(jio.__type, "http");
    assert.deepEqual(jio.__storage._catch_error, true);
    assert.deepEqual(jio.__storage._timeout, 0);
  });

  test("Storage with timeout", function (assert) {
    var jio = jIO.createJIO({
      type: "http",
      timeout: 1000
    });

    assert.equal(jio.__type, "http");
    assert.deepEqual(jio.__storage._timeout, 1000);
  });
  /////////////////////////////////////////////////////////////////
  // httpStorage.get
  /////////////////////////////////////////////////////////////////
  module("httpStorage.get", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http"
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get document", function (assert) {
    var id = domain + "/id1/";
    this.server.respondWith("HEAD", id, [200, {
      "Content-Type": "text/xml-foo"
    }, '']);
    start = assert.async();
    assert.expect(1);

    this.jio.get(id)
      .then(function (result) {
        assert.deepEqual(result, {
          "Content-Type": "text/xml-foo",
          "Status": 200
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with a not expected status", function (assert) {
    var id = domain + "/id1/";
    this.server.respondWith("HEAD", id, [500, {
      "Content-Type": "text/xml-foo"
    }, '']);
    start = assert.async();
    assert.expect(1);

    this.jio.get(id)
      .then(function (result) {
        assert.ok(false, result);
      })
      .fail(function (error) {
        assert.equal(error.target.status, 500);
      })
      .always(function () {
        start();
      });
  });

  test("get document with 404 status", function (assert) {
    var id = domain + "/id1/";

    start = assert.async();
    assert.expect(3);

    this.jio.get(id)
      .then(function (result) {
        assert.ok(false, result);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find url " + id);
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get document with a not expected status and catch error",
       function (assert) {
      var id = domain + "/id1/";
      this.server.respondWith("HEAD", id, [500, {
        "Content-Type": "text/xml-foo"
      }, '']);

      this.jio = jIO.createJIO({
        type: "http",
        catch_error: true
      });

      start = assert.async();
      assert.expect(1);

      this.jio.get(id)
        .then(function (result) {
          assert.deepEqual(result, {
            "Content-Type": "text/xml-foo",
            "Status": 500
          }, "Check document");
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  /////////////////////////////////////////////////////////////////
  // httpStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("httpStorage.allAttachments", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http"
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get document with attachment", function (assert) {
    start = assert.async();
    assert.expect(1);

    this.jio.allAttachments('/id')
      .then(function (result) {
        assert.deepEqual(result, {
          enclosure: {}
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // httpStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("httpStorage.getAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http"
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("forbidden attachment", function (assert) {
    var id = domain + "/id1/";

    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment(
      id,
      "attachment1"
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(
          error.message,
          "Forbidden attachment: https://example.org/id1/ , attachment1"
        );
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get attachment", function (assert) {
    var id = domain + "/id1/";

    this.server.respondWith("GET", id, [200, {
      "Content-Type": "text/xml-foo"
    }, "foo\nbaré"]);

    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment(id, 'enclosure')
      .then(function (result) {
        assert.ok(result instanceof Blob, "Data is Blob");
        assert.deepEqual(result.type, "text/xml-foo", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        assert.equal(result.target.result, "foo\nbaré",
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  test("get attachment with a not expected status", function (assert) {
    var id = domain + "/id1/";
    this.server.respondWith("GET", id, [500, {
      "Content-Type": "text/xml-foo"
    }, '']);
    start = assert.async();
    assert.expect(1);

    this.jio.getAttachment(id, 'enclosure')
      .then(function (result) {
        assert.ok(false, result);
      })
      .fail(function (error) {
        assert.equal(error.target.status, 500);
      })
      .always(function () {
        start();
      });
  });

  test("get attachment with 404 status", function (assert) {
    var id = domain + "/id1/";

    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment(id, 'enclosure')
      .then(function (result) {
        assert.ok(false, result);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find url " + id);
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get attachment with unexpected status and catch error",
       function (assert) {
      var id = domain + "/id1/";
      this.server.respondWith("GET", id, [500, {
        "Content-Type": "text/xml-foo"
      }, 'foo\nbaré']);

      this.jio = jIO.createJIO({
        type: "http",
        catch_error: true
      });

      start = assert.async();
      assert.expect(3);

      this.jio.getAttachment(id, 'enclosure')
        .then(function (result) {
          assert.ok(result instanceof Blob, "Data is Blob");
          assert.deepEqual(result.type, "text/xml-foo", "Check mimetype");
          return jIO.util.readBlobAsText(result);
        })
        .then(function (result) {
          assert.equal(result.target.result, "foo\nbaré",
                "Attachment correctly fetched");
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  /////////////////////////////////////////////////////////////////
  // httpStorage timeout set
  /////////////////////////////////////////////////////////////////
  module("httpStorage.timeout", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "http",
        timeout: 1000
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get document with timeout set", function (assert) {
    var id = domain + "/id1/";
    this.server.respondWith("HEAD", id, [200, {
      "Content-Type": "text/xml-foo"
    }, '']);
    start = assert.async();
    assert.expect(1);

    this.jio.get(id)
      .then(function (result) {
        assert.deepEqual(result, {
          "Content-Type": "text/xml-foo",
          "Status": 200
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // httpStorage request timeout
  /////////////////////////////////////////////////////////////////
  module("httpStorage.requesttimeout", {
    beforeEach: function () {

      this.jio = jIO.createJIO({
        type: "http",
        timeout: 1
      });
    }
  });

  test("get document will timeout", function (assert) {
    var id = domain + "/id1/";
    start = assert.async();
    assert.expect(3);

    this.jio.get(id)
      .then(function (result) {
        assert.ok(false, result);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Gateway Timeout");
        assert.equal(error.status_code, 504);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon));
