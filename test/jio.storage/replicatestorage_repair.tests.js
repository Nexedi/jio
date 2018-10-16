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
/*global Blob, RSVP*/
(function (jIO, QUnit, Blob, RSVP) {
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

  for (j = 0; j < 30; j += 1) {
    big_string += "a";
  }

  /////////////////////////////////////////////////////////////////
  // replicateStorage.repair use cases
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.repair.document", {
    setup: function () {
      // Uses memory substorage, so that it is flushed after each run
      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
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

  /////////////////////////////////////////////////////////////////
  // document replication
  /////////////////////////////////////////////////////////////////

  test("local document creation", function () {
    stop();
    expect(3);

    var id,
      context = this;

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_PUT_REMOTE, id]]);
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
          from_local: true,
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
    expect(7);

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_SKIP_LOCAL_CREATION, id]]);
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
    expect(14);

    var id,
      post_id,
      context = this,
      blob = new Blob([big_string]);

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
        return context.jio.putAttachment(id, 'foo', blob);
      })
      .then(function () {
        return context.jio.repair();
      })
      // Document 'id' has been deleted in both storages
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_POST_REMOTE, id]]);
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
        // Attachment should be kept
        return context.jio.__storage._local_sub_storage
                      .getAttachment(post_id, 'foo', {format: 'text'});
      })
      .then(function (result) {
        equal(result, big_string);
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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
    expect(12);

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
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_POST_REMOTE, id]]);
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
          from_local: true,
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
    expect(3);

    var id,
      context = this;

    context.jio.__storage._remote_sub_storage.post({"title": "bar"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_PUT_LOCAL, id]]);
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
          from_local: false,
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
    expect(7);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_SKIP_REMOTE_CREATION, id]]);
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
    expect(3);

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
        deepEqual(error._list, [[error.LOG_UNRESOLVED_CONFLICT, 'conflict']]);
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
    expect(4);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_FORCE_PUT_REMOTE, 'conflict']]);
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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
      expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
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
        .then(function (report) {
          deepEqual(report._list, [[report.LOG_FORCE_PUT_REMOTE, 'conflict']]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: true,
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

  test("local and remote document creations: keep local, " +
       "local not matching query", function () {
      stop();
      expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        local_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 1
      });

      RSVP.all([
        context.jio.put("conflict", {"title": "foo"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {"title": "bar",
                                                       "type": "foobar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          deepEqual(report._list, [[report.LOG_FORCE_PUT_REMOTE, 'conflict']]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: true,
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

  test("local and remote document creations: keep local, " +
       "remote not matching query", function () {
      stop();
      expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        local_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 1
      });

      RSVP.all([
        context.jio.put("conflict", {"title": "foo", "type": "foobar"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {"title": "bar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          deepEqual(report._list, [[report.LOG_FORCE_PUT_REMOTE, 'conflict']]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: true,
            hash: "a0a1b37cee3709101b752c56e59b9d66cce09961"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            type: "foobar"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            type: "foobar"
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
    expect(4);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_FORCE_PUT_LOCAL, 'conflict']]);
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
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
      expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
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
        .then(function (report) {
          deepEqual(report._list, [[report.LOG_FORCE_PUT_LOCAL, 'conflict']]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: false,
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

  test("local and remote document creations: keep remote, " +
       "local not matching query", function () {
      stop();
      expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        local_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 2
      });

      RSVP.all([
        context.jio.put("conflict", {"title": "foo"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {"title": "bar",
                                                       "type": "foobar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          deepEqual(report._list, [[report.LOG_FORCE_PUT_LOCAL, 'conflict']]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: false,
            hash: "45efa2292d54cc4ce1f726ea197bc0b9721fc1dc"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            type: "foobar"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            type: "foobar"
          });
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: keep remote, " +
       "remote not matching query", function () {
      stop();
      expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        local_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 2
      });

      RSVP.all([
        context.jio.put("conflict", {"title": "foo", "type": "foobar"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {"title": "bar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          deepEqual(report._list, [[report.LOG_FORCE_PUT_LOCAL, 'conflict']]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: false,
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
    expect(5);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_SKIP_CONFLICT, 'conflict']]);
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
      expect(5);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
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
        .then(function (report) {
          deepEqual(report._list, [[report.LOG_SKIP_CONFLICT, 'conflict']]);
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
    expect(2);

    var context = this;

    RSVP.all([
      context.jio.put("conflict", {"title": "foo"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "foo"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_FALSE_CONFLICT, 'conflict']]);
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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
    expect(3);

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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_NO_CHANGE, id]]);
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
          from_local: true,
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
    expect(3);

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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_PUT_REMOTE, id]]);
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
          from_local: true,
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


  test("local document modification: use remote post", function () {
    stop();
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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

    context.jio.__storage._remote_sub_storage.post({"title": "foo"})
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_PUT_REMOTE, id]]);
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
          from_local: true,
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
    expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_LOCAL_MODIFICATION, id],
          [report.LOG_NO_CHANGE, id],
        ]);
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
          from_local: true,
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
    expect(3);

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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_PUT_LOCAL, id]
        ]);
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
          from_local: false,
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
    expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_REMOTE_MODIFICATION, id]
        ]);
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
          from_local: true,
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
        deepEqual(error._list, [[error.LOG_UNRESOLVED_CONFLICT, id]]);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document modifications: keep local", function () {
    stop();
    expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_FORCE_PUT_REMOTE, id]]);
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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
    expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_FORCE_PUT_LOCAL, id]]);
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
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
    expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_SKIP_CONFLICT, id]]);
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo99"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_FALSE_CONFLICT, id]]);
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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
    expect(7);

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
      .then(function (report) {
        deepEqual(report._list, [[report.LOG_DELETE_REMOTE, id]]);
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
    expect(7);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_LOCAL_DELETION, id],
          [report.LOG_NO_CHANGE, id]
        ]);
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
          from_local: true,
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local document deletion with attachment", function () {
    stop();
    expect(7);

    var id,
      context = this,
      blob = new Blob([big_string]);

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.remove(id);
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage
                      .putAttachment(id, 'foo', blob);
      })
      .then(function () {
        return context.jio.repair();
      })
      .fail(function (report) {
        deepEqual(report._list, [
          [report.LOG_UNEXPECTED_REMOTE_ATTACHMENT, id]
        ]);
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
        return context.jio.__storage._remote_sub_storage
                      .getAttachment(id, 'foo', {format: 'text'});
      })
      .then(function (result) {
        equal(result, big_string);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion", function () {
    stop();
    expect(7);

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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_DELETE_LOCAL, id]
        ]);
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
    expect(7);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_REMOTE_DELETION, id]
        ]);
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
          from_local: true,
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion with attachment", function () {
    stop();
    expect(7);

    var id,
      context = this,
      blob = new Blob([big_string]);

    context.jio.post({"title": "foo"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.remove(id);
      })
      .then(function () {
        return context.jio.putAttachment(id, 'foo', blob);
      })
      .then(function () {
        return context.jio.repair();
      })
      .fail(function (report) {
        deepEqual(report._list, [
          [report.LOG_UNEXPECTED_LOCAL_ATTACHMENT, id]
        ]);
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
        return context.jio.getAttachment(id, 'foo', {format: 'text'});
      })
      .then(function (result) {
        equal(result, big_string);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "5ea9013447539ad65de308cbd75b5826a2ae30e5"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document deletions", function () {
    stop();
    expect(9);

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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_FALSE_CONFLICT, id]
        ]);
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
    expect(3);

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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_FORCE_PUT_LOCAL, id]
        ]);
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
          from_local: false,
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

  test("local deletion and remote modifications: keep local", function () {
    stop();
    expect(10);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 1,
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
        return RSVP.all([
          context.jio.remove(id),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo99"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_FORCE_DELETE_REMOTE, id]
        ]);
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
        equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_b9296354cdf1dbe0046de11f57a5a24f8f6a78a8 , " +
              "jio_document/"
          ),
          0
        );
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local deletion and remote modifications: keep remote", function () {
    stop();
    expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 2,
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
        return RSVP.all([
          context.jio.remove(id),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo99"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_FORCE_PUT_LOCAL, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99"
        });
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
          from_local: false,
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

  test("local deletion and remote modifications: ignore", function () {
    stop();
    expect(6);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 3,
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
        return RSVP.all([
          context.jio.remove(id),
          context.jio.__storage._remote_sub_storage.put(id, {"title": "foo99"})
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_CONFLICT, id]
        ]);
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
          title: "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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

  test("local modifications and remote deletion", function () {
    stop();
    expect(3);

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
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_FORCE_PUT_REMOTE, id]
        ]);
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
          from_local: true,
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

  test("local modifications and remote deletion: use remote post", function () {
    stop();
    expect(14);

    var id,
      context = this,
      post_id;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
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

    context.jio.__storage._remote_sub_storage.post({"title": "foo"})
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
      // Old id deleted
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_POST_REMOTE, id]
        ]);
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
        equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_b9296354cdf1dbe0046de11f57a5a24f8f6a78a8 , " +
              "jio_document/"
          ),
          0
        );
        equal(error.status_code, 404);
      })
      // Check new id
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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


  test("local modif, remote del: remote post, no check loc mod", function () {
    stop();
    expect(14);

    var id,
      context = this,
      post_id;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      use_remote_post: true,
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

    context.jio.__storage._remote_sub_storage.post({"title": "foo"})
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
      // Old id deleted
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_LOCAL_MODIFICATION, id],
          [report.LOG_POST_REMOTE, id]
        ]);
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
        equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_b9296354cdf1dbe0046de11f57a5a24f8f6a78a8 , " +
              "jio_document/"
          ),
          0
        );
        equal(error.status_code, 404);
      })
      // Check new id
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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

  test("local modifications and remote deletion: keep local", function () {
    stop();
    expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 1,
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
        return RSVP.all([
          context.jio.put(id, {"title": "foo99"}),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      // Old id deleted
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_FORCE_PUT_REMOTE, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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

  test("local modif and remote del: keep local, use remote post", function () {
    stop();
    expect(14);

    var id,
      context = this,
      post_id;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 1,
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

    context.jio.__storage._remote_sub_storage.post({"title": "foo"})
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
      // Old id deleted
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_POST_REMOTE, id]
        ]);
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
        equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_b9296354cdf1dbe0046de11f57a5a24f8f6a78a8 , " +
              "jio_document/"
          ),
          0
        );
        equal(error.status_code, 404);
      })
      // Check new id
      .then(function () {
        return context.jio.allDocs({include_docs: true});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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

  test("local modifications and remote deletion: keep remote", function () {
    stop();
    expect(10);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 2,
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
        return RSVP.all([
          context.jio.put(id, {"title": "foo99"}),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      // id deleted
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_FORCE_DELETE_LOCAL, id]
        ]);
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
        equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_b9296354cdf1dbe0046de11f57a5a24f8f6a78a8 , " +
              "jio_document/"
          ),
          0
        );
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local modif and remote del: keep remote, not check modif", function () {
    stop();
    expect(10);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 2,
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
        return RSVP.all([
          context.jio.put(id, {"title": "foo99"}),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      // id deleted
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_LOCAL_MODIFICATION, id],
          [report.LOG_FORCE_DELETE_LOCAL, id]
        ]);
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
        equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_b9296354cdf1dbe0046de11f57a5a24f8f6a78a8 , " +
              "jio_document/"
          ),
          0
        );
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local modifications and remote deletion: ignore", function () {
    stop();
    expect(6);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 3,
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
        return RSVP.all([
          context.jio.put(id, {"title": "foo99"}),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      // id deleted
      .then(function (report) {
        deepEqual(report._list, [
          [report.LOG_SKIP_CONFLICT, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99"
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
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
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
        console.warn(error);
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
    expect(8);

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
      report_level: 1000,
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
    expect(4);

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
      report_level: 1000,
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
    expect(4);

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
      report_level: 1000,
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

  test("use 1 parallel operation", function () {
    stop();
    expect(16);

    var context = this,
      order_number = 0,
      expected_order_list = [
        'start get 0',
        'stop get 0',
        'start put 0',
        'stop put 0',
        'start get 1',
        'stop get 1',
        'start put 1',
        'stop put 1',
        'start get 2',
        'stop get 2',
        'start put 2',
        'stop put 2',
        'start get 3',
        'stop get 3',
        'start put 3',
        'stop put 3'
      ];

    function assertExecutionOrder(text) {
      equal(text, expected_order_list[order_number],
            expected_order_list[order_number]);
      order_number += 1;
    }

    function StorageOneParallelOperation() {
      this._sub_storage = jIO.createJIO({type: "memory"});
      return this;
    }

    StorageOneParallelOperation.prototype.put = function (id, doc) {
      assertExecutionOrder('start put ' + id);
      var storage = this;
      return storage._sub_storage.put(id, doc)
        .push(function (result) {
          assertExecutionOrder('stop put ' + id);
          return result;
        });
    };

    StorageOneParallelOperation.prototype.get = function (id) {
      assertExecutionOrder('start get ' + id);
      var storage = this;
      return storage._sub_storage.get(id)
        .push(undefined, function (error) {
          assertExecutionOrder('stop get ' + id);
          throw error;
        });
    };
    StorageOneParallelOperation.prototype.buildQuery = function () {
      return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
    };

    StorageOneParallelOperation.prototype.hasCapacity = function () {
      return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
    };

    jIO.addStorage(
      'one_parallel',
      StorageOneParallelOperation
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      local_sub_storage: {
        type: "memory"
      },
      remote_sub_storage: {
        type: "one_parallel"
      }
    });

    return RSVP.all([
      context.jio.put("0", {"title": "foo"}),
      context.jio.put("1", {"title": "foo1"}),
      context.jio.put("2", {"title": "foo2"}),
      context.jio.put("3", {"title": "foo3"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("use 2 parallel operations", function () {
    stop();
    expect(16);

    var context = this,
      order_number = 0,
      expected_order_list = [
        'start get 0',

        'start get 1',
        'stop get 1',
        'start put 1',
        'stop put 1',
        'start get 2',
        'stop get 2',
        'start put 2',

        'stop get 0',
        'start put 0',
        'stop put 0',
        'start get 3',
        'stop get 3',
        'start put 3',
        'stop put 3',

        'stop put 2'
      ],
      defer0,
      defer2;

    function assertExecutionOrder(text) {
      equal(text, expected_order_list[order_number],
            expected_order_list[order_number]);
      order_number += 1;
    }

    function StorageTwoParallelOperation() {
      this._sub_storage = jIO.createJIO({type: "memory"});
      return this;
    }

    StorageTwoParallelOperation.prototype.put = function (id, doc) {
      var storage = this;
      assertExecutionOrder('start put ' + id);
      return new RSVP.Queue()
        .push(function () {
          if (id === "2") {
            defer0.resolve();
            defer2 = RSVP.defer();
            return defer2.promise;
          }
        })
        .push(function () {
          return storage._sub_storage.put(id, doc);
        })
        .push(function (result) {
          if (id === "3") {
            defer2.resolve();
          }
          assertExecutionOrder('stop put ' + id);
          return result;
        });
    };

    StorageTwoParallelOperation.prototype.get = function (id) {
      var storage = this;
      assertExecutionOrder('start get ' + id);
      return new RSVP.Queue()
        .push(function () {
          if (id === "0") {
            defer0 = RSVP.defer();
            return defer0.promise;
          }
        })
        .push(function () {
          return storage._sub_storage.get(id);
        })
        .push(undefined, function (error) {
          assertExecutionOrder('stop get ' + id);
          throw error;
        });
    };
    StorageTwoParallelOperation.prototype.buildQuery = function () {
      return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
    };

    StorageTwoParallelOperation.prototype.hasCapacity = function () {
      return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
    };

    jIO.addStorage(
      'two_parallel',
      StorageTwoParallelOperation
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      parallel_operation_amount: 2,
      local_sub_storage: {
        type: "memory"
      },
      remote_sub_storage: {
        type: "two_parallel"
      }
    });

    return RSVP.all([
      context.jio.put("0", {"title": "foo"}),
      context.jio.put("1", {"title": "foo1"}),
      context.jio.put("2", {"title": "foo2"}),
      context.jio.put("3", {"title": "foo3"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  test("use 4 parallel operations", function () {
    stop();
    expect(16);

    var context = this,
      order_number = 0,
      expected_order_list = [
        'start get 0',
        'start get 1',
        'start get 2',
        'start get 3',
        'stop get 0',
        'stop get 1',
        'stop get 2',
        'stop get 3',
        'start put 0',
        'start put 1',
        'start put 2',
        'start put 3',
        'stop put 0',
        'stop put 1',
        'stop put 2',
        'stop put 3'
      ];

    function assertExecutionOrder(text) {
      equal(text, expected_order_list[order_number],
            expected_order_list[order_number]);
      order_number += 1;
    }

    function StorageFourParallelOperation() {
      this._sub_storage = jIO.createJIO({type: "memory"});
      return this;
    }

    StorageFourParallelOperation.prototype.put = function (id, doc) {
      assertExecutionOrder('start put ' + id);
      var storage = this;
      return storage._sub_storage.put(id, doc)
        .push(function (result) {
          assertExecutionOrder('stop put ' + id);
          return result;
        });
    };

    StorageFourParallelOperation.prototype.get = function (id) {
      assertExecutionOrder('start get ' + id);
      var storage = this;
      return storage._sub_storage.get(id)
        .push(undefined, function (error) {
          assertExecutionOrder('stop get ' + id);
          throw error;
        });
    };
    StorageFourParallelOperation.prototype.buildQuery = function () {
      return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
    };

    StorageFourParallelOperation.prototype.hasCapacity = function () {
      return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
    };

    jIO.addStorage(
      'four_parallel',
      StorageFourParallelOperation
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      parallel_operation_amount: 4,
      local_sub_storage: {
        type: "memory"
      },
      remote_sub_storage: {
        type: "four_parallel"
      }
    });

    return RSVP.all([
      context.jio.put("0", {"title": "foo"}),
      context.jio.put("1", {"title": "foo1"}),
      context.jio.put("2", {"title": "foo2"}),
      context.jio.put("3", {"title": "foo3"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


}(jIO, QUnit, Blob, RSVP));