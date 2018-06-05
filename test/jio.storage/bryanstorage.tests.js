/*jslint nomen: true*/
/*global Blob, jiodate*/
(function (jIO, QUnit) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;


  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with RSVP all
  /////////////////////////////////////////////////////////////////

  module("bryanStorage.revision_with_RSVP_all");
  test("verifying updates correctly when puts are done in parallel",
    function () {
      stop();
      expect(7);

      // create storage of type "bryan" with memory as substorage
      var dbname = "rsvp_db_" + Date.now(),
        jio = jIO.createJIO({
          type: "bryan",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              //type: "memory"
              type: "indexeddb",
              database: dbname
            }
          }
        }),
        not_bryan = jIO.createJIO({
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              //type: "memory"
              type: "indexeddb",
              database: dbname
            }
          }
        });

      jio.put("bar", {"title": "foo0"})
        .push(function () {
          return RSVP.all([
            jio.put("bar", {"title": "foo1"}),
            jio.put("bar", {"title": "foo2"}),
            jio.put("bar", {"title": "foo3"}),
            jio.put("bar", {"title": "foo4"}),
            jio.put("barbar", {"title": "attr0"}),
            jio.put("barbar", {"title": "attr1"}),
            jio.put("barbar", {"title": "attr2"}),
            jio.put("barbar", {"title": "attr3"})
          ]);
        })
        .push(function () {return jio.get("bar"); })
        .push(function (result) {
          ok(result.title !== "foo0", "Title should have changed from foo0");
        })
        .push(function () {
          return not_bryan.allDocs({
            query: "",
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            9,
            "All nine versions exist in storage");
          return not_bryan.get(results.data.rows[0].id);
        })
        .push(function (results) {
          deepEqual(results, {
            doc_id: "bar",
            doc: {
              title: "foo0"
            },
            timestamp: results.timestamp,
            op: "put"
          }, "The first item in the log is pushing bar's title to 'foo0'");
          return jio.remove("bar");
        })
        .push(function () {
          return jio.get("bar");
        })
        .push(function () {
          return jio.get("barbar");
        }, function (error) {
          deepEqual(
            error.message,
            "bryanstorage: cannot find object 'bar' (removed)",
            "Appropriate error is sent explaining object has been removed"
          );
          return jio.get("barbar");
        })
        .push(function (result) {
          ok(result.title !== undefined, "barbar exists and has proper form");
          return not_bryan.allDocs({
            query: "",
            sort_on: [["op", "descending"]]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            10,
            "Remove operation is recorded");
          return not_bryan.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            doc_id: "bar",
            timestamp: result.timestamp,
            op: "remove"
          });
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });


  /////////////////////////////////////////////////////////////////
  // bryanStorage.querying_from_bryanstorage
  /////////////////////////////////////////////////////////////////

  module("bryanStorage.querying_from_bryanstorage");
  test("verifying the correct results are returned from bryanStorage.allDocs",
    function () {
      stop();
      expect(1);

      // create storage of type "bryan" with memory as substorage
      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      });
      jio.put("bar", {"title": "foo0"})
        .push(function () {
          return RSVP.all([
            jio.put("bar", {"title": "foo1"}),
            jio.put("bar", {"title": "foo2"}),
            jio.put("bar", {"title": "foo3"}),
            jio.put("barbar", {"title": "attr0"}),
            jio.put("barbar", {"title": "attr1"}),
            jio.put("barbar", {"title": "attr2"})
          ]);
        })
        // Make two final puts so we know what to expect as the current state of
        // each document.
        .push(function () {
          return jio.put("bar", {"title": "foo4"});
        })
        .push(function () {
          return jio.put("barbar", {"title": "attr3"});
        })

        // Queries should only include information about the final two versions
        .push(function () {
          return jio.allDocs({
            query: "",
            sort_on: [["title", "ascending"]]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            2,
            "Empty query yields two results since there are two unique docs");
          return jio.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "attr3"
          }, "Retrieve the first title in the correct format (no metadata)");
        },
          function () {
            return ok(false, "Couldn't find document in storage");
          })

        // Querying for a specific id
        .push(function () {
          return jio.allDocs({
            query: "id: bar"
          });
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo4"
          }, "Retrieve correct document in correct format (no metadata)");
        })

        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });
}(jIO, QUnit));