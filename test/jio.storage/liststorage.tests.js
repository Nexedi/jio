
(function (jIO, RSVP, QUnit) {
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

  QUnit.test('list method returns ordered list of ids', function (assert) {
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
    }),
      ids = [jio.post({}), jio.post({}), jio.post({})];

    RSVP.all(ids).then(
      function (values) {
        jio.list().then(function (list) {
          QUnit.start();
          assert.equal(values, jio.list());
        }).fail(function (err) {
          assert.ok(false, err);
        });
      }
    ).fail(function (err) {
      QUnit.start();
      assert.ok(false, err);
    });
  });

}(jIO, RSVP, QUnit));
