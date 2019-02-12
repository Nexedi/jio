
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

  // line is too long (>80) if I don't do this weird indenting
  QUnit.test(
    "Storage list method returns ordered list of ids",
    function (assert) {
      var storage = jIO.createJIO({
        type: "list",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
          }
        }
      }),
        ids = RSVP.all([storage.post(), storage.post(), storage.post()]);


      ids.then(function (values) {
      });
    }
  );

}(jIO, RSVP, QUnit));
