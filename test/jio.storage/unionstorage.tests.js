/*
 * Copyright 2014, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */
/*global Blob*/
/*jslint nomen: true */
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    start,
    global_assert,
    module = QUnit.module,
    frozen_blob = new Blob(["foobar"]);

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage404() {
    return this;
  }
  function generate404Error(id) {
    global_assert.equal(id, "bar", "get 404 called");
    throw new jIO.util.jIOError("Cannot find document", 404);
  }
  Storage404.prototype.get = generate404Error;
  jIO.addStorage('unionstorage404', Storage404);

  function Storage200() {
    return this;
  }
  Storage200.prototype.get = function (id) {
    global_assert.equal(id, "bar", "get 200 called");
    return {title: "foo"};
  };
  Storage200.prototype.allAttachments = function (id) {
    global_assert.equal(id, "bar", "allAttachments 200 called");
    return {attachmentname: {}};
  };
  Storage200.prototype.getAttachment = function (id, name) {
    global_assert.equal(id, "bar", "getAttachment 200 called");
    global_assert.equal(name, "foo", "getAttachment 200 called");
    return frozen_blob;
  };
  Storage200.prototype.removeAttachment = function (id, name) {
    global_assert.equal(id, "bar", "removeAttachment 200 called");
    global_assert.equal(name, "foo", "removeAttachment 200 called");
    return "deleted";
  };
  Storage200.prototype.putAttachment = function (id, name, blob) {
    global_assert.equal(id, "bar", "putAttachment 200 called");
    global_assert.equal(name, "foo", "putAttachment 200 called");
    global_assert.deepEqual(blob, frozen_blob, "putAttachment 200 called");
    return "stored";
  };
  Storage200.prototype.put = function (id, param) {
    global_assert.equal(id, "bar", "put 200 called");
    global_assert.deepEqual(param, {"title": "foo"}, "put 200 called");
    return id;
  };
  Storage200.prototype.remove = function (id) {
    global_assert.equal(id, "bar", "remove 200 called");
    return id;
  };
  Storage200.prototype.post = function (param) {
    global_assert.deepEqual(param, {"title": "foo"}, "post 200 called");
    return "bar";
  };
  Storage200.prototype.hasCapacity = function () {
    return true;
  };
  Storage200.prototype.buildQuery = function (options) {
    global_assert.deepEqual(options, {query: 'title: "two"'},
              "buildQuery 200 called");
    return [{
      id: 200,
      value: {
        foo: "bar"
      }
    }];
  };
  Storage200.prototype.repair = function (options) {
    global_assert.deepEqual(options, {foo: "bar"}, "repair 200 called");
    return "OK";
  };
  jIO.addStorage('unionstorage200', Storage200);

  function Storage200v2() {
    return this;
  }
  Storage200v2.prototype.hasCapacity = function () {
    return true;
  };
  Storage200v2.prototype.buildQuery = function (options) {
    global_assert.deepEqual(options, {query: 'title: "two"'},
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
    global_assert.ok(true, "Error generation called");
    throw new Error("manually triggered error");
  }
  Storage500.prototype.get = generateError;
  Storage500.prototype.post = generateError;
  Storage500.prototype.repair = generateError;
  jIO.addStorage('unionstorage500', Storage500);

  /////////////////////////////////////////////////////////////////
  // unionStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("unionStorage.constructor");
  test("no storage list", function (assert) {
    var jio = jIO.createJIO({
      type: "union",
      storage_list: []
    });

    assert.deepEqual(jio.__storage._storage_list, []);
  });

  test("initialize storage list", function (assert) {
    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    assert.equal(jio.__storage._storage_list.length, 2);
    assert.ok(jio.__storage._storage_list[0] instanceof jio.constructor);
    assert.equal(jio.__storage._storage_list[0].__type, "unionstorage404");
    assert.ok(jio.__storage._storage_list[1] instanceof jio.constructor);
    assert.equal(jio.__storage._storage_list[1].__type, "unionstorage200");
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.get
  /////////////////////////////////////////////////////////////////
  module("unionStorage.get");
  test("get inexistent document", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.get("bar")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.get("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.get("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get error on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.get("bar")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get error on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.get("bar")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("unionStorage.allAttachments");
  test("allAttachments inexistent document", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.allAttachments("bar")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allAttachments document on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "attachmentname": {}
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allAttachments document on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "attachmentname": {}
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allAttachments error on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.allAttachments("bar")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allAttachments error on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.allAttachments("bar")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.post
  /////////////////////////////////////////////////////////////////
  module("unionStorage.post");
  test("post generate an error", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.post({"title": "foo"})
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("post store on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.post({"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.put
  /////////////////////////////////////////////////////////////////
  module("unionStorage.put");
  test("put generate an error", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.put("bar", {"title": "foo"})
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put create on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    function StoragePut404() {
      return this;
    }
    function generatePut404Error(id) {
      assert.equal(id, "bar", "get Put404 called");
      throw new jIO.util.jIOError("Cannot find document", 404);
    }
    StoragePut404.prototype.get = generatePut404Error;
    StoragePut404.prototype.put = function (id, param) {
      assert.equal(id, "bar", "put 404 called");
      assert.deepEqual(param, {"title": "foo"}, "put 404 called");
      return id;
    };
    jIO.addStorage('unionstorageput404', StoragePut404);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorageput404"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.remove
  /////////////////////////////////////////////////////////////////
  module("unionStorage.remove");
  test("remove generate an error", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.remove("bar")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.remove("bar")
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.remove("bar")
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("unionStorage.hasCapacity");
  test("Supported capacity without storage", function (assert) {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: []
    });

    assert.ok(jio.hasCapacity("list"));
    assert.ok(jio.hasCapacity("query"));
    assert.ok(jio.hasCapacity("select"));
  });

  test("hasCapacity list not implemented in substorage", function (assert) {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
      }]
    });

    assert.throws(
      function () {
        jio.hasCapacity("list");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'list' is not implemented on 'unionstorage404'");
        return true;
      }
    );
  });

  test("hasCapacity list implemented in substorage", function (assert) {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage200"
      }]
    });

    assert.ok(jio.hasCapacity("list"));
  });

  test("hasCapacity sort not manually done in union", function (assert) {

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage200"
      }]
    });

    assert.throws(
      function () {
        jio.hasCapacity("sort");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
                     "Capacity 'sort' is not implemented on 'union'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.allDocs
  /////////////////////////////////////////////////////////////////
  module("unionStorage.allDocs");
  test("allDocs remove duplicated keys", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(3);

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
        assert.deepEqual(result, {
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
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allDocs concatenates results", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(3);

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
        assert.deepEqual(result, {
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
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allDocs fails in one substorage fails", function (assert) {
    start = assert.async();
    assert.expect(3);

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
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
              "Capacity 'list' is not implemented on 'unionstorage500'");
        assert.equal(error.status_code, 501);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.repair
  /////////////////////////////////////////////////////////////////
  module("unionStorage.repair");
  test("repair called substorage repair", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.repair({foo: "bar"})
      .then(function (result) {
        assert.deepEqual(result, ["OK", "OK"]);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("repair fails in one substorage fails", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.repair({foo: "bar"})
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("unionStorage.getAttachment");
  test("getAttachment inexistent document", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.getAttachment("bar", "foo")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment document on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        assert.deepEqual(result, frozen_blob, "Check Blob");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment document on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        assert.deepEqual(result, frozen_blob, "Check Blob");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment error on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.getAttachment("bar", "foo")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment error on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.getAttachment("bar", "foo")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("unionStorage.removeAttachment");
  test("removeAttachment inexistent document", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.removeAttachment("bar", "foo")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment document on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.removeAttachment("bar", "foo")
      .then(function (result) {
        assert.equal(result, "deleted", "Check result");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment document on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.removeAttachment("bar", "foo")
      .then(function (result) {
        assert.equal(result, "deleted", "Check result");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment error on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.removeAttachment("bar", "foo")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment error on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.removeAttachment("bar", "foo")
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // unionStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("unionStorage.putAttachment");
  test("putAttachment inexistent document", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.putAttachment("bar", "foo", frozen_blob)
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment document on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage200"
      }, {
        type: "unionstorage404"
      }]
    });

    jio.putAttachment("bar", "foo", frozen_blob)
      .then(function (result) {
        assert.equal(result, "stored", "Check result");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment document on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(6);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.putAttachment("bar", "foo", frozen_blob)
      .then(function (result) {
        assert.equal(result, "stored", "Check result");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment error on first storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage500"
      }, {
        type: "unionstorage200"
      }]
    });

    jio.putAttachment("bar", "foo", frozen_blob)
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment error on second storage", function (assert) {
    global_assert = assert;
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "union",
      storage_list: [{
        type: "unionstorage404"
      }, {
        type: "unionstorage500"
      }]
    });

    jio.putAttachment("bar", "foo", frozen_blob)
      .fail(function (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "manually triggered error");
        assert.equal(error.status_code, undefined);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
