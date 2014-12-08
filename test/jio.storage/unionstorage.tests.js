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
    module = QUnit.module,
    throws = QUnit.throws;

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
  jIO.addStorage('unionstorage404', Storage404);

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
  Storage200.prototype.hasCapacity = function () {
    return true;
  };
  Storage200.prototype.buildQuery = function (options) {
    deepEqual(options, {query: 'title: "two"'},
              "buildQuery 200 called");
    return [{
      id: 200,
      value: {
        foo: "bar"
      }
    }];
  };
  jIO.addStorage('unionstorage200', Storage200);

  function Storage200v2() {
    return this;
  }
  Storage200v2.prototype.hasCapacity = function () {
    return true;
  };
  Storage200v2.prototype.buildQuery = function (options) {
    deepEqual(options, {query: 'title: "two"'},
              "buildQuery 200v2 called");
    return [{
      id: "200v2",
      value: {
        bar: "foo"
      }
    }];
  };
  jIO.addStorage('unionstorage200v2', Storage200v2);

  function Storage500() {
    return this;
  }
  function generateError() {
    ok(true, "Error generation called");
    throw new Error("manually triggered error");
  }
  Storage500.prototype.get = generateError;
  Storage500.prototype.post = generateError;
  jIO.addStorage('unionstorage500', Storage500);


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
        type: "unionstorage404"
      }, {
        type: "unionstorage404"
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
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
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
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
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
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
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
        type: "unionstorage404"
      }, {
        type: "unionstorage500"
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
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
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
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
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
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
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
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
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
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
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
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
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
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
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
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
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

  /////////////////////////////////////////////////////////////////
  // unionStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("unionStorage.hasCapacity");
  test("hasCapacity list without storage", function () {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: []
    });

    ok(jio.hasCapacity("list"));
  });

  test("hasCapacity list not implemented in substorage", function () {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
      }]
    });

    throws(
      function () {
        jio.hasCapacity("list");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message, "Capacity 'list' is not implemented");
        return true;
      }
    );
  });

  test("hasCapacity list implemented in substorage", function () {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage200"
      }]
    });

    ok(jio.hasCapacity("list"));
  });

  test("hasCapacity sort not manually done in union", function () {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage200"
      }]
    });

    throws(
      function () {
        jio.hasCapacity("sort");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message, "Capacity 'sort' is not implemented");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.allDocs
  /////////////////////////////////////////////////////////////////
  module("unionStorage.allDocs");
  test("allDocs remove duplicated keys", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.allDocs({
      query: 'title: "two"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: 200,
              value: {
                foo: "bar"
              }
            }],
            total_rows: 1
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

  test("allDocs concatenates results", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200v2"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.allDocs({
      query: 'title: "two"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "200v2",
              value: {
                bar: "foo"
              }
            }, {
              id: 200,
              value: {
                foo: "bar"
              }
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

  test("allDocs fails in one substorage fails", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.allDocs({
      query: 'title: "two"'
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Capacity 'list' is not implemented");
        equal(error.status_code, 501);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


}(jIO, QUnit));
