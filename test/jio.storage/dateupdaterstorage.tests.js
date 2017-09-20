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
    throws = QUnit.throws,
    big_string = "",
    j;

  for (j = 0; j < 30; j += 1) {
    big_string += "a";
  }

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('dateupdaterstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // dateupdaterStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "dateupdaterstorage200");
    deepEqual(jio.__storage._property_list, []);
  });

  test("accept parameters", function () {
    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      },
      property_list: ['date']
    });
    deepEqual(jio.__storage._property_list, ['date']);
  });

  /////////////////////////////////////////////////////////////////
  // dateupdaterStorage.get
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
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
  // dateupdaterStorage.post
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      }
    });

    Storage200.prototype.post = function (param) {
      deepEqual(param, {title: "bar"}, "post 200 called");
      return "foo";
    };

    jio.post({title: "bar"})
      .then(function (result) {
        equal(result, "foo", "Check id");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("post update date", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      },
      property_list: ['date']
    }),
      date = new Date().toUTCString().replace('GMT', '+0000');

    Storage200.prototype.post = function (param) {
      deepEqual(param, {"title": "bar", "date": date}, "post 200 called");
      return "foo";
    };

    jio.post({title: "bar"})
      .then(function (result) {
        equal(result, "foo", "Check id");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // dateupdaterStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
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
              "Capacity 'foo' is not implemented on 'dateupdaterstorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // dateupdaterStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
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
        query: 'title: "two"'
      }, "allDocs parameter");
      return "bar";
    };

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

  /////////////////////////////////////////////////////////////////
  // dateupdaterStorage.put
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
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

  test("put update date", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      },
      property_list: ['date']
    }),
      date = new Date().toUTCString().replace('GMT', '+0000');

    Storage200.prototype.put = function (id, doc) {
      deepEqual(doc, {"title": "bar", "date": date}, "post 200 called");
      return id;
    };

    jio.put("foo", {title: "bar"})
      .then(function (result) {
        equal(result, "foo", "Check id");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // dateupdaterStorage.remove
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      }
    });
    Storage200.prototype.remove = function (id) {
      equal(id, "bar", "remove 200 called");
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


  /////////////////////////////////////////////////////////////////
  // dateupdaterStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.getAttachment");
  test("called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      }
    }),
      blob = new Blob([big_string]);

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
  // dateupdaterStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.putAttachment");
  test("called substorage putAttachment", function () {
    stop();
    expect(7);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
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

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {};
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "bar", "put 200 called");
      deepEqual(doc, {}, "put 200 called");
      return id;
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

  test("update date", function () {
    stop();
    expect(7);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      },
      property_list: ['date']
    }),
      blob = new Blob([""]),
      date = new Date().toUTCString().replace('GMT', '+0000');

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "foo", "putAttachment 200 called");
      deepEqual(blob2, blob,
                "putAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {'title': 'foo'};
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "bar", "put 200 called");
      deepEqual(doc, {'title': 'foo', 'date': date}, "put 200 called");
      return id;
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
  // dateupdaterStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(6);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      }
    });

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {};
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "bar", "put 200 called");
      deepEqual(doc, {}, "put 200 called");
      return id;
    };

    jio.removeAttachment("bar", "foo")
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

  test("update date", function () {
    stop();
    expect(6);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
      },
      property_list: ['date']
    }),
      blob = new Blob([""]),
      date = new Date().toUTCString().replace('GMT', '+0000');

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {'title': 'foo'};
    };

    Storage200.prototype.put = function (id, doc) {
      equal(id, "bar", "put 200 called");
      deepEqual(doc, {'title': 'foo', 'date': date}, "put 200 called");
      return id;
    };

    jio.removeAttachment("bar", "foo", blob)
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
  // dateupdaterStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("dateupdaterStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "dateupdater",
      sub_storage: {
        type: "dateupdaterstorage200"
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

}(jIO, QUnit, Blob));