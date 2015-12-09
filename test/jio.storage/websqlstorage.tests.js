/*jslint nomen: true */
/*global openDatabase, Blob, sinon*/
(function (jIO, QUnit, openDatabase, Blob, sinon) {
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

  function getSpy() {
    return new RSVP.Promise(function (resolve, reject) {
      var spy;
      db.transaction(function (tx) {
        spy = sinon.spy(tx.constructor.prototype, "executeSql");
        resolve(spy);
      }, reject);
    });
  }

  function exec(transac, args) {
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

  function spyStorageCreation(context) {
    var seven = false;
    if (context.spy.callCount >= 5) {
      seven = true;
    }
    equal(seven, true);
 /*   equal(context.spy.args[0][0],
          'SELECT name FROM sqlite_master WHERE type ="table" ' +
          'AND name != "__WebKitDatabaseInfoTable__"');
    equal(context.spy.args[1][0], 'DELETE FROM documents');
    equal(context.spy.args[2][0], 'DELETE FROM metadata');
    equal(context.spy.args[3][0], 'DELETE FROM attachment');
    equal(context.spy.args[4][0], 'DELETE FROM blob');
*/
    equal(context.spy.args[0][0],
          'CREATE TABLE IF NOT EXISTS documents(id VARCHAR PRIMARY ' +
          'KEY NOT NULL, data TEXT)');
    equal(context.spy.args[1][0],
          'CREATE TABLE IF NOT EXISTS attachment(id VARCHAR, attachment' +
          ' VARCHAR, CONSTRAINT un_id_attachment UNIQUE (id, attachment))');
    equal(context.spy.args[2][0],
          'CREATE TABLE IF NOT EXISTS blob(id VARCHAR, attachment' +
          ' VARCHAR, part INT, blob TEXT)');
    equal(context.spy.args[3][0],
          'CREATE TRIGGER IF NOT EXISTS jIOremove BEFORE DELETE ON ' +
          'documents FOR EACH ROW BEGIN DELETE FROM attachment ' +
          'WHERE id = OLD.id;END;');
    equal(context.spy.args[4][0],
          'CREATE TRIGGER IF NOT EXISTS jIOremoveAttachment BEFORE DELETE ON ' +
          'attachment FOR EACH ROW BEGIN DELETE from blob WHERE id = OLD.id ' +
          'AND attachment = OLD.attachment;END;');
  }

  function deleteRow(it, queue, result) {
    queue.push(function () {
      return exec("DELETE FROM "  + result.rows[it].name);
    });
  }

  function deleteWebsql() {
    return new RSVP.Queue()
      .push(function () {

        return exec('SELECT name FROM sqlite_master WHERE' +
                    ' type ="table" AND name != "__WebKitDatabaseInfoTable__"');
      })
      .push(function (result) {
        var i,
          len = result.rows.length,
          queue = new RSVP.Queue();

        for (i = 0; i < len; i += 1) {
          deleteRow(i, queue, result);
        }
        return queue;
      });
  }

  for (j = 0; j < 40; j += 1) {
    big_string += "a";
  }


  /////////////////////////////////////////////////////////////////
  // websqlStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.constructor", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("creation of the storage", function () {
    var context = this;

    stop();
    expect(1);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        equal(context.jio.__type, "websql");
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // websqlStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.hasCapacity", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("can list documents", function () {
    var context = this;

    stop();
    expect(1);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        ok(context.jio.hasCapacity("list"));
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
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
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage", function () {
    var context = this;
    stop();
    expect(8);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function () {
        equal(context.spy.args[5][0], 'SELECT id FROM documents ORDER BY id');
        deepEqual(context.spy.args[5][1], []);
        spyStorageCreation(context);
        return;
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });

  test("spy webSQL usage with include_docs", function () {
    var context = this;
    stop();
    expect(8);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function () {
        equal(context.spy.args[5][0],
              'SELECT id, data AS doc FROM documents ORDER BY id');
        deepEqual(context.spy.args[5][1], []);
        spyStorageCreation(context);
        return;
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });

  test("empty result", function () {
    var context = this;
    stop();
    expect(1);

    context.spy.then(function (value) {
      context.spy = value;
    })
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        deepEqual(result, {
          "data": {
            "rows": [
            ],
            "total_rows": 0
          }
        });
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });

  test("list all documents", function () {
    var context = this;
    stop();
    expect(1);

    context.spy.then(function (value) {
      context.spy = value;
    })
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
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  test("handle include_docs", function () {
    var context = this;
    stop();
    expect(1);

    context.spy.then(function (value) {
      context.spy = value;
    })
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
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  module("websqlStorage.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit"
      });
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage", function () {
    var context = this;
    stop();
    expect(10);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.get("foo");
      })
      .then(function () {
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1], ['foo', '{"title":"bar"}']);
        equal(context.spy.args[6][0],
              'SELECT data FROM documents WHERE id = ?');
        deepEqual(context.spy.args[6][1], ['foo']);
        spyStorageCreation(context);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  test("get inexistent document", function () {
    var context = this;
    stop();
    expect(3);

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage", function () {
    var context = this;
    stop();
    expect(12);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.allAttachments("foo");
      })
      .then(function () {
        spyStorageCreation(context);
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1], ['foo', '{"title":"bar"}']);
        equal(context.spy.args[6][0],
              'SELECT id FROM documents WHERE id = ?');
        deepEqual(context.spy.args[6][1], ['foo']);
        equal(context.spy.args[7][0],
              'SELECT attachment FROM attachment WHERE id = ?');
        deepEqual(context.spy.args[7][1], ['foo']);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    var context = this;
    stop();
    expect(3);

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage", function () {
    var context = this;
    stop();
    expect(8);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.allAttachments("foo");
      })
      .then(function () {
        spyStorageCreation(context);
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1], ['foo', '{"title":"bar"}']);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  test("put document", function () {
    var context = this;
    stop();
    expect(1);

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage with one document", function () {
    var context = this;
    stop();
    expect(10);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.remove("foo");
      })
      .then(function () {
        spyStorageCreation(context);
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1], ['foo', '{"title":"bar"}']);
        equal(context.spy.args[6][0], 'DELETE FROM documents WHERE id = ?');
        deepEqual(context.spy.args[6][1], ['foo']);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });

  test("spy webSQL usage with two attachments", function () {
    var context = this;
    stop();
    expect(30);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", "attachment1", "bar");
      })
      .then(function () {
        return context.jio.putAttachment("foo", "attachment2", "bar2");
      })
      .then(function () {
        return context.jio.remove("foo");
      })
      .then(function () {
        spyStorageCreation(context);
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1], ['foo', '{"title":"bar"}']);
        equal(context.spy.args[6][0],
              'SELECT id FROM documents WHERE id = ?');
        deepEqual(context.spy.args[6][1], ['foo']);
        equal(context.spy.args[7][0],
              'INSERT OR REPLACE INTO attachment(id, attachment) VALUES(?, ?)');
        deepEqual(context.spy.args[7][1], ['foo', 'attachment1']);

        equal(context.spy.args[8][0],
              'DELETE FROM blob WHERE id = ? AND attachment = ?');
        deepEqual(context.spy.args[8][1], ['foo', 'attachment1']);
        equal(context.spy.args[9][0],
              'INSERT INTO blob(id, attachment, ' +
              'part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[9][1],
                  ['foo', 'attachment1', -1, 'text/plain;charset=utf-8']);
        equal(context.spy.args[10][0],
              'INSERT INTO blob(id, attachment, part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[10][1],
                  ['foo', 'attachment1', 0, 'data:;base64,YmFy']);
        equal(context.spy.args[11][0],
              'SELECT id FROM documents WHERE id = ?');
        deepEqual(context.spy.args[11][1], ['foo']);
        equal(context.spy.args[12][0],
              'INSERT OR REPLACE INTO attachment(id, attachment) VALUES(?, ?)');
        deepEqual(context.spy.args[12][1], ['foo', 'attachment2']);
        equal(context.spy.args[13][0],
               'DELETE FROM blob WHERE id = ? AND attachment = ?');
        deepEqual(context.spy.args[13][1], ['foo', 'attachment2']);
        equal(context.spy.args[14][0],
              'INSERT INTO blob(id, attachment, ' +
              'part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[14][1],
                  ['foo', 'attachment2', -1, 'text/plain;charset=utf-8']);
        equal(context.spy.args[15][0],
              'INSERT INTO blob(id, attachment, part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[15][1],
                  ['foo', 'attachment2', 0, 'data:;base64,YmFyMg==']);
        equal(context.spy.args[16][0], 'DELETE FROM documents WHERE id = ?');
        deepEqual(context.spy.args[16][1], ['foo']);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  test("remove document", function () {
    var context = this;

    stop();
    expect(3);

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
      .then(function () {
        return context.jio.put("foo", {});
      })
      .then(function () {
        return exec("SELECT id FROM documents", []);
      })
      .then(function (selectResult) {
        equal(selectResult.rows.length, 1, "putAttachment done");
      })
      .then(function () {
        return context.jio.remove("foo");
      })
      .then(function (result) {
        equal(result, "foo");
        return exec("SELECT id FROM documents", []);
      })
      .then(function (selectResult) {
        equal(selectResult.rows.length, 0, "remove done");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

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
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage", function () {
    var context = this;
    stop();
    expect(22);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", "attachment", big_string);
      })
      .then(function () {
        return context.jio.getAttachment("foo", "attachment");
      })
      .then(function () {
        spyStorageCreation(context);
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1],
                  ['foo', '{"title":"bar"}']);
        equal(context.spy.args[6][0],
              'SELECT id FROM documents WHERE id = ?');
        deepEqual(context.spy.args[6][1], ['foo']);
        equal(context.spy.args[7][0],
              'INSERT OR REPLACE INTO attachment(id, attachment) VALUES(?, ?)');
        deepEqual(context.spy.args[7][1], ['foo', 'attachment']);
        equal(context.spy.args[8][0],
              'DELETE FROM blob WHERE id = ? AND attachment = ?');
        deepEqual(context.spy.args[8][1], ['foo', 'attachment']);
        equal(context.spy.args[9][0],
              'INSERT INTO blob(id, attachment, part, blob)' +
              'VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[9][1],
                  ['foo', 'attachment', -1, 'text/plain;charset=utf-8']);
        equal(context.spy.args[10][0],
              'INSERT INTO blob(id, attachment, part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[10][1],
                  ['foo', 'attachment', 0,
                   'data:;base64,YWFhYWFhYWFhYWFhYWFhYWFhYWE=']);
        equal(context.spy.args[11][0],
              'INSERT INTO blob(id, attachment, part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[11][1],
                  ['foo', 'attachment', 1,
                   'data:;base64,YWFhYWFhYWFhYWFhYWFhYWFhYWE=']);
        equal(context.spy.args[12][0],
              'SELECT part, blob FROM blob WHERE id = ? ' +
              'AND attachment = ? AND part >= ?');
        deepEqual(context.spy.args[12][1], ['foo', 'attachment', -1]);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  test("check result", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(3);

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
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
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage", function () {
    var context = this;
    stop();
    expect(20);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", "attachment", big_string);
      })
      .then(function () {
        return context.jio.removeAttachment("foo", "attachment");
      })
      .then(function () {
        spyStorageCreation(context);
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1],
                  ['foo', '{"title":"bar"}']);
        equal(context.spy.args[6][0],
              'SELECT id FROM documents WHERE id = ?');
        deepEqual(context.spy.args[6][1], ['foo']);
        equal(context.spy.args[7][0],
              'INSERT OR REPLACE INTO attachment(id, attachment) VALUES(?, ?)');
        deepEqual(context.spy.args[7][1], ['foo', 'attachment']);
        equal(context.spy.args[8][0],
              'DELETE FROM blob WHERE id = ? AND attachment = ?');
        deepEqual(context.spy.args[8][1], ['foo', 'attachment']);
        equal(context.spy.args[9][0],
              'INSERT INTO blob(id, attachment, part, blob)' +
              'VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[9][1],
                  ['foo', 'attachment', -1, 'text/plain;charset=utf-8']);
        equal(context.spy.args[10][0],
              'INSERT INTO blob(id, attachment, part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[10][1],
                  ['foo', 'attachment', 0,
                   "data:;base64,YWFhYWFhYWFhYWFhYWFhYWF" +
                   "hYWFhYWFhYWFhYWFhYWFhYWFhYWFhYQ=="]);
        equal(context.spy.args[11][0],
              'DELETE FROM attachment WHERE id = ? AND attachment = ?');
        deepEqual(context.spy.args[11][1], ['foo', 'attachment']);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  test("remove attachment", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(3);

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        return exec("SELECT id, attachment FROM attachment UNION ALL" +
                    " SELECT id, attachment FROM blob", []);
      })
      .then(function (selectResult) {
        equal(selectResult.rows.length, 3, "putAttachment done");
      })
      .then(function () {
        return context.jio.removeAttachment("foo", attachment);
      })
      .then(function (result) {
        equal(result, attachment);
        return exec("SELECT id, attachment FROM attachment UNION ALL" +
                    " SELECT id, attachment FROM blob", []);
      })
      .then(function (selectResult) {
        equal(selectResult.rows.length, 0, "removeAttachment done");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // websqlStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("websqlStorage.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "websql",
        database: "qunit",
        blob_length: 20
      });
      this.spy = getSpy();
    },
    teardown: function () {
      this.spy.restore();
      delete this.spy;
    }
  });

  test("spy webSQL usage", function () {
    var context = this;
    stop();
    expect(20);
    context.spy.then(function (value) {
      context.spy = value;
      return;
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", "attachment", big_string);
      })
      .then(function () {
        spyStorageCreation(context);
        equal(context.spy.args[5][0],
              'INSERT OR REPLACE INTO documents(id, data) VALUES(?,?)');
        deepEqual(context.spy.args[5][1],
                  ['foo', '{"title":"bar"}']);
        equal(context.spy.args[6][0],
              'SELECT id FROM documents WHERE id = ?');
        deepEqual(context.spy.args[6][1], ['foo']);
        equal(context.spy.args[7][0],
              'INSERT OR REPLACE INTO attachment(id, attachment) VALUES(?, ?)');
        deepEqual(context.spy.args[7][1], ['foo', 'attachment']);
        equal(context.spy.args[8][0],
              'DELETE FROM blob WHERE id = ? AND attachment = ?');
        deepEqual(context.spy.args[8][1], ['foo', 'attachment']);
        equal(context.spy.args[9][0],
              'INSERT INTO blob(id, attachment, part, blob)' +
              'VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[9][1],
                  ['foo', 'attachment', -1, 'text/plain;charset=utf-8']);
        equal(context.spy.args[10][0],
              'INSERT INTO blob(id, attachment, part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[10][1],
                  ['foo', 'attachment', 0,
                   'data:;base64,YWFhYWFhYWFhYWFhYWFhYWFhYWE=']);
        equal(context.spy.args[11][0],
              'INSERT INTO blob(id, attachment, part, blob)VALUES(?, ?, ?, ?)');
        deepEqual(context.spy.args[11][1],
                  ['foo', 'attachment', 1,
                   'data:;base64,YWFhYWFhYWFhYWFhYWFhYWFhYWE=']);
      })
      .then(function () {
        return deleteWebsql();
      })
      .fail(function (error) {
        ok(false, error);
        return deleteWebsql();
      })
      .always(function () {
        start();
      });
  });


  test("put attachment", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(2);

    context.spy.then(function (value) {
      context.spy = value;
      return deleteWebsql();
    })
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        return exec("SELECT id, attachment FROM attachment UNION ALL" +
                    " SELECT id, attachment FROM blob", []);
      })
      .then(function (selectResult) {
        equal(selectResult.rows.length, 4, "putAttachment done");
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment);
      })
      .then(function (result) {
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, big_string, "attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, openDatabase, Blob, sinon));
