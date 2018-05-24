/*jslint nomen: true*/
/*global Blob, jiodate*/
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
  // bryanStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.constructor");
  test("accept parameters", function () {
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "memory");
  });


  /////////////////////////////////////////////////////////////////
  // bryanStorage.get
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    // create storage of type "bryan" with memory as substorage
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });
    jio.put("bar", {"title": "foo"});
    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo",
          "_revision": 0
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo",
          "_revision": 0
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      });
      //.always(function () {
      //  start();
      //});
  });

  /////////////////////////////////////////////////////////////////
  // _revision parameter initialization
  /////////////////////////////////////////////////////////////////
  module("bryanStorage initialize _revision");
  test("verifying _revision updates correctly", function () {
    stop();
    expect(2);

    // create storage of type "bryan" with memory as substorage
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });
    jio.put("bar", {"title": "foo"})
      .push(function (result) {
        equal(result, "bar");
        return jio.get("bar");
      })
      .push(function (result) {
        deepEqual(result, {
          "title": "foo",
          "_revision": 0
        }, "Check document");
      })
      .fail(function (error) {ok(false, error); })
      .always(function () {start(); });
  });


  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with put
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with put");
  test("verifying _revision updates correctly", function () {
    stop();
    expect(1);

    // create storage of type "bryan" with memory as substorage
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {type: "memory"}
    });
    jio.put("bar", {"title": "foo"})
      .push(function () {return jio.put("bar", {"title2": "foo2"}); })
      .push(function () {return jio.put("bar", {"title3": "foo3"}); })
      .push(function () {return jio.get("bar"); })
      .push(function (result) {
        deepEqual(result, {
          "title3": "foo3",
          "_revision": 2
        }, "Check document after initialization");
      })
      .fail(function (error) {ok(false, error); })
      .always(function () {start(); });
  });

  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with putAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with putAttachment");
  test("verifying _revision updates correctly after putAttachment",
    function () {
      stop();
      expect(1);

      // Create storage of type "bryan" with memory as substorage
      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {type: "memory"}
      });

      jio.put("bar", {"title": "foo"})

        // Put two unique attachments in the document
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob",
            new Blob(["text data"], {type: "text/plain"})
          );
        })
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob2",
            new Blob(["more text data"], {type: "text/plain"})
          );
        })

        // Get metadata for document
        .push(function () {return jio.get("bar"); })

        // Verify "_revision" is incremented twice
        .push(function (result) {
          deepEqual(result, {
            "title": "foo",
            "_revision": 2
          }, "Check document after 2 revisions");
        })
        .fail(function (error) {ok(false, error); })
        .always(function () {start(); });
    }
    );

  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with removeAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with removeAttachment");
  test("verifying _revision updates correctly after removeAttachment",
    function () {
      stop();
      expect(1);

      // create storage of type "bryan" with memory as substorage
      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {type: "memory"}
      });

      jio.put("bar", {"title": "foo"})
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob",
            new Blob(["text data"], {type: "text/plain"})
          );
        })
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob2",
            new Blob(["more text data"], {type: "text/plain"})
          );
        })
        .push(function () {return jio.removeAttachment("bar", "blob"); })
        .push(function () {return jio.removeAttachment("bar", "blob2"); })
        .push(function () {return jio.get("bar"); })
        .push(function (result) {
          deepEqual(result, {
            "title": "foo",
            "_revision": 4
          }, "Check document after 4 revisions");
        })
        .fail(function (error) {ok(false, error); })
        .always(function () {start(); });
    }
    );

  /////////////////////////////////////////////////////////////////
  // bryanStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    jio.allAttachments("bar")
      .push(function (result) {
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
  // bryanStorage.post
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    jio.post({"title": "foo"})
      .push(function (result) {
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
  // bryanStorage.put
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    // If .put does not give the appropriate return, fail assertion
    jio.put("bar", {"title": "foo"})
      .push(function (result) {
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
  // bryanStorage.remove
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    jio.remove("bar")
      .push(function (result) {
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
  // bryanStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    }),
      blob = new Blob([""]);

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
  // bryanStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    }),
      blob = new Blob([""]);

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
  // bryanStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

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
  // bryanStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.hasCapacity");
  test("hasCapacity is false by default", function () {
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'foo' is not implemented on 'bryan'");
        return true;
      }
    );
  });

  test("hasCapacity list return substorage value", function () {
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
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
              "Capacity 'list' is not implemented on 'memory'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // bryanStorage.buildbryan
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.buildbryan");

  test("substorage should have 'list' capacity", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    jio.allDocs({
      include_docs: true,
      bryan: 'title: "two"'
    })
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'list' is not implemented on 'memory'");
      })
      .always(function () {
        start();
      });
  });

  test("no manual bryan if substorage handle everything", function () {
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
          (capacity === "bryan")) {
        return true;
      }
      throw new Error("Unexpected " + capacity + " capacity check");
    };
    StorageAllDocsNoGet.prototype.buildbryan = function (options) {
      deepEqual(options, {
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        bryan: 'title: "two"'
      },
                "buildbryan called");
      return "taboulet";
    };

    jIO.addStorage('bryanStoragealldocsnoget', StorageAllDocsNoGet);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "bryanStoragealldocsnoget"
      }
    });

    jio.allDocs({
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      bryan: 'title: "two"'
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

  test("manual bryan used if substorage does not handle sort", function () {
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
          (capacity === "bryan")) {
        return true;
      }
      return false;
    };
    StorageNoSortCapacity.prototype.buildbryan = function (options) {
      deepEqual(options, {}, "No bryan parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('bryanStoragenosortcapacity', StorageNoSortCapacity);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "bryanStoragenosortcapacity"
      }
    });

    jio.allDocs({
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      bryan: 'title: "foo"'
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

  test("manual bryan used if substorage does not handle select", function () {
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
          (capacity === "bryan")) {
        return true;
      }
      return false;
    };
    StorageNoSelectCapacity.prototype.buildbryan = function (options) {
      deepEqual(options, {}, "No bryan parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('bryanStoragenoselectcapacity', StorageNoSelectCapacity);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "bryanStoragenoselectcapacity"
      }
    });

    jio.allDocs({
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      bryan: 'title: "foo"'
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

  test("manual bryan used if substorage does not handle limit", function () {
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
          (capacity === "bryan")) {
        return true;
      }
      return false;
    };
    StorageNoLimitCapacity.prototype.buildbryan = function (options) {
      deepEqual(options, {}, "No bryan parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('bryanStoragenolimitcapacity', StorageNoLimitCapacity);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "bryanStoragenolimitcapacity"
      }
    });

    jio.allDocs({
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      bryan: 'title: "foo"'
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

  test("manual bryan used if substorage does not handle bryan", function () {
    stop();
    expect(4);

    function StorageNobryanCapacity() {
      return this;
    }
    StorageNobryanCapacity.prototype.get = function (id) {
      if (id === "foo") {
        equal(id, "foo", "Get foo");
      } else {
        equal(id, "bar", "Get bar");
      }
      return {title: id, id: "ID " + id,
              "another": "property"};
    };
    StorageNobryanCapacity.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list") ||
          (capacity === "select") ||
          (capacity === "limit") ||
          (capacity === "sort")) {
        return true;
      }
      return false;
    };
    StorageNobryanCapacity.prototype.buildbryan = function (options) {
      deepEqual(options, {}, "No bryan parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage('bryanStoragenobryancapacity', StorageNobryanCapacity);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "bryanStoragenobryancapacity"
      }
    });

    jio.allDocs({
      sort_on: [["title", "ascending"]],
      limit: [0, 5],
      select_list: ["title", "id"],
      bryan: 'title: "foo"'
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
      StorageIncludeDocsCapacity.prototype.buildbryan = function (options) {
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

      jIO.addStorage('bryanStorageincludedocscapacity',
                     StorageIncludeDocsCapacity);

      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {
          type: "bryanStorageincludedocscapacity"
        }
      });

      jio.allDocs({
        sort_on: [["title", "ascending"]],
        limit: [0, 5],
        select_list: ["title", "id"],
        bryan: 'title: "foo"'
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

  test("manual bryan used and use schema", function () {
    stop();
    expect(4);

    function StorageSchemaCapacity() {
      return this;
    }
    StorageSchemaCapacity.prototype.get = function (id) {
      var doc = {
        title: id,
        id: "ID " + id,
        "another": "property"
      };
      if (id === "foo") {
        equal(id, "foo", "Get foo");
        doc.modification_date = "Fri, 08 Sep 2017 07:46:27 +0000";
      } else {
        equal(id, "bar", "Get bar");
        doc.modification_date = "Thu, 07 Sep 2017 18:59:23 +0000";
      }
      return doc;
    };

    StorageSchemaCapacity.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list")) {
        return true;
      }
      return false;
    };
    StorageSchemaCapacity.prototype.buildbryan = function (options) {
      deepEqual(options, {}, "No bryan parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage(
      'bryanStoragenoschemacapacity',
      StorageSchemaCapacity
    );

    var jio = jIO.createJIO({
      type: "bryan",
      schema: {
        "modification_date": {
          "type": "string",
          "format": "date-time"
        }
      },
      sub_storage: {
        type: "bryanStoragenoschemacapacity"
      }
    });

    jio.allDocs({
      sort_on: [["modification_date", "descending"]],
      limit: [0, 5],
      select_list: ['modification_date']
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [
              {
                id: "foo",
                doc: {},
                value: {
                  modification_date: "Fri, 08 Sep 2017 07:46:27 +0000"
                }
              }, {
                id: "bar",
                doc: {},
                value: {
                  modification_date: "Thu, 07 Sep 2017 18:59:23 +0000"
                }
              }
            ],
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
  // bryanStorage.repair
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.repair");
  test("repair called substorage repair", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    }),
      expected_options = {foo: "bar"};

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
