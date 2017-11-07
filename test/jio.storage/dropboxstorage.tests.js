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
    var url = "https://api.dropboxapi.com/2/files/create_folder_v2",
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
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/put1",
          "autorename": false
        });
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put sub document", function () {
    var url = "https://api.dropboxapi.com/2/files/create_folder_v2",
      server = this.server;
    this.server.respondWith("POST", url, [201, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(7);

    this.jio.put("/put1/put2/", {})
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 201);
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/put1/put2",
          "autorename": false
        });
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
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
    var url = "https://api.dropboxapi.com/2/files/create_folder_v2",
      server = this.server;
    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'conflict'}}}
    )]);
    stop();
    expect(1);
    this.jio.put("/existing/", {})
      .then(function () {
        equal(server.requests[0].status, 409);
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
    var url_delete = "https://api.dropboxapi.com/2/files/delete_v2",
      server = this.server;
    this.server.respondWith("POST", url_delete, [204, {
      "Content-Type": "text/xml"
    }, '']);
    stop();
    expect(7);

    this.jio.remove("/remove1/")
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url_delete);
        equal(server.requests[0].status, 204);
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/remove1"
        });
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
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
    var url = "https://api.dropboxapi.com/2/files/get_metadata";
    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_found'}}}
    )]);

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

  test("get directory", function () {
    var url = "https://api.dropboxapi.com/2/files/get_metadata",
      server = this.server;
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, '{".tag": "folder"}'
                                        ]);
    stop();
    expect(3);

    this.jio.get("/id1/")
      .then(function (result) {
        deepEqual(result, {}, "Check document");
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/id1"
        });
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get file", function () {
    var url = "https://api.dropboxapi.com/2/files/get_metadata";
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, '{".tag": "file"}'
                                        ]);
    stop();
    expect(3);

    this.jio.get("/id1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Not a directory: /id1/");
        equal(error.status_code, 404);
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

  test("get file", function () {
    var url = "https://api.dropboxapi.com/2/files/list_folder";

    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_folder'}}}
    )]);

    stop();
    expect(3);

    this.jio.allAttachments("/id1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Not a directory: /id1/");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    var url = "https://api.dropboxapi.com/2/files/list_folder";

    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_found'}}}
    )]);

    stop();
    expect(3);

    this.jio.allAttachments("/inexistent/")
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

  test("get document without attachment", function () {
    var url = "https://api.dropboxapi.com/2/files/list_folder",
      server = this.server;
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, '{"entries": [], "has_more": false}'
                                        ]);
    stop();
    expect(3);

    this.jio.allAttachments("/id1/")
      .then(function (result) {
        deepEqual(result, {}, "Check document");
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "include_deleted": false,
          "include_has_explicit_shared_members": false,
          "include_media_info": false,
          "include_mounted_folders": true,
          "path": "/id1",
          "recursive": false
        });
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function () {
    var url = "https://api.dropboxapi.com/2/files/list_folder",
      server = this.server;
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({
      "entries": [{
        ".tag": "file",
        "name": "attachment1"
      }, {
        ".tag": "file",
        "name": "attachment2"
      }, {
        ".tag": "folder",
        "name": "fold1"
      }],
      "has_more": false
    })]);

    stop();
    expect(3);

    this.jio.allAttachments("/id1/")
      .then(function (result) {
        deepEqual(result, {
          attachment1: {},
          attachment2: {}
        }, "Check document");
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "include_deleted": false,
          "include_has_explicit_shared_members": false,
          "include_media_info": false,
          "include_mounted_folders": true,
          "path": "/id1",
          "recursive": false
        });
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment and pagination", function () {
    var url = "https://api.dropboxapi.com/2/files/list_folder",
      paginate_url = "https://api.dropboxapi.com/2/files/list_folder/continue",
      server = this.server,
      cursor = "foocursor";

    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({
      "entries": [{
        ".tag": "file",
        "name": "attachment1"
      }, {
        ".tag": "folder",
        "name": "fold1"
      }],
      "has_more": true,
      "cursor": cursor
    })]);

    this.server.respondWith("POST", paginate_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({
      "entries": [{
        ".tag": "file",
        "name": "attachment2"
      }, {
        ".tag": "folder",
        "name": "fold2"
      }],
      "has_more": false
    })]);

    stop();
    expect(7);

    this.jio.allAttachments("/id1/")
      .then(function (result) {
        deepEqual(result, {
          attachment1: {},
          attachment2: {}
        }, "Check document");

        deepEqual(server.requests[0].url, url);
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "include_deleted": false,
          "include_has_explicit_shared_members": false,
          "include_media_info": false,
          "include_mounted_folders": true,
          "path": "/id1",
          "recursive": false
        });
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
        });

        deepEqual(server.requests[1].url, paginate_url);
        deepEqual(JSON.parse(server.requests[1].requestBody), {
          "cursor": cursor
        });
        deepEqual(server.requests[1].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
        });
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

  test("putAttachment document", function () {
    var blob = new Blob(["foo"], {"type": "xapplication/foo"}),
      url_put_att = "https://content.dropboxapi.com/2/files/upload",
      server = this.server;

    this.server.respondWith("POST", url_put_att, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(7);

    this.jio.putAttachment(
      "/putAttachment1/",
      "attachment1",
      blob
    )
      .then(function () {
        equal(server.requests.length, 1);

        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url_put_att);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/octet-stream;charset=utf-8",
          "Dropbox-API-Arg": '{"path":"/putAttachment1/attachment1",' +
                            '"mode":"overwrite",' +
                            '"autorename":false,"mute":false}'
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
    var url_delete = "https://api.dropboxapi.com/2/files/delete_v2",
      server = this.server;

    this.server.respondWith("POST", url_delete, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(7);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attachment1"
    )
      .then(function () {
        equal(server.requests.length, 1);

        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url_delete);
        equal(server.requests[0].status, 204);
        deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/removeAttachment1/attachment1"
        });
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json;charset=utf-8"
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
    var url_delete = "https://api.dropboxapi.com/2/files/delete_v2";
    this.server.respondWith("POST", url_delete, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path_lookup', 'path_lookup': {'.tag': 'not_found'}}}
    )]);

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
    var url = "https://content.dropboxapi.com/2/files/download",
      server = this.server;
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "text/xplain"
    }, "foo\nbaré"]);

    stop();
    expect(10);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attachment1"
    )
      .then(function (result) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, "foo\nbaré");
        deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "text/plain;charset=utf-8",
          "Dropbox-API-Arg": '{"path":"/getAttachment1/attachment1"}'
        });

        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "text/xplain", "Check mimetype");
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
    var url = "https://content.dropboxapi.com/2/files/download";

    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_found'}}}
    )]);

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
