
(function (jIO, QUnit) {
  "use strict";

  module("NoCapacityStorage");

  QUnit.test('Constructor does not crash', function () {
    jIO.createJIO({
      type: "nocapacity",
      schema: {'date': {'type': 'string', format: 'date-time'}},
      sub_storage: {
        type: 'memory'
      }
    });
    QUnit.expect(0);
  });

  QUnit.test('Storage does not have query capacity', function (assert) {
    var jio = jIO.createJIO({
      type: "nocapacity",
      schema: {'date': {'type': 'string', format: 'date-time'}},
      sub_storage: {
        type: 'memory'
      }
    });
    assert.throws(
      function () { jio.hasCapacity('query'); }
    );
  });

  QUnit.test('Storage calls sub-storage methods', function (assert) {
    QUnit.stop();
    QUnit.expect(1);

    var jio = jIO.createJIO({
      type: "nocapacity",
      sub_storage: {
        type: 'memory'
      }
    });

    jio.put("test_id", {foo: "bar"});
    jio.get("test_id").then(function (val) {
      QUnit.start();
      assert.deepEqual(val, {foo: "bar"});
    }).fail(function (err) {
      QUnit.start();
      assert.ok(false, err);
    });
  });

}(jIO, QUnit));
