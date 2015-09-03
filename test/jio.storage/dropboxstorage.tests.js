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
    token = "sample_token";

  /////////////////////////////////////////////////////////////////
  // DropboxStorage constructor
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "dropbox",
      access_token: token
    });
    equal(jio.__type, "dropbox");
    deepEqual(jio.__storage._access_token, token);
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.put
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.put", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("put document", function () {
    var url = "https://api.dropboxapi.com/1/fileops/" +
      "create_folder?access_token="
      + token + "&root=dropbox&path=/put1/",
      server = this.server;
    this.server.respondWith("POST", url, [201, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(7);

    this.jio.put("/put1/", {})
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 201);
        equal(server.requests[0].requestBody, undefined);
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

  test("don't throw error when putting existing directory", function () {
    var url = "https://api.dropboxapi.com/1/fileops/create_folder" +
      "?access_token=" + token + "&root=dropbox&path=/existing/",
      server = this.server;
    this.server.respondWith("POST", url, [405, {
      "Content-Type": "text/xml"
    }, "POST" + url + "(Forbidden)"]);
    stop();
    expect(1);
    this.jio.put("/existing/", {})
      .then(function () {
        equal(server.requests[0].status, 405);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.put("put1/", {})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id put1/ is forbidden (no begin /)");
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

    this.jio.put("/put1", {})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /put1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject to store any property", function () {
    stop();
    expect(3);

    this.jio.put("/put1/", {title: "foo"})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Can not store properties: title");
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
  // DropboxStorage.remove
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.remove", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("remove document", function () {
    var url_get = "https://api.dropboxapi.com/1/metadata/dropbox" +
      "//remove1/?access_token=" + token,
      url_delete = "https://api.dropboxapi.com/1/fileops/delete/?" +
      "access_token=" + token + "&root=dropbox&path=/remove1/",
      server = this.server;
    this.server.respondWith("GET", url_get, [204, {
      "Content-Type": "text/xml"
    }, '{"is_dir": true}']);
    this.server.respondWith("POST", url_delete, [204, {
      "Content-Type": "text/xml"
    }, '']);
    stop();
    expect(13);

    this.jio.remove("/remove1/")
      .then(function () {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, url_get);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, '{"is_dir": true}');
        deepEqual(server.requests[0].requestHeaders, {});
        equal(server.requests[1].method, "POST");
        equal(server.requests[1].url, url_delete);
        equal(server.requests[1].status, 204);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].responseText, '');
        deepEqual(server.requests[1].requestHeaders, {
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

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.remove("remove1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id remove1/ is forbidden (no begin /)");
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

    this.jio.remove("/remove1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /remove1 is forbidden (no end /)");
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
  // DropboxStorage.get
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
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
        equal(error.message, "id get1/ is forbidden (no begin /)");
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
        equal(error.message, "id /get1 is forbidden (no end /)");
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
    var url_get = "https://api.dropboxapi.com/1/metadata/dropbox" +
      "//inexistent/?access_token=" + token;
    this.server.respondWith("GET", url_get, [404, {
      "Content-Type": "text/xml"
    }, '']);
    stop();
    expect(3);

    this.jio.get("/inexistent/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document", function () {
    var url = "https://api.dropboxapi.com/1/metadata/dropbox" +
      "//id1/?access_token=" + token;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/xml"
    }, '{"is_dir": true, "contents": []}'
                                        ]);
    stop();
    expect(1);

    this.jio.get("/id1/")
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
  // DropboxStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.allAttachments", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
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

    this.jio.allAttachments("get1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id get1/ is forbidden (no begin /)");
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

    this.jio.allAttachments("/get1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /get1 is forbidden (no end /)");
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
    var url = "/inexistent/";
    this.server.respondWith("PROPFIND", url, [404, {
      "Content-Type": "text/html"
    }, "foo"]);

    stop();
    expect(3);

    this.jio.allAttachments("/inexistent/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function () {
    var url = "https://api.dropboxapi.com/1/metadata/dropbox" +
      "//id1/?access_token=" + token;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/xml"
    }, '{"is_dir": true, "contents": []}'
                                        ]);
    stop();
    expect(1);

    this.jio.allAttachments("/id1/")
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

  test("get document with attachment", function () {
    var url = "https://api.dropboxapi.com/1/metadata/dropbox" +
      "//id1/?access_token=" + token;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/xml"
    }, '{"is_dir": true, "path": "/id1", ' +
                                         '"contents": ' +
                                         '[{"rev": "143bb45509", ' +
                                         '"thumb_exists": false, ' +
                                         '"path": "/id1/attachment1", ' +
                                         '"is_dir": false, "bytes": 151}, ' +
                                         '{"rev": "153bb45509", ' +
                                         '"thumb_exists": false, ' +
                                         '"path": "/id1/attachment2", ' +
                                         '"is_dir": false, "bytes": 11}, ' +
                                         '{"rev": "173bb45509", ' +
                                         '"thumb_exists": false, ' +
                                         '"path": "/id1/fold1", ' +
                                         '"is_dir": true, "bytes": 0}], ' +
                                         '"icon": "folder"}'
                                        ]);
    stop();
    expect(1);

    this.jio.allAttachments("/id1/")
      .then(function (result) {
        deepEqual(result, {
          attachment1: {},
          attachment2: {}
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
  // DropboxStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.putAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
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

    this.jio.putAttachment(
      "putAttachment1/",
      "attachment1",
      new Blob([""])
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id putAttachment1/ is forbidden (no begin /)");
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

    this.jio.putAttachment(
      "/putAttachment1",
      "attachment1",
      new Blob([""])
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /putAttachment1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function () {
    stop();
    expect(3);

    this.jio.putAttachment(
      "/putAttachment1/",
      "attach/ment1",
      new Blob([""])
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "attachment attach/ment1 is forbidden");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment to inexisting directory: expecting a 404", function () {
    var blob = new Blob(["foo"]),
      url = "/inexistent_dir/attachment1";
    this.server.respondWith("PUT", url, [405, {"": ""}, ""]);
    stop();
    expect(3);

    this.jio.putAttachment(
      "/inexistent_dir/",
      "attachment1",
      blob
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot access subdocument");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });


  test("putAttachment document", function () {
    var blob = new Blob(["foo"]),
      url_get_id = "https://api.dropboxapi.com/1/metadata/dropbox" +
        "//putAttachment1/?access_token=" + token,
      url_get_att = "https://api.dropboxapi.com/1/metadata/dropbox" +
        "//putAttachment1/attachment1/?access_token=" + token,
      url_put_att = "https://content.dropboxapi.com/1/files_put/dropbox/" +
        "putAttachment1/attachment1?access_token=" + token,
      server = this.server;

    this.server.respondWith("GET", url_get_id, [204, {
      "Content-Type": "text/xml"
    }, '{"is_dir": true, "contents": []}']);

    this.server.respondWith("GET", url_get_att, [404, {
      "Content-Type": "text/xml"
    }, '']);

    this.server.respondWith("PUT", url_put_att, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(17);

    this.jio.putAttachment(
      "/putAttachment1/",
      "attachment1",
      blob
    )
      .then(function () {
        equal(server.requests.length, 3);

        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, url_get_id);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].responseText,
              "{\"is_dir\": true, \"contents\": []}");
        deepEqual(server.requests[0].requestHeaders, {});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, url_get_att);
        equal(server.requests[1].status, 404);
        equal(server.requests[1].responseText, "");
        deepEqual(server.requests[1].requestHeaders, {});

        equal(server.requests[2].method, "PUT");
        equal(server.requests[2].url, url_put_att);
        equal(server.requests[2].status, 204);
        equal(server.requests[2].responseText, "");
        deepEqual(server.requests[2].requestHeaders, {
          "Content-Type": "text/plain;charset=utf-8"
        });
        equal(server.requests[2].requestBody, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.removeAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
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

    this.jio.removeAttachment(
      "removeAttachment1/",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id removeAttachment1/ is forbidden (no begin /)");
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

    this.jio.removeAttachment(
      "/removeAttachment1",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /removeAttachment1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function () {
    stop();
    expect(3);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attach/ment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "attachment attach/ment1 is forbidden");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment document", function () {
    var url_get_id = "https://api.dropboxapi.com/1/metadata/dropbox" +
      "//removeAttachment1/attachment1/?access_token=" + token,
      url_delete = "https://api.dropboxapi.com/1/fileops/delete/" +
      "?access_token=" + token + "&root=dropbox" +
      "&path=/removeAttachment1/attachment1",
      server = this.server;

    this.server.respondWith("GET", url_get_id, [204, {
      "Content-Type": "text/xml"
    }, '{"is_dir": false}']);
    this.server.respondWith("POST", url_delete, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(13);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attachment1"
    )
      .then(function () {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, url_get_id);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, "{\"is_dir\": false}");
        deepEqual(server.requests[0].requestHeaders, {});

        equal(server.requests[1].method, "POST");
        equal(server.requests[1].url, url_delete);
        equal(server.requests[1].status, 204);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].responseText, "");
        deepEqual(server.requests[1].requestHeaders, {
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

  test("remove inexistent attachment", function () {
    var url_get_id = "https://api.dropboxapi.com/1/metadata/dropbox" +
      "//removeAttachment1/attachment1?access_token=" + token;

    this.server.respondWith("GET", url_get_id, [404, {
      "Content-Type": "text/xml"
    }, '']);

    stop();
    expect(3);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attachment1"
    )
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment: /removeAttachment1/" +
                             ", attachment1");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.getAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
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

    this.jio.getAttachment(
      "getAttachment1/",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id getAttachment1/ is forbidden (no begin /)");
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

    this.jio.getAttachment(
      "/getAttachment1",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /getAttachment1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function () {
    stop();
    expect(3);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attach/ment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "attachment attach/ment1 is forbidden");
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
    var url = "https://content.dropboxapi.com/1/files/dropbox//" +
      "getAttachment1/attachment1?access_token=" + token,
      server = this.server;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/plain"
    }, "foo\nbaré"]);

    stop();
    expect(9);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attachment1"
    )
      .then(function (result) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
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
    var url = "https://content.dropboxapi.com/1/files/dropbox//" +
      "getAttachment1/attachment1?access_token=" + token;

    this.server.respondWith("GET", url, [404, {
      "Content-Type": "text/xml"
    }, ""]);
    stop();
    expect(3);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attachment1"
    )
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment: /getAttachment1/" +
                             ", attachment1");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon));
