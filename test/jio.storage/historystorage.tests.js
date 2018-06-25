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
      expect(9);
      var jio = this.jio,
        timestamps = this.jio.__storage._timestamps,
        blob2 = this.blob2,
        blob1 = this.blob1,
        other_blob = this.other_blob,
        otherother_blob = new Blob(['abcabc']);

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
          return jio.putAttachment(
            "doc",
            "otherother_attacheddata",
            otherother_blob
          );
        })
        .push(function () {
          return jio.removeAttachment("doc", "otherother_attacheddata");
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
          return jio.getAttachment(
            timestamps.doc.attacheddata[1],
            "attacheddata"
          );
        })
        .push(function (result) {
          deepEqual(result,
            blob2,
            "Return the attachment information with getAttachment for " +
              "current revision"
            );
          return jio.getAttachment(
            timestamps.doc.attacheddata[0],
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
          return jio.getAttachment(timestamps.doc[0], "attached");
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

  test("Correctness of allAttachments method",
    function () {
      stop();
      expect(11);
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
          return jio.removeAttachment("doc", "attacheddata");
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
          return jio.putAttachment("doc", "attacheddata", blob3);
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
          equal(results.length, 7, "Seven document revisions in storage (17)");
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

  test("Handling bad input",
    function () {
      stop();
      expect(6);
      var jio = this.jio,
        BADINPUT_ERRCODE = 422;

      jio.put("doc", {
        "_timestamp": 3,
        "other_attr": "other_val"
      })
        .push(function () {
          ok(false, "This statement should not be reached");
        }, function (error) {
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            BADINPUT_ERRCODE,
            "Can't save a document with a reserved keyword"
            );
        })
        .push(function () {
          return jio.put("doc", {
            "_doc_id": 3,
            "other_attr": "other_val"
          });
        })
        .push(function () {
          ok(false, "This statement should not be reached");
        }, function (error) {
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            BADINPUT_ERRCODE,
            "Can't save a document with a reserved keyword"
            );
        })
        .push(function () {
          return jio.put("1234567891123-ab7d", {});
        })
        .push(function () {
          ok(false, "This statement should not be reached");
        }, function (error) {
          ok(error instanceof jIO.util.jIOError, "Correct type of error");
          deepEqual(error.status_code,
            BADINPUT_ERRCODE,
            "Can't save a document with a timestamp-formatted id"
            );
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  test("Creating a document with put and retrieving it with get",
    function () {
      stop();
      expect(4);
      var jio = this.jio,
        not_history = this.not_history,
        timestamps = jio.__storage._timestamps;
      jio.put("doc", {title: "version0"})
        .push(function () {
          ok(timestamps.hasOwnProperty("doc"),
            "jio._timestamps is updated with new document.");
          equal(timestamps.doc.length,
            1,
            "One revision is logged in jio._timestamps"
            );
          return jio.get(timestamps.doc[0]);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "version0"
          }, "Get document from history storage");
          return not_history.get(
            timestamps.doc[0]
          );
        })
        .push(function (result) {
          deepEqual(result, {
            timestamp: timestamps.doc[0],
            op: "put",
            doc_id: "doc",
            doc: {
              title: "version0"
            }
          }, "Get document from non-history storage");
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
        timestamps = this.jio.__storage._timestamps;

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
          return jio.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t3",
            subtitle: "s3"
          }, "Get returns latest revision");
          return jio.get(timestamps.doc[0]);
        }, function (err) {
          ok(false, err);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t0",
            subtitle: "s0"
          }, "Get returns first version");
          return jio.get(timestamps.doc[1]);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t1",
            subtitle: "s1"
          }, "Get returns second version");
          return jio.get(timestamps.doc[2]);
        }, function (err) {
          ok(false, err);
        })
        .push(function (result) {
          deepEqual(result, {
            title: "t2",
            subtitle: "s2"
          }, "Get returns third version");
          return jio.get(timestamps.doc[3]);
        }, function (err) {
          ok(false, err);
        })
        .push(function () {
          ok(false, "This should have thrown a 404 error");
          return jio.get(timestamps.doc[4]);
        },
          function (error) {
            ok(error instanceof jIO.util.jIOError, "Correct type of error");
            deepEqual(error.status_code,
              404,
              "Error if you try to go back more revisions than what exists");
            return jio.get(timestamps.doc[4]);
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
        not_history = this.not_history;
      jio.put("doc", {title: "version0"})
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
          equal(results.data.rows.length,
            1,
            "Exactly one result returned");
          deepEqual(results.data.rows[0], {
            doc: {},
            value: {},
            id: "doc"
          },
            "Correct document format is returned."
            );
          return not_history.allDocs();
        })
        .push(function (results) {
          equal(results.data.rows.length,
            1,
            "Exactly one result returned");
          return not_history.get(results.data.rows[0].id);
        })
        .push(function (result) {
          deepEqual(result, {
            timestamp: jio.__storage._timestamps.doc[0],
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


  test("Putting a document, revising it, and retrieving revisions with allDocs",
    function () {
      stop();
      expect(14);
      var jio = this.jio,
        not_history = this.not_history,
        timestamps = this.jio.__storage._timestamps;
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
          equal(results.data.rows.length,
            1,
            "Exactly one result returned");
          deepEqual(results.data.rows[0], {
            value: {
              title: "version2",
              subtitle: "subvers2"
            },
            doc: {},
            id: "doc"
          },
            "Correct document format is returned."
            );
        })
        .push(function () {
          return RSVP.all([
            jio.allDocs({
              query: "_timestamp: " + timestamps.doc[1],
              select_list: ["title", "subtitle"]
            }),
            jio.allDocs({
              query: "_timestamp: =" + timestamps.doc[1],
              select_list: ["title", "subtitle"]
            }),
            jio.allDocs({
              query: "_timestamp: >" + timestamps.doc[0] +
                " AND title: version1",
              select_list: ["title", "subtitle"]
            }),
            jio.allDocs({
              query: "_timestamp: > " + timestamps.doc[0] +
                " AND _timestamp: < " + timestamps.doc[2],
              select_list: ["title", "subtitle"]
            })
          ]);
        })
        .push(function (results) {
          equal(results[0].data.rows.length,
            1,
            "Querying a specific timestamp retrieves one document");
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
          deepEqual(results.data.rows[0], {
            id: "doc",
            value: {
              title: "version1",
              subtitle: "subvers1"
            },
            doc: {}
          });
          return jio.allDocs({
            query: "_timestamp: " + timestamps.doc[0],
            select_list: ["title", "subtitle"]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              value: {
                title: "version0",
                subtitle: "subvers0"
              },
              doc: {},
              id: "doc"
            }
          ], "Query requesting one timestamp works.");

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
              timestamp: timestamps.doc[0],
              op: "put",
              doc_id: "doc",
              doc: {
                title: "version0",
                subtitle: "subvers0"
              }
            },
            {
              timestamp: timestamps.doc[1],
              op: "put",
              doc_id: "doc",
              doc: {
                title: "version1",
                subtitle: "subvers1"
              }
            },
            {
              timestamp: timestamps.doc[2],
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
      expect(5);
      var history = this.jio,
        timestamps = this.jio.__storage._timestamps;

      history.put("doc_a", {
        title_a: "rev0",
        subtitle_a: "subrev0"
      })
        .push(function () {
          return history.put("doc_a", {
            title_a: "rev1",
            subtitle_a: "subrev1"
          });
        })
        .push(function () {
          return history.put("doc_b", {
            title_b: "rev0",
            subtitle_b: "subrev0"
          });
        })
        .push(function () {
          return history.remove("doc_b");
        })
        .push(function () {
          return history.put("doc_c", {
            title_c: "rev0",
            subtitle_c: "subrev0"
          });
        })
        .push(function () {
          return history.put("doc_c", {
            title_c: "rev1",
            subtitle_c: "subrev1"
          });
        })
        .push(function () {
          return history.allDocs({sort_on: [["timestamp", "descending"]]});
        })
        .push(function (results) {
          equal(results.data.rows.length,
            2,
            "Only two non-removed unique documents exist."
            );
          deepEqual(results.data.rows, [
            {
              id: "doc_c",
              value: {},
              doc: {}
            },
            {
              id: "doc_a",
              value: {},
              doc: {}
            }
          ],
            "Empty query returns latest revisions (and no removed documents)");
          equal(timestamps.doc_a.length,
            2,
            "Correct number of revisions logged in doc_a");
          equal(timestamps.doc_b.length,
            2,
            "Correct number of revisions logged in doc_b");
          equal(timestamps.doc_c.length,
            2,
            "Correct number of revisions logged in doc_c");
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
      var history = this.jio,
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
      history.put("doc", {})
        .push(function () {
          return putFullDoc(history, "doc", docs[0], "data", blobs[0]);
        })
        .push(function () {
          return putFullDoc(history, "second_doc", docs[1], "data", blobs[1]);
        })
        .push(function () {
          return putFullDoc(history, "third_doc", docs[2], "data", blobs[2]);
        })
        .push(function () {
          return history.allDocs({
            query: "(date: <= 2)",
            select_list: ["date", "non-existent-key"],
            sort_on: [["date", "ascending"],
              ["non-existent-key", "ascending"]
              ]
          });
        })
        .push(function (results) {
          equal(results.data.rows.length, 3);
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {date: 1}
            },
            {
              doc: {},
              id: "third_doc",
              value: {date: 2}
            },
            {
              doc: {},
              id: "second_doc",
              value: {date: 2}
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
        not_history = this.not_history,
        timestamps = this.jio.__storage._timestamps,
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
      jio.put("doc", {})
        .push(function () {
          return putFullDoc(jio, "doc", docs[0], "data", blobs[0]);
        })
        .push(function () {
          return putFullDoc(jio, "second_doc", docs[1], "data", blobs[1]);
        })
        .push(function () {
          docs[0].date = 4;
          docs[0].type = "foo2";
          docs[1].date = 4;
          docs[1].type = "bar2";
        })
        .push(function () {
          return putFullDoc(jio, "doc", docs[0], "data", blobs[2]);
        })
        .push(function () {
          return jio.remove("second_doc");
        })
        .push(function () {
          return putFullDoc(jio, "second_doc", docs[1], "data", blobs[3]);
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
              id: timestamps.second_doc.data[1],
              value: {
                "op": "putAttachment",
                "doc_id": "second_doc",
                "timestamp": timestamps.second_doc.data[1]
              }
            },
            {
              doc: {},
              id: timestamps.second_doc[2],
              value: {
                "op": "put",
                "doc_id": "second_doc",
                "timestamp": timestamps.second_doc[2]
              }
            },
            {
              doc: {},
              id: timestamps.second_doc[1],
              value: {
                "op": "remove",
                "doc_id": "second_doc",
                "timestamp": timestamps.second_doc[1]
              }
            },
            {
              doc: {},
              id: timestamps.doc.data[1],
              value: {
                "op": "putAttachment",
                "doc_id": "doc",
                "timestamp": timestamps.doc.data[1]
              }
            },
            {
              doc: {},
              id: timestamps.doc[2],
              value: {
                "op": "put",
                "doc_id": "doc",
                "timestamp": timestamps.doc[2]
              }
            },
            {
              doc: {},
              id: timestamps.second_doc.data[0],
              value: {
                "op": "putAttachment",
                "doc_id": "second_doc",
                "timestamp": timestamps.second_doc.data[0]
              }
            },
            {
              doc: {},
              id: timestamps.second_doc[0],
              value: {
                "op": "put",
                "doc_id": "second_doc",
                "timestamp": timestamps.second_doc[0]
              }
            },
            {
              doc: {},
              id: timestamps.doc.data[0],
              value: {
                "op": "putAttachment",
                "doc_id": "doc",
                "timestamp": timestamps.doc.data[0]
              }
            },
            {
              doc: {},
              id: timestamps.doc[1],
              value: {
                "op": "put",
                "doc_id": "doc",
                "timestamp": timestamps.doc[1]
              }
            },
            {
              doc: {},
              id: timestamps.doc[0],
              value: {
                "op": "put",
                "doc_id": "doc",
                "timestamp": timestamps.doc[0]
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
          return jio.allDocs({
            query: "(_timestamp: >= " + timestamps.second_doc[0] +
              " OR _timestamp: <= " + timestamps.doc[1] +
              ") AND NOT (date: = 2)",
            select_list: ["date", "non-existent-key", "type", "title"],
            sort_on: [["date", "descending"],
              ["non-existent-key", "ascending"],
              ["_timestamp", "ascending"]
              ]
          });
        })
        .push(function (results) {
          deepEqual(results.data.rows, [
            {
              doc: {},
              id: "doc",
              value: {
                date: 4,
                title: "doc",
                type: "foo2"
              }
            },
            {
              doc: {},
              id: "second_doc",
              value: {
                date: 4,
                title: "second_doc",
                type: "bar2"
              }
            },
            {
              doc: {},
              id: "doc",
              value: {
                date: 1,
                title: "doc",
                type: "foo"
              }
            },
            {
              doc: {},
              id: "doc",
              value: {}
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
}(jIO, RSVP, Blob, QUnit));