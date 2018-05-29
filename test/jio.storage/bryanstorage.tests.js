/*jslint nomen: true*/
/*global Blob, jiodate*/
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
  // bryanStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.constructor");
  test("accept parameters", function () {
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "memory");
  });


  /////////////////////////////////////////////////////////////////
  // bryanStorage.get
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    // create storage of type "bryan" with memory as substorage
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });
    jio.put("bar", {"title": "foo"});
    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo",
          "_revision": 0
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo",
          "_revision": 0
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      });
      //.always(function () {
      //  start();
      //});
  });

  /////////////////////////////////////////////////////////////////
  // _revision parameter initialization
  /////////////////////////////////////////////////////////////////
  module("bryanStorage initialize _revision");
  test("verifying _revision updates correctly", function () {
    stop();
    expect(2);

    // create storage of type "bryan" with memory as substorage
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });
    jio.put("bar", {"title": "foo"})
      .push(function (result) {
        equal(result, "bar");
        return jio.get("bar");
      })
      .push(function (result) {
        deepEqual(result, {
          "title": "foo",
          "_revision": 0
        }, "Check document");
      })
      .fail(function (error) {ok(false, error); })
      .always(function () {start(); });
  });


  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with put
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with put");
  test("verifying _revision updates correctly", function () {
    stop();
    expect(1);

    // create storage of type "bryan" with memory as substorage
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {type: "memory"}
    });
    jio.put("bar", {"title": "foo"})
      .push(function () {return jio.put("bar", {"title2": "foo2"}); })
      .push(function () {return jio.put("bar", {"title3": "foo3"}); })
      .push(function () {return jio.get("bar"); })
      .push(function (result) {
        deepEqual(result, {
          "title3": "foo3",
          "_revision": 2
        }, "Check document after initialization");
      })
      .fail(function (error) {ok(false, error); })
      .always(function () {start(); });
  });

  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with putAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with putAttachment");
  test("verifying _revision updates correctly after putAttachment",
    function () {
      stop();
      expect(1);

      // Create storage of type "bryan" with memory as substorage
      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {type: "memory"}
      });

      jio.put("bar", {"title": "foo"})

        // Put two unique attachments in the document
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob",
            new Blob(["text data"], {type: "text/plain"})
          );
        })
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob2",
            new Blob(["more text data"], {type: "text/plain"})
          );
        })

        // Get metadata for document
        .push(function () {return jio.get("bar"); })

        // Verify "_revision" is incremented twice
        .push(function (result) {
          deepEqual(result, {
            "title": "foo",
            "_revision": 2
          }, "Check document after 2 revisions");
        })
        .fail(function (error) {ok(false, error); })
        .always(function () {start(); });
    }
    );

  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with removeAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with removeAttachment");
  test("verifying _revision updates correctly after removeAttachment",
    function () {
      stop();
      expect(1);

      // create storage of type "bryan" with memory as substorage
      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {type: "memory"}
      });

      jio.put("bar", {"title": "foo"})
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob",
            new Blob(["text data"], {type: "text/plain"})
          );
        })
        .push(function () {
          return jio.putAttachment(
            "bar",
            "blob2",
            new Blob(["more text data"], {type: "text/plain"})
          );
        })
        .push(function () {return jio.removeAttachment("bar", "blob"); })
        .push(function () {return jio.removeAttachment("bar", "blob2"); })
        .push(function () {return jio.get("bar"); })
        .push(function (result) {
          deepEqual(result, {
            "title": "foo",
            "_revision": 4
          }, "Check document after 4 revisions");
        })
        .fail(function (error) {ok(false, error); })
        .always(function () {start(); });
    }
    );

  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with RSVP all
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with RSVP all");
  test("verifying _revision updates correctly when puts are done in parallel",
    function () {
      stop();
      expect(1);

      // create storage of type "bryan" with memory as substorage
      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {type: "memory"}
      });

      jio.put("bar", {"title": "foo"});
      RSVP.all(
        jio.put("bar", {"title2": "foo2"}),
        jio.put("bar", {"title3": "foo3"})
      )
        .push(function () {return jio.get("bar"); })
        .push(function (result) {equal(result._revision, 3, "parallel exec"); })
        .fail(function (error) {ok(false, error); })
        .always(function () {start(); });
    });

  /////////////////////////////////////////////////////////////////
  // bryanStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    jio.allAttachments("bar")
      .push(function (result) {
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
  // bryanStorage.post
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    jio.post({"title": "foo"})
      .push(function (result) {
        equal(result, "youhou");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  /////////////////////////////////////////////////////////////////
  // bryanStorage.put
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    // If .put does not give the appropriate return, fail assertion
    jio.put("bar", {"title": "foo"})
      .push(function (result) {
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
  // bryanStorage.remove
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    jio.remove("bar")
      .push(function (result) {
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
  // bryanStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    }),
      blob = new Blob([""]);

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
  // bryanStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    }),
      blob = new Blob([""]);

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
  // bryanStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

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
  // bryanStorage revision history
  /////////////////////////////////////////////////////////////////
  module("bryanStorage revision history");
  test("put and get the correct version", function () {
    stop();
    expect(1);
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "indexeddb",
        database: "db_test1"
      }
    });
    jio.put("doc1", {
      "title": "rev0",
      "subtitle": "subrev0"
    })
      .push(function () {return jio.get("doc1"); })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev0",
          "subtitle": "subrev0",
          "_revision": 0,
          "id": "doc1"
        }, "Retrieve document correctly");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  module("bryanStorage revision history multiple edits");
  test("modify first version but save both", function () {
    stop();
    expect(2);
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "indexeddb",
        database: "db_test2"
      }
    });
    jio.put("other_doc", {
      "attr": "version0",
      "subattr": "subversion0"
    })
      .push(function () {
        return jio.put("other_doc", {
          "attr": "version1",
          "subattr": "subversion1"
        });
      })
      .push(function () {
        return jio.put("main_doc", {
          "title": "rev0",
          "subtitle": "subrev0"
        });
      })
      .push(function () {
        return jio.put("main_doc", {
          "title": "rev1",
          "subtitle": "subrev1"
        });
      })
      .push(function () {
        return jio.put("main_doc", {
          "title": "rev2",
          "subtitle": "subrev2"
        });
      })
      .push(function () {return jio.get("main_doc"); })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev2",
          "subtitle": "subrev2",
          "_revision": 2,
          "id": "main_doc"
        }, "Retrieve main document correctly");
      })
      .push(function () {return jio.get("other_doc"); })
      .push(function (result) {
        deepEqual(result, {
          "attr": "version1",
          "subattr": "subversion1",
          "_revision": 1,
          "id": "other_doc"
        }, "Retrieve other document correctly");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));


