/*
 * Copyright 2018, Nexedi SA
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
/*global jIO, Blob, sinon, DOMParser, XMLSerializer*/
(function (jIO, Blob, sinon, DOMParser, XMLSerializer) {
  "use strict";
  var test = QUnit.test,
    start,
    module = QUnit.module,
    cloudooo_url = 'https://www.exemple.org/',
    parser = new DOMParser(),
    serializer = new XMLSerializer();

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////

  function Storage200() {
    return this;
  }
  jIO.addStorage('cloudooostorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.constructor
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.constructor");

  test("create substorage", function (assert) {
    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    assert.equal(jio.__type, "cloudooo");
    assert.equal(jio.__storage._url, cloudooo_url);
    assert.equal(jio.__storage._sub_storage.__type, "cloudooostorage200");
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.get
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.get");
  test("get called substorage get", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    Storage200.prototype.get = function (param) {
      assert.equal(param, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "foo"
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
  // cloudoooStorage.put
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.put");
  test("put called substorage put", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });
    Storage200.prototype.put = function (id, param) {
      assert.equal(id, "bar", "put 200 called");
      assert.deepEqual(param, {"title": "foo"}, "put 200 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.remove
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.remove");
  test("remove called substorage remove", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });
    Storage200.prototype.remove = function (param) {
      assert.equal(param, "bar", "remove 200 called");
      return param._id;
    };

    jio.remove("bar")
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.hasCapacity
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.hasCapacity");
  test("hasCapacity return substorage value", function (assert) {
    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: "cloudooostorage200"
      }
    });

    delete Storage200.prototype.hasCapacity;

    assert.throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'foo' is not implemented on 'cloudooostorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.buildQuery = function (options) {
      assert.deepEqual(options, {
        include_docs: false,
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        uuid: 'title: "two"'
      }, "allDocs parameter");
      return "bar";
    };

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      uuid: 'title: "two"'
    })
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: "bar",
            total_rows: 3
          }
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
  // cloudoooStorage.repair
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.repair");
  test("repair called substorage repair", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    }),
      expected_options = {foo: "bar"};

    Storage200.prototype.repair = function (options) {
      assert.deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

    jio.repair(expected_options)
      .then(function (result) {
        assert.equal(result, "OK");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.allAttachments");
  test("get called substorage allAttachments", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    Storage200.prototype.allAttachments = function (param) {
      assert.equal(param, "bar", "allAttachments 200 called");
      return {attachmentname: {}};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          attachmentname: {}
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
  // cloudoooStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.getAttachment");

  test("getAttachment called substorage getAttachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      assert.equal(id, "bar", "getAttachment 200 called");
      assert.equal(name, "foo", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        assert.deepEqual(result, blob);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.putAttachment", {

    beforeEach: function () {
      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "cloudooo",
        url: cloudooo_url,
        sub_storage: {
          type: 'cloudooostorage200'
        }
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("putAttachment convert from docx to docy", function (assert) {
    start = assert.async();
    assert.expect(8);

    var server = this.server,
      jio = this.jio,
      blob = new Blob(["document_docy_format"], {type: "docy"}),
      blob_convert = new Blob(["document_docx_format"], {type: "docx"}),
      result = serializer.serializeToString(parser.parseFromString(
        '<?xml version="1.0" encoding=\"UTF-8\"?><methodCall>' +
          '<methodName>convertFile</methodName><params><param><value>' +
          '<string>ZG9jdW1lbnRfZG9jeF9mb3JtYXQ=</string></value></param>' +
          '<param><value><string>docx</string></value></param>' +
          '<param><value><string>docy</string></value></param>' +
          '<param><struct></struct></param>' +
          '</params></methodCall>',
        'text/xml'
      ));

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8"?>' +
      '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3k=</string>']);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      assert.equal(id, "bar", "putAttachment 200 called");
      assert.equal(name, "data", "putAttachment 200 called");
      assert.deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.get = function (id) {
      assert.equal(id, "bar", "get 200 called");
      return {from: "docx", to: "docy"};
    };

    return jio.putAttachment("bar", "data", blob_convert)
      .then(function () {
        assert.equal(server.requests.length, 1, "Requests Length");
        assert.equal(server.requests[0].method, "POST", "Request Method");
        assert.equal(server.requests[0].url, cloudooo_url, "Request Url");
        assert.deepEqual(
          server.requests[0].requestBody,
          result,
          "Request Body"
        );
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  test("putAttachment fail to convert", function (assert) {
    start = assert.async();
    assert.expect(8);
    var error = [
      "<?xml version='1.0'?>",
      "<methodResponse>",
      "<fault>",
      "<value><struct>",
      "<member>",
      "<name>faultCode</name>",
      "<value><int>1</int></value>",
      "</member>",
      "<member>",
      "<name>faultString</name>",
      "<value><string>errorFromCloudooo</string></value>",
      "</member>",
      "</struct></value>",
      "</fault>",
      "</methodResponse>"]
      .join(""),
      server = this.server,
      jio = this.jio,
      blob = new Blob(["document_docx_format"], {type: "docx"}),
      result = serializer.serializeToString(parser.parseFromString(
        '<?xml version="1.0" encoding=\"UTF-8\"?><methodCall>' +
          '<methodName>convertFile</methodName><params><param><value>' +
          '<string>ZG9jdW1lbnRfZG9jeF9mb3JtYXQ=</string></value></param>' +
          '<param><value><string>docx</string></value></param>' +
          '<param><value><string>docy</string></value></param>' +
          '<param><struct></struct></param>' +
          '</params></methodCall>',
        'text/xml'
      ));

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, error]);

    Storage200.prototype.get = function (id) {
      assert.equal(id, "bar", "get 200 called");
      return {from: "docx", to: "docy"};
    };

    return jio.putAttachment("bar", "data", blob)
      .fail(function (error) {
        assert.equal(server.requests.length, 1, "Requests Length");
        assert.equal(server.requests[0].method, "POST", "Request Method");
        assert.equal(server.requests[0].url, cloudooo_url, "Request Url");
        assert.equal(
          server.requests[0].requestBody,
          result,
          "Request Body"
        );
        assert.equal(error.status_code, 500, "Error status code");
        assert.equal(error.message, 'Conversion failed', "Error message");
        assert.equal(error.detail, 'errorFromCloudooo', "Error detail");
      })
      .always(function () {
        start();
      });

  });
  test("putAttachment convert from html to pdf", function (assert) {
    start = assert.async();
    assert.expect(8);

    var server = this.server,
      jio = this.jio,
      blob = new Blob(["document_pdf__format"], {type: "pdf"}),
      blob_convert = new Blob(["document_html_format"], {type: "html"}),
      result = serializer.serializeToString(parser.parseFromString(
        '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
          '<methodName>convertFile</methodName><params><param><value>' +
          '<string>ZG9jdW1lbnRfaHRtbF9mb3JtYXQ=</string></value></param>' +
          '<param><value><string>html</string></value></param>' +
          '<param><value><string>pdf</string></value></param>' +
          '<param><struct><member><name>encoding</name>' +
          '<value><string>utf8</string></value></member></struct></param>' +
          '</params></methodCall>',
        'text/xml'
      ));

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0"?>' +
      '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3k=</string>']);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      assert.equal(id, "bar", "putAttachment 200 called");
      assert.equal(name, "data", "putAttachment 200 called");
      assert.deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.get = function (id) {
      assert.equal(id, "bar", "get 200 called");
      return {from: "html", to: "pdf"};
    };

    return jio.putAttachment("bar", "data", blob_convert,
      {"encoding": ["utf8", "string"]})
      .then(function () {
        assert.equal(server.requests.length, 1, "Requests Length");
        assert.equal(server.requests[0].method, "POST", "Request Method");
        assert.equal(server.requests[0].url, cloudooo_url, "Request Url");
        assert.deepEqual(
          server.requests[0].requestBody,
          result,
          "Request Body"
        );
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });
}(jIO, Blob, sinon, DOMParser, XMLSerializer));
