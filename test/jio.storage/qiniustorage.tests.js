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
/*jslint nomen: true*/
/*global Blob, sinon, FormData*/
(function (jIO, Blob, sinon, FormData) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    equal = QUnit.equal,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module,
    expect = QUnit.expect,
    bucket = "98ad7.com1.z0.glb.clouddn.com",
    access_key = "phooMooch6au2shaechah8ee5si3za",
    secret_key = "owiehei3j_utaex0kiShoof2goixieb",
    qiniu_spec = {
      type: "qiniu",
      bucket: bucket,
      access_key: access_key,
      secret_key: secret_key
    };

  /////////////////////////////////////////////////////////////////
  // qiniuStorage constructor
  /////////////////////////////////////////////////////////////////
  module("qiniuStorage.constructor");

  test("Storage store parameters", function () {
    var jio = jIO.createJIO(qiniu_spec);

    equal(jio.__type, "qiniu");
    deepEqual(jio.__storage._bucket, qiniu_spec.bucket);
    deepEqual(jio.__storage._access_key, qiniu_spec.access_key);
    deepEqual(jio.__storage._secret_key, qiniu_spec.secret_key);
  });

  /////////////////////////////////////////////////////////////////
  // qiniuStorage.get
  /////////////////////////////////////////////////////////////////
  module("qiniuStorage.get", {
    setup: function () {
      this.jio = jIO.createJIO(qiniu_spec);
    }
  });

  test("get non valid document ID", function () {
    stop();
    expect(3);

    this.jio.get("inexistent")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id inexistent is forbidden (!== /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function () {
    var id = "/";
    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {}, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // qiniuStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("qiniuStorage.getAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO(qiniu_spec);

    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get attachment from inexistent document", function () {
    stop();
    expect(3);

    this.jio.getAttachment("inexistent", "a")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id inexistent is forbidden (!== /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test('getAttachment', function () {
    var attachment = "foobar12345/barfoo54321/e",
      server = this.server,
      download_url = 'http://' + bucket + '/' +
        encodeURI(attachment) +
        '?e=2451491200&token=' + access_key +
        '%3AxOQx24teaT_yQXl5fU3CjUJSho4%3D';

    server.respondWith("GET", download_url, [200, {
      "Content-Type": "application/octet-stream"
    }, JSON.stringify({foo: 'baré'})]);

    stop();
    this.jio.getAttachment('/', attachment, {format: 'json'})
      .then(function (result) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, download_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, undefined);

        deepEqual(result, {foo: 'baré'});
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // qiniuStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("qiniuStorage.putAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO(qiniu_spec);

      this.spy = sinon.spy(FormData.prototype, "append");
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
    }
  });

  test("put an attachment to an inexistent document", function () {
    stop();
    expect(3);

    this.jio.putAttachment("inexistent", "putattmt2", "")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id inexistent is forbidden (!== /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test('putAttachment', function () {
    var context = this,
      attachment = "foobar12345/barfoo54321/e",
      server = this.server,
      blob = new Blob([JSON.stringify({foo: 'baré'})]),
      upload_url = 'http://up.qiniu.com/',
      data = {"ok": "excellent"};

    server.respondWith("POST", upload_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify(data)]);

    stop();
    this.jio.putAttachment(
      '/',
      attachment,
      blob
    )
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, upload_url);
        equal(server.requests[0].status, 200);
        ok(server.requests[0].requestBody instanceof FormData);

        equal(context.spy.callCount, 3, "FormData.append count " +
           context.spy.callCount);
        equal(context.spy.firstCall.args[0], "key", "First append call");
        equal(context.spy.firstCall.args[1], attachment,
              "First append call");
        equal(context.spy.secondCall.args[0], "token",
              "Second append call");
        equal(
          context.spy.secondCall.args[1],
          access_key + ":" +
            "TcUXVk75do5aEqQeahrYgXt1X9s=:" +
            "eyJzY29wZSI6ImJ1Y2tldDpmb29iYXIxMjM0NS9iYXJmb281NDMyMS9l" +
            "IiwiZGVhZGxpbmUiOjI0NTE0OTEyMDB9",
          "Second append call"
        );
        equal(context.spy.thirdCall.args[0], "file", "Third append call");
        equal(context.spy.thirdCall.args[1], blob, "Third append call");

        equal(server.requests[0].withCredentials, undefined);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // qiniuStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("qiniuStorage.hasCapacity", {
    setup: function () {
      this.jio = jIO.createJIO(qiniu_spec);
    }
  });

  test("can list documents", function () {
    ok(this.jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // qiniuStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("qiniuStorage.buildQuery", {
    setup: function () {
      this.jio = jIO.createJIO(qiniu_spec);
    }
  });

  test("only return one document", function () {
    stop();
    expect(1);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          "data": {
            "rows": [
              {
                "id": "/",
                "value": {}
              }
            ],
            "total_rows": 1
          }
        });
      })
      .fail(function (error) {
        ok(false, error);
      })

      .always(function () {
        start();
      });
  });

}(jIO, Blob, sinon, FormData));
