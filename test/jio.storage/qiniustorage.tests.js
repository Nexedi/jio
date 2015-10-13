/*global define, module, RSVP, jIO, test, ok,
  deepEqual, sinon, expect, stop, start, Blob, equal, define, console */
/*jslint indent: 2 */
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(RSVP, jIO);
}([
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
    "bucket": "7xn150.com1.z0.glb.clouddn.com",
    "access_key": "s90kGV3JYDDQPivaPVpwxrHMi9RCpncLgLctGDJQ",
    "secret_key": "hfqndzXIfqP6aMpTOdgT_UjiUjARkiFXz98Cthjx"
  };

  module("QiniuStorage ", {
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
    /*  download_url = 'http://uth6nied.u.qiniudn.com/foobar12345?' +
        'e=2451491200&token=Imh9CFmpVZ5L1TE04Pjt-UmR_Ccr2cW9-KjSmvSA:' +
        'hISFzrC4dQvdOR8A_MozNsB5cME=', */
      download_url = 'http://7xn150.com1.z0.glb.clouddn.com/foobar12345?' +
        'e=2451491200&token=s90kGV3JYDDQPivaPVpwxrHMi9RCpncLgLctGDJQ:' +
        'lWIEfRXIf6tbwWjuX381DHTSxnU=',
      data = {
        "_id": key,
        "foo": "bar"
      };

    server.respondWith("GET", download_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.get(key)
      .then(function (result) {
        console.log("result", result);
        deepEqual(result, {
          "_id": key,
          "foo": "bar"
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
      object,
      resultdata,
      attachment = "barfoo54321",
      server = this.server,
      download_url = 'http://7xn150.com1.z0.glb.clouddn.com/foobar12345' +
        '/barfoo54321?e=2451491200&token=s90kGV3JYDDQPivaPVpwxrHMi9RCpncL' +
        'gLctGDJQ:l_yS8PFderOhMyqHN0FN41tdJOM=',

      data = {
        "_id": key,
        "foo": "bar",
        "nut": "nut"
      };

    server.respondWith("GET", download_url, [200, {
      "Content-Type": "application/octet-stream"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.getAttachment(key, attachment)
      .then(function (result) {
        return jIO.util.readBlobAsText(result).then(function (e) {
          object = JSON.parse(e.target.result);
          return {
            "result": object,
            "text": object.target.responseText
          };
        });
      }).then(function (result) {
        console.log("result", result);
        resultdata = {
          "data": result.result.target.responseText,
          "id": result.result.id,
          "attachment": result.result.target.attachment,
          "method": result.result.target.method,
          "status": result.result.target.status,
          "statusText": result.result.target.statusText
        };
        result.result.data = result.text;
        deepEqual(resultdata, {
          "data": JSON.stringify(data),
          "id": key,
          "attachment": attachment,
          "method": "GET",
          "status": 200,
          "statusText": "OK"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
/*
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
*/

  test('QiniuStorage.put', function () {
    var server = this.server,
      upload_url = 'http://up.qiniu.com/',
      data = {"ok": "excellent"};

    server.respondWith("POST", upload_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify(data)]);

    stop();
    this.jio_storage.put("bar", {"title": "foo"})
      .then(function (result) {
        equal(result, "bar");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test('QiniuStorage putAttachment', function () {
    var server = this.server,
      blob = new Blob(["foo"]),
      upload_url = 'http://up.qiniu.com/';

    server.respondWith("POST", upload_url, [200, {
      "Content-Type": "application/json"
    }, "foo"]);

    stop();
    this.jio_storage.putAttachment("bar", "foo", blob)
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, upload_url);
        equal(server.requests[0].status, "200");
        equal(server.requests[0].responseText, "foo");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}));
