/*jslint nomen: true */
/*global jIO, QUnit, sinon */
(function (jIO, QUnit, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////

  function Storage200() {
    this.documents = {};
    return this;
  }

  Storage200.prototype.get = function (id) {
    var context = this;
    return new RSVP.Queue().push(function () {
      return context.documents[id];
    });
  };

  Storage200.prototype.post = function (data) {
    var context = this;
    return new RSVP.Queue().push(function () {
      var id = (Object.keys(context.documents).length + 1).toString();
      context.documents[id] = data;
      return id;
    });
  };

  Storage200.prototype.put = function (id, data) {
    var context = this;
    return new RSVP.Queue().push(function () {
      context.documents[id] = data;
      return context.documents[id];
    });
  };

  Storage200.prototype.remove = function (id) {
    delete this.documents[id];
    return new RSVP.Queue();
  };

  Storage200.prototype.hasCapacity = function () {
    return true;
  };

  Storage200.prototype.buildQuery = function () {
    var context = this;
    return new RSVP.Queue().push(function () {
      return Object.keys(context.documents).map(function (id) {
        return {
          id: id,
          value: context.documents[id]
        };
      });
    });
  };

  jIO.addStorage('sql200', Storage200);

  function Index200() {
    this.attachments = {};
    return this;
  }

  Index200.prototype.putAttachment = function (id, name, data) {
    var context = this;
    return new RSVP.Queue().push(function () {
      context.attachments[id] = {
        id: id,
        name: name,
        data: data
      };
      return context.attachments[id];
    });
  };

  Index200.prototype.getAttachment = function (id) {
    var context = this;
    return new RSVP.Queue().push(function () {
      if (context.attachments[id] !== undefined) {
        return context.attachments[id].data;
      }

      throw new Error("not found");
    });
  };

  jIO.addStorage('index200', Index200);

  /////////////////////////////////////////////////////////////////
  // SqlStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("SqlStorage.constructor", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "sql",
        index_fields: ["title"],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "sql200"
        }
      });
    }
  });

  test("set the type", function () {
    equal(this.jio.__type, "sql");

    stop();
    this.jio.post({
      title: "title 1"
    })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // SqlStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("SqlStorage.hasCapacity", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "sql",
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "sql200"
        }
      });
    }
  });

  test("can list documents", function () {
    ok(this.jio.hasCapacity("list"));
  });

  test("can query documents", function () {
    ok(this.jio.hasCapacity("query"));
  });

  /////////////////////////////////////////////////////////////////
  // SqlStorage.post
  /////////////////////////////////////////////////////////////////
  module("SqlStorage.post", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "sql",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "sql200"
        }
      });
      this.jio.__storage._resetDb([
        "title"
      ]);
      this.db = this.jio.__storage._db;

      this.runSpy = sinon.spy(this.db, "run");
      this.saveSpy = sinon.spy(this.jio.__storage, "_saveDb");
    },
    teardown: function () {
      this.runSpy.restore();
      delete this.runSpy;
      this.saveSpy.restore();
      delete this.saveSpy;
    }
  });

  test("index document", function () {
    var context = this,
      doc = {
        title: "document 1"
      };
    stop();

    this.jio.post(doc)
      .then(function () {
        ok(
          context.saveSpy.calledOnce,
          "save count " + context.saveSpy.callCount
        );
        ok(
          context.runSpy.calledOnce,
          "run count " + context.runSpy.callCount
        );
        equal(
          context.runSpy.firstCall.args[0],
          "INSERT INTO jiosearch VALUES (:id, :title)",
          "run first argument"
        );
        deepEqual(
          context.runSpy.firstCall.args[1],
          {
            ":title": "document 1",
            ":id": "1"
          },
          "run first argument"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // SqlStorage.put
  /////////////////////////////////////////////////////////////////
  module("SqlStorage.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "sql",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "sql200"
        }
      });
      this.jio.__storage._resetDb([
        "title"
      ]);
      this.db = this.jio.__storage._db;

      this.runSpy = sinon.spy(this.db, "run");
      this.saveSpy = sinon.spy(this.jio.__storage, "_saveDb");
    },
    teardown: function () {
      this.runSpy.restore();
      delete this.runSpy;
      this.saveSpy.restore();
      delete this.saveSpy;
    }
  });

  test("index document", function () {
    var context = this,
      doc = {
        title: "document 1"
      };
    stop();

    this.jio.put("1", doc)
      .then(function () {
        ok(
          context.saveSpy.calledOnce,
          "save count " + context.saveSpy.callCount
        );
        ok(
          context.runSpy.calledOnce,
          "run count " + context.runSpy.callCount
        );
        equal(
          context.runSpy.firstCall.args[0],
          "UPDATE jiosearch SET title = :title WHERE id=:id",
          "run first argument"
        );
        deepEqual(
          context.runSpy.firstCall.args[1],
          {
            ":title": "document 1",
            ":id": "1"
          },
          "run first argument"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // SqlStorage.remove
  /////////////////////////////////////////////////////////////////
  module("SqlStorage.remove", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "sql",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "sql200"
        }
      });
      this.jio.__storage._resetDb([
        "title"
      ]);
      this.db = this.jio.__storage._db;

      this.runSpy = sinon.spy(this.db, "run");
      this.saveSpy = sinon.spy(this.jio.__storage, "_saveDb");
    },
    teardown: function () {
      this.runSpy.restore();
      delete this.runSpy;
      this.saveSpy.restore();
      delete this.saveSpy;
    }
  });

  test("remove index document", function () {
    var context = this;
    stop();

    this.jio.remove("1")
      .then(function () {
        ok(
          context.saveSpy.calledOnce,
          "save count " + context.saveSpy.callCount
        );
        ok(
          context.runSpy.calledOnce,
          "run count " + context.runSpy.callCount
        );
        equal(
          context.runSpy.firstCall.args[0],
          "DELETE FROM jiosearch WHERE id=:id",
          "run first argument"
        );
        deepEqual(
          context.runSpy.firstCall.args[1],
          {
            ":id": "1"
          },
          "run first argument"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // SqlStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("SqlStorage.buildQuery", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "sql",
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "sql200"
        }
      });
      this.jio.__storage._resetDb([
        "title"
      ]);
    }
  });

  test("list all documents", function () {
    var context = this;
    stop();

    RSVP.all([
      context.jio.post({
        title: "document 1"
      }),
      context.jio.post({
        title: "document 2"
      })
    ])
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {
                title: "document 1"
              }
            }, {
              id: "2",
              value: {
                title: "document 2"
              }
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

  test("search single field", function () {
    var context = this;
    stop();

    RSVP.all([
      context.jio.post({
        title: "document 1"
      }),
      context.jio.post({
        title: "image 2"
      })
    ])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "doc"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {
                title: "document 1"
              }
            }],
            total_rows: 1
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

  test("search multiple fields", function () {
    this.jio.__storage._resetDb([
      "title",
      "body"
    ]);
    var context = this;
    stop();

    RSVP.all([
      context.jio.post({
        title: "document 1",
        body: "body document 1"
      }),
      context.jio.post({
        title: "image 2",
        body: "body document 2"
      })
    ])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "doc" AND body: "doc"',
          select_list: ['title']
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {
                title: "document 1"
              }
            }],
            total_rows: 1
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

  test("limit results", function () {
    this.jio.__storage._resetDb([
      "title"
    ]);
    var context = this,
      documents = [],
      i = 1;
    stop();

    while (i < 10) {
      documents.push(context.jio.post({
        title: "document " + i
      }));
      i = i + 1;
    }

    RSVP.all(documents)
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "doc"',
          limit: [3, 2]
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "4",
              value: {
                title: "document 4"
              }
            }, {
              id: "5",
              value: {
                title: "document 5"
              }
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

  test("sort results", function () {
    this.jio.__storage._resetDb([
      "title",
      "body"
    ]);
    var context = this;
    stop();

    RSVP.all([
      context.jio.post({
        title: "document 1",
        body: "body document 1"
      }),
      context.jio.post({
        title: "image 2",
        body: "body document 2"
      })
    ])
      .then(function () {
        return context.jio.allDocs({
          query: 'body: "doc"',
          sort_on: [["title", "descending"]],
          select_list: ["title"]
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "2",
              value: {
                title: "image 2"
              }
            }, {
              id: "1",
              value: {
                title: "document 1"
              }
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
}(jIO, QUnit, sinon));
