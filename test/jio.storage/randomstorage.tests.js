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
    notEqual = QUnit.notEqual,
    module = QUnit.module,
    throws = QUnit.throws;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('randomstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // randomStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("randomStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "randomstorage200");

  });

  /////////////////////////////////////////////////////////////////
  // randomStorage.get
  /////////////////////////////////////////////////////////////////
  module("randomStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
      }
    });

    Storage200.prototype.get = function (param) {
      equal(param, "bar", "get 200 called");
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
  // randomStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("randomStorage.allAttachments");
  test("get called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
      }
    });

    Storage200.prototype.allAttachments = function (param) {
      equal(param, "bar", "allAttachments 200 called");
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
  // randomStorage.post
  /////////////////////////////////////////////////////////////////
  module("randomStorage.post");
  test("post called substorage put with a new id", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
      }
    });

    Storage200.prototype.post = function (param) {
      deepEqual(param, {"title": "foo"}, "post 200 called");
      return "bar";
    };

    jio.post({"title": "foo"})
      .then(function (result) {
        equal(result, "bar", "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // randomStorage.put
  /////////////////////////////////////////////////////////////////
  module("randomStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
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
  // ranomStorage.remove
  /////////////////////////////////////////////////////////////////
  module("randomStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
      }
    });
    Storage200.prototype.remove = function (param) {
      equal(param, "bar", "remove 200 called");
      return param._id;
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
  // randomStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("randomStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
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
  // randomStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("randomStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "foo", "putAttachment 200 called");
      deepEqual(blob2, blob, "putAttachment 200 called");
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
  // randomStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("randomStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
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
  // randomStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("randomStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
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
              "Capacity 'foo' is not implemented on 'randomstorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // randomStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("randomStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "random",
      sub_storage: {
        type: "randomstorage200"
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        include_docs: false,
        sort_on: [["random", "ascending"]],
        select_list: ["title", "id"]
      }, "allDocs parameter");
      return [{
        id: 'v1',
        value: 'foo'
      }, {
        id: 'v2',
        value: 'bar'
      }, {
        id: 'v3',
        value: 'm3an8'
      }, {
        id: 'v4',
        value: '4m6an'
      }, {
        id: 'v5',
        value: 'ma34n'
      }, {
        id: 'v6',
        value: 'masdn'
      }, {
        id: 'v7',
        value: 'man34'
      }, {
        id: 'v8',
        value: 'ba9r'
      }, {
        id: 'v9',
        value: 'bar54'
      }, {
        id: 'v10',
        value: 'bar45'
      }, {
        id: 'v11',
        value: 'foo5'
      }, {
        id: 'v12',
        value: 'man22'
      }, {
        id: 'v13',
        value: 'man33'
      }, {
        id: 'v14',
        value: 'man2'
      }, {
        id: 'v15',
        value: 'man23'
      }, {
        id: 'v16',
        value: 'man445'
      }, {
        id: 'v17',
        value: 'hhf45'
      }, {
        id: 'v18',
        value: 'hg45'
      }, {
        id: 'v19',
        value: 'foo34'
      }, {
        id: 'v20',
        value: 'man20'
      }];
    };

    jio.buildQuery({
      include_docs: false,
      sort_on: [["random", "ascending"]],
      limit: [0, 20],
      select_list: ["title", "id"]
    })
      .then(function (result) {
        equal(result.length, 20, 'Length of result');
        notEqual(result, [{
          id: 'v1',
          value: 'foo'
        }, {
          id: 'v2',
          value: 'bar'
        }, {
          id: 'v3',
          value: 'm3an8'
        }, {
          id: 'v4',
          value: '4m6an'
        }, {
          id: 'v5',
          value: 'ma34n'
        }, {
          id: 'v6',
          value: 'masdn'
        }, {
          id: 'v7',
          value: 'man34'
        }, {
          id: 'v8',
          value: 'ba9r'
        }, {
          id: 'v9',
          value: 'bar54'
        }, {
          id: 'v10',
          value: 'bar45'
        }, {
          id: 'v11',
          value: 'foo5'
        }, {
          id: 'v12',
          value: 'man22'
        }, {
          id: 'v13',
          value: 'man33'
        }, {
          id: 'v14',
          value: 'man2'
        }, {
          id: 'v15',
          value: 'man23'
        }, {
          id: 'v16',
          value: 'man445'
        }, {
          id: 'v17',
          value: 'hhf45'
        }, {
          id: 'v18',
          value: 'hg45'
        }, {
          id: 'v19',
          value: 'foo34'
        }, {
          id: 'v20',
          value: 'man20'
        }]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
