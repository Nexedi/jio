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
            op: "put",
            lastseen: undefined,
            leaf: true
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
            op: "remove",
            lastseen: result.lastseen,
            leaf: true
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
      expect(8);

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
        "k0": "v0"
      })
        .push(function () {
          return jio.put("doc", {"k1": "v1"});
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
          return jio.get("doc", {steps: 0});
        })
        .push(function (result) {
          deepEqual(result,
            {"k4": "v4"},
            ".get returns latest revision with second input = 0");
          return jio.get("doc", {steps: 1});
        })
        .push(function (result) {
          deepEqual(result,
            {"k3": "v3"},
            "Walk back one revision with second input = 1");
          return jio.get("doc", {steps: 2});
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "Current state of document is 'removed'.");
            return jio.get("doc", {steps: 3});
          })
        .push(function (result) {
          deepEqual(result,
            {"k2": "v2"},
            "Walk back three revisions with second input = 3");
          return jio.get("doc", {steps: 4});
        })
        .push(function (result) {
          deepEqual(result,
            {"k1": "v1"},
            "Walk back four revisions with second input = 4");
          return jio.get("doc", {steps: 5});
        })
        .push(function (result) {
          deepEqual(result,
            {"k0": "v0"},
            "Walk back five revisions with second input = 5");
          return jio.get("doc", {steps: 6});
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only 5 previous states of this document");
          })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

  /////////////////////////////////////////////////////////////////
  // Accessing older revisions with multiple users
  /////////////////////////////////////////////////////////////////

  module("bryanStorage.accessing_older_revisions_multiple_users");
  test("Testing retrieval of older revisions of documents with multiple users",
    function () {
      stop();
      expect(51);

      // create storage of type "bryan" with memory as substorage
      var dbname = "multi_user_db" + Date.now(),
        jio1 = jIO.createJIO({
          type: "bryan",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "indexeddb",
              database: dbname
            }
          }
        }),
        jio2 = jIO.createJIO({
          type: "bryan",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "indexeddb",
              database: dbname
            }
          }
        }),
        jio3 = jIO.createJIO({
          type: "bryan",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "indexeddb",
              database: dbname
            }
          }
        });

      jio1.put("doc", {
        "k": "v0.1"
      })
        .push(function () {
          return jio2.get("doc");
        })
        .push(function () {
          return jio3.get("doc");
        })
        .push(function () {
          return jio2.put("doc", {
            "k": "v0.1.2"
          });
        })
        .push(function () {
          return jio3.put("doc", {
            "k": "v0.1.3"
          });
        })
        /**
        .push(function () {
          return jio2.put("doc", {
            "k": "v0.1.2.2"
          });
        })
        **/
        .push(function () {
          return jio2.remove("doc");
        })
        .push(function () {
          return jio3.put("doc", {
            "k": "v0.1.3.3"
          });
        })
        .push(function () {
          return jio1.get("doc");
        })
        .push(function () {
          return jio1.put("doc", {
            "k": "v0.1.3.3.1"
          });
        })
        .push(function () {
          return jio2.put("doc", {
            "k": "v0.1.2.2.2"
          });
        })
        .push(function () {
          return jio3.put("doc", {
            "k": "v0.1.3.3.3"
          });
        })
        .push(function () {
          return jio1.get("doc");
        })
        // jio2 has a different version than 1 & 3 as its latest revision
        /**
        .push(function () {
          return jio2.get("doc");
        })
        **/
        .push(function () {
          return jio3.get("doc");
        })

        // Test all lastseens are the same
        .push(function () {
          // These are all undefined outside the storage definition, so these
          // tests are meaningless
          //equal(jio1._lastseen, jio2._lastseen, "All users see same version");
          //equal(jio1._lastseen, jio3._lastseen, "All users see same version");

          //
          // Test consistent history of user 1
          //
          return jio1.get("doc", {
            path: "consistent",
            steps: 0
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3"
          }, "Get of depth 0 returns latest version"
            );

          return jio1.get("doc", {
            path: "consistent",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3"
          }, "Get of consistent depth 1 returns correct version"
            );

          return jio1.get("doc", {
            path: "consistent",
            steps: 2
          });
        })

        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3"
          }, "Get of consistent depth 2 returns correct version"
            );

          return jio1.get("doc", {
            path: "consistent",
            steps: 3
          });
        })

        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1"
          }, "Get of consistent depth 3 returns correct version"
            );

          return jio1.get("doc", {
            path: "consistent",
            steps: 4
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only 3 previous states of this document: " + error);
          })
        .push(function () {

          //
          // Test consistent history of user 2 (Is the same as 1 & 3 even though
          // User 2 has not explicitly called .get since the latest changes
          // were made)
          //
          return jio2.get("doc", {
            path: "consistent",
            steps: 0
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3"
          }, "Get of depth 0 returns latest version"
            );

          return jio2.get("doc", {
            path: "consistent",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3"
          }, "Get of depth 0 returns latest version"
            );

          return jio2.get("doc", {
            path: "consistent",
            steps: 2
          });
        })

        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3"
          }, "Get of consistent depth 2 returns correct version"
            );

          return jio2.get("doc", {
            path: "consistent",
            steps: 3
          });
        })

        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1"
          }, "Get of consistent depth 3 returns correct version"
            );

          return jio2.get("doc", {
            path: "consistent",
            steps: 4
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only 3 previous states of this document: " + error);
          })
        .push(function () {

          //
          // Test consistent history of user 3 (Should be same as user 1)
          //
          return jio3.get("doc", {
            path: "consistent",
            steps: 0
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3"
          }, "User 2 consistent history is same as user 1"
            );
          return jio3.get("doc", {
            path: "consistent",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3"
          }, "User 2 consistent history is same as user 1"
            );
          return jio3.get("doc", {
            path: "consistent",
            steps: 2
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3"
          }, "User 2 consistent history is same as user 1"
            );
          return jio3.get("doc", {
            path: "consistent",
            steps: 3
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1"
          }, "User 2 consistent history is same as user 1"
            );
          return jio3.get("doc", {
            path: "consistent",
            steps: 4
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only 3 previous states of this document");
          })
        // Reset jio3._lastseen to be at v0.1.3.3.3
        .push(function () {
          return jio3.get("doc");
        })

        //
        // Test absolute history of user 1
        //
        .push(function () {
          return jio1.get("doc", {
            path: "absolute",
            steps: 0
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3"
          }, "Get of absolute depth 0 returns latest version"
            );
          return jio1.get("doc", {
            path: "absolute",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2.2.2"
          }, "Get of absolute depth 1 returns correct version"
            );
          return jio1.get("doc", {
            path: "absolute",
            steps: 2
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.1"
          }, "Get of absolute depth 2 returns correct version"
            );
          return jio1.get("doc", {
            path: "absolute",
            steps: 3
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3"
          }, "Get of absolute depth 3 returns correct version"
            );
          return jio1.get("doc", {
            path: "absolute",
            steps: 4
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "Document has been removed at this point");
            return jio1.get("doc", {
              path: "absolute",
              steps: 5
            });
          })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3"
          }, "Get of absolute depth 5 returns correct version"
            );
          return jio1.get("doc", {
            path: "absolute",
            steps: 6
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2"
          }, "Get of absolute depth 6 returns correct version"
            );
          return jio1.get("doc", {
            path: "absolute",
            steps: 7
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1"
          });
          return jio1.get("doc", {
            path: "absolute",
            steps: 8
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only 3 previous states of this document");
          })

        //
        // Test absolute history of user 2
        //
        .push(function () {
          return jio2.get("doc", {
            path: "absolute",
            steps: 0
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3"
          });
          return jio2.get("doc", {
            path: "absolute",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2.2.2"
          });
          return jio2.get("doc", {
            path: "absolute",
            steps: 2
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.1"
          });
          return jio2.get("doc", {
            path: "absolute",
            steps: 3
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3"
          });
          return jio2.get("doc", {
            path: "absolute",
            steps: 4
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "Document has been removed at this point");
            return jio2.get("doc", {
              path: "absolute",
              steps: 5
            });
          })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3"
          });
          return jio2.get("doc", {
            path: "absolute",
            steps: 6
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2"
          });
          return jio2.get("doc", {
            path: "absolute",
            steps: 7
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1"
          });
          return jio2.get("doc", {
            path: "absolute",
            steps: 8
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only 3 previous states of this document");
          })

        //
        // Tests on checking out an older revision and making a new edit branch
        //
        .push(function () {
          return jio1.get("doc", {
            path: "absolute",
            steps: 1
          });
        })
        .push(function () {
          return jio1.put("doc", {
            "k": "v0.1.2.2.2.1"
          });
        })
        .push(function () {
          return jio1.get("doc", {
            path: "consistent",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2.2.2"
          }, "The new document is added to the correct edit branch"
            );
          return jio1.get("doc", {
            path: "consistent",
            steps: 2
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "This document was removed at this time");
            return jio1.get("doc", {
              path: "consistent",
              steps: 3
            });
          })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2"
          }, "The new document is added to the correct edit branch"
            );
          return jio1.get("doc", {
            path: "consistent",
            steps: 4
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1"
          }, "This edit branch also leads back to the original version"
            );
          return jio1.get("doc", {
            path: "consistent",
            steps: 5
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are no revisions before the original document");
          })
        .push(function () {
          return jio3.put("doc", {
            "k": "v0.1.3.3.3.3"
          });
        })

        // All three users have the same latest revision
        .push(function () {
          return jio1.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3.3"
          }, "User one accesses latest revision correctly"
            );
          return jio2.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3.3"
          }, "User two accesses latest revision correctly"
            );
          return jio3.get("doc");
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3.3"
          }, "User three accesses latest revision correctly"
            );
          return jio2.get("doc", {
            path: "consistent",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3"
          }, "User 2 accesses the 1st edit in consistent traversal."
            );
        })

        //
        // Testing .getting on leaf nodes
        //
        .push(function () {
          return jio1.get("doc", {
            path: "leaves"
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3.3"
          }, "First result is the most-recently-added leaf"
            );
          return jio2.get("doc", {
            path: "leaves",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2.2.2.1"
          }, "Second result is the 2nd most-recently-added leaf"
            );
          return jio3.get("doc", {
            path: "leaves",
            steps: 2,
            db: "jio3"
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.1"
          }, "Third result is the 3rd most-recently-added leaf"
            );

        //
        // Editing document revisions stemming from the latest leaf nodes seen
        //
          return jio1.put("doc", {
            "k": "v0.1.3.3.3.3.1"
          });
        })
        .push(function () {
          return jio3.remove("doc"); // removing v0.1.3.3.1
        })

        // Check that jio1 sees latest non-removed revision
        .push(function () {
          return jio1.get("doc");
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "The most recent edit was a remove, so throw error");
          })
        .push(function () {
          // jio2 lastseen should point to "v0.1.2.2.2.1"
          return jio2.put("doc", {
            "k": "v0.1.2.2.2.1.2"
          });
        })
        .push(function () {
          return jio1.get("doc", {
            path: "leaves",
            steps: 0
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.2.2.2.1.2"
          }, "Accessing the first leaf node at this time"
            );
          return jio1.get("doc", {
            path: "leaves",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3.3.1"
          }, "Accessing the second leaf node at this time"
            );
          return jio1.get("doc", {
            path: "leaves",
            steps: 2
          });
        })
        .push(function () {
          ok(false, "This query should have thrown a 404 error");
        },
          function (error) {
            deepEqual(error.status_code,
              404,
              "There are only two non-removed leaves");

            // jio1 should still have lastseen at v0.1.3.3.3.3.1
            return jio1.put("doc", {
              "k": "v0.1.3.3.3.3.1.1"
            });
          })
        .push(function () {
          return jio1.get("doc", {
            path: "consistent",
            steps: 1
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3.3.1"
          }, "If a .get fails, that should not reset ._lastseen parameter"
            );
          return jio1.get("doc", {
            path: "consistent",
            steps: 2
          });
        })
        .push(function (result) {
          deepEqual(result, {
            "k": "v0.1.3.3.3.3"
          }, "History of 0.1.2.2.2 has been constructed correctly.");
        })
        .fail(function (error) {
          //console.log(error);
          ok(false, error);
        })
        .always(function () {start(); });
    });

}(jIO, QUnit));