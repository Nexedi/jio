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
  jIO.addStorage('drivetojiomapping200', Storage200);

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.constructor
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.constructor");
  test("create substorage", function (assert) {
    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    assert.ok(jio.__storage._sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._sub_storage.__type, "drivetojiomapping200");

  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.get
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.get");

  test("get non existent document", function (assert) {
    start = assert.async();
    assert.expect(6);

    function StorageGetNoDocument() {
      return this;
    }
    StorageGetNoDocument.prototype.getAttachment = function (id, name) {
      assert.equal(id, "/.jio_documents/", "getAttachment");
      assert.equal(name, "bar.json", "getAttachment");
      throw new jIO.util.jIOError("Cannot find subattachment", 404);
    };
    StorageGetNoDocument.prototype.allAttachments = function (id) {
      assert.equal(id, "/", "Get document");
      return {};
    };

    jIO.addStorage('drivetojiomappinggetnodocument', StorageGetNoDocument);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappinggetnodocument"
      }
    });

    jio.get("bar")
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document bar");
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get document with only one attachment", function (assert) {
    start = assert.async();
    assert.expect(4);

    function StorageGetOnlyAttachment() {
      return this;
    }
    StorageGetOnlyAttachment.prototype.getAttachment = function (id, name) {
      assert.equal(id, "/.jio_documents/", "getAttachment");
      assert.equal(name, "bar.json", "getAttachment");
      throw new jIO.util.jIOError("Cannot find subattachment", 404);
    };
    StorageGetOnlyAttachment.prototype.allAttachments = function (id) {
      assert.equal(id, "/", "Get document");
      return {
        "bar": {}
      };
    };

    jIO.addStorage('drivetojiomappinggetonlyattachment',
                   StorageGetOnlyAttachment);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappinggetonlyattachment"
      }
    });

    jio.get("bar")
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

  test("get document with only one document", function (assert) {
    start = assert.async();
    assert.expect(3);

    function StorageGetOnlyDocument() {
      return this;
    }
    StorageGetOnlyDocument.prototype.getAttachment = function (id, name) {
      assert.equal(id, "/.jio_documents/", "getAttachment");
      assert.equal(name, "bar.json", "getAttachment");
      return new Blob([JSON.stringify({title: "foo"})]);
    };

    jIO.addStorage('drivetojiomappinggetonlydocument', StorageGetOnlyDocument);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappinggetonlydocument"
      }
    });

    jio.get("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "foo"
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
  // driveToJioMapping.allAttachments
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.allAttachments");

  test("get non existent document", function (assert) {
    start = assert.async();
    assert.expect(6);

    function StorageGetNoDocument() {
      return this;
    }
    StorageGetNoDocument.prototype.getAttachment =
      function (id, name) {
        assert.equal(id, "/.jio_documents/", "getAttachment");
        assert.equal(name, "bar.json", "getAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      };
    StorageGetNoDocument.prototype.allAttachments = function (id) {
      assert.equal(id, "/", "Get document");
      return {};
    };

    jIO.addStorage('drivetojiomappingallattsnodocument', StorageGetNoDocument);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingallattsnodocument"
      }
    });

    jio.allAttachments("bar")
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document bar");
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get document with only one attachment", function (assert) {
    start = assert.async();
    assert.expect(2);

    function StorageGetOnlyAttachment() {
      return this;
    }
    StorageGetOnlyAttachment.prototype.allAttachments = function (id) {
      assert.equal(id, "/", "Get document");
      return {
        "bar": {}
      };
    };

    jIO.addStorage('drivetojiomappingallattsonlyattachment',
                   StorageGetOnlyAttachment);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingallattsonlyattachment"
      }
    });

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          enclosure: {}
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with only one document", function (assert) {
    start = assert.async();
    assert.expect(4);

    function StorageGetOnlyDocument() {
      return this;
    }
    StorageGetOnlyDocument.prototype.getAttachment =
      function (id, name) {
        assert.equal(id, "/.jio_documents/", "getAttachment");
        assert.equal(name, "bar.json", "getAttachment");
        return new Blob([JSON.stringify({title: "foo"})]);
      };
    StorageGetOnlyDocument.prototype.allAttachments = function (id) {
      assert.deepEqual(id, "/", "Get document");
      return {};
    };

    jIO.addStorage('drivetojiomappingallattsonlydocument',
                   StorageGetOnlyDocument);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingallattsonlydocument"
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

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.put
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.put");
  test("put called substorage put", function (assert) {
    start = assert.async();
    assert.expect(5);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });
    Storage200.prototype.putAttachment = function (id, name, blob) {
      assert.equal(blob.type, "application/json", "Blob type is OK");
      assert.equal(id, "/.jio_documents/", "putAttachment 200 called");
      assert.equal(name, "bar.json", "putAttachment 200 called");

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

  test("automatically create subdocuments", function (assert) {
    start = assert.async();
    assert.expect(11);

    var call_count = 0,
      jio;

    function StorageCreateSubDocument() {
      return this;
    }
    StorageCreateSubDocument.prototype.putAttachment = function (id, name,
                                                                 blob) {
      call_count += 1;
      assert.equal(blob.type, "application/json", "Blob type is OK");
      assert.equal(id, "/.jio_documents/", "putAttachment 200 called");
      assert.equal(name, "bar.json", "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          assert.deepEqual(JSON.parse(result.target.result),
                    {"title": "bartitle"},
                    "JSON is in blob");
          if (call_count === 1) {
            throw new jIO.util.jIOError("Cannot access subdocument", 404);
          }
          return "PutSubAttachment OK";
        });
    };

    StorageCreateSubDocument.prototype.put = function (id, param) {
      assert.equal(id, "/.jio_documents/", "PutSubDocument OK");
      assert.deepEqual(param, {}, "put 200 called");
      return "PutSubDocument OK";
    };

    jIO.addStorage('drivetojiomappingcreatesubdocument',
                   StorageCreateSubDocument);

    jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingcreatesubdocument"
      }
    });

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

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.remove
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.remove");

  test("remove non existent document", function (assert) {
    var call_count = 0,
      jio;
    start = assert.async();
    assert.expect(8);

    function StorageRemoveNoDocument() {
      return this;
    }
    StorageRemoveNoDocument.prototype.removeAttachment = function (id, name) {
      call_count += 1;
      if (call_count === 1) {
        assert.equal(id, "/", "removeAttachment");
        assert.equal(name, "bar", "removeAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      }
      assert.equal(id, "/.jio_documents/", "removeAttachment");
      assert.equal(name, "bar.json", "removeAttachment");
      throw new jIO.util.jIOError("Cannot find subdocument", 404);
    };

    jIO.addStorage('drivetojiomappingremovenodocument',
                   StorageRemoveNoDocument);

    jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingremovenodocument"
      }
    });

    jio.remove("bar")
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find subdocument");
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        assert.equal(call_count, 2);
      })
      .always(function () {
        start();
      });
  });

  test("remove document with only one attachment", function (assert) {
    var call_count = 0,
      jio;
    start = assert.async();
    assert.expect(6);

    function StorageRemoveOnlyAttachment() {
      return this;
    }
    StorageRemoveOnlyAttachment.prototype.removeAttachment =
      function (id, name) {
        call_count += 1;
        if (call_count === 1) {
          assert.equal(id, "/", "removeAttachment");
          assert.equal(name, "bar", "removeAttachment");
          return "Removed";
        }
        assert.equal(id, "/.jio_documents/", "removeAttachment");
        assert.equal(name, "bar.json", "removeAttachment");
        throw new jIO.util.jIOError("Cannot find subdocument", 404);
      };

    jIO.addStorage('drivetojiomappingremoveonlyattachment',
                   StorageRemoveOnlyAttachment);

    jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingremoveonlyattachment"
      }
    });

    jio.remove("bar")
      .then(function (result) {
        assert.equal(result, "bar");
        assert.equal(call_count, 2);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove document with only one document", function (assert) {
    var call_count = 0,
      jio;
    start = assert.async();
    assert.expect(6);

    function StorageRemoveOnlyDocument() {
      return this;
    }
    StorageRemoveOnlyDocument.prototype.removeAttachment = function (id,
                                                                     name) {
      call_count += 1;
      if (call_count === 1) {
        assert.equal(id, "/", "removeAttachment");
        assert.equal(name, "bar", "removeAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      }
      assert.equal(id, "/.jio_documents/", "removeAttachment");
      assert.equal(name, "bar.json", "removeAttachment");
      return "Removed";
    };

    jIO.addStorage('drivetojiomappingremoveonlydocument',
                   StorageRemoveOnlyDocument);

    jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingremoveonlydocument"
      }
    });

    jio.remove("bar")
      .then(function (result) {
        assert.equal(result, "bar");
        assert.equal(call_count, 2);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove document with one document and one attachment",
       function (assert) {
      var call_count = 0,
        jio;
      start = assert.async();
      assert.expect(6);

      function StorageRemoveBoth() {
        return this;
      }
      StorageRemoveBoth.prototype.removeAttachment = function (id, name) {
        call_count += 1;
        if (call_count === 1) {
          assert.deepEqual(id, "/", "removeAttachment");
          assert.deepEqual(name, "bar", "removeAttachment");
          return "Removed attachment";
        }
        assert.deepEqual(id, "/.jio_documents/", "removeAttachment");
        assert.deepEqual(name, "bar.json", "removeAttachment");
        return "Removed document";
      };

      jIO.addStorage('drivetojiomappingremoveboth', StorageRemoveBoth);

      jio = jIO.createJIO({
        type: "drivetojiomapping",
        sub_storage: {
          type: "drivetojiomappingremoveboth"
        }
      });

      jio.remove("bar")
        .then(function (result) {
          assert.equal(result, "bar");
          assert.equal(call_count, 2);
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.getAttachment
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.getAttachment");
  test("reject non enclosure attachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    jio.getAttachment("bar", "foo")
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Only support 'enclosure' attachment");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment called substorage getAttachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    }),
      blob = new Blob(["foo"]);

    Storage200.prototype.getAttachment = function (id, name) {
      assert.equal(id, "/", "getAttachment 200 called");
      assert.equal(name, "bar", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "enclosure")
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
  // driveToJioMapping.putAttachment
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.putAttachment");
  test("reject non enclosure attachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    jio.putAttachment("bar", "foo", new Blob(["foo"]))
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Only support 'enclosure' attachment");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment called substorage putAttachment", function (assert) {
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    }),
      blob = new Blob(["foo"]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      assert.equal(id, "/", "putAttachment 200 called");
      assert.equal(name, "bar", "putAttachment 200 called");
      assert.deepEqual(blob2, blob, "putAttachment 200 called");
      return "Put";
    };

    jio.putAttachment("bar", "enclosure", blob)
      .then(function (result) {
        assert.equal(result, "Put");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.removeAttachment");
  test("reject non enclosure attachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    jio.removeAttachment("bar", "foo")
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Only support 'enclosure' attachment");
        assert.equal(error.status_code, 400);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment called substorage removeAttachment",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var jio = jIO.createJIO({
        type: "drivetojiomapping",
        sub_storage: {
          type: "drivetojiomapping200"
        }
      });

      Storage200.prototype.removeAttachment = function (id, name) {
        assert.equal(id, "/", "removeAttachment 200 called");
        assert.equal(name, "bar", "removeAttachment 200 called");
        return "Removed";
      };

      jio.removeAttachment("bar", "enclosure")
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
  // driveToJioMapping.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.hasCapacity");
  test("can list documents", function (assert) {
    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    assert.ok(jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.buildQuery
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.buildQuery");

  test("no document directory, no attachments: empty result",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var call_count = 0,
        jio;

      function StorageAllDocsNoDirectory() {
        return this;
      }

      StorageAllDocsNoDirectory.prototype.allAttachments = function (id) {
        call_count += 1;
        if (call_count === 1) {
          assert.equal(id, "/.jio_documents/", "get documents called");
          throw new jIO.util.jIOError("Cannot access subdocument", 404);
        }

        assert.equal(id, "/", "get attachments called");
        return {};
      };

      jIO.addStorage('drivetojiomappingalldocsnodirectory',
                    StorageAllDocsNoDirectory);

      jio = jIO.createJIO({
        type: "drivetojiomapping",
        sub_storage: {
          type: "drivetojiomappingalldocsnodirectory"
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

  test("empty document directory, no attachments: empty result",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var call_count = 0,
        jio;

      function StorageAllDocsEmpty() {
        return this;
      }

      StorageAllDocsEmpty.prototype.allAttachments = function (id) {
        call_count += 1;
        if (call_count === 1) {
          assert.equal(id, "/.jio_documents/", "get documents called");
          return {};
        }

        assert.equal(id, "/", "get attachments called");
        return {};
      };

      jIO.addStorage('drivetojiomappingalldocsempty',
                    StorageAllDocsEmpty);

      jio = jIO.createJIO({
        type: "drivetojiomapping",
        sub_storage: {
          type: "drivetojiomappingalldocsempty"
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

  test("no document directory, attachments found: attachments as result",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var call_count = 0,
        jio;

      function StorageAllDocsAttachmentsOnly() {
        return this;
      }

      StorageAllDocsAttachmentsOnly.prototype.allAttachments = function (id) {
        call_count += 1;
        if (call_count === 1) {
          assert.equal(id, "/.jio_documents/", "get documents called");
          throw new jIO.util.jIOError("Cannot access subdocument", 404);
        }

        assert.equal(id, "/", "get attachments called");
        return {
          foo: {},
          bar: {}
        };
      };

      jIO.addStorage('drivetojiomappingalldocsattachmentsonly',
                     StorageAllDocsAttachmentsOnly);

      jio = jIO.createJIO({
        type: "drivetojiomapping",
        sub_storage: {
          type: "drivetojiomappingalldocsattachmentsonly"
        }
      });

      jio.allDocs()
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                value: {}
              }, {
                id: "bar",
                value: {}
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

  test("document directory, no attachments: json document as result",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var call_count = 0,
        jio;

      function StorageAllDocsFilterDocument() {
        return this;
      }

      StorageAllDocsFilterDocument.prototype.allAttachments = function (id) {
        call_count += 1;
        if (call_count === 1) {
          assert.equal(id, "/.jio_documents/", "get documents called");
          return {
            "foo.json": {},
            "bar.json": {},
            "bar.html.json": {},
            "foobar.pasjson": {}
          };
        }

        assert.equal(id, "/", "get attachments called");
        return {};
      };

      jIO.addStorage('drivetojiomappingalldocsfilterdocument',
                     StorageAllDocsFilterDocument);

      jio = jIO.createJIO({
        type: "drivetojiomapping",
        sub_storage: {
          type: "drivetojiomappingalldocsfilterdocument"
        }
      });

      jio.allDocs()
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                value: {}
              }, {
                id: "bar",
                value: {}
              }, {
                id: "bar.html",
                value: {}
              }],
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

  test("document directory, attachments found: merge result",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var call_count = 0,
        jio;

      function StorageAllDocsBoth() {
        return this;
      }

      StorageAllDocsBoth.prototype.allAttachments = function (id) {
        call_count += 1;
        if (call_count === 1) {
          assert.equal(id, "/.jio_documents/", "get documents called");
          return {
            "foo.json": {},
            "bar.json": {}
          };
        }

        assert.equal(id, "/", "get attachments called");
        return {
          "bar": {},
          "foobar": {}
        };
      };

      jIO.addStorage('drivetojiomappingalldocsboth',
                    StorageAllDocsBoth);

      jio = jIO.createJIO({
        type: "drivetojiomapping",
        sub_storage: {
          type: "drivetojiomappingalldocsboth"
        }
      });

      jio.allDocs()
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                value: {}
              }, {
                id: "bar",
                value: {}
              }, {
                id: "foobar",
                value: {}
              }],
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
  // driveToJioMapping.repair
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.repair");
  test("repair called substorage repair", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
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
