/*jslint indent: 2, maxlen: 80, nomen: true */
/*global window, define, module, test_util, RSVP, jIO, local_storage, test, ok,
  deepEqual, sinon, expect, stop, start, Blob */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(test_util, RSVP, jIO, local_storage);
}([
  'test_util',
  'rsvp',
  'jio',
  'localstorage',
  'qunit'
], function (util, RSVP, jIO, local_storage) {
  "use strict";

  module("LocalStorage");

  local_storage.clear();

  /**
   * all(promises): Promise
   *
   * Produces a promise that is resolved when all the given promises are
   * fulfilled. The resolved value is an array of each of the answers of the
   * given promises.
   *
   * @param  {Array} promises The promises to use
   * @return {Promise} A new promise
   */
  function all(promises) {
    var results = [], i, count = 0;
    function cancel() {
      var j;
      for (j = 0; j < promises.length; j += 1) {
        if (typeof promises[j].cancel === 'function') {
          promises[j].cancel();
        }
      }
    }
    return new RSVP.Promise(function (resolve, reject, notify) {
      /*jslint unparam: true */
      function succeed(j) {
        return function (answer) {
          results[j] = answer;
          count += 1;
          if (count !== promises.length) {
            return;
          }
          resolve(results);
        };
      }
      function notified(j) {
        return function (answer) {
          notify({
            "promise": promises[j],
            "index": j,
            "notified": answer
          });
        };
      }
      for (i = 0; i < promises.length; i += 1) {
        promises[i].then(succeed(i), succeed(i), notified(i));
      }
    }, cancel);
  }

  test("Post & Get", function () {
    expect(6);
    var jio = jIO.createJIO({
      "type": "local",
      "username": "upost",
      "application_name": "apost"
    }, {
      "workspace": {}
    });

    stop();

    all([

      // get inexistent document
      jio.get({"_id": "inexistent"}).always(function (answer) {

        deepEqual(answer, {
          "error": "not_found",
          "id": "inexistent",
          "message": "Cannot find document",
          "method": "get",
          "reason": "missing",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, "Get inexistent document");

      }),

      // post without id
      jio.post({}).always(function (answer) {

        var uuid = answer.id;
        delete answer.id;
        deepEqual(answer, {
          "method": "post",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        }, "Post without id");

        ok(util.isUuid(uuid), "Uuid should look like " +
           "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);

      }).then(function () {

        // post non empty document
        return jio.post({"_id": "post1", "title": "myPost1"});

      }).always(function (answer) {

        deepEqual(answer, {
          "id": "post1",
          "method": "post",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        }, "Post");

      }).then(function () {

        return jio.get({"_id": "post1"});

      }).always(function (answer) {

        deepEqual(answer, {
          "data": {
            "_id": "post1",
            "title": "myPost1"
          },
          "id": "post1",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, "Get, Check document");

      }).then(function () {

        // post but document already exists
        return jio.post({"_id": "post1", "title": "myPost2"});

      }).always(function (answer) {

        deepEqual(answer, {
          "error": "conflict",
          "id": "post1",
          "message": "Cannot create a new document",
          "method": "post",
          "reason": "document exists",
          "result": "error",
          "status": 409,
          "statusText": "Conflict"
        }, "Post but document already exists");

      })

    ]).always(start);

  });

  test("Put & Get", function () {
    expect(4);
    var jio = jIO.createJIO({
      "type": "local",
      "username": "uput",
      "application_name": "aput"
    }, {
      "workspace": {}
    });

    stop();

    // put non empty document
    jio.put({"_id": "put1", "title": "myPut1"}).always(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Creates a document");

    }).then(function () {

      return jio.get({"_id": "put1"});

    }).always(function (answer) {

      deepEqual(answer, {
        "data": {
          "_id": "put1",
          "title": "myPut1"
        },
        "id": "put1",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get, Check document");

    }).then(function () {

      // put but document already exists
      return jio.put({"_id": "put1", "title": "myPut2"});

    }).always(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Update the document");

    }).then(function () {

      return jio.get({"_id": "put1"});

    }).always(function (answer) {

      deepEqual(answer, {
        "data": {
          "_id": "put1",
          "title": "myPut2"
        },
        "id": "put1",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get, Check document");

    }).always(start);

  });

  test("PutAttachment & Get & GetAttachment", function () {
    expect(9);
    var jio = jIO.createJIO({
      "type": "local",
      "username": "uputattmt",
      "application_name": "aputattmt"
    }, {
      "workspace": {}
    });

    stop();

    all([

      // get an attachment from an inexistent document
      jio.getAttachment({
        "_id": "inexistent",
        "_attachment": "a"
      }).always(function (answer) {

        deepEqual(answer, {
          "attachment": "a",
          "error": "not_found",
          "id": "inexistent",
          "message": "Cannot find document",
          "method": "getAttachment",
          "reason": "missing document",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, "GetAttachment from inexistent document");

      }),

      // put a document then get an attachment from the empty document
      jio.put({"_id": "b"}).then(function () {

        return jio.getAttachment({"_id": "b", "_attachment": "inexistent"});

      }).always(function (answer) {

        deepEqual(answer, {
          "attachment": "inexistent",
          "error": "not_found",
          "id": "b",
          "message": "Cannot find attachment",
          "method": "getAttachment",
          "reason": "missing attachment",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, "Get inexistent attachment");

      }),

      // put an attachment to an inexistent document
      jio.putAttachment({
        "_id": "inexistent",
        "_attachment": "putattmt2",
        "_data": ""
      }).always(function (answer) {

        deepEqual(answer, {
          "attachment": "putattmt2",
          "error": "not_found",
          "id": "inexistent",
          "message": "Impossible to add attachment",
          "method": "putAttachment",
          "reason": "missing",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, "PutAttachment to inexistent document");

      }),

      // add a document to the storage
      // don't need to be tested
      jio.put({"_id": "putattmt1", "title": "myPutAttmt1"}).then(function () {

        return jio.putAttachment({
          "_id": "putattmt1",
          "_attachment": "putattmt2",
          "_data": ""
        });

      }).always(function (answer) {

        deepEqual(answer, {
          "attachment": "putattmt2",
          "digest": "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
            "7ae41e4649b934ca495991b7852b855", // hex_sha256("")
          "id": "putattmt1",
          "method": "putAttachment",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        }, "PutAttachment to a document, without data");

      }).then(function () {

        // check document and attachment
        return all([
          jio.get({"_id": "putattmt1"}),
          jio.getAttachment({"_id": "putattmt1", "_attachment": "putattmt2"})
        ]);

        // XXX check attachment with a getAttachment

      }).always(function (answers) {

        deepEqual(answers[0], {
          "data": {
            "_attachments": {
              "putattmt2": {
                "content_type": "",
                "digest": "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
                  "7ae41e4649b934ca495991b7852b855",
                "length": 0
              }
            },
            "_id": "putattmt1",
            "title": "myPutAttmt1"
          },
          "id": "putattmt1",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, "Get, Check document");

        ok(answers[1].data instanceof Blob, "Data is Blob");
        deepEqual(answers[1].data.type, "", "Check mimetype");
        deepEqual(answers[1].data.size, 0, "Check size");

        delete answers[1].data;
        deepEqual(answers[1], {
          "attachment": "putattmt2",
          "id": "putattmt1",
          "digest": "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
            "7ae41e4649b934ca495991b7852b855",
          "method": "getAttachment",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, "Get Attachment, Check Response");

      })

    ]).always(start);

  });

  test("Remove & RemoveAttachment", function () {
    expect(4);
    var jio = jIO.createJIO({
      "type": "local",
      "username": "uremove",
      "application_name": "aremove"
    }, {
      "workspace": {}
    });

    stop();

    jio.put({"_id": "a"}).then(function () {

      return jio.putAttachment({"_id": "a", "_attachment": "b", "_data": "c"});

    }).then(function () {

      return jio.removeAttachment({"_id": "a", "_attachment": "b"});

    }).always(function (answer) {

      deepEqual(answer, {
        "attachment": "b",
        "id": "a",
        "method": "removeAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove existent attachment");

    }).then(function () {

      // Promise.all always return success
      return all([jio.removeAttachment({
        "_id": "a",
        "_attachment": "b"
      })]);

    }).always(function (answers) {

      deepEqual(answers[0], {
        "attachment": "b",
        "error": "not_found",
        "id": "a",
        "message": "Attachment not found",
        "method": "removeAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove removed attachment");

    }).then(function () {

      return jio.remove({"_id": "a"});

    }).always(function (answer) {

      deepEqual(answer, {
        "id": "a",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove existent document");

    }).then(function () {

      return jio.remove({"_id": "a"});

    }).always(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "Document not found",
        "method": "remove",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove removed document");

    }).always(start);

  });

  test("AllDocs", function () {
    expect(3);
    var o = {}, jio = jIO.createJIO({
      "type": "local",
      "username": "ualldocs",
      "application_name": "aalldocs"
    }, {
      "workspace": {}
    });

    stop();

    o.date_a = new Date(0);
    o.date_b = new Date();

    // put some document before list them
    all([
      jio.put({
        "_id": "a",
        "title": "one",
        "date": o.date_a
      }).then(function () {
        return jio.putAttachment({
          "_id": "a",
          "_attachment": "aa",
          "_data": "aaa"
        });
      }),
      jio.put({"_id": "b", "title": "two", "date": o.date_a}),
      jio.put({"_id": "c", "title": "one", "date": o.date_b}),
      jio.put({"_id": "d", "title": "two", "date": o.date_b})
    ]).then(function () {

      // get a list of documents
      return jio.allDocs();

    }).always(function (answer) {

      // sort answer rows for comparison
      if (answer.data && answer.data.rows) {
        answer.data.rows.sort(function (a, b) {
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
      }

      deepEqual(answer, {
        "data": {
          "rows": [{
            "id": "a",
            "value": {}
          }, {
            "id": "b",
            "value": {}
          }, {
            "id": "c",
            "value": {}
          }, {
            "id": "d",
            "value": {}
          }],
          "total_rows": 4
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "AllDocs");

    }).then(function () {

      // get a list of documents
      return jio.allDocs({
        "include_docs": true,
        "sort_on": [['title', 'ascending'], ['date', 'descending']],
        "select_list": ['title', 'date'],
        "limit": [1, 3]
      });

    }).always(function (answer) {

      deepEqual(answer, {
        "data": {
          "rows": [{
            "doc": {
              "_attachments": {
                "aa": {
                  "content_type": "",
                  "digest": "sha256-9834876dcfb05cb167a5c24953eba58c4" +
                    "ac89b1adf57f28f2f9d09af107ee8f0",
                  "length": 3
                }
              },
              "_id": "a",
              "date": o.date_a.toJSON(),
              "title": "one"
            },
            "id": "a",
            "value": {
              "date": o.date_a.toJSON(),
              "title": "one"
            }
          }, {
            "doc": {
              "_id": "d",
              "date": o.date_b.toJSON(),
              "title": "two"
            },
            "id": "d",
            "value": {
              "date": o.date_b.toJSON(),
              "title": "two"
            }
          }, {
            "doc": {
              "_id": "b",
              "date": o.date_a.toJSON(),
              "title": "two"
            },
            "id": "b",
            "value": {
              "date": o.date_a.toJSON(),
              "title": "two"
            }
          }],
          "total_rows": 3
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "AllDocs include docs + sort on + limit + select_list");

    }).then(function () {

      // use a query
      return jio.allDocs({
        "query": "title: \"two\"",
        "sort_on": [["date", "descending"]]
      });

    }).always(function (answer) {

      deepEqual(answer, {
        "data": {
          "rows": [{
            "id": "d",
            "value": {}
          }, {
            "id": "b",
            "value": {}
          }],
          "total_rows": 2
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "AllDocs sort on + query");

    }).always(start);

  });

  test("Check & Repair", function () {
    expect(18);
    var o = {}, jio = jIO.createJIO({
      "type": "local",
      "username": "urepair",
      "application_name": "arepair"
    }, {
      "workspace": {}
    });

    stop();

    o.putCorruptedDocuments = function () {
      // put a document with a wrong attachment reference
      util.json_local_storage.setItem(
        "jio/localstorage/urepair/arepair/war",
        {"_id": "war", "title": "b", "_attachments": {"aa": {}}}
      );

      // put a document with a wrong metadata
      util.json_local_storage.setItem(
        "jio/localstorage/urepair/arepair/meta",
        {"_id": "meta", "title": ["b", ["c", {}], {"blue": "blue"}]}
      );

      // put a corrupted document
      util.json_local_storage.setItem(
        "jio/localstorage/urepair/arepair/cor",
        "blue"
      );
    };

    // put an unreferenced attachment
    util.json_local_storage.setItem(
      "jio/localstorage/urepair/arepair/unref/aa",
      "attachment content"
    );
    o.putCorruptedDocuments();

    all([
      jio.check({"_id": "war"}),
      jio.check({"_id": "meta"}),
      jio.check({"_id": "cor"}),
      jio.check({"_id": "inexistent"})
    ]).always(function (answers) {

      deepEqual(answers[0], {
        "error": "conflict",
        "id": "war",
        "message": "Attachment \"aa\" of \"war\" is missing",
        "method": "check",
        "reason": "missing attachment",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Check a document with one missing attachment");

      deepEqual(answers[1], {
        "error": "conflict",
        "id": "meta",
        "message": "Some metadata might be lost",
        "method": "check",
        "reason": "corrupted",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Check document with wrong metadata");

      deepEqual(answers[2], {
        "error": "conflict",
        "id": "cor",
        "message": "Document is unrecoverable",
        "method": "check",
        "reason": "corrupted",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Check corrupted document");

      deepEqual(answers[3], {
        "id": "inexistent",
        "method": "check",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Check inexistent document");

    }).then(function () {

      return all([
        jio.repair({"_id": "war"}),
        jio.repair({"_id": "meta"}),
        jio.repair({"_id": "cor"}),
        jio.repair({"_id": "inexistent"})
      ]);

    }).always(function (answers) {

      deepEqual(answers[0], {
        "id": "war",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair a document with one missing attachment");

      deepEqual(answers[1], {
        "id": "meta",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document with wrong metadata");

      deepEqual(answers[2], {
        "id": "cor",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair corrupted document");

      deepEqual(answers[3], {
        "id": "inexistent",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair inexistent document");

    }).then(function () {

      o.getCorruptedDocuments = function () {
        return all([
          jio.get({"_id": "war"}),
          jio.get({"_id": "meta"}),
          jio.get({"_id": "cor"}),
          jio.get({"_id": "inexistent"})
        ]);
      };

      return o.getCorruptedDocuments();

    }).always(function (answers) {

      o.testGetAnswers = function (answers) {

        deepEqual(answers[0], {
          "data": {
            "_id": "war",
            "title": "b"
          },
          "id": "war",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, "Get repaired document with one missing attachment");

        deepEqual(answers[1], {
          "data": {
            "_id": "meta",
            "title": "b"
          },
          "id": "meta",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, "Get repaired document with wrong metadata");

        deepEqual(answers[2], {
          "error": "not_found",
          "id": "cor",
          "message": "Cannot find document",
          "method": "get",
          "reason": "missing",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, "Get repaired corrupted document");

        deepEqual(answers[3], {
          "error": "not_found",
          "id": "inexistent",
          "message": "Cannot find document",
          "method": "get",
          "reason": "missing",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, "Get repaired inexistent document");

      };

      o.testGetAnswers(answers);

    }).then(function () {

      o.putCorruptedDocuments();

      return jio.repair({});

    }).always(function (answer) {

      deepEqual(answer, {
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair all the database");

    }).then(function () {

      return o.getCorruptedDocuments();

    }).always(function (answers) {

      o.testGetAnswers(answers);

    }).then(function () {

      // unreferenced attachment must be removed
      deepEqual(util.json_local_storage.getItem(
        "jio/localstorage/urepair/arepair/unref/aa"
      ), null, "Unreferenced attachment removed");

    }).always(start);

  });

}));
