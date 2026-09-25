/*
 * Copyright 2014, Nexedi SA
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
/*global indexedDB, Blob, sinon, IDBDatabase,
         IDBTransaction, IDBIndex, IDBObjectStore, IDBCursor, IDBKeyRange,
         Rusha*/
(function (jIO, QUnit, indexedDB, Blob, sinon, IDBDatabase,
           IDBTransaction, IDBIndex, IDBObjectStore, IDBCursor, IDBKeyRange,
           Rusha) {
  "use strict";
  var test = QUnit.test,
    start,
    global_assert,
    module = QUnit.module,
    big_string = "";

  big_string = new Array(3000000).fill('a').join('');

  function deleteIndexedDB(storage) {
    return new RSVP.Promise(function resolver(resolve, reject) {
      var request = indexedDB.deleteDatabase(
        storage.__storage._database_name
      );
      request.onerror = reject;
      request.onblocked = reject;
      request.onsuccess = resolve;
    });
  }

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.constructor");
  test("default unite value", function (assert) {
    assert.expect(4);
    var jio = jIO.createJIO({
      type: "indexeddb",
      database: "qunit"
    });

    assert.equal(jio.__type, "indexeddb");
    assert.deepEqual(jio.__storage._database_name, "jio:qunit");
    assert.deepEqual(jio.__storage._index_key_list, []);
    assert.deepEqual(jio.__storage._version, undefined);
  });

  test("config", function (assert) {
    assert.expect(4);
    var jio = jIO.createJIO({
      type: "indexeddb",
      database: "qunit",
      version: 1,
      index_key_list: ['a']
    });

    assert.equal(jio.__type, "indexeddb");
    assert.deepEqual(jio.__storage._database_name, "jio:qunit");
    assert.deepEqual(jio.__storage._index_key_list, ['a']);
    assert.deepEqual(jio.__storage._version, 1);
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage DB migration
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.upgradeDB");

  function setupDBMigrationTest(test, old_jio_kw, new_jio_kw, check_callback) {
    // Create a IDB with one document
    // Migrate it to a new version
    // Spy IDB behaviour while getting the previous document
    // Check that doument is still there
    start = global_assert.async();
    old_jio_kw.type = "indexeddb";
    old_jio_kw.database = "qunit";
    new_jio_kw.type = "indexeddb";
    new_jio_kw.database = "qunit";
    test.jio = jIO.createJIO(old_jio_kw);

    return deleteIndexedDB(test.jio)
      .then(function () {
        return test.jio.put('foo', {'a': 1});
      })
      .then(function () {
        test.jio = jIO.createJIO(new_jio_kw);

        test.spy_open = sinon.spy(indexedDB, "open");
        test.spy_create_store = sinon.spy(IDBDatabase.prototype,
                                          "createObjectStore");
        test.spy_transaction = sinon.spy(IDBDatabase.prototype, "transaction");
        test.spy_store = sinon.spy(IDBTransaction.prototype, "objectStore");
        test.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        test.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                          "createIndex");
        test.spy_delete_index = sinon.spy(IDBObjectStore.prototype,
                                          "deleteIndex");
        return test.jio.get('foo');
      })
      .then(function (result) {
        global_assert.deepEqual(result, {'a': 1});
        global_assert.ok(test.spy_transaction.calledOnce, "transaction count " +
           test.spy_transaction.callCount);
        global_assert.deepEqual(test.spy_transaction.firstCall.args[0],
                                ["metadata"], "transaction first argument");
        global_assert.equal(test.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");
      })
      .always(function (param) {
        return check_callback(param);
      })
      .fail(function (error) {
        global_assert.ok(false, error);
      })
      .always(function () {
        test.spy_open.restore();
        delete test.spy_open;
        test.spy_create_store.restore();
        delete test.spy_create_store;
        test.spy_transaction.restore();
        delete test.spy_transaction;
        test.spy_store.restore();
        delete test.spy_store;
        test.spy_index.restore();
        delete test.spy_index;
        test.spy_create_index.restore();
        delete test.spy_create_index;
        test.spy_delete_index.restore();
        delete test.spy_delete_index;

        start();
      });
  }

  test("no change", function (assert) {
    global_assert = assert;
    var context = this;
    assert.expect(10);

    return setupDBMigrationTest(context, {}, {}, function () {
      assert.ok(context.spy_open.calledOnce, "open count " +
         context.spy_open.callCount);
      assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
            "open first argument");

      assert.equal(context.spy_create_store.callCount, 0,
            "createObjectStore count");
      assert.equal(context.spy_store.callCount, 1,
            "objectStore count");
      assert.equal(context.spy_create_index.callCount, 0, "createIndex count");
      assert.equal(context.spy_delete_index.callCount, 0, "deleteIndex count");
    });
  });

  test("version update, no key change", function (assert) {
    global_assert = assert;
    var context = this;
    assert.expect(10);

    return setupDBMigrationTest(context, {}, {version: 2}, function () {
      assert.ok(context.spy_open.calledOnce, "open count " +
         context.spy_open.callCount);
      assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
            "open first argument");

      assert.equal(context.spy_create_store.callCount, 0,
            "createObjectStore count");
      assert.equal(context.spy_store.callCount, 2,
            "objectStore count");
      assert.equal(context.spy_create_index.callCount, 0, "createIndex count");
      assert.equal(context.spy_delete_index.callCount, 0, "deleteIndex count");
    });
  });

  function startsWith(str, prefix) {
    return str.substr(0, prefix.length) === prefix;
  }

  test("version decrease", function (assert) {
    global_assert = assert;
    var context = this;
    assert.expect(3);

    return setupDBMigrationTest(context, {version: 3},
                                {version: 2}, function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 500);
        assert.ok(startsWith(error.message,
                  "Connection to: jio:qunit failed: "));
      });
  });

  test("version increase, key added", function (assert) {
    global_assert = assert;
    var context = this;
    assert.expect(13);

    return setupDBMigrationTest(context, {version: 1, index_key_list: ['a']},
                                {version: 2, index_key_list: ['a', 'b']},
                                function () {
        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_store.callCount, 2,
              "objectStore count");
        assert.equal(context.spy_create_index.callCount, 1,
                     "createIndex count");
        assert.equal(context.spy_create_index.firstCall.args[0], "doc.b",
              "first createIndex first argument");
        assert.equal(context.spy_create_index.firstCall.args[1], "doc.b",
              "first createIndex second argument");
        assert.deepEqual(context.spy_create_index.firstCall.args[2],
                         {unique: false},
                  "first createIndex third argument");

        assert.equal(context.spy_delete_index.callCount, 0,
                     "deleteIndex count");
      });
  });

  test("version increase, key removed", function (assert) {
    global_assert = assert;
    var context = this;
    assert.expect(11);

    return setupDBMigrationTest(context,
                                {version: 1, index_key_list: ['a', 'b']},
                                {version: 2, index_key_list: ['b']},
                                function () {
        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_store.callCount, 2,
              "objectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
                     "createIndex count");

        assert.equal(context.spy_delete_index.callCount, 1,
                     "deleteIndex count");
        assert.equal(context.spy_delete_index.firstCall.args[0], "doc.a",
              "first deleteIndex first argument");
      });
  });

  test("version increase, keys added and removed", function (assert) {
    global_assert = assert;
    var context = this;
    assert.expect(18);

    return setupDBMigrationTest(context,
                                {version: 1, index_key_list: ['a', 'b', 'c']},
                                {version: 2, index_key_list: ['e', 'b', 'f']},
                                function () {
        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_store.callCount, 2,
              "objectStore count");
        assert.equal(context.spy_create_index.callCount, 2,
                     "createIndex count");
        assert.equal(context.spy_create_index.firstCall.args[0], "doc.e",
              "first createIndex first argument");
        assert.equal(context.spy_create_index.firstCall.args[1], "doc.e",
              "first createIndex second argument");
        assert.deepEqual(context.spy_create_index.firstCall.args[2],
                         {unique: false},
                  "first createIndex third argument");

        assert.equal(context.spy_create_index.secondCall.args[0], "doc.f",
              "second createIndex first argument");
        assert.equal(context.spy_create_index.secondCall.args[1], "doc.f",
              "second createIndex second argument");
        assert.deepEqual(context.spy_create_index.secondCall.args[2],
                         {unique: false},
                  "second createIndex third argument");

        assert.equal(context.spy_delete_index.callCount, 2,
                     "deleteIndex count");
        assert.equal(context.spy_delete_index.firstCall.args[0], "doc.a",
              "first deleteIndex first argument");
        assert.equal(context.spy_delete_index.secondCall.args[0], "doc.c",
              "second deleteIndex first argument");
      });
  });


  test("version idem, keys added and removed", function (assert) {
    global_assert = assert;
    var context = this;
    assert.expect(10);

    return setupDBMigrationTest(context,
                                {version: 1, index_key_list: ['a', 'b', 'c']},
                                {version: 1, index_key_list: ['e', 'b', 'f']},
                                function () {
        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_store.callCount, 1,
              "objectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
                     "createIndex count");
        assert.equal(context.spy_delete_index.callCount, 0,
                     "deleteIndex count");
      });
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.hasCapacity");
  test("can list documents", function (assert) {
    assert.expect(2);
    var jio = jIO.createJIO({
      type: "indexeddb",
      database: "qunit"
    });

    assert.ok(jio.hasCapacity("list"));
    assert.ok(jio.hasCapacity("include"));
  });

  test("can not search documents", function (assert) {
    assert.expect(4);
    var jio = jIO.createJIO({
      type: "indexeddb",
      database: "qunit"
    });

    assert.throws(
      function () {
        jio.hasCapacity("query");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'query' is not implemented on 'indexeddb'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.buildQuery", {
    beforeEach: function () {
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
    afterEach: function () {
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

  test("spy indexedDB usage", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(31);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 3,
              "createObjectStore count");

        assert.equal(context.spy_create_store.firstCall.args[0], "metadata",
              "first createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.firstCall.args[1],
                  {keyPath: "_id", autoIncrement: false},
                  "first createObjectStore second argument");

        assert.equal(context.spy_create_store.secondCall.args[0], "attachment",
              "second createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.secondCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "second createObjectStore second argument");

        assert.equal(context.spy_create_store.thirdCall.args[0], "blob",
              "third createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.thirdCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "third createObjectStore second argument");

        assert.equal(context.spy_create_index.callCount, 4,
                     "createIndex count");

        assert.equal(context.spy_create_index.firstCall.args[0], "_id",
              "first createIndex first argument");
        assert.equal(context.spy_create_index.firstCall.args[1], "_id",
              "first createIndex second argument");
        assert.deepEqual(context.spy_create_index.firstCall.args[2],
                         {unique: true},
                  "first createIndex third argument");

        assert.equal(context.spy_create_index.secondCall.args[0], "_id",
              "second createIndex first argument");
        assert.equal(context.spy_create_index.secondCall.args[1], "_id",
              "second createIndex second argument");
        assert.deepEqual(context.spy_create_index.secondCall.args[2],
                         {unique: false},
                  "second createIndex third argument");

        assert.equal(context.spy_create_index.thirdCall.args[0],
                     "_id_attachment",
              "third createIndex first argument");
        assert.deepEqual(context.spy_create_index.thirdCall.args[1],
                  ["_id", "_attachment"],
                  "third createIndex second argument");
        assert.deepEqual(context.spy_create_index.thirdCall.args[2],
                  {unique: false},
                  "third createIndex third argument");

        assert.equal(context.spy_create_index.getCall(3).args[0], "_id",
              "fourth createIndex first argument");
        assert.equal(context.spy_create_index.getCall(3).args[1], "_id",
                  "fourth createIndex second argument");
        assert.deepEqual(context.spy_create_index.getCall(3).args[2],
                         {unique: false},
                  "fourth createIndex third argument");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                         ["metadata"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        assert.ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        assert.ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);
        assert.deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");

        assert.ok(context.spy_key_cursor.calledOnce, "key_cursor count " +
           context.spy_key_cursor.callCount);
        assert.equal(context.spy_cursor.callCount, 0, "cursor count " +
           context.spy_cursor.callCount);

      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("spy indexedDB usage with include_docs", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(31);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 3,
              "createObjectStore count");

        assert.equal(context.spy_create_store.firstCall.args[0], "metadata",
              "first createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.firstCall.args[1],
                  {keyPath: "_id", autoIncrement: false},
                  "first createObjectStore second argument");

        assert.equal(context.spy_create_store.secondCall.args[0], "attachment",
              "second createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.secondCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "second createObjectStore second argument");

        assert.equal(context.spy_create_store.thirdCall.args[0], "blob",
              "third createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.thirdCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "third createObjectStore second argument");

        assert.equal(context.spy_create_index.callCount, 4,
                     "createIndex count");

        assert.equal(context.spy_create_index.firstCall.args[0], "_id",
              "first createIndex first argument");
        assert.equal(context.spy_create_index.firstCall.args[1], "_id",
              "first createIndex second argument");
        assert.deepEqual(context.spy_create_index.firstCall.args[2],
                         {unique: true},
                  "first createIndex third argument");

        assert.equal(context.spy_create_index.secondCall.args[0], "_id",
              "second createIndex first argument");
        assert.equal(context.spy_create_index.secondCall.args[1], "_id",
              "second createIndex second argument");
        assert.deepEqual(context.spy_create_index.secondCall.args[2],
                         {unique: false},
                  "second createIndex third argument");

        assert.equal(context.spy_create_index.thirdCall.args[0],
                     "_id_attachment",
              "third createIndex first argument");
        assert.deepEqual(context.spy_create_index.thirdCall.args[1],
                  ["_id", "_attachment"],
                  "third createIndex second argument");
        assert.deepEqual(context.spy_create_index.thirdCall.args[2],
                  {unique: false},
                  "third createIndex third argument");

        assert.equal(context.spy_create_index.getCall(3).args[0], "_id",
              "fourth createIndex first argument");
        assert.equal(context.spy_create_index.getCall(3).args[1], "_id",
                  "fourth createIndex second argument");
        assert.deepEqual(context.spy_create_index.getCall(3).args[2],
                         {unique: false},
                  "fourth createIndex third argument");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                         ["metadata"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        assert.ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        assert.ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);
        assert.deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");

        assert.equal(context.spy_key_cursor.callCount, 0, "key_cursor count " +
           context.spy_key_cursor.callCount);
        assert.ok(context.spy_cursor.calledOnce, "cursor count " +
           context.spy_cursor.callCount);

      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("empty result", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(1);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        assert.deepEqual(result, {
          "data": {
            "rows": [
            ],
            "total_rows": 0
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

  test("list all documents", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(1);

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
        assert.deepEqual(result, {
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
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("handle include_docs", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(1);

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
        assert.deepEqual(result, {
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
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.get
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.get", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(10);

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

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata"], "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        assert.ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        assert.ok(context.spy_get.calledOnce, "index count " +
           context.spy_get.callCount);
        assert.deepEqual(context.spy_get.firstCall.args[0], "foo",
                  "get first argument");
      })
      .fail(function (error) {
        assert.ok(false, error);
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

  test("get inexistent document", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(3);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.get("inexistent");
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(
          error.message,
          "IndexedDB: cannot find object 'inexistent' in the 'metadata' store"
        );
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function (assert) {
    var id = "/",
      context = this;
    start = assert.async();
    assert.expect(1);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put(id, {"title": "bar"});
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "bar"
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
    var id = "/",
      attachment = "foo",
      context = this;
    start = assert.async();
    assert.expect(1);

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
        assert.deepEqual(result, {
          "title": "bar"
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
  // indexeddbStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.allAttachments", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(18);

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
        context.spy_key_cursor = sinon.spy(IDBIndex.prototype, "openKeyCursor");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.allAttachments("foo");
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
                     "createIndex count");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata", "attachment"], "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        assert.ok(context.spy_store.calledTwice, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");
        assert.deepEqual(context.spy_store.secondCall.args[0], "attachment",
                  "store first argument");

        assert.ok(context.spy_get.calledOnce, "index count " +
           context.spy_get.callCount);
        assert.deepEqual(context.spy_get.firstCall.args[0], "foo",
                  "get first argument");

        assert.ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);
        assert.deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");

        assert.ok(!context.spy_cursor.called, "cursor count " +
           context.spy_cursor.callCount);
        assert.ok(context.spy_key_cursor.calledOnce, "cursor key count " +
           context.spy_key_cursor.callCount);

        assert.ok(context.spy_key_range.calledOnce, "key range count " +
           context.spy_key_range.callCount);
        assert.deepEqual(context.spy_key_range.firstCall.args[0], "foo",
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
        context.spy_key_cursor.restore();
        delete context.spy_key_cursor;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(3);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.allAttachments("inexistent");
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(
          error.message,
          "IndexedDB: cannot find object 'inexistent' in the 'metadata' store"
        );
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function (assert) {
    var id = "/",
      context = this;
    start = assert.async();
    assert.expect(1);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put(id, {"title": "bar"});
      })
      .then(function () {
        return context.jio.allAttachments(id);
      })
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

  test("get document with attachment", function (assert) {
    var id = "/",
      attachment = "foo",
      context = this;
    start = assert.async();
    assert.expect(1);

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
        assert.deepEqual(result, {
          "foo": {}
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
  // indexeddbStorage.put
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.put", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(32);

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

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 3,
              "createObjectStore count");

        assert.equal(context.spy_create_store.firstCall.args[0], "metadata",
              "first createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.firstCall.args[1],
                  {keyPath: "_id", autoIncrement: false},
                  "first createObjectStore second argument");

        assert.equal(context.spy_create_store.secondCall.args[0], "attachment",
              "second createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.secondCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "second createObjectStore second argument");

        assert.equal(context.spy_create_store.thirdCall.args[0], "blob",
              "third createObjectStore first argument");
        assert.deepEqual(context.spy_create_store.thirdCall.args[1],
                  {keyPath: "_key_path", autoIncrement: false},
                  "third createObjectStore second argument");

        assert.equal(context.spy_create_index.callCount, 4,
                     "createIndex count");

        assert.equal(context.spy_create_index.firstCall.args[0], "_id",
              "first createIndex first argument");
        assert.equal(context.spy_create_index.firstCall.args[1], "_id",
              "first createIndex second argument");
        assert.deepEqual(context.spy_create_index.firstCall.args[2],
                         {unique: true},
                  "first createIndex third argument");

        assert.equal(context.spy_create_index.secondCall.args[0], "_id",
              "second createIndex first argument");
        assert.equal(context.spy_create_index.secondCall.args[1], "_id",
              "second createIndex second argument");
        assert.deepEqual(context.spy_create_index.secondCall.args[2],
                  {unique: false},
                  "second createIndex third argument");

        assert.equal(context.spy_create_index.thirdCall.args[0],
                     "_id_attachment",
              "third createIndex first argument");
        assert.deepEqual(context.spy_create_index.thirdCall.args[1],
                  ["_id", "_attachment"],
                  "third createIndex second argument");
        assert.deepEqual(context.spy_create_index.thirdCall.args[2],
                         {unique: false},
                  "third createIndex third argument");

        assert.equal(context.spy_create_index.getCall(3).args[0], "_id",
              "fourth createIndex first argument");
        assert.equal(context.spy_create_index.getCall(3).args[1], "_id",
                  "fourth createIndex second argument");
        assert.deepEqual(context.spy_create_index.getCall(3).args[2],
                         {unique: false},
                  "fourth createIndex third argument");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                         ["metadata"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        assert.ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");

        assert.ok(context.spy_put.calledOnce, "put count " +
           context.spy_put.callCount);
        assert.deepEqual(context.spy_put.firstCall.args[0],
                  {"_id": "foo", doc: {title: "bar"}},
                  "put first argument");

        assert.ok(!context.spy_index.called, "index count " +
           context.spy_index.callCount);

        assert.ok(!context.spy_cursor.called, "cursor count " +
           context.spy_cursor.callCount);

        assert.ok(!context.spy_key_range.called, "key range count " +
           context.spy_key_range.callCount);

      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        var i,
          spy_list = ['spy_open', 'spy_create_store', 'spy_transaction',
                      'spy_store', 'spy_put', 'spy_index', 'spy_create_index',
                      'spy_cursor', 'spy_key_range'];
        for (i = 0; i < spy_list.length; i += 1) {
          if (context.hasOwnProperty(spy_list[i])) {
            context[spy_list[i]].restore();
            delete context[spy_list[i]];
          }
        }
      })
      .always(function () {
        start();
      });
  });

  test("put document", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(1);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("inexistent", {});
      })
      .then(function (result) {
        assert.equal(result, "inexistent");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.remove
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.remove", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage with one document", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(22);

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
        context.spy_key_cursor = sinon.spy(IDBIndex.prototype, "openKeyCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.remove("foo");
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
                     "createIndex count");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata", "attachment", "blob"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        assert.equal(context.spy_store.callCount, 3, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");
        assert.deepEqual(context.spy_store.secondCall.args[0], "attachment",
                  "store first argument");
        assert.deepEqual(context.spy_store.thirdCall.args[0], "blob",
                  "store first argument");

        assert.ok(context.spy_delete.calledOnce, "delete count " +
           context.spy_delete.callCount);
        assert.deepEqual(context.spy_delete.firstCall.args[0], "foo",
                  "delete first argument");

        assert.ok(context.spy_index.calledTwice, "index count " +
           context.spy_index.callCount);
        assert.deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");
        assert.deepEqual(context.spy_index.secondCall.args[0], "_id",
                  "index first argument");

        assert.equal(context.spy_cursor.callCount, 0, "cursor count " +
           context.spy_cursor.callCount);
        assert.ok(context.spy_key_cursor.calledTwice, "cursor key count " +
           context.spy_key_cursor.callCount);
        assert.equal(context.spy_cursor_delete.callCount, 0,
                     "cursor delete count " +
           context.spy_cursor_delete.callCount);

        assert.ok(context.spy_key_range.calledTwice, "key range count " +
           context.spy_key_range.callCount);
        assert.deepEqual(context.spy_key_range.firstCall.args[0], "foo",
                  "key range first argument");
        assert.deepEqual(context.spy_key_range.secondCall.args[0], "foo",
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
        context.spy_key_cursor.restore();
        delete context.spy_key_cursor;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("spy indexedDB usage with 2 attachments", function (assert) {
    var context = this;
    start = assert.async();
    assert.expect(26);

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
        context.spy_key_cursor = sinon.spy(IDBIndex.prototype, "openKeyCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.remove("foo");
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
                     "createObjectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
                     "createIndex count");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                  ["metadata", "attachment", "blob"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        assert.equal(context.spy_store.callCount, 3, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "metadata",
                  "store first argument");
        assert.deepEqual(context.spy_store.secondCall.args[0], "attachment",
                  "store first argument");
        assert.deepEqual(context.spy_store.thirdCall.args[0], "blob",
                  "store first argument");

        assert.equal(context.spy_delete.callCount, 5, "delete count " +
           context.spy_delete.callCount);
        assert.deepEqual(context.spy_delete.firstCall.args[0], "foo",
                  "delete first argument");
        assert.deepEqual(context.spy_delete.secondCall.args[0],
                         "foo_attachment1",
                  "second delete first argument");
        assert.deepEqual(context.spy_delete.thirdCall.args[0],
                         "foo_attachment1_0",
                  "third delete first argument");
        assert.deepEqual(context.spy_delete.getCall(3).args[0],
                         "foo_attachment2",
                  "fourth delete first argument");
        assert.deepEqual(context.spy_delete.getCall(4).args[0],
                         "foo_attachment2_0",
                  "fifth delete first argument");

        assert.ok(context.spy_index.calledTwice, "index count " +
           context.spy_index.callCount);
        assert.deepEqual(context.spy_index.firstCall.args[0], "_id",
                  "index first argument");
        assert.deepEqual(context.spy_index.secondCall.args[0], "_id",
                  "index first argument");

        assert.equal(context.spy_cursor.callCount, 0, "cursor count " +
           context.spy_cursor.callCount);
        assert.ok(context.spy_key_cursor.calledTwice, "cursor key count " +
           context.spy_key_cursor.callCount);

        assert.equal(context.spy_cursor_delete.callCount, 0, "cursor count " +
           context.spy_cursor_delete.callCount);

        assert.ok(context.spy_key_range.calledTwice, "key range count " +
           context.spy_key_range.callCount);
        assert.deepEqual(context.spy_key_range.firstCall.args[0], "foo",
                  "key range first argument");
        assert.deepEqual(context.spy_key_range.secondCall.args[0], "foo",
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
        context.spy_key_cursor.restore();
        delete context.spy_key_cursor;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.getAttachment", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(15);


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
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_key_cursor = sinon.spy(IDBIndex.prototype, "openKeyCursor");

        return context.jio.getAttachment("foo", attachment);
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
                     "createIndex count");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                  ["attachment", "blob"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readonly",
              "transaction second argument");

        assert.equal(context.spy_store.callCount, 2, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "attachment",
                  "store first argument");
        assert.deepEqual(context.spy_store.secondCall.args[0], "blob",
                  "store first argument");

        assert.equal(context.spy_get.callCount, 1, "get count " +
           context.spy_get.callCount);
        assert.deepEqual(context.spy_get.firstCall.args[0], "foo_attachment",
                  "get first argument");

        assert.ok(context.spy_index.called, "index count " +
           context.spy_index.callCount);

        assert.equal(context.spy_cursor.callCount, 1, "cursor count " +
           context.spy_cursor.callCount);
        assert.ok(!context.spy_key_cursor.called, "cursor key count " +
           context.spy_key_cursor.callCount);

        assert.ok(context.spy_key_range.calledOnce, "key range count " +
           context.spy_key_range.callCount);
        assert.deepEqual(context.spy_key_range.firstCall.args[0],
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
        context.spy_get.restore();
        delete context.spy_get;
        context.spy_index.restore();
        delete context.spy_index;
        context.spy_create_index.restore();
        delete context.spy_create_index;
        context.spy_cursor.restore();
        delete context.spy_cursor;
        context.spy_key_cursor.restore();
        delete context.spy_key_cursor;
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("check result", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(3);

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
        assert.ok(result instanceof Blob, "Data is Blob");
        assert.equal(result.type, "text/plain;charset=utf-8");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        assert.ok(result.target.result === big_string,
           "Attachment correctly fetched");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("streaming", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(3);

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
        assert.ok(result instanceof Blob, "Data is Blob");
        assert.equal(result.type, "application/octet-stream");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = "aaaaaaaaaa";
        assert.equal(result.target.result, expected,
                     "Attachment correctly fetched");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("retrieving slice of data", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(1);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, big_string);
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment,
                                         {"start": 2000005, "end": 2000015});
      })
      .then(function (result) {
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = "aaaaaaaaaa";
        assert.equal(result.target.result, expected,
                     "Attachment correctly fetched");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  test("get huge attachment", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(4);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment(
          "foo",
          attachment,
          new Blob([new Array(11 * 2000000).fill('a').join('')],
                   {type: 'text/fooplain'})
        );
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment);
      })
      .then(function (blob) {
        assert.ok(blob instanceof Blob, "Data is Blob");
        assert.equal(blob.type, 'text/fooplain');
        assert.equal(blob.size, 22000000);
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .then(function (result) {
        assert.equal((new Rusha()).digestFromArrayBuffer(result.target.result),
              '6f510194afd8e436d00a543f49a7df09e86c2687');
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("retrieve empty blob", function (assert) {
    var context = this,
      attachment = "attachment",
      blob = new Blob();
    start = assert.async();
    assert.expect(1);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.putAttachment("foo", attachment, blob);
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment);
      })
      .then(function (result) {
        assert.deepEqual(result, blob, "check empty blob");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("non existing attachment", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(3);

    deleteIndexedDB(context.jio)
      .then(function () {
        return context.jio.put("foo", {"title": "bar"});
      })
      .then(function () {
        return context.jio.getAttachment("foo", attachment);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(
          error.message,
          "IndexedDB: cannot find object 'foo_attachment' " +
            "in the 'attachment' store"
        );
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.removeAttachment", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(20);

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
        context.spy_key_cursor = sinon.spy(IDBIndex.prototype, "openKeyCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.removeAttachment("foo", attachment);
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
              "createIndex count");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                  ["attachment", "blob"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        assert.equal(context.spy_store.callCount, 2, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "attachment",
                  "store first argument");
        assert.deepEqual(context.spy_store.secondCall.args[0], "blob",
                  "store first argument");

        assert.equal(context.spy_delete.callCount, 3, "delete count " +
           context.spy_delete.callCount);
        assert.deepEqual(context.spy_delete.firstCall.args[0],
                         "foo_attachment",
                  "delete first argument");
        assert.deepEqual(context.spy_delete.secondCall.args[0],
                         "foo_attachment_0",
                  "second delete first argument");
        assert.deepEqual(context.spy_delete.thirdCall.args[0],
                         "foo_attachment_1",
                  "third delete first argument");

        assert.ok(context.spy_index.calledOnce, "index count " +
           context.spy_index.callCount);

        assert.equal(context.spy_cursor.callCount, 0, "cursor count " +
           context.spy_cursor.callCount);
        assert.ok(context.spy_key_cursor.calledOnce, "cursor key count " +
           context.spy_key_cursor.callCount);
        assert.equal(context.spy_cursor_delete.callCount, 0, "cursor count " +
           context.spy_cursor_delete.callCount);

        assert.ok(context.spy_key_range.calledOnce, "key range count " +
           context.spy_key_range.callCount);
        assert.deepEqual(context.spy_key_range.firstCall.args[0],
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
        context.spy_key_cursor.restore();
        delete context.spy_key_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexeddbStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("indexeddbStorage.putAttachment", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "indexeddb",
        database: "qunit"
      });
    }
  });

  test("spy indexedDB usage", function (assert) {
    var context = this,
      attachment = "attachment";
    start = assert.async();
    assert.expect(18);

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
        context.spy_delete = sinon.spy(IDBObjectStore.prototype, "delete");
        context.spy_put = sinon.spy(IDBObjectStore.prototype, "put");
        context.spy_index = sinon.spy(IDBObjectStore.prototype, "index");
        context.spy_create_index = sinon.spy(IDBObjectStore.prototype,
                                             "createIndex");
        context.spy_cursor = sinon.spy(IDBIndex.prototype, "openCursor");
        context.spy_key_cursor = sinon.spy(IDBIndex.prototype, "openKeyCursor");
        context.spy_cursor_delete = sinon.spy(IDBCursor.prototype, "delete");
        context.spy_key_range = sinon.spy(IDBKeyRange, "only");

        return context.jio.putAttachment("foo", attachment, 'small_string');
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .then(function () {

        assert.ok(context.spy_open.calledOnce, "open count " +
           context.spy_open.callCount);
        assert.equal(context.spy_open.firstCall.args[0], "jio:qunit",
              "open first argument");

        assert.equal(context.spy_create_store.callCount, 0,
              "createObjectStore count");
        assert.equal(context.spy_create_index.callCount, 0,
              "createIndex count");

        assert.ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        assert.deepEqual(context.spy_transaction.firstCall.args[0],
                  ["attachment", "blob"],
                  "transaction first argument");
        assert.equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        assert.equal(context.spy_store.callCount, 2, "store count " +
           context.spy_store.callCount);
        assert.deepEqual(context.spy_store.firstCall.args[0], "attachment",
                  "store first argument");
        assert.deepEqual(context.spy_store.secondCall.args[0], "blob",
                  "store first argument");

        assert.equal(context.spy_delete.callCount, 1, "delete count " +
           context.spy_delete.callCount);
        assert.deepEqual(context.spy_delete.firstCall.args[0],
                         "foo_attachment_1",
                  "delete first argument");

        assert.equal(context.spy_index.callCount, 1, "index count " +
           context.spy_index.callCount);

        assert.equal(context.spy_cursor.callCount, 0, "cursor count " +
           context.spy_cursor.callCount);
        assert.equal(context.spy_key_cursor.callCount, 1, "cursor count " +
           context.spy_key_cursor.callCount);

        assert.equal(context.spy_put.callCount, 2, "put count " +
           context.spy_put.callCount);
        assert.deepEqual(context.spy_put.firstCall.args[0], {
          "_attachment": "attachment",
          "_id": "foo",
          "_key_path": "foo_attachment",
          "info": {
            "content_type": "text/plain;charset=utf-8",
            "length": 12
          }
        }, "put first argument");
        delete context.spy_put.secondCall.args[0].blob;
        // XXX Check blob content
        assert.deepEqual(context.spy_put.secondCall.args[0], {
          "_attachment": "attachment",
          "_id": "foo",
          "_part": 0,
          "_key_path": "foo_attachment_0"
        }, "put first argument");
        delete context.spy_put.thirdCall.args[0].blob;
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
        context.spy_key_cursor.restore();
        delete context.spy_key_cursor;
        context.spy_cursor_delete.restore();
        delete context.spy_cursor_delete;
        context.spy_key_range.restore();
        delete context.spy_key_range;
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, indexedDB, Blob, sinon, IDBDatabase,
  IDBTransaction, IDBIndex, IDBObjectStore, IDBCursor, IDBKeyRange,
  Rusha));
