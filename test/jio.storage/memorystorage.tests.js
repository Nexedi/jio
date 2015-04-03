/*jslint nomen: true */
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
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // memoryStorage constructor
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.constructor");

  test("Storage has a memory database", function () {
    var jio = jIO.createJIO({
      "type": "memory"
    });

    equal(jio.__type, "memory");
    deepEqual(jio.__storage._database, {});
  });

  test("Storage's memory database is not shared", function () {
    var jio = jIO.createJIO({
      "type": "memory"
    }),
      jio2 = jIO.createJIO({
        "type": "memory"
      });

    ok(jio.__storage._database !== jio2.__storage._database,
       "Database is not shared");
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.put
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("put non empty document", function () {
    expect(2);
    stop();

    var test = this;

    this.jio.put("put1", {"title": "myPut1"})
      .then(function (uuid) {
        equal(uuid, "put1");
        deepEqual(test.jio.__storage._database.put1, {
          attachments: {},
          doc: JSON.stringify({
            "title": "myPut1"
          })
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put when document already exists", function () {
    var id = "put1",
      test = this;
    this.jio.__storage._database[id] = {
      "foo": "bar",
      "attachments": {"foo": "bar"},
      "doc": "foobar"
    };
    expect(2);
    stop();

    this.jio.put(id, {"title": "myPut2"})
      .then(function (uuid) {
        equal(uuid, "put1");
        deepEqual(test.jio.__storage._database.put1, {
          "foo": "bar",
          "attachments": {"foo": "bar"},
          doc: JSON.stringify({
            "title": "myPut2"
          })
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
  // memoryStorage.get
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });

  test("get inexistent document", function () {
    stop();
    expect(3);

    this.jio.get("inexistent")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError, error);
        equal(error.message, "Cannot find document: inexistent");
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
    var id = "post1";
    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({title: "myPost1"})
    };
    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          "title": "myPost1"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function () {
    var id = "putattmt1";

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({}),
      "attachments": {
        putattmt2: undefined
      }
    };

    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          "_attachments": {putattmt2: {}}
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
  // memoryStorage.remove
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.remove", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });

  test("remove document", function () {
    var id = "foo";

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({title: "myPost1"})
    };

    stop();
    expect(1);

    this.jio.remove("foo")
      .then(function (result) {
        equal(result, "foo");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.getAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("get attachment from inexistent document", function () {
    stop();
    expect(3);

    this.jio.getAttachment("inexistent", "a")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment: inexistent , a");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent attachment from document", function () {
    var id = "b";
    stop();
    expect(3);

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({})
    };

    this.jio.getAttachment(id, "inexistent")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment: b , inexistent");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent attachment from document with other attachments",
       function () {
      var id = "b";
      stop();
      expect(3);

      this.jio.__storage._database[id] = {
        "doc": JSON.stringify({}),
        attachments: {"foo": "bar"}
      };

      this.jio.getAttachment(id, "inexistent")
        .fail(function (error) {
          ok(error instanceof jIO.util.jIOError);
          equal(error.message, "Cannot find attachment: b , inexistent");
          equal(error.status_code, 404);
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("get attachment from document", function () {
    var id = "putattmt1",
      attachment = "putattmt2",
      blob = new Blob(["test"], {"type": "x-application/foo"});
    stop();
    expect(2);

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({}),
      "attachments": {
        "putattmt2": blob
      }
    };

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
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
  // memoryStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("put an attachment to an inexistent document", function () {
    stop();
    expect(3);

    this.jio.putAttachment("inexistent", "putattmt2", "")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError, error);
        equal(error.message, "Cannot find document: inexistent");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put an attachment to a document", function () {
    var id = "putattmt1",
      blob = new Blob(["test"], {"type": "x-application/foo"}),
      jio = this.jio;

    jio.__storage._database[id] = {
      "doc": JSON.stringify({"foo": "bar"}),
      "attachments": {}
    };

    stop();
    expect(1);

    jio.putAttachment(id, "putattmt2", blob)
      .then(function () {
        equal(jio.__storage._database[id].attachments.putattmt2, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })

      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.removeAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("remove an attachment to an inexistent document", function () {
    stop();
    expect(3);

    this.jio.removeAttachment("inexistent", "removeattmt2")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError, error);
        equal(error.message, "Cannot find document: inexistent");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove an attachment to a document", function () {
    var id = "removeattmt1",
      jio = this.jio;

    jio.__storage._database[id] = {
      "doc": JSON.stringify({"foo": "bar"}),
      "attachments": {"removeattmt2": "bar"}
    };

    stop();
    expect(1);

    jio.removeAttachment(id, "removeattmt2")
      .then(function () {
        deepEqual(jio.__storage._database[id].attachments, {});
      })
      .fail(function (error) {
        ok(false, error);
      })

      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.hasCapacity", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("can list documents", function () {
    ok(this.jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.buildQuery", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });

  test("list documents", function () {
    this.jio.__storage._database.foo2 = "bar2";
    this.jio.__storage._database.foo1 = "bar1";

    stop();
    expect(1);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          "data": {
            "rows": [
              {
                "id": "foo2",
                "value": {}
              },
              {
                "id": "foo1",
                "value": {}
              }
            ],
            "total_rows": 2
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
