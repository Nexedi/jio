/*global Blob*/
/*jslint nomen: true, maxlen: 80*/
(function (QUnit, jIO, Blob) {
  "use strict";
  var test = QUnit.test,
    // equal = QUnit.equal,
    expect = QUnit.expect,
    ok = QUnit.ok,
    stop = QUnit.stop,
    start = QUnit.start,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module,
    ATTACHMENT = 'data',
    i,
    name_list = ['get', 'post', 'put', 'buildQuery',
                  'putAttachment', 'getAttachment', 'allAttachments'];

  ///////////////////////////////////////////////////////
  // Fake Storage
  ///////////////////////////////////////////////////////
  function resetCount(count) {
    for (i = 0; i < name_list.length; i += 1) {
      count[name_list[i]] = 0;
    }
  }

  function MockStorage(spec) {
    this._erp5_storage = jIO.createJIO({
      type: "erp5",
      url: "http://example.org"
    });
    this._sub_storage = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });
    this._options = spec.options;
    resetCount(spec.options.count);
  }

  function mockFunction(name) {
    MockStorage.prototype[name] = function () {
      this._options.count[name] += 1;
      if (this._options.mock.hasOwnProperty(name)) {
        return this._options.mock[name].apply(this, arguments);
      }
      return this._sub_storage[name].apply(this._sub_storage, arguments);
    };
  }

  for (i = 0; i < name_list.length; i += 1) {
    mockFunction(name_list[i]);
  }

  MockStorage.prototype.hasCapacity = function (name) {
    return this._erp5_storage.hasCapacity(name);
  };

  jIO.addStorage('mock', MockStorage);

  ///////////////////////////////////////////////////////
  // Helpers
  ///////////////////////////////////////////////////////
  function putFullDoc(storage, id, doc, attachment) {
    return storage.put(id, doc)
      .push(function () {
        return storage.putAttachment(
          id,
          ATTACHMENT,
          attachment
        );
      });
  }

  function equalStorage(storage, doc_tuple_list) {
    return storage.allDocs()
      .push(function (result) {
        var i,
          promise_list = [];
        for (i = 0; i < result.data.rows.length; i += 1) {
          promise_list.push(RSVP.all([
            result.data.rows[i].id,
            storage.get(result.data.rows[i].id),
            storage.getAttachment(result.data.rows[i].id, ATTACHMENT)
          ]));
        }
        return RSVP.all(promise_list);
      })
      .push(function (result) {
        deepEqual(result, doc_tuple_list, 'Storage content');
      });
  }

  function isEmptyStorage(storage) {
    return equalStorage(storage, []);
  }

  function equalRemoteStorageCallCount(mock_count, expected_count) {
    for (i = 0; i < name_list.length; i += 1) {
      if (!expected_count.hasOwnProperty(name_list[i])) {
        expected_count[name_list[i]] = 0;
      }
    }
    deepEqual(mock_count, expected_count, 'Expected method call count');
  }

  ///////////////////////////////////////////////////////
  // Module
  ///////////////////////////////////////////////////////
  module("scenario_officejs", {
    setup: function () {
      this.remote_mock_options = {
        mock: {
          remove: function () {
            throw new Error('remove not supported');
          },
          removeAttachment: function () {
            throw new Error('removeAttachment not supported');
          },
          allAttachments: function () {
            return {data: null};
          },
          post: function (doc) {
            var context = this;
            return this._sub_storage.post(doc)
              .push(function (post_id) {
                context._options.last_post_id = post_id;
                return post_id;
              });
          }
        },
        count: {}
      };
      this.jio = jIO.createJIO({
        type: "replicate",
        query: {
          query: 'portal_type:"Foo"',
          sort_on: [["modification_date", "descending"]]
        },
        signature_hash_key: 'modification_date',
        use_remote_post: true,
        conflict_handling: 1,
        check_local_attachment_modification: true,
        check_local_attachment_creation: true,
        check_remote_attachment_modification: true,
        check_remote_attachment_creation: true,
        check_remote_attachment_deletion: true,
        check_local_deletion: false,
        parallel_operation_amount: 10,
        parallel_operation_attachment_amount: 10,
        local_sub_storage: {
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "memory"
            }
          }
        },
        signature_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory"
          }
        },
        remote_sub_storage: {
          type: "mock",
          options: this.remote_mock_options
        }
      });
    }
  });

  ///////////////////////////////////////////////////////
  // Do nothing cases
  ///////////////////////////////////////////////////////
  test("empty: nothing to do", function () {
    expect(2);
    stop();

    var test = this;

    this.jio.repair()
      .then(function () {
        return RSVP.all([
          isEmptyStorage(test.jio),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allready synced: nothing to do", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      blob = new Blob(['a']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[doc_id, doc, blob]]),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // Remote creation
  ///////////////////////////////////////////////////////
  test("remote document creation: copy", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      blob = new Blob(['a']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[doc_id, doc, blob]]),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1, get: 1, getAttachment: 1, allAttachments: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // Remote modification
  ///////////////////////////////////////////////////////
  test("remote document modification: copy", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      doc2 = {title: doc_id + 'a', portal_type: "Foo", modification_date: 'b'},
      blob = new Blob(['a']),
      blob2 = new Blob(['b']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return putFullDoc(test.jio.__storage._remote_sub_storage, doc_id, doc2,
                          blob2);
      })
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[doc_id, doc2, blob2]]),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1, get: 1, getAttachment: 1, allAttachments: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // Remote hide
  ///////////////////////////////////////////////////////
  test("remote document deletion: delete", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      blob = new Blob(['a']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        test.remote_mock_options.mock.buildQuery = function () {
          return [];
        };
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          isEmptyStorage(test.jio),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // Local creation
  ///////////////////////////////////////////////////////
  test("local document creation: copy", function () {
    expect(3);
    stop();

    var test = this,
      doc_id = 'abc',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      blob = new Blob(['a']);

    putFullDoc(this.jio, doc_id, doc, blob)
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(
            test.jio,
            [[test.remote_mock_options.last_post_id, doc, blob]]
          ),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1, post: 1, putAttachment: 1, allAttachments: 1}
          )
        ]);
      })
      .then(function () {
        return equalStorage(
          test.jio.__storage._remote_sub_storage,
          [[test.remote_mock_options.last_post_id, doc, blob]]
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // Local modification
  ///////////////////////////////////////////////////////
  test("local document modification: copy", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      doc2 = {title: doc_id + 'a', portal_type: "Foo", modification_date: 'b'},
      blob = new Blob(['a']),
      blob2 = new Blob(['b']),
      last_id;

    putFullDoc(this.jio, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        last_id = test.remote_mock_options.last_post_id;
        return putFullDoc(test.jio, last_id, doc2, blob2);
      })
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(
            test.jio.__storage._remote_sub_storage,
            [[last_id, doc2, blob2]]
          ),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1, put: 1,
              allAttachments: 1, putAttachment: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // Conflict
  ///////////////////////////////////////////////////////
  test("both modification: keep local", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      doc2 = {title: doc_id + 'a', portal_type: "Foo", modification_date: 'b'},
      doc3 = {title: doc_id + 'c', portal_type: "Foo", modification_date: 'c'},
      blob = new Blob(['a']),
      blob2 = new Blob(['b']),
      blob3 = new Blob(['c']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          putFullDoc(test.jio.__storage._remote_sub_storage, doc_id,
                     doc2, blob2),
          putFullDoc(test.jio, doc_id, doc3, blob3)
        ]);
      })
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(
            test.jio.__storage._remote_sub_storage,
            [[doc_id, doc3, blob3]]
          ),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1, put: 1,
              allAttachments: 1, putAttachment: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local modification / frozen remote", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      doc2 = {title: doc_id + 'a', portal_type: "Foo", modification_date: 'b'},
      blob = new Blob(['a']),
      blob2 = new Blob(['b']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return putFullDoc(test.jio, doc_id, doc2, blob2);
      })
      .then(function () {
        test.remote_mock_options.mock.put = function () {
          throw new Error('put not allowed');
        };
        test.remote_mock_options.mock.putAttachment = function () {
          throw new Error('putattachment not allowed');
        };
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        ok(false, 'notimplemented');
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // Local deletion (aka, people playing manually with the browser storage)
  ///////////////////////////////////////////////////////
  test("local document deletion: do nothing", function () {
    expect(3);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      blob = new Blob(['a']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return test.jio.remove(doc_id);
      })
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          isEmptyStorage(test.jio),
          equalStorage(
            test.jio.__storage._remote_sub_storage,
            [[doc_id, doc, blob]]
          ),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local attachment deletion: do nothing", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      blob = new Blob(['a']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return test.jio.removeAttachment(doc_id, ATTACHMENT);
      })
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(
            test.jio.__storage._remote_sub_storage,
            [[doc_id, doc, blob]]
          ),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("local deletion / remote modification", function () {
    expect(2);
    stop();

    var test = this,
      doc_id = 'foo_module/1',
      doc = {title: doc_id, portal_type: "Foo", modification_date: 'a'},
      doc2 = {title: doc_id + 'a', portal_type: "Foo", modification_date: 'b'},
      blob = new Blob(['a']),
      blob2 = new Blob(['b']);

    putFullDoc(this.jio.__storage._remote_sub_storage, doc_id, doc, blob)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          putFullDoc(test.jio.__storage._remote_sub_storage, doc_id,
                     doc2, blob2),
          test.jio.remove(doc_id)
        ]);
      })
      .then(function () {
        resetCount(test.remote_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(
            test.jio,
            [[doc_id, doc2, blob2]]
          ),
          equalStorage(
            test.jio.__storage._remote_sub_storage,
            [[doc_id, doc2, blob2]]
          ),
          equalRemoteStorageCallCount(
            test.remote_mock_options.count,
            {buildQuery: 1, get: 1,
              allAttachments: 1, getAttachment: 1}
          )
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(QUnit, jIO, Blob));
