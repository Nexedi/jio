/*jslint nomen: true */
/*global openDatabase, Blob*/
(function (jIO, QUnit, openDatabase, Blob) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    big_string = "",
    db = openDatabase('jio:qunit', '1.0', '', 2 * 1024 * 1024),
    j;

  function exec(db, transac, args) {
    return new RSVP.Promise(function (resolve, reject) {
      db.transaction(function (tx) {
        /*jslint unparam: true*/
        tx.executeSql(transac, args,
                      function (tx, results) {
            resolve(results);
          },
                      function (tx, error) {
            reject(error);
          });
      });
      /*jslint unparam: false*/
    });
  }

  function deleteWebsql() {
    return new RSVP.Queue()
      .push(function () {
        return exec(db, "DELETE FROM documents", []);
      })
      .push(function () {
        return exec(db, "DELETE FROM metadata", []);
      })
      .push(function () {
        return exec(db, "DELETE FROM attachment", []);
      })
      .push(function () {
        return exec(db, "DELETE FROM blob", []);
      });
  }

  for (j = 0; j < 40; j += 1) {
    big_string += "a";
  }


  /////////////////////////////////////////////////////////////////
  // websqlStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.constructor");
  test("default unite value", function () {
    var jio = jIO.createJIO({
      type: "websql",
      database: "qunit"
    });

    equal(jio.__type, "websql");
  });

  /////////////////////////////////////////////////////////////////
  // websqlStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.buildQuery", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
    }
  });

  test("empty result", function () {
    var context = this;
    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return context.jio.allDocs();
      })
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

  test("list all documents", function () {
    var context = this;
    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return RSVP.all([
          context.jio.put("2", {"title": "title2"}),
          context.jio.put("1", {"title": "title1"})
        ]);
      })
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        deepEqual(result, {
          "data": {
            "rows": [{
              "id": "1",
              "value": {}
            }, {
              "id": "2",
              "value": {}
            }],
            "total_rows": 2
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


  test("handle include_docs", function () {
    var context = this;
    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return RSVP.all([
          context.jio.put("2", {"title": "title2"}),
          context.jio.put("1", {"title": "title1"})
        ]);
      })
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function (result) {
        deepEqual(result, {
          "data": {
            "rows": [{
              "id": "1",
              "doc": {"title": "title1"},
              "value": {}
            }, {
              "id": "2",
              "doc": {"title": "title2"},
              "value": {}
            }],
            "total_rows": 2
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
  // websqlStorage.get
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
    }
  });


  test("get inexistent document", function () {
    var context = this;
    stop();
    expect(3);

    deleteWebsql()
      .then(function () {
        return context.jio.get("inexistent");
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function () {
    var id = "/",
      context = this;

    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return context.jio.put(id, {"title": "bar"});
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "bar"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function () {
    var id = "/",
      attachment = "foo",
      context = this;

    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return context.jio.put(id, {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment(id, attachment, "bar");
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "bar"
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
  // websqlStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.allAttachments", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
    }
  });

  test("get inexistent document", function () {
    var context = this;
    stop();
    expect(3);

    deleteWebsql()
      .then(function () {
        return context.jio.allAttachments("inexistent");
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function () {
    var id = "/",
      context = this;
    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return context.jio.put(id, {"title": "bar"});
      })
      .then(function () {
        return context.jio.allAttachments(id);
      })
      .then(function (result) {
        deepEqual(result, {}, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function () {
    var id = "/",
      attachment = "foo",
      context = this;
    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return context.jio.put(id, {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment(id, attachment, "bar");
      })
      .then(function () {
        return context.jio.allAttachments(id);
      })
      .then(function (result) {
        deepEqual(result, {
          "foo": {}
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
  // websqlStorage.put
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
    }
  });

  test("put document", function () {
    var context = this;
    stop();
    expect(1);

    deleteWebsql()
      .then(function () {
        return context.jio.put("inexistent", {});
      })
      .then(function (result) {
        equal(result, "inexistent");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // websqlStorage.remove
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.remove", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
    }
  });

//bientot ici: de beaux tests.

  /////////////////////////////////////////////////////////////////
  // websqlStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.getAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit",
        blob_length: 20
      });
    }
  });

  test("check result", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(3);

    deleteWebsql()
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment);
      })
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        equal(result.type, "text/plain;charset=utf-8");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, big_string,
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("streaming", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(3);

    deleteWebsql()
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment,
                                         {"start": 15, "end": 25});
      })
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        equal(result.type, "application/octet-stream");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = "aaaaaaaaaa";
        equal(result.target.result, expected, "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  /////////////////////////////////////////////////////////////////
  // websqlStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.removeAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
    }
  });
/*
  test("remove attachment", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(3);

    deleteWebsql()
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        exec("SELECT * FROM attachment ")
        return context.jio.getAttachment("foo", attachment,
                                         {"start": 15, "end": 25});
      })
*/


//bientot ici: de beaux tests.

  /////////////////////////////////////////////////////////////////
  // websqlStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
    }
  });

//bientot ici: de beaux tests.
}(jIO, QUnit, openDatabase, Blob));