/*jslint nomen: true*/
/*global jIO, Blob, sinon*/
(function (jIO, Blob, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    cloudooo_url = 'https://www.exemple.org/';

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.constructor
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.constructor");

  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url
    });

    equal(jio.__type, "cloudooo");
    equal(jio.__storage._url, cloudooo_url);
    deepEqual(jio.__storage._conversion_stack, {});
  });
  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.get
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.get");
  test("get return stack document", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url
    });

    jio.__storage._conversion_stack.foo = {doc: {"bar": "foo"}};
    jio.get("foo")
      .then(function (result) {
        deepEqual(result, {
          "bar": "foo"
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
  // cloudoooStorage.put
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url
    });

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        equal(result, "bar");
        deepEqual(
          jio.__storage._conversion_stack,
          {bar: { doc: {"title": "foo"}, attachment_dict: {}}},
          "Check document"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.remove
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url
    });

    jio.__storage._conversion_stack.bar = {doc: {}};

    jio.remove("bar")
      .then(function (result) {
        equal(result, "bar");
        deepEqual(jio.__storage._conversion_stack, {}, "Check empty stack");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.buildQuery");

  test("buildQuery list all documents", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url
    });

    jio.__storage._conversion_stack = {
      "bar": {doc: {}, attachment_dict: {}},
      "foo": {doc: {}, attachment_dict: {}}
    };

    jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "bar",
              value: {}
            }, {
              id: "foo",
              value: {}
            }],
            total_rows: 2
          }
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
  // cloudoooStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.allAttachments");
  test("check allAttachments", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url
    });

    jio.__storage._conversion_stack.bar = {
      doc: {},
      attachment_dict: {"foo": new Blob(["a"]), "bar": new Blob(["b"])}
    };

    jio.allAttachments("bar")
      .then(function (result) {
        deepEqual(
          result,
          {"foo": {}, "bar": {}},
          "Check allAttachments"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.getAttachment");

  test("getAttachment return converted attachment", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url
    }), blob = new Blob(["converted"]);

    jio.__storage._conversion_stack.bar = {
      doc: {},
      attachment_dict: {foo: blob}
    };

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        equal(result, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.putAttachment", {

    setup: function () {
      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "cloudooo",
        url: cloudooo_url
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("putAttachment convert from docx to docy", function () {
    stop();
    expect(5);

    var server = this.server,
      jio = this.jio,
      blob = new Blob(["document_docy_format"], {type: "docy"}),
      blob_convert = new Blob(["document_docx_format"], {type: "docx"});

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8"?>' +
      '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3k=</string>']);

    jio.put("bar", {from: "docx", to: "docy"})
      .then(function () {
        return jio.putAttachment("bar", "data", blob_convert);
      })
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, cloudooo_url);
        equal(
          server.requests[0].requestBody,
          '<?xml version="1.0" encoding=\"UTF-8\"?><methodCall>' +
            '<methodName>convertFile</methodName><params><param><value>' +
            '<string>ZG9jdW1lbnRfZG9jeF9mb3JtYXQ=</string></value></param>' +
            '<param><value><string>docx</string></value></param>' +
            '<param><value><string>docy' +
            '</string></value></param></params></methodCall>'
        );
        deepEqual(
          jio.__storage._conversion_stack.bar.attachment_dict.data,
          blob,
          "check converted blob"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  test("putAttachment fail to convert", function () {
    stop();
    expect(7);
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
      blob = new Blob(["document_docx_format"], {type: "docx"});

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, error]);

    jio.put("bar", {from: "docx", to: "docy"})
      .then(function () {
        return jio.putAttachment("bar", "data", blob);
      })
      .fail(function (error) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, cloudooo_url);
        equal(
          server.requests[0].requestBody,
          '<?xml version="1.0" encoding=\"UTF-8\"?><methodCall>' +
            '<methodName>convertFile</methodName><params><param><value>' +
            '<string>ZG9jdW1lbnRfZG9jeF9mb3JtYXQ=</string></value></param>' +
            '<param><value><string>docx</string></value></param>' +
            '<param><value><string>docy' +
            '</string></value></param></params></methodCall>'
        );
        equal(error.status_code, 418);
        equal(error.message, 'Conversion failed');
        equal(error.detail, 'errorFromCloudooo');
      })
      .always(function () {
        start();
      });

  });
}(jIO, Blob, sinon));
