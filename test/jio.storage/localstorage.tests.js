/*jslint maxlen: 120, nomen: true */
/*global localStorage, test_util, console, Blob*/
(function (jIO, localStorage, QUnit) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  module("localStorage", {
    setup: function () {
      localStorage.clear();
      this.jio = jIO.createJIO({
        "type": "local"
      });
    }
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.get
  /////////////////////////////////////////////////////////////////
  test("get inexistent document", function () {
    stop();
    expect(3);

    this.jio.get({"_id": "inexistent"})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        console.error(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document", function () {
    var id = "post1";
    localStorage[id] = JSON.stringify({
      title: "myPost1"
    });
    stop();
    expect(1);

    this.jio.get({"_id": id})
      .then(function (result) {
        deepEqual(result, {
          "title": "myPost1"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function () {
    var id = "putattmt1";
    stop();
    expect(1);

    localStorage[id] = JSON.stringify({
      "_id": id,
      "_attachments": {
        "putattmt2": {
          content_type: "",
          digest: "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
            "7ae41e4649b934ca495991b7852b855",
          length: 0
        }
      }
    });

    this.jio.get({"_id": id})
      .then(function (result) {
        deepEqual(result, {
          "_id": id,
          "_attachments": {
            "putattmt2": {
              content_type: "",
              digest: "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
                "7ae41e4649b934ca495991b7852b855",
              length: 0
            }
          }
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.post
  /////////////////////////////////////////////////////////////////
  test("post without id", function () {
    expect(1);
    stop();

    this.jio.post({})
      .then(function (uuid) {
//         ok(util.isUuid(uuid), "Uuid should look like " +
//            "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
        equal(localStorage[uuid], JSON.stringify({
          "_id": uuid
        }));
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("post non empty document", function () {
    expect(2);
    stop();

    this.jio.post({"_id": "post1", "title": "myPost1"})
      .then(function (uuid) {
        equal(uuid, "post1");
        equal(localStorage.post1, JSON.stringify({
          "_id": "post1",
          "title": "myPost1"
        }));
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("post but document already exists", function () {
    var id = "post1";
    localStorage[id] = JSON.stringify({
      "_id": id,
      title: "myPost1"
    });
    expect(4);
    stop();

    this.jio.post({"_id": "post1", "title": "myPost2"})
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot create a new document");
        equal(error.status_code, 409);

        equal(localStorage.post1, JSON.stringify({
          "_id": "post1",
          "title": "myPost1"
        }));
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.put
  /////////////////////////////////////////////////////////////////
  test("put non empty document", function () {
    expect(2);
    stop();

    this.jio.put({"_id": "put1", "title": "myPut1"})
      .then(function (uuid) {
        equal(uuid, "put1");
        equal(localStorage.put1, JSON.stringify({
          "_id": "put1",
          "title": "myPut1"
        }));
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put when document already exists", function () {
    var id = "put1";
    localStorage[id] = JSON.stringify({
      "_id": id,
      title: "myPut1"
    });
    expect(2);
    stop();

    this.jio.put({"_id": id, "title": "myPut2"})
      .then(function (uuid) {
        equal(uuid, "put1");
        equal(localStorage.put1, JSON.stringify({
          "_id": "put1",
          "title": "myPut2"
        }));
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  test("get attachment from inexistent document", function () {
    stop();
    expect(3);

    this.jio.getAttachment({
      "_id": "inexistent",
      "_attachment": "a"
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent attachment from document", function () {
    var id = "b";
    stop();
    expect(3);

    localStorage[id] = JSON.stringify({
      "_id": id
    });

    this.jio.getAttachment({
      "_id": id,
      "_attachment": "inexistent"
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get attachment from document", function () {
    var id = "putattmt1",
      attachment = "putattmt2";
    stop();
    expect(4);

    localStorage[id] = JSON.stringify({
      "_id": id,
      "_attachments": {
        "putattmt2": {
          content_type: "",
          digest: "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
            "7ae41e4649b934ca495991b7852b855",
          length: 0
        }
      }
    });
    localStorage[id + '/' + attachment] = JSON.stringify("");

    this.jio.getAttachment({
      "_id": id,
      "_attachment": attachment
    })
      .then(function (result) {
        ok(result.data instanceof Blob, "Data is Blob");
        deepEqual(result.data.type, "", "Check mimetype");
        deepEqual(result.data.size, 0, "Check size");

        delete result.data;
        deepEqual(result, {
          "digest": "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
            "7ae41e4649b934ca495991b7852b855"
        }, "Get Attachment, Check Response");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  /////////////////////////////////////////////////////////////////
  // localStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  test("put an attachment to an inexistent document", function () {
    stop();
    expect(3);

    this.jio.putAttachment({
      "_id": "inexistent",
      "_attachment": "putattmt2",
      "_data": ""
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put an attachment to a document", function () {
    var id = "putattmt1";
    localStorage[id] = JSON.stringify({
      "_id": id,
      "title": "myPutAttmt1"
    });

    stop();
    expect(3);

    this.jio.putAttachment({
      "_id": id,
      "_attachment": "putattmt2",
      "_data": ""
    })
      .then(function (result) {
        deepEqual(result, {"digest": "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
             "7ae41e4649b934ca495991b7852b855"
          });
        equal(localStorage[id], JSON.stringify({
          "_id": id,
          "title": "myPutAttmt1",
          "_attachments": {
            "putattmt2": {
              content_type: "",
              digest: "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
                "7ae41e4649b934ca495991b7852b855",
              length: 0
            }
          }
        }));
        equal(localStorage[id + '/putattmt2'], JSON.stringify(""));
      })
      .fail(function (error) {
        ok(false, error);
      })

      .always(function () {
        start();
      });
  });

//   test("Remove & RemoveAttachment", function () {
//     expect(4);
//     var jio = jIO.createJIO({
//       "type": "local",
//       "username": "uremove",
//       "application_name": "aremove"
//     }, {
//       "workspace": {}
//     });
// 
//     stop();
// 
//     jio.put({"_id": "a"}).then(function () {
// 
//       return jio.putAttachment({"_id": "a", "_attachment": "b", "_data": "c"});
// 
//     }).then(function () {
// 
//       return jio.removeAttachment({"_id": "a", "_attachment": "b"});
// 
//     }).always(function (answer) {
// 
//       deepEqual(answer, {
//         "attachment": "b",
//         "id": "a",
//         "method": "removeAttachment",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Remove existent attachment");
// 
//     }).then(function () {
// 
//       // Promise.all always return success
//       return RSPV.all([jio.removeAttachment({
//         "_id": "a",
//         "_attachment": "b"
//       })]);
// 
//     }).always(function (answers) {
// 
//       deepEqual(answers[0], {
//         "attachment": "b",
//         "error": "not_found",
//         "id": "a",
//         "message": "Attachment not found",
//         "method": "removeAttachment",
//         "reason": "missing attachment",
//         "result": "error",
//         "status": 404,
//         "statusText": "Not Found"
//       }, "Remove removed attachment");
// 
//     }).then(function () {
// 
//       return jio.remove({"_id": "a"});
// 
//     }).always(function (answer) {
// 
//       deepEqual(answer, {
//         "id": "a",
//         "method": "remove",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Remove existent document");
// 
//     }).then(function () {
// 
//       return jio.remove({"_id": "a"});
// 
//     }).always(function (answer) {
// 
//       deepEqual(answer, {
//         "error": "not_found",
//         "id": "a",
//         "message": "Document not found",
//         "method": "remove",
//         "reason": "missing",
//         "result": "error",
//         "status": 404,
//         "statusText": "Not Found"
//       }, "Remove removed document");
// 
//     }).always(start);
// 
//   });
// 
//   test("AllDocs", function () {
//     expect(3);
//     var o = {}, jio = jIO.createJIO({
//       "type": "local",
//       "username": "ualldocs",
//       "application_name": "aalldocs"
//     }, {
//       "workspace": {}
//     });
// 
//     stop();
// 
//     o.date_a = new Date(0);
//     o.date_b = new Date();
// 
//     // put some document before list them
//     RSVP.all([
//       jio.put({
//         "_id": "a",
//         "title": "one",
//         "date": o.date_a
//       }).then(function () {
//         return jio.putAttachment({
//           "_id": "a",
//           "_attachment": "aa",
//           "_data": "aaa"
//         });
//       }),
//       jio.put({"_id": "b", "title": "two", "date": o.date_a}),
//       jio.put({"_id": "c", "title": "one", "date": o.date_b}),
//       jio.put({"_id": "d", "title": "two", "date": o.date_b})
//     ]).then(function () {
// 
//       // get a list of documents
//       return jio.allDocs();
// 
//     }).always(function (answer) {
// 
//       // sort answer rows for comparison
//       if (answer.data && answer.data.rows) {
//         answer.data.rows.sort(function (a, b) {
//           return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
//         });
//       }
// 
//       deepEqual(answer, {
//         "data": {
//           "rows": [{
//             "id": "a",
//             "key": "a",
//             "value": {}
//           }, {
//             "id": "b",
//             "key": "b",
//             "value": {}
//           }, {
//             "id": "c",
//             "key": "c",
//             "value": {}
//           }, {
//             "id": "d",
//             "key": "d",
//             "value": {}
//           }],
//           "total_rows": 4
//         },
//         "method": "allDocs",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "AllDocs");
// 
//     }).then(function () {
// 
//       // get a list of documents
//       return jio.allDocs({
//         "include_docs": true,
//         "sort_on": [['title', 'ascending'], ['date', 'descending']],
//         "select_list": ['title', 'date'],
//         "limit": [1] // ==> equal [1, 3] in this case
//       });
// 
//     }).always(function (answer) {
// 
//       deepEqual(answer, {
//         "data": {
//           "rows": [{
//             "doc": {
//               "_attachments": {
//                 "aa": {
//                   "content_type": "",
//                   "digest": "sha256-9834876dcfb05cb167a5c24953eba58c4" +
//                     "ac89b1adf57f28f2f9d09af107ee8f0",
//                   "length": 3
//                 }
//               },
//               "_id": "a",
//               "date": o.date_a.toJSON(),
//               "title": "one"
//             },
//             "id": "a",
//             "key": "a",
//             "value": {
//               "date": o.date_a.toJSON(),
//               "title": "one"
//             }
//           }, {
//             "doc": {
//               "_id": "d",
//               "date": o.date_b.toJSON(),
//               "title": "two"
//             },
//             "id": "d",
//             "key": "d",
//             "value": {
//               "date": o.date_b.toJSON(),
//               "title": "two"
//             }
//           }, {
//             "doc": {
//               "_id": "b",
//               "date": o.date_a.toJSON(),
//               "title": "two"
//             },
//             "id": "b",
//             "key": "b",
//             "value": {
//               "date": o.date_a.toJSON(),
//               "title": "two"
//             }
//           }],
//           "total_rows": 3
//         },
//         "method": "allDocs",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "AllDocs include docs + sort on + limit + select_list");
// 
//     }).then(function () {
// 
//       // use a query
//       return jio.allDocs({
//         "query": "title: \"two\"",
//         "sort_on": [["date", "descending"]]
//       });
// 
//     }).always(function (answer) {
// 
//       deepEqual(answer, {
//         "data": {
//           "rows": [{
//             "id": "d",
//             "key": "d",
//             "value": {}
//           }, {
//             "id": "b",
//             "key": "b",
//             "value": {}
//           }],
//           "total_rows": 2
//         },
//         "method": "allDocs",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "AllDocs sort on + query");
// 
//     }).always(start);
// 
//   });
// 
//   test("Check & Repair", function () {
//     expect(18);
//     var o = {}, jio = jIO.createJIO({
//       "type": "local",
//       "username": "urepair",
//       "application_name": "arepair"
//     }, {
//       "workspace": {}
//     });
// 
//     stop();
// 
//     o.putCorruptedDocuments = function () {
//       // put a document with a wrong attachment reference
//       util.json_localStorage.setItem(
//         "jio/localstorage/urepair/arepair/war",
//         {"_id": "war", "title": "b", "_attachments": {"aa": {}}}
//       );
// 
//       // put a document with a wrong metadata
//       util.json_localStorage.setItem(
//         "jio/localstorage/urepair/arepair/meta",
//         {"_id": "meta", "title": ["b", ["c", {}], {"blue": "blue"}]}
//       );
// 
//       // put a corrupted document
//       util.json_localStorage.setItem(
//         "jio/localstorage/urepair/arepair/cor",
//         "blue"
//       );
//     };
// 
//     // put an unreferenced attachment
//     util.json_localStorage.setItem(
//       "jio/localstorage/urepair/arepair/unref/aa",
//       "attachment content"
//     );
//     o.putCorruptedDocuments();
// 
//     RSVP.all([
//       jio.check({"_id": "war"}),
//       jio.check({"_id": "meta"}),
//       jio.check({"_id": "cor"}),
//       jio.check({"_id": "inexistent"})
//     ]).always(function (answers) {
// 
//       deepEqual(answers[0], {
//         "error": "conflict",
//         "id": "war",
//         "message": "Attachment \"aa\" of \"war\" is missing",
//         "method": "check",
//         "reason": "missing attachment",
//         "result": "error",
//         "status": 409,
//         "statusText": "Conflict"
//       }, "Check a document with one missing attachment");
// 
//       deepEqual(answers[1], {
//         "error": "conflict",
//         "id": "meta",
//         "message": "Some metadata might be lost",
//         "method": "check",
//         "reason": "corrupted",
//         "result": "error",
//         "status": 409,
//         "statusText": "Conflict"
//       }, "Check document with wrong metadata");
// 
//       deepEqual(answers[2], {
//         "error": "conflict",
//         "id": "cor",
//         "message": "Document is unrecoverable",
//         "method": "check",
//         "reason": "corrupted",
//         "result": "error",
//         "status": 409,
//         "statusText": "Conflict"
//       }, "Check corrupted document");
// 
//       deepEqual(answers[3], {
//         "id": "inexistent",
//         "method": "check",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Check inexistent document");
// 
//     }).then(function () {
// 
//       return RSVP.all([
//         jio.repair({"_id": "war"}),
//         jio.repair({"_id": "meta"}),
//         jio.repair({"_id": "cor"}),
//         jio.repair({"_id": "inexistent"})
//       ]);
// 
//     }).always(function (answers) {
// 
//       deepEqual(answers[0], {
//         "id": "war",
//         "method": "repair",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Repair a document with one missing attachment");
// 
//       deepEqual(answers[1], {
//         "id": "meta",
//         "method": "repair",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Repair document with wrong metadata");
// 
//       deepEqual(answers[2], {
//         "id": "cor",
//         "method": "repair",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Repair corrupted document");
// 
//       deepEqual(answers[3], {
//         "id": "inexistent",
//         "method": "repair",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Repair inexistent document");
// 
//     }).then(function () {
// 
//       o.getCorruptedDocuments = function () {
//         return RSVP.all([
//           jio.get({"_id": "war"}),
//           jio.get({"_id": "meta"}),
//           jio.get({"_id": "cor"}),
//           jio.get({"_id": "inexistent"})
//         ]);
//       };
// 
//       return o.getCorruptedDocuments();
// 
//     }).always(function (answers) {
// 
//       o.testGetAnswers = function (answers) {
// 
//         deepEqual(answers[0], {
//           "data": {
//             "_id": "war",
//             "title": "b"
//           },
//           "id": "war",
//           "method": "get",
//           "result": "success",
//           "status": 200,
//           "statusText": "Ok"
//         }, "Get repaired document with one missing attachment");
// 
//         deepEqual(answers[1], {
//           "data": {
//             "_id": "meta",
//             "title": "b"
//           },
//           "id": "meta",
//           "method": "get",
//           "result": "success",
//           "status": 200,
//           "statusText": "Ok"
//         }, "Get repaired document with wrong metadata");
// 
//         deepEqual(answers[2], {
//           "error": "not_found",
//           "id": "cor",
//           "message": "Cannot find document",
//           "method": "get",
//           "reason": "missing",
//           "result": "error",
//           "status": 404,
//           "statusText": "Not Found"
//         }, "Get repaired corrupted document");
// 
//         deepEqual(answers[3], {
//           "error": "not_found",
//           "id": "inexistent",
//           "message": "Cannot find document",
//           "method": "get",
//           "reason": "missing",
//           "result": "error",
//           "status": 404,
//           "statusText": "Not Found"
//         }, "Get repaired inexistent document");
// 
//       };
// 
//       o.testGetAnswers(answers);
// 
//     }).then(function () {
// 
//       o.putCorruptedDocuments();
// 
//       return jio.repair({});
// 
//     }).always(function (answer) {
// 
//       deepEqual(answer, {
//         "method": "repair",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Repair all the database");
// 
//     }).then(function () {
// 
//       return o.getCorruptedDocuments();
// 
//     }).always(function (answers) {
// 
//       o.testGetAnswers(answers);
// 
//     }).then(function () {
// 
//       // unreferenced attachment must be removed
//       deepEqual(util.json_localStorage.getItem(
//         "jio/localstorage/urepair/arepair/unref/aa"
//       ), null, "Unreferenced attachment removed");
// 
//     }).always(start);
// 
//   });

}(jIO, localStorage, QUnit));
