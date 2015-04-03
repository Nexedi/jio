/*jslint nomen: true*/
/*global Blob*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    throws = QUnit.throws;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('uuidstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // uuidStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "uuidstorage200");

  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.get
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
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
  // uuidStorage.post
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.post");
  test("post called substorage put with a new id", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    }),
      uuid;

    function isUuid(uuid) {
      var x = "[0-9a-fA-F]";
      if (typeof uuid !== "string") {
        return false;
      }
      return (uuid.match(
        "^" + x + "{8}-" + x + "{4}-" +
          x + "{4}-" + x + "{4}-" + x + "{12}$"
      ) === null ? false : true);
    }

    Storage200.prototype.put = function (id, param) {
      uuid = id;
      deepEqual(param, {"title": "foo"}, "post 200 called");
      return "bar";
    };

    jio.post({"title": "foo"})
      .then(function (result) {
        equal(result, uuid);
        ok(isUuid(uuid), uuid);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.put
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
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
  // uuidStorage.remove
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });
    Storage200.prototype.remove = function (param) {
      equal(param, "bar", "remove 200 called");
      return param._id;
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
  // uuidStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
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
  // uuidStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "foo", "putAttachment 200 called");
      deepEqual(blob2, blob, "putAttachment 200 called");
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

  /////////////////////////////////////////////////////////////////
  // uuidStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
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
  // uuidStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
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
  // uuidStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
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

}(jIO, QUnit, Blob));
