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
      });

      jio.put("bar", {"title": "foo"});
      RSVP.all([
        jio.put("bar", {"title2": "foo2"}),
        jio.put("bar", {"title3": "foo3"})
        ]
      );
        //.push(function () {return jio.get("bar"); })
      jio.get("bar")
        .push(function (result) {equal(result._revision, 3, "parallel exec"); })
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
    expect(4);
    var dbname = "freshdb0",
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
      });

    jio.put("doc1", {
      "title": "rev0",
      "subtitle": "subrev0"
    })

      .push(function () {return jio.get("doc1"); })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev0",
          "subtitle": "subrev0"
        }, "Retrieve first edition of document correctly");
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
        return jio.get("doc1");
      })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev2",
          "subtitle": "subrev2"
        }, "Retrieve second edition of document correctly");
      })

      .push(function () {
        var options = {query: "title: rev0"};
        return jio.allDocs(options);
      })
      .push(function (results) {
        console.log("query results: ", results);
        equal(results.data.rows.length, 1, "Query only returns latest version");
        if (results.data.rows.length > 0) {
          return jio.get(results.data.rows[0].id);
        }
      })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev2",
          "subtitle": "subrev2"
        }, "Retrieve queried document correctly");
      })

      // When not_bryan queries the storage, all documents are returned.
      .push(function () {
        var options = {
          query: "",
          sort_on: [["_revision", "ascending"]]
        };
        return jio.allDocs(options);
      })
      .push(function (results) {
        equal(results.length, 2, "should get all 2 revisions.");
        if (results.length > 0) {
          return not_bryan.get(results[0].id);
        }
      })
      .push(function (results) {
        deepEqual(results, {
          "title": "rev0",
          "subtitle": "subrev0",
          "_doc_id": "doc1",
          "_revision": 0,
          "_deprecated": true
        },
          "Get the earliest copy of the doc with all metadata.");
      })

      .fail(function (error) {
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  module("bryanStorage.revision_history_multiple_edits");
  test("modify first version but save both", function () {
    stop();
    expect(7);
    var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "indexeddb",
            database: "testdb1"
          }
        }
      }),
      not_bryan = jIO.createJIO({
        type: "uuid",
        sub_storage: {
          type: "indexeddb",
          database: "testdb1"
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
        //console.log(result);
        equal(result.length, 2, "Empty query returns only non-deprecated docs");
      })
      .push(function () {
        return jio.allDocs({
          query: 'attr: "version1"'
        });
      })
      .push(function (result) {
        //console.log("res:", result);
        if (result.length > 0) {
          return jio.get(result[0].id);
        }
      })
      .push(function (result) {
        deepEqual(result, {
          "attr": "version1",
          "subattr": "subversion1"
        }, "Retrieve other document correctly");
      })
      .push(function () {
        return jio.allDocs({
          query: '(_doc_id: "other_doc")'
        });
      })
      .push(function (result) {
        equal(result.length, 0, "Correct number of results returned");
      })
      .push(function () {
        return jio.allDocs({
          query: '(_revision: 0)'
        });
      })
      .push(function (result) {
        equal(result.length, 0, "Correct number of results returned");
      })
      .push(function () {
        return jio.allDocs({
          query: ''
        });
      })
      .push(function (result) {
        equal(result.length, 2, "Correct number of results returned");
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
        equal(results.length, 3, "should get all 3 deprecated versions.");
        return not_bryan.get(results[0].id);
      })
      .push(function (results) {
        deepEqual(results, {
          "title": "rev0",
          "subtitle": "subrev0",
          "_doc_id": "main_doc",
          "_revision": 0,
          "_deprecated": true
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
        return not_bryan.get(results[1].id);
      })
      .push(function (results) {
        deepEqual(results, {
          "title": "rev1",
          "subtitle": "subrev1",
          "_doc_id": "main_doc",
          "_revision": 1,
          "_deprecated": true
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