/*jslint indent:2, maxlen: 80, nomen: true */
/*global jIO, QUnit, Blob*/
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
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage2713() {
    return this;
  }
  jIO.addStorage('mappingstorage2713', Storage2713);

  /////////////////////////////////////////////////////////////////
  // mappingStorage.constructor 
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.constructor");

  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "mappingstorage2713");
    deepEqual(jio.__storage._mapping_dict, {});
    deepEqual(jio.__storage._default_dict, {});
  });

  test("accept parameters", function () {
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: { "bar": {"equal": "foo"}},
      default_dict: { "foo": {"equal": "bar"}}
    });

    deepEqual(jio.__storage._mapping_dict, {"bar": {"equal": "foo"}});
    deepEqual(jio.__storage._default_dict, {"foo": {"equal": "bar"}});
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.get 
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.get");

  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: {"title": {"equal": "title"}}
    });

    Storage2713.prototype.get = function (id) {
      equal(id, "bar", "get 2713 called");
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

  test("get with props mapped", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: {"title": {"equal": "otherTitle"}}
    });

    Storage2713.prototype.get = function (id) {
      equal(id, "bar", "get 2713 called");
      return {otherTitle: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        });
      }).fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get with id and props mapped", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: {
        "title": {"equal": "otherTitle"},
        "id": {"equal": "otherId"}
      }
    });

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (options) {
      deepEqual(options, {query: 'otherId: "42"'}, "allDoc 2713 called");
      return [{id: "2713"}];
    };

    Storage2713.prototype.get = function (id) {
      equal(id, "2713", "get 2713 called");
      return {"otherTitle": "foo"};
    };

    jio.get("42")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        });
      }).fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get with id mapped and query_limit", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: {
        "title": {"equal": "otherTitle"},
        "id": {"equal": "otherId", "query_limit": 'otherTitle: "foo"'}
      }
    });

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (options) {
      deepEqual(
        options,
        {query: 'otherId: "42" AND otherTitle: "foo"'},
        "allDoc 2713 called"
      );
      return [{id: "2713"}];
    };

    Storage2713.prototype.get = function (id) {
      equal(id, "2713", "get 2713 called");
      return {"otherTitle": "foo"};
    };

    jio.get("42")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        });
      }).fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.put 
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.put");

  test("put with substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: {"title": {"equal": "title"}}
    });

    Storage2713.prototype.put = function (id, param) {
      equal(id, "bar", "put 2713 called");
      deepEqual(param, {"title": "foo"}, "put 2713 called");
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

  test("put with default values", function () {
    stop();
    expect(3);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      default_dict: {"title": {"equal": "foobar"}}
    });

    Storage2713.prototype.put = function (id, param) {
      equal(id, "bar", "put 2713 called");
      deepEqual(param, {"title": "foobar"}, "put 2713 called");
      return id;
    };

    jio.put("bar", {})
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

  test("put with id and prop mapped", function () {
    stop();
    expect(3);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: {
        "title": {"equal": "otherTitle"},
        "id": {"equal": "otherId"}
      }
    });

    Storage2713.prototype.post = function (doc) {
      deepEqual(doc,
        {"otherId": "42", "otherTitle": "foo"}, "post 2713 called");
      return "bar";
    };

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (option) {
      deepEqual(option, {"query": 'otherId: "42"'}, "allDocs 2713 called");
      return [];
    };

    jio.put("42", {"title": "foo"})
      .then(function (result) {
        equal(result, "42");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.remove 
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.remove");

  test("remove with substorage remove", function () {
    stop();
    expect(2);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    });
    Storage2713.prototype.remove = function (id) {
      equal(id, "bar", "remove 2713 called");
      return id;
    };

    jio.remove("bar", {"title": "foo"})
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

  test("remove with id mapped", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      mapping_dict: {
        "id": {"equal": "otherId"}
      }
    });

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (options) {
      deepEqual(options, {query: 'otherId: "42"'}, "allDoc 2713 called");
      return [{id: "2713"}];
    };

    Storage2713.prototype.remove = function (id) {
      equal(id, "2713", "get 2713 called");
      return "foo";
    };

    jio.remove("42")
      .then(function (result) {
        equal(result, "42");
      }).fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.putAttachment");

  test("putAttachment use sub_storage one's", function () {
    stop();
    expect(4);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    }),
      blob = new Blob([""]);
    Storage2713.prototype.putAttachment = function (doc_id,
      attachment_id, attachment) {
      equal(doc_id, "42", "putAttachment 2713 called");
      equal(attachment_id, "2713", "putAttachment 2713 called");
      deepEqual(attachment, blob, "putAttachment 2713 called");
      return doc_id;
    };
    jio.putAttachment("42", "2713", blob)
      .then(function (result) {
        equal(result, "42");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.getAttachment");

  test("getAttachment use sub_storage one's", function () {
    stop();
    expect(3);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    }),
      blob = new Blob([""]);
    Storage2713.prototype.getAttachment = function (doc_id, attachment) {
      equal(doc_id, "42", "getAttachment 2713 called");
      equal(attachment, "2713", "getAttachment 2713 called");
      return blob;
    };
    jio.getAttachment("42", "2713")
      .then(function (result) {
        deepEqual(result, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.removeAttachment");

  test("putAttachment use sub_storage one's", function () {
    stop();
    expect(3);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    });
    Storage2713.prototype.removeAttachment = function (doc_id, attachment) {
      equal(doc_id, "42", "putAttachment 2713 called");
      equal(attachment, "2713", "getAttachment 2713 called");
      return doc_id;
    };
    jio.removeAttachment("42", "2713")
      .then(function (result) {
        deepEqual(result, "42");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.allDocs
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.buildQuery");
  test("allDocs with complex query, id and prop mapped", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      },
      mapping_dict: {
        "id": {"equal": "otherId"},
        "title": {"equal": "otherTitle"},
        "smth": {"equal": "otherSmth"}
      }
    });

    jio.put("42",
      {
        "title": "foo",
        "smth": "bar"
      })
        .push(function () {
        return jio.allDocs({
          query: '(title: "foo") AND (smth: "bar")',
          select_list: ["title", "smth"],
          sort_on: [["title", "descending"]]
        });
      })
        .push(function (result) {
        deepEqual(result,
          {
            "data": {
              "rows": [
                {
                  "id": "42",
                  "value": {
                    "title": "foo",
                    "smth": "bar"
                  },
                  "doc": {}
                }
              ],
              "total_rows": 1
            }
          }, "allDocs check");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allDocs without option, id and prop mapped", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      },
      mapping_dict: {
        "id": {"equal": "otherId"},
        "title": {"equal": "otherTitle"}
      }
    });

    jio.put("42",
      {
        "title": "foo",
        "smth": "bar"
      })
        .push(function () {
        return jio.allDocs();
      })
        .push(function (result) {
        deepEqual(result,
          {
            "data": {
              "rows": [
                {
                  "id": "42",
                  "value": {},
                  "doc": {}
                }
              ],
              "total_rows": 1
            }
          }, "allDocs check");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
}(jIO, QUnit, Blob));