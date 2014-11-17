/*jslint nomen: true */
(function (jIO, QUnit) {
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
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage404() {
    return this;
  }
  function generate404Error(param) {
    equal(param._id, "bar", "get 404 called");
    throw new jIO.util.jIOError("Cannot find document", 404);
  }
  Storage404.prototype.get = generate404Error;
  jIO.addStorage('storage404', Storage404);

  function Storage200() {
    return this;
  }
  Storage200.prototype.get = function (param) {
    equal(param._id, "bar", "get 200 called");
    return {title: "foo"};
  };
  Storage200.prototype.put = function (param) {
    deepEqual(param, {"_id": "bar", "title": "foo"}, "put 200 called");
    return param._id;
  };
  Storage200.prototype.remove = function (param) {
    deepEqual(param, {"_id": "bar"}, "remove 200 called");
    return param._id;
  };
  Storage200.prototype.post = function (param) {
    deepEqual(param, {"_id": "bar", "title": "foo"}, "post 200 called");
    return param._id;
  };
  jIO.addStorage('storage200', Storage200);

  function Storage500() {
    return this;
  }
  function generateError() {
    ok(true, "Error generation called");
    throw new Error("manually triggered error");
  }
  Storage500.prototype.get = generateError;
  Storage500.prototype.post = generateError;
  jIO.addStorage('storage500', Storage500);


  /////////////////////////////////////////////////////////////////
  // unionStorage.get
  /////////////////////////////////////////////////////////////////
  module("unionStorage.get");
  test("get inexistent document", function () {
    stop();
    expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage404"
      }, {
        type: "storage404"
      }]
    });

    jio.get({"_id": "bar"})
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

  test("get document on first storage", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage200"
      }, {
        type: "storage404"
      }]
    });

    jio.get({"_id": "bar"})
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

  test("get document on second storage", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage404"
      }, {
        type: "storage200"
      }]
    });

    jio.get({"_id": "bar"})
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

  test("get error on first storage", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage500"
      }, {
        type: "storage200"
      }]
    });

    jio.get({"_id": "bar"})
      .fail(function (error) {
        ok(error instanceof Error);
        equal(error.message, "manually triggered error");
        equal(error.status_code, undefined);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get error on second storage", function () {
    stop();
    expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage404"
      }, {
        type: "storage500"
      }]
    });

    jio.get({"_id": "bar"})
      .fail(function (error) {
        ok(error instanceof Error);
        equal(error.message, "manually triggered error");
        equal(error.status_code, undefined);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.post
  /////////////////////////////////////////////////////////////////
  module("unionStorage.post");
  test("post generate an error", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage500"
      }, {
        type: "storage200"
      }]
    });

    jio.post({"_id": "bar", "title": "foo"})
      .fail(function (error) {
        ok(error instanceof Error);
        equal(error.message, "manually triggered error");
        equal(error.status_code, undefined);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("post store on first storage", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage200"
      }, {
        type: "storage500"
      }]
    });

    jio.post({"_id": "bar", "title": "foo"})
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
  // unionStorage.put
  /////////////////////////////////////////////////////////////////
  module("unionStorage.put");
  test("put generate an error", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage500"
      }, {
        type: "storage200"
      }]
    });

    jio.put({"_id": "bar", "title": "foo"})
      .fail(function (error) {
        ok(error instanceof Error);
        equal(error.message, "manually triggered error");
        equal(error.status_code, undefined);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put on first storage", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage200"
      }, {
        type: "storage500"
      }]
    });

    jio.put({"_id": "bar", "title": "foo"})
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

  test("put on second storage", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage404"
      }, {
        type: "storage200"
      }]
    });

    jio.put({"_id": "bar", "title": "foo"})
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
  // unionStorage.remove
  /////////////////////////////////////////////////////////////////
  module("unionStorage.remove");
  test("remove generate an error", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage500"
      }, {
        type: "storage200"
      }]
    });

    jio.remove({"_id": "bar"})
      .fail(function (error) {
        ok(error instanceof Error);
        equal(error.message, "manually triggered error");
        equal(error.status_code, undefined);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove on first storage", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage200"
      }, {
        type: "storage500"
      }]
    });

    jio.remove({"_id": "bar"})
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

  test("remove on second storage", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "storage404"
      }, {
        type: "storage200"
      }]
    });

    jio.remove({"_id": "bar"})
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


}(jIO, QUnit));
