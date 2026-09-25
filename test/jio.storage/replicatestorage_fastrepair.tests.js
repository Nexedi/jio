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
    start,
    module = QUnit.module,
    big_string = "",
    j;

  for (j = 0; j < 30; j += 1) {
    big_string += "a";
  }

  /////////////////////////////////////////////////////////////////
  // replicateStorage.repair fast use cases
  /////////////////////////////////////////////////////////////////
  function StorageAllDocsDynamicSelect(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }
  StorageAllDocsDynamicSelect.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.buildQuery = function (options) {
    var is_replicate_query = false;
    if ((options.select_list !== undefined) &&
        (options.select_list[0] === 'foo_etag')) {
      options = {
        select_list: ['foo_etag', 'title']
      };
      is_replicate_query = true;
    }
    return this._sub_storage.buildQuery(options)
      .push(function (result) {
        var i;
        if (is_replicate_query === true) {
          for (i = 0; i < result.length; i += 1) {
            result[i].value.foo_etag = result[i].value.title + ' dynetag';
          }
        }
        return result;
      });
  };
  StorageAllDocsDynamicSelect.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  StorageAllDocsDynamicSelect.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };
  jIO.addStorage(
    'storagealldocsdynamicselect',
    StorageAllDocsDynamicSelect
  );

  module("replicateStorage.fast.repair.document", {
    beforeEach: function () {
      // Uses memory substorage, so that it is flushed after each run
      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

    }
  });

  /////////////////////////////////////////////////////////////////
  // document fast replication
  /////////////////////////////////////////////////////////////////

  test("local document creation", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: 'foo etag'})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_PUT_REMOTE, id]
        ]);
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document creation and use remote post", function (assert) {
    start = assert.async();
    assert.expect(14);

    var id,
      post_id,
      context = this,
      blob = new Blob([big_string]);

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      use_remote_post: true,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.post({title: "foo", foo_etag: 'foo etag'})
      .then(function (result) {
        id = result;
        return context.jio.putAttachment(id, 'foo', blob);
      })
      .then(function () {
        return context.jio.repair();
      })
      // Document 'id' has been deleted in both storages
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_POST_REMOTE, id]
        ]);
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function () {
        assert.ok(false, "Signature should have been deleted");
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 404);
      })

      // But another document should have been created
      .then(function () {
        return context.jio.__storage._remote_sub_storage.allDocs();
      })
      .then(function (result) {
        assert.equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
        // Attachment should be kept
        return context.jio.__storage._local_sub_storage
                      .getAttachment(post_id, 'foo', {format: 'text'});
      })
      .then(function (result) {
        assert.equal(result, big_string);
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document creation, remote post and delayed allDocs",
       function (assert) {
      start = assert.async();
      assert.expect(12);

      var id,
        post_id = "_foobar",
        context = this;

      function FastStorage200DelayedAllDocs(spec) {
        this._sub_storage = jIO.createJIO(spec.sub_storage);
      }
      FastStorage200DelayedAllDocs.prototype.get = function () {
        return this._sub_storage.get.apply(this._sub_storage, arguments);
      };
      FastStorage200DelayedAllDocs.prototype.post = function (param) {
        return this.put(post_id, param);
      };
      FastStorage200DelayedAllDocs.prototype.put = function () {
        return this._sub_storage.put.apply(this._sub_storage, arguments);
      };
      FastStorage200DelayedAllDocs.prototype.hasCapacity = function () {
        return true;
      };
      FastStorage200DelayedAllDocs.prototype.buildQuery = function () {
        return [];
      };
      jIO.addStorage(
        'replicatefaststorage200delayedalldocs',
        FastStorage200DelayedAllDocs
      );

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        use_remote_post: true,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "replicatefaststorage200delayedalldocs",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.post({title: "foo", foo_etag: 'foo etag'})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        // Document 'id' has been deleted in both storages
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_POST_REMOTE, id]
          ]);
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._local_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.status_code, 404);
        })

        // But another document should have been created
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .then(function () {
          return context.jio.__storage._local_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("remote document creation", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    context.jio.__storage._remote_sub_storage.post({title: "bar",
                                                    foo_etag: 'bar etag'})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_PUT_LOCAL, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: false,
          hash: "bar dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations", function (assert) {
    start = assert.async();
    assert.expect(3);

    var context = this;

    RSVP.all([
      context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {title: "bar",
                                                     foo_etag: 'bar etag'})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        assert.ok(false);
      })
      .fail(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_UNRESOLVED_CONFLICT, 'conflict']
        ]);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
//        assert.equal(error.message, "Cannot find document: conflict");
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });


  test("local and remote document creations with same 'etag'",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      var context = this;

      RSVP.all([
        context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "foo",
                                                      foo_etag: 'bar etag'})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FALSE_CONFLICT, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: 'bar etag'
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });

    });

  test("local and remote document creations: keep local", function (assert) {
    start = assert.async();
    assert.expect(4);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      },
      remote_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      },
      conflict_handling: 1
    });

    RSVP.all([
      context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {title: "bar",
                                                     foo_etag: 'bar etag'})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_FORCE_PUT_REMOTE, 'conflict']
        ]);
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations: keep local, remote post",
    function (assert) {
      start = assert.async();
      assert.expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        use_remote_post: 1,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        remote_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        conflict_handling: 1
      });

      RSVP.all([
        context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "bar",
                                                       foo_etag: 'bar etag'})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_REMOTE, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: keep local, " +
       "local not matching query", function (assert) {
      start = assert.async();
      assert.expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        remote_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 1
      });

      RSVP.all([
        context.jio.put("conflict", {title: "foo",
                                     foo_etag: 'foo etag'}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "bar",
                                                       foo_etag: 'bar etag',
                                                       type: "foobar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_REMOTE, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: "foo etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: "foo etag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: keep local, " +
       "remote not matching query", function (assert) {
      start = assert.async();
      assert.expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        remote_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 1
      });

      RSVP.all([
        context.jio.put("conflict", {title: "foo", type: "foobar",
                                     foo_etag: "foo etag"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "bar",
                                                       foo_etag: "bar etag"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_REMOTE, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            type: "foobar",
            foo_etag: "foo etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            type: "foobar",
            foo_etag: "foo etag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: keep remote", function (assert) {
    start = assert.async();
    assert.expect(4);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      },
      remote_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      },
      conflict_handling: 2
    });

    RSVP.all([
      context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {title: "bar",
                                                     foo_etag: 'bar etag'})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_FORCE_PUT_LOCAL, 'conflict']
        ]);
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: false,
          hash: "bar dynetag"
        });
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations: keep remote, remote post",
    function (assert) {
      start = assert.async();
      assert.expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        use_remote_post: 1,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        remote_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        conflict_handling: 2
      });

      RSVP.all([
        context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "bar",
                                                       foo_etag: 'bar etag'})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_LOCAL, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: false,
            hash: "bar dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: keep remote, " +
       "local not matching query", function (assert) {
      start = assert.async();
      assert.expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        remote_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 2
      });

      RSVP.all([
        context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "bar",
                                                       foo_etag: 'bar etag',
                                                       type: "foobar"})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_LOCAL, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: false,
            hash: "bar dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag',
            type: "foobar"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag',
            type: "foobar"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: keep remote, " +
       "remote not matching query", function (assert) {
      start = assert.async();
      assert.expect(4);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        remote_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        query: {query: 'type: "foobar"'},
        conflict_handling: 2
      });

      RSVP.all([
        context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag',
                                     type: "foobar"}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "bar",
                                                       foo_etag: 'bar etag'})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_LOCAL, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: false,
            hash: "bar dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document creations: continue", function (assert) {
    start = assert.async();
    assert.expect(5);

    var context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      },
      remote_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      },
      conflict_handling: 3
    });

    RSVP.all([
      context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {title: "bar",
                                                     foo_etag: 'bar etag'})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_SKIP_CONFLICT, 'conflict']
        ]);
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
//        assert.equal(error.message, "Cannot find document: conflict");
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document creations: continue, remote post",
    function (assert) {
      start = assert.async();
      assert.expect(5);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        use_remote_post: 1,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        remote_sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        },
        conflict_handling: 3
      });

      RSVP.all([
        context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
        context.jio.__storage._remote_sub_storage.put("conflict",
                                                      {title: "bar",
                                                       foo_etag: 'bar etag'})
      ])
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_SKIP_CONFLICT, 'conflict']
          ]);
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          // assert.equal(error.message, "Cannot find document: conflict");
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote same document creations", function (assert) {
    start = assert.async();
    assert.expect(2);

    var context = this;

    RSVP.all([
      context.jio.put("conflict", {"title": "foo", foo_etag: "foo etag"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "foo",
                                                     foo_etag: "foo etag"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_FALSE_CONFLICT, 'conflict']
        ]);
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("no modification", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    context.jio.post({"title": "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_NO_CHANGE, id],
          [report.LOG_NO_CHANGE, id]
        ]);
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document modification", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    context.jio.post({"title": "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.put(id, {"title": "foo2", foo_etag: "foo etag"});
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_PUT_REMOTE, id]
        ]);
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo2",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo2 dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  test("local document modification: use remote post", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      use_remote_post: 1,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.__storage._remote_sub_storage.post({"title": "foo",
                                                    foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.put(id, {"title": "foo2", foo_etag: "foo etag"});
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_PUT_REMOTE, id]
        ]);
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo2",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo2 dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document modification not checked", function (assert) {
    start = assert.async();
    assert.expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      check_local_modification: false,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.put(id, {"title": "foo2", foo_etag: "foo2 etag"});
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_SKIP_LOCAL_MODIFICATION, id],
          [report.LOG_NO_CHANGE, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo2",
          foo_etag: "foo2 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remote document modification", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.put(
          id,
          {"title": "foo3", foo_etag: "foo3 etag"}
        );
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_NO_CHANGE, id],
          [report.LOG_PUT_LOCAL, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo3",
          foo_etag: "foo3 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: false,
          hash: "foo3 dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remote document modification not checked", function (assert) {
    start = assert.async();
    assert.expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      check_remote_modification: false,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.post({"title": "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.put(
          id,
          {"title": "foo3", foo_etag: "foo3 etag"}
        );
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_NO_CHANGE, id],
          [report.LOG_SKIP_REMOTE_MODIFICATION, id]
        ]);
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo3",
          foo_etag: "foo3 etag"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document modifications", function (assert) {
    start = assert.async();
    assert.expect(2);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {title: "foo4", foo_etag: "foo4 etag"}),
          context.jio.__storage._remote_sub_storage.put(
            id,
            {
              title: "foo5",
              foo_etag: "foo5 etag"
            }
          )
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        assert.ok(false);
      })
      .fail(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_UNRESOLVED_CONFLICT, id]
        ]);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document modifications: keep local",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      var id,
        context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        conflict_handling: 1
      });

      context.jio.post({title: "foo", foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.put(id, {"title": "foo4", foo_etag: "foo4 etag"}),
            context.jio.__storage._remote_sub_storage.put(
              id,
              {
                title: "foo5",
                foo_etag: "foo5 etag"
              }
            )
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_REMOTE, id]
          ]);
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo4 dynetag"
          });
        })
        .then(function () {
          return context.jio.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo4",
            foo_etag: "foo4 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo4",
            foo_etag: "foo4 etag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document modifications: keep remote",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      var id,
        context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        conflict_handling: 2
      });

      context.jio.post({title: "foo", foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.put(id, {"title": "foo4", foo_etag: "foo4 etag"}),
            context.jio.__storage._remote_sub_storage.put(
              id,
              {
                title: "foo5",
                foo_etag: "foo5 etag"
              }
            )
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_LOCAL, id]
          ]);
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: false,
            hash: "foo5 dynetag"
          });
        })
        .then(function () {
          return context.jio.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo5",
            foo_etag: "foo5 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo5",
            foo_etag: "foo5 etag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local and remote document modifications: continue", function (assert) {
    start = assert.async();
    assert.expect(4);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      conflict_handling: 3
    });

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {"title": "foo4", foo_etag: "foo4 etag"}),
          context.jio.__storage._remote_sub_storage.put(
            id,
            {
              title: "foo5",
              foo_etag: "foo5 etag"
            }
          )
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_SKIP_CONFLICT, id]
        ]);
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo4",
          foo_etag: "foo4 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo5",
          foo_etag: "foo5 etag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document same modifications", function (assert) {
    start = assert.async();
    assert.expect(2);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
          context.jio.__storage._remote_sub_storage.put(
            id,
            {
              title: "foo99",
              foo_etag: "foo99 etag"
            }
          )
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_FALSE_CONFLICT, id]
        ]);
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document deletion", function (assert) {
    start = assert.async();
    assert.expect(7);

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
        assert.deepEqual(report._list, [
          [report.LOG_DELETE_REMOTE, id]
        ]);
        assert.ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id)
          .then(function () {
            assert.ok(false, "Signature should be deleted");
          })
          .fail(function (error) {
            assert.ok(error instanceof jIO.util.jIOError);
//            assert.equal(error.message, "Cannot find document: " + id);
            assert.equal(error.status_code, 404);
          });
      })
      .always(function () {
        start();
      });
  });

  test("local document deletion not checked", function (assert) {
    start = assert.async();
    assert.expect(7);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      check_local_deletion: false,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.post({title: "foo", foo_etag: "foo etag"})
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
        assert.deepEqual(report._list, [
          [report.LOG_SKIP_LOCAL_DELETION, id],
          [report.LOG_NO_CHANGE, id]
        ]);
        assert.ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local document deletion with attachment", function (assert) {
    start = assert.async();
    assert.expect(11);

    var id,
      context = this,
      blob = new Blob([big_string]);

    context.jio.post({title: "foo", foo_etag: "foo etag"})
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
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_DELETE_REMOTE, id]
        ]);
        assert.ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
        );
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion", function (assert) {
    start = assert.async();
    assert.expect(7);

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
        assert.deepEqual(report._list, [
          [report.LOG_NO_CHANGE, id],
          [report.LOG_DELETE_LOCAL, id]
        ]);
        assert.ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id)
          .then(function () {
            assert.ok(false, "Signature should be deleted");
          })
          .fail(function (error) {
            assert.ok(error instanceof jIO.util.jIOError);
//            assert.equal(error.message, "Cannot find document: " + id);
            assert.equal(error.status_code, 404);
          });
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion not checked", function (assert) {
    start = assert.async();
    assert.expect(7);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      check_remote_deletion: false,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.post({title: "foo", foo_etag: "foo etag"})
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
        assert.deepEqual(report._list, [
          [report.LOG_NO_CHANGE, id],
          [report.LOG_SKIP_REMOTE_DELETION, id]
        ]);
        assert.ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion with attachment", function (assert) {
    start = assert.async();
    assert.expect(11);

    var id,
      context = this,
      blob = new Blob([big_string]);

    context.jio.post({title: "foo", foo_etag: "foo etag"})
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
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_NO_CHANGE, id],
          [report.LOG_DELETE_LOCAL, id]
        ]);
        assert.ok(true, "Removal correctly synced");
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
        );
        assert.equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("local and remote document deletions", function (assert) {
    start = assert.async();
    assert.expect(9);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: "foo etag"})
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
        assert.deepEqual(report._list, [
          [report.LOG_FALSE_CONFLICT, id]
        ]);
        return context.jio.get(id)
          .then(function () {
            assert.ok(false, "Document should be locally deleted");
          })
          .fail(function (error) {
            assert.ok(error instanceof jIO.util.jIOError);
            assert.equal(error.message, "Cannot find document: " + id);
            assert.equal(error.status_code, 404);
          });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id)
          .then(function () {
            assert.ok(false, "Document should be remotely deleted");
          })
          .fail(function (error) {
            assert.ok(error instanceof jIO.util.jIOError);
            assert.equal(error.message, "Cannot find document: " + id);
            assert.equal(error.status_code, 404);
          });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id)
          .then(function () {
            assert.ok(false, "Signature should be deleted");
          })
          .fail(function (error) {
            assert.ok(error instanceof jIO.util.jIOError);
//            assert.equal(error.message, "Cannot find document: " + id);
            assert.equal(error.status_code, 404);
          });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local deletion and remote modifications", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.remove(id),
          context.jio.__storage._remote_sub_storage.put(
            id,
            {
              title: "foo99",
              foo_etag: "foo99 etag"
            }
          )
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_FORCE_PUT_LOCAL, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: false,
          hash: "foo99 dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local deletion and remote modifications: keep local",
       function (assert) {
      start = assert.async();
      assert.expect(10);

      var id,
        context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        conflict_handling: 1,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.post({title: "foo", foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.remove(id),
            context.jio.__storage._remote_sub_storage.put(
              id,
              {
                title: "foo99",
                foo_etag: "foo99 etag"
              }
            )
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_DELETE_REMOTE, id]
          ]);
          return context.jio.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(
            error.message.indexOf(
              "Cannot find attachment: " +
                "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
                "jio_document/"
            ),
            0,
            error.message
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

  test("local deletion and remote modifications: keep remote",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      var id,
        context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        conflict_handling: 2,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.post({title: "foo", foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.remove(id),
            context.jio.__storage._remote_sub_storage.put(
              id,
              {
                title: "foo99",
                foo_etag: "foo99 etag"
              }
            )
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_LOCAL, id]
          ]);
          return context.jio.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: false,
            hash: "foo99 dynetag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local deletion and remote modifications: ignore", function (assert) {
    start = assert.async();
    assert.expect(6);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 3,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.remove(id),
          context.jio.__storage._remote_sub_storage.put(
            id,
            {
              title: "foo99",
              foo_etag: "foo99 etag"
            }
          )
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_SKIP_CONFLICT, id]
        ]);
        return context.jio.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local modifications and remote deletion", function (assert) {
    start = assert.async();
    assert.expect(3);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_FORCE_PUT_REMOTE, id]
        ]);
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local modifications and remote deletion: use remote post",
       function (assert) {
      start = assert.async();
      assert.expect(14);

      var id,
        context = this,
        post_id;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        use_remote_post: true,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.__storage._remote_sub_storage.post({title: "foo",
                                                      foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
            context.jio.__storage._remote_sub_storage.remove(id)
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        // Old id deleted
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_POST_REMOTE, id]
          ]);
          return context.jio.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(
            error.message.indexOf(
              "Cannot find attachment: " +
                "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
                "jio_document/"
            ),
            0,
            error.message
          );
          assert.equal(error.status_code, 404);
        })
        // Check new id
        .then(function () {
          return context.jio.allDocs();
        })
        .then(function (result) {
          assert.equal(result.data.total_rows, 1);
          post_id = result.data.rows[0].id;
          return context.jio.__storage._remote_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._local_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            "title": "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo99 dynetag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local modif, remote del: remote post, no check loc mod",
       function (assert) {
      start = assert.async();
      assert.expect(14);

      var id,
        context = this,
        post_id;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        use_remote_post: true,
        check_local_modification: false,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.__storage._remote_sub_storage.post({title: "foo",
                                                      foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
            context.jio.__storage._remote_sub_storage.remove(id)
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        // Old id deleted
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_SKIP_LOCAL_MODIFICATION, id],
            [report.LOG_POST_REMOTE, id]
          ]);
          return context.jio.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(
            error.message.indexOf(
              "Cannot find attachment: " +
                "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
                "jio_document/"
            ),
            0,
            error.message
          );
          assert.equal(error.status_code, 404);
        })
        // Check new id
        .then(function () {
          return context.jio.allDocs();
        })
        .then(function (result) {
          assert.equal(result.data.total_rows, 1);
          post_id = result.data.rows[0].id;
          return context.jio.__storage._remote_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._local_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo99 dynetag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local modifications and remote deletion: keep local",
       function (assert) {
      start = assert.async();
      assert.expect(4);

      var id,
        context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        conflict_handling: 1,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.post({title: "foo", foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
            context.jio.__storage._remote_sub_storage.remove(id)
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        // Old id deleted
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_PUT_REMOTE, id]
          ]);
          return context.jio.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo99 dynetag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local modif and remote del: keep local, use remote post",
       function (assert) {
      start = assert.async();
      assert.expect(14);

      var id,
        context = this,
        post_id;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        conflict_handling: 1,
        use_remote_post: true,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.__storage._remote_sub_storage.post({title: "foo",
                                                      foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
            context.jio.__storage._remote_sub_storage.remove(id)
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        // Old id deleted
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_POST_REMOTE, id]
          ]);
          return context.jio.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(
            error.message.indexOf(
              "Cannot find attachment: " +
                "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
                "jio_document/"
            ),
            0,
            error.message
          );
          assert.equal(error.status_code, 404);
        })
        // Check new id
        .then(function () {
          return context.jio.allDocs();
        })
        .then(function (result) {
          assert.equal(result.data.total_rows, 1);
          post_id = result.data.rows[0].id;
          return context.jio.__storage._remote_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._local_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            title: "foo99",
            foo_etag: "foo99 etag"
          });
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(post_id);
        })
        .then(function (result) {
          assert.deepEqual(result, {
            from_local: true,
            hash: "foo99 dynetag"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("local modifications and remote deletion: keep remote",
       function (assert) {
      start = assert.async();
      assert.expect(10);

      var id,
        context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        conflict_handling: 2,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        }
      });

      context.jio.post({title: "foo", foo_etag: "foo etag"})
        .then(function (result) {
          id = result;
          return context.jio.repair();
        })
        .then(function () {
          return RSVP.all([
            context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
            context.jio.__storage._remote_sub_storage.remove(id)
          ]);
        })
        .then(function () {
          return context.jio.repair();
        })
        // id deleted
        .then(function (report) {
          assert.deepEqual(report._list, [
            [report.LOG_FORCE_DELETE_LOCAL, id]
          ]);
          return context.jio.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(
            error.message.indexOf(
              "Cannot find attachment: " +
                "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
                "jio_document/"
            ),
            0,
            error.message
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

  test("local modif and remote del: keep remote, not check modif",
       function (assert) {
      start = assert.async();
      assert.expect(10);

      var id,
        context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
        report_level: 1000,
        conflict_handling: 2,
        check_local_modification: false,
        signature_hash_key: 'foo_etag',
        local_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
          }
        },
        remote_sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "storagealldocsdynamicselect",
            sub_storage: {
              type: "query",
              sub_storage: {
                type: "memory"
              }
            }
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
          assert.deepEqual(report._list, [
            [report.LOG_SKIP_LOCAL_MODIFICATION, id],
            [report.LOG_FORCE_DELETE_LOCAL, id]
          ]);
          return context.jio.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(error.message, "Cannot find document: " + id);
          assert.equal(error.status_code, 404);
        })
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get(id);
        })
        .fail(function (error) {
          assert.ok(error instanceof jIO.util.jIOError);
          assert.equal(
            error.message.indexOf(
              "Cannot find attachment: " +
                "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
                "jio_document/"
            ),
            0,
            error.message
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

  test("local modifications and remote deletion: ignore", function (assert) {
    start = assert.async();
    assert.expect(6);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      conflict_handling: 3,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }
    });

    context.jio.post({title: "foo", foo_etag: "foo etag"})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          context.jio.put(id, {title: "foo99", foo_etag: "foo99 etag"}),
          context.jio.__storage._remote_sub_storage.remove(id)
        ]);
      })
      .then(function () {
        return context.jio.repair();
      })
      // id deleted
      .then(function (report) {
        assert.deepEqual(report._list, [
          [report.LOG_SKIP_CONFLICT, id]
        ]);
        return context.jio.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " + id);
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        assert.deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("signature document is not synced", function (assert) {
    start = assert.async();
    assert.expect(7);

    var context = this;

    // Uses sessionstorage substorage, so that signature are stored
    // in the same local sub storage
    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      },
      remote_sub_storage: {
        type: "storagealldocsdynamicselect",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        }
      }
    });
    // Hack to ensure that the signature is stored in the
    // same local storage, even if memory is used
    context.jio.__storage._signature_sub_storage
               .__storage._sub_storage
               .__storage._sub_storage
               .__storage._sub_storage
               .__storage._sub_storage
               .__storage._database =
       context.jio.__storage._local_sub_storage
                  .__storage._sub_storage
                  .__storage._sub_storage
                  .__storage._database;

    context.jio.put('barfoo', {title: "foo", foo_etag: "foo etag"})
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        // Check that signature is a local document
        // Otherwise, the test is meaningless
        return context.jio.__storage._local_sub_storage.get(
          context.jio.__storage._signature_hash
        );
      })
      .then(function (result) {
        assert.deepEqual(result, {});
        return context.jio.__storage._remote_sub_storage.get(
          context.jio.__storage._signature_hash
        );
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " +
                "_replicate_e9fa6706a8a6a961db3f9de41d44bdf11f25fb30");
        assert.equal(error.status_code, 404);
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
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: " +
                "_replicate_e9fa6706a8a6a961db3f9de41d44bdf11f25fb30");
        assert.equal(error.status_code, 404);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("sync all documents by default", function (assert) {
    start = assert.async();
    assert.expect(4);

    var context = this;

    function FastStorage200DefaultQuery() {
      return this;
    }
    FastStorage200DefaultQuery.prototype.get = function () {
      assert.ok(true, "get 200 check repair called");
      return {};
    };
    FastStorage200DefaultQuery.prototype.hasCapacity = function () {
      return true;
    };
    FastStorage200DefaultQuery.prototype.buildQuery = function (query) {
      assert.deepEqual(query, {select_list: ['foo_etag']});
      return [];
    };
    FastStorage200DefaultQuery.prototype.allAttachments = function () {
      assert.ok(true, "allAttachments 200 check repair called");
      return {};
    };
    jIO.addStorage(
      'replicatefaststorage200defaultquery',
      FastStorage200DefaultQuery
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "replicatefaststorage200defaultquery"
      },
      remote_sub_storage: {
        type: "replicatefaststorage200defaultquery"
      }
    });

    return context.jio.repair()
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("sync can be restricted to some documents", function (assert) {
    start = assert.async();
    assert.expect(4);

    var context = this;

    function FastStorage200CustomQuery() {
      return this;
    }
    FastStorage200CustomQuery.prototype.get = function () {
      assert.ok(true, "get 200 check repair called");
      return {};
    };
    FastStorage200CustomQuery.prototype.hasCapacity = function () {
      return true;
    };
    FastStorage200CustomQuery.prototype.buildQuery = function (options) {
      assert.deepEqual(
        options,
        {
          query: 'portal_type: "Foo"',
          limit: [0, 1234567890],
          select_list: ['foo_etag']
        }
      );
      return [];
    };
    FastStorage200CustomQuery.prototype.allAttachments = function () {
      assert.ok(true, "allAttachments 200 check repair called");
      return {};
    };
    jIO.addStorage(
      'replicatefaststorage200customquery',
      FastStorage200CustomQuery
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "replicatefaststorage200customquery"
      },
      remote_sub_storage: {
        type: "replicatefaststorage200customquery"
      },
      query: {query: 'portal_type: "Foo"', limit: [0, 1234567890]}
    });

    return context.jio.repair()
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("document removed between allDocs and get", function (assert) {
    start = assert.async();
    assert.expect(8);

    var context = this;

    function FastStorage404() {
      return this;
    }
    FastStorage404.prototype.get = function (id) {
      assert.equal(id, 'barfoo');
      throw new jIO.util.jIOError(
        "FooBar: " + id,
        404
      );
    };
    FastStorage404.prototype.hasCapacity = function () {
      return true;
    };
    FastStorage404.prototype.buildQuery = function (query) {
      assert.deepEqual(query, {select_list: ['foo_etag', '__id']});
      return [{id: 'barfoo', value: {foo_etag: 'barfoo etag'}, doc: {}}];
    };
    jIO.addStorage(
      'replicatefaststorage404',
      FastStorage404
    );

    this.jio = jIO.createJIO({
      type: "replicate",
      report_level: 1000,
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "replicatefaststorage404"
      }
    });

    return context.jio.repair()
      .then(function () {
        return context.jio.__storage._local_sub_storage.get('barfoo');
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Cannot find document: barfoo");
        assert.equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get('barfoo');
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_a55b2b8b5029e3c7ae0e4b442d4250f90aab503f , " +
              "jio_document/"
          ),
          0,
          error.message
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


}(jIO, QUnit, Blob, RSVP));
