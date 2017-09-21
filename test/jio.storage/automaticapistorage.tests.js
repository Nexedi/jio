/*jslint nomen: true */
/*global Blob, sinon*/
(function (jIO, QUnit, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    //throws = QUnit.throws,
    tokens = ["sample_token1", "sample_token2"];

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('querystorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage constructor
  /////////////////////////////////////////////////////////////////
  module("AutomaticAPIStorage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "automaticapi",
      access_tokens: tokens
    });
    equal(jio.__type, "automaticapi");
    deepEqual(jio.__storage._access_tokens, tokens);
  });

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage.get
  /////////////////////////////////////////////////////////////////
  module("AutomaticAPIStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "automaticapi",
        access_token: tokens
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.get("get1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id get1/ is forbidden (not starting with /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.get("/get1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /get1 is forbidden (not ending with /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    stop();
    expect(3);

    this.jio.get("/inexistent/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: /inexistent/");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("handle unauthorized", function () {
    var url = "https://api.automatic.com/vehicle/";
    this.server.respondWith("GET", url, [401, {
      "Content-Type": "application/json"
    }, '{"error":"err_unauthorized","detail":"Invalid token."}\n']);
    stop();
    expect(3);

    this.jio.get("/0/vehicle/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Invalid token provided, Unauthorized.");
        equal(error.status_code, 401);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get list of something", function () {
    var url = "https://api.automatic.com/vehicle/";
    this.server.respondWith("GET", url, [200, {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json"
    }, '{"_metadata":{"count":1,"next":null,"previous":null},' +
      '"results":[{}]}' ]);
    stop();
    expect(1);

    this.jio.get("/0/vehicle/")
      .then(function (result) {
        deepEqual(result, [{}], "Check list type");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get single element", function () {
    var url = "https://api.automatic.com/trip" +
      "/T_randomtrip";
    this.server.respondWith("GET", url, [200, {
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/json'
    }, '{"id":"T_randomtrip",' +
      '"url":"https://api.automatic.com/trip/T_randomtrip/"}']);
    stop();
    expect(1);

    this.jio.get("/0/trip/T_randomtrip")
      .then(function (result) {
        deepEqual(result, {}, "Check single element type");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // AutomaticAPIStorage.buildQuery
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
    StorageNoSortCapacity.prototype.get = function (id) {
      if (id === "foo") {
        equal(id, "foo", "Get foo");
      } else {
        equal(id, "bar", "Get bar");
      }
      return {title: id, id: "ID " + id,
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
    StorageNoSelectCapacity.prototype.get = function (id) {
      if (id === "foo") {
        equal(id, "foo", "Get foo");
      } else {
        equal(id, "bar", "Get bar");
      }
      return {title: id, id: "ID " + id,
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
    StorageNoLimitCapacity.prototype.get = function (id) {
      if (id === "foo") {
        equal(id, "foo", "Get foo");
      } else {
        equal(id, "bar", "Get bar");
      }
      return {title: id, id: "ID " + id,
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
    StorageNoQueryCapacity.prototype.get = function (id) {
      if (id === "foo") {
        equal(id, "foo", "Get foo");
      } else {
        equal(id, "bar", "Get bar");
      }
      return {title: id, id: "ID " + id,
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
            another: "property"
          }
        }, {
          id: "bar",
          value: {},
          doc: {
            title: "bar",
            id: "ID bar",
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

}(jIO, QUnit, Blob, sinon));