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
    setup: function () {
      // Uses memory substorage, so that it is flushed after each run
      this.jio = jIO.createJIO({
        type: "replicate",
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

  test("local document creation", function () {
    stop();
    expect(2);

    var id,
      context = this;

    context.jio.post({title: "foo", foo_etag: 'foo etag'})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local document creation and use remote post", function () {
    stop();
    expect(13);

    var id,
      post_id,
      context = this,
      blob = new Blob([big_string]);

    this.jio = jIO.createJIO({
      type: "replicate",
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
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
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
          hash: "foo dynetag"
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
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
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

    context.jio.__storage._remote_sub_storage.post({title: "bar",
                                                    foo_etag: 'bar etag'})
      .then(function (result) {
        id = result;
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
          hash: "bar dynetag"
        });
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
      context.jio.put("conflict", {title: "foo", foo_etag: 'foo etag'}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {title: "bar",
                                                     foo_etag: 'bar etag'})
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
                             "\"foo dynetag\" !== \"bar dynetag\"");
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


  test("local and remote document creations with same 'etag'", function () {
    stop();
    expect(3);

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
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: 'bar etag'
        });
      })
      .fail(function (error) {
        ok(false, error);
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
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: 'foo etag'
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
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            foo_etag: 'foo etag'
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
      expect(3);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
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
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            foo_etag: "foo etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            foo_etag: "foo etag"
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
      expect(3);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
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
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: true,
            hash: "foo dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            type: "foobar",
            foo_etag: "foo etag"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "foo",
            type: "foobar",
            foo_etag: "foo etag"
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
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
          hash: "bar dynetag"
        });
      })
      .then(function () {
        return context.jio.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
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
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: false,
            hash: "bar dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
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
      expect(3);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
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
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: false,
            hash: "bar dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag',
            type: "foobar"
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag',
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
      expect(3);

      var context = this;

      this.jio = jIO.createJIO({
        type: "replicate",
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
        .then(function () {
          return context.jio.__storage._signature_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            from_local: false,
            hash: "bar dynetag"
          });
        })
        .then(function () {
          return context.jio.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
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
          title: "foo",
          foo_etag: 'foo etag'
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          title: "bar",
          foo_etag: 'bar etag'
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
            title: "foo",
            foo_etag: 'foo etag'
          });
        })
        .then(function () {
          return context.jio.__storage._remote_sub_storage.get("conflict");
        })
        .then(function (result) {
          deepEqual(result, {
            title: "bar",
            foo_etag: 'bar etag'
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
      context.jio.put("conflict", {"title": "foo", foo_etag: "foo etag"}),
      context.jio.__storage._remote_sub_storage.put("conflict",
                                                    {"title": "foo",
                                                     foo_etag: "foo etag"})
    ])
      .then(function () {
        return context.jio.repair();
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get("conflict");
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
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

    context.jio.post({"title": "foo", foo_etag: "foo etag"})
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
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
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
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo2",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo2 dynetag"
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
    expect(2);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo2",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo2 dynetag"
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
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo2",
          foo_etag: "foo2 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
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
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo3",
          foo_etag: "foo3 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
          hash: "foo3 dynetag"
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
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo3",
          foo_etag: "foo3 etag"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
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
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Conflict on '" + id + "': " +
                             "\"foo4 dynetag\" !== \"foo5 dynetag\"");
        equal(error.status_code, 409);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
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
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo4 dynetag"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo4",
          foo_etag: "foo4 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo4",
          foo_etag: "foo4 etag"
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
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
          hash: "foo5 dynetag"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo5",
          foo_etag: "foo5 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo5",
          foo_etag: "foo5 etag"
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
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo4",
          foo_etag: "foo4 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo5",
          foo_etag: "foo5 etag"
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
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
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
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .always(function () {
        start();
      });
  });

  test("local document deletion with attachment", function () {
    stop();
    expect(10);

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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
        );
        equal(error.status_code, 404);
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
          title: "foo",
          foo_etag: "foo etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
        });
      })
      .always(function () {
        start();
      });
  });

  test("remote document deletion with attachment", function () {
    stop();
    expect(10);

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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
        );
        equal(error.status_code, 404);
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
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
          hash: "foo99 dynetag"
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
    expect(9);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
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
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: false,
          hash: "foo99 dynetag"
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
    expect(5);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo dynetag"
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
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
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
    expect(13);

    var id,
      context = this,
      post_id;

    this.jio = jIO.createJIO({
      type: "replicate",
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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
        );
        equal(error.status_code, 404);
      })
      // Check new id
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          "title": "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
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
    expect(13);

    var id,
      context = this,
      post_id;

    this.jio = jIO.createJIO({
      type: "replicate",
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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
        );
        equal(error.status_code, 404);
      })
      // Check new id
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
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
    expect(3);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._remote_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
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
    expect(13);

    var id,
      context = this,
      post_id;

    this.jio = jIO.createJIO({
      type: "replicate",
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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
        );
        equal(error.status_code, 404);
      })
      // Check new id
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        post_id = result.data.rows[0].id;
        return context.jio.__storage._remote_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._local_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
        });
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get(post_id);
      })
      .then(function (result) {
        deepEqual(result, {
          from_local: true,
          hash: "foo99 dynetag"
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
    expect(9);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
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
    expect(9);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
              "_replicate_ae15d2189153f083c0e4a845fd580b1d86f7a512 , " +
              "jio_document/"
          ),
          0,
          error.message
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
    expect(5);

    var id,
      context = this;

    this.jio = jIO.createJIO({
      type: "replicate",
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
      .then(function () {
        return context.jio.get(id);
      })
      .then(function (result) {
        deepEqual(result, {
          title: "foo99",
          foo_etag: "foo99 etag"
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
          hash: "foo dynetag"
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
      signature_hash_key: 'foo_etag',
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "storagealldocsdynamicselect",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "document",
              document_id: "/",
              sub_storage: {
                type: "local",
                sessiononly: true
              }
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
                "_replicate_bc03c70b5346672bb87b14c4e17ed1e407676a41");
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
                "_replicate_bc03c70b5346672bb87b14c4e17ed1e407676a41");
        equal(error.status_code, 404);
      })
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

    function FastStorage200DefaultQuery() {
      return this;
    }
    FastStorage200DefaultQuery.prototype.get = function () {
      ok(true, "get 200 check repair called");
      return {};
    };
    FastStorage200DefaultQuery.prototype.hasCapacity = function () {
      return true;
    };
    FastStorage200DefaultQuery.prototype.buildQuery = function (query) {
      deepEqual(query, {select_list: ['foo_etag']});
      return [];
    };
    FastStorage200DefaultQuery.prototype.allAttachments = function () {
      ok(true, "allAttachments 200 check repair called");
      return {};
    };
    jIO.addStorage(
      'replicatefaststorage200defaultquery',
      FastStorage200DefaultQuery
    );

    this.jio = jIO.createJIO({
      type: "replicate",
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
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("sync can be restricted to some documents", function () {
    stop();
    expect(4);

    var context = this;

    function FastStorage200CustomQuery() {
      return this;
    }
    FastStorage200CustomQuery.prototype.get = function () {
      ok(true, "get 200 check repair called");
      return {};
    };
    FastStorage200CustomQuery.prototype.hasCapacity = function () {
      return true;
    };
    FastStorage200CustomQuery.prototype.buildQuery = function (options) {
      deepEqual(
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
      ok(true, "allAttachments 200 check repair called");
      return {};
    };
    jIO.addStorage(
      'replicatefaststorage200customquery',
      FastStorage200CustomQuery
    );

    this.jio = jIO.createJIO({
      type: "replicate",
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
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("document removed between allDocs and get", function () {
    stop();
    expect(8);

    var context = this;

    function FastStorage404() {
      return this;
    }
    FastStorage404.prototype.get = function (id) {
      equal(id, 'barfoo');
      throw new jIO.util.jIOError(
        "FooBar: " + id,
        404
      );
    };
    FastStorage404.prototype.hasCapacity = function () {
      return true;
    };
    FastStorage404.prototype.buildQuery = function (query) {
      deepEqual(query, {select_list: ['foo_etag', '__id']});
      return [{id: 'barfoo', value: {foo_etag: 'barfoo etag'}, doc: {}}];
    };
    jIO.addStorage(
      'replicatefaststorage404',
      FastStorage404
    );

    this.jio = jIO.createJIO({
      type: "replicate",
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
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: barfoo");
        equal(error.status_code, 404);
      })
      .then(function () {
        return context.jio.__storage._signature_sub_storage.get('barfoo');
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(
          error.message.indexOf(
            "Cannot find attachment: " +
              "_replicate_a55b2b8b5029e3c7ae0e4b442d4250f90aab503f , " +
              "jio_document/"
          ),
          0,
          error.message
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


}(jIO, QUnit, Blob, RSVP));