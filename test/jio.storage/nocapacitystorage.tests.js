
(function (jIO, QUnit) {
  "use strict";

  function TestStorage() {
    return this;
  }

  TestStorage.prototype.get = function () { return true; };
  TestStorage.prototype.post = function () { return true; };
  TestStorage.prototype.put = function () { return true; };
  TestStorage.prototype.remove = function () { return true; };

  jIO.addStorage('teststorage', TestStorage);

  module("NoCapacityStorage");

  QUnit.test('Constructor does not crash', function () {
    jIO.createJIO({
      type: "nocapacity",
      schema: {'date': {'type': 'string', format: 'date-time'}},
      sub_storage: {
        type: 'teststorage'
      }
    });
    QUnit.expect(0);
  });

  QUnit.test('Storage does not have query capacity', function (assert) {
    var jio = jIO.createJIO({
      type: "nocapacity",
      schema: {'date': {'type': 'string', format: 'date-time'}},
      sub_storage: {
        type: 'teststorage'
      }
    });
    assert.throws(
      function () { jio.hasCapacity('query'); }
    );
  });

  QUnit.test('Storage calls sub-storage methods', function (assert) {
    var jio = jIO.createJIO({
      type: "nocapacity",
      schema: {'date': {'type': 'string', format: 'date-time'}},
      sub_storage: {
        type: 'teststorage'
      }
    });
    assert.ok(jio.get("fake id"));
    assert.ok(jio.post());
    assert.ok(jio.put("fake id"));
    assert.ok(jio.remove("fake id"));
  });

}(jIO, QUnit));
