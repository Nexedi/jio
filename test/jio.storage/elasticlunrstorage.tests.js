/*jslint nomen: true */
/*global jIO, QUnit, sinon, Blob, elasticlunr, localStorage */
(function (jIO, QUnit, sinon, Blob, elasticlunr, localStorage) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    throws = QUnit.throws,
    expect = QUnit.expect;

  // helper function to generate Elasticlunr index which is a Blob
  function indexDocuments(jio, documents) {
    return RSVP.all(documents.map(function (doc) {
      var data = JSON.parse(JSON.stringify(doc.value));
      data.id = doc.id.toString();

      return jio.__storage._getIndex().push(function (index) {
        index.addDoc(data);
        return jio.__storage._saveIndex();
      });
    }));
  }

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////

  function Storage200() {
    return this;
  }

  jIO.addStorage('elasticlunr200', Storage200);

  function Index200() {
    return this;
  }

  jIO.addStorage('index200', Index200);

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.constructor");

  test("no index substorage throws error", function () {
    throws(
      function () {
        jIO.createJIO({
          type: "elasticlunr"
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(
          error.message,
          "Elasticlunr 'index_sub_storage' must be provided."
        );
        return true;
      }
    );
  });

  test("index substorage no getAttachment capacity throws error", function () {
    delete Index200.prototype.getAttachment;

    throws(
      function () {
        jIO.createJIO({
          type: "elasticlunr",
          index_sub_storage: {
            type: "index200"
          }
        });
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(
          error.message,
          "Capacity 'getAttachment' is not implemented on 'index200'"
        );
        return true;
      }
    );
  });

  test("no substorage throws error", function () {
    Index200.prototype.getAttachment = function () {
      return true;
    };

    throws(
      function () {
        jIO.createJIO({
          type: "elasticlunr",
          index_sub_storage: {
            type: "index200"
          }
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(
          error.message,
          "Elasticlunr 'sub_storage' must be provided."
        );
        return true;
      }
    );
  });

  test("creates an index", function () {
    Index200.prototype.getAttachment = function () {
      return true;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_fields: ["title"],
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    });

    equal(jio.__type, "elasticlunr");
    equal(
      jio.__storage._index_sub_storage_key,
      "jio_elasticlunr_elasticlunr200"
    );
    equal(jio.__storage._index_id, "id");
    deepEqual(jio.__storage._index_fields, ["title"]);
  });

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.hasCapacity", {
    setup: function () {
      Index200.prototype.getAttachment = function () {
        return true;
      };

      this.jio = jIO.createJIO({
        type: "elasticlunr",
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "elasticlunr200"
        }
      });
    }
  });

  test("can index documents", function () {
    ok(this.jio.hasCapacity("index"));
  });

  test("can query documents", function () {
    ok(this.jio.hasCapacity("query"));
  });

  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return false;
    };

    throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(
          error.message,
          "Capacity 'foo' is not implemented on 'elasticlunr200'"
        );
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.get
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.get");

  test("get called substorage get", function () {
    stop();
    expect(2);

    Index200.prototype.getAttachment = function () {
      return true;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    });

    Storage200.prototype.get = function (param) {
      equal(param, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
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
  // ElasticlunrStorage.post
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.post", {
    setup: function () {
      Index200.prototype.getAttachment = function (id) {
        equal(
          id,
          "jio_elasticlunr_elasticlunr200",
          "post index200#getAttachment called"
        );
        throw new Error("not found");
      };

      this.jio = jIO.createJIO({
        type: "elasticlunr",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "elasticlunr200"
        }
      });

      Storage200.prototype.post = function (param) {
        deepEqual(param, {"title": "document 1"}, "post 200 called");
        return "bar";
      };

      this.jio.__storage._saveIndex = function () {
        return true;
      };

      this.getIndexSpy = sinon.spy(this.jio.__storage, "_getIndex");
      this.saveIndexSpy = sinon.spy(this.jio.__storage, "_saveIndex");
    },
    teardown: function () {
      this.getIndexSpy.restore();
      delete this.getIndexSpy;
      this.saveIndexSpy.restore();
      delete this.saveIndexSpy;
    }
  });

  test("index document", function () {
    var context = this,
      doc = {
        title: "document 1"
      };
    stop();
    expect(4);

    this.jio.post(doc)
      .then(function () {
        ok(
          context.getIndexSpy.calledOnce,
          "get index count " + context.getIndexSpy.callCount
        );
        ok(
          context.saveIndexSpy.calledOnce,
          "save index count " + context.saveIndexSpy.callCount
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
  // ElasticlunrStorage.put
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.put", {
    setup: function () {
      Index200.prototype.getAttachment = function (id) {
        equal(
          id,
          "jio_elasticlunr_elasticlunr200",
          "put index200#getAttachment called"
        );
        throw new Error("not found");
      };

      this.jio = jIO.createJIO({
        type: "elasticlunr",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "elasticlunr200"
        }
      });

      Storage200.prototype.put = function (id, param) {
        equal(id, "1", "put 200 called");
        deepEqual(param, {"title": "document 1"}, "put 200 called");
        return "bar";
      };

      this.jio.__storage._saveIndex = function () {
        return true;
      };

      this.getIndexSpy = sinon.spy(this.jio.__storage, "_getIndex");
      this.saveIndexSpy = sinon.spy(this.jio.__storage, "_saveIndex");
    },
    teardown: function () {
      this.getIndexSpy.restore();
      delete this.getIndexSpy;
      this.saveIndexSpy.restore();
      delete this.saveIndexSpy;
    }
  });

  test("index document", function () {
    var context = this,
      doc = {
        title: "document 1"
      };
    stop();
    expect(5);

    this.jio.put("1", doc)
      .then(function () {
        ok(
          context.getIndexSpy.calledOnce,
          "get index count " + context.getIndexSpy.callCount
        );
        ok(
          context.saveIndexSpy.calledOnce,
          "save index count " + context.saveIndexSpy.callCount
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
  // ElasticlunrStorage.remove
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.remove", {
    setup: function () {
      Index200.prototype.getAttachment = function (id) {
        equal(
          id,
          "jio_elasticlunr_elasticlunr200",
          "put index200#getAttachment called"
        );
        throw new Error("not found");
      };

      this.jio = jIO.createJIO({
        type: "elasticlunr",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "elasticlunr200"
        }
      });

      Storage200.prototype.get = function (id) {
        equal(id, "1", "get 200 called");
        return {
          id: id
        };
      };

      Storage200.prototype.remove = function (id) {
        equal(id, "1", "remove 200 called");
        return "bar";
      };

      this.jio.__storage._saveIndex = function () {
        return true;
      };

      this.getIndexSpy = sinon.spy(this.jio.__storage, "_getIndex");
      this.saveIndexSpy = sinon.spy(this.jio.__storage, "_saveIndex");
    },
    teardown: function () {
      this.getIndexSpy.restore();
      delete this.getIndexSpy;
      this.saveIndexSpy.restore();
      delete this.saveIndexSpy;
    }
  });

  test("remove index document", function () {
    var context = this;
    stop();
    expect(5);

    this.jio.remove("1")
      .then(function () {
        ok(
          context.getIndexSpy.calledOnce,
          "get index count " + context.getIndexSpy.callCount
        );
        ok(
          context.saveIndexSpy.calledOnce,
          "save index count " + context.saveIndexSpy.callCount
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
  // ElasticlunrStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.getAttachment");

  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    Index200.prototype.getAttachment = function () {
      return true;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "bar", "getAttachment 200 called");
      equal(name, "foo", "getAttachment 200 called");
      return blob;
    };

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
  // ElasticlunrStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.putAttachment");

  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    Index200.prototype.getAttachment = function () {
      return true;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "foo", "putAttachment 200 called");
      deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

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
  // ElasticlunrStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.removeAttachment");

  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    Index200.prototype.getAttachment = function () {
      return true;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    });

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return "Removed";
    };

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
  // ElasticlunrStorage.repair
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.repair");

  test("repair called substorage repair", function () {
    stop();
    expect(2);

    Index200.prototype.getAttachment = function () {
      return true;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    }),
      expected_options = {foo: "bar"};

    Storage200.prototype.repair = function (options) {
      deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

    jio.repair(expected_options)
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
  // ElasticlunrStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.buildQuery", {
    setup: function () {
      Index200.prototype.putAttachment = function () {
        return true;
      };

      Index200.prototype.getAttachment = function () {
        return true;
      };

      this.jio = jIO.createJIO({
        type: "elasticlunr",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "elasticlunr200"
        }
      });

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("no query", function () {
    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list';
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {}, "buildQuery 200 called");
      return [];
    };

    stop();
    expect(1);

    this.jio.allDocs({})
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("query containing OR", function () {
    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list';
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        query: 'title: "foo" OR subtitle: "bar"'
      }, "buildQuery 200 called");
      return [];
    };

    stop();
    expect(2);

    this.jio.allDocs({
      query: 'title: "foo" OR subtitle: "bar"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("single indexed property WITH filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list' || name === 'query_filtered';
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        ids: ["1"]
      }, "buildQuery 200 called");
      return [];
    };

    stop();
    expect(2);

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo",
        subtitle: "bar"
      }
    }, {
      id: "2",
      value: {
        title: "bar",
        subtitle: "bar"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("single indexed property NO filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list' || name === 'query';
    };

    delete Storage200.prototype.buildQuery;

    stop();

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo",
        subtitle: "bar"
      }
    }, {
      id: "2",
      value: {
        title: "bar",
        subtitle: "bar"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {}
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

  test("indexed properties WITH filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list' || name === 'query_filtered';
    };

    delete Storage200.prototype.buildQuery;

    stop();

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title", "subtitle"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo",
        subtitle: "bar"
      }
    }, {
      id: "2",
      value: {
        title: "bar",
        subtitle: "bar"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo" AND subtitle: "bar"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {}
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

  test("indexed properties NO filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list';
    };

    delete Storage200.prototype.buildQuery;

    stop();

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title", "subtitle"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo",
        subtitle: "bar"
      }
    }, {
      id: "2",
      value: {
        title: "bar",
        subtitle: "bar"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo" AND subtitle: "bar"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {}
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

  test("non-indexed properties WITH filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list' || name === 'query' || name === 'query_filtered';
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        query: '( subtitle:  "bar" )',
        ids: ["1"]
      }, "buildQuery 200 called");
      return [];
    };

    stop();
    expect(2);

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo",
        subtitle: "bar"
      }
    }, {
      id: "2",
      value: {
        title: "bar",
        subtitle: "foo"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo" AND subtitle: "bar"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("non-indexed properties NO filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list' || name === 'query';
    };

    stop();
    expect(1);

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo",
        subtitle: "bar"
      }
    }, {
      id: "2",
      value: {
        title: "bar",
        subtitle: "foo"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo" AND subtitle: "bar"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {}
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

  test("include docs WITH filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list' || name === 'query' || name === 'include' ||
        name === 'query_filtered';
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        query: '( subtitle:  "bar" )',
        include_docs: true,
        ids: ["1"]
      }, "buildQuery 200 called");
      return [];
    };

    stop();
    expect(2);

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo"
      }
    }, {
      id: "2",
      value: {
        title: "bar"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo" AND subtitle: "bar"',
          include_docs: true
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("include docs NO filter capacity", function () {
    var context = this;

    Storage200.prototype.hasCapacity = function (name) {
      return name === 'list' || name === 'query' || name === 'include';
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        query: 'title: "foo"',
        include_docs: true
      }, "buildQuery 200 called");
      return [];
    };

    stop();
    expect(2);

    // index documents to execute query
    this.jio.__storage._resetIndex([
      "title"
    ]);
    indexDocuments(this.jio, [{
      id: "1",
      value: {
        title: "foo"
      }
    }, {
      id: "2",
      value: {
        title: "bar"
      }
    }])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo"',
          include_docs: true
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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
  // ElasticlunrStorage.__storage._getIndex
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.__storage._getIndex", {
    setup: function () {
      this.loadIndexStub = sinon.stub(elasticlunr.Index, "load");
    },
    teardown: function () {
      this.loadIndexStub.restore();
      delete this.loadIndexStub;
    }
  });

  test("loads existing index", function () {
    Index200.prototype.getAttachment = function (id, name) {
      equal(
        id,
        "jio_elasticlunr_elasticlunr200",
        "getAttachment 200 called"
      );
      equal(
        name,
        "jio_elasticlunr_elasticlunr200",
        "getAttachment 200 called"
      );

      return new Blob(["{}"]);
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    }),
      context = this;

    stop();
    expect(3);

    jio.__storage._getIndex()
      .then(function () {
        ok(
          context.loadIndexStub.calledOnce,
          "load index count " + context.loadIndexStub.callCount
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("creates new index", function () {
    Index200.prototype.getAttachment = function (id, name) {
      equal(
        id,
        "jio_elasticlunr_elasticlunr200",
        "getAttachment 200 called"
      );
      equal(
        name,
        "jio_elasticlunr_elasticlunr200",
        "getAttachment 200 called"
      );

      return null;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    }),
      context = this;

    stop();
    expect(3);

    jio.__storage._getIndex()
      .then(function () {
        ok(
          context.loadIndexStub.notCalled,
          "load index count " + context.callCount
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
  // ElasticlunrStorage.__storage._saveIndex
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.__storage._saveIndex", {
    setup: function () {
      this.notifyIndexChangedStub = sinon.stub(localStorage, "setItem");
    },
    teardown: function () {
      this.notifyIndexChangedStub.restore();
      delete this.notifyIndexChangedStub;
    }
  });

  test("stores index as attachment", function () {
    Index200.prototype.getAttachment = function () {
      return true;
    };

    var jio = jIO.createJIO({
      type: "elasticlunr",
      index_sub_storage: {
        type: "index200"
      },
      sub_storage: {
        type: "elasticlunr200"
      }
    }),
      blob = new Blob(["{}"]),
      context = this;

    jio.__storage._getIndex = function () {
      return new RSVP.Queue().push(function () {
        return {};
      });
    };

    Index200.prototype.putAttachment = function (id, name, blob2) {
      equal(
        id,
        "jio_elasticlunr_elasticlunr200",
        "putAttachment 200 called"
      );
      equal(
        name,
        "jio_elasticlunr_elasticlunr200",
        "putAttachment 200 called"
      );
      deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    stop();
    expect(5);

    jio.__storage._saveIndex()
      .then(function (result) {
        equal(result, "OK");
        ok(
          context.notifyIndexChangedStub.called,
          "load index count " + context.callCount
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
}(jIO, QUnit, sinon, Blob, elasticlunr, localStorage));
