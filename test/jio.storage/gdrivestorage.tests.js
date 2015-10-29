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
    throws = QUnit.throws,
    token = "sample_token",
    domain = "https://www.googleapis.com",
    boundary = "---------314159265358979323846",
    listUrl = domain + "/drive/v2/files" +
      "?prettyPrint=false&pageToken=&q=trashed=false" +
      "&fields=nextPageToken,items(id,mimeType,title,parents(id,isRoot))" +
      "&access_token=" + token,
    sampleList = '{"items":[{"id":"0B4kh3jbjOf5Lb2theE8xWHhvWXM","title":"' +
      'attach1","mimeType":"text/plain","parents":[{"id":"0B4kh3jbjOf5LN' +
      '0Y2V0ZJS0VxS00","isRoot":false}]}\n,{"id":"0B4kh3jbjOf5LamRlX21MZ' +
      'lVCYXM","title":"file2","mimeType":"text/plain","parents":[{"id":' +
      '"0AIkh3jbjOf5LUk9PVA","isRoot":true}]}\n,{"id":"0B4kh3jbjOf5LTVlU' +
      'WVVROWlBZzg","title":"file1","mimeType":"text/plain","parents":[{' +
      '"id":"0AIkh3jbjOf5LUk9PVA","isRoot":true}]}\n,{"id":"0B4kh3jbjOf5' +
      'LYTRaaV9YUkJ4a0U","title":"folder2","mimeType":"application/vnd.g' +
      'oogle-apps.folder","parents":[{"id":"0AIkh3jbjOf5LUk9PVA","isRoot' +
      '":true}]}\n,{"id":"0B4kh3jbjOf5LN0Y2V0ZJS0VxS00","title":"folder1' +
      '","mimeType":"application/vnd.google-apps.folder","parents":[{"id' +
      '":"0AIkh3jbjOf5LUk9PVA","isRoot":true}]}\n,{"id":"0B4kh3jbjOf5Lc3' +
      'RhcnRlcl9maWxl","title":"How to get started with Drive","mimeType' +
      '":"application/pdf","parents":[{"id":"0AIkh3jbjOf5LUk9PVA","isRoo' +
      't":true}]}]}';


  function error404Tester(fun, encl, blob) {
    stop();
    expect(3);

    this.jio[fun]("inexistent", encl ? "enclosure" : undefined,
                  blob || undefined)
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: inexistent");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  }

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage constructor
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "gdrive",
      access_token: token
    });
    equal(jio.__type, "gdrive");
    deepEqual(jio.__storage._access_token, token);
  });

  test("reject invalid trashing parameter", function () {

    throws(
      function () {
        jIO.createJIO({
          type: "gdrive",
          access_token: token,
          trashing : "foobar"
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(error.message,
              "trashing parameter must be a boolean (true or false)");
        return true;
      }
    );
  });


  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.post
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.post", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("post document", function () {
    var server = this.server,
      jsonRes,
      puturl = domain + "/upload/drive/v2/files?uploadType" +
        "=multipart&access_token=" + token,
      body = boundary +
        '\nContent-Type: application/json; charset=UTF-8' +
        '\n\n{\"title\":\"metadata\"}\n\n' + boundary + "--",
      resText = '{"id": "sampleId"}';
    this.server.respondWith("POST", puturl, [200, {
      "Content-Type": "text/xml"
    }, resText]);

    stop();
    expect(7);

    this.jio.post({title: "metadata"})
      .then(function (obj) {
        jsonRes = JSON.parse(obj.target.responseText);
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, puturl);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, body);
        equal(server.requests[0].responseText, resText);
        equal(jsonRes.id, "sampleId");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("post with invalid credentials", function () {
    var puturl = domain + "/upload/drive/v2/files?uploadType" +
      "=multipart&access_token=" + token;

    this.server.respondWith("POST", puturl, [401, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(3);

    this.jio.post()
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "access token invalid or expired");
        equal(error.status_code, 401);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.put
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.put", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("put document", function () {
    var server = this.server,
      puturl = domain + "/drive/v2/files/sampleId?uploadType" +
        "=multipart&access_token=" + token,
      body = boundary +
        '\nContent-Type: application/json; charset=UTF-8' +
        '\n\n{\"title\":\"metadata\"}\n\n' + boundary + "--",
      resText = '{"id": "sampleId"}';
    this.server.respondWith("PUT", puturl, [200, {
      "Content-Type": "text/xml"
    }, resText]);

    stop();
    expect(7);

    this.jio.put("sampleId", {title: "metadata"})
      .then(function (obj) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "PUT");
        equal(server.requests[0].url, puturl);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, body);
        equal(server.requests[0].responseText, resText);
        equal(obj, "sampleId");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put to inexistent document", function () {
    var tester = error404Tester.bind(this);
    tester("put");
  });

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.remove
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.remove", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });
  test("remove document", function () {
    var url_delete = domain +
      "/drive/v2/files/sampleId/trash?access_token=" +
      token,

      server = this.server;
    this.server.respondWith("POST", url_delete, [200, {
      "Content-Type": "text/xml"
    }, 'sampleId']);
    stop();
    expect(7);

    this.jio.remove("sampleId")
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url_delete);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, 'sampleId');
        deepEqual(server.requests[0].requestHeaders, {
          "Content-Type": "text/plain;charset=utf-8"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove inexistent document", function () {
    var tester = error404Tester.bind(this);
    tester("remove");
  });

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.get
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get inexistent document", function () {
    var tester = error404Tester.bind(this);
    tester("get");
  });

  test("get document", function () {
    var url = domain + "/drive/v2/files/sampleId?alt=",
      body = '{"id": "sampleId", "mimeType":' +
        '"application/vnd.google-apps.folder", "title": "folder1"}';

    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/xml"
    }, body
                                        ]);
    stop();
    expect(1);

    this.jio.get("sampleId")
      .then(function (result) {
        deepEqual(result, body, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.allDocs
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.allDocs", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get all docs", function () {
    this.server.respondWith("GET", listUrl, [200, {
    }, sampleList]);
    stop();
    expect(6);
    var server = this.server;

    this.jio.allDocs()
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, listUrl);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, sampleList);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.putAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("putAttachment document", function () {
    var blob = new Blob(["foo"]),
      url_put_att = domain + "/upload/drive/v2/files/sampleId?" +
        "uploadType=media&access_token=" + token,
      server = this.server;

    this.server.respondWith("PUT", url_put_att, [204, {
      "Content-Type": "text/xml"
    }, ""]);
    stop();
    expect(7);

    this.jio.putAttachment(
      "sampleId",
      "enclosure",
      blob
    )
      .then(function () {
        equal(server.requests.length, 1);

        equal(server.requests[0].method, "PUT");
        equal(server.requests[0].url, url_put_att);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          "Content-Type": "text/plain;charset=utf-8"
        });
        equal(server.requests[0].requestBody, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment to inexistent document", function () {
    var tester = error404Tester.bind(this);
    tester("putAttachment", true, new Blob());
  });

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.removeAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("removeAttachment document", function () {
    var url_delete =  domain + "/upload/drive/v2/files/sampleId?" +
      "uploadType=media&access_token=" + token,
      server = this.server;

    this.server.respondWith("PUT", url_delete, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(6);

    this.jio.removeAttachment(
      "sampleId",
      "enclosure"
    )
      .then(function () {
        equal(server.requests.length, 1);

        equal(server.requests[0].method, "PUT");
        equal(server.requests[0].url, url_delete);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          "Content-Type": "text/plain;charset=utf-8"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove inexistent attachmentt", function () {
    var tester = error404Tester.bind(this);
    tester("removeAttachment", true);
  });

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.getAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "gdrive",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("getAttachment document", function () {
    var url = domain + "/drive/v2/files/" +
      "sampleId?alt=media",
      server = this.server;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/plain"
    }, "foo\nbaré"]);

    stop();
    expect(8);

    this.jio.getAttachment(
      "sampleId",
      "enclosure"
    )
      .then(function (result) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].responseText, "foo\nbaré");

        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "text/plain", "Check mimetype");
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

  test("get inexistent attachment", function () {
    var tester = error404Tester.bind(this);
    tester("getAttachment", true);
  });

}(jIO, QUnit, Blob, sinon));
