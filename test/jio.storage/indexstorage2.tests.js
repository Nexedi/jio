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

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === "sort");
    };

    throws(
      function () {
        this.jio.hasCapacity("non");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'non' is not implemented on 'dummystorage3'");
        return true;
      }
    );

    ok(this.jio.hasCapacity("query"));
    ok(this.jio.hasCapacity("limit"));
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
    setup: function () {
      DummyStorage3.prototype.hasCapacity = function (name) {
        return (name === 'list') || (name === 'include');
      };
      DummyStorage3.prototype.buildQuery = function () {
        return [];
      };
    },
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
    expect(2);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    DummyStorage3.prototype.buildQuery = function (options) {
      if (options.include_docs !== true) {
        return [
          {id: "2", value: {}},
          {id: "32", value: {}},
          {id: "16", value: {}},
          {id: "21", value: {}}
        ];
      }
      return [];
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
      if (options.include_docs === true) {
        return [];
      }
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

    context.jio.put("32", {"a": "3", "b": "2"})
      .then(function () {
        return context.jio.allDocs({query: 'b:"2"'});
      })
      .fail(function (error) {
        equal(error.status_code, 501);
        equal(error.message,
          "Capacity 'query' is not implemented on 'dummystorage3'");
      })
      .always(function () {
        start();
      });
  });

  test("Repair on storage without include_docs support", function () {
    var context = this, fake_data;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "c"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(3);

    fake_data = {
      "1": {a: "id54", b: 2, c: "night"},
      "4": {a: "vn92", b: 7, c: "matter"},
      "9": {a: "ru23", b: 3, c: "control"}
    };

    DummyStorage3.prototype.hasCapacity = function (name) {
      return name === 'list';
    };
    DummyStorage3.prototype.put = function (id, value) {
      fake_data[id] = value;
      return id;
    };
    DummyStorage3.prototype.get = function (id) {
      return fake_data[id];
    };
    DummyStorage3.prototype.buildQuery = function (options) {
      deepEqual(options, {});
      var keys = Object.keys(fake_data);
      return keys.map(function (v) { return {id: v, value: {}}; });
    };

    RSVP.all([
      context.jio.put("3", {a: "ab43", b: 9, c: "absorb"}),
      context.jio.put("5", {a: "gu31", b: 5, c: "control"}),
      context.jio.put("7", {a: "zf76", b: 3, c: "rules"}),
      context.jio.put("6", {a: "cc92", b: 6, c: "afraid"})
    ])
      .then(function () {
        return context.jio.allDocs({query: 'c:"control"'});
      })
      .then(function (result) {
        equal(result.data.total_rows, 2);
        deepEqual(result.data.rows.sort(idCompare), [{id: "5", value: {}},
          {id: "9", value: {}}]);
      })
      .fail(function (error) {
        console.log(error);
      })
      .always(function () {
        start();
      });
  });

  test("Repair on storage with include_docs support", function () {
    var context = this, fake_data;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["a", "c"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(3);

    fake_data = [
      {id: "1", doc: {a: "id54", b: 2, c: "night"}},
      {id: "4", doc: {a: "vn92", b: 7, c: "matter"}},
      {id: "9", doc: {a: "ru23", b: 3, c: "control"}}
    ];

    DummyStorage3.prototype.put = function (id, value) {
      fake_data.push({id: id, doc: value});
      return id;
    };
    DummyStorage3.prototype.buildQuery = function (options) {
      deepEqual(options, {include_docs: true});
      return fake_data;
    };

    RSVP.all([
      context.jio.put("3", {a: "ab43", b: 9, c: "absorb"}),
      context.jio.put("5", {a: "gu31", b: 5, c: "control"}),
      context.jio.put("7", {a: "zf76", b: 3, c: "rules"}),
      context.jio.put("6", {a: "cc92", b: 6, c: "afraid"})
    ])
      .then(function () {
        return context.jio.allDocs({query: 'c:"control"'});
      })
      .then(function (result) {
        equal(result.data.total_rows, 2);
        deepEqual(result.data.rows.sort(idCompare), [{id: "5", value: {}},
          {id: "9", value: {}}]);
      })
      .fail(function (error) {
        console.log(error);
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
      equal(options.query, 'a: "5"');
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
      context.jio.put("8", {"a": "43", "b": "3"}),
      context.jio.put("6", {"a": "21", "b": "2"}),
      context.jio.put("16", {"a": "39", "b": "2"}),
      context.jio.put("11", {"a": "16", "b": "2"})
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

  test("Index keys are modified", function () {
    var context = this, dummy_data;
    context.jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      version: 1,
      index_keys: ["a"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(8);

    dummy_data = {
      "32": {id: "32", doc: {"a": "3", "b": "2", "c": "inverse"}},
      "5": {id: "5", doc: {"a": "6", "b": "2", "c": "strong"}},
      "14": {id: "14", doc: {"a": "67", "b": "3", "c": "disolve"}}
    };

    DummyStorage3.prototype.put = function (id, value) {
      dummy_data[id] = {id: id, doc: value};
      return id;
    };

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === 'list') || (name === 'include');
    };

    DummyStorage3.prototype.buildQuery = function () {
      return Object.values(dummy_data);
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
          version: 2,
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
        deepEqual(result.data.rows, [{"id": "14", "value": {}},
          {"id": "18", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({query: 'c: "disolve"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows, [{"id": "14", "value": {}},
          {"id": "62", "value": {}}]);
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
          version: 3,
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
        deepEqual(result.data.rows.sort(idCompare), [{"id": "14", "value": {}},
          {"id": "192", "value": {}}, {"id": "62", "value": {}}]);
      })
      .then(function () {
        return context.jio.allDocs({query: 'b: "3"'});
      })
      .fail(function (error) {
        equal(error.status_code, 501);
        equal(error.message,
          "Capacity 'query' is not implemented on 'dummystorage3'");
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

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === 'list') || (name === 'include');
    };

    DummyStorage3.prototype.buildQuery = function () {
      return [];
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

    DummyStorage3.prototype.hasCapacity = function (name) {
      return (name === 'list') || (name === 'include');
    };

    DummyStorage3.prototype.buildQuery = function () {
      return [];
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