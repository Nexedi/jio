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
/*jslint nomen: true*/
/*global Blob, jiodate*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    start,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('querystorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // queryStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("queryStorage.constructor");
  test("accept parameters", function (assert) {
    var jio = jIO.createJIO({
      type: "query",
      schema: {'date': {type: 'string', format: 'date-time'}},
      sub_storage: {
        type: "querystorage200"
      }
    });

    assert.ok(jio.__storage._sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._sub_storage.__type, "querystorage200");
    assert.deepEqual(jio.__storage._key_schema.key_set, {
      "date": {
        "cast_to": "dateType",
        "read_from": "date"
      }
    }, 'check key_schema');
    assert.ok(
      typeof jio.__storage._key_schema.cast_lookup.dateType === 'function'
    );

  });

  test("failed on wrond schema", function (assert) {
    assert.throws(
      function () {
        jIO.createJIO({
          type: "query",
          schema: {'date': {type: 'couscous'}},
          sub_storage: {
            type: "querystorage200"
          }
        });
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 400);
        assert.equal(error.message,
              "Wrong schema for property: date");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.get
  /////////////////////////////////////////////////////////////////
  module("queryStorage.get");
  test("get called substorage get", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    Storage200.prototype.get = function (id) {
      assert.equal(id, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "foo"
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
  // queryStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("queryStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    Storage200.prototype.allAttachments = function (id) {
      assert.equal(id, "bar", "allAttachments, 200 called");
      return {attachmentname: {}};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          attachmentname: {}
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
  // queryStorage.post
  /////////////////////////////////////////////////////////////////
  module("queryStorage.post");
  test("post called substorage post", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    Storage200.prototype.post = function (param) {
      assert.deepEqual(param, {"title": "foo"}, "post 200 called");
      return "youhou";
    };

    jio.post({"title": "foo"})
      .then(function (result) {
        assert.equal(result, "youhou");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.put
  /////////////////////////////////////////////////////////////////
  module("queryStorage.put");
  test("put called substorage put", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });
    Storage200.prototype.put = function (id, param) {
      assert.equal(id, "bar", "put 200 called");
      assert.deepEqual(param, {"title": "foo"}, "put 200 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.remove
  /////////////////////////////////////////////////////////////////
  module("queryStorage.remove");
  test("remove called substorage remove", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });
    Storage200.prototype.remove = function (id) {
      assert.deepEqual(id, "bar", "remove 200 called");
      return id;
    };

    jio.remove("bar")
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("queryStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      assert.equal(id, "bar", "getAttachment 200 called");
      assert.equal(name, "foo", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        assert.equal(result, blob);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("queryStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function (assert) {
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      assert.equal(id, "bar", "putAttachment 200 called");
      assert.equal(name, "foo", "putAttachment 200 called");
      assert.deepEqual(blob2, blob,
                "putAttachment 200 called");
      return "OK";
    };

    jio.putAttachment("bar", "foo", blob)
      .then(function (result) {
        assert.equal(result, "OK");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("queryStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var jio = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "querystorage200"
        }
      });

      Storage200.prototype.removeAttachment = function (id, name) {
        assert.equal(id, "bar", "removeAttachment 200 called");
        assert.equal(name, "foo", "removeAttachment 200 called");
        return "Removed";
      };

      jio.removeAttachment("bar", "foo")
        .then(function (result) {
          assert.equal(result, "Removed");
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  /////////////////////////////////////////////////////////////////
  // queryStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("queryStorage.hasCapacity");
  test("hasCapacity is false by default", function (assert) {
    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    assert.throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'foo' is not implemented on 'query'");
        return true;
      }
    );
  });

  test("hasCapacity list return substorage value", function (assert) {
    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    assert.throws(
      function () {
        jio.hasCapacity("list");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'list' is not implemented on 'querystorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("queryStorage.buildQuery");

  test("substorage should have 'list' capacity", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    });

    jio.allDocs({
      include_docs: true,
      query: 'title: "two"'
    })
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'list' is not implemented on 'querystorage200'");
      })
      .always(function () {
        start();
      });
  });

  test("no manual query if substorage handle everything", function (assert) {
    start = assert.async();
    assert.expect(2);

    function StorageAllDocsNoGet() {
      return this;
    }
    StorageAllDocsNoGet.prototype.get = function () {
      throw new Error("Unexpected get call");
    };
    StorageAllDocsNoGet.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list") ||
          (capacity === "sort") ||
          (capacity === "select") ||
          (capacity === "limit") ||
          (capacity === "query")) {
        return true;
      }
      throw new Error("Unexpected " + capacity + " capacity check");
    };
    StorageAllDocsNoGet.prototype.buildQuery = function (options) {
      assert.deepEqual(options, {
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        query: 'title: "two"'
      },
                "buildQuery called");
      return "taboulet";
    };

    jIO.addStorage('querystoragealldocsnoget', StorageAllDocsNoGet);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystoragealldocsnoget"
      }
    });

    jio.allDocs({
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      query: 'title: "two"'
    })
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: "taboulet",
            total_rows: 8
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

  test("manual query used if substorage does not handle sort",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      function StorageNoSortCapacity() {
        return this;
      }
      StorageNoSortCapacity.prototype.get = function (id) {
        if (id === "foo") {
          assert.equal(id, "foo", "Get foo");
        } else {
          assert.equal(id, "bar", "Get bar");
        }
        return {title: id, id: "ID " + id,
                "another": "property"};
      };
      StorageNoSortCapacity.prototype.hasCapacity = function (capacity) {
        if ((capacity === "list") ||
            (capacity === "select") ||
            (capacity === "limit") ||
            (capacity === "query")) {
          return true;
        }
        return false;
      };
      StorageNoSortCapacity.prototype.buildQuery = function (options) {
        assert.deepEqual(options, {}, "No query parameter");
        var result2 = [{
          id: "foo",
          value: {}
        }, {
          id: "bar",
          value: {}
        }];
        return result2;
      };

      jIO.addStorage('querystoragenosortcapacity', StorageNoSortCapacity);

      var jio = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "querystoragenosortcapacity"
        }
      });

      jio.allDocs({
        sort_on: [["title", "ascending"]],
        limit: [0, 5],
        select_list: ["title", "id"],
        query: 'title: "foo"'
      })
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                doc: {},
                value: {
                  title: "foo",
                  id: "ID foo"
                }
              }],
              total_rows: 1
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

  test("manual query used if substorage does not handle select",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      function StorageNoSelectCapacity() {
        return this;
      }
      StorageNoSelectCapacity.prototype.get = function (id) {
        if (id === "foo") {
          assert.equal(id, "foo", "Get foo");
        } else {
          assert.equal(id, "bar", "Get bar");
        }
        return {title: id, id: "ID " + id,
                "another": "property"};
      };
      StorageNoSelectCapacity.prototype.hasCapacity = function (capacity) {
        if ((capacity === "list") ||
            (capacity === "sort") ||
            (capacity === "limit") ||
            (capacity === "query")) {
          return true;
        }
        return false;
      };
      StorageNoSelectCapacity.prototype.buildQuery = function (options) {
        assert.deepEqual(options, {}, "No query parameter");
        var result2 = [{
          id: "foo",
          value: {}
        }, {
          id: "bar",
          value: {}
        }];
        return result2;
      };

      jIO.addStorage('querystoragenoselectcapacity', StorageNoSelectCapacity);

      var jio = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "querystoragenoselectcapacity"
        }
      });

      jio.allDocs({
        sort_on: [["title", "ascending"]],
        limit: [0, 5],
        select_list: ["title", "id"],
        query: 'title: "foo"'
      })
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                doc: {},
                value: {
                  title: "foo",
                  id: "ID foo"
                }
              }],
              total_rows: 1
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

  test("manual query used if substorage does not handle limit",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      function StorageNoLimitCapacity() {
        return this;
      }
      StorageNoLimitCapacity.prototype.get = function (id) {
        if (id === "foo") {
          assert.equal(id, "foo", "Get foo");
        } else {
          assert.equal(id, "bar", "Get bar");
        }
        return {title: id, id: "ID " + id,
                "another": "property"};
      };
      StorageNoLimitCapacity.prototype.hasCapacity = function (capacity) {
        if ((capacity === "list") ||
            (capacity === "select") ||
            (capacity === "sort") ||
            (capacity === "query")) {
          return true;
        }
        return false;
      };
      StorageNoLimitCapacity.prototype.buildQuery = function (options) {
        assert.deepEqual(options, {}, "No query parameter");
        var result2 = [{
          id: "foo",
          value: {}
        }, {
          id: "bar",
          value: {}
        }];
        return result2;
      };

      jIO.addStorage('querystoragenolimitcapacity', StorageNoLimitCapacity);

      var jio = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "querystoragenolimitcapacity"
        }
      });

      jio.allDocs({
        sort_on: [["title", "ascending"]],
        limit: [0, 5],
        select_list: ["title", "id"],
        query: 'title: "foo"'
      })
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                doc: {},
                value: {
                  title: "foo",
                  id: "ID foo"
                }
              }],
              total_rows: 1
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

  test("manual query used if substorage does not handle query",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      function StorageNoQueryCapacity() {
        return this;
      }
      StorageNoQueryCapacity.prototype.get = function (id) {
        if (id === "foo") {
          assert.equal(id, "foo", "Get foo");
        } else {
          assert.equal(id, "bar", "Get bar");
        }
        return {title: id, id: "ID " + id,
                "another": "property"};
      };
      StorageNoQueryCapacity.prototype.hasCapacity = function (capacity) {
        if ((capacity === "list") ||
            (capacity === "select") ||
            (capacity === "limit") ||
            (capacity === "sort")) {
          return true;
        }
        return false;
      };
      StorageNoQueryCapacity.prototype.buildQuery = function (options) {
        assert.deepEqual(options, {}, "No query parameter");
        var result2 = [{
          id: "foo",
          value: {}
        }, {
          id: "bar",
          value: {}
        }];
        return result2;
      };

      jIO.addStorage('querystoragenoquerycapacity', StorageNoQueryCapacity);

      var jio = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "querystoragenoquerycapacity"
        }
      });

      jio.allDocs({
        sort_on: [["title", "ascending"]],
        limit: [0, 5],
        select_list: ["title", "id"],
        query: 'title: "foo"'
      })
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                doc: {},
                value: {
                  title: "foo",
                  id: "ID foo"
                }
              }],
              total_rows: 1
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

  test("does not fetch doc one by one if substorage handle include_docs",
       function (assert) {
      start = assert.async();
      assert.expect(2);

      function StorageIncludeDocsCapacity() {
        return this;
      }
      StorageIncludeDocsCapacity.prototype.hasCapacity = function (capacity) {
        if ((capacity === "list") ||
            (capacity === "include")) {
          return true;
        }
        return false;
      };
      StorageIncludeDocsCapacity.prototype.buildQuery = function (options) {
        assert.deepEqual(options, {include_docs: true},
                         "Include docs parameter");
        var result2 = [{
          id: "foo",
          value: {},
          doc: {
            title: "foo",
            id: "ID foo",
            another: "property"
          }
        }, {
          id: "bar",
          value: {},
          doc: {
            title: "bar",
            id: "ID bar",
            another: "property"
          }
        }];
        return result2;
      };

      jIO.addStorage('querystorageincludedocscapacity',
                     StorageIncludeDocsCapacity);

      var jio = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "querystorageincludedocscapacity"
        }
      });

      jio.allDocs({
        sort_on: [["title", "ascending"]],
        limit: [0, 5],
        select_list: ["title", "id"],
        query: 'title: "foo"'
      })
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                id: "foo",
                doc: {},
                value: {
                  title: "foo",
                  id: "ID foo"
                }
              }],
              total_rows: 1
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

  test("manual query used and use schema", function (assert) {
    start = assert.async();
    assert.expect(4);

    function StorageSchemaCapacity() {
      return this;
    }
    StorageSchemaCapacity.prototype.get = function (id) {
      var doc = {
        title: id,
        id: "ID " + id,
        "another": "property"
      };
      if (id === "foo") {
        assert.equal(id, "foo", "Get foo");
        doc.modification_date = "Fri, 08 Sep 2017 07:46:27 +0000";
      } else {
        assert.equal(id, "bar", "Get bar");
        doc.modification_date = "Thu, 07 Sep 2017 18:59:23 +0000";
      }
      return doc;
    };

    StorageSchemaCapacity.prototype.hasCapacity = function (capacity) {
      if ((capacity === "list")) {
        return true;
      }
      return false;
    };
    StorageSchemaCapacity.prototype.buildQuery = function (options) {
      assert.deepEqual(options, {}, "No query parameter");
      var result2 = [{
        id: "foo",
        value: {}
      }, {
        id: "bar",
        value: {}
      }];
      return result2;
    };

    jIO.addStorage(
      'querystoragenoschemacapacity',
      StorageSchemaCapacity
    );

    var jio = jIO.createJIO({
      type: "query",
      schema: {
        "modification_date": {
          "type": "string",
          "format": "date-time"
        }
      },
      sub_storage: {
        type: "querystoragenoschemacapacity"
      }
    });

    jio.allDocs({
      sort_on: [["modification_date", "descending"]],
      limit: [0, 5],
      select_list: ['modification_date']
    })
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: [
              {
                id: "foo",
                doc: {},
                value: {
                  modification_date: "Fri, 08 Sep 2017 07:46:27 +0000"
                }
              }, {
                id: "bar",
                doc: {},
                value: {
                  modification_date: "Thu, 07 Sep 2017 18:59:23 +0000"
                }
              }
            ],
            total_rows: 2
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

  test("group_by is not handled", function (assert) {
    start = assert.async();
    assert.expect(3);

    function StorageGroupCapacity() {
      return this;
    }
    StorageGroupCapacity.prototype.hasCapacity = function (capacity) {
      return ((capacity === "list") || (capacity === "group"));
    };

    jIO.addStorage('querystoragegroupcapacity', StorageGroupCapacity);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystoragegroupcapacity"
      }
    });

    jio.allDocs({
      group_by: ["title"]
    })
      .then(function () {
        assert.ok(false, 'Must fail as group is not handled');
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'group' is not implemented on 'query'");
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // queryStorage.repair
  /////////////////////////////////////////////////////////////////
  module("queryStorage.repair");
  test("repair called substorage repair", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "querystorage200"
      }
    }),
      expected_options = {foo: "bar"};

    Storage200.prototype.repair = function (options) {
      assert.deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

    jio.repair(expected_options)
      .then(function (result) {
        assert.equal(result, "OK");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
