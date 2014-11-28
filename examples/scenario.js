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
        type: "query",
        sub_storage: {
          type: "local"
        }
      });
    })
    .ready(function (g) {
      return g.run({
        type: "query",
        sub_storage: {
          "type": "dav"
        }
      });
    })
    .declareMethod('run', function (jio_options) {

      test('Test "' + jio_options.type + '"scenario', function () {
        var jio;
        stop();
        expect(9);

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
            // Create some documents to check allDocs
            return RSVP.all([
              jio.put({"_id": "id1", "title": "1 ID", "int_index": 1}),
              jio.put({"_id": "id2", "title": "2 ID", "int_index": 2}),
              jio.put({"_id": "id3", "title": "3 ID", "int_index": 3})
            ]);
          })
          .then(function (all_doc_id) {
            equal(all_doc_id[0], "id1", "Document 1 correctly created");
            equal(all_doc_id[1], "id2", "Document 2 correctly created");
            equal(all_doc_id[2], "id3", "Document 3 correctly created");

            // Default allDocs call
            return jio.allDocs();
          })
          .then(function (result) {
            deepEqual(result, {
              data: {
                rows: [{
                  id: "id1",
                  value: {}
                }, {
                  id: "id2",
                  value: {}
                }, {
                  id: "id3",
                  value: {}
                }],
                total_rows: 3
              }
            }, "default allDocs OK");

            // Filter the result
            return jio.allDocs({
              query: 'title: "2 ID"',
              select_list: ["int_index"]
            });
          })
          .then(function (result) {
            deepEqual(result, {
              data: {
                rows: [{
                  doc: {},
                  id: "id2",
                  value: {int_index: 2}
                }],
                total_rows: 1
              }
            }, "filter allDocs OK");

            // XXX Check include docs, sort, limit, select
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
