/*global console, btoa*/
/*jslint nomen: true*/
(function (window, QUnit, jIO, rJS) {
  "use strict";
  var test = QUnit.test,
    equal = QUnit.equal,
    expect = QUnit.expect,
    ok = QUnit.ok,
    stop = QUnit.stop,
    start = QUnit.start,
    deepEqual = QUnit.deepEqual;

  rJS(window)
    .ready(function (g) {
      return g.run({
        "type": "indexeddb",
        "database": "test"
      });
    })
    .ready(function (g) {
      return g.run({
        "type": "local"
      });
    })
    .ready(function (g) {
      return g.run({
        "type": "dav"
      });
    })
    .declareMethod('run', function (jio_options) {

      test('Test "' + jio_options.type + '"scenario', function () {
        var jio;
        stop();
        expect(3);

        try {
          jio = jIO.createJIO(jio_options);
        } catch (error) {
          console.error(error.stack);
          console.error(error);
          throw error;
        }

        // Try to fetch inexistent document
        jio.get({"_id": "inexistent"})
          .fail(function (error) {
            equal(error.status_code, 404, "404 if inexistent");

            // Post a document without ID
            return jio.post({"title": "I don't have ID"});
          })
          .then(function (doc_id) {
            ok(doc_id, "Document without ID created");
            // Fetch the newly created document
            return jio.get({"_id": doc_id});
          })
          .then(function (doc) {
            var doc_id = doc._id;
            delete doc._id;
            deepEqual(doc, {"title": "I don't have ID"},
                      "Document correctly fetched");
            // Remove the doc
            return jio.remove({"_id": doc_id});
          })
          .then(function (doc_id) {
            ok(doc_id, "Document removed");
          })
          .fail(function (error) {
            console.error(error.stack);
            console.error(error);
            ok(false, error);
          })
          .always(function () {
            start();
          });
      });
    });


}(window, QUnit, jIO, rJS));
