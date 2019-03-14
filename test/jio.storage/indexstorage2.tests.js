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
/*global indexedDB, Blob*/
(function (jIO, QUnit, indexedDB, Blob) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    throws = QUnit.throws;

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

  function idCompare(value1, value2) {
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
  test("Constructor without index_keys", function () {
    this.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      sub_storage: {
        type: "dummystorage3"
      }
    });

    equal(this.jio.__type, "index2");
    equal(this.jio.__storage._sub_storage.__type, "dummystorage3");
    equal(this.jio.__storage._database_name, "jio:index2_test");
    deepEqual(this.jio.__storage._index_keys, []);
  });

  test("Constructor incorrect description values", function () {

    throws(
      function () {
        this.jio = jIO.createJIO({
          type: "index2",
          database: 44,
          index_keys: ["a", "b"],
          sub_storage: {
            type: "dummystorage3"
          }
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(error.message, "IndexStorage2 'database' description property " +
          "must be a non-empty string");
        return true;
      }
    );

    throws(
      function () {
        this.jio = jIO.createJIO({
          type: "index2",
          database: "",
          index_keys: ["a", "b"],
          sub_storage: {
            type: "dummystorage3"
          }
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(error.message, "IndexStorage2 'database' description property " +
          "must be a non-empty string");
        return true;
      }
    );

    throws(
      function () {
        this.jio = jIO.createJIO({
          type: "index2",
          database: "index2_test",
          index_keys: "index_key",
          sub_storage: {
            type: "dummystorage3"
          }
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(error.message, "IndexStorage2 'index_keys' description property" +
          " must be an Array");
        return true;
      }
    );
  });

  test("Constructor with index_keys", function () {
    this.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });

    equal(this.jio.__type, "index2");
    equal(this.jio.__storage._sub_storage.__type, "dummystorage3");
    equal(this.jio.__storage._database_name, "jio:index2_test");
    deepEqual(this.jio.__storage._index_keys, ["a", "b"]);
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
      sub_storage: {
        type: "dummystorage3"
      }
    });

    throws(
      function () {
        this.jio.hasCapacity("non");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'non' is not implemented on 'index2'");
        return true;
      }
    );

    ok(this.jio.hasCapacity("list"));
    ok(this.jio.hasCapacity("query"));
    ok(this.jio.hasCapacity("limit"));
    ok(this.jio.hasCapacity("select"));
    ok(this.jio.hasCapacity("include"));
    ok(this.jio.hasCapacity("sort"));
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
  test("Get calls substorage", function () {
    var context = this;
    stop();
    expect(2);

    DummyStorage3.prototype.get = function (id) {
      equal(id, "32");
      return {"a": 3, "b": 2, "c": 8};
    };

    context.jio.get("32")
      .then(function (result) {
        deepEqual(result, {"a": 3, "b": 2, "c": 8});
      })
      .fail(function (error) {
        console.log(error);
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

  test("Sub-storage handles empty options", function () {
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

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.hasCapacity = function (name) {
      return name === "list";
    };

    DummyStorage3.prototype.buildQuery = function (options) {
      deepEqual(options, {});
      return [
        {id: "2", value: {}},
        {id: "32", value: {}},
        {id: "16", value: {}},
        {id: "21", value: {}}
      ];
    };

    RSVP.all([
      context.jio.put("2", {"a": "close", "b": 45}),
      context.jio.put("16", {"a": "value", "b": 5}),
      context.jio.put("21", {"a": "advice", "b": 12}),
      context.jio.put("32", {"a": "recieve", "b": 76})
    ])
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        equal(result.data.total_rows, 4);
        deepEqual(result.data.rows.sort(idCompare), [{id: "16", value: {}},
          {id: "2", value: {}}, {id: "21", value: {}}, {id: "32", value: {}}]);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("use_sub_storage_query is true", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      use_sub_storage_query: true,
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(3);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === "list") || (name === "query");
    };

    DummyStorage3.prototype.buildQuery = function (options) {
      deepEqual(options, {query: 'a:"advice"'});
      return [
        {id: "21", value: {}}
      ];
    };

    RSVP.all([
      context.jio.put("2", {"a": "close", "b": 45}),
      context.jio.put("16", {"a": "value", "b": 5}),
      context.jio.put("21", {"a": "advice", "b": 12})
    ])
      .then(function () {
        return context.jio.allDocs({query: 'a:"advice"'});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{id: "21", value: {}}]);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Sub storage capacities are used by default", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b", "c"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(3);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === "list") || (name === "include") || (name === "select")
        || (name === "sort") || (name === "limit");
    };

    DummyStorage3.prototype.buildQuery = function (options) {
      deepEqual(options, {include_docs: false, select_list: ["a", "c"],
        limit: 3, sort_on: [["a", "descending"], ["b", "ascending"]]});
      return [
        {"id": "21", "value": {"a": "value", "c": "4"}},
        {"id": "16", "value": {"a": "value", "c": "54"}},
        {"id": "1", "value": {"a": "exhalt", "c": "28"}}
      ];
    };

    RSVP.all([
      context.jio.put("2", {"a": "close", "b": 45, "c": "78"}),
      context.jio.put("16", {"a": "value", "b": 5, "c": "54"}),
      context.jio.put("21", {"a": "value", "b": 12, "c": "4"}),
      context.jio.put("7", {"a": "device", "b": 83, "c": "26"}),
      context.jio.put("1", {"a": "exhalt", "b": 68, "c": "28"})
    ])
      .then(function () {
        return context.jio.allDocs({select_list: ["a", "c"], limit: 3,
          sort_on: [["a", "descending"], ["b", "ascending"]],
          include_docs: false, });
      })
      .then(function (result) {
        equal(result.data.total_rows, 3);
        deepEqual(result.data.rows, [
          {"id": "21", "value": {"a": "value", "c": "4"}},
          {"id": "16", "value": {"a": "value", "c": "54"}},
          {"id": "1", "value": {"a": "exhalt", "c": "28"}}
        ]);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Sort_on option is given", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b", "c", "d"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(2);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === "list");
    };

    RSVP.all([
      context.jio.put("2", {"a": "close", "b": 45, "c": "78", "d": "gc4"}),
      context.jio.put("16", {"a": "value", "b": 5, "c": "54", "d": "xf7"}),
      context.jio.put("21", {"a": "value", "b": 83, "c": "4", "d": "gc1"}),
      context.jio.put("7", {"a": "value", "b": 5, "c": "26", "d": "x54"}),
      context.jio.put("1", {"a": "exhalt", "b": 68, "c": "28", "d": "o32"})
    ])
      .then(function () {
        return context.jio.allDocs({sort_on:
          [["a", "ascending"], ["b", "descending"], ["d", "ascending"]]});
      })
      .then(function (result) {
        equal(result.data.total_rows, 5);
        deepEqual(result.data.rows, [
          {"id": "2", "value": {}},
          {"id": "1", "value": {}},
          {"id": "21", "value": {}},
          {"id": "7", "value": {}},
          {"id": "16", "value": {}}
        ]);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Include docs", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b", "c"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(2);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === "list");
    };

    RSVP.all([
      context.jio.put("2", {"a": "close", "b": 45, "c": "78", "d": "gc4"}),
      context.jio.put("16", {"a": "value", "b": 5, "c": "54", "d": "xf7"}),
      context.jio.put("21", {"a": "value", "b": 83, "c": "4", "d": "gc1"}),
      context.jio.put("7", {"a": "value", "b": 12, "c": "26", "d": "x54"}),
      context.jio.put("1", {"a": "exhalt", "b": 68, "c": "28", "d": "o32"})
    ])
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function (result) {
        equal(result.data.total_rows, 5);
        deepEqual(result.data.rows.sort(idCompare), [
          {"id": "2", "value": {"a": "close", "b": 45, "c": "78"}},
          {"id": "16", "value": {"a": "value", "b": 5, "c": "54"}},
          {"id": "21", "value": {"a": "value", "b": 83, "c": "4"}},
          {"id": "7", "value": {"a": "value", "b": 12, "c": "26"}},
          {"id": "1", "value": {"a": "exhalt", "b": 68, "c": "28"}}
        ].sort(idCompare));
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
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
    expect(4);

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
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "32", "value": {}}]);
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
        deepEqual(result.data.rows.sort(idCompare),
          [
            {"id": "32", "value": {}},
            {"id": "21", "value": {}},
            {"id": "3", "value": {}}
          ].sort(idCompare));
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Querying with key without an index", function () {
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
    expect(4);

    DummyStorage3.prototype.put = function (id, value) {
      equal(id, "32");
      deepEqual(value, {"a": "3", "b": "2"});
      return id;
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      return capacity === 'list';
    };

    context.jio.put("32", {"a": "3", "b": "2"})
      .then(function () {
        return context.jio.allDocs({query: 'b:"2"'});
      })
      .fail(function (error) {
        equal(error.status_code, 404);
        equal(error.message,
          "No index for 'b' key and substorage doesn't support queries");
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
    expect(3);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      return (capacity === 'list') || (capacity === 'query');
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
    expect(3);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      return capacity === 'query';
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
        deepEqual(result.data.rows.sort(idCompare),
          [{"id": "32", "value": {}}, {"id": "3", "value": {}}]
            .sort(idCompare));
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Partial sub_storage query is disabled", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      use_sub_storage_query_partial: false,
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(2);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      return capacity === 'query';
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
      .fail(function (error) {
        equal(error.status_code, 404);
        equal(error.message, "No index for 'c' key and checking the substorage"
          + " for partial queries is not set");
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

  test("Limit without query", function () {
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
    expect(1);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("1", {"a": "55", "b": "5"}),
      context.jio.put("2", {"a": "98", "b": "3"}),
      context.jio.put("3", {"a": "75", "b": "1"}),
      context.jio.put("8", {"a": "43", "b": "7"}),
      context.jio.put("6", {"a": "21", "b": "2"})
    ])
      .then(function () {
        return context.jio.allDocs({limit: 3});
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

  test("Limit with query", function () {
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
    expect(1);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("1", {"a": "55", "b": "2"}),
      context.jio.put("2", {"a": "98", "b": "2"}),
      context.jio.put("3", {"a": "75", "b": "2"}),
      context.jio.put("8", {"a": "43", "b": "2"}),
      context.jio.put("6", {"a": "21", "b": "2"}),
      context.jio.put("16", {"a": "39", "b": "2"}),
      context.jio.put("11", {"a": "16", "b": "3"})
    ])
      .then(function () {
        return context.jio.allDocs({limit: 4, query: "b:2"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 4);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Select without query", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b", "c"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(2);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("1", {"a": "55", "b": "2", "c": "try"}),
      context.jio.put("2", {"a": "98", "b": "2", "c": "adverse"}),
      context.jio.put("3", {"a": "75", "b": "2", "c": "invite"}),
      context.jio.put("8", {"a": "43", "b": "2", "c": "absolve"}),
      context.jio.put("6", {"a": "21", "b": "2", "c": "defy"})
    ])
      .then(function () {
        return context.jio.allDocs({select_list: ["a", "c"]});
      })
      .then(function (result) {
        equal(result.data.total_rows, 5);
        deepEqual(result.data.rows.sort(idCompare), [
          {id: "1", value: {"a": "55", "c": "try"}},
          {id: "2", value: {"a": "98", "c": "adverse"}},
          {id: "3", value: {"a": "75", "c": "invite"}},
          {id: "8", value: {"a": "43", "c": "absolve"}},
          {id: "6", value: {"a": "21", "c": "defy"}}
        ].sort(idCompare));
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Select with query and limit", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b", "c"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(2);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("1", {"a": "55", "b": "2", "c": "try"}),
      context.jio.put("2", {"a": "98", "b": "2", "c": "adverse"}),
      context.jio.put("3", {"a": "75", "b": "2", "c": "invite"}),
      context.jio.put("8", {"a": "43", "b": "3", "c": "absolve"}),
      context.jio.put("6", {"a": "21", "b": "2", "c": "defy"}),
      context.jio.put("4", {"a": "65", "b": "3", "c": "odd"})
    ])
      .then(function () {
        return context.jio.allDocs({select_list: ["a", "c"],
          query: "b:2"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 4);
        deepEqual(result.data.rows.sort(idCompare), [
          {id: "1", value: {"a": "55", "c": "try"}},
          {id: "2", value: {"a": "98", "c": "adverse"}},
          {id: "3", value: {"a": "75", "c": "invite"}},
          {id: "6", value: {"a": "21", "c": "defy"}}
        ].sort(idCompare));
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Select_list key is not present in the index", function () {
    var context = this;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "c"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(2);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("1", {"a": "55", "b": "2", "c": "try"}),
      context.jio.put("2", {"a": "55", "b": "5", "c": "adverse"}),
      context.jio.put("3", {"a": "55", "b": "1", "c": "invite"})
    ])
      .then(function () {
        return context.jio.allDocs({select_list: ["a", "b"],
          query: "a:55"});
      })
      .fail(function (error) {
        equal(error.status_code, 404);
        equal(error.message, "Index key 'b' not found in document");
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
          {"id": "14", "value": {}}].sort(idCompare));
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
        deepEqual(result.data.rows.sort(idCompare),
          [{"id": "23", "value": {}}, {"id": "38", "value": {}},
            {"id": "45", "value": {}}].sort(idCompare));
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

  test("Index keys are modified", function () {
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
    expect(8);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.hasCapacity = function () {
      return false;
    };

    RSVP.all([
      context.jio.put("32", {"a": "3", "b": "2", "c": "inverse"}),
      context.jio.put("5", {"a": "6", "b": "2", "c": "strong"}),
      context.jio.put("14", {"a": "67", "b": "3", "c": "disolve"})
    ])
      .then(function () {
        return context.jio.allDocs({query: 'a: "67"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows, [{"id": "14", "value": {}}]);
      })
      .then(function () {
        context.jio = jIO.createJIO({
          type: "index2",
          database: "index2_test",
          index_keys: ["a", "b", "c"],
          sub_storage: {
            type: "dummystorage3"
          }
        });
      })
      .then(function () {
        return RSVP.all([
          context.jio.put("18", {"a": "2", "b": "3", "c": "align"}),
          context.jio.put("62", {"a": "3", "b": "2", "c": "disolve"})
        ]);
      })
      .then(function () {
        return context.jio.allDocs({query: 'b: "3"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows, [{"id": "18", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({query: 'c: "disolve"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows, [{"id": "62", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({query: 'a: "3"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows, [{"id": "32", "value": {}},
          {"id": "62", "value": {}}]);
      })
      .then(function () {
        context.jio = jIO.createJIO({
          type: "index2",
          database: "index2_test",
          index_keys: ["a", "c"],
          sub_storage: {
            type: "dummystorage3"
          }
        });
      })
      .then(function () {
        return context.jio.put("192", {"a": "3", "b": "3", "c": "disolve"});
      })
      .then(function () {
        return context.jio.allDocs({query: 'a: "3"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows.sort(idCompare), [{"id": "192", "value": {}},
          {"id": "32", "value": {}}, {"id": "62", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({query: 'c: "disolve"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows.sort(idCompare), [{"id": "192", "value": {}},
          {"id": "62", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({query: 'b: "3"'});
      })
      .fail(function (error) {
        equal(error.status_code, 404);
        equal(error.message,
          "No index for 'b' key and substorage doesn't support queries");
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // IndexStorage2.getAttachment
  /////////////////////////////////////////////////////////////////
  module("IndexStorage2.getAttachment", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
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
  module("IndexStorage2.putAttachment", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
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
  // IndexStorage2.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("IndexStorage2.removeAttachment", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
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

  /////////////////////////////////////////////////////////////////
  // indexStorage2.put
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.put", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
  test("Put creates index", function () {
    var context = this, request, store, records;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(12);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      context.jio.put("32", {"a": "894", "b": "inversion", "c": 2}),
      context.jio.put("33", {"a": "65", "b": "division", "c": 4}),
      context.jio.put("34", {"a": "65", "b": "prolong", "c": 8})
    ])
      .then(function () {
        return new RSVP.Promise(function (resolve) {
          request = indexedDB.open('jio:index2_test');
          request.onsuccess = function () {
            resolve(request.result);
          };
        });
      })
      .then(function (result) {
        equal(result.version, 1);
        equal(result.name, 'jio:index2_test');
        equal(result.objectStoreNames.length, 1);
        equal(result.objectStoreNames[0], 'index-store');
        store = result.transaction('index-store').objectStore('index-store');
        equal(store.indexNames.length, 2);
        equal(store.keyPath, "id");
        deepEqual(Array.from(store.indexNames).sort(), ['Index-a', 'Index-b']);
        equal(store.index('Index-a').keyPath, 'doc.a');
        equal(store.index('Index-b').keyPath, 'doc.b');
        equal(store.index('Index-a').unique, false);
        equal(store.index('Index-b').unique, false);
        return new RSVP.Promise(function (resolve) {
          records = store.getAll();
          records.onsuccess = function () {
            resolve(records);
          };
        });
      })
      .then(function (values) {
        deepEqual(values.result.sort(idCompare), [
          {"id": "32", "doc": {"a": "894", "b": "inversion"}},
          {"id": "33", "doc": {"a": "65", "b": "division"}},
          {"id": "34", "doc": {"a": "65", "b": "prolong"}}
        ]);
      })
      .then(function () {
        request.result.close();
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.post
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.post", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
  test("Post creates index", function () {
    var context = this, request, store, records;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "b"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(12);

    DummyStorage3.prototype.post = function (value) {
      if (value.a === "5") {
        return "1";
      }
      if (value.a === "62") {
        return "2";
      }
      if (value.a === "37") {
        return "3";
      }
    };

    RSVP.all([
      context.jio.post({"a": "5", "b": "inversion", "c": 2}),
      context.jio.post({"a": "62", "b": "division", "c": 4}),
      context.jio.post({"a": "37", "b": "prolong", "c": 8})
    ])
      .then(function () {
        return new RSVP.Promise(function (resolve) {
          request = indexedDB.open('jio:index2_test');
          request.onsuccess = function () {
            resolve(request.result);
          };
        });
      })
      .then(function (result) {
        equal(result.version, 1);
        equal(result.name, 'jio:index2_test');
        equal(result.objectStoreNames.length, 1);
        equal(result.objectStoreNames[0], 'index-store');
        store = result.transaction('index-store').objectStore('index-store');
        equal(store.indexNames.length, 2);
        equal(store.keyPath, "id");
        deepEqual(Array.from(store.indexNames).sort(), ['Index-a', 'Index-b']);
        equal(store.index('Index-a').keyPath, 'doc.a');
        equal(store.index('Index-b').keyPath, 'doc.b');
        equal(store.index('Index-a').unique, false);
        equal(store.index('Index-b').unique, false);
        return new RSVP.Promise(function (resolve) {
          records = store.getAll();
          records.onsuccess = function () {
            resolve(records);
          };
        });
      })
      .then(function (values) {
        deepEqual(values.result.sort(idCompare), [
          {"id": "1", "doc": {"a": "5", "b": "inversion"}},
          {"id": "2", "doc": {"a": "62", "b": "division"}},
          {"id": "3", "doc": {"a": "37", "b": "prolong"}}
        ]);
      })
      .then(function () {
        request.result.close();
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.remove
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.remove", {
    teardown: function () {
      deleteIndexedDB(this.jio);
    }
  });
  test("Remove values", function () {
    var context = this, request, store, records;
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

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.remove = function (id) {
      equal(id, "33");
    };

    RSVP.all([
      context.jio.put("32", {"a": "894", "b": "inversion", "c": 2}),
      context.jio.put("33", {"a": "65", "b": "division", "c": 4}),
      context.jio.put("34", {"a": "65", "b": "prolong", "c": 8})
    ])
      .then(function () {
        return new RSVP.Promise(function (resolve) {
          request = indexedDB.open('jio:index2_test');
          request.onsuccess = function () {
            resolve(request.result);
          };
        });
      })
      .then(function (result) {
        store = result.transaction('index-store').objectStore('index-store');
        return new RSVP.Promise(function (resolve) {
          records = store.getAll();
          records.onsuccess = function () {
            resolve(records);
          };
        });
      })
      .then(function (values) {
        deepEqual(values.result.sort(idCompare), [
          {"id": "32", "doc": {"a": "894", "b": "inversion"}},
          {"id": "33", "doc": {"a": "65", "b": "division"}},
          {"id": "34", "doc": {"a": "65", "b": "prolong"}}
        ]);
      })
      .then(function () {
        return context.jio.remove("33");
      })
      .then(function () {
        store = request.result.transaction('index-store')
          .objectStore('index-store');
        return new RSVP.Promise(function (resolve) {
          records = store.getAll();
          records.onsuccess = function () {
            resolve(records);
          };
        });
      })
      .then(function (values) {
        deepEqual(values.result.sort(idCompare), [
          {"id": "32", "doc": {"a": "894", "b": "inversion"}},
          {"id": "34", "doc": {"a": "65", "b": "prolong"}}
        ]);
      })
      .then(function () {
        request.result.close();
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, indexedDB, Blob));