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
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "drivetojiomapping200");

  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.get
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.get");

  test("get non existent document", function () {
    stop();
    expect(6);

    function StorageGetNoDocument() {
      return this;
    }
    StorageGetNoDocument.prototype.getAttachment = function (id, name) {
      equal(id, "/.jio_documents/", "getAttachment");
      equal(name, "bar.json", "getAttachment");
      throw new jIO.util.jIOError("Cannot find subattachment", 404);
    };
    StorageGetNoDocument.prototype.allAttachments = function (id) {
      equal(id, "/", "Get document");
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
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document bar");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get document with only one attachment", function () {
    stop();
    expect(4);

    function StorageGetOnlyAttachment() {
      return this;
    }
    StorageGetOnlyAttachment.prototype.getAttachment = function (id, name) {
      equal(id, "/.jio_documents/", "getAttachment");
      equal(name, "bar.json", "getAttachment");
      throw new jIO.util.jIOError("Cannot find subattachment", 404);
    };
    StorageGetOnlyAttachment.prototype.allAttachments = function (id) {
      equal(id, "/", "Get document");
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
        deepEqual(result, {});
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with only one document", function () {
    stop();
    expect(3);

    function StorageGetOnlyDocument() {
      return this;
    }
    StorageGetOnlyDocument.prototype.getAttachment = function (id, name) {
      equal(id, "/.jio_documents/", "getAttachment");
      equal(name, "bar.json", "getAttachment");
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
        deepEqual(result, {
          "title": "foo"
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
  // driveToJioMapping.allAttachments
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.allAttachments");

  test("get non existent document", function () {
    stop();
    expect(6);

    function StorageGetNoDocument() {
      return this;
    }
    StorageGetNoDocument.prototype.getAttachment =
      function (id, name) {
        equal(id, "/.jio_documents/", "getAttachment");
        equal(name, "bar.json", "getAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      };
    StorageGetNoDocument.prototype.allAttachments = function (id) {
      equal(id, "/", "Get document");
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
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document bar");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get document with only one attachment", function () {
    stop();
    expect(2);

    function StorageGetOnlyAttachment() {
      return this;
    }
    StorageGetOnlyAttachment.prototype.allAttachments = function (id) {
      equal(id, "/", "Get document");
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
        deepEqual(result, {
          enclosure: {}
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with only one document", function () {
    stop();
    expect(4);

    function StorageGetOnlyDocument() {
      return this;
    }
    StorageGetOnlyDocument.prototype.getAttachment =
      function (id, name) {
        equal(id, "/.jio_documents/", "getAttachment");
        equal(name, "bar.json", "getAttachment");
        return new Blob([JSON.stringify({title: "foo"})]);
      };
    StorageGetOnlyDocument.prototype.allAttachments = function (id) {
      deepEqual(id, "/", "Get document");
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
        deepEqual(result, {});
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.put
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.put");
  test("put called substorage put", function () {
    stop();
    expect(5);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });
    Storage200.prototype.putAttachment = function (id, name, blob) {
      equal(blob.type, "application/json", "Blob type is OK");
      equal(id, "/.jio_documents/", "putAttachment 200 called");
      equal(name, "bar.json", "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          deepEqual(JSON.parse(result.target.result),
                    {"title": "bartitle"},
                    "JSON is in blob");
          return id;
        });

    };

    jio.put("bar", {"title": "bartitle"})
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

  test("automatically create subdocuments", function () {
    stop();
    expect(11);

    var call_count = 0,
      jio;

    function StorageCreateSubDocument() {
      return this;
    }
    StorageCreateSubDocument.prototype.putAttachment = function (id, name,
                                                                 blob) {
      call_count += 1;
      equal(blob.type, "application/json", "Blob type is OK");
      equal(id, "/.jio_documents/", "putAttachment 200 called");
      equal(name, "bar.json", "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          deepEqual(JSON.parse(result.target.result),
                    {"title": "bartitle"},
                    "JSON is in blob");
          if (call_count === 1) {
            throw new jIO.util.jIOError("Cannot access subdocument", 404);
          }
          return "PutSubAttachment OK";
        });
    };

    StorageCreateSubDocument.prototype.put = function (id, param) {
      equal(id, "/.jio_documents/", "PutSubDocument OK");
      deepEqual(param, {}, "put 200 called");
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
  // driveToJioMapping.remove
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.remove");

  test("remove non existent document", function () {
    var call_count = 0,
      jio;
    stop();
    expect(8);

    function StorageRemoveNoDocument() {
      return this;
    }
    StorageRemoveNoDocument.prototype.removeAttachment = function (id, name) {
      call_count += 1;
      if (call_count === 1) {
        equal(id, "/", "removeAttachment");
        equal(name, "bar", "removeAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      }
      equal(id, "/.jio_documents/", "removeAttachment");
      equal(name, "bar.json", "removeAttachment");
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
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find subdocument");
        equal(error.status_code, 404);
      })
      .then(function () {
        equal(call_count, 2);
      })
      .always(function () {
        start();
      });
  });

  test("remove document with only one attachment", function () {
    var call_count = 0,
      jio;
    stop();
    expect(6);

    function StorageRemoveOnlyAttachment() {
      return this;
    }
    StorageRemoveOnlyAttachment.prototype.removeAttachment =
      function (id, name) {
        call_count += 1;
        if (call_count === 1) {
          equal(id, "/", "removeAttachment");
          equal(name, "bar", "removeAttachment");
          return "Removed";
        }
        equal(id, "/.jio_documents/", "removeAttachment");
        equal(name, "bar.json", "removeAttachment");
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
        equal(result, "bar");
        equal(call_count, 2);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove document with only one document", function () {
    var call_count = 0,
      jio;
    stop();
    expect(6);

    function StorageRemoveOnlyDocument() {
      return this;
    }
    StorageRemoveOnlyDocument.prototype.removeAttachment = function (id,
                                                                     name) {
      call_count += 1;
      if (call_count === 1) {
        equal(id, "/", "removeAttachment");
        equal(name, "bar", "removeAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      }
      equal(id, "/.jio_documents/", "removeAttachment");
      equal(name, "bar.json", "removeAttachment");
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
        equal(result, "bar");
        equal(call_count, 2);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove document with one document and one attachment", function () {
    var call_count = 0,
      jio;
    stop();
    expect(6);

    function StorageRemoveBoth() {
      return this;
    }
    StorageRemoveBoth.prototype.removeAttachment = function (id, name) {
      call_count += 1;
      if (call_count === 1) {
        deepEqual(id, "/", "removeAttachment");
        deepEqual(name, "bar", "removeAttachment");
        return "Removed attachment";
      }
      deepEqual(id, "/.jio_documents/", "removeAttachment");
      deepEqual(name, "bar.json", "removeAttachment");
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
        equal(result, "bar");
        equal(call_count, 2);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.getAttachment
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.getAttachment");
  test("reject non enclosure attachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    jio.getAttachment("bar", "foo")
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Only support 'enclosure' attachment");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    }),
      blob = new Blob(["foo"]);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "/", "getAttachment 200 called");
      equal(name, "bar", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "enclosure")
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
  // driveToJioMapping.putAttachment
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.putAttachment");
  test("reject non enclosure attachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    jio.putAttachment("bar", "foo", new Blob(["foo"]))
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Only support 'enclosure' attachment");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    }),
      blob = new Blob(["foo"]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "/", "putAttachment 200 called");
      equal(name, "bar", "putAttachment 200 called");
      deepEqual(blob2, blob, "putAttachment 200 called");
      return "Put";
    };

    jio.putAttachment("bar", "enclosure", blob)
      .then(function (result) {
        equal(result, "Put");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.removeAttachment");
  test("reject non enclosure attachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    jio.removeAttachment("bar", "foo")
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Only support 'enclosure' attachment");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "/", "removeAttachment 200 called");
      equal(name, "bar", "removeAttachment 200 called");
      return "Removed";
    };

    jio.removeAttachment("bar", "enclosure")
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
  // driveToJioMapping.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.hasCapacity");
  test("can list documents", function () {
    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    ok(jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.buildQuery
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.buildQuery");

  test("no document directory, no attachments: empty result", function () {
    stop();
    expect(3);

    var call_count = 0,
      jio;

    function StorageAllDocsNoDirectory() {
      return this;
    }

    StorageAllDocsNoDirectory.prototype.allAttachments = function (id) {
      call_count += 1;
      if (call_count === 1) {
        equal(id, "/.jio_documents/", "get documents called");
        throw new jIO.util.jIOError("Cannot access subdocument", 404);
      }

      equal(id, "/", "get attachments called");
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
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("empty document directory, no attachments: empty result", function () {
    stop();
    expect(3);

    var call_count = 0,
      jio;

    function StorageAllDocsEmpty() {
      return this;
    }

    StorageAllDocsEmpty.prototype.allAttachments = function (id) {
      call_count += 1;
      if (call_count === 1) {
        equal(id, "/.jio_documents/", "get documents called");
        return {};
      }

      equal(id, "/", "get attachments called");
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
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("no document directory, attachments found: attachments as result",
       function () {
      stop();
      expect(3);

      var call_count = 0,
        jio;

      function StorageAllDocsAttachmentsOnly() {
        return this;
      }

      StorageAllDocsAttachmentsOnly.prototype.allAttachments = function (id) {
        call_count += 1;
        if (call_count === 1) {
          equal(id, "/.jio_documents/", "get documents called");
          throw new jIO.util.jIOError("Cannot access subdocument", 404);
        }

        equal(id, "/", "get attachments called");
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
          deepEqual(result, {
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
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("document directory, no attachments: json document as result",
       function () {
      stop();
      expect(3);

      var call_count = 0,
        jio;

      function StorageAllDocsFilterDocument() {
        return this;
      }

      StorageAllDocsFilterDocument.prototype.allAttachments = function (id) {
        call_count += 1;
        if (call_count === 1) {
          equal(id, "/.jio_documents/", "get documents called");
          return {
            "foo.json": {},
            "bar.json": {},
            "bar.html.json": {},
            "foobar.pasjson": {}
          };
        }

        equal(id, "/", "get attachments called");
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
          deepEqual(result, {
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
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("document directory, attachments found: merge result", function () {
    stop();
    expect(3);

    var call_count = 0,
      jio;

    function StorageAllDocsBoth() {
      return this;
    }

    StorageAllDocsBoth.prototype.allAttachments = function (id) {
      call_count += 1;
      if (call_count === 1) {
        equal(id, "/.jio_documents/", "get documents called");
        return {
          "foo.json": {},
          "bar.json": {}
        };
      }

      equal(id, "/", "get attachments called");
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
        deepEqual(result, {
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
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // driveToJioMapping.repair
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.repair");
  test("repair called substorage repair", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    }),
      expected_options = {foo: "bar"};

    Storage200.prototype.repair = function (options) {
      deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

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
