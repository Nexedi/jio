/*
 * Copyright 2015, Nexedi SA
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
/*jslint nomen: true*/
/*global Blob*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    start,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('uuidstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // uuidStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.constructor");
  test("create substorage", function (assert) {
    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });

    assert.ok(jio.__storage._sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._sub_storage.__type, "uuidstorage200");

  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.get
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.get");
  test("get called substorage get", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });

    Storage200.prototype.get = function (param) {
      assert.equal(param, "bar", "get 200 called");
      return {title: "foo"};
    };

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

  /////////////////////////////////////////////////////////////////
  // uuidStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.allAttachments");
  test("get called substorage allAttachments", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });

    Storage200.prototype.allAttachments = function (param) {
      assert.equal(param, "bar", "allAttachments 200 called");
      return {attachmentname: {}};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          attachmentname: {}
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.post
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.post");
  test("post called substorage put with a new id", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    }),
      uuid;

    function isUuid(uuid) {
      var x = "[0-9a-fA-F]";
      if (typeof uuid !== "string") {
        return false;
      }
      return (uuid.match(
        "^" + x + "{8}-" + x + "{4}-" +
          x + "{4}-" + x + "{4}-" + x + "{12}$"
      ) === null ? false : true);
    }

    Storage200.prototype.put = function (id, param) {
      uuid = id;
      assert.deepEqual(param, {"title": "foo"}, "post 200 called");
      return "bar";
    };

    jio.post({"title": "foo"})
      .then(function (result) {
        assert.equal(result, uuid);
        assert.ok(isUuid(uuid), uuid);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.put
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.put");
  test("put called substorage put", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });
    Storage200.prototype.put = function (id, param) {
      assert.equal(id, "bar", "put 200 called");
      assert.deepEqual(param, {"title": "foo"}, "put 200 called");
      return id;
    };

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
  // uuidStorage.remove
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.remove");
  test("remove called substorage remove", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });
    Storage200.prototype.remove = function (param) {
      assert.equal(param, "bar", "remove 200 called");
      return param._id;
    };

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
  // uuidStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      assert.equal(id, "bar", "getAttachment 200 called");
      assert.equal(name, "foo", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        assert.equal(result, blob);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function (assert) {
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      assert.equal(id, "bar", "putAttachment 200 called");
      assert.equal(name, "foo", "putAttachment 200 called");
      assert.deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    jio.putAttachment("bar", "foo", blob)
      .then(function (result) {
        assert.equal(result, "OK");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var jio = jIO.createJIO({
        type: "uuid",
        sub_storage: {
          type: "uuidstorage200"
        }
      });

      Storage200.prototype.removeAttachment = function (id, name) {
        assert.equal(id, "bar", "removeAttachment 200 called");
        assert.equal(name, "foo", "removeAttachment 200 called");
        return "Removed";
      };

      jio.removeAttachment("bar", "foo")
        .then(function (result) {
          assert.equal(result, "Removed");
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.hasCapacity");
  test("hasCapacity return substorage value", function (assert) {
    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });

    delete Storage200.prototype.hasCapacity;

    assert.throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'foo' is not implemented on 'uuidstorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // uuidStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.buildQuery = function (options) {
      assert.deepEqual(options, {
        include_docs: false,
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        uuid: 'title: "two"'
      }, "allDocs parameter");
      return "bar";
    };

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      uuid: 'title: "two"'
    })
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: "bar",
            total_rows: 3
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

  /////////////////////////////////////////////////////////////////
  // uuidStorage.repair
  /////////////////////////////////////////////////////////////////
  module("uuidStorage.repair");
  test("repair called substorage repair", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "uuid",
      sub_storage: {
        type: "uuidstorage200"
      }
    }),
      expected_options = {foo: "bar"};

    Storage200.prototype.repair = function (options) {
      assert.deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

    jio.repair(expected_options)
      .then(function (result) {
        assert.equal(result, "OK");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
