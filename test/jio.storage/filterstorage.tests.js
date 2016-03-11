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
  jIO.addStorage('filterstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // filterStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("filterStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "filter",
      query: "fkcehzkjbnkjzn",
      sub_storage: {
        type: "filterstorage200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "filterstorage200");
    equal(jio.__storage._query, "fkcehzkjbnkjzn");

  });

  /////////////////////////////////////////////////////////////////
  // filterStorage.get
  /////////////////////////////////////////////////////////////////
  module("filterStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
      }
    });

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
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
  // filterStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("filterStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
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
  // filterStorage.post
  /////////////////////////////////////////////////////////////////
  module("filterStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
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
  // filterStorage.put
  /////////////////////////////////////////////////////////////////
  module("filterStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
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
  // filterStorage.remove
  /////////////////////////////////////////////////////////////////
  module("filterStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
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
  // filterStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("filterStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
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
  // filterStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("filterStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
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

  /////////////////////////////////////////////////////////////////
  // filterStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("filterStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
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
  // filterStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("filterStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    expect(5);
    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
      }
    });
    Storage200.prototype.hasCapacity = function (name) {
      return name === 'foo';
    };

    throws(
      function () {
        jio.hasCapacity("couscous");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'couscous' is not implemented on 'filterstorage200'");
        return true;
      }
    );
    equal(jio.hasCapacity("foo"), true);
  });

  /////////////////////////////////////////////////////////////////
  // filterStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("filterStorage.buildQuery");

  test("filterstorage extends query", function () {
    stop();
    expect(2);
    var jio = jIO.createJIO({
      type: "filter",
      query: 'foo: "bar"',
      sub_storage: {
        type: "filterstorage200"
      }
    }),
      parameters = {
        query: 'couscous:">=1000" AND freedom:"True"',
        limit: [0, 34]
      };
    Storage200.prototype.buildQuery = function (options) {
      equal(
        options.query,
        '( ( couscous: ">=1000" ) AND ( freedom: "True" ) ) AND ( foo: "bar" )'
      );
      equal(options.limit, parameters.limit);
      return [];
    };
    Storage200.prototype.hasCapacity = function () {
      return true;
    };
    jio.allDocs(parameters)
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // filterStorage.repair
  /////////////////////////////////////////////////////////////////
  module("filterStorage.repair");
  test("repair called substorage repair", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "filter",
      sub_storage: {
        type: "filterstorage200"
      }
    }),
      expected_options = {foo: "bar"};

    Storage200.prototype.repair = function (options) {
      deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

    jio.repair(expected_options)
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

}(jIO, QUnit, Blob));
