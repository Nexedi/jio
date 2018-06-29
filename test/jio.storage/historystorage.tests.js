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
  // Attachments
  /////////////////////////////////////////////////////////////////

  module("HistoryStorage.attachments", {
    setup: function () {
      // create storage of type "history" with memory as substorage
      var dbname = "db_" + Date.now();
      this.blob1 = new Blob(['a']);
      this.blob2 = new Blob(['b']);
      this.blob3 = new Blob(['ccc']);
      this.other_blob = new Blob(['1']);
      this.jio = jIO.createJIO({
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
      });
      this.history = jIO.createJIO({
        type: "history",
        include_revisions: true,
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
      });
      this.not_history = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "indexeddb",
            database: dbname
          }
        }
      });
    }
  });

  test("Testing proper adding/removing attachments",
    function () {
      stop();
      expect(10);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps,
        blob2 = this.blob2,
        blob1 = this.blob1,
        other_blob = this.other_blob,
        otherother_blob = new Blob(['abcabc']);

      jio.put("doc", {title: "foo0"}) // 0
        .push(function () {
          return jio.put("doc2", {key: "val"}); // 1
        })
        .push(function () {
          return jio.putAttachment("doc", "attacheddata", blob1); // 2
        })
        .push(function () {
          return jio.putAttachment("doc", "attacheddata", blob2); // 3
        })
        .push(function () {
          return jio.putAttachment("doc", "other_attacheddata", other_blob);// 4
        })
        .push(function () {
          return jio.putAttachment( // 5
            "doc",
            "otherother_attacheddata",
            otherother_blob
          );
        })
        .push(function () {
          return jio.removeAttachment("doc", "otherother_attacheddata"); // 6
        })
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo0"
          }, "Get does not return any attachment/revision information");
          return jio.getAttachment("doc", "attacheddata");
        })
        .push(function (result) {
          deepEqual(result,
            blob2,
            "Return the attachment information with getAttachment"
            );
          return history.getAttachment(
            timestamps[3],
            "attacheddata"
          );
        })
        .push(function (result) {
          deepEqual(result,
            blob2,
            "Return the attachment information with getAttachment for " +
              "current revision"
            );
          return history.getAttachment(
            timestamps[2],
            "attacheddata"
          );
        }, function (error) {
          //console.log(error);
          ok(false, error);
        })
        .push(function (result) {
          deepEqual(result,
            blob1,
            "Return the attachment information with getAttachment for " +
              "previous revision"
            );
          return jio.getAttachment(timestamps[0], "attached");
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
              "Error if you try to go back to a nonexistent timestamp");
            deepEqual(error.message,
              "HistoryStorage: cannot find object '" + timestamps[0] + "'",
              "Error caught by history storage correctly");
            return jio.getAttachment("doc", "other_attacheddata");
          })
        .push(function (result) {
          deepEqual(result,
            other_blob,
            "Other document successfully queried"
            );
        })
        .push(function () {
          return jio.getAttachment("doc", "otherother_attacheddata");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Error if you try to get a removed attachment");
          })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("get attachment immediately after removing it",
    function () {
      stop();
      expect(3);
      var jio = this.jio,
        blob1 = this.blob1;

      jio.put("doc", {title: "foo0"})
        .push(function () {
          return jio.putAttachment("doc", "attacheddata", blob1);
        })
        .push(function () {
          return jio.removeAttachment("doc", "attacheddata");
        })
        .push(function () {
          return jio.getAttachment("doc", "attacheddata");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "throws a jio error");
            deepEqual(error.status_code,
              404,
              "allAttachments of a removed document throws a 404 error");
            deepEqual(error.message,
              "HistoryStorage: cannot find object 'doc' (removed)",
              "Error is handled by Historystorage.");
          })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Ordering of put and remove attachments is correct",
    function () {
      stop();
      expect(1);
      var jio = this.jio,
        blob1 = this.blob1,
        blob2 = this.blob2;

      jio.put("doc", {title: "foo0"})
        .push(function () {
          return jio.putAttachment("doc", "data", blob1);
        })
        .push(function () {
          return jio.removeAttachment("doc", "data");
        })
        .push(function () {
          return jio.putAttachment("doc", "data", blob2);
        })
        .push(function () {
          return jio.getAttachment("doc", "data");
        })
        .push(function (result) {
          deepEqual(result,
            blob2,
            "removeAttachment happens before putAttachment"
            );
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Correctness of allAttachments method on current attachments",
    function () {
      stop();
      expect(14);
      var jio = this.jio,
        not_history = this.not_history,
        blob1 = this.blob1,
        blob2 = this.blob2,
        blob3 = this.blob3,
        other_blob = this.other_blob;

      jio.put("doc", {title: "foo0"})
        .push(function () {
          return jio.put("doc2", {key: "val"});
        })
        .push(function () {
          return jio.putAttachment("doc", "attacheddata", blob1);
        })
        .push(function () {
          return jio.putAttachment("doc", "attacheddata", blob2);
        })
        .push(function () {
          return jio.putAttachment("doc", "other_attacheddata", other_blob);
        })
        .push(function () {
          return jio.allAttachments("doc");
        })
        .push(function (results) {
          deepEqual(results, {
            "attacheddata": blob2,
            "other_attacheddata": other_blob
          }, "allAttachments works as expected.");
          return jio.removeAttachment("doc", "attacheddata"); //
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo0"
          }, "Get does not return any attachment information");
          return jio.getAttachment("doc", "attacheddata");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Removed attachments cannot be queried (4)");
            return jio.allAttachments("doc");
          })
        .push(function (results) {
          deepEqual(results, {
            "other_attacheddata": blob2
          }, "allAttachments works as expected with a removed attachment");
          return jio.putAttachment("doc", "attacheddata", blob3); //
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
              doc_id: "doc", name: "attacheddata", op: "putAttachment"},
            {timestamp: results[3].timestamp,
              doc_id: "doc", name: "attacheddata", op: "putAttachment"},
            {timestamp: results[4].timestamp,
              doc_id: "doc", name: "other_attacheddata", op: "putAttachment"},
            {timestamp: results[5].timestamp,
              doc_id: "doc", name: "attacheddata", op: "removeAttachment"},
            {timestamp: results[6].timestamp,
              doc_id: "doc", name: "attacheddata", op: "putAttachment"}
          ], "Other storage can access all document revisions."
            );
        })
        .push(function () {
          return jio.allDocs();
        })
        .push(function (results) {
          equal(results.data.total_rows,
            2,
            "Two documents in accessible storage");
          return jio.get(results.data.rows[1].id);
        })
        .push(function (result) {
          deepEqual(result, {
            "key": "val"
          }, "Get second document accessible from jio storage");

          return not_history.allDocs();
        })
        .push(function (results) {
          return RSVP.all(results.data.rows.map(function (d) {
            return not_history.get(d.id);
          }));
        })
        .push(function (results) {
          equal(results.length, 7, "Seven document revisions in storage");
          return jio.remove("doc");
        })
        .push(function () {
          return jio.getAttachment("doc", "attacheddata");
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
        .push(function () {
          return jio.allAttachments("doc");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "throws a jio error");
            deepEqual(error.status_code,
              404,
              "allAttachments of a removed document throws a 404 error");
            deepEqual(error.message,
              "HistoryStorage: cannot find object 'doc' (removed)",
              "Error is handled by Historystorage.");
          })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Correctness of allAttachments method on older revisions",
    function () {
      stop();
      expect(11);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        blob1 = new Blob(['a']),
        blob11 = new Blob(['ab']),
        blob2 = new Blob(['abc']),
        blob22 = new Blob(['abcd']),
        timestamps;

      jio.put("doc", {title: "foo0"}) // 0
        .push(function () {
          return jio.putAttachment("doc", "data", blob1);
        })
        .push(function () {
          return jio.putAttachment("doc", "data2", blob2);
        })
        .push(function () {
          return jio.put("doc", {title: "foo1"}); // 1
        })
        .push(function () {
          return jio.removeAttachment("doc", "data2");
        })
        .push(function () {
          return jio.put("doc", {title: "foo2"}); // 2
        })
        .push(function () {
          return jio.putAttachment("doc", "data", blob11);
        })
        .push(function () {
          return jio.remove("doc"); // 3
        })
        .push(function () {
          return jio.put("doc", {title: "foo3"}); // 4
        })
        .push(function () {
          return jio.putAttachment("doc", "data2", blob22);
        })
        .push(function () {
          return not_history.allDocs({
            query: "op: put OR op: remove",
            sort_on: [["timestamp", "ascending"]],
            select_list: ["timestamp"]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.value.timestamp;
          });
        })
        .push(function () {
          return jio.allAttachments("doc");
        })
        .push(function (results) {
          deepEqual(results, {
            "data": blob11,
            "data2": blob22
          },
            "Current state of document is correct");

          return history.allAttachments(timestamps[0]);
        })
        .push(function (results) {
          deepEqual(results, {}, "First version of document has 0 attachments");

          return history.allAttachments(timestamps[1]);
        })
        .push(function (results) {
          deepEqual(results, {
            data: blob1,
            data2: blob2
          }, "Both attachments are included in allAttachments");

          return history.allAttachments(timestamps[2]);
        })
        .push(function (results) {
          deepEqual(results, {
            data: blob1
          }, "Removed attachment does not show up in allAttachments");
          return history.allAttachments(timestamps[3]);
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "throws a jio error");
            deepEqual(error.status_code,
              404,
              "allAttachments of a removed document throws a 404 error");
            deepEqual(error.message,
              "HistoryStorage: cannot find object '" + timestamps[3] +
                "' (removed)",
              "Error is handled by Historystorage.");
          })
        .push(function () {
          return history.allAttachments(timestamps[4]);
        })
        .push(function (results) {
          deepEqual(results, {
            data: blob11
          });
        })
        .push(function () {
          return history.allAttachments("not-a-timestamp-or-doc_id");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "throws a jio error");
            deepEqual(error.status_code,
              404,
              "allAttachments of a removed document throws a 404 error");
            deepEqual(error.message,
              "HistoryStorage: cannot find object 'not-a-timestamp-or-doc_id'",
              "Error is handled by Historystorage.");
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

  module("HistoryStorage.get", {
    setup: function () {
      // create storage of type "history" with memory as substorage
      var dbname = "db_" + Date.now();
      this.jio = jIO.createJIO({
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
      });
      this.history = jIO.createJIO({
        type: "history",
        include_revisions: true,
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
      });
      this.not_history = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "indexeddb",
            database: dbname
          }
        }
      });
    }
  });

  test("Removing documents before putting them",
    function () {
      stop();
      expect(4);
      var jio = this.jio,
        not_history = this.not_history,
        timestamps;

      jio.remove("doc")
        .push(function () {
          return jio.put("doc2", {title: "foo"});
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function () {
          ok(false, "This statement should not be reached");
        }, function (error) {
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            404,
            "Correct status code for getting a non-existent document"
            );
          deepEqual(error.message,
            "HistoryStorage: cannot find object 'doc' (removed)",
            "Error is handled by history storage before reaching console");
        })
        .push(function () {
          return not_history.allDocs({
            select_list: ["timestamp"],
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.value.timestamp;
          });
        })
        .push(function () {
          return jio.allDocs({select_list: ["title"]});
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              id: "doc2",
              value: {title: "foo"},
              doc: {},
              timestamp: timestamps[1]
            }], "DOcument that was removed before being put is not retrieved");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Removing documents and then putting them",
    function () {
      stop();
      expect(2);
      var jio = this.jio,
        history = this.history,
        timestamps;

      jio.remove("doc")
        .push(function () {
          return jio.put("doc", {title: "foo"});
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo"
          }, "A put was the most recent edit on 'doc'");
        })
        .push(function () {
          return history.allDocs({
            select_list: ["timestamp"]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.timestamp;
          });
        })
        .push(function () {
          return history.allDocs({select_list: ["title"]});
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              id: "doc",
              value: {title: "foo"},
              doc: {},
              timestamp: timestamps[0]
            },
            {
              id: "doc",
              value: {},
              doc: {},
              timestamp: timestamps[1]
            }], "DOcument that was removed before being put is not retrieved");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Handling bad input",
    function () {
      stop();
      expect(2);
      var jio = this.jio,
        history = this.history,
        timestamp;

      jio.put("doc", {title: "foo"})
        .push(function () {
          return history.allDocs();
        })
        .push(function (res) {
          timestamp = res.data.rows[0].timestamp;
          return history.put(timestamp, {key: "val"});
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo"
          }, "Saving document with timestamp id does not cause issues (1)");
          return history.get(timestamp);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "foo"
          }, "Saving document with timestamp id does not cause issues (2)");
          return history.get(timestamp);
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Getting a non-existent document",
    function () {
      stop();
      expect(3);
      var jio = this.jio;
      jio.put("not_doc", {})
        .push(function () {
          return jio.get("doc");
        })
        .push(function () {
          ok(false, "This statement should not be reached");
        }, function (error) {
          //console.log(error);
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            404,
            "Correct status code for getting a non-existent document"
            );
          deepEqual(error.message,
            "HistoryStorage: cannot find object 'doc'",
            "Error is handled by history storage before reaching console");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Getting a document with timestamp when include_revisions is false",
    function () {
      stop();
      expect(6);
      var jio = this.jio,
        history = this.history,
        timestamp;
      jio.put("not_doc", {})
        .push(function () {
          return jio.get("doc");
        })
        .push(function () {
          ok(false, "This statement should not be reached");
        }, function (error) {
          //console.log(error);
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            404,
            "Correct status code for getting a non-existent document"
            );
          deepEqual(error.message,
            "HistoryStorage: cannot find object 'doc'",
            "Error is handled by history storage before reaching console");
        })
        .push(function () {
          return history.allDocs();
        })
        .push(function (results) {
          timestamp = results.data.rows[0].timestamp;
          return jio.get(timestamp);
        })
        .push(function () {
          ok(false, "This statement should not be reached");
        }, function (error) {
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            404,
            "Correct status code for getting a non-existent document"
            );
          deepEqual(error.message,
            "HistoryStorage: cannot find object '" + timestamp + "'",
            "Error is handled by history storage before reaching console");
        })
        /**
         * XXX: I don't think this test is necessary
        .push(function () {
          return history.get("doc");
        })
        .push(function (res) {
          console.log(res);
          ok(false, "This statement should not be reached");
        }, function (error) {
          //console.log(error);
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            404,
            "Correct status code for getting a non-existent document"
            );
          deepEqual(error.message,
            "HistoryStorage: cannot find object 'doc'",
            "Error is handled by history storage before reaching console");
        })
        **/

        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Creating a document with put and retrieving it with get",
    function () {
      stop();
      expect(5);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps;
      jio.put("doc", {title: "version0"})
        .push(function () {
          return not_history.allDocs({
            select_list: ["timestamp"]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.value.timestamp;
          });
        })
        .push(function () {
          equal(timestamps.length,
            1,
            "One revision is saved in storage"
            );
          return history.get(timestamps[0]);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "version0"
          }, "Get document from history storage");
          return not_history.get(
            timestamps[0]
          );
        })
        .push(function (result) {
          deepEqual(result, {
            timestamp: timestamps[0],
            op: "put",
            doc_id: "doc",
            doc: {
              title: "version0"
            }
          }, "Get document from non-history storage");
        })
        .push(function () {
          return jio.get("non-existent-doc");
        })
        .push(function () {
          ok(false, "This should have thrown an error");
        }, function (error) {
          //console.log(error);
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            404,
            "Can't access non-existent document"
            );
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Retrieving older revisions with get",
    function () {
      stop();
      expect(7);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps;

      return jio.put("doc", {title: "t0", subtitle: "s0"})
        .push(function () {
          return jio.put("doc", {title: "t1", subtitle: "s1"});
        })
        .push(function () {
          return jio.put("doc", {title: "t2", subtitle: "s2"});
        })
        .push(function () {
          jio.remove("doc");
        })
        .push(function () {
          return jio.put("doc", {title: "t3", subtitle: "s3"});
        })
        .push(function () {
          return not_history.allDocs({
            select_list: ["timestamp"],
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.value.timestamp;
          });
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t3",
            subtitle: "s3"
          }, "Get returns latest revision");
          return history.get(timestamps[0]);
        }, function (err) {
          ok(false, err);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t0",
            subtitle: "s0"
          }, "Get returns first version");
          return history.get(timestamps[1]);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t1",
            subtitle: "s1"
          }, "Get returns second version");
          return history.get(timestamps[2]);
        }, function (err) {
          ok(false, err);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t2",
            subtitle: "s2"
          }, "Get returns third version");
          return history.get(timestamps[3]);
        }, function (err) {
          ok(false, err);
        })
        .push(function () {
          ok(false, "This should have thrown a 404 error");
          return history.get(timestamps[4]);
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Error if you try to go back more revisions than what exists");
            return history.get(timestamps[4]);
          })
        .push(function (result) {
          deepEqual(result, {
            title: "t3",
            subtitle: "s3"
          }, "Get returns latest version");
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
      expect(8);
      var jio = this.jio,
        not_history = this.not_history;

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
          equal(results.data.total_rows,
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
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          equal(error.status_code, 404, "Correct error status code returned");
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
          equal(results.data.total_rows,
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

  test("Getting after attachments have been put",
    function () {
      stop();
      expect(4);
      var jio = this.jio,
        history = this.history,
        blob = new Blob(['a']),
        edit_log;

      jio.put("doc", {"title": "foo0"})
        .push(function () {
          return jio.putAttachment("doc", "attachment", blob);
        })
        .push(function () {
          return jio.removeAttachment("doc", "attachment", blob);
        })
        .push(function () {
          return jio.get("doc");
        })
        .push(function (res) {
          deepEqual(res, {title: "foo0"});
          return history.allDocs({select_list: ["title"]});
        })
        .push(function (results) {
          edit_log = results.data.rows;
          return history.get(edit_log[0].timestamp);
        })
        .push(function (result) {
          deepEqual(result, {title: "foo0"});
          return history.get(edit_log[1].timestamp);
        })
        .push(function (result) {
          deepEqual(result, {title: "foo0"});
          return history.get(edit_log[2].timestamp);
        })
        .push(function (result) {
          deepEqual(result, {title: "foo0"});
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

  module("HistoryStorage.allDocs", {
    setup: function () {
      // create storage of type "history" with memory as substorage
      var dbname = "db_" + Date.now();
      this.jio = jIO.createJIO({
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
      });
      this.history = jIO.createJIO({
        type: "history",
        include_revisions: true,
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
      });
      this.not_history = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "indexeddb",
            database: dbname
          }
        }
      });
    }
  });
  test("Putting a document and retrieving it with allDocs",
    function () {
      stop();
      expect(7);
      var jio = this.jio,
        not_history = this.not_history,
        timestamp;
      jio.put("doc", {title: "version0"})
        .push(function () {
          return not_history.allDocs({
            query: "doc_id: doc",
            select_list: ["timestamp"]
          });
        })
        .push(function (results) {
          timestamp = results.data.rows[0].value.timestamp;
        })
        .push(function () {
          return RSVP.all([
            jio.allDocs(),
            jio.allDocs({query: "title: version0"}),
            jio.allDocs({limit: [0, 1]}),
            jio.allDocs({})
          ]);
        })
        .push(function (results) {
          var ind = 0;
          for (ind = 0; ind < results.length - 1; ind += 1) {
            deepEqual(results[ind],
              results[ind + 1],
              "Each query returns exactly the same correct output"
              );
          }
          return results[0];
        })
        .push(function (results) {
          equal(results.data.total_rows,
            1,
            "Exactly one result returned");
          deepEqual(results.data.rows[0], {
            doc: {},
            value: {},
            id: "doc",
            timestamp: timestamp
          },
            "Correct document format is returned."
            );
          return not_history.allDocs();
        })
        .push(function (results) {
          equal(results.data.total_rows,
            1,
            "Exactly one result returned");
          return not_history.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            timestamp: timestamp,
            doc_id: "doc",
            doc: {
              title: "version0"
            },
            op: "put"
          },
            "When a different type of storage queries historystorage, all " +
            "metadata is returned correctly"
            );
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Putting doc with _doc_id and _timestamp properties" +
    "and retrieving them with allDocs",
    function () {
      stop();
      expect(1);
      var jio = this.jio,
        not_history = this.not_history,
        timestamp;
      jio.put("doc", {
        title: "version0",
        _doc_id: "bar",
        __doc_id: "bar2",
        ___doc_id: "bar3",
        _timestamp: "foo",
        ____timestamp: "foo2"
      })
        .push(function () {
          return not_history.allDocs({
            query: "doc_id: doc",
            select_list: ["timestamp"]
          });
        })
        .push(function (results) {
          timestamp = results.data.rows[0].value.timestamp;
        })
        .push(function () {
          return jio.allDocs({
            query: "title: version0 AND _timestamp: >= 0",
            select_list: ["title", "_doc_id", "__doc_id", "___doc_id",
              "_timestamp", "____timestamp"]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {
                title: "version0",
                _doc_id: "bar",
                __doc_id: "bar2",
                ___doc_id: "bar3",
                _timestamp: "foo",
                ____timestamp: "foo2"
              },
              timestamp: timestamp
            }],
            "_doc_id properties are not overwritten in allDocs call");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Putting a document, revising it, and retrieving revisions with allDocs",
    function () {
      stop();
      expect(10);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps;
      jio.put("doc", {
        title: "version0",
        subtitle: "subvers0"
      })
        .push(function () {
          return jio.put("doc", {
            title: "version1",
            subtitle: "subvers1"
          });
        })
        .push(function () {
          return jio.put("doc", {
            title: "version2",
            subtitle: "subvers2"
          });
        })
        .push(function () {
          return not_history.allDocs({
            select_list: ["timestamp"],
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.value.timestamp;
          });
        })
        .push(function () {
          return RSVP.all([
            jio.allDocs({select_list: ["title", "subtitle"]}),
            jio.allDocs({
              query: "",
              select_list: ["title", "subtitle"]
            }),
            jio.allDocs({
              query: "title: version2",
              select_list: ["title", "subtitle"]
            }),
            jio.allDocs({
              query: "NOT (title: version1)",
              select_list: ["title", "subtitle"]
            }),
            jio.allDocs({
              query: "(NOT (subtitle: subvers1)) AND (NOT (title: version0))",
              select_list: ["title", "subtitle"]
            }),
            jio.allDocs({
              limit: [0, 1],
              sort_on: [["title", "ascending"]],
              select_list: ["title", "subtitle"]
            })
          ]);
        })
        .push(function (results) {
          var ind = 0;
          for (ind = 0; ind < results.length - 1; ind += 1) {
            deepEqual(results[ind],
              results[ind + 1],
              "Each query returns exactly the same correct output"
              );
          }
          return results[0];
        })
        .push(function (results) {
          equal(results.data.total_rows,
            1,
            "Exactly one result returned");
          deepEqual(results.data.rows[0], {
            value: {
              title: "version2",
              subtitle: "subvers2"
            },
            doc: {},
            id: "doc",
            timestamp: timestamps[2]
          },
            "Correct document format is returned."
            );
        })
        .push(function () {
          return history.allDocs({
            query: "",
            select_list: ["title", "subtitle"]
          });
        })
        .push(function (results) {
          equal(results.data.total_rows,
            3,
            "Querying with include_revisions retrieves all versions");
          deepEqual(results.data.rows, [
            {
              id: "doc",
              value: {
                title: "version2",
                subtitle: "subvers2"
              },
              doc: {},
              timestamp: timestamps[2]
            },
            {
              id: "doc",
              value: {
                title: "version1",
                subtitle: "subvers1"
              },
              doc: {},
              timestamp: timestamps[1]
            },
            {
              id: "doc",
              value: {
                title: "version0",
                subtitle: "subvers0"
              },
              doc: {},
              timestamp: timestamps[0]
            }
          ], "Full version history is included.");

          return not_history.allDocs({
            sort_on: [["title", "ascending"]]
          });
        })
        .push(function (results) {
          return RSVP.all(results.data.rows.map(function (d) {
            return not_history.get(d.id);
          }));
        })
        .push(function (results) {
          deepEqual(results, [
            {
              timestamp: timestamps[0],
              op: "put",
              doc_id: "doc",
              doc: {
                title: "version0",
                subtitle: "subvers0"
              }
            },
            {
              timestamp: timestamps[1],
              op: "put",
              doc_id: "doc",
              doc: {
                title: "version1",
                subtitle: "subvers1"
              }
            },
            {
              timestamp: timestamps[2],
              op: "put",
              doc_id: "doc",
              doc: {
                title: "version2",
                subtitle: "subvers2"
              }
            }
          ],
            "A different storage type can retrieve all versions as expected.");
        })
        .fail(function (error) {
            //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });


  test(
    "Putting and removing documents, latest revisions and no removed documents",
    function () {
      stop();
      expect(3);
      var jio = this.jio,
        not_history = this.not_history,
        timestamps;

      jio.put("doc_a", {
        title_a: "rev0",
        subtitle_a: "subrev0"
      })
        .push(function () {
          return jio.put("doc_a", {
            title_a: "rev1",
            subtitle_a: "subrev1"
          });
        })
        .push(function () {
          return jio.put("doc_b", {
            title_b: "rev0",
            subtitle_b: "subrev0"
          });
        })
        .push(function () {
          return jio.remove("doc_b");
        })
        .push(function () {
          return jio.put("doc_c", {
            title_c: "rev0",
            subtitle_c: "subrev0"
          });
        })
        .push(function () {
          return jio.put("doc_c", {
            title_c: "rev1",
            subtitle_c: "subrev1"
          });
        })
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })
        .push(function () {
          return jio.allDocs({sort_on: [["timestamp", "descending"]]});
        })
        .push(function (results) {
          equal(results.data.total_rows,
            2,
            "Only two non-removed unique documents exist."
            );
          deepEqual(results.data.rows, [
            {
              id: "doc_c",
              value: {},
              doc: {},
              timestamp: timestamps[5]
            },
            {
              id: "doc_a",
              value: {},
              doc: {},
              timestamp: timestamps[1]
            }
          ],
            "Empty query returns latest revisions (and no removed documents)");
          equal(timestamps.length,
            6,
            "Correct number of revisions logged");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    }
  );

    /////////////////////////////////////////////////////////////////
    // Complex Queries
    /////////////////////////////////////////////////////////////////

  test("More complex query with different options (without revision queries)",
    function () {
      stop();
      expect(2);
      var jio = this.jio,
        not_history = this.not_history,
        timestamps,
        docs = [
          {
            "date": 1,
            "type": "foo",
            "title": "doc"
          },
          {
            "date": 2,
            "type": "bar",
            "title": "second_doc"
          },
          {
            "date": 2,
            "type": "barbar",
            "title": "third_doc"
          }
        ],
        blobs = [
          new Blob(['a']),
          new Blob(['bcd']),
          new Blob(['eeee'])
        ];
      jio.put("doc", {}) // 0
        .push(function () {
          return putFullDoc(jio, "doc", docs[0], "data", blobs[0]); // 1,2
        })
        .push(function () {
          return putFullDoc(jio, "second_doc", docs[1], "data", blobs[1]);// 3,4
        })
        .push(function () {
          return putFullDoc(jio, "third_doc", docs[2], "data", blobs[2]); // 5,6
        })
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })
        .push(function () {
          return jio.allDocs({
            query: "NOT (date: > 2)",
            select_list: ["date", "non-existent-key"],
            sort_on: [["date", "ascending"],
              ["non-existent-key", "ascending"]
              ]
          });
        })
        .push(function (results) {
          equal(results.data.total_rows, 3);
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {date: 1},
              timestamp: timestamps[2]
            },
            {
              doc: {},
              id: "third_doc",
              value: {date: 2},
              timestamp: timestamps[6]
            },
            {
              doc: {},
              id: "second_doc",
              value: {date: 2},
              timestamp: timestamps[4]
            }
          ],
            "Query gives correct results in correct order");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  /////////////////////////////////////////////////////////////////
  // Complex Queries with Revision Querying
  /////////////////////////////////////////////////////////////////

  test("More complex query with different options (with revision queries)",
    function () {
      stop();
      expect(3);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps,
        docs = [
          {
            "date": 1,
            "type": "foo",
            "title": "doc"
          },
          {
            "date": 2,
            "type": "bar",
            "title": "second_doc"
          }
        ],
        blobs = [
          new Blob(['a']),
          new Blob(['bcd']),
          new Blob(['a2']),
          new Blob(['bcd2']),
          new Blob(['a3'])
        ];
      jio.put("doc", {})// 0
        .push(function () {// 1,2
          return putFullDoc(jio, "doc", docs[0], "data", blobs[0]);
        })
        .push(function () {// 3,4
          return putFullDoc(jio, "second_doc", docs[1], "data", blobs[1]);
        })
        .push(function () {
          docs[0].date = 4;
          docs[0].type = "foo2";
          docs[1].date = 4;
          docs[1].type = "bar2";
        })
        .push(function () {// 5,6
          return putFullDoc(jio, "doc", docs[0], "data", blobs[2]);
        })
        .push(function () {// 7
          return jio.remove("second_doc");
        })
        .push(function () {// 8,9
          return putFullDoc(jio, "second_doc", docs[1], "data", blobs[3]);
        })
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "descending"]],
            select_list: ["op", "doc_id", "timestamp"]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: timestamps[9],
              value: {
                "op": "putAttachment",
                "doc_id": "second_doc",
                "timestamp": timestamps[9]
              }
            },
            {
              doc: {},
              id: timestamps[8],
              value: {
                "op": "put",
                "doc_id": "second_doc",
                "timestamp": timestamps[8]
              }
            },
            {
              doc: {},
              id: timestamps[7],
              value: {
                "op": "remove",
                "doc_id": "second_doc",
                "timestamp": timestamps[7]
              }
            },
            {
              doc: {},
              id: timestamps[6],
              value: {
                "op": "putAttachment",
                "doc_id": "doc",
                "timestamp": timestamps[6]
              }
            },
            {
              doc: {},
              id: timestamps[5],
              value: {
                "op": "put",
                "doc_id": "doc",
                "timestamp": timestamps[5]
              }
            },
            {
              doc: {},
              id: timestamps[4],
              value: {
                "op": "putAttachment",
                "doc_id": "second_doc",
                "timestamp": timestamps[4]
              }
            },
            {
              doc: {},
              id: timestamps[3],
              value: {
                "op": "put",
                "doc_id": "second_doc",
                "timestamp": timestamps[3]
              }
            },
            {
              doc: {},
              id: timestamps[2],
              value: {
                "op": "putAttachment",
                "doc_id": "doc",
                "timestamp": timestamps[2]
              }
            },
            {
              doc: {},
              id: timestamps[1],
              value: {
                "op": "put",
                "doc_id": "doc",
                "timestamp": timestamps[1]
              }
            },
            {
              doc: {},
              id: timestamps[0],
              value: {
                "op": "put",
                "doc_id": "doc",
                "timestamp": timestamps[0]
              }
            }
          ], "All operations are logged correctly");
          var promises = results.data.rows
            .filter(function (doc) {
              return (doc.value.op === "put");
            })
            .map(function (data) {
              return not_history.get(data.id);
            });
          return RSVP.all(promises)
            .then(function (results) {
              return results.map(function (docum) {
                return docum.doc;
              });
            });
        })
        .push(function (results) {
          deepEqual(results,
            [
              {
                "date": 4,
                "type": "bar2",
                "title": "second_doc"
              },
              {
                "date": 4,
                "type": "foo2",
                "title": "doc"
              },
              {
                "date": 2,
                "type": "bar",
                "title": "second_doc"
              },
              {
                "date": 1,
                "type": "foo",
                "title": "doc"
              },
              {}
            ], "All versions of documents are stored correctly");
        })
        .push(function () {
          return history.allDocs({
            query: "NOT (date: >= 2 AND date: <= 3) AND " +
              "(date: = 1 OR date: = 4)",
            select_list: ["date", "non-existent-key", "type", "title"],
            sort_on: [["date", "descending"]]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "second_doc",
              value: {
                date: 4,
                title: "second_doc",
                type: "bar2"
              },
              timestamp: timestamps[9]
            },
            {
              doc: {},
              id: "second_doc",
              value: {
                date: 4,
                title: "second_doc",
                type: "bar2"
              },
              timestamp: timestamps[8]
            },
            {
              doc: {},
              id: "doc",
              value: {
                date: 4,
                title: "doc",
                type: "foo2"
              },
              timestamp: timestamps[6]
            },
            {
              doc: {},
              id: "doc",
              value: {
                date: 4,
                title: "doc",
                type: "foo2"
              },
              timestamp: timestamps[5]
            },

            {
              doc: {},
              id: "doc",
              value: {
                date: 1,
                title: "doc",
                type: "foo"
              },
              timestamp: timestamps[2]
            },
            {
              doc: {},
              id: "doc",
              value: {
                date: 1,
                title: "doc",
                type: "foo"
              },
              timestamp: timestamps[1]
            }
          ],
            "Query gives correct results in correct order");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test(
    "allDocs with include_revisions with an attachment on a removed document",
    function () {
      stop();
      expect(1);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps,
        blob = new Blob(['a']);

      jio.put("document", {title: "foo"})
        .push(function () {
          return jio.remove("document");
        })
        .push(function () {
          return jio.putAttachment("document", "attachment", blob);
        })

        // Get timestamps
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })
        .push(function () {
          return history.allDocs({select_list: ["title"]});
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              id: "document",
              doc: {},
              value: {},
              timestamp: timestamps[2]
            },
            {
              id: "document",
              doc: {},
              value: {},
              timestamp: timestamps[1]
            },
            {
              id: "document",
              doc: {},
              value: {title: "foo"},
              timestamp: timestamps[0]
            }],
            "Attachment on removed document is handled correctly"
            );
          return not_history.allDocs({select_list: ["doc"]});
        })

        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    }
  );

  test("allDocs with include_revisions with a removed attachment",
    function () {
      stop();
      expect(2);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps,
        blob = new Blob(['a']);

      jio.put("document", {title: "foo"})
        .push(function () {
          return jio.putAttachment("document", "attachment", blob);
        })
        .push(function () {
          return jio.removeAttachment("document", "attachment");
        })

        // Get timestamps
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })

        .push(function () {
          return history.allDocs({select_list: ["title"]});
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              id: "document",
              doc: {},
              value: {title: "foo"},
              timestamp: timestamps[2]
            },
            {
              id: "document",
              doc: {},
              value: {title: "foo"},
              timestamp: timestamps[1]
            },
            {
              id: "document",
              doc: {},
              value: {title: "foo"},
              timestamp: timestamps[0]
            }],
            "Attachment on removed document is handled correctly"
            );
        })
        .push(function () {
          return jio.allAttachments("document");
        })
        .push(function (results) {
          deepEqual(results, {}, "No non-removed attachments");
        })

        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Parallel edits will not break anything",
    function () {
      stop();
      expect(2);
      var jio = this.jio,
        history = this.history,
        blob1 = new Blob(['ab']),
        blob2 = new Blob(['abc']),
        blob3 = new Blob(['abcd']);

      jio.put("doc", {k: "v0"})
        .push(function () {
          return RSVP.all([
            jio.put("doc", {k: "v"}),
            jio.putAttachment("doc", "data", blob1),
            jio.putAttachment("doc", "data2", blob2),
            jio.putAttachment("doc", "data", blob3),
            jio.removeAttachment("doc", "data"),
            jio.removeAttachment("doc", "data2"),
            jio.remove("doc"),
            jio.remove("doc"),
            jio.put("doc", {k: "v"}),
            jio.put("doc", {k: "v"}),
            jio.put("doc2", {k: "foo"}),
            jio.remove("doc"),
            jio.remove("doc")
          ]);
        })

        .push(function () {
          ok(true, "No errors thrown.");
          return history.allDocs();
        })
        .push(function (results) {
          var res = results.data.rows;
          equal(res.length,
            14,
            "All edits are recorded regardless of ordering");
          return jio.allDocs();
        })

        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });


  module("HistoryStorage.Full-Example", {
    setup: function () {
      // create storage of type "history" with memory as substorage
      var dbname = "db_" + Date.now();
      this.blob1 = new Blob(['a']);
      this.blob2 = new Blob(['b']);
      this.blob3 = new Blob(['ccc']);
      this.other_blob = new Blob(['1']);

      this.jio = jIO.createJIO({
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
      });
      this.history = jIO.createJIO({
        type: "history",
        include_revisions: true,
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
      });
      this.not_history = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "indexeddb",
            database: dbname
          }
        }
      });
    }
  });

  test("Retrieving history with attachments",
    function () {
      stop();
      expect(1);
      var jio = this.jio,
        history = this.history,
        not_history = this.not_history,
        timestamps,
        blobs1 = [
          new Blob(['a']),
          new Blob(['ab']),
          new Blob(['abc']),
          new Blob(['abcd']),
          new Blob(['abcde'])
        ],
        blobs2 = [
          new Blob(['abcdef']),
          new Blob(['abcdefg']),
          new Blob(['abcdefgh']),
          new Blob(['abcdefghi']),
          new Blob(['abcdefghij'])
        ];
      putFullDoc(jio, "doc", {title: "bar"}, "data", blobs1[0])
        .push(function () {
          return putFullDoc(jio, "doc", {title: "bar0"}, "data", blobs1[1]);
        })
        .push(function () {
          return putFullDoc(jio, "doc", {title: "bar1"}, "data", blobs1[2]);
        })
        .push(function () {
          return putFullDoc(jio, "doc2", {title: "foo0"}, "data", blobs2[0]);
        })
        .push(function () {
          return putFullDoc(jio, "doc2", {title: "foo1"}, "data", blobs2[0]);
        })
        .push(function () {
          return putFullDoc(jio, "doc", {title: "bar2"}, "data", blobs1[3]);
        })
        .push(function () {
          return putFullDoc(jio, "doc", {title: "bar3"}, "data", blobs1[4]);
        })

        // Get timestamps
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })

        .push(function () {
          return history.allDocs({
            select_list: ["title"]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {title: "bar3"},
              timestamp: timestamps[13]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar3"},
              timestamp: timestamps[12]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar2"},
              timestamp: timestamps[11]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar2"},
              timestamp: timestamps[10]
            },
            {
              doc: {},
              id: "doc2",
              value: {title: "foo1"},
              timestamp: timestamps[9]
            },
            {
              doc: {},
              id: "doc2",
              value: {title: "foo1"},
              timestamp: timestamps[8]
            },
            {
              doc: {},
              id: "doc2",
              value: {title: "foo0"},
              timestamp: timestamps[7]
            },
            {
              doc: {},
              id: "doc2",
              value: {title: "foo0"},
              timestamp: timestamps[6]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar1"},
              timestamp: timestamps[5]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar1"},
              timestamp: timestamps[4]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[3]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[2]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar"},
              timestamp: timestamps[1]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar"},
              timestamp: timestamps[0]
            }
          ],
            "allDocs with include_revisions should return all revisions");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });


  test("Retrieving history with attachments with less straightforward ordering",
    function () {
      stop();
      expect(1);
      var jio = this.jio,
        not_history = this.not_history,
        history = this.history,
        timestamps,
        blobs1 = [
          new Blob(['a']),
          new Blob(['ab']),
          new Blob(['abc']),
          new Blob(['abcd']),
          new Blob(['abcde'])
        ];
      jio.put("doc", {title: "bar"})
        .push(function () {
          return jio.put("doc", {title: "bar0"});
        })
        .push(function () {
          return jio.putAttachment("doc", "data", blobs1[0]);
        })
        .push(function () {
          return jio.put("doc2", {title: "foo0"});
        })
        .push(function () {
          return jio.putAttachment("doc", "data", blobs1[1]);
        })

        // Get timestamps
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })

        .push(function () {
          return history.allDocs({
            select_list: ["title"]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[4]
            },
            {
              doc: {},
              id: "doc2",
              value: {title: "foo0"},
              timestamp: timestamps[3]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[2]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[1]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar"},
              timestamp: timestamps[0]
            }
          ],
            "allDocs with include_revisions should return all revisions");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });


  test("Retrieving history with attachments with removals",
    function () {
      stop();
      expect(2);
      var jio = this.jio,
        not_history = this.not_history,
        history = this.history,
        timestamps,
        blobs1 = [
          new Blob(['a']),
          new Blob(['ab']),
          new Blob(['abc']),
          new Blob(['abcd']),
          new Blob(['abcde'])
        ];
      jio.put("doc", {title: "bar"})
        .push(function () {
          return jio.put("doc", {title: "bar0"});
        })
        .push(function () {
          return jio.putAttachment("doc", "data", blobs1[0]);
        })
        .push(function () {
          return jio.put("doc2", {title: "foo0"});
        })
        .push(function () {
          return jio.putAttachment("doc", "data", blobs1[1]);
        })

        // Get timestamps
        .push(function () {
          return not_history.allDocs({
            sort_on: [["timestamp", "ascending"]]
          });
        })
        .push(function (results) {
          timestamps = results.data.rows.map(function (d) {
            return d.id;
          });
        })
        .push(function () {
          return jio.allDocs({
            select_list: ["title"]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[4]
            },
            {
              doc: {},
              id: "doc2",
              value: {title: "foo0"},
              timestamp: timestamps[3]
            }
          ],
            "allDocs with include_revisions false should return all revisions");
        })
        .push(function () {
          return history.allDocs({
            select_list: ["title"]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[4]
            },
            {
              doc: {},
              id: "doc2",
              value: {title: "foo0"},
              timestamp: timestamps[3]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[2]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar0"},
              timestamp: timestamps[1]
            },
            {
              doc: {},
              id: "doc",
              value: {title: "bar"},
              timestamp: timestamps[0]
            }
          ],
            "allDocs with include_revisions true should return all revisions");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });
}(jIO, RSVP, Blob, QUnit));