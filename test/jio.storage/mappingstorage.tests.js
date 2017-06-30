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
    deepEqual(jio.__storage._attachment_mapping_dict, {});
    deepEqual(jio.__storage._query, {});
    equal(jio.__storage._map_all_property, true);

  });

  test("accept parameters", function () {
    var jio = jIO.createJIO({
      type: "mapping",
      map_all_property: false,
      query: {"query": 'foo: "bar"'},
      attachment: {"foo": {"get": "bar"}},
      property: { "bar": ["equalSubProperty", "foo"]},
      id: ["equalSubProperty", "otherId"],
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    deepEqual(
      jio.__storage._mapping_dict,
      {"bar": ["equalSubProperty", "foo"], "otherId": ["keep"]}
    );
    deepEqual(jio.__storage._map_id, ["equalSubProperty", "otherId"]);
    equal(jio.__storage._query.query.key, "foo");
    equal(jio.__storage._query.query.value, "bar");
    equal(jio.__storage._query.query.type, "simple");
    deepEqual(jio.__storage._attachment_mapping_dict, {"foo": {"get": "bar"}});
    equal(jio.__storage._map_all_property, false);

  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.get 
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.get");
  test("called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {"title": ["equalSubProperty", "title"]},
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.get = function (id) {
      equal(id, "bar", "get 2713 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .push(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with query and id equalSubProperty", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", 'otherId'],
      query: {"query": 'otherTitle: "foo"'},
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (options) {
      equal(
        options.query,
        '( otherId:  "42" AND otherTitle:  "foo" )',
        "allDoc 2713 called"
      );
      return [{id: "2713"}];
    };

    Storage2713.prototype.get = function (id) {
      equal(id, "2713", "get 2713 called");
      return {"title": "foo", "otherId": "42"};
    };

    jio.get("42")
      .push(function (result) {
        deepEqual(result, {
          "title": "foo",
          "otherId": "42"
        });
      }).push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with id equalSubProperty", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (options) {
      equal(options.query, 'otherId:  "42"', "allDoc 2713 called");
      return [{id: "2713"}];
    };

    Storage2713.prototype.get = function (id) {
      equal(id, "2713", "get 2713 called");
      return {"title": "foo", "otherId": "42"};
    };

    jio.get("42")
      .push(function (result) {
        deepEqual(result, {
          "title": "foo",
          "otherId": "42"
        });
      }).push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with prop equalSubProperty", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {
        "title": ["equalSubProperty", "otherTitle"]
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.get = function (id) {
      equal(id, "bar", "get 2713 called");
      return {otherTitle: "foo"};
    };

    jio.get("bar")
      .push(function (result) {
        deepEqual(result, {
          "title": "foo"
        });
      }).push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with prop equalSubId", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {"title": ["equalSubId"]},
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.get = function (id) {
      equal(id, "bar", "get 2713 called");
      return {};
    };

    jio.get("bar")
      .push(function (result) {
        deepEqual(result, {
          "title": "bar"
        });
      }).push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  test("with prop ignore", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {
        "title": ["ignore"]
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.get = function (id) {
      equal(id, "bar", "get 2713 called");
      return {"title": "foo", "foo": "bar"};
    };

    jio.get("bar")
      .push(function (result) {
        deepEqual(result, {
          "foo": "bar"
        });
      }).push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with switchPropertyValue", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {
        "title": ["switchPropertyValue", [
          "subTitle",
          {"mytitle": "title", "yourtitle": "othertitle"}
        ]],
        "subTitle": ["ignore"]
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.get = function (id) {
      equal(id, "bar", "get 2713 called");
      return {"subTitle": "title"};
    };

    jio.get("bar")
      .push(function (result) {
        deepEqual(result, {
          "title": "mytitle"
        });
      }).push(undefined, function (error) {
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

  test("substorage put called", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {
        "title": ["equalSubProperty", "title"]
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.put = function (id, param) {
      equal(id, "bar", "put 2713 called");
      deepEqual(param, {"title": "foo"}, "put 2713 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
      .push(function (result) {
        equal(result, "bar");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with id equalSubProperty", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.post = function (doc) {
      deepEqual(doc,
        {"otherId": "42", "title": "foo"}, "post 2713 called");
      return "bar";
    };

    Storage2713.prototype.buildQuery = function (option) {
      equal(option.query, 'otherId:  "42"', "allDocs 2713 called");
      return [];
    };

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    jio.put("42", {"title": "foo"})
      .push(function (result) {
        equal(result, "42");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with id equalSubProperty and prop equalSubId", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      property: {
        "title": ["equalSubId"]
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.put = function (id, doc) {
      deepEqual(doc,
        {"otherId": "42", "title": "bar"}, "post 2713 called");
      equal(id, "bar");
      return "bar";
    };

    jio.put("42", {"title": "bar"})
      .push(function (result) {
        equal(result, "42");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with prop equalSubId", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {"title": ["equalSubId"]},
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.put = function (id, param) {
      equal(id, "2713", "put 2713 called");
      deepEqual(param, {"foo": "bar", "title": "2713"}, "put 2713 called");
      return id;
    };

    jio.put("bar", {"title": "2713", "foo": "bar"})
      .push(function (result) {
        equal(result, "bar");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with prop equalSubProperty", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {"title": ["equalSubProperty", "subTitle"]},
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.put = function (id, param) {
      equal(id, "bar", "put 2713 called");
      deepEqual(param, {"subTitle": "foo"}, "put 2713 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
      .push(function (result) {
        equal(result, "bar");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with prop equalValues", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {"title": ["equalValue", "foobar"]},
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.put = function (id, param) {
      equal(id, "bar", "put 2713 called");
      deepEqual(param, {"title": "foobar"}, "put 2713 called");
      return id;
    };

    jio.put("bar", {})
      .push(function (result) {
        equal(result, "bar");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  test("with switchPropertyValue", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {
        "title": ["switchPropertyValue", [
          "subTitle",
          {"mytitle": "title", "yourtitle": "othertitle"}
        ]]
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.put = function (id, doc) {
      equal(id, "bar", "put 2713 called");
      deepEqual(doc, {"subTitle": "title"}, "put 2713 called");
      return id;
    };

    jio.put("bar", {"title": "mytitle"})
      .push(function (result) {
        equal(result, "bar");
      }).push(undefined, function (error) {
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

  test("with substorage remove", function () {
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
      .push(function (result) {
        equal(result, "bar");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with id mapped", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (options) {
      equal(options.query, 'otherId:  "42"', "allDoc 2713 called");
      return [{id: "2713"}];
    };

    Storage2713.prototype.remove = function (id) {
      equal(id, "2713", "get 2713 called");
      return "foo";
    };

    jio.remove("42")
      .push(function (result) {
        equal(result, "42");
      }).push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.post 
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.post");

  test("with id equalSubProperty, no id in doc", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.post = function () {
      return false;
    };

    jio.post({"title": "foo"})
      .push(undefined, function (error) {
        equal(error.message, "post is not supported with id mapped");
        equal(error.status_code, 400);
      })
      .always(function () {
        start();
      });
  });

  test("with id equalSubProperty and id in doc", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.buildQuery = function (options) {
      equal(options.query, 'otherId:  "bar"', "allDoc 2713 called");
      return [];
    };

    Storage2713.prototype.post = function (doc) {
      deepEqual(doc, {"title": "foo", "otherId": "bar"}, "post 2713 called");
      return "bar";
    };

    Storage2713.prototype.put = function (id, doc) {
      equal(id, "bar", "put 2713 called");
      deepEqual(doc, {
        "title": "foo",
        "otherId": "bar"
      }, "put 2713 called");
      return "bar";
    };

    jio.post({"title": "foo", "otherId": "bar"})
      .push(function (result) {
        equal(result, "bar");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with equalSubId and id in doc", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      property: {"otherId": ["equalSubId"]},
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.put = function (id, doc) {
      deepEqual(doc, {"title": "foo", "otherId": "bar"}, "put 2713 called");
      equal(id, "bar", "put 2713 called");
      return "bar";
    };

    jio.post({"title": "foo", "otherId": "bar"})
      .push(function (result) {
        equal(result, "bar");
      })
      .push(undefined, function (error) {
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

  test("sub_storage putAttachment called", function () {
    stop();
    expect(4);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    }), blob = new Blob([""]);

    Storage2713.prototype.putAttachment = function (doc_id,
      attachment_id, attachment) {
      equal(doc_id, "42", "putAttachment 2713 called");
      equal(attachment_id, "2713", "putAttachment 2713 called");
      deepEqual(attachment, blob, "putAttachment 2713 called");
      return doc_id;
    };

    jio.putAttachment("42", "2713", blob)
      .push(function (result) {
        equal(result, "2713");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with UriTemplate", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "mapping",
      attachment: {
        "2713": {"put": {"uri_template": "www.2713.foo/{id}"}}
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    }), blob = new Blob([""]);

    Storage2713.prototype.putAttachment = function (doc_id,
      attachment_id, attachment) {
      equal(doc_id, "42", "putAttachment 2713 called");
      equal(attachment_id, "www.2713.foo/42", "putAttachment 2713 called");
      deepEqual(attachment, blob, "putAttachment 2713 called");
      return doc_id;
    };

    jio.putAttachment("42", "2713", blob)
      .push(function (result) {
        equal(result, "2713");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with UriTemplate and id equalSubProperty", function () {
    stop();
    expect(5);
    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      attachment: {
        "2713": {"put": {"uri_template": "www.2713.foo/{id}"}}
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    }), blob = new Blob([""]);

    Storage2713.prototype.putAttachment = function (id,
      attachment_id, attachment) {
      equal(id, "13", "putAttachment 2713 called");
      equal(attachment_id, "www.2713.foo/13", "putAttachment 2713 called");
      deepEqual(attachment, blob, "putAttachment 2713 called");
      return id;
    };

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (option) {
      equal(option.query, 'otherId:  "42"');
      return [{"id": "13"}];
    };

    jio.putAttachment("42", "2713", blob)
      .push(function (result) {
        equal(result, "2713");
      })
      .push(undefined, function (error) {
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
  test("sub_storage getAttachment called", function () {
    stop();
    expect(3);
    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    }), blob = new Blob([""]);

    Storage2713.prototype.getAttachment = function (doc_id, attachment) {
      equal(doc_id, "42", "getAttachment 2713 called");
      equal(attachment, "2713", "getAttachment 2713 called");
      return blob;
    };

    jio.getAttachment("42", "2713")
      .push(function (result) {
        deepEqual(result, blob);
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with UriTemplate", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      attachment: {
        "2713": {"get": {"uri_template": "www.2713/{id}/ok.com"}}
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    }), blob = new Blob([""]);

    Storage2713.prototype.getAttachment = function (doc_id, attachment) {
      equal(attachment, "www.2713/42/ok.com", "getAttachment 2713 called");
      equal(doc_id, "42", "getAttachment 2713 called");
      return blob;
    };

    jio.getAttachment("42", "2713")
      .push(function (result) {
        deepEqual(result, blob);
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with UriTemplate and id mapped", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      attachment: {
        "2713": {"get": {"uri_template": "www.2713.foo/{id}"}}
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    }), blob = new Blob([""]);

    Storage2713.prototype.getAttachment = function (id,
      attachment_id) {
      equal(id, "13", "getAttachment 2713 called");
      equal(attachment_id, "www.2713.foo/13", "getAttachment 2713 called");
      return blob;
    };

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (option) {
      equal(option.query, 'otherId:  "42"');
      return [{"id": "13"}];
    };

    jio.getAttachment("42", "2713")
      .push(function (result) {
        deepEqual(result, blob);
      })
      .push(undefined, function (error) {
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
  test("sub_storage removeAttachment called", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.removeAttachment = function (doc_id, attachment) {
      equal(doc_id, "42", "removeAttachment 2713 called");
      equal(attachment, "2713", "getAttachment 2713 called");
      return doc_id;
    };

    jio.removeAttachment("42", "2713")
      .push(function (result) {
        deepEqual(result, "2713");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with use UriTemplate", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "mapping",
      attachment: {
        "2713": {"remove": {"uri_template": "www.2713/{id}.bar"}}
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.removeAttachment = function (doc_id, attachment) {
      equal(doc_id, "42", "removeAttachment 2713 called");
      equal(attachment, "www.2713/42.bar", "removeAttachment 2713 called");
      return doc_id;
    };

    jio.removeAttachment("42", "2713")
      .push(function (result) {
        deepEqual(result, "2713");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with UriTemplate and id equalSubProperty", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      attachment: {
        "2713": {"remove": {"uri_template": "www.2713.foo/{id}"}}
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.removeAttachment = function (id,
      attachment_id) {
      equal(id, "13", "removeAttachment 2713 called");
      equal(attachment_id, "www.2713.foo/13", "removeAttachment 2713 called");
      return id;
    };

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (option) {
      equal(option.query, 'otherId:  "42"');
      return [{"id": "13"}];
    };

    jio.removeAttachment("42", "2713")
      .push(function (result) {
        equal(result, "2713");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.allAttachments");
  test("sub_storage allAttachments called", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.allAttachments = function (doc_id) {
      equal(doc_id, "42", "allAttachments 2713 called");
      return {};
    };

    jio.allAttachments("42")
      .push(function (result) {
        deepEqual(result, {});
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("with UriTemplate", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      attachment: {
        "2713": {"get": {"uri_template": "www.2713.bar"}}
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.allAttachments = function (doc_id) {
      equal(doc_id, "42", "allAttachments 2713 called");
      return {"www.2713.bar": {}};
    };

    jio.allAttachments("42")
      .push(function (result) {
        deepEqual(result, {"2713": {}});
      })
      .push(undefined, function (error) {
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
  test("with complex query", function () {
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
      }
    });

    jio.put("42", {"title": "foo", "smth": "bar"})
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

  test("with complex query, id and prop equalSubProperty", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      property: {
        "title": ["equalSubProperty", "otherTitle"],
        "smth": ["equalSubProperty", "otherSmth"]
      },
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      }
    });

    jio.put("42",
      {
        "title": "foo",
        "smth": "bar"
      })
      .push(function () {
        return jio.put(
          "2713",
          {
            "title": "bar",
            "smth": "foo"
          }
        );
      })
      .push(function () {
        return jio.allDocs({
          query: '(title: "foo") OR (title: "bar")',
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
                    "smth": "bar",
                    "otherId": "42"
                  },
                  "doc": {}
                },
                {
                  "id": "2713",
                  "value": {
                    "title": "bar",
                    "smth": "foo",
                    "otherId": "2713"
                  },
                  "doc": {}
                }
              ],
              "total_rows": 2
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

  test("without option, id and prop equalSubProperty", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      property: {
        "title": ["equalSubProperty", "otherTitle"]
      },
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
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
                  "value": {
                    "otherId": "42"
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

  test("with id and prop equalSubProperty", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      property: {
        "title": ["equalSubProperty", "otherTitle"]
      },
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      }
    });

    jio.put("42",
      {
        "title": "foo",
        "smth": "bar"
      })
      .push(function () {
        return jio.allDocs({
          query: 'title: "foo"',
          select_list: ["title", "smth"]
        });
      })
      .push(function (result) {
        deepEqual(result,
          {
            "data": {
              "rows": [
                {
                  "id": "42",
                  "value": {"title": "foo", "smth": "bar", "otherId": "42"},
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

  test("with id and prop equalSubProperty and query", function () {
    stop();
    expect(1);

    var jio = jIO.createJIO({
      type: "mapping",
      query: {"query": 'otherId: "42"'},
      id: ["equalSubProperty", "otherId"],
      property: {
        "title": ["equalSubProperty", "otherTitle"]
      },
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      }
    });

    jio.put("42",
      {
        "title": "foo",
        "smth": "bar"
      })
      .push(function () {
        return jio.allDocs({
          query: 'title: "foo"',
          select_list: ["title"]
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
                    "otherId": "42",
                    "title": "foo"
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

  /////////////////////////////////////////////////////////////////
  // mappingStorage.bulk
  /////////////////////////////////////////////////////////////////
  module("mappingstorage.bulk");
  test("with id and prop equalSubProperty", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      id: ["equalSubProperty", "otherId"],
      property: {
        "title": ["equalSubProperty", "otherTitle"]
      },
      sub_storage: {
        type: "mappingstorage2713"
      }
    });

    Storage2713.prototype.hasCapacity = function () {
      return true;
    };

    Storage2713.prototype.buildQuery = function (option) {
      if (option.query === 'otherId:  "id1"') {
        return [{id: "foo"}];
      }
      if (option.query === 'otherId:  "id2"') {
        return [{id: "bar"}];
      }
      throw new Error("invalid option:" + option.toString());
    };

    Storage2713.prototype.bulk = function (args) {
      deepEqual(
        args,
        [{
          method: "get",
          parameter_list: ["foo"]
        }, {
          method: "get",
          parameter_list: ["bar"]
        }],
        "bulk 2713 called"
      );
      return [
        {
          "otherId": "foo",
          "otherTitle": "bar",
          "bar": "foo"
        }, {
          "otherId": "bar",
          "otherTitle": "foo",
          "foo": "bar"
        }
      ];
    };

    jio.bulk([{
      method: "get",
      parameter_list: ["id1"]
    }, {
      method: "get",
      parameter_list: ["id2"]
    }])
      .push(function (result) {
        deepEqual(
          result,
          [{
            "title": "bar",
            "otherId": "foo",
            "bar": "foo"
          }, {
            "title": "foo",
            "otherId": "bar",
            "foo": "bar"
          }],
          "bulk test"
        );
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // mappingStorage.repair
  /////////////////////////////////////////////////////////////////
  module("mappingStorage.repair");

  test("substorage repair called", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "mapping",
      sub_storage: {
        type: "mappingstorage2713"
      },
      property: {
        "title": ["equalSubProperty", "title"]
      }
    });

    Storage2713.prototype.repair = function (id_list) {
      deepEqual(id_list, ["foo", "bar"], "repair 2713 called");
      return "foobar";
    };

    jio.repair(["foo", "bar"])
      .push(function (result) {
        equal(result, "foobar", "Check repair");
      })
      .push(undefined, function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));