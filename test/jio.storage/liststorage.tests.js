// (function (jIO, RSVP, QUnit) {
(function (jIO, QUnit) {
  "use strict";

  QUnit.module("ListStorage");

  QUnit.test('Constructor does not crash', function () {
    jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "memory"
      },
      index_storage: {
        type: "memory"
      }
    });
    QUnit.expect(0);
  });

  QUnit.test("check concurrent write", function () {
    QUnit.stop();
    QUnit.expect(12);
    var i,
      promise_list = [],
      storage =  jIO.createJIO({
        type: "list",
        // This storage will store the document IDs
        index_storage: {
          type: "memory"
        },
        // This storage will store the documents
        sub_storage: {
          type: "nocapacity",
          sub_storage: {
            type: "memory"
          }
        }
      });

    // Create many document in parallel
    for (i = 0; i < 10; i += 1) {
      promise_list.push(storage.put('foo' + i, {bar: i}));
    }
    return RSVP.all(promise_list)
      .then(function () {
        // The list of document can be retrieved
        return storage.allDocs();
      })
      .then(function (result) {
        QUnit.equal(result.data.total_rows, 10);

        // Every document can be retrieved too
        promise_list = [];
        for (i = 0; i < 10; i += 1) {
          promise_list.push(storage.get('foo' + i));
        }
        return RSVP.all(promise_list);
      })
      .then(function (result_list) {
        for (i = 0; i < 10; i += 1) {
          QUnit.deepEqual(result_list[i], {bar: i});
        }

        // Remove all documents
        promise_list = [];
        for (i = 0; i < 10; i += 1) {
          promise_list.push(storage.remove('foo' + i));
        }
        return RSVP.all(promise_list);
      })
      .then(function () {
        // The list of document must be empty
        return storage.allDocs();
      })
      .then(function (result) {
        QUnit.equal(result.data.total_rows, 0);
      })
      .fail(function (error) {
        console.error(error);
        throw error;
      })
      .always(function () {
        QUnit.start();
      });
  });

  QUnit.test('post method correctly records ids', function (assert) {
    QUnit.stop();
    QUnit.expect(1);

    var jio = jIO.createJIO({
      type: 'list',
      index_storage: {
        type: "memory",
      },
      sub_storage: {
        type: 'uuid',
        sub_storage: {
          type: 'memory'
        }
      }
    }),
      promise_list = [],
      i = 0;

    for (i = 0; i < 10; i += 1) {
      promise_list.push(jio.post(i));
    }

    RSVP.all(promise_list).then(function (ids) {
      var x = jio.allDocs();
      x.then(function (res) {
        return res.data.rows;
      }).then(function (rows) {
        QUnit.start();
        assert.deepEqual(rows, ids);
      }).fail(console.error);
    }).fail(console.error);
  });

  QUnit.test('put method correctly records ids', function (assert) {
    QUnit.stop();
    QUnit.expect(1);

    var jio = jIO.createJIO({
      type: 'list',
      index_storage: {
        type: "memory",
      },
      sub_storage: {
        type: 'uuid',
        sub_storage: {
          type: 'memory'
        }
      }
    }),
      promise_list = [],
      i = 0;

    for (i = 0; i < 10; i += 1) {
      promise_list.push(jio.put(i.toString(), {'test': i}));
    }

    RSVP.all(promise_list).then(function (ids) {
      var x = jio.allDocs();
      x.then(function (res) {
        return res.data.rows;
      }).then(function (rows) {
        QUnit.start();
        assert.deepEqual(rows, ids);
      }).fail(console.error);
    }).fail(console.error);
  });

  QUnit.test('remove method correctly removes id', function (assert) {
    QUnit.stop();
    QUnit.expect(1);

    var jio = jIO.createJIO({
      type: 'list',
      index_storage: {
        type: "memory",
      },
      sub_storage: {
        type: 'uuid',
        sub_storage: {
          type: 'memory'
        }
      }
    }),
      promise_list = [],
      i = 0;

    for (i = 0; i < 10; i += 1) {
      promise_list.push(jio.put(i.toString(), {'test': i}));
    }

    RSVP.all(promise_list).then(function (ids) {
      var removal_promises = [];
      for (i = 0; i < 10; i += 1) {
        removal_promises.push(jio.remove(ids[i]));
      }
      RSVP.all(removal_promises).then(function () {
        return jio.allDocs();
      }).then(function (res) {
        return res.data.rows;
      }).then(function (all) {
        QUnit.start();
        assert.deepEqual(all, []);
      }).fail(function (err) {
        console.error(err);
        QUnit.start();
      });
    }).fail(console.error);
  });

// }(jIO, RSVP, QUnit));
}(jIO, QUnit));
