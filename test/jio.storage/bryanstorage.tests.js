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
  // bryanStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("bryanStorage.constructor");
  test("accept parameters", function () {
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "memory");
  });


  /////////////////////////////////////////////////////////////////
  // _revision parameter updating with RSVP all
  /////////////////////////////////////////////////////////////////
  /**
  module("bryanStorage _revision with RSVP all");
  test("verifying _revision updates correctly when puts are done in parallel",
    function () {
      stop();
      expect(1);

      // create storage of type "bryan" with memory as substorage
      var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {type: "memory"}
      });

      jio.put("bar", {"title": "foo"});
      RSVP.all(
        jio.put("bar", {"title2": "foo2"}),
        jio.put("bar", {"title3": "foo3"})
      )
        .push(function () {return jio.get("bar"); })
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
    expect(1);
    var jio = jIO.createJIO({
        type: "bryan",
        sub_storage: {
          type: "memory"
          //database: "newdb4"
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
          "subtitle": "subrev0",
          "_revision": 0,
          "_doc_id": "doc1"
        }, "Retrieve document correctly");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  module("bryanStorage.revision_history_multiple_edits");
  test("modify first version but save both", function () {
    stop();
    expect(6);
    var jio = jIO.createJIO({
      type: "bryan",
      sub_storage: {
        type: "memory"
        //database: "otherdb8"
      }
    });
    jio.put("other_doc", {
      "attr": "version0",
      "subattr": "subversion0"
    })
      .push(function () {
        return jio.put("other_doc", {
          "attr": "version1",
          "subattr": "subversion1"
        });
      })
      .push(function () {
        return jio.put("main_doc", {
          "title": "rev0",
          "subtitle": "subrev0"
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
      .push(function () {return jio.get("main_doc"); })
      .push(function (result) {
        deepEqual(result, {
          "title": "rev2",
          "subtitle": "subrev2",
          "_revision": 2,
          "_doc_id": "main_doc"
        }, "Retrieve main document correctly");
      })
      .push(function () {return jio.get("other_doc"); })
      .push(function (result) {
        deepEqual(result, {
          "attr": "version1",
          "subattr": "subversion1",
          "_revision": 1,
          "_doc_id": "other_doc"
        }, "Retrieve other document correctly");
      })
      .push(function () {
        return jio.allDocs({
          query: '(_doc_id: "main_doc") AND (_revision: 0)',
          sort_on: [['_revision', 'descending']]
        });
      })
      .push(function (result) {
        equal(result.length, 1, "Correct number of results returned");
      })
      .push(function () {
        return jio.allDocs({
          query: '(_doc_id: "main_doc") AND (_revision: 1)'
        });
      })
      .push(function (result) {
        equal(result.length, 1, "Correct number of results returned");
      })
      .push(function () {
        return jio.allDocs({
          query: '(_doc_id: "other_doc") AND (_revision: 0)'
        });
      })
      .push(function (result) {
        equal(result.length, 1, "Correct number of results returned");
      })
      .push(function () {
        return jio.allDocs({
          query: ''
        });
      })
      .push(function (result) {
        equal(result.length, 5, "Correct number of results returned");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit));


