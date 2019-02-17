// (function (jIO, RSVP, QUnit) {
(function (jIO, QUnit) {
  "use strict";

  QUnit.module("ListStorage");

  QUnit.test('Constructor does not crash', function () {
    jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "memory"
      }
    });
    QUnit.expect(0);
  });

  // NOTE: list method is implicitly tested in the following two methods

  QUnit.test('post method correctly records ids', function (assert) {
    QUnit.stop();
    QUnit.expect(1);

    var jio = jIO.createJIO({
      type: 'list',
      sub_storage: {
        type: 'uuid',
        sub_storage: {
          type: 'memory'
        }
      }
    });

    jio.post({}).then(function (id1) {
      jio.post({}).then(function (id2) {
        jio.list().then(function (l) {
          QUnit.start();
          assert.deepEqual(l, [id1, id2]);
        });
      });
    }).fail(console.error);
  });

  QUnit.test('put method correctly records ids', function (assert) {
    QUnit.stop();
    QUnit.expect(1);

    var jio = jIO.createJIO({
      type: 'list',
      sub_storage: {
        type: 'uuid',
        sub_storage: {
          type: 'memory'
        }
      }
    });

    jio.put('test', {}).then(function (id1) {
      jio.put('test2', {}).then(function (id2) {
        jio.list().then(function (l) {
          QUnit.start();
          assert.deepEqual(l, [id1, id2]);
        });
      });
    }).fail(console.error);
  });

// }(jIO, RSVP, QUnit));
}(jIO, QUnit));
