/*
 * Copyright 2019, Nexedi SA
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
/*global indexedDB, sinon, IDBDatabase, Blob,
         IDBTransaction, IDBIndex, IDBObjectStore, IDBKeyRange*/
(function (jIO, QUnit, indexedDB, sinon, IDBDatabase, Blob,
  IDBTransaction, IDBIndex, IDBObjectStore, IDBKeyRange) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

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

  function id_compare(value1, value2) {
    if (value1.id > value2.id) {
      return 1;
    }
    if (value1.id < value2.id) {
      return -1;
    }
    return 0;
  }

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function DummyStorage3() {
    return this;
  }
  jIO.addStorage('dummystorage3', DummyStorage3);

  /////////////////////////////////////////////////////////////////
  // indexStorage2.constructor
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.constructor", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
  test("Constructor with empty index_keys", function () {
    this.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: [],
      sub_storage: {
        type: "dummystorage3"
      }
    });

    equal(this.jio.__type, "index2");
    equal(this.jio.__storage._sub_storage.__type, "dummystorage3");
    equal(this.jio.__storage._database_name, "jio:index2_test");
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.hasCapacity", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
  test("can list documents", function () {
    this.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: [],
      sub_storage: {
        type: "dummystorage3"
      }
    });

    ok(this.jio.hasCapacity("list"));
    ok(this.jio.hasCapacity("query"));
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.get
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "index2",
        database: "index2_test",
        index_keys: [],
        sub_storage: {
          type: "dummystorage3"
        }
      });
    },
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
  test("Simple put get", function () {
    var context = this;
    stop();
    expect(4);

    DummyStorage3.prototype.put = function (id, value) {
      equal(id, "32");
      deepEqual(value, {"a": 3, "b": 2, "c": 8});
      return id;
    };

    DummyStorage3.prototype.get = function (id) {
      equal(id, "32");
      return {"a": 3, "b": 2, "c": 8};
    };

    context.jio.put("32", {"a": 3, "b": 2, "c": 8})
      .then(function () {
        return context.jio.get("32");
      })
      .then(function (result) {
        deepEqual(result, {"a": 3, "b": 2, "c": 8});
      })
      .fail(function (error) {
        console.log(error);
      })
      .then(function () {
        return deleteIndexedDB(context.jio);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.buildQuery
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.buildQuery", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });

  test("Simple query matching single object", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(3);

    DummyStorage3.prototype.put = function (id, value) {
      equal(id, "32");
      deepEqual(value, {a: "3", b: "2"});
      return id;
    };

    context.jio.put("32", {"a": "3", "b": "2"})
      .then(function () {
        return context.jio.allDocs({query: 'a: "3"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows[0], {"id": "32", "value": {}});
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Simple query matching multiple objects", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(5);

    DummyStorage3.prototype.put = function (id, value) {
      if (id === "32") {
        deepEqual(value, {a: "3", b: "1"});
      }
      if (id === "21") {
        deepEqual(value, {a: "8", b: "1"});
      }
      if (id === "3") {
        deepEqual(value, {a: "5", b: "1"});
      }
      return id;
    };

    RSVP.all([
      context.jio.put("32", {a: "3", b: "1"}),
      context.jio.put("21", {a: "8", b: "1"}),
      context.jio.put("3", {a: "5", b: "1"})
    ])
      .then(function () {
        return context.jio.allDocs({query: 'b: "1"'});
      })
      .then(function (result) {
        equal(result.data.total_rows, 3);
        deepEqual(result.data.rows.sort(id_compare),
          [
            {"id": "32", "value": {}},
            {"id": "21", "value": {}},
            {"id": "3", "value": {}}
          ].sort(id_compare));
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("No index keys provided", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: [],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(4);

    DummyStorage3.prototype.put = function (id, value) {
      equal(id, "32");
      deepEqual(value, {"a": "3", "b": "2"});
      return id;
    };
    DummyStorage3.prototype.buildQuery = function (options) {
      equal(options.query, 'a:3');
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      equal(capacity, "query");
      return false;
    };

    context.jio.put("32", {"a": "3", "b": "2"})
      .then(function () {
        return context.jio.allDocs({query: 'a:"3"'});
      })
      .fail(function (error) {
        equal(error.message,
          "Capacity 'query' is not implemented on 'dummystorage3'");
      })
      .always(function () {
        start();
      });
  });

  test("No index keys provided but substorage supports querying", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: [],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(4);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      equal(capacity, "query");
      if (capacity === "query") { return true; }
    };
    DummyStorage3.prototype.buildQuery = function (options) {
      equal(options.query, "a:5");
      return [{id: "3", value: {}}];
    };

    RSVP.all([
      context.jio.put("32", {a: "3", b: "1"}),
      context.jio.put("21", {a: "8", b: "1"}),
      context.jio.put("3", {a: "5", b: "1"})
    ])
      .then(function () {
        return context.jio.allDocs({query: 'a: "5"'});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "3", "value": {}}]);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Index is provided for some keys only", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(4);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      equal(capacity, "query");
      if (capacity === "query") { return true; }
    };
    DummyStorage3.prototype.buildQuery = function (options) {
      equal(options.query, 'c:linear');
      return [{id: "32", value: {}}];
    };

    RSVP.all([
      context.jio.put("32", {a: "3", b: "1", c: "linear"}),
      context.jio.put("21", {a: "8", b: "1", c: "obscure"}),
      context.jio.put("3", {a: "5", b: "1", c: "imminent"})
    ])
      .then(function () {
        return context.jio.allDocs({query: 'a: "5" OR c: "linear"'});
      })
      .then(function (result) {
        equal(result.data.total_rows, 2);
        deepEqual(result.data.rows.sort(id_compare),
          [{"id": "32", "value": {}}, {"id": "3", "value": {}}]
            .sort(id_compare));
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("No Query", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(1);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("32", {"a": "3", "b": "2"}),
      context.jio.put("21", {"a": "6", "b": "9"}),
      context.jio.put("3", {"a": "8", "b": "5"})
    ])
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        equal(result.data.total_rows, 3);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Complex queries", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["name", "user"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(10);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("1", {"name": "envision", "url": "jio.nexedi.com",
        "user": "Mann"}),
      context.jio.put("23", {"name": "obscure", "url": "jio.nexedi.com",
        "user": "Hesse"}),
      context.jio.put("5", {"name": "envelope", "url": "renderjs.nexedi.com",
        "user": "Mann"}),
      context.jio.put("34", {"name": "censure", "url": "nexedi.com",
        "user": "Brahms"}),
      context.jio.put("38", {"name": "observe", "url": "erp5.com",
        "user": "Hesse"}),
      context.jio.put("76", {"name": "linear", "url": "vifib.com",
        "user": "J Evol"}),
      context.jio.put("14", {"name": "obscure", "url": "re6st.nexedi.com",
        "user": "Lietz"}),
      context.jio.put("19", {"name": "razor", "url": "erp5.com",
        "user": "Karajan"}),
      context.jio.put("59", {"name": "envision", "url": "nexedi.com",
        "user": "Handel"}),
      context.jio.put("31", {"name": "obtuse", "url": "officejs.com",
        "user": "Johann"}),
      context.jio.put("45", {"name": "repeat", "url": "slapos.com",
        "user": "Specter"}),
      context.jio.put("48", {"name": "sever", "url": "neo.nexedi.com",
        "user": "Rienzi"}),
      context.jio.put("72", {"name": "organisers", "url": "vifib.net",
        "user": "Parzival"})
    ])
      .then(function () {
        return context.jio.allDocs({"query": "name:razor"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "19", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({"query": "name:obscure"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 2);
        deepEqual(result.data.rows.sort(), [{"id": "23", "value": {}},
          {"id": "14", "value": {}}].sort(id_compare));
      })
      .then(function () {
        return context.jio.allDocs({"query": "name:envision AND user:Mann"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "1", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({"query": "name:repeat OR user:Hesse"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 3);
        deepEqual(result.data.rows.sort(id_compare),
          [{"id": "23", "value": {}}, {"id": "38", "value": {}},
            {"id": "45", "value": {}}].sort(id_compare));
      })
      .then(function () {
        return context.jio.allDocs(
          {"query": "(user:Mann OR user:Hesse) AND name:envelope"}
        );
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "5", "value": {}}]);
      })
      .fail(function (error) {
        console.error(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.put
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "index2",
        database: "index2_test",
        index_keys: ["name", "user"],
        sub_storage: {
          type: "dummystorage3"
        }
      });
    },
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });

  test("spy index usage", function () {
    var context = this;
    stop();
    expect(22);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

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

        return context.jio.put("foo", {"name": "foo", "user": "bar"});
      })
      .then(function () {

        ok(context.spy_open.calledOnce, "open count " +
          context.spy_open.callCount);
        equal(context.spy_open.firstCall.args[0], "jio:index2_test",
              "open first argument");

        equal(context.spy_create_store.callCount, 1,
              "createObjectStore count");

        equal(context.spy_create_store.firstCall.args[0], "index-store",
              "first createObjectStore first argument");
        deepEqual(context.spy_create_store.firstCall.args[1],
                  {keyPath: "id", autoIncrement: false},
                  "first createObjectStore second argument");

        equal(context.spy_create_index.callCount, 2, "createIndex count");

        equal(context.spy_create_index.firstCall.args[0], "Index-name",
              "first createIndex first argument");
        equal(context.spy_create_index.firstCall.args[1], "doc.name",
              "first createIndex second argument");
        deepEqual(context.spy_create_index.firstCall.args[2], {unique: false},
                  "first createIndex third argument");

        equal(context.spy_create_index.secondCall.args[0], "Index-user",
              "second createIndex first argument");
        equal(context.spy_create_index.secondCall.args[1], "doc.user",
              "second createIndex second argument");
        deepEqual(context.spy_create_index.secondCall.args[2],
                  {unique: false},
                  "second createIndex third argument");

        ok(context.spy_transaction.calledOnce, "transaction count " +
           context.spy_transaction.callCount);
        deepEqual(context.spy_transaction.firstCall.args[0], ["index-store"],
                  "transaction first argument");
        equal(context.spy_transaction.firstCall.args[1], "readwrite",
              "transaction second argument");

        ok(context.spy_store.calledOnce, "store count " +
           context.spy_store.callCount);
        deepEqual(context.spy_store.firstCall.args[0], "index-store",
                  "store first argument");

        ok(context.spy_put.calledOnce, "put count " +
           context.spy_put.callCount);
        deepEqual(context.spy_put.firstCall.args[0],
                  {"id": "foo", doc: {name: "foo", user: "bar"}},
                  "put first argument");

        ok(!context.spy_index.called, "index count " +
           context.spy_index.callCount);

        ok(!context.spy_cursor.called, "cursor count " +
           context.spy_cursor.callCount);

        ok(!context.spy_key_range.called, "key range count " +
           context.spy_key_range.callCount);

      })
      .fail(function (error) {
        ok(false, error);
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

  /////////////////////////////////////////////////////////////////
  // IndexStorage2.getAttachment
  /////////////////////////////////////////////////////////////////
  module("IndexStorage2.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["name", "user"],
      sub_storage: {
        type: "dummystorage3"
      },
    }),
      blob = new Blob([""]);

    DummyStorage3.prototype.getAttachment = function (id, name) {
      equal(id, "1");
      equal(name, "test_name");
      return blob;
    };

    jio.getAttachment("1", "test_name")
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
  // IndexStorage2.putAttachment
  /////////////////////////////////////////////////////////////////
  module("IndexStorage2.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["name", "user"],
      sub_storage: {
        type: "dummystorage3"
      },
    }),
      blob = new Blob([""]);

    DummyStorage3.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "1");
      equal(name, "test_name");
      deepEqual(blob2, blob);
      return "OK";
    };

    jio.putAttachment("1", "test_name", blob)
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
  // IndexStorage3.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("IndexStorage3.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["name", "user"],
      sub_storage: {
        type: "dummystorage3"
      },
    });

    DummyStorage3.prototype.removeAttachment = function (id, name) {
      equal(id, "1");
      equal(name, "test_name");
      return "removed";
    };

    jio.removeAttachment("1", "test_name")
      .then(function (result) {
        equal(result, "removed");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, indexedDB, sinon, IDBDatabase, Blob,
  IDBTransaction, IDBIndex, IDBObjectStore, IDBKeyRange));