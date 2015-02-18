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
    expect(5);

    function StorageGetNoDocument() {
      return this;
    }
    StorageGetNoDocument.prototype.getAttachment = function (options) {
      deepEqual(options, {"_id": "/.jio_documents/",
                          "_attachment": "bar.json"},
                "getAttachment");
      throw new jIO.util.jIOError("Cannot find subattachment", 404);
    };
    StorageGetNoDocument.prototype.get = function (options) {
      deepEqual(options, {"_id": "/"}, "Get document");
      return {
        "_id": "/"
      };
    };

    jIO.addStorage('drivetojiomappinggetnodocument', StorageGetNoDocument);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappinggetnodocument"
      }
    });

    jio.get({"_id": "bar"})
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
    expect(3);

    function StorageGetOnlyAttachment() {
      return this;
    }
    StorageGetOnlyAttachment.prototype.getAttachment = function (options) {
      deepEqual(options, {"_id": "/.jio_documents/",
                          "_attachment": "bar.json"},
                "getAttachment");
      throw new jIO.util.jIOError("Cannot find subattachment", 404);
    };
    StorageGetOnlyAttachment.prototype.get = function (options) {
      deepEqual(options, {"_id": "/"}, "Get document");
      return {
        "_id": "/",
        "_attachments": {
          "bar": {}
        }
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

    jio.get({"_id": "bar"})
      .then(function (result) {
        deepEqual(result, {
          "_id": "bar",
          "_attachments": {
            enclosure: {}
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

  test("get document with only one document", function () {
    stop();
    expect(3);

    function StorageGetOnlyDocument() {
      return this;
    }
    StorageGetOnlyDocument.prototype.getAttachment = function (options) {
      deepEqual(options, {"_id": "/.jio_documents/",
                          "_attachment": "bar.json"},
                "getAttachment");
      return {data: new Blob([JSON.stringify({title: "foo"})])};
    };
    StorageGetOnlyDocument.prototype.get = function (options) {
      deepEqual(options, {"_id": "/"}, "Get document");
      return {
        "_id": "/"
      };
    };

    jIO.addStorage('drivetojiomappinggetonlydocument', StorageGetOnlyDocument);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappinggetonlydocument"
      }
    });

    jio.get({"_id": "bar"})
      .then(function (result) {
        deepEqual(result, {
          "_id": "bar",
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

  test("get document with one document and one attachment", function () {
    stop();
    expect(3);

    function StorageGetBoth() {
      return this;
    }
    StorageGetBoth.prototype.getAttachment = function (options) {
      deepEqual(options, {"_id": "/.jio_documents/",
                          "_attachment": "bar.json"},
                "getAttachment");
      return {data: new Blob([JSON.stringify({title: "foo"})])};
    };
    StorageGetBoth.prototype.get = function (options) {
      deepEqual(options, {"_id": "/"}, "Get document");
      return {
        "_id": "/",
        "_attachments": {
          "bar": {}
        }
      };
    };

    jIO.addStorage('drivetojiomappinggetboth', StorageGetBoth);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappinggetboth"
      }
    });

    jio.get({"_id": "bar"})
      .then(function (result) {
        deepEqual(result, {
          "_id": "bar",
          "title": "foo",
          "_attachments": {
            enclosure: {}
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
  // driveToJioMapping.put
  /////////////////////////////////////////////////////////////////
  module("driveToJioMapping.put");
  test("put called substorage put", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });
    Storage200.prototype.putAttachment = function (param) {
      var blob = param._blob;
      delete param._blob;
      equal(blob.type, "application/json", "Blob type is OK");
      deepEqual(param, {
        "_id": "/.jio_documents/",
        "_attachment": "bar.json"
      }, "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          deepEqual(JSON.parse(result.target.result),
                    {"_id": "bar", "title": "bartitle"},
                    "JSON is in blob");
          return param._id;
        });

    };

    jio.put({"_id": "bar", "title": "bartitle"})
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
    expect(8);

    var call_count = 0,
      jio;

    function StorageCreateSubDocument() {
      return this;
    }
    StorageCreateSubDocument.prototype.putAttachment = function (param) {
      call_count += 1;
      var blob = param._blob;
      delete param._blob;
      equal(blob.type, "application/json", "Blob type is OK");
      deepEqual(param, {
        "_id": "/.jio_documents/",
        "_attachment": "bar.json"
      }, "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          deepEqual(JSON.parse(result.target.result),
                    {"_id": "bar", "title": "bartitle"},
                    "JSON is in blob");
          if (call_count === 1) {
            throw new jIO.util.jIOError("Cannot access subdocument", 404);
          }
          return "PutSubAttachment OK";
        });
    };

    StorageCreateSubDocument.prototype.put = function (param) {
      deepEqual(param, {
        "_id": "/.jio_documents/"
      }, "put 200 called");
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

    jio.put({"_id": "bar", "title": "bartitle"})
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
    expect(6);

    function StorageRemoveNoDocument() {
      return this;
    }
    StorageRemoveNoDocument.prototype.removeAttachment = function (options) {
      call_count += 1;
      if (call_count === 1) {
        deepEqual(options, {"_id": "/",
                            "_attachment": "bar"},
                  "removeAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      }
      deepEqual(options, {"_id": "/.jio_documents/",
                          "_attachment": "bar.json"},
                "removeAttachment");
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

    jio.remove({"_id": "bar"})
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
    expect(4);

    function StorageRemoveOnlyAttachment() {
      return this;
    }
    StorageRemoveOnlyAttachment.prototype.removeAttachment =
      function (options) {
        call_count += 1;
        if (call_count === 1) {
          deepEqual(options, {"_id": "/",
                              "_attachment": "bar"},
                    "removeAttachment");
          return "Removed";
        }
        deepEqual(options, {"_id": "/.jio_documents/",
                            "_attachment": "bar.json"},
                  "removeAttachment");
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

    jio.remove({"_id": "bar"})
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
    expect(4);

    function StorageRemoveOnlyDocument() {
      return this;
    }
    StorageRemoveOnlyDocument.prototype.removeAttachment = function (options) {
      call_count += 1;
      if (call_count === 1) {
        deepEqual(options, {"_id": "/",
                            "_attachment": "bar"},
                  "removeAttachment");
        throw new jIO.util.jIOError("Cannot find subattachment", 404);
      }
      deepEqual(options, {"_id": "/.jio_documents/",
                          "_attachment": "bar.json"},
                "removeAttachment");
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

    jio.remove({"_id": "bar"})
      .then(function (result) {
        equal(result, "Removed");
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
    expect(4);

    function StorageRemoveBoth() {
      return this;
    }
    StorageRemoveBoth.prototype.removeAttachment = function (options) {
      call_count += 1;
      if (call_count === 1) {
        deepEqual(options, {"_id": "/",
                            "_attachment": "bar"},
                  "removeAttachment");
        return "Removed attachment";
      }
      deepEqual(options, {"_id": "/.jio_documents/",
                          "_attachment": "bar.json"},
                "removeAttachment");
      return "Removed document";
    };

    jIO.addStorage('drivetojiomappingremoveboth', StorageRemoveBoth);

    jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomappingremoveboth"
      }
    });

    jio.remove({"_id": "bar"})
      .then(function (result) {
        equal(result, "Removed document");
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

    jio.getAttachment({"_id": "bar", "_attachment": "foo"})
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
    expect(2);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    }),
      blob = new Blob(["foo"]);

    Storage200.prototype.getAttachment = function (param) {
      deepEqual(param, {"_id": "/",
                        "_attachment": "bar"},
                "getAttachment 200 called");
      return {data: blob};
    };

    jio.getAttachment({"_id": "bar", "_attachment": "enclosure"})
      .then(function (result) {
        equal(result.data, blob);
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

    jio.putAttachment({"_id": "bar", "_attachment": "foo",
                       "_blob": new Blob(["foo"])})
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
    expect(2);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    }),
      blob = new Blob(["foo"]);

    Storage200.prototype.putAttachment = function (param) {
      deepEqual(param, {"_id": "/",
                        "_blob": blob,
                        "_attachment": "bar"},
                "putAttachment 200 called");
      return "Put";
    };

    jio.putAttachment({"_id": "bar", "_attachment": "enclosure", "_blob": blob})
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

    jio.removeAttachment({"_id": "bar", "_attachment": "foo"})
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
    expect(2);

    var jio = jIO.createJIO({
      type: "drivetojiomapping",
      sub_storage: {
        type: "drivetojiomapping200"
      }
    });

    Storage200.prototype.removeAttachment = function (param) {
      deepEqual(param, {"_id": "/",
                        "_attachment": "bar"},
                "removeAttachment 200 called");
      return "Removed";
    };

    jio.removeAttachment({"_id": "bar", "_attachment": "enclosure"})
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

    StorageAllDocsNoDirectory.prototype.get = function (param) {
      call_count += 1;
      if (call_count === 1) {
        deepEqual(param, {
          "_id": "/.jio_documents/"
        }, "get documents called");
        throw new jIO.util.jIOError("Cannot access subdocument", 404);
      }

      deepEqual(param, {
        "_id": "/"
      }, "get attachments called");
      return {
        "_id": "/"
      };
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

    StorageAllDocsEmpty.prototype.get = function (param) {
      call_count += 1;
      if (call_count === 1) {
        deepEqual(param, {
          "_id": "/.jio_documents/"
        }, "get documents called");
        return {
          "_id": "/.jio_documents/"
        };
      }

      deepEqual(param, {
        "_id": "/"
      }, "get attachments called");
      return {
        "_id": "/"
      };
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

      StorageAllDocsAttachmentsOnly.prototype.get = function (param) {
        call_count += 1;
        if (call_count === 1) {
          deepEqual(param, {
            "_id": "/.jio_documents/"
          }, "get documents called");
          throw new jIO.util.jIOError("Cannot access subdocument", 404);
        }

        deepEqual(param, {
          "_id": "/"
        }, "get attachments called");
        return {
          "_id": "/",
          "_attachments": {
            foo: {},
            bar: {}
          }
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

      StorageAllDocsFilterDocument.prototype.get = function (param) {
        call_count += 1;
        if (call_count === 1) {
          deepEqual(param, {
            "_id": "/.jio_documents/"
          }, "get documents called");
          return {
            "_id": "/",
            "_attachments": {
              "foo.json": {},
              "bar.json": {},
              "foobar.pasjson": {}
            }
          };
        }

        deepEqual(param, {
          "_id": "/"
        }, "get attachments called");
        return {
          "_id": "/"
        };
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

  test("document directory, attachments found: merge result", function () {
    stop();
    expect(3);

    var call_count = 0,
      jio;

    function StorageAllDocsBoth() {
      return this;
    }

    StorageAllDocsBoth.prototype.get = function (param) {
      call_count += 1;
      if (call_count === 1) {
        deepEqual(param, {
          "_id": "/.jio_documents/"
        }, "get documents called");
        return {
          "_id": "/",
          "_attachments": {
            "foo.json": {},
            "bar.json": {}
          }
        };
      }

      deepEqual(param, {
        "_id": "/"
      }, "get attachments called");
      return {
        "_id": "/",
        "_attachments": {
          "bar": {},
          "foobar": {}
        }
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

}(jIO, QUnit, Blob));
