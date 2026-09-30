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
/*global Blob, btoa*/
(function (jIO, QUnit, Blob, btoa) {
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
  jIO.addStorage('documentstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // documentStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("documentStorage.constructor");
  test("create substorage", function (assert) {
    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    assert.ok(jio.__storage._sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._sub_storage.__type, "documentstorage200");
    assert.equal(jio.__storage._repair_attachment, false);

  });

  test("accept parameters", function (assert) {
    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      repair_attachment: true,
      sub_storage: {
        type: "documentstorage200"
      }
    });

    assert.equal(jio.__storage._repair_attachment, true);
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.get
  /////////////////////////////////////////////////////////////////
  module("documentStorage.get");

  test("document without attachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    function StorageGetNoAttachment() {
      return this;
    }
    StorageGetNoAttachment.prototype.getAttachment = function (id, name) {
      assert.equal(id, "foo", "getAttachment bar");
      assert.equal(name, "jio_document/YmFy.json", "getAttachment bar");
      return new Blob([JSON.stringify({
        title: name,
        id: "ID " + name,
        "another": "property"
      })]);
    };

    jIO.addStorage('documentstoragegetnoattachment', StorageGetNoAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragegetnoattachment"
      }
    });

    jio.get("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          title: "jio_document/YmFy.json",
          id: "ID jio_document/YmFy.json",
          "another": "property"
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
  // documentStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("documentStorage.allAttachments");

  test("document without attachment", function (assert) {
    start = assert.async();
    assert.expect(2);

    function StorageGetNoAttachment() {
      return this;
    }
    StorageGetNoAttachment.prototype.allAttachments = function (id) {
      assert.equal(id, "foo", "Get foo");
      return {};
    };

    jIO.addStorage(
      'documentstorageallattsnoattachment',
      StorageGetNoAttachment
    );

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorageallattsnoattachment"
      }
    });

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {});
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("document with attachment", function (assert) {
    start = assert.async();
    assert.expect(2);

    function StorageGetWithAttachment() {
      return this;
    }
    StorageGetWithAttachment.prototype.allAttachments = function (id) {
      assert.equal(id, "foo", "Get foo");
      var result = {
        "_attachments": {
          "foo1": {}
        }
      };
      // matching result
      result._attachments['jio_attachment/' + btoa("bar") + "/" +
                          btoa("bar1")] = {};
      // not matching result
      result._attachments['PREFIXjio_attachment/' + btoa("bar") + "/" +
                          btoa("bar2")] = {};
      result._attachments['jio_attachment/' + btoa("bar") + "/" + btoa("bar3")
                          + "/SUFFIX"] = {};
      result._attachments['jio_attachment/ERROR/' + btoa("bar4")] = {};
      result._attachments['jio_attachment/' + btoa("bar") + "/ERROR"] = {};
      result._attachments['jio_document/' + btoa("bar") + '.json'] = {};
      return result._attachments;
    };

    jIO.addStorage('documentstorageallattswithattachment',
                   StorageGetWithAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorageallattswithattachment"
      }
    });

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          bar1: {}
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
  // documentStorage.put
  /////////////////////////////////////////////////////////////////
  module("documentStorage.put");
  test("put called substorage put", function (assert) {
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });
    Storage200.prototype.putAttachment = function (id, name, blob) {
      assert.equal(blob.type, "application/json", "Blob type is OK");
      assert.equal(id, "foo", "putAttachment 200 called");
      assert.equal(name, "jio_document/YmFy.json", "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          assert.deepEqual(JSON.parse(result.target.result),
                    {"title": "bartitle"},
                    "JSON is in blob");
          return id;
        });

    };

    jio.put("bar", {"title": "bartitle"})
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

  test("with special utf-8 char", function (assert) {
    start = assert.async();
    assert.expect(5);

    Storage200.prototype.putAttachment = function (id, name, blob) {
      assert.equal(blob.type, "application/json", "Blob type is OK");
      assert.equal(id, "foo", "putAttachment 200 called");
      assert.equal(
        name,
        "jio_document/Zm9vw6kKYmFy5rWL6K+V5Zub8J+YiA==.json",
        "putAttachment 200 called"
      );

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          assert.deepEqual(JSON.parse(result.target.result),
                    {"title": "fooé\nbar测试四😈"},
                    "JSON is in blob");
          return id;
        });
    };
    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    jio.put("fooé\nbar测试四😈", {"title": "fooé\nbar测试四😈"})
      .then(function (result) {
        assert.equal(result, "fooé\nbar测试四😈");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  /////////////////////////////////////////////////////////////////
  // documentStorage.remove
  /////////////////////////////////////////////////////////////////
  module("documentStorage.remove");

  test("remove called substorage removeAttachment", function (assert) {
    start = assert.async();
    assert.expect(8);

    var i = 0,
      jio;

    function StorageRemoveWithAttachment() {
      return this;
    }
    StorageRemoveWithAttachment.prototype.allAttachments = function (id) {
      assert.equal(id, "foo", "allAttachments 200 called");
      var result = {};
      result['jio_attachment/' + btoa("bar") + "/" +
                          btoa("bar1")] = {};
      result['jio_attachment/' + btoa("bar") + "/" +
                          btoa("bar2")] = {};
      result['jio_attachment/' + btoa("foo") + "/" +
                          btoa("foo3")] = {};
      return result;
    };
    StorageRemoveWithAttachment.prototype.removeAttachment =
      function (id, name) {
        if (i === 0) {
          assert.equal(id, "foo", "removeAttachment called");
          assert.equal(name, "jio_attachment/YmFy/YmFyMQ==",
                "removeAttachment called");
        } else if (i === 1) {
          assert.equal(id, "foo", "removeAttachment called");
          assert.equal(name, "jio_attachment/YmFy/YmFyMg==",
                "removeAttachment called");
        } else if (i === 2) {
          assert.equal(id, "foo", "removeAttachment called");
          assert.equal(name, "jio_document/YmFy.json",
                "removeAttachment called");
        } else {
          assert.ok(false,
                    "Unexpected removeAttachment call: " + id + " " + name);
        }
        i += 1;
        return id;
      };

    jIO.addStorage('documentstorageremovewithattachment',
                   StorageRemoveWithAttachment);

    jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorageremovewithattachment"
      }
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
  // documentStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      assert.equal(id, "foo", "getAttachment 200 called");
      assert.equal(name, "jio_attachment/YmFy/YmFyMg==",
                   "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "bar2")
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
  // documentStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function (assert) {
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      assert.equal(id, "foo", "putAttachment 200 called");
      assert.equal(name, "jio_attachment/YmFy/YmFyMg==",
                   "putAttachment 200 called");
      assert.deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    jio.putAttachment("bar", "bar2", blob)
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
  // documentStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var jio = jIO.createJIO({
        type: "document",
        document_id: "foo",
        sub_storage: {
          type: "documentstorage200"
        }
      });

      Storage200.prototype.removeAttachment = function (id, name) {
        assert.equal(id, "foo", "removeAttachment 200 called");
        assert.equal(name, "jio_attachment/YmFy/YmFyMg==",
              "removeAttachment 200 called");
        return "Removed";
      };

      jio.removeAttachment("bar", "bar2")
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
  // documentStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("documentStorage.hasCapacity");
  test("can list documents", function (assert) {
    var jio = jIO.createJIO({
      type: "document",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    assert.ok(jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("documentStorage.buildQuery");

  test("document without attachment", function (assert) {
    start = assert.async();
    assert.expect(2);

    function StorageAllDocsNoAttachment() {
      return this;
    }
    StorageAllDocsNoAttachment.prototype.allAttachments = function (id) {
      assert.equal(id, "foo", "Get foo");
      return {};
    };

    jIO.addStorage('documentstoragealldocsnoattachment',
                   StorageAllDocsNoAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragealldocsnoattachment"
      }
    });

    jio.allDocs()
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("filter document's attachment on their name", function (assert) {
    start = assert.async();
    assert.expect(2);

    function StorageAllDocsWithAttachment() {
      return this;
    }
    StorageAllDocsWithAttachment.prototype.allAttachments = function (id) {
      assert.equal(id, "foo", "Get foo");
      var result = {
        "_attachments": {
          "foo1": {}
        }
      };
      // matching result
      result._attachments['jio_document/' + btoa("foo2") + '.json'] = {};
      // not matching result
      result._attachments['PREFIXjio_document/' + btoa("foo3") + '.json'] = {};
      result._attachments['jio_document/' + btoa("foo4") + '.jsonSUFFIX'] = {};
      result._attachments['jio_document/ERROR.json'] = {};
      result._attachments['jio_attachment/' + btoa("foo5") + "/" +
                          btoa("bar5")] = {};
      return result._attachments;
    };

    jIO.addStorage('documentstoragealldocswithattachment',
                   StorageAllDocsWithAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragealldocswithattachment"
      }
    });

    jio.allDocs()
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: [{
              id: "foo2",
              value: {}
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

  /////////////////////////////////////////////////////////////////
  // documentStorage.repair
  /////////////////////////////////////////////////////////////////
  module("documentStorage.repair");
  test("repair called substorage repair", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    }),
      expected_options = {foo: "bar"};

    function StorageSimpleRepair() {
      return this;
    }

    StorageSimpleRepair.prototype.allAttachments = function () {
      assert.ok(false, "allAttachments 200 called");
    };

    StorageSimpleRepair.prototype.repair = function (options) {
      assert.deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

    jIO.addStorage('documentstoragesimplerepair',
                   StorageSimpleRepair);

    jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragesimplerepair"
      }
    });

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

  test("repair clean all garbage left from a previous bug", function (assert) {
    start = assert.async();
    assert.expect(7);

    var i = 0,
      jio;

    function StorageRepairWithGarbage() {
      return this;
    }
    StorageRepairWithGarbage.prototype.allAttachments = function (id) {
      assert.equal(id, "foo", "allAttachments 200 called");
      var result = {};
      // Not matching attachment
      result.notmatchingfoo = {};
      // Standalone document
      result['jio_document/' + btoa("standalonefoo") + '.json'] = {};
      // Document with attachments
      result['jio_document/' + btoa("withdocfoo") + '.json'] = {};
      result['jio_attachment/' + btoa("withdocfoo") + "/" +
                          btoa("bar1")] = {};
      result['jio_attachment/' + btoa("withdocfoo") + "/" +
                          btoa("bar2")] = {};
      // Garbage attachments
      result['jio_attachment/' + btoa("garbagefoo1") + "/" +
                          btoa("foo3")] = {};
      result['jio_attachment/' + btoa("garbagefoo2") + "/" +
                          btoa("foo4")] = {};
      return result;
    };
    StorageRepairWithGarbage.prototype.removeAttachment =
      function (id, name) {
        if (i === 0) {
          assert.equal(id, "foo", "removeAttachment called");
          assert.equal(name, 'jio_attachment/' + btoa("garbagefoo1") + "/" +
                              btoa("foo3"));
        } else if (i === 1) {
          assert.equal(id, "foo", "removeAttachment called");
          assert.equal(name, 'jio_attachment/' + btoa("garbagefoo2") + "/" +
                              btoa("foo4"));
        } else {
          assert.ok(false,
                    "Unexpected removeAttachment call: " + id + " " + name);
        }
        i += 1;
        return name;
      };
    StorageRepairWithGarbage.prototype.repair = function () {
      assert.ok(true, "repair called");
      return "OK";
    };

    jIO.addStorage('documentstoragerepairwithgarbage',
                   StorageRepairWithGarbage);

    jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragerepairwithgarbage"
      },
      repair_attachment: true
    });

    jio.repair()
      .then(function (result) {
        assert.deepEqual(result, [
          "jio_attachment/Z2FyYmFnZWZvbzE=/Zm9vMw==",
          "jio_attachment/Z2FyYmFnZWZvbzI=/Zm9vNA=="
        ]);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, btoa));
