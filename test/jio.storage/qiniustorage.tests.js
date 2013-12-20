
/*global define, module, test_util, RSVP, jIO, test, ok,
  deepEqual, sinon, expect, stop, start, Blob, equal */
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(test_util, RSVP, jIO);
}([
  'test_util',
  'rsvp',
  'jio',
  'hmacsha1',
  'qiniustorage',
  'qunit'
// ], function (util, RSVP, jIO) {
], function () {
  "use strict";

  var qiniu_spec = {
    "type": "qiniu",
    "bucket": "uth6nied",
    "access_key": "Imh9CFmpVZ5L1TE04Pjt-UmR_Ccr2cW9-KjSmvSA",
    "secret_key": "vFkNUlI2U4B7G1sz8UL_Z25kYHozfz82z4vMWPgo"
  };

  module("QiniuStorage", {
    setup: function () {
      this.server = sinon.fakeServer.create();

      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio_storage = jIO.createJIO(qiniu_spec);
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
      delete this.jio_storage;
    }
  });

  test('get', function () {
    var key = "foobar12345",
      server = this.server,
      download_url = 'http://uth6nied.u.qiniudn.com/foobar12345?' +
        'e=2451491200&token=Imh9CFmpVZ5L1TE04Pjt-UmR_Ccr2cW9-KjSmvSA:' +
        'hISFzrC4dQvdOR8A_MozNsB5cME=',
      data = {
        "_id": key,
        "foo": "bar"
      };

    server.respondWith("GET", download_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.get({"_id": key})
      .then(function (result) {
        deepEqual(result, {
          "data": data,
          "id": key,
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test('getAttachment', function () {
    var key = "foobar12345",
      attachment = "barfoo54321",
      server = this.server,
      download_url = 'http://uth6nied.u.qiniudn.com/foobar12345/barfoo54321' +
        '?e=2451491200&token=Imh9CFmpVZ5L1TE04Pjt-UmR_Ccr2cW9-KjSmvSA:' +
        'L88mHkZkfjr11DqPUqb5gsDjHFY=',
      data = {
        "_id": key,
        "foo": "bar",
        "nut": "nut"
      };

    server.respondWith("GET", download_url, [200, {
      "Content-Type": "application/octet-stream"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.getAttachment({"_id": key, "_attachment": attachment})
      .then(function (result) {
        return jIO.util.readBlobAsText(result.data).then(function (e) {
          return {
            "result": result,
            "text": e.target.result
          };
        });
      }).then(function (result) {
        result.result.data = result.text;
        deepEqual(result.result, {
          "data": JSON.stringify(data),
          "id": key,
          "attachment": attachment,
          "method": "getAttachment",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test('post', function () {
    var key = "foobar12345",
      server = this.server,
      upload_url = 'http://up.qiniu.com/',
      data = {"ok": "excellent"};

    server.respondWith("POST", upload_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.post({"_id": key})
      .then(function (result) {
        deepEqual(result, {
          "id": key,
          "method": "post",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        });
        return jIO.util.readBlobAsBinaryString(server.requests[0].requestBody);
      })
      .then(function (e) {
        equal(e.target.result, "XXX test FormData verification");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test('put', function () {
    var key = "foobar12345",
      server = this.server,
      upload_url = 'http://up.qiniu.com/',
      data = {"ok": "excellent"};

    server.respondWith("POST", upload_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.put({"_id": key})
      .then(function () {
        throw new Error("Not implemented");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test('putAttachment', function () {
    var key = "foobar12345",
      attachment = "barfoo54321",
      server = this.server,
      upload_url = 'http://up.qiniu.com/',
      data = {"ok": "excellent"};

    server.respondWith("POST", upload_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.putAttachment({
      "_id": key,
      "_attachment": attachment,
      "_blob": "bar"
    })
      .then(function () {
        throw new Error("Not implemented");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}));
