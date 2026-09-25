/*
 * Copyright 2014, Nexedi SA
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
    token = "sample_token";

  /////////////////////////////////////////////////////////////////
  // DropboxStorage constructor
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.constructor");

  test("create storage", function (assert) {
    var jio = jIO.createJIO({
      type: "dropbox",
      access_token: token
    });
    assert.equal(jio.__type, "dropbox");
    assert.deepEqual(jio.__storage._access_token, token);
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.put
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.put", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("put document", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/create_folder_v2",
      server = this.server;
    this.server.respondWith("POST", url, [201, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(7);

    this.jio.put("/put1/", {})
      .then(function () {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "POST");
        assert.equal(server.requests[0].url, url);
        assert.equal(server.requests[0].status, 201);
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/put1",
          "autorename": false
        });
        assert.equal(server.requests[0].responseText, "");
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put sub document", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/create_folder_v2",
      server = this.server;
    this.server.respondWith("POST", url, [201, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(7);

    this.jio.put("/put1/put2/", {})
      .then(function () {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "POST");
        assert.equal(server.requests[0].url, url);
        assert.equal(server.requests[0].status, 201);
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/put1/put2",
          "autorename": false
        });
        assert.equal(server.requests[0].responseText, "");
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("don't throw error when putting existing directory", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/create_folder_v2",
      server = this.server;
    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'conflict'}}}
    )]);
    start = assert.async();
    assert.expect(1);
    this.jio.put("/existing/", {})
      .then(function () {
        assert.equal(server.requests[0].status, 409);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not starting with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.put("put1/", {})
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id put1/ is forbidden (no begin /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.put("/put1", {})
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id /put1 is forbidden (no end /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject to store any property", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.put("/put1/", {title: "foo"})
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Can not store properties: title");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.remove
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.remove", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("remove document", function (assert) {
    var url_delete = "https://api.dropboxapi.com/2/files/delete_v2",
      server = this.server;
    this.server.respondWith("POST", url_delete, [204, {
      "Content-Type": "text/xml"
    }, '']);
    start = assert.async();
    assert.expect(7);

    this.jio.remove("/remove1/")
      .then(function () {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "POST");
        assert.equal(server.requests[0].url, url_delete);
        assert.equal(server.requests[0].status, 204);
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/remove1"
        });
        assert.equal(server.requests[0].responseText, "");
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not starting with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.remove("remove1/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id remove1/ is forbidden (no begin /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.remove("/remove1")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id /remove1 is forbidden (no end /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.get
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.get", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("reject ID not starting with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.get("get1/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id get1/ is forbidden (no begin /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.get("/get1")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id /get1 is forbidden (no end /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/get_metadata";
    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_found'}}}
    )]);

    start = assert.async();
    assert.expect(3);

    this.jio.get("/inexistent/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: /inexistent/");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get directory", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/get_metadata",
      server = this.server;
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, '{".tag": "folder"}'
                                        ]);
    start = assert.async();
    assert.expect(3);

    this.jio.get("/id1/")
      .then(function (result) {
        assert.deepEqual(result, {}, "Check document");
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/id1"
        });
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get file", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/get_metadata";
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, '{".tag": "file"}'
                                        ]);
    start = assert.async();
    assert.expect(3);

    this.jio.get("/id1/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Not a directory: /id1/");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.allAttachments", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("reject ID not starting with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("get1/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id get1/ is forbidden (no begin /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("/get1")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "id /get1 is forbidden (no end /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get file", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/list_folder";

    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_folder'}}}
    )]);

    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("/id1/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Not a directory: /id1/");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/list_folder";

    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_found'}}}
    )]);

    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("/inexistent/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: /inexistent/");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function (assert) {
    var url = "https://api.dropboxapi.com/2/files/list_folder",
      server = this.server;
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "application/json"
    }, '{"entries": [], "has_more": false}'
                                        ]);
    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("/id1/")
      .then(function (result) {
        assert.deepEqual(result, {}, "Check document");
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "include_deleted": false,
          "include_has_explicit_shared_members": false,
          "include_media_info": false,
          "include_mounted_folders": true,
          "path": "/id1",
          "recursive": false
        });
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function (assert) {
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

    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("/id1/")
      .then(function (result) {
        assert.deepEqual(result, {
          attachment1: {},
          attachment2: {}
        }, "Check document");
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "include_deleted": false,
          "include_has_explicit_shared_members": false,
          "include_media_info": false,
          "include_mounted_folders": true,
          "path": "/id1",
          "recursive": false
        });
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment and pagination", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio.allAttachments("/id1/")
      .then(function (result) {
        assert.deepEqual(result, {
          attachment1: {},
          attachment2: {}
        }, "Check document");

        assert.deepEqual(server.requests[0].url, url);
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "include_deleted": false,
          "include_has_explicit_shared_members": false,
          "include_media_info": false,
          "include_mounted_folders": true,
          "path": "/id1",
          "recursive": false
        });
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });

        assert.deepEqual(server.requests[1].url, paginate_url);
        assert.deepEqual(JSON.parse(server.requests[1].requestBody), {
          "cursor": cursor
        });
        assert.deepEqual(server.requests[1].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.putAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.spy_ajax = sinon.spy(jIO.util, "ajax");

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
      this.spy_ajax.restore();
      delete this.spy_ajax;
    }
  });

  test("reject ID not starting with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.putAttachment(
      "putAttachment1/",
      "attachment1",
      new Blob([""])
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "id putAttachment1/ is forbidden (no begin /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.putAttachment(
      "/putAttachment1",
      "attachment1",
      new Blob([""])
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "id /putAttachment1 is forbidden (no end /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.putAttachment(
      "/putAttachment1/",
      "attach/ment1",
      new Blob([""])
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "attachment attach/ment1 is forbidden");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment document", function (assert) {
    var blob = new Blob(["foo"], {"type": "xapplication/foo"}),
      url_put_att = "https://content.dropboxapi.com/2/files/upload",
      server = this.server,
      context = this;

    this.server.respondWith("POST", url_put_att, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(11);

    this.jio.putAttachment(
      "/putAttachment1/",
      "attachment1",
      blob
    )
      .then(function () {
        assert.ok(context.spy_ajax.calledOnce, "ajax count " +
           context.spy_ajax.callCount);
        assert.equal(context.spy_ajax.firstCall.args[0].type, "POST");
        assert.equal(context.spy_ajax.firstCall.args[0].url, url_put_att);
        assert.deepEqual(context.spy_ajax.firstCall.args[0].xhrFields,
                         undefined);
        assert.deepEqual(context.spy_ajax.firstCall.args[0].headers, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": '{"path":"/putAttachment1/attachment1",' +
                            '"mode":"overwrite",' +
                            '"autorename":false,"mute":false}'
        });
        assert.equal(context.spy_ajax.firstCall.args[0].data, blob);

        assert.equal(server.requests.length, 1);

        assert.equal(server.requests[0].method, "POST");
        assert.equal(server.requests[0].url, url_put_att);
        assert.equal(server.requests[0].status, 204);
        assert.equal(server.requests[0].responseText, "");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.removeAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("reject ID not starting with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.removeAttachment(
      "removeAttachment1/",
      "attachment1"
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "id removeAttachment1/ is forbidden (no begin /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.removeAttachment(
      "/removeAttachment1",
      "attachment1"
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "id /removeAttachment1 is forbidden (no end /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attach/ment1"
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "attachment attach/ment1 is forbidden");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment document", function (assert) {
    var url_delete = "https://api.dropboxapi.com/2/files/delete_v2",
      server = this.server;

    this.server.respondWith("POST", url_delete, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(7);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attachment1"
    )
      .then(function () {
        assert.equal(server.requests.length, 1);

        assert.equal(server.requests[0].method, "POST");
        assert.equal(server.requests[0].url, url_delete);
        assert.equal(server.requests[0].status, 204);
        assert.deepEqual(JSON.parse(server.requests[0].requestBody), {
          "path": "/removeAttachment1/attachment1"
        });
        assert.equal(server.requests[0].responseText, "");
        assert.deepEqual(server.requests[0].requestHeaders, {
          "Authorization": "Bearer sample_token",
          "Content-Type": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove inexistent attachment", function (assert) {
    var url_delete = "https://api.dropboxapi.com/2/files/delete_v2";
    this.server.respondWith("POST", url_delete, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path_lookup', 'path_lookup': {'.tag': 'not_found'}}}
    )]);

    start = assert.async();
    assert.expect(3);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attachment1"
    )
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "Cannot find attachment: /removeAttachment1/" +
                             ", attachment1");
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("DropboxStorage.getAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dropbox",
        access_token: token
      });
      this.spy_ajax = sinon.spy(jIO.util, "ajax");
    },
    afterEach: function () {
      this.spy_ajax.restore();
      delete this.spy_ajax;

      this.server.restore();
      delete this.server;
    }
  });

  test("reject ID not starting with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment(
      "getAttachment1/",
      "attachment1"
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "id getAttachment1/ is forbidden (no begin /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment(
      "/getAttachment1",
      "attachment1"
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "id /getAttachment1 is forbidden (no end /)");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attach/ment1"
    )
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "attachment attach/ment1 is forbidden");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment document", function (assert) {
    var url = "https://content.dropboxapi.com/2/files/download",
      context = this;
    this.server.respondWith("POST", url, [200, {
      "Content-Type": "text/xplain"
    }, "foo\nbaré"]);

    start = assert.async();
    assert.expect(10);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attachment1"
    )
      .then(function (result) {
        assert.equal(context.spy_ajax.callCount, 1);
        assert.equal(context.spy_ajax.firstCall.args[0].type, "POST");
        assert.equal(context.spy_ajax.firstCall.args[0].url, url);
        assert.equal(context.spy_ajax.firstCall.args[0].data, undefined);
        assert.equal(context.spy_ajax.firstCall.args[0].dataType, 'blob');
        assert.deepEqual(context.spy_ajax.firstCall.args[0].xhrFields,
                         undefined);
        assert.deepEqual(context.spy_ajax.firstCall.args[0].headers, {
          "Authorization": "Bearer sample_token",
          "Dropbox-API-Arg": '{"path":"/getAttachment1/attachment1"}'
        });

        assert.ok(result instanceof Blob, "Data is Blob");
        assert.deepEqual(result.type, "text/xplain", "Check mimetype");

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

  test("get inexistent attachment", function (assert) {
    var url = "https://content.dropboxapi.com/2/files/download";

    this.server.respondWith("POST", url, [409, {
      "Content-Type": "application/json"
    }, JSON.stringify(
      {error: {'.tag': 'path', 'path': {'.tag': 'not_found'}}}
    )]);

    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attachment1"
    )
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find attachment: /getAttachment1/" +
                             ", attachment1");
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon));
