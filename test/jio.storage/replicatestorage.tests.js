/*jslint nomen: true*/
(function (jIO, QUnit) {
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

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('replicatestorage200', Storage200);

  function Storage500() {
    return this;
  }
  jIO.addStorage('replicatestorage500', Storage500);

  function Storage2713() {
    return this;
  }
  jIO.addStorage('signaturestorage2713', Storage2713);

  /////////////////////////////////////////////////////////////////
  // replicateStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    ok(jio.__storage._local_sub_storage instanceof jio.constructor);
    equal(jio.__storage._local_sub_storage.__type, "replicatestorage200");
    ok(jio.__storage._remote_sub_storage instanceof jio.constructor);
    equal(jio.__storage._remote_sub_storage.__type, "replicatestorage500");

    deepEqual(jio.__storage._query_options, {});
    equal(jio.__storage._use_remote_post, false);
    equal(jio.__storage._conflict_handling, 0);
    equal(jio.__storage._check_local_creation, true);
    equal(jio.__storage._check_local_deletion, true);
    equal(jio.__storage._check_local_modification, true);
    equal(jio.__storage._check_remote_creation, true);
    equal(jio.__storage._check_remote_deletion, true);
    equal(jio.__storage._check_remote_modification, true);

    equal(jio.__storage._signature_hash,
          "_replicate_7209dfbcaff00f6637f939fdd71fa896793ed385");

    ok(jio.__storage._signature_sub_storage instanceof jio.constructor);
    equal(jio.__storage._signature_sub_storage.__type, "document");

    equal(jio.__storage._signature_sub_storage.__storage._document_id,
          jio.__storage._signature_hash);

    ok(jio.__storage._signature_sub_storage.__storage._sub_storage
       instanceof jio.constructor);
    equal(jio.__storage._signature_sub_storage.__storage._sub_storage.__type,
          "replicatestorage200");

  });

  test("accept parameters", function () {
    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      },
      signature_storage: {
        type: "signaturestorage2713"
      },
      query: {query: 'portal_type: "Foo"', limit: [0, 1234567890]},
      use_remote_post: true,
      conflict_handling: 3,
      check_local_creation: false,
      check_local_deletion: false,
      check_local_modification: false,
      check_remote_creation: false,
      check_remote_deletion: false,
      check_remote_modification: false
    });

    deepEqual(
      jio.__storage._query_options,
      {query: 'portal_type: "Foo"', limit: [0, 1234567890]}
    );
    equal(jio.__storage._use_remote_post, true);
    equal(jio.__storage._conflict_handling, 3);
    equal(jio.__storage._check_local_creation, false);
    equal(jio.__storage._check_local_deletion, false);
    equal(jio.__storage._check_local_modification, false);
    equal(jio.__storage._check_remote_creation, false);
    equal(jio.__storage._check_remote_deletion, false);
    equal(jio.__storage._check_remote_modification, false);

    equal(jio.__storage._signature_sub_storage.__storage._sub_storage.__type,
          "signaturestorage2713");
    equal(jio.__storage._signature_hash,
          "_replicate_11881e431308c0ec8c0e6430be98db380e1b92f8");
  });

  test("reject unknow conflict resolution", function () {
    throws(
      function () {
        jIO.createJIO({
          type: "replicate",
          local_sub_storage: {
            type: "replicatestorage200"
          },
          remote_sub_storage: {
            type: "replicatestorage500"
          },
          query: {query: 'portal_type: "Foo"', limit: [0, 1234567890]},
          conflict_handling: 4
        });
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 400);
        equal(error.message,
              "Unsupported conflict handling: 4");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.get
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
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
  // replicateStorage.post
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    Storage200.prototype.post = function (param) {
      deepEqual(param, {title: "bar"}, "post 200 called");
      return "foo";
    };

    jio.post({title: "bar"})
      .then(function (result) {
        equal(result, "foo", "Check id");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    delete Storage200.prototype.hasCapacity;

    throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'foo' is not implemented on 'replicatestorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        include_docs: false,
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        replicate: 'title: "two"'
      }, "allDocs parameter");
      return "bar";
    };

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      replicate: 'title: "two"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: "bar",
            total_rows: 3
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
  // replicateStorage.put
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    Storage200.prototype.put = function (id, param) {
      equal(id, "bar", "put 200 called");
      deepEqual(param, {"title": "foo"}, "put 200 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        equal(result, "bar");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put can not modify the signature", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    delete Storage200.prototype.put;

    jio.put(jio.__storage._signature_hash, {"title": "foo"})
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, jio.__storage._signature_hash + " is frozen");
        equal(error.status_code, 403);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.remove
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    Storage200.prototype.remove = function (id) {
      equal(id, "bar", "remove 200 called");
      return id;
    };

    jio.remove("bar", {"title": "foo"})
      .then(function (result) {
        equal(result, "bar");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove can not modify the signature", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    delete Storage200.prototype.remove;

    jio.remove(jio.__storage._signature_hash)
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, jio.__storage._signature_hash + " is frozen");
        equal(error.status_code, 403);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.repair use cases
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.repair", {
    setup: function () {
      // Uses memory substorage, so that it is flushed after each run
      this.jio = jIO.createJIO({
        type: "replicate",
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      });

    }
  });

  test("local document creation", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document creation not checked", function () {
    stop();
    expect(6);

    this.jio = jIO.createJIO({
      type: "replicate",
      check_local_creation: false,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("local document creation and use remote post", function () {
    stop();
    expect(12);

    var id,
      post_id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      use_remote_post: true,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      // Document 'id' has been deleted in both storages
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function () {
        ok(false, "Signature should have been deleted");
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 404);
      })

      // But another document should have been created
      .then(function () {
        return context.jio.__storage._remote_sub_storage.allDocs();
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document creation, remote post and delayed allDocs", function () {
    stop();
    expect(11);

    var id,
      post_id = "_foobar",
      context = this;

    function Storage200DelayedAllDocs(spec) {
      this._sub_storage = jIO.createJIO(spec.sub_storage);
    }
    Storage200DelayedAllDocs.prototype.get = function () {
      return this._sub_storage.get.apply(this._sub_storage, arguments);
    };
    Storage200DelayedAllDocs.prototype.post = function (param) {
      return this.put(post_id, param);
    };
    Storage200DelayedAllDocs.prototype.put = function () {
      return this._sub_storage.put.apply(this._sub_storage, arguments);
    };
    Storage200DelayedAllDocs.prototype.hasCapacity = function () {
      return true;
    };
    Storage200DelayedAllDocs.prototype.buildQuery = function () {
      return [];
    };
    jIO.addStorage(
      'replicatestorage200delayedalldocs',
      Storage200DelayedAllDocs
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      use_remote_post: true,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "replicatestorage200delayedalldocs",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      // Document 'id' has been deleted in both storages
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 404);
      })

      // But another document should have been created
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remote document creation", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.__storage._remote_sub_storage.post({"title": "bar"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "6799f3ea80e325b89f19589282a343c376c1f1af"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remote document creation not checked", function () {
    stop();
    expect(6);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      check_remote_creation: false,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.__storage._remote_sub_storage.post({"title": "bar"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations", function () {
    stop();
    expect(5);

    var context = this;

    RSVP.all([
      context.jio.put("conflict", {"title": "foo"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "bar"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Conflict on 'conflict': " +
                             "{\"title\":\"foo\"} !== {\"title\":\"bar\"}");
        equal(error.status_code, 409);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
//        equal(error.message, "Cannot find document: conflict");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations: keep local", function () {
    stop();
    expect(3);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      conflict_handling: 1
    });

    RSVP.all([
      context.jio.put("conflict", {"title": "foo"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "bar"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations: keep local, remote post",
    function () {
      stop();
      expect(3);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        use_remote_post: 1,
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        },
        conflict_handling: 1
      });

      RSVP.all([
        context.jio.put("conflict", {"title": "foo"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {"title": "bar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo"
          });
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: keep remote", function () {
    stop();
    expect(3);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      conflict_handling: 2
    });

    RSVP.all([
      context.jio.put("conflict", {"title": "foo"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "bar"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "6799f3ea80e325b89f19589282a343c376c1f1af"
        });
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations: keep remote, remote post",
    function () {
      stop();
      expect(3);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        use_remote_post: 1,
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        },
        conflict_handling: 2
      });

      RSVP.all([
        context.jio.put("conflict", {"title": "foo"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {"title": "bar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            hash: "6799f3ea80e325b89f19589282a343c376c1f1af"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar"
          });
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: continue", function () {
    stop();
    expect(4);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      conflict_handling: 3
    });

    RSVP.all([
      context.jio.put("conflict", {"title": "foo"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "bar"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
//        equal(error.message, "Cannot find document: conflict");
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations: continue, remote post",
    function () {
      stop();
      expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        use_remote_post: 1,
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        },
        conflict_handling: 3
      });

      RSVP.all([
        context.jio.put("conflict", {"title": "foo"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {"title": "bar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .fail(function (error) {
          ok(error instanceof jIO.util.jIOError);
          //        equal(error.message, "Cannot find document: conflict");
          equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar"
          });
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote same document creations", function () {
    stop();
    expect(1);

    var context = this;

    RSVP.all([
      context.jio.put("conflict", {"title": "foo"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "foo"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("no modification", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document modification", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.put(id, {"title": "foo2"});
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo2"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "9819187e39531fdc9bcfd40dbc6a7d3c78fe8dab"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document modification not checked", function () {
    stop();
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      check_local_modification: false,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.put(id, {"title": "foo2"});
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo2"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remote document modification", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.put(
          id,
          {"title": "foo3"}
        );
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo3"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "4b1dde0f80ac38514771a9d25b5278e38f560e0f"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remote document modification not checked", function () {
    stop();
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      check_remote_modification: false,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.put(
          id,
          {"title": "foo3"}
        );
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo3"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document modifications", function () {
    stop();
    expect(4);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {"title": "foo4"}),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo5"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Conflict on '" + id + "': " +
                             "{\"title\":\"foo4\"} !== {\"title\":\"foo5\"}");
        equal(error.status_code, 409);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document modifications: keep local", function () {
    stop();
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      conflict_handling: 1
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {"title": "foo4"}),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo5"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "6f700e813022233a785692585484c21cb5a412fd"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo4"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo4"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document modifications: keep remote", function () {
    stop();
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      conflict_handling: 2
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {"title": "foo4"}),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo5"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "7bea6f87fd1dda14e340e5b14836cc8578fd615f"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo5"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document modifications: continue", function () {
    stop();
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      conflict_handling: 3
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {"title": "foo4"}),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo5"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo4"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo5"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document same modifications", function () {
    stop();
    expect(1);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {"title": "foo99"}),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo99"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "8ed3a474128b6e0c0c7d3dd51b1a06ebfbf6722f"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document deletion", function () {
    stop();
    expect(6);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.remove(id);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id)
          .then(function () {
            ok(false, "Signature should be deleted");
          })
          .fail(function (error) {
            ok(error instanceof jIO.util.jIOError);
//            equal(error.message, "Cannot find document: " + id);
            equal(error.status_code, 404);
          });
      })
      .always(function () {
        start();
      });
  });

  test("local document deletion not checked", function () {
    stop();
    expect(6);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      check_local_deletion: false,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.remove(id);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion", function () {
    stop();
    expect(6);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.remove(id);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id)
          .then(function () {
            ok(false, "Signature should be deleted");
          })
          .fail(function (error) {
            ok(error instanceof jIO.util.jIOError);
//            equal(error.message, "Cannot find document: " + id);
            equal(error.status_code, 404);
          });
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion not checked", function () {
    stop();
    expect(6);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      check_remote_deletion: false,
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.remove(id);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document deletions", function () {
    stop();
    expect(8);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.remove(id),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id)
          .then(function () {
            ok(false, "Document should be locally deleted");
          })
          .fail(function (error) {
            ok(error instanceof jIO.util.jIOError);
            equal(error.message, "Cannot find document: " + id);
            equal(error.status_code, 404);
          });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id)
          .then(function () {
            ok(false, "Document should be remotely deleted");
          })
          .fail(function (error) {
            ok(error instanceof jIO.util.jIOError);
            equal(error.message, "Cannot find document: " + id);
            equal(error.status_code, 404);
          });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id)
          .then(function () {
            ok(false, "Signature should be deleted");
          })
          .fail(function (error) {
            ok(error instanceof jIO.util.jIOError);
//            equal(error.message, "Cannot find document: " + id);
            equal(error.status_code, 404);
          });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local deletion and remote modifications", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.remove(id),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo99"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "8ed3a474128b6e0c0c7d3dd51b1a06ebfbf6722f"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local modifications and remote deletion", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {"title": "foo99"}),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "8ed3a474128b6e0c0c7d3dd51b1a06ebfbf6722f"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("signature document is not synced", function () {
    stop();
    expect(6);

    var context = this;

    // Uses sessionstorage substorage, so that signature are stored
    // in the same local sub storage
    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "document",
          document_id: "/",
          sub_storage: {
            type: "local",
            sessiononly: true
          }
        }
      },
      remote_sub_storage: {
        type: "memory"
      }
    });

    context.jio.post({"title": "foo"})
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(
          context.jio.__storage._signature_hash
        );
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " +
                "_replicate_8662994dcefb3a2ceec61e86953efda8ec6520d6");
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(
          context.jio.__storage._signature_hash
        );
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " +
                "_replicate_8662994dcefb3a2ceec61e86953efda8ec6520d6");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("substorages are repaired too", function () {
    stop();
    expect(9);

    var context = this,
      first_call = true,
      options = {foo: "bar"};

    function Storage200CheckRepair() {
      return this;
    }
    Storage200CheckRepair.prototype.get = function () {
      ok(true, "get 200 check repair called");
      return {};
    };
    Storage200CheckRepair.prototype.hasCapacity = function () {
      return true;
    };
    Storage200CheckRepair.prototype.buildQuery = function () {
      ok(true, "buildQuery 200 check repair called");
      return [];
    };
    Storage200CheckRepair.prototype.allAttachments = function () {
      ok(true, "allAttachments 200 check repair called");
      return {};
    };
    Storage200CheckRepair.prototype.repair = function (kw) {
      if (first_call) {
        deepEqual(
          this,
          context.jio.__storage._local_sub_storage.__storage,
          "local substorage repair"
        );
        first_call = false;
      } else {
        deepEqual(
          this,
          context.jio.__storage._remote_sub_storage.__storage,
          "remote substorage repair"
        );
      }
      deepEqual(kw, options, "substorage repair parameters provided");
    };

    jIO.addStorage(
      'replicatestorage200chechrepair',
      Storage200CheckRepair
    );


    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200chechrepair"
      },
      remote_sub_storage: {
        type: "replicatestorage200chechrepair"
      }
    });

    context.jio.repair(options)
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("sync all documents by default", function () {
    stop();
    expect(5);

    var context = this;

    function Storage200DefaultQuery() {
      return this;
    }
    Storage200DefaultQuery.prototype.get = function () {
      ok(true, "get 200 check repair called");
      return {};
    };
    Storage200DefaultQuery.prototype.hasCapacity = function () {
      return true;
    };
    Storage200DefaultQuery.prototype.buildQuery = function (query) {
      deepEqual(query, {});
      return [];
    };
    Storage200DefaultQuery.prototype.allAttachments = function () {
      ok(true, "allAttachments 200 check repair called");
      return {};
    };
    jIO.addStorage(
      'replicatestorage200defaultquery',
      Storage200DefaultQuery
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200defaultquery"
      },
      remote_sub_storage: {
        type: "replicatestorage200defaultquery"
      }
    });

    return context.jio.repair()
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("sync can be restricted to some documents", function () {
    stop();
    expect(5);

    var context = this,
      query = {query: 'portal_type: "Foo"', limit: [0, 1234567890]};

    function Storage200CustomQuery() {
      return this;
    }
    Storage200CustomQuery.prototype.get = function () {
      ok(true, "get 200 check repair called");
      return {};
    };
    Storage200CustomQuery.prototype.hasCapacity = function () {
      return true;
    };
    Storage200CustomQuery.prototype.buildQuery = function (options) {
      deepEqual(options, query);
      return [];
    };
    Storage200CustomQuery.prototype.allAttachments = function () {
      ok(true, "allAttachments 200 check repair called");
      return {};
    };
    jIO.addStorage(
      'replicatestorage200customquery',
      Storage200CustomQuery
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200customquery"
      },
      remote_sub_storage: {
        type: "replicatestorage200customquery"
      },
      query: {query: 'portal_type: "Foo"', limit: [0, 1234567890]}
    });

    return context.jio.repair()
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("bulk remote document creation", function () {
    stop();
    expect(3);

    var id,
      post_id = "123456789",
      context = this;

    function Storage200Bulk(spec) {
      this._sub_storage = jIO.createJIO(spec.sub_storage);
    }
    Storage200Bulk.prototype.bulk = function (args) {
      deepEqual(args, [{
        method: "get",
        parameter_list: [post_id]
      }]);
      return this._sub_storage.get(post_id)
        .push(function (doc) {
          return [doc];
        });
    };
    Storage200Bulk.prototype.post = function (param) {
      return this.put(post_id, param);
    };
    Storage200Bulk.prototype.put = function () {
      return this._sub_storage.put.apply(this._sub_storage, arguments);
    };
    Storage200Bulk.prototype.hasCapacity = function () {
      return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
    };
    Storage200Bulk.prototype.hasCapacityMethod = function () {
      return true;
    };
    Storage200Bulk.prototype.buildQuery = function () {
      return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
    };

    jIO.addStorage(
      'replicatestorage200bulk',
      Storage200Bulk
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "memory"
      },
      remote_sub_storage: {
        type: "replicatestorage200bulk",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.__storage._remote_sub_storage.post({"title": "bar"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "6799f3ea80e325b89f19589282a343c376c1f1af"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("bulk remote document modification", function () {
    stop();
    expect(5);

    var id,
      post_id = "123456789",
      context = this;

    function Storage200Bulk(spec) {
      this._sub_storage = jIO.createJIO(spec.sub_storage);
    }
    Storage200Bulk.prototype.bulk = function (args) {
      deepEqual(args, [{
        method: "get",
        parameter_list: [post_id]
      }]);
      return this._sub_storage.get(post_id)
        .push(function (doc) {
          return [doc];
        });
    };
    Storage200Bulk.prototype.post = function (param) {
      return this.put(post_id, param);
    };
    Storage200Bulk.prototype.put = function () {
      return this._sub_storage.put.apply(this._sub_storage, arguments);
    };
    Storage200Bulk.prototype.hasCapacity = function () {
      return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
    };
    Storage200Bulk.prototype.hasCapacityMethod = function () {
      return true;
    };
    Storage200Bulk.prototype.buildQuery = function () {
      return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
    };
    jIO.addStorage(
      'replicatestorage200bulkremotemodification',
      Storage200Bulk
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "memory"
      },
      remote_sub_storage: {
        type: "replicatestorage200bulkremotemodification",
        sub_storage: {
          type: "memory"
        }
      }
    });

    context.jio.__storage._remote_sub_storage.post({"title": "bar"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "6799f3ea80e325b89f19589282a343c376c1f1af"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.put(
          id,
          {"title": "foo"}
        );
      })
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("no bulk if substorage don't implement it", function () {
    stop();
    expect(2);

    var id,
      post_id = "123456789",
      context = this;
  
    function SubStorage200Bulk() {
      return;
    }

    function Storage200Bulk(spec) {
      this._sub_storage = jIO.createJIO(spec.sub_storage);
    }
    Storage200Bulk.prototype.bulk = function (args) {
      deepEqual(args, [{
        method: "get",
        parameter_list: [post_id]
      }]);
      return this._sub_storage.bulk(args);
    };
    Storage200Bulk.prototype.get = function () {
      return this._sub_storage.get.apply(this._sub_storage, arguments);
    };
    Storage200Bulk.prototype.post = function (param) {
      return this.put(post_id, param);
    };
    Storage200Bulk.prototype.put = function () {
      return this._sub_storage.put.apply(this._sub_storage, arguments);
    };
    Storage200Bulk.prototype.hasCapacity = function () {
      return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
    };
    Storage200Bulk.prototype.hasCapacityMethod = function (name) {
      if (this._sub_storage[name] === undefined) {
        return false; 
      }
    };
    Storage200Bulk.prototype.buildQuery = function () {
      return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
    };

    jIO.addStorage(
      'replicatestorage200nobulk',
      Storage200Bulk
    );
    
    SubStorage200Bulk.prototype.get = function () {
      return {title: "bar"};
    };
    SubStorage200Bulk.prototype.post = function (param) {
      return this.put(post_id, param);
    };
    SubStorage200Bulk.prototype.put = function () {
      return post_id;
    };
    SubStorage200Bulk.prototype.hasCapacity = function () {
      return true;
    };
    SubStorage200Bulk.prototype.buildQuery = function () {
      return [{id: "123456789", value: {"title": "bar"}}];
    };

    jIO.addStorage(
      'replicatesubstorage200nobulk',
      SubStorage200Bulk
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "memory"
      },
      remote_sub_storage: {
        type: "replicatestorage200nobulk",
        sub_storage: {
          type: "replicatesubstorage200nobulk"
        }
      }
    });

    context.jio.__storage._remote_sub_storage.post({"title": "bar"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          hash: "6799f3ea80e325b89f19589282a343c376c1f1af"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
}(jIO, QUnit));
