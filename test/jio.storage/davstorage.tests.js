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
/*jslint nomen: true */
/*global Blob, sinon*/
(function (jIO, QUnit, Blob, sinon) {
  "use strict";
  var test = QUnit.test,
    start,
    module = QUnit.module,
    domain = "https://example.org",
    basic_login = "login:passwd";

  function assertRequestHeaders(assert, request, headers) {
    if (!headers.hasOwnProperty('Content-Type')) {
      headers['Content-Type'] = 'text/plain;charset=utf-8';
    }
    assert.deepEqual(request.requestHeaders, headers);
  }

  /////////////////////////////////////////////////////////////////
  // davStorage constructor
  /////////////////////////////////////////////////////////////////
  module("davStorage.constructor");

  test("Storage store URL", function (assert) {
    var jio = jIO.createJIO({
      type: "dav",
      url: domain
    });

    assert.equal(jio.__type, "dav");
    assert.deepEqual(jio.__storage._url, domain);
    assert.deepEqual(jio.__storage._authorization, undefined);
    assert.deepEqual(jio.__storage._with_credentials, undefined);
  });

  test("Storage store basic login", function (assert) {
    var jio = jIO.createJIO({
      type: "dav",
      url: domain,
      basic_login: basic_login,
      with_credentials: true
    });

    assert.equal(jio.__type, "dav");
    assert.deepEqual(jio.__storage._url, domain);
    assert.deepEqual(jio.__storage._with_credentials, true);
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.put
  /////////////////////////////////////////////////////////////////
  module("davStorage.put", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login,
        with_credentials: true
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("put document", function (assert) {
    var url = domain + "/put1/",
      server = this.server;
    this.server.respondWith("MKCOL", url, [201, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(8);

    this.jio.put("/put1/", {})
      .then(function () {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "MKCOL");
        assert.equal(server.requests[0].url, url);
        assert.equal(server.requests[0].status, 201);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].responseText, "");
        assertRequestHeaders(assert, server.requests[0], {
          Authorization: "Basic login:passwd",
          "Content-Type": "text/plain;charset=utf-8"
        });
        assert.equal(server.requests[0].withCredentials, true);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("don't throw error when putting existing directory", function (assert) {
    var url = domain + "/existing/",
      server = this.server;
    this.server.respondWith("MKCOL", url, [405, {
      "Content-Type": "text/xml"
    }, "MKCOL https://example.org/existing/ 405 (Method Not Allowed)"]);
    start = assert.async();
    assert.expect(1);
    this.jio.put("/existing/", {})
      .then(function () {
        assert.equal(server.requests[0].status, 405);
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
  // davStorage.remove
  /////////////////////////////////////////////////////////////////
  module("davStorage.remove", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login,
        with_credentials: true
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("remove document", function (assert) {
    var url = domain + "/remove1/",
      server = this.server;
    this.server.respondWith("DELETE", url, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(8);

    this.jio.remove("/remove1/")
      .then(function () {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "DELETE");
        assert.equal(server.requests[0].url, url);
        assert.equal(server.requests[0].status, 204);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].responseText, "");
        assertRequestHeaders(assert, server.requests[0], {
          Authorization: "Basic login:passwd",
          "Content-Type": "text/plain;charset=utf-8"
        });
        assert.equal(server.requests[0].withCredentials, true);
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
  // davStorage.get
  /////////////////////////////////////////////////////////////////
  module("davStorage.get", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login,
        with_credentials: true
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
    var url = domain + "/inexistent/";
    this.server.respondWith("PROPFIND", url, [404, {
      "Content-Type": "text/html"
    }, "foo"]);

    start = assert.async();
    assert.expect(3);

    this.jio.get("/inexistent/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document", function (assert) {
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
    start = assert.async();
    assert.expect(1);

    this.jio.get(id)
      .then(function (result) {
        assert.deepEqual(result, {}, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("davStorage.allAttachments", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login,
        with_credentials: true
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

  test("get inexistent document", function (assert) {
    var url = domain + "/inexistent/";
    this.server.respondWith("PROPFIND", url, [404, {
      "Content-Type": "text/html"
    }, "foo"]);

    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("/inexistent/")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document");
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
    start = assert.async();
    assert.expect(1);

    this.jio.allAttachments(id)
      .then(function (result) {
        assert.deepEqual(result, {}, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function (assert) {
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
    start = assert.async();
    assert.expect(1);

    this.jio.allAttachments(id)
      .then(function (result) {
        assert.deepEqual(result, {
          attachment1: {},
          attachment2: {}
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
  // davStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("davStorage.putAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login,
        with_credentials: true
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

  test("putAttachment to inexisting directory: expecting a 404",
       function (assert) {
      var blob = new Blob(["foo"]),
        url = domain + "/inexistent_dir/attachment1";
      this.server.respondWith("PUT", url, [403, {"": ""}, ""]);
      start = assert.async();
      assert.expect(3);

      this.jio.putAttachment(
        "/inexistent_dir/",
        "attachment1",
        blob
      )
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot access subdocument");
          assert.equal(error.status_code, 404);
        })
        .always(function () {
          start();
        });
    });


  test("putAttachment document", function (assert) {
    var blob = new Blob(["foo"]),
      url = domain + "/putAttachment1/attachment1",
      server = this.server;
    this.server.respondWith("PUT", url, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(8);

    this.jio.putAttachment(
      "/putAttachment1/",
      "attachment1",
      blob
    )
      .then(function () {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "PUT");
        assert.equal(server.requests[0].url, url);
        assert.equal(server.requests[0].status, 204);
        assert.equal(server.requests[0].requestBody, blob);
        assert.equal(server.requests[0].responseText, "");
        assertRequestHeaders(assert, server.requests[0], {
          Authorization: "Basic login:passwd",
          "Content-Type": "text/plain;charset=utf-8"
        });
        assert.equal(server.requests[0].withCredentials, true);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("davStorage.removeAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login,
        with_credentials: true
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
    var url = domain + "/removeAttachment1/attachment1",
      server = this.server;
    this.server.respondWith("DELETE", url, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    start = assert.async();
    assert.expect(8);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attachment1"
    )
      .then(function () {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "DELETE");
        assert.equal(server.requests[0].url, url);
        assert.equal(server.requests[0].status, 204);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].responseText, "");
        assertRequestHeaders(assert, server.requests[0], {
          Authorization: "Basic login:passwd",
          "Content-Type": "text/plain;charset=utf-8"
        });
        assert.equal(server.requests[0].withCredentials, true);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove inexistent attachment", function (assert) {
    var url = domain + "/removeAttachment1/attachment1";
    this.server.respondWith("DELETE", url, [404, {
      "Content-Type": "text/xml"
    }, ""]);

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
                     "Cannot find attachment: /removeAttachment1/ " +
                             ", attachment1");
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("davStorage.getAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain,
        basic_login: basic_login,
        with_credentials: true
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
    var url = domain + "/getAttachment1/attachment1",
      server = this.server;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/plain"
    }, "foo\nbaré"]);

    start = assert.async();
    assert.expect(10);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attachment1"
    )
      .then(function (result) {
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, url);
        assert.equal(server.requests[0].status, 200);
        assert.equal(server.requests[0].requestBody, undefined);
        assertRequestHeaders(assert, server.requests[0], {
          Authorization: "Basic login:passwd"
        });
        assert.equal(server.requests[0].withCredentials, true);

        assert.ok(result instanceof Blob, "Data is Blob");
        assert.deepEqual(result.type, "text/plain", "Check mimetype");
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
    var url = domain + "/getAttachment1/attachment1";
    this.server.respondWith("GET", url, [404, {
      "Content-Type": "text/xml"
    }, ""]);

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
        assert.equal(error.message,
                     "Cannot find attachment: /getAttachment1/ " +
                             ", attachment1");
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon));
