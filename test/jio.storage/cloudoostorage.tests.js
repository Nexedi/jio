/*jslint nomen: true*/
/*global jIO, Blob*/
(function (jIO, Blob) {
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
    cloudoo_url = 'https://softinst77579.host.vifib.net/';

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('cloudoostorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // CryptStorage.constructor
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
  // CryptStorage.get
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
  // CryptStorage.post
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
  // CryptStorage.put
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
  // CryptStorage.remove
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
  // CryptStorage.hasCapacity
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
              "Capacity 'foo' is not implemented on 'uuidstorage200'");
        return true;
      }
    );
  });
  /////////////////////////////////////////////////////////////////
  // CryptStorage.buildQuery
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
  // CryptStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    });

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return "Removed";
    };

    jio.removeAttachment("bar", "foo")
      .then(function (result) {
        equal(result, "Removed");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // CryptStorage.allAttachments
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
  // CryptStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "bar", "getAttachment 200 called");
      equal(name, "foo", "getAttachment 200 called");
      return blob;
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
  // CryptStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudooStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "cloudoo",
      url: cloudoo_url,
      sub_storage: {
        type: "cloudoostorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "foo", "putAttachment 200 called");
      deepEqual(blob2, blob,
                "putAttachment 200 called");
      return "OK";
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

}(jIO, Blob));
