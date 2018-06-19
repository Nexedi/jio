/*jslint nomen: true*/
/*global Blob*/
(function (jIO, RSVP, Blob, QUnit) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  function putFullDoc(storage, id, doc, attachment_name, attachment) {
    return storage.put(id, doc)
      .push(function () {
        return storage.putAttachment(
          id,
          attachment_name,
          attachment
        );
      });
  }


  /////////////////////////////////////////////////////////////////
  // historyStorage.querying_from_historystorage
  /////////////////////////////////////////////////////////////////
/**
  module("HistoryStorage.querying_from_historystorage");
  test("verifying the correct results are returned from historyStorage.allDocs",
    function () {
      stop();
      expect(10);

      // create storage of type "history" with memory as substorage
      var jio = jIO.createJIO({
        type: "history",
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
**/
  /////////////////////////////////////////////////////////////////
  // Attachments
  /////////////////////////////////////////////////////////////////

  module("HistoryStorage.attachments");
  test("Testing proper adding/removing attachments",
    function () {
      stop();
      expect(26);

      // create storage of type "history" with memory as substorage
      var dbname = "db_" + Date.now(),
        jio = jIO.createJIO({
          type: "history",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "uuid",
              sub_storage: {
                type: "indexeddb",
                database: dbname
              }
            }
          }
        }),
        not_history = jIO.createJIO({
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "indexeddb",
              database: dbname
            }
          }
        }),

        blob1 = new Blob(['a']),
        blob2 = new Blob(['b']),
        blob3 = new Blob(['ccc']),
        other_blob = new Blob(['1']);
      jio.put("doc", {title: "foo0"})
        .push(function () {
          return jio.put("doc2", {key: "val"});
        })
        .push(function () {
          return jio.putAttachment("doc", "attached", blob1);
        })
        .push(function () {
          return jio.putAttachment("doc", "attached", blob2);
        })
        .push(function () {
          return jio.putAttachment("doc", "other_attached", other_blob);
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo0"
          }, "Get does not return any attachment/revision information");
          return jio.getAttachment("doc", "attached");
        })
        .push(function (result) {
          deepEqual(result,
            blob2,
            "Return the attachment information with getAttachment"
            );
          return jio.getAttachment("doc", "attached_-0");
        })
        .push(function (result) {
          deepEqual(result,
            blob2,
            "Return the attachment information with getAttachment for " +
              "current revision"
            );
          return jio.getAttachment("doc", "attached_-1");
        }, function (error) {
          ok(false, error);
        })
        .push(function (result) {
          deepEqual(result,
            blob1,
            "Return the attachment information with getAttachment for " +
              "previous revision"
            );
          return jio.getAttachment("doc", "attached_-2");
        }, function (error) {
          ok(false, error);
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Error if you try to go back more revisions than what exists");
            return jio.getAttachment("doc", "other_attached");
          })
        .push(function (result) {
          deepEqual(result,
            other_blob,
            "Other document successfully queried"
            );
          return jio.allAttachments("doc");
        })
        .push(function (results) {
          deepEqual(results, {
            "attached": {},
            "other_attached": {}
          }, "allAttachments works as expected.");
          return jio.removeAttachment("doc", "attached");
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo0"
          }, "Get does not return any attachment information (9)");
          return jio.getAttachment("doc", "attached");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Removed attachments cannot be queried");
            return jio.allAttachments("doc");
          })
        .push(function (results) {
          deepEqual(results, {
            "other_attached": {}
          }, "allAttachments works as expected with a removed attachment");
          return jio.putAttachment("doc", "attached", blob3);
        })
        .push(function () {
          return not_history.allDocs();
        })
        .push(function (results) {
          var promises = results.data.rows.map(function (data) {
            return not_history.get(data.id);
          });
          return RSVP.all(promises);
        })
        .push(function (results) {
          deepEqual(results, [
            {timestamp: results[0].timestamp,
              doc_id: "doc", doc: results[0].doc, op: "put"},
            {timestamp: results[1].timestamp,
              doc_id: "doc2", doc: results[1].doc, op: "put"},
            {timestamp: results[2].timestamp,
              doc_id: "doc", name: "attached", op: "putAttachment"},
            {timestamp: results[3].timestamp,
              doc_id: "doc", name: "attached", op: "putAttachment"},
            {timestamp: results[4].timestamp,
              doc_id: "doc", name: "other_attached", op: "putAttachment"},
            {timestamp: results[5].timestamp,
              doc_id: "doc", name: "attached", op: "removeAttachment"},
            {timestamp: results[6].timestamp,
              doc_id: "doc", name: "attached", op: "putAttachment"}
          ], "Other storage can access all document revisions."
            );
        })
        .push(function () {
          return jio.getAttachment("doc", "attached");
        })
        .push(function (result) {
          deepEqual(result,
            blob3,
            "Return the attachment information with getAttachment"
            );
          return jio.getAttachment("doc", "attached_-0");
        })
        .push(function (result) {
          deepEqual(result,
            blob3,
            "Return the attachment information with getAttachment"
            );
          return jio.getAttachment("doc", "attached_-1");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Error if you try to go back to a removed attachment state");
            return jio.getAttachment("doc", "attached_-2");
          })
        .push(function (result) {
          deepEqual(result,
            blob2,
            "Return the attachment information with getAttachment (17)"
            );
          return jio.getAttachment("doc", "attached_-3");
        })
        .push(function (result) {
          deepEqual(result,
            blob1,
            "Return the attachment information with getAttachment"
            );
          return jio.getAttachment("doc", "attached_-4");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Error if you try to go back more revisions than what exists");
          })
        .push(function () {
          return jio.allDocs();
        })
        .push(function (results) {
          equal(results.data.rows.length,
            2,
            "Two documents in accessible storage");
          return jio.get(results.data.rows[1].id);
        })
        .push(function (result) {
          deepEqual(result, {
            "title": "foo0"
          }, "Get second document accessible from jio storage");

          return not_history.allDocs();
        })
        .push(function (results) {
          return RSVP.all(results.data.rows.map(function (d) {
            return not_history.get(d.id);
          }));
        })
        .push(function (results) {
          equal(results.length, 7, "Seven document revisions in storage (24)");
          return jio.remove("doc");
        })
        .push(function () {
          return jio.getAttachment("doc", "attached");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Cannot get the attachment of a removed document");
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

  module("HistoryStorage.getting_and_putting");
  test("Testing proper retrieval of older revisions of documents",
    function () {
      stop();
      expect(18);

      // create storage of type "history" with memory as substorage
      var jio = jIO.createJIO({
        type: "history",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "memory"
            }
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


  test("verifying updates correctly when puts are done in parallel",
    function () {
      stop();
      expect(7);

      // create storage of type "history" with memory as substorage
      var dbname = "rsvp_db_" + Date.now(),
        jio = jIO.createJIO({
          type: "history",
          sub_storage: {
            type: "query",
            sub_storage: {
              type: "uuid",
              sub_storage: {
                //type: "memory"
                type: "indexeddb",
                database: dbname
              }
            }
          }
        }),
        not_history = jIO.createJIO({
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
          return not_history.allDocs({
            query: "",
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            9,
            "All nine versions exist in storage");
          return not_history.get(results.data.rows[0].id);
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
            "HistoryStorage: cannot find object 'bar' (removed)",
            "Appropriate error is sent explaining object has been removed"
          );
          return jio.get("barbar");
        })
        .push(function (result) {
          ok(result.title !== undefined, "barbar exists and has proper form");
          return not_history.allDocs({
            query: "",
            sort_on: [["op", "descending"]]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length,
            10,
            "Remove operation is recorded");
          return not_history.get(results.data.rows[0].id);
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
  // Querying older revisions
  /////////////////////////////////////////////////////////////////

  module("HistoryStorage.allDocs");
  test("Testing retrieval of older revisions via allDocs calls",
    function () {
      stop();
      expect(42);

      // create storage of type "history" with memory as substorage
      var jio = jIO.createJIO({
        type: "history",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "memory"
            }
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
          }, "One correct result.");
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
          }, "One correct result.");
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
          equal(results.data.rows.length, 2,
            "Only retrieve two most recent revions");
          deepEqual(results.data.rows[0].doc, {
            "k": "v3"
          }, "First retrieved revision is correct");
          deepEqual(results.data.rows[1].doc, {
            "k": "v2"
          }, "Second retrieved revision is correct");
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
            "There is only one non-removed doc.");
          deepEqual(results.data.rows[0].doc, {
            "k2": "w1"
          }, "Returned the one correct document.");
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
            "Correct number of results with options.limit set");
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

          return jio.allDocs({
            query: "_REVISION: = 1",
            select_list: ["k"]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 2);
          deepEqual(results.data.rows[0].doc, {
            "k2": "w1"
          });
          deepEqual(results.data.rows[0].value, {});
          deepEqual(results.data.rows[1].doc, {
            "k": "v3"
          });
          deepEqual(results.data.rows[1].value, {
            "k": "v3"
          });
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  /////////////////////////////////////////////////////////////////
  // Complex Queries
  /////////////////////////////////////////////////////////////////

  //module("HistoryStorage.complex_queries");
  test("More complex queries with select_list option",
    function () {
      stop();
      expect(3);

      // create storage of type "history" with memory as substorage
      var jio = jIO.createJIO({
        type: "history",
        sub_storage: {
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "memory"
            }
          }
        }
      }),
        doc = {
          "modification_date": "a",
          "portal_type": "Foo",
          "title": "foo_module/1"
        },
        blob = new Blob(['a']);
      putFullDoc(jio, "foo_module/1", doc, "data", blob)
        .push(function () {
          return jio.get("foo_module/1");
        })
        .push(function (result) {
          deepEqual(result, {
            "modification_date": "a",
            "portal_type": "Foo",
            "title": "foo_module/1"
          }, "Can retrieve a document after attachment placed."
            );
        })
        .push(function () {
          return jio.allDocs({
            query: "portal_type: Foo",
            select_list: ["modification_date", "__id", "__id"],
            sort_on: [["modification_date", "descending"],
              ["timestamp", "descending"],
              ["timestamp", "descending"]
              ]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 1);
          deepEqual(results.data.rows[0], {
            doc: {
              "modification_date": "a",
              "portal_type": "Foo",
              "title": "foo_module/1"
            },
            id: "foo_module/1",
            value: {modification_date: "a"}
          });
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

}(jIO, RSVP, Blob, QUnit));