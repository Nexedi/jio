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
    basic_login = "login:passwd";

  /////////////////////////////////////////////////////////////////
  // davStorage constructor
  /////////////////////////////////////////////////////////////////
  module("davStorage.constructor");

  test("Storage store URL", function () {
    var jio = jIO.createJIO({
      type: "dav",
      url: domain
    });

    equal(jio.__type, "dav");
    deepEqual(jio.__storage._url, domain);
    deepEqual(jio.__storage._authorization, undefined);
  });

  test("Storage store basic login", function () {
    var jio = jIO.createJIO({
      type: "dav",
      url: domain,
      basic_login: basic_login
    });

    equal(jio.__type, "dav");
    deepEqual(jio.__storage._url, domain);
    deepEqual(jio.__storage._authorization, "Basic login:passwd");
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.put
  /////////////////////////////////////////////////////////////////
  module("davStorage.put", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("put document", function () {
    var url = domain + "/put1/",
      server = this.server;
    this.server.respondWith("MKCOL", url, [201, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(7);

    this.jio.put("/put1/", {})
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "MKCOL");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 201);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          Authorization: "Basic login:passwd",
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
    var url = domain + "/existing/",
      server = this.server;
    this.server.respondWith("MKCOL", url, [405, {
      "Content-Type": "text/xml"
    }, "MKCOL https://example.org/existing/ 405 (Method Not Allowed)"]);
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
  // davStorage.remove
  /////////////////////////////////////////////////////////////////
  module("davStorage.remove", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("remove document", function () {
    var url = domain + "/remove1/",
      server = this.server;
    this.server.respondWith("DELETE", url, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(7);

    this.jio.remove("/remove1/")
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "DELETE");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          Authorization: "Basic login:passwd",
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
  // davStorage.get
  /////////////////////////////////////////////////////////////////
  module("davStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login
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
    var url = domain + "/inexistent/";
    this.server.respondWith("PROPFIND", url, [404, {
      "Content-Type": "text/html"
    }, "foo"]);

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
    var id = "/id1/";
    this.server.respondWith("PROPFIND", domain + id, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="utf-8"?>' +
        '<D:multistatus xmlns:D="DAV:">' +
        '<D:response xmlns:lp1="DAV:" ' +
        'xmlns:lp2="http://apache.org/dav/props/">' +
        '<D:href>/uploads/</D:href>' +
        '<D:propstat>' +
        '<D:prop>' +
        '<lp1:resourcetype><D:collection/></lp1:resourcetype>' +
        '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
        '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
        '</lp1:getlastmodified>' +
        '<lp1:getetag>"240be-1000-4e9f88a305c4e"</lp1:getetag>' +
        '<D:supportedlock>' +
        '<D:lockentry>' +
        '<D:lockscope><D:exclusive/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '<D:lockentry>' +
        '<D:lockscope><D:shared/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '</D:supportedlock>' +
        '<D:lockdiscovery/>' +
        '<D:getcontenttype>httpd/unix-directory</D:getcontenttype>' +
        '</D:prop>' +
        '<D:status>HTTP/1.1 200 OK</D:status>' +
        '</D:propstat>' +
        '</D:response>' +
        '<D:response xmlns:lp1="DAV:" ' +
        'xmlns:lp2="http://apache.org/dav/props/">' +
        '<D:href>/uploads/attachment1</D:href>' +
        '<D:propstat>' +
        '<D:prop>' +
        '<lp1:resourcetype/>' +
        '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
        '<lp1:getcontentlength>66</lp1:getcontentlength>' +
        '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
        '</lp1:getlastmodified>' +
        '<lp1:getetag>"20568-42-4e9f88a2ea198"</lp1:getetag>' +
        '<lp2:executable>F</lp2:executable>' +
        '<D:supportedlock>' +
        '<D:lockentry>' +
        '<D:lockscope><D:exclusive/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '<D:lockentry>' +
        '<D:lockscope><D:shared/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '</D:supportedlock>' +
        '<D:lockdiscovery/>' +
        '</D:prop>' +
        '<D:status>HTTP/1.1 200 OK</D:status>' +
        '</D:propstat>' +
        '</D:response>' +
        '<D:response xmlns:lp1="DAV:" ' +
        'xmlns:lp2="http://apache.org/dav/props/">' +
        '<D:href>/uploads/attachment2</D:href>' +
        '<D:propstat>' +
        '<D:prop>' +
        '<lp1:resourcetype/>' +
        '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
        '<lp1:getcontentlength>25</lp1:getcontentlength>' +
        '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
        '</lp1:getlastmodified>' +
        '<lp1:getetag>"21226-19-4e9f88a305c4e"</lp1:getetag>' +
        '<lp2:executable>F</lp2:executable>' +
        '<D:supportedlock>' +
        '<D:lockentry>' +
        '<D:lockscope><D:exclusive/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '<D:lockentry>' +
        '<D:lockscope><D:shared/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '</D:supportedlock>' +
        '<D:lockdiscovery/>' +
        '</D:prop>' +
        '<D:status>HTTP/1.1 200 OK</D:status>' +
        '</D:propstat>' +
        '</D:response>' +
        '</D:multistatus>'
      ]);
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
  // davStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("davStorage.allAttachments", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login
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
    var url = domain + "/inexistent/";
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
    var id = "/id1/";
    this.server.respondWith("PROPFIND", domain + id, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="utf-8"?>' +
        '<D:multistatus xmlns:D="DAV:">' +
        '<D:response xmlns:lp1="DAV:" ' +
        'xmlns:lp2="http://apache.org/dav/props/">' +
        '<D:href>/uploads/</D:href>' +
        '<D:propstat>' +
        '<D:prop>' +
        '<lp1:resourcetype><D:collection/></lp1:resourcetype>' +
        '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
        '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
        '</lp1:getlastmodified>' +
        '<lp1:getetag>"240be-1000-4e9f88a305c4e"</lp1:getetag>' +
        '<D:supportedlock>' +
        '<D:lockentry>' +
        '<D:lockscope><D:exclusive/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '<D:lockentry>' +
        '<D:lockscope><D:shared/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '</D:supportedlock>' +
        '<D:lockdiscovery/>' +
        '<D:getcontenttype>httpd/unix-directory</D:getcontenttype>' +
        '</D:prop>' +
        '<D:status>HTTP/1.1 200 OK</D:status>' +
        '</D:propstat>' +
        '</D:response>' +
        '</D:multistatus>'
      ]);
    stop();
    expect(1);

    this.jio.allAttachments(id)
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
    var id = "/id1/";
    this.server.respondWith("PROPFIND", domain + id, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="utf-8"?>' +
        '<D:multistatus xmlns:D="DAV:">' +
        '<D:response xmlns:lp1="DAV:" ' +
        'xmlns:lp2="http://apache.org/dav/props/">' +
        '<D:href>/uploads/</D:href>' +
        '<D:propstat>' +
        '<D:prop>' +
        '<lp1:resourcetype><D:collection/></lp1:resourcetype>' +
        '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
        '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
        '</lp1:getlastmodified>' +
        '<lp1:getetag>"240be-1000-4e9f88a305c4e"</lp1:getetag>' +
        '<D:supportedlock>' +
        '<D:lockentry>' +
        '<D:lockscope><D:exclusive/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '<D:lockentry>' +
        '<D:lockscope><D:shared/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '</D:supportedlock>' +
        '<D:lockdiscovery/>' +
        '<D:getcontenttype>httpd/unix-directory</D:getcontenttype>' +
        '</D:prop>' +
        '<D:status>HTTP/1.1 200 OK</D:status>' +
        '</D:propstat>' +
        '</D:response>' +
        '<D:response xmlns:lp1="DAV:" ' +
        'xmlns:lp2="http://apache.org/dav/props/">' +
        '<D:href>/uploads/attachment1</D:href>' +
        '<D:propstat>' +
        '<D:prop>' +
        '<lp1:resourcetype/>' +
        '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
        '<lp1:getcontentlength>66</lp1:getcontentlength>' +
        '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
        '</lp1:getlastmodified>' +
        '<lp1:getetag>"20568-42-4e9f88a2ea198"</lp1:getetag>' +
        '<lp2:executable>F</lp2:executable>' +
        '<D:supportedlock>' +
        '<D:lockentry>' +
        '<D:lockscope><D:exclusive/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '<D:lockentry>' +
        '<D:lockscope><D:shared/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '</D:supportedlock>' +
        '<D:lockdiscovery/>' +
        '</D:prop>' +
        '<D:status>HTTP/1.1 200 OK</D:status>' +
        '</D:propstat>' +
        '</D:response>' +
        '<D:response xmlns:lp1="DAV:" ' +
        'xmlns:lp2="http://apache.org/dav/props/">' +
        '<D:href>/uploads/attachment2</D:href>' +
        '<D:propstat>' +
        '<D:prop>' +
        '<lp1:resourcetype/>' +
        '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
        '<lp1:getcontentlength>25</lp1:getcontentlength>' +
        '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
        '</lp1:getlastmodified>' +
        '<lp1:getetag>"21226-19-4e9f88a305c4e"</lp1:getetag>' +
        '<lp2:executable>F</lp2:executable>' +
        '<D:supportedlock>' +
        '<D:lockentry>' +
        '<D:lockscope><D:exclusive/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '<D:lockentry>' +
        '<D:lockscope><D:shared/></D:lockscope>' +
        '<D:locktype><D:write/></D:locktype>' +
        '</D:lockentry>' +
        '</D:supportedlock>' +
        '<D:lockdiscovery/>' +
        '</D:prop>' +
        '<D:status>HTTP/1.1 200 OK</D:status>' +
        '</D:propstat>' +
        '</D:response>' +
        '</D:multistatus>'
      ]);
    stop();
    expect(1);

    this.jio.allAttachments(id)
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
  // davStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("davStorage.putAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login
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
      url = domain + "/inexistent_dir/attachment1";
    this.server.respondWith("PUT", url, [403, {"": ""}, ""]);
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
      url = domain + "/putAttachment1/attachment1",
      server = this.server;
    this.server.respondWith("PUT", url, [204, {
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
        equal(server.requests[0].method, "PUT");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].requestBody, blob);
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          Authorization: "Basic login:passwd",
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

  /////////////////////////////////////////////////////////////////
  // davStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("davStorage.removeAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login
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
    var url = domain + "/removeAttachment1/attachment1",
      server = this.server;
    this.server.respondWith("DELETE", url, [204, {
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
        equal(server.requests[0].method, "DELETE");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 204);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, "");
        deepEqual(server.requests[0].requestHeaders, {
          Authorization: "Basic login:passwd",
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
    var url = domain + "/removeAttachment1/attachment1";
    this.server.respondWith("DELETE", url, [404, {
      "Content-Type": "text/xml"
    }, ""]);

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
        equal(error.message, "Cannot find attachment: /removeAttachment1/ " +
                             ", attachment1");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("davStorage.getAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login
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
    var url = domain + "/getAttachment1/attachment1",
      server = this.server;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/plain"
    }, "foo\nbaré"]);

    stop();
    expect(10);

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
        deepEqual(server.requests[0].requestHeaders, {
          Authorization: "Basic login:passwd"
        });

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
    var url = domain + "/getAttachment1/attachment1";
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
        equal(error.message, "Cannot find attachment: /getAttachment1/ " +
                             ", attachment1");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon));
