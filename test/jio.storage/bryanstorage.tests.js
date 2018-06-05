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

  /**
  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with RSVP all
  /////////////////////////////////////////////////////////////////
  module("bryanStorage _revision with RSVP all");
  test("verifying _revision updates correctly when puts are done in parallel",
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
      }),
        not_bryan = jIO.createJIO({
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "memory"
            }
          }
        });

      jio.put("bar", {"title": "foo0"});
      RSVP.all([
        jio.put("bar", {"title": "foo1"}),
        jio.put("bar", {"title": "foo2"}),
        jio.put("bar", {"title": "foo3"}),
        jio.put("bar", {"title": "foo4"})
      ])
        .push(function () {return jio.get("bar"); })
        .push(function (result) {
          deepEqual(result, {
            "title": "foo4"
          });
        })
        .push(function () {return not_bryan.allDocs({
          query: "_revision: 0"
        });
          })
        .push(function (results) {
          equal(results.data.rows.length,
            1,
            "Only one document with _revision = 0");
        })
        .fail(function (error) {ok(false, error); })
        .always(function () {start(); });
    });
  **/


  /////////////////////////////////////////////////////////////////
  // bryanStorage revision history
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.revision_history");
  test("put and get the correct version", function () {
    stop();
    expect(7);
    var dbname = "rev_hist_db0",
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
        type: "uuid",
        sub_storage: {
          type: "query",
          sub_storage: {
            //type: "memory"
            type: "indexeddb",
            database: dbname
          }
        }
      }),
      query_input =
        {
          query: 'NOT (_deprecated: "true")',
          sort_on: [['_revision', 'descending']]
        },
      query_input2 =
        {
          query: 'title: "rev1"',
          sort_on: [['_revision', 'descending']]
        };

    jio.put("doc1", {
      "title": "rev0",
      "subtitle": "subrev0"
    })
      .push(function () {
        return jio.put("doc1", {
          "title": "rev1",
          "subtitle": "subrev1"
        });
      })
      .push(function () {
        return jio.put("doc1", {
          "title": "rev2",
          "subtitle": "subrev2"
        });
      })
      .push(function () {
        return jio.put("doc1", {
          "title": "rev3",
          "subtitle": "subrev3"
        });
      })
      .push(function () {return jio.get("doc1"); })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev3",
          "subtitle": "subrev3"
        }, "Retrieve first edition of document correctly");
      })
      .push(function () {
        return not_bryan.allDocs(query_input);
      })
      .push(function (results) {
        equal(results.data.rows.length, 1, "Only 1 version isn't _deprecated");
        return jio.get(results.data.rows[0].id);
      })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev3",
          "subtitle": "subrev3"
        }, "Retrieve most recent edition by querying NOT _deprecated");
      })
      .push(function () {
        return not_bryan.allDocs(query_input2);
      })
      .push(function (results) {
        equal(results.data.rows.length, 1, "Only one version is titled 'rev1'");
        return jio.get(results.data.rows[0].id);
      })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev1",
          "subtitle": "subrev1",
          "_deprecated": "true",
          "_revision": 1,
          "_doc_id": "doc1"
        },
          "Retrieve 1st edit by querying for title: 'rev1' with other storage");
      })
      .push(function () {
        return jio.allDocs({query: ''});
      })
      .push(function (results) {
        equal(results.data.rows.length,
          1,
          "bryanstorage only sees latest version");
        return jio.get(results.data.rows[0].id);
      })

      .push(function (result) {
        deepEqual(result, {
          "title": "rev3",
          "subtitle": "subrev3"
        }, "Retrieve latest version correctly with bryanstorage");
      })
      .fail(function (error) {
        //console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  /////////////////////////////////////////////////////////////////
  // bryanStorage.revision_history_multiple_edits
  /////////////////////////////////////////////////////////////////


  module("bryanStorage.revision_history_multiple_edits");
  test("modify first version but save both", function () {
    stop();
    expect(11);
    var dbname = "testdb20",
      jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {
          type: "uuid",
          sub_storage: {
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
            type: "indexeddb",
            database: dbname
          }
        }
      });
    jio.put("main_doc", {
      "title": "rev0",
      "subtitle": "subrev0"
    })
      .push(function () {
        return jio.put("other_doc", {
          "attr": "version0",
          "subattr": "subversion0"
        });
      })
      .push(function () {
        return jio.put("other_doc", {
          "attr": "version1",
          "subattr": "subversion1"
        });
      })
      .push(function () {
        return jio.put("main_doc", {
          "title": "rev1",
          "subtitle": "subrev1"
        });
      })
      .push(function () {
        return jio.put("main_doc", {
          "title": "rev2",
          "subtitle": "subrev2"
        });
      })
      .push(function () {
        return jio.put("main_doc", {
          "title": "rev3",
          "subtitle": "subrev3"
        });
      })
      .push(function () {return jio.get("main_doc"); })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev3",
          "subtitle": "subrev3"
        }, "Retrieve main document correctly");
      })
      .push(function () {return jio.get("other_doc"); })
      .push(function (result) {
        deepEqual(result, {
          "attr": "version1",
          "subattr": "subversion1"
        }, "Retrieve other document correctly");
      })
      .push(function () {
        return jio.allDocs({
          query: ""
        });
      })
      .push(function (result) {
        equal(result.data.rows.length,
          2,
          "Empty query returns only non-deprecated docs");
      })
      .push(function () {
        return jio.allDocs({
          query: 'attr: "version1"'
        });
      })
      .push(function (result) {
        equal(result.data.rows.length,
          1,
          "No deprecated results are returned.");
        if (result.data.rows.length > 0) {
          return jio.get(result.data.rows[0].id);
        }
      })
      .push(function (result) {
        deepEqual(result, {
          "attr": "version1",
          "subattr": "subversion1"
        }, "Only get most recent edit");
      })
      .push(function () {
        return jio.allDocs({
          query: '(_doc_id: "other_doc")'
        });
      })
      .push(function (result) {
        equal(result.data.rows.length, 0, "Correct number of results returned");
      })
      .push(function () {
        return jio.allDocs({
          query: '(_revision: 0)'
        });
      })
      .push(function (result) {
        equal(result.data.rows.length, 0, "Correct number of results returned");
      })
      .push(function () {
        return jio.allDocs({
          query: ''
        });
      })
      .push(function (result) {
        equal(result.data.rows.length, 2, "Correct number of results returned");
      })

      // When not_bryan queries the storage, all documents are returned.
      .push(function () {
        var options = {
          query: "_doc_id: main_doc",
          sort_on: [["_revision", "ascending"]]
        };
        return not_bryan.allDocs(options);
      })
      .push(function (results) {
        equal(results.data.rows.length,
          3,
          "should get all 3 deprecated versions.");
        return not_bryan.get(results.data.rows[0].id);
      })
      .push(function (results) {
        deepEqual(results, {
          "title": "rev0",
          "subtitle": "subrev0",
          "_doc_id": "main_doc",
          "_revision": 0,
          "_deprecated": "true"
        },
          "Get the earliest copy of the doc with all metadata.");
      })

      // When not_bryan queries the storage, all documents are returned.
      .push(function () {
        var options = {
          query: "_doc_id: main_doc",
          sort_on: [["_revision", "ascending"]]
        };
        return not_bryan.allDocs(options);
      })
      .push(function (results) {
        return not_bryan.get(results.data.rows[1].id);
      })
      .push(function (results) {
        deepEqual(results, {
          "title": "rev1",
          "subtitle": "subrev1",
          "_doc_id": "main_doc",
          "_revision": 1,
          "_deprecated": "true"
        },
          "Get the earliest copy of the doc with all metadata.");
      })
      .fail(function (error) {
        //console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit));