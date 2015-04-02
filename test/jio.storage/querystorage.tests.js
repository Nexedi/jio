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
  jIO.addStorage('querystorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // queryStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("queryStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "querystorage200");

  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.get
  /////////////////////////////////////////////////////////////////
  module("queryStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    Storage200.prototype.get = function (param) {
      equal(param._id, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get({"_id": "bar"})
      .then(function (result) {
        deepEqual(result, {
          "_id": "bar",
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
  // queryStorage.post
  /////////////////////////////////////////////////////////////////
  module("queryStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
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
  // queryStorage.put
  /////////////////////////////////////////////////////////////////
  module("queryStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });
    Storage200.prototype.put = function (param) {
      deepEqual(param, {"_id": "bar", "title": "foo"}, "put 200 called");
      return param._id;
    };

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
  // queryStorage.remove
  /////////////////////////////////////////////////////////////////
  module("queryStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });
    Storage200.prototype.remove = function (param) {
      deepEqual(param, {"_id": "bar"}, "remove 200 called");
      return param._id;
    };

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
  // queryStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("queryStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (param) {
      deepEqual(param, {"_id": "bar", "_attachment": "foo"},
                "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment({"_id": "bar", "_attachment": "foo"})
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
  // queryStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("queryStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (param) {
      deepEqual(param, {"_id": "bar", "_attachment": "foo", "_blob": blob},
                "putAttachment 200 called");
      return "OK";
    };

    jio.putAttachment({"_id": "bar", "_attachment": "foo", "_blob": blob})
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
  // queryStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("queryStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    Storage200.prototype.removeAttachment = function (param) {
      deepEqual(param, {"_id": "bar", "_attachment": "foo"},
                "removeAttachment 200 called");
      return "Removed";
    };

    jio.removeAttachment({"_id": "bar", "_attachment": "foo"})
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
  // queryStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("queryStorage.hasCapacity");
  test("hasCapacity is true by default", function () {
    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    equal(jio.hasCapacity("foo"), true);
  });

  test("hasCapacity list return substorage value", function () {
    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    throws(
      function () {
        jio.hasCapacity("list");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'list' is not implemented on 'querystorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("queryStorage.buildQuery");

  test("substorage should have 'list' capacity", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    jio.allDocs({
      include_docs: true,
      query: 'title: "two"'
    })
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'list' is not implemented on 'querystorage200'");
      })
      .always(function () {
        start();
      });
  });

  test("no manual query if substorage handle everything", function () {
    stop();
    expect(2);

    function StorageAllDocsNoGet() {
      return this;
    }
    StorageAllDocsNoGet.prototype.get = function () {
      throw new Error("Unexpected get call");
    };
    StorageAllDocsNoGet.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list") ||
          (capacity === "sort") ||
          (capacity === "select") ||
          (capacity === "limit") ||
          (capacity === "query")) {
        return true;
      }
      throw new Error("Unexpected " + capacity + " capacity check");
    };
    StorageAllDocsNoGet.prototype.buildQuery = function (options) {
      deepEqual(options, {
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        query: 'title: "two"'
      },
                "buildQuery called");
      return "taboulet";
    };

    jIO.addStorage('querystoragealldocsnoget', StorageAllDocsNoGet);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystoragealldocsnoget"
      }
    });

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      query: 'title: "two"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: "taboulet",
            total_rows: 8
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

  test("manual query used if substorage does not handle sort", function () {
    stop();
    expect(4);

    function StorageNoSortCapacity() {
      return this;
    }
    StorageNoSortCapacity.prototype.get = function (options) {
      if (options._id === "foo") {
        equal(options._id, "foo", "Get foo");
      } else {
        equal(options._id, "bar", "Get bar");
      }
      return {title: options._id, id: "ID " + options._id,
              "another": "property"};
    };
    StorageNoSortCapacity.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list") ||
          (capacity === "select") ||
          (capacity === "limit") ||
          (capacity === "query")) {
        return true;
      }
      return false;
    };
    StorageNoSortCapacity.prototype.buildQuery = function (options) {
      deepEqual(options, {}, "No query parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('querystoragenosortcapacity', StorageNoSortCapacity);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystoragenosortcapacity"
      }
    });

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      query: 'title: "foo"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "foo",
              doc: {},
              value: {
                title: "foo",
                id: "ID foo"
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

  test("manual query used if substorage does not handle select", function () {
    stop();
    expect(4);

    function StorageNoSelectCapacity() {
      return this;
    }
    StorageNoSelectCapacity.prototype.get = function (options) {
      if (options._id === "foo") {
        equal(options._id, "foo", "Get foo");
      } else {
        equal(options._id, "bar", "Get bar");
      }
      return {title: options._id, id: "ID " + options._id,
              "another": "property"};
    };
    StorageNoSelectCapacity.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list") ||
          (capacity === "sort") ||
          (capacity === "limit") ||
          (capacity === "query")) {
        return true;
      }
      return false;
    };
    StorageNoSelectCapacity.prototype.buildQuery = function (options) {
      deepEqual(options, {}, "No query parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('querystoragenoselectcapacity', StorageNoSelectCapacity);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystoragenoselectcapacity"
      }
    });

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      query: 'title: "foo"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "foo",
              doc: {},
              value: {
                title: "foo",
                id: "ID foo"
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

  test("manual query used if substorage does not handle limit", function () {
    stop();
    expect(4);

    function StorageNoLimitCapacity() {
      return this;
    }
    StorageNoLimitCapacity.prototype.get = function (options) {
      if (options._id === "foo") {
        equal(options._id, "foo", "Get foo");
      } else {
        equal(options._id, "bar", "Get bar");
      }
      return {title: options._id, id: "ID " + options._id,
              "another": "property"};
    };
    StorageNoLimitCapacity.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list") ||
          (capacity === "select") ||
          (capacity === "sort") ||
          (capacity === "query")) {
        return true;
      }
      return false;
    };
    StorageNoLimitCapacity.prototype.buildQuery = function (options) {
      deepEqual(options, {}, "No query parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('querystoragenolimitcapacity', StorageNoLimitCapacity);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystoragenolimitcapacity"
      }
    });

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      query: 'title: "foo"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "foo",
              doc: {},
              value: {
                title: "foo",
                id: "ID foo"
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

  test("manual query used if substorage does not handle query", function () {
    stop();
    expect(4);

    function StorageNoQueryCapacity() {
      return this;
    }
    StorageNoQueryCapacity.prototype.get = function (options) {
      if (options._id === "foo") {
        equal(options._id, "foo", "Get foo");
      } else {
        equal(options._id, "bar", "Get bar");
      }
      return {title: options._id, id: "ID " + options._id,
              "another": "property"};
    };
    StorageNoQueryCapacity.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list") ||
          (capacity === "select") ||
          (capacity === "limit") ||
          (capacity === "sort")) {
        return true;
      }
      return false;
    };
    StorageNoQueryCapacity.prototype.buildQuery = function (options) {
      deepEqual(options, {}, "No query parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('querystoragenoquerycapacity', StorageNoQueryCapacity);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystoragenoquerycapacity"
      }
    });

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      query: 'title: "foo"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "foo",
              doc: {},
              value: {
                title: "foo",
                id: "ID foo"
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

  test("does not fetch doc one by one if substorage handle include_docs",
       function () {
      stop();
      expect(2);

      function StorageIncludeDocsCapacity() {
        return this;
      }
      StorageIncludeDocsCapacity.prototype.hasCapacity = function (capacity) {
        if ((capacity === "list") ||
            (capacity === "include")) {
          return true;
        }
        return false;
      };
      StorageIncludeDocsCapacity.prototype.buildQuery = function (options) {
        deepEqual(options, {include_docs: true}, "Include docs parameter");
        var result2 = [{
          id: "foo",
          value: {},
          doc: {
            title: "foo",
            id: "ID foo",
            _id: "foo",
            another: "property"
          }
        }, {
          id: "bar",
          value: {},
          doc: {
            title: "bar",
            id: "ID bar",
            _id: "bar",
            another: "property"
          }
        }];
        return result2;
      };

      jIO.addStorage('querystorageincludedocscapacity',
                     StorageIncludeDocsCapacity);

      var jio = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "querystorageincludedocscapacity"
        }
      });

      jio.allDocs({
        include_docs: false,
        sort_on: [["title", "ascending"]],
        limit: [0, 5],
        select_list: ["title", "id"],
        query: 'title: "foo"'
      })
        .then(function (result) {
          deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                doc: {},
                value: {
                  title: "foo",
                  id: "ID foo"
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

}(jIO, QUnit, Blob));
