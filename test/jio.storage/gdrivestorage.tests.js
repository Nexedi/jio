/*
 * Copyright 2015, Nexedi SA
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
    list_url = domain + "/drive/v2/files" +
      "?prettyPrint=false&pageToken=&q=trashed=false" +
      "&fields=nextPageToken,items(id)" +
      "&access_token=" + token,
    sample_list = '{"items":[' +
      '{"id":"0B4kh3jbjOf5LamRlX21MZlVCYXM"}]}',

    part_sample1 = '{"nextPageToken": "nptkn01",' +
      '"items":[{"id":"0B4kh3jbjOf5Lb2theE8xWHhvWXM"}]}',
    part_sample2 = '{"items":[{"id":"0B4kh3jbjOf5LamRlX21MZ"}]}';

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
      put_url = domain + "/upload/drive/v2/files?uploadType" +
        "=multipart&access_token=" + token,
      body = boundary +
        '\nContent-Type: application/json; charset=UTF-8' +
        '\n\n{\"title\":\"metadata\"}\n\n' + boundary + "--",
      res_text = '{"id": "sampleId"}';
    this.server.respondWith("POST", put_url, [200, {
      "Content-Type": "text/xml"
    }, res_text]);

    stop();
    expect(7);

    this.jio.post({title: "metadata"})
      .then(function (obj) {
        equal(obj, "sampleId");
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, put_url);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, body);
        equal(server.requests[0].responseText, res_text);
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
      put_url = domain + "/drive/v2/files/sampleId?uploadType" +
        "=multipart&access_token=" + token,
      body = boundary +
        '\nContent-Type: application/json; charset=UTF-8' +
        '\n\n{\"title\":\"metadata\"}\n\n' + boundary + "--",
      res_text = '{"id": "sampleId"}';
    this.server.respondWith("PUT", put_url, [200, {
      "Content-Type": "text/xml"
    }, res_text]);

    stop();
    expect(7);

    this.jio.put("sampleId", {title: "metadata"})
      .then(function (obj) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "PUT");
        equal(server.requests[0].url, put_url);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, body);
        equal(server.requests[0].responseText, res_text);
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
        deepEqual(result,
                  {"id": "sampleId",
                   "mimeType": "application/vnd.google-apps.folder",
                   "title": "folder1"}, "Check document");
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
    var object_result = {"data": {"rows": [{"id":
                                            "0B4kh3jbjOf5LamRlX21MZlVCYXM",
                                            "value": {}}],
                                  "total_rows": 1}},
      server = this.server;

    this.server.respondWith("GET", list_url, [200, {
    }, sample_list]);
    stop();
    expect(7);

    this.jio.allDocs()
      .then(function (res) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, list_url);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, sample_list);
        deepEqual(res, object_result);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allDocs with multiple API requests (nextPageToken)", function () {
    var object_result = {"data": {"rows": [], "total_rows": 2}},
      server = this.server,
      token_url = domain + "/drive/v2/files" +
        "?prettyPrint=false&pageToken=nptkn01&q=trashed=false" +
        "&fields=nextPageToken,items(id)" +
        "&access_token=" + token;

    object_result.data.rows.push(
      {"id": "0B4kh3jbjOf5Lb2theE8xWHhvWXM", "value": {}}
    );
    object_result.data.rows.push(
      {"id": "0B4kh3jbjOf5LamRlX21MZ", "value": {}}
    );

    this.server.respondWith("GET", list_url, [200, {
    }, part_sample1]);
    this.server.respondWith("GET", token_url, [200, {
    }, part_sample2]);
    stop();
    expect(12);
    this.jio.allDocs()
      .then(function (res) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, list_url);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, part_sample1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[1].url, token_url);
        equal(server.requests[1].status, 200);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].responseText, part_sample2);
        deepEqual(res, object_result);
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

  test("reject non enclosure attachment", function () {
    stop();
    expect(3);

    this.jio.putAttachment(
      "sampleId",
      "not_enclosure",
      new Blob()
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Only support 'enclosure' attachment");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment document", function () {
    var blob = new Blob(["foo"]),
      url_put_att = domain + "/upload/drive/v2/files/sampleId?" +
        "uploadType=media&access_token=" + token,
      server = this.server;

    this.server.respondWith("PUT", url_put_att, [204, {
      "Content-Type": "text/xml"
    }, '{"mimeType": "text/xml"}']);
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
        equal(server.requests[0].responseText, "{\"mimeType\": \"text/xml\"}");
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

  test("putAttachment to folder", function () {
    var blob = new Blob([""]),
      url_put_att = domain + "/upload/drive/v2/files/sampleId?" +
        "uploadType=media&access_token=" + token,
      server = this.server;

    this.server.respondWith("PUT", url_put_att, [204, {
      "Content-Type": "text/xml"
    }, '{"mimeType": "application/vnd.google-apps.folder"}']);
    stop();
    expect(4);

    this.jio.putAttachment(
      "sampleId",
      "enclosure",
      blob
    )
      .fail(function (error) {
        equal(server.requests[0].responseText,
              "{\"mimeType\": \"application/vnd.google-apps.folder\"}");
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "cannot put attachments to folder");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
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

  test("reject non enclosure attachment", function () {
    stop();
    expect(3);

    this.jio.getAttachment(
      "sampleId",
      "not_enclosure"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Only support 'enclosure' attachment");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
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

  /////////////////////////////////////////////////////////////////
  // Google Drive Storage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("Google Drive Storage.allAttachments", {
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

  test("allAttachments on file", function () {
    var url = domain + "/drive/v2/files/sampleId?alt=",
      body = '{"id": "sampleId", "mimeType":' +
        '"text/xml", "title": "folder1"}';

    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/xml"
    }, body
                                        ]);
    stop();
    expect(1);

    this.jio.allAttachments("sampleId")
      .then(function (result) {
        deepEqual(result, {enclosure: {}}, "enclosure on file");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });



  test("allAttachments on directory", function () {
    var url = domain + "/drive/v2/files/sampleId?alt=",
      body = '{"id": "sampleId", "mimeType":' +
        '"application/vnd.google-apps.folder", "title": "folder1"}';

    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/xml"
    }, body
                                        ]);
    stop();
    expect(1);

    this.jio.allAttachments("sampleId")
      .then(function (result) {
        deepEqual(result, {}, "empty result on directory");
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
    tester("allAttachments");
  });

}(jIO, QUnit, Blob, sinon));
