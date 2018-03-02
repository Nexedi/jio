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
    throws = QUnit.throws,
    module = QUnit.module,
    cloudoo_url = 'https://www.cloudooo.com/';

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('cloudoostorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // CloudooStorage.constructor
  /////////////////////////////////////////////////////////////////

  module("cloudooStorage.constructor");

  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {type : "cloudoostorage200"}
    });

    equal(jio.__type, "cloudoo");
    equal(jio.__storage._url, cloudoo_url);
    equal(jio.__storage._sub_storage.__type, "cloudoostorage200");
  });
  /////////////////////////////////////////////////////////////////
  // CloudooStorage.get
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.get = function (param) {
      equal(param, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
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
  // CloudooStorage.post
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.post = function (param) {
      deepEqual(param, {"title": "foo"}, "post 200 called");
      return "youhou";
    };

    jio.post({"title": "foo"})
      .then(function (result) {
        equal(result, "youhou");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // CloudooStorage.put
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.put = function (id, param) {
      equal(id, "bar", "put 200 called");
      deepEqual(param, {"title": "foo"}, "put 200 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
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
  /////////////////////////////////////////////////////////////////
  // CloudooStorage.remove
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.remove = function (id) {
      deepEqual(id, "bar", "remove 200 called");
      return id;
    };

    jio.remove("bar")
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
  /////////////////////////////////////////////////////////////////
  // CloudooStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    delete Storage200.prototype.hasCapacity;

    throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'foo' is not implemented on 'cloudoostorage200'");
        return true;
      }
    );
  });
  /////////////////////////////////////////////////////////////////
  // CloudooStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
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
        deepEqual(result, {
          data: {
            rows: "bar",
            total_rows: 3
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
  // CloudooStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.get = function (id) {
      if (id !== "bar") {
        throw new jIO.util.jIOError('not found', 404);
      }
      return {};
    };

    Storage200.prototype.remove = function (id) {
      equal(id, 'cloudoo/bar/foo', "remove 200 called");
      return id;
    };


    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return "Removed";
    };

    jio.removeAttachment("bar", "foo")
      .then(function (result) {
        equal(result, "cloudoo/bar/foo");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // CloudooStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.allAttachments = function (id) {
      equal(id, "bar", "allAttachments, 200 called");
      return {attachmentname: {}};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        deepEqual(result, {
          attachmentname: {}
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
  // CloudooStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.getAttachment", {

    setup: function () {
      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "cloudoo",
        url: cloudoo_url,
        sub_storage: {
          type: "cloudoostorage200"
        }
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "bar", "getAttachment 200 called");
      equal(name, "foo", "getAttachment 200 called");
      return blob;
    };

    this.jio.getAttachment("bar", "foo")
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

  test("getAttachment convert from docy to docx", function () {
    stop();
    expect(12);

    var blob = new Blob(["documentauformatdocy"]),
      server = this.server,
      blob_convert = new Blob(["documentauformatdocx"], {type: "docx"});

    this.server.respondWith("POST", cloudoo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8"?>' +
      '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3g=</string>']);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "bar", "getAttachment 200 called");
      if (name === "data?docx") {
        throw new jIO.util.jIOError("can't find", 404);
      }
      return blob;
    };

    Storage200.prototype.putAttachment = function (id, att_id, blob) {
      equal(id, "bar", "putAttachment 200 called");
      equal(att_id, "data?docx", "putAttachment 200 called");
      deepEqual(blob, blob_convert, "putAttachment 200 called");
    };

    Storage200.prototype.get = function (id) {
      if (id === "cloudoo/bar/data") {
        throw new jIO.util.jIOError("can't find", 404);
      }
      if (id === "bar") {
        return {content_type: "application/x-asc-text"};
      }
      equal(id, "", "get 200 called");
      return {};
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "cloudoo/bar/data", "put 200 called");
      deepEqual(doc, {
        "attachment_id": "data",
        "convert_dict": {
          "docx": true
        },
        "doc_id": "bar",
        "format": "docy",
        "portal_type": "Conversion Info"
      }, "put doc 200 called");
      return id;
    };

    this.jio.getAttachment("bar", "data?docx")
      .then(function (result) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, cloudoo_url);
        equal(
          server.requests[0].requestBody,
          '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
            '<methodName>convertFile</methodName><params><param><value>' +
            '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3k=</string></value></param>' +
            '<param><value><string>docy</string></value></param>' +
            '<param><value><string>docx' +
            '</string></value></param></params></methodCall>'
        );
        deepEqual(result, blob_convert, "check result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment convert from docy to docx failed", function () {
    stop();
    expect(4);

    var blob = new Blob(["documentauformatdocy"]);

    this.server.respondWith("POST", cloudoo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8"?>']);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "bar", "getAttachment 200 called");
      if (name === "data?docx") {
        throw new jIO.util.jIOError("can't find", 404);
      }
      return blob;
    };

    Storage200.prototype.get = function (id) {
      if (id === "cloudoo/bar/data") {
        throw new jIO.util.jIOError("can't find", 404);
      }
      if (id === "bar") {
        return {content_type: "application/x-asc-text"};
      }
      equal(id, "", "get 200 called");
      return {};
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "cloudoo/bar/data", "put 200 called");
      deepEqual(doc, {
        "attachment_id": "data",
        "convert_dict": {
          "docx": false
        },
        "doc_id": "bar",
        "format": "docy",
        "portal_type": "Conversion Info"
      }, "put doc 200 called");
      return id;
    };

    this.jio.getAttachment("bar", "data?docx")
      .fail(function (error) {
        equal(error.message, "conversion failed", "check conversion failed");
        equal(error.status_code, 404, "check error status code");
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // CloudooStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(6);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.get = function (id) {
      if (id !== 'bar') {
        throw new jIO.util.jIOError("can't find", 404);
      }
      return {};
    };

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "foo", "putAttachment 200 called");
      deepEqual(blob2, blob,
                "putAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "cloudoo/bar/foo", "put id 200 called");
      deepEqual(doc, {
        "attachment_id": "foo",
        "convert_dict": {},
        "doc_id": "bar",
        "format": undefined,
        "portal_type": "Conversion Info"
      }, "put doc 200 called");
      return id;
    };

    jio.putAttachment("bar", "foo", blob)
      .then(function (result) {
        equal(result, "OK");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CloudooStorage.repair
  /////////////////////////////////////////////////////////////////

  module("cloudooStorage.repair", {

    setup: function () {
      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "cloudoo",
        url: cloudoo_url,
        sub_storage: {
          type: "cloudoostorage200"
        }
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("repair convert attachment", function () {
    stop();
    expect(14);

    var blob = new Blob(["documentauformatdocy"]),
      server = this.server,
      blob_convert = new Blob(["documentauformatdocx"], {type: "docx"});

    this.server.respondWith("POST", cloudoo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8"?>' +
      '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3g=</string>']);

    Storage200.prototype.repair = function () {
      return "OK";
    };

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.get = function (id) {
      equal(id, 'cloudoo/bar/data', 'check get 200 called');
      return {
        "attachment_id": "data",
        "convert_dict": {
          "docx": false
        },
        "doc_id": "bar",
        "format": "docy",
        "portal_type": "Conversion Info"
      };
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "cloudoo/bar/data", "check put 200 called");
      deepEqual(doc, {
        "attachment_id": "data",
        "convert_dict": {
          "docx": true
        },
        "doc_id": "bar",
        "format": "docy",
        "portal_type": "Conversion Info"
      }, "check put 200 called");
    };

    Storage200.prototype.getAttachment = function (id, att_id) {
      equal(id, 'bar', "check getAttachment 200 called");
      equal(att_id, 'data', "check getAttachment 200 called");
      return blob;
    };

    Storage200.prototype.putAttachment = function (id, att_id, result) {
      equal(id, 'bar', 'check putAttachment 200 called');
      equal(att_id, 'data?docx', "check puttAttachment 200 called");
      deepEqual(result, blob_convert, "check putAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.buildQuery = function (options) {
      equal(
        options.query,
        'portal_type: "Conversion Info"',
        "check buildQuery 200 called"
      );
      deepEqual(
        options.select_list,
        ['convert_dict', 'doc_id', 'attachment_id'],
        'check buildQuery 200 called'
      );
      return [{
        id: "bar",
        value: {
          'convert_dict': {'docx': false},
          'doc_id': 'bar',
          'attachment_id': 'data'
        },
        doc: {}
      }];
    };

    this.jio.repair()
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, cloudoo_url);
        equal(
          server.requests[0].requestBody,
          '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
            '<methodName>convertFile</methodName><params><param><value>' +
            '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3k=</string></value></param>' +
            '<param><value><string>docy</string></value></param>' +
            '<param><value><string>docx' +
            '</string></value></param></params></methodCall>'
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, Blob, sinon));
