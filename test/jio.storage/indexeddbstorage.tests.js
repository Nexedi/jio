/*jslint nomen: true */
/*global indexedDB, Blob, sinon, IDBDatabase,
         IDBTransaction, IDBIndex, IDBObjectStore, IDBCursor, IDBKeyRange*/
(function (jIO, QUnit, indexedDB, Blob, sinon, IDBDatabase,
           IDBTransaction, IDBIndex, IDBObjectStore, IDBCursor, IDBKeyRange) {
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
    j;

  for (j = 0; j < 3000000; j += 1) {
    big_string += "a";
  }

  function deleteIndexedDB(storage) {
    return new RSVP.Queue()
      .push(function () {
        function resolver(resolve, reject) {
          var request = indexedDB.deleteDatabase(
            storage.__storage._database_name
          );
          request.onerror = reject;
          request.onblocked = reject;
          request.onsuccess = resolve;
        }
        return new RSVP.Promise(resolver);
      });
  }

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.constructor");
  test("default unite value", function () {
    var jio = jIO.createJIO({
      type: "indexeddb",
      database: "qunit"
    });

    equal(jio.__type, "indexeddb");
    deepEqual(jio.__storage._database_name, "jio:qunit");
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.hasCapacity");
  test("can list documents", function () {
    var jio = jIO.createJIO({
      type: "indexeddb",
      database: "qunit"
    });

    ok(jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.buildQuery", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
      this.spy_open = sinon.spy(indexedDB, "open");
      this.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                        "createObjectStore");
      this.spy_transaction = sinon.spy(IDBDatabase.prototype, "transaction");
      this.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
      this.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
      this.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                        "createIndex");
      this.spy_key_cursor = sinon.spy(IDBIndex.prototype, "openKeyCursor");
      this.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
    },
    teardown: function () {
      this.spy_open.restore();
      delete this.spy_open;
      this.spy_create_store.restore();
      delete this.spy_create_store;
      this.spy_transaction.restore();
      delete this.spy_transaction;
      this.spy_store.restore();
      delete this.spy_store;
      this.spy_index.restore();
      delete this.spy_index;
      this.spy_create_index.restore();
      delete this.spy_create_index;
      this.spy_key_cursor.restore();
      delete this.spy_key_cursor;
      this.spy_cursor.restore();
      delete this.spy_cursor;
    }
  });

  test("spy indexedDB usage", function () {
    var context = this;
    stop();
    expect(31);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 3,
              "createObjectStore count");

        equal(context.spy_create_store.firstCall.args[0], "metadata",
              "first createObjectStore first argument");
        deepEqual(context.spy_create_store.firstCall.args[1],
                  {keyPath: "_id", autoIncrement: false},
                  "first createObjectStore second argument");

        equal(context.spy_create_store.secondCall.args[0], "attachment",
              "second createObjectStore first argument");
        deepEqual(context.spy_create_store.secondCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "second createObjectStore second argument");

        equal(context.spy_create_store.thirdCall.args[0], "blob",
              "third createObjectStore first argument");
        deepEqual(context.spy_create_store.thirdCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "third createObjectStore second argument");

        equal(context.spy_create_index.callCount, 4, "createIndex count");

        equal(context.spy_create_index.firstCall.args[0], "_id",
              "first createIndex first argument");
        equal(context.spy_create_index.firstCall.args[1], "_id",
              "first createIndex second argument");
        deepEqual(context.spy_create_index.firstCall.args[2], {unique: true},
                  "first createIndex third argument");

        equal(context.spy_create_index.secondCall.args[0], "_id",
              "second createIndex first argument");
        equal(context.spy_create_index.secondCall.args[1], "_id",
              "second createIndex second argument");
        deepEqual(context.spy_create_index.secondCall.args[2], {unique: false},
                  "second createIndex third argument");

        equal(context.spy_create_index.thirdCall.args[0], "_id_attachment",
              "third createIndex first argument");
        deepEqual(context.spy_create_index.thirdCall.args[1],
                  ["_id", "_attachment"],
                  "third createIndex second argument");
        deepEqual(context.spy_create_index.thirdCall.args[2],
                  {unique: false},
                  "third createIndex third argument");

        equal(context.spy_create_index.getCall(3).args[0], "_id",
              "fourth createIndex first argument");
        equal(context.spy_create_index.getCall(3).args[1], "_id",
                  "fourth createIndex second argument");
        deepEqual(context.spy_create_index.getCall(3).args[2], {unique: false},
                  "fourth createIndex third argument");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0], ["metadata"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);
        deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");

        ok(context.spy_key_cursor.calledOnce, "key_cursor count " +
           context.spy_key_cursor.callCount);
        equal(context.spy_cursor.callCount, 0, "cursor count " +
           context.spy_cursor.callCount);

      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("spy indexedDB usage with include_docs", function () {
    var context = this;
    stop();
    expect(31);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 3,
              "createObjectStore count");

        equal(context.spy_create_store.firstCall.args[0], "metadata",
              "first createObjectStore first argument");
        deepEqual(context.spy_create_store.firstCall.args[1],
                  {keyPath: "_id", autoIncrement: false},
                  "first createObjectStore second argument");

        equal(context.spy_create_store.secondCall.args[0], "attachment",
              "second createObjectStore first argument");
        deepEqual(context.spy_create_store.secondCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "second createObjectStore second argument");

        equal(context.spy_create_store.thirdCall.args[0], "blob",
              "third createObjectStore first argument");
        deepEqual(context.spy_create_store.thirdCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "third createObjectStore second argument");

        equal(context.spy_create_index.callCount, 4, "createIndex count");

        equal(context.spy_create_index.firstCall.args[0], "_id",
              "first createIndex first argument");
        equal(context.spy_create_index.firstCall.args[1], "_id",
              "first createIndex second argument");
        deepEqual(context.spy_create_index.firstCall.args[2], {unique: true},
                  "first createIndex third argument");

        equal(context.spy_create_index.secondCall.args[0], "_id",
              "second createIndex first argument");
        equal(context.spy_create_index.secondCall.args[1], "_id",
              "second createIndex second argument");
        deepEqual(context.spy_create_index.secondCall.args[2], {unique: false},
                  "second createIndex third argument");

        equal(context.spy_create_index.thirdCall.args[0], "_id_attachment",
              "third createIndex first argument");
        deepEqual(context.spy_create_index.thirdCall.args[1],
                  ["_id", "_attachment"],
                  "third createIndex second argument");
        deepEqual(context.spy_create_index.thirdCall.args[2],
                  {unique: false},
                  "third createIndex third argument");

        equal(context.spy_create_index.getCall(3).args[0], "_id",
              "fourth createIndex first argument");
        equal(context.spy_create_index.getCall(3).args[1], "_id",
                  "fourth createIndex second argument");
        deepEqual(context.spy_create_index.getCall(3).args[2], {unique: false},
                  "fourth createIndex third argument");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0], ["metadata"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);
        deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");

        equal(context.spy_key_cursor.callCount, 0, "key_cursor count " +
           context.spy_key_cursor.callCount);
        ok(context.spy_cursor.calledOnce, "cursor count " +
           context.spy_cursor.callCount);

      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("empty result", function () {
    var context = this;
    stop();
    expect(1);

    deleteIndexedDB(context.jio)
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

    deleteIndexedDB(context.jio)
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

    deleteIndexedDB(context.jio)
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
  // indexeddbStorage.get
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function () {
    var context = this;
    stop();
    expect(10);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        context.spy_get = sinon.spy(IDBObjectStore.prototype, "get");

        return context.jio.get("foo");
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata"], "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        ok(context.spy_get.calledOnce, "index count " +
           context.spy_get.callCount);
        deepEqual(context.spy_get.firstCall.args[0], "foo",
                  "get first argument");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_get.restore();
        delete context.spy_get;
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    var context = this;
    stop();
    expect(3);

    deleteIndexedDB(context.jio)
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

    deleteIndexedDB(context.jio)
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

    deleteIndexedDB(context.jio)
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
  // indexeddbStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.allAttachments", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function () {
    var context = this;
    stop();
    expect(17);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        context.spy_get = sinon.spy(IDBObjectStore.prototype, "get");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.allAttachments("foo");
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        equal(context.spy_create_index.callCount, 0, "createIndex count");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata", "attachment"], "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        ok(context.spy_store.calledTwice, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");
        deepEqual(context.spy_store.secondCall.args[0], "attachment",
                  "store first argument");

        ok(context.spy_get.calledOnce, "index count " +
           context.spy_get.callCount);
        deepEqual(context.spy_get.firstCall.args[0], "foo",
                  "get first argument");

        ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);
        deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");

        ok(context.spy_cursor.calledOnce, "cursor count " +
           context.spy_cursor.callCount);

        ok(context.spy_key_range.calledOnce, "key range count " +
           context.spy_key_range.callCount);
        deepEqual(context.spy_key_range.firstCall.args[0], "foo",
                  "key range first argument");
      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_get.restore();
        delete context.spy_get;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    var context = this;
    stop();
    expect(3);

    deleteIndexedDB(context.jio)
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

    deleteIndexedDB(context.jio)
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

    deleteIndexedDB(context.jio)
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
  // indexeddbStorage.put
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function () {
    var context = this;
    stop();
    expect(32);

    deleteIndexedDB(context.jio)
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        context.spy_put = sinon.spy(IDBObjectStore.prototype, "put");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 3,
              "createObjectStore count");

        equal(context.spy_create_store.firstCall.args[0], "metadata",
              "first createObjectStore first argument");
        deepEqual(context.spy_create_store.firstCall.args[1],
                  {keyPath: "_id", autoIncrement: false},
                  "first createObjectStore second argument");

        equal(context.spy_create_store.secondCall.args[0], "attachment",
              "second createObjectStore first argument");
        deepEqual(context.spy_create_store.secondCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "second createObjectStore second argument");

        equal(context.spy_create_store.thirdCall.args[0], "blob",
              "third createObjectStore first argument");
        deepEqual(context.spy_create_store.thirdCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "third createObjectStore second argument");

        equal(context.spy_create_index.callCount, 4, "createIndex count");

        equal(context.spy_create_index.firstCall.args[0], "_id",
              "first createIndex first argument");
        equal(context.spy_create_index.firstCall.args[1], "_id",
              "first createIndex second argument");
        deepEqual(context.spy_create_index.firstCall.args[2], {unique: true},
                  "first createIndex third argument");

        equal(context.spy_create_index.secondCall.args[0], "_id",
              "second createIndex first argument");
        equal(context.spy_create_index.secondCall.args[1], "_id",
              "second createIndex second argument");
        deepEqual(context.spy_create_index.secondCall.args[2],
                  {unique: false},
                  "second createIndex third argument");

        equal(context.spy_create_index.thirdCall.args[0], "_id_attachment",
              "third createIndex first argument");
        deepEqual(context.spy_create_index.thirdCall.args[1],
                  ["_id", "_attachment"],
                  "third createIndex second argument");
        deepEqual(context.spy_create_index.thirdCall.args[2], {unique: false},
                  "third createIndex third argument");

        equal(context.spy_create_index.getCall(3).args[0], "_id",
              "fourth createIndex first argument");
        equal(context.spy_create_index.getCall(3).args[1], "_id",
                  "fourth createIndex second argument");
        deepEqual(context.spy_create_index.getCall(3).args[2], {unique: false},
                  "fourth createIndex third argument");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0], ["metadata"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        ok(context.spy_put.calledOnce, "put count " +
           context.spy_put.callCount);
        deepEqual(context.spy_put.firstCall.args[0],
                  {"_id": "foo", doc: {title: "bar"}},
                  "put first argument");

        ok(!context.spy_index.called, "index count " +
           context.spy_index.callCount);

        ok(!context.spy_cursor.called, "cursor count " +
           context.spy_cursor.callCount);

        ok(!context.spy_key_range.called, "key range count " +
           context.spy_key_range.callCount);

      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_put.restore();
        delete context.spy_put;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put document", function () {
    var context = this;
    stop();
    expect(1);

    deleteIndexedDB(context.jio)
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
  // indexeddbStorage.remove
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.remove", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage with one document", function () {
    var context = this;
    stop();
    expect(21);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        context.spy_delete = sinon.spy(IDBObjectStore.prototype, "delete");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.remove("foo");
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        equal(context.spy_create_index.callCount, 0, "createIndex count");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata", "attachment", "blob"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        equal(context.spy_store.callCount, 3, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");
        deepEqual(context.spy_store.secondCall.args[0], "attachment",
                  "store first argument");
        deepEqual(context.spy_store.thirdCall.args[0], "blob",
                  "store first argument");

        ok(context.spy_delete.calledOnce, "delete count " +
           context.spy_delete.callCount);
        deepEqual(context.spy_delete.firstCall.args[0], "foo",
                  "delete first argument");

        ok(context.spy_index.calledTwice, "index count " +
           context.spy_index.callCount);
        deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");
        deepEqual(context.spy_index.secondCall.args[0], "_id",
                  "index first argument");

        ok(context.spy_cursor.calledTwice, "cursor count " +
           context.spy_cursor.callCount);
        equal(context.spy_cursor_delete.callCount, 0, "cursor count " +
           context.spy_cursor_delete.callCount);

        ok(context.spy_key_range.calledTwice, "key range count " +
           context.spy_key_range.callCount);
        deepEqual(context.spy_key_range.firstCall.args[0], "foo",
                  "key range first argument");
        deepEqual(context.spy_key_range.secondCall.args[0], "foo",
                  "key range first argument");

      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_delete.restore();
        delete context.spy_delete;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("spy indexedDB usage with 2 attachments", function () {
    var context = this;
    stop();
    expect(21);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return RSVP.all([
          context.jio.putAttachment("foo", "attachment1", "bar"),
          context.jio.putAttachment("foo", "attachment2", "bar2")
        ]);
      })
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        context.spy_delete = sinon.spy(IDBObjectStore.prototype, "delete");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.remove("foo");
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 0, "createObjectStore count");
        equal(context.spy_create_index.callCount, 0, "createIndex count");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata", "attachment", "blob"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        equal(context.spy_store.callCount, 3, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");
        deepEqual(context.spy_store.secondCall.args[0], "attachment",
                  "store first argument");
        deepEqual(context.spy_store.thirdCall.args[0], "blob",
                  "store first argument");

        equal(context.spy_delete.callCount, 1, "delete count " +
           context.spy_delete.callCount);
        deepEqual(context.spy_delete.firstCall.args[0], "foo",
                  "delete first argument");

        ok(context.spy_index.calledTwice, "index count " +
           context.spy_index.callCount);
        deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");
        deepEqual(context.spy_index.secondCall.args[0], "_id",
                  "index first argument");

        ok(context.spy_cursor.calledTwice, "cursor count " +
           context.spy_cursor.callCount);

        equal(context.spy_cursor_delete.callCount, 4, "cursor count " +
           context.spy_cursor_delete.callCount);

        ok(context.spy_key_range.calledTwice, "key range count " +
           context.spy_key_range.callCount);
        deepEqual(context.spy_key_range.firstCall.args[0], "foo",
                  "key range first argument");
        deepEqual(context.spy_key_range.secondCall.args[0], "foo",
                  "key range first argument");

      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_delete.restore();
        delete context.spy_delete;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.getAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(15);


    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        context.spy_get = sinon.spy(IDBObjectStore.prototype, "get");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");

        return context.jio.getAttachment("foo", attachment);
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        equal(context.spy_create_index.callCount, 0, "createIndex count");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0],
                  ["attachment", "blob"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        equal(context.spy_store.callCount, 2, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "attachment",
                  "store first argument");
        deepEqual(context.spy_store.secondCall.args[0], "blob",
                  "store first argument");

        equal(context.spy_get.callCount, 3, "get count " +
           context.spy_get.callCount);
        deepEqual(context.spy_get.firstCall.args[0], "foo_attachment",
                  "get first argument");
        deepEqual(context.spy_get.secondCall.args[0], "foo_attachment_0",
                  "get first argument");
        deepEqual(context.spy_get.thirdCall.args[0], "foo_attachment_1",
                  "get first argument");

        ok(!context.spy_index.called, "index count " +
           context.spy_index.callCount);
      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_get.restore();
        delete context.spy_get;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
      })
      .fail(function (error) {
        ok(false, error);
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

    deleteIndexedDB(context.jio)
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

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment,
                                         {"start": 1999995, "end": 2000005});
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
  // indexeddbStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.removeAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(17);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype,
                                      "objectStore");
        context.spy_delete = sinon.spy(IDBObjectStore.prototype, "delete");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.removeAttachment("foo", attachment);
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        equal(context.spy_create_index.callCount, 0,
              "createIndex count");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0],
                  ["attachment", "blob"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        equal(context.spy_store.callCount, 2, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "attachment",
                  "store first argument");
        deepEqual(context.spy_store.secondCall.args[0], "blob",
                  "store first argument");

        equal(context.spy_delete.callCount, 1, "delete count " +
           context.spy_delete.callCount);
        deepEqual(context.spy_delete.firstCall.args[0], "foo_attachment",
                  "delete first argument");

        ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);

        ok(context.spy_cursor.calledOnce, "cursor count " +
           context.spy_cursor.callCount);
        equal(context.spy_cursor_delete.callCount, 2, "cursor count " +
           context.spy_cursor_delete.callCount);

        ok(context.spy_key_range.calledOnce, "key range count " +
           context.spy_key_range.callCount);
        deepEqual(context.spy_key_range.firstCall.args[0],
                  ["foo", "attachment"],
                  "key range first argument");
      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_delete.restore();
        delete context.spy_delete;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function () {
    var context = this,
      attachment = "attachment";
    stop();
    expect(23);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        context.spy_open = sinon.spy(indexedDB, "open");
        context.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                             "createObjectStore");
        context.spy_transaction = sinon.spy(IDBDatabase.prototype,
                                            "transaction");
        context.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        context.spy_delete = sinon.spy(IDBObjectStore.prototype, "delete");
        context.spy_put = sinon.spy(IDBObjectStore.prototype, "put");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        equal(context.spy_create_index.callCount, 0,
              "createIndex count");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0],
                  ["attachment", "blob"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        equal(context.spy_store.callCount, 4, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "attachment",
                  "store first argument");
        deepEqual(context.spy_store.secondCall.args[0], "blob",
                  "store first argument");
        deepEqual(context.spy_store.thirdCall.args[0], "attachment",
                  "store first argument");
        deepEqual(context.spy_store.getCall(3).args[0], "blob",
                  "store first argument");

        equal(context.spy_delete.callCount, 1, "delete count " +
           context.spy_delete.callCount);
        deepEqual(context.spy_delete.firstCall.args[0], "foo_attachment",
                  "delete first argument");

        ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);

        ok(context.spy_cursor.calledOnce, "cursor count " +
           context.spy_cursor.callCount);
        equal(context.spy_cursor_delete.callCount, 0, "delete count " +
           context.spy_cursor_delete.callCount);
        ok(context.spy_key_range.calledOnce, "key range count " +
           context.spy_key_range.callCount);
        deepEqual(context.spy_key_range.firstCall.args[0],
                  ["foo", "attachment"],
                  "key range first argument");

        equal(context.spy_put.callCount, 3, "put count " +
           context.spy_put.callCount);
        deepEqual(context.spy_put.firstCall.args[0], {
          "_attachment": "attachment",
          "_id": "foo",
          "_key_path": "foo_attachment",
          "info": {
            "content_type": "text/plain;charset=utf-8",
            "length": 3000000
          }
        }, "put first argument");
        delete context.spy_put.secondCall.args[0].blob;
        // XXX Check blob content
        deepEqual(context.spy_put.secondCall.args[0], {
          "_attachment": "attachment",
          "_id": "foo",
          "_part": 0,
          "_key_path": "foo_attachment_0"
        }, "put first argument");
        delete context.spy_put.thirdCall.args[0].blob;
        // XXX Check blob content
        deepEqual(context.spy_put.thirdCall.args[0], {
          "_attachment": "attachment",
          "_id": "foo",
          "_part": 1,
          "_key_path": "foo_attachment_1"
        }, "put first argument");
      })
      .always(function () {
        context.spy_open.restore();
        delete context.spy_open;
        context.spy_create_store.restore();
        delete context.spy_create_store;
        context.spy_transaction.restore();
        delete context.spy_transaction;
        context.spy_store.restore();
        delete context.spy_store;
        context.spy_delete.restore();
        delete context.spy_delete;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, indexedDB, Blob, sinon, IDBDatabase,
  IDBTransaction, IDBIndex, IDBObjectStore, IDBCursor, IDBKeyRange));
