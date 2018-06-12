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
      expect(10);

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
            jio.remove("bar"),
            jio.put("bar", {"title": "foo1"}),
            jio.put("bar", {"title": "foo2"}),
            jio.put("bar", {"title": "foo3"}),
            jio.put("barbar", {"title": "attr0"}),
            jio.put("barbar", {"title": "attr1"}),
            jio.put("barbar", {"title": "attr2"}),
            jio.put("barbarbar", {"title": "val0"}),
            jio.put("barbarbarbar", {"title": "prop0"})
          ]);
        })
        // Make two final puts so we know what to expect as the current state of
        // each document.
        .push(function () {
          return jio.put("barbar", {"title": "attr3"});
        })
        .push(function () {
          return jio.put("bar", {"title": "foo4"});
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
            4,
            "Empty query yields four results since there are four unique docs");
          return jio.get(results.data.rows[0].id);
        },
          function (error) {
            return ok(false, "Query failed: " + error);
          })
        .push(function (result) {
          deepEqual(result, {
            title: "attr3"
          },
            "NOT IMPLEMENTED: Retrieve correct sort order with no metadata");
        },
          function () {
            return ok(false, "Couldn't find document in storage");
          })

        // Querying with a limit
        .push(function () {
          return jio.allDocs({
            query: "",
            sort_on: [["title", "ascending"]],
            limit: [0, 1]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            1,
            "Since limit [0,1] was supplied, only 1st document is returned");
          return jio.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "attr3"
          },
            "NOT IMPLEMENTED: retrieving documents in specified sort_on order");
        })

        // Querying with a more complicated limit
        .push(function () {
          return jio.allDocs({
            query: "",
            sort_on: [["title", "ascending"]],
            limit: [2, 2]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            2,
            "Retrieving the correct documents when options.limit is specified");

          deepEqual(results.data.rows[0].id,
            "barbarbarbar",
            "NOT IMPLEMENTED: retrieving documents in specified sort_on order");

          deepEqual(results.data.rows[1].id,
            "barbarbar",
            "NOT IMPLEMENTED: retrieving documents in specified sort_on order");

          return jio.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "property0"
          },
            "NOT IMPLEMENTED: retrieving documents in specified sort_on order");
        })

        // Querying for a specific id
        .push(function () {
          return jio.allDocs({
            query: "id: bar"
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            1,
            "NOT IMPLEMENTED: query involving specific document attributes");
          return jio.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo4"
          },
            "NOT IMPLEMENTED: query involving specific document attributes");
        },
          function () {
            ok(false,
              "NOT IMPLEMENTED: query involving specific document attributes"
              );
          })

        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  /////////////////////////////////////////////////////////////////
  // Accessing older revisions
  /////////////////////////////////////////////////////////////////

  module("bryanStorage.accessing_older_revisions");
  test("Testing proper retrieval of older revisions of documents",
    function () {
      stop();
      expect(18);

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
      jio.get("doc")
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "Document does not exist yet.");
          })
        .push(function () {
          return jio.put("doc", {
            "k0": "v0"
          });
        })
        .push(function () {
          return jio.get("doc_-0");
        })
        .push(function (result) {
          deepEqual(result, {
            "k0": "v0"
          });
        })
        .push(function () {
          return jio.put("doc", {"k1": "v1"});
        })
        .push(function () {
          return jio.get("doc_-0");
        })
        .push(function (result) {
          deepEqual(result, {
            "k1": "v1"
          });
        })
        .push(function () {
          return jio.get("doc_-1");
        })
        .push(function (result) {
          deepEqual(result, {
            "k0": "v0"
          });
        })
        .push(function () {
          return jio.put("doc", {"k2": "v2"});
        })
        .push(function () {
          return jio.remove("doc");
        })
        .push(function () {
          return jio.put("doc", {"k3": "v3"});
        })
        .push(function () {
          return jio.put("doc", {"k4": "v4"});
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result,
            {"k4": "v4"},
            "By default, .get returns latest revision");
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result,
            {"k4": "v4"},
            ".get returns latest revision with second input = 0");
          return jio.get("doc_-1");
        })
        .push(function (result) {
          deepEqual(result,
            {"k3": "v3"},
            "Walk back one revision with second input = 1");
          return jio.get("doc_-2");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "Current state of document is 'removed'.");
            return jio.get("doc_-3");
          })
        .push(function (result) {
          deepEqual(result,
            {"k2": "v2"},
            "Walk back three revisions with second input = 3");
          return jio.get("doc_-4");
        })
        .push(function (result) {
          deepEqual(result,
            {"k1": "v1"},
            "Walk back four revisions with second input = 4");
          return jio.get("doc_-5");
        })
        .push(function (result) {
          deepEqual(result,
            {"k0": "v0"},
            "Walk back five revisions with second input = 5");
          return jio.get("doc_-6");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only 5 previous states of this document");
          })

        // Adding documents with problematic doc_id's
        .push(function () {
          return jio.put("doc_-name", {
            "key": "val0"
          });
        })
        .push(function () {
          return jio.put("document_-0", {
            "key": "and val0"
          });
        })
        .push(function () {
          return jio.put("doc_-name", {
            "key": "val1"
          });
        })

        .push(function () {
          return jio.get("doc_-name");
        })
        .push(function (result) {
          deepEqual(result, {
            "key": "val1"
          });
          return jio.get("doc_-name_-0");
        })
        .push(function (result) {
          deepEqual(result, {
            "key": "val1"
          });
          return jio.get("doc_-name_-1");
        })
        .push(function (result) {
          deepEqual(result, {
            "key": "val0"
          });
          return jio.get("document_-0");
        })
        .push(function (result) {
          deepEqual(result, {
            "key": "and val0"
          });
          return jio.get("document_-0_-0");
        })
        .push(function (result) {
          deepEqual(result, {
            "key": "and val0"
          });
          return jio.get("document_-0_-1");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "Document does not have this many revisions.");
          })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  /////////////////////////////////////////////////////////////////
  // Querying older revisions
  /////////////////////////////////////////////////////////////////

  module("bryanStorage.querying_old_revisions");
  test("Testing retrieval of older revisions via allDocs calls",
    function () {
      stop();
      expect(37);

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
      jio.put("doc", {
        "k": "v0"
      })
        .push(function () {
          return jio.put("doc", {
            "k": "v1"
          });
        })
        .push(function () {
          return jio.put("doc", {
            "k": "v2"
          });
        })
        .push(function () {
          return jio.put("doc", {
            "k": "v3"
          });
        })
        .push(function () {
          return jio.allDocs({
            query: "_REVISION : 0"
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows.length,
            1,
            "Only one query returned with options.revision_limit == [0,1]");
          return jio.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v3"
          });
        })
        .push(function () {
          return jio.allDocs({
            query: "_REVISION : =1"
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows.length,
            1,
            "Only one query returned with options.revision_limit == [1,1]");
          deepEqual(results.data.rows[0].doc, {
            "k": "v2"
          });
          return jio.allDocs({
            query: "_REVISION : =2"
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows.length,
            1,
            "Only one query returned with options.revision_limit == [2,1]");
          deepEqual(results.data.rows[0].doc, {
            "k": "v1"
          });
          return jio.allDocs({
            query: "_REVISION : =3"
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows.length,
            1,
            "Only one query returned with options.revision_limit == [3,1]");
          deepEqual(results.data.rows[0].doc, {
            "k": "v0"
          });
          return jio.allDocs({
            query: "_REVISION : =4"
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 0, "Past all previous revisions");
        })
        .push(function () {
          return jio.allDocs({
            query: "_REVISION: <= 1"
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 2);
          deepEqual(results.data.rows[0].doc, {
            "k": "v3"
          }, "Only retrieve two most recent revions");
          deepEqual(results.data.rows[1].doc, {
            "k": "v2"
          });
        })
        .push(function () {
          return jio.remove("doc");
        })
        .push(function () {
          return jio.allDocs({
            query: "NOT (_REVISION: >= 1)",
            revision_limit: [0, 1]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 0,
            "Query does not return removed doc");
        })
        .push(function () {
          return jio.allDocs({
            query: "(_REVISION: >= 1) AND (_REVISION: <= 3)"
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 3);
          deepEqual(results.data.rows[0].doc, {
            "k": "v3"
          }, "1st, 2nd, and 3rd versions removed from current are retrieved");
          deepEqual(results.data.rows[1].doc, {
            "k": "v2"
          }, "1st, 2nd, and 3rd versions removed from current are retrieved");
          deepEqual(results.data.rows[2].doc, {
            "k": "v1"
          }, "1st, 2nd, and 3rd versions removed from current are retrieved");
        })
        .push(function () {
          return jio.put("doc2", {
            "k2": "w0"
          });
        })
        .push(function () {
          return jio.allDocs({
            query: "(_REVISION: >0) AND (_REVISION: <= 3)"
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 3);
          deepEqual(results.data.rows[0].doc, {
            "k": "v3"
          }, "Does not retrieve new document outside queried revision range");
          deepEqual(results.data.rows[1].doc, {
            "k": "v2"
          }, "Does not retrieve new document outside queried revision range");
          deepEqual(results.data.rows[2].doc, {
            "k": "v1"
          }, "Does not retrieve new document outside queried revision range");
        })
        .push(function () {
          return jio.allDocs({
            query: "(_REVISION: = 0) OR (_REVISION: = 1)"
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 2);
          deepEqual(results.data.rows[0].doc, {
            "k2": "w0"
          }, "Retrieves all documents with versions in queried revision range");
          deepEqual(results.data.rows[1].doc, {
            "k": "v3"
          }, "Retrieves all documents with versions in queried revision range");
        })
        .push(function () {
          return jio.put("doc2", {
            "k2": "w1"
          });
        })
        .push(function () {
          return jio.allDocs();
        })
        .push(function (results) {
          equal(results.data.rows.length, 1,
            "There is only one non-removed doc");
          deepEqual(results.data.rows[0].doc, {
            "k2": "w1"
          });
        })
        .push(function () {
          return jio.remove("doc2");
        })
        .push(function () {
          return jio.allDocs({
            query:
              "_REVISION: 0 OR _REVISION: 1 OR " +
              "(_REVISION: >= 2 AND _REVISION: <= 3)"
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 5);
          deepEqual(results.data.rows[0].doc, {
            "k2": "w1"
          });
          deepEqual(results.data.rows[1].doc, {
            "k2": "w0"
          });
          deepEqual(results.data.rows[2].doc, {
            "k": "v3"
          });
          deepEqual(results.data.rows[3].doc, {
            "k": "v2"
          });
          deepEqual(results.data.rows[4].doc, {
            "k": "v1"
          });
        })
        .push(function () {
          return jio.allDocs({
            query: "_REVISION: <= 3",
            limit: [1, 4]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 4,
            "Correct number of results with optins.limit set");
          deepEqual(results.data.rows[0].doc, {
            "k2": "w0"
          }, "Correct results with options.limit set");
          deepEqual(results.data.rows[1].doc, {
            "k": "v3"
          }, "Correct results with options.limit set");
          deepEqual(results.data.rows[2].doc, {
            "k": "v2"
          }, "Correct results with options.limit set");
          deepEqual(results.data.rows[3].doc, {
            "k": "v1"
          }, "Correct results with options.limit set");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

}(jIO, QUnit));