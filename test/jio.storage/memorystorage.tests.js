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
/*jslint nomen: true */
/*global Blob*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    start,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // memoryStorage constructor
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.constructor");

  test("Storage has a memory database", function (assert) {
    var jio = jIO.createJIO({
      "type": "memory"
    });

    assert.equal(jio.__type, "memory");
    assert.deepEqual(jio.__storage._database, {});
  });

  test("Storage's memory database is not shared", function (assert) {
    var jio = jIO.createJIO({
      "type": "memory"
    }),
      jio2 = jIO.createJIO({
        "type": "memory"
      });

    assert.ok(jio.__storage._database !== jio2.__storage._database,
       "Database is not shared");
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.put
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.put", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("put non empty document", function (assert) {
    assert.expect(2);
    start = assert.async();

    var that = this;

    this.jio.put("put1", {"title": "myPut1"})
      .then(function (uuid) {
        assert.equal(uuid, "put1");
        assert.deepEqual(that.jio.__storage._database.put1, {
          attachments: {},
          doc: "{\"title\":\"myPut1\"}"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put when document already exists", function (assert) {
    var id = "put1",
      that = this;
    this.jio.__storage._database[id] = {
      "foo": "bar",
      "attachments": {"foo": "bar"},
      "doc": "foobar"
    };
    assert.expect(2);
    start = assert.async();

    this.jio.put(id, {"title": "myPut2"})
      .then(function (uuid) {
        assert.equal(uuid, "put1");
        assert.deepEqual(that.jio.__storage._database.put1, {
          "foo": "bar",
          "attachments": {"foo": "bar"},
          doc: "{\"title\":\"myPut2\"}"
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
  // memoryStorage.get
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.get", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });

  test("get inexistent document", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.get("inexistent")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError, error);
        assert.equal(error.message, "Cannot find document: inexistent");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document", function (assert) {
    var id = "post1";
    this.jio.__storage._database[id] = {
      "doc": "{\"title\":\"myPost1\"}"
    };
    start = assert.async();
    assert.expect(1);

    this.jio.get(id)
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "myPost1"
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function (assert) {
    var id = "putattmt1";

    this.jio.__storage._database[id] = {
      "doc": "{}",
      "attachments": {
        putattmt2: undefined
      }
    };

    start = assert.async();
    assert.expect(1);

    this.jio.get(id)
      .then(function (result) {
        assert.deepEqual(result, {}, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.allAttachments", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });

  test("get inexistent document", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.allAttachments("inexistent")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError, error);
        assert.equal(error.message, "Cannot find document: inexistent");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("document without attachment", function (assert) {
    var id = "post1";
    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({title: "myPost1"})
    };
    start = assert.async();
    assert.expect(1);

    this.jio.allAttachments(id)
      .then(function (result) {
        assert.deepEqual(result, {}, "Attachments");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("document with attachment", function (assert) {
    var id = "putattmt1";

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({}),
      "attachments": {
        putattmt2: undefined
      }
    };

    start = assert.async();
    assert.expect(1);

    this.jio.allAttachments(id)
      .then(function (result) {
        assert.deepEqual(result, {putattmt2: {}}, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.remove
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.remove", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });

  test("remove document", function (assert) {
    var id = "foo";

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({title: "myPost1"})
    };

    start = assert.async();
    assert.expect(1);

    this.jio.remove("foo")
      .then(function (result) {
        assert.equal(result, "foo");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.getAttachment", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("get attachment from inexistent document", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.getAttachment("inexistent", "a")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find attachment: inexistent , a");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent attachment from document", function (assert) {
    var id = "b";
    start = assert.async();
    assert.expect(3);

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({})
    };

    this.jio.getAttachment(id, "inexistent")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find attachment: b , inexistent");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent attachment from document with other attachments",
       function (assert) {
      var id = "b";
      start = assert.async();
      assert.expect(3);

      this.jio.__storage._database[id] = {
        "doc": JSON.stringify({}),
        attachments: {"foo": "bar"}
      };

      this.jio.getAttachment(id, "inexistent")
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find attachment: b , inexistent");
          assert.equal(error.status_code, 404);
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("get attachment from document", function (assert) {
    var id = "putattmt1",
      attachment = "putattmt2",
      blob = new Blob(["test"], {"type": "x-application/foo"});
    start = assert.async();
    assert.expect(2);

    this.jio.__storage._database[id] = {
      "doc": JSON.stringify({}),
      "attachments": {
        "putattmt2": "data:x-application/foo;base64,dGVzdA=="
      }
    };

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        assert.ok(result instanceof Blob, "Data is Blob");
        assert.deepEqual(result, blob);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  /////////////////////////////////////////////////////////////////
  // memoryStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.putAttachment", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("put an attachment to an inexistent document", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.putAttachment("inexistent", "putattmt2", "")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError, error);
        assert.equal(error.message, "Cannot find document: inexistent");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put an attachment to a document", function (assert) {
    var id = "putattmt1",
      blob = new Blob(["test"], {"type": "x-application/foo"}),
      jio = this.jio;

    jio.__storage._database[id] = {
      "doc": JSON.stringify({"foo": "bar"}),
      "attachments": {}
    };

    start = assert.async();
    assert.expect(1);

    jio.putAttachment(id, "putattmt2", blob)
      .then(function () {
        assert.equal(jio.__storage._database[id].attachments.putattmt2,
              "data:x-application/foo;base64,dGVzdA==");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })

      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.removeAttachment", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("remove an attachment to an inexistent document", function (assert) {
    start = assert.async();
    assert.expect(3);

    this.jio.removeAttachment("inexistent", "removeattmt2")
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError, error);
        assert.equal(error.message, "Cannot find document: inexistent");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove an attachment to a document", function (assert) {
    var id = "removeattmt1",
      jio = this.jio;

    jio.__storage._database[id] = {
      "doc": JSON.stringify({"foo": "bar"}),
      "attachments": {"removeattmt2": "bar"}
    };

    start = assert.async();
    assert.expect(1);

    jio.removeAttachment(id, "removeattmt2")
      .then(function () {
        assert.deepEqual(jio.__storage._database[id].attachments, {});
      })
      .fail(function (error) {
        assert.ok(false, error);
      })

      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.hasCapacity", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });
  test("can list documents", function (assert) {
    assert.ok(this.jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // memoryStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("memoryStorage.buildQuery", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        "type": "memory"
      });
    }
  });

  test("list documents", function (assert) {
    this.jio.__storage._database.foo2 = "bar2";
    this.jio.__storage._database.foo1 = "bar1";

    start = assert.async();
    assert.expect(1);

    this.jio.allDocs()
      .then(function (result) {
        assert.deepEqual(result, {
          "data": {
            "rows": [
              {
                "id": "foo2",
                "value": {}
              },
              {
                "id": "foo1",
                "value": {}
              }
            ],
            "total_rows": 2
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

  test("list documents with include_docs", function (assert) {
    this.jio.__storage._database.foo2 = {doc: "{\"title\":\"bar2\"}"};
    this.jio.__storage._database.foo1 = {doc: "{\"title\":\"bar1\"}"};

    start = assert.async();
    assert.expect(1);

    this.jio.allDocs({include_docs: true})
      .then(function (result) {
        assert.deepEqual(result, {
          "data": {
            "rows": [
              {
                "id": "foo2",
                "value": {},
                "doc": {title: "bar2"}
              },
              {
                "id": "foo1",
                "value": {},
                "doc": {title: "bar1"}
              }
            ],
            "total_rows": 2
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

}(jIO, QUnit, Blob));
