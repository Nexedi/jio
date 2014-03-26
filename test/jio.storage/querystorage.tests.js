/*jslint indent: 2, maxlen: 80, nomen: true */
/*global window, define, module, test_util, RSVP, jIO, local_storage, test, ok,
  deepEqual, sinon, expect, stop, start, Blob, query_storage */

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
  'qunit',
  'querystorage'
], function (test_util, RSVP, jIO, local_storage) {
  "use strict";

  module("QueryStorage");

  function createQueryStorage(name, key_schema) {
    var local_description = local_storage.createDescription(name,
                                                            name,
                                                            'memory');
    return jIO.createJIO({
      type: 'query',
      sub_storage: local_description,
      key_schema: key_schema
    }, {
      workspace: {}
    });
  }



  /*
   * What follows is almost a replica of the local storage tests,
   * plus a couple of schema queries.
   * This is redundant, but guarantees that the storage is working
   * under all circumstances.
   */


  function success(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      /*jslint unparam: true*/
      promise.then(resolve, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }


  function unexpectedError(error) {
    if (error instanceof Error) {
      deepEqual([
        error.name + ": " + error.message,
        error
      ], "UNEXPECTED ERROR", "Unexpected error");
    } else {
      deepEqual(error, "UNEXPECTED ERROR", "Unexpected error");
    }
  }


  test("post & get", 6, function () {
    var jio = createQueryStorage('post-get');

    stop();

    function getMissingDocument() {
      return success(jio.get({_id: 'inexistent'}));
    }

    function getMissingDocumentTest(answer) {
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
    }

    function postWithoutID() {
      return jio.post({});
    }

    function postWithoutIDTest(answer) {
      var uuid = answer.id;

      delete answer.id;
      deepEqual(answer, {
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      });
      ok(test_util.isUuid(uuid), "Uuid should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
    }

    function postNonEmptyDocument() {
      return jio.post({"_id": "post1", "title": "myPost1"});
    }

    function postNonEmptyDocumentTest(answer) {
      deepEqual(answer, {
        "id": "post1",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      });
    }

    function getNonEmptyDocument() {
      return jio.get({"_id": "post1"});
    }

    function getNonEmptyDocumentTest(answer) {
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
      });
    }

    function postExistingDocument() {
      return success(jio.post({"_id": "post1", "title": "myPost2"}));
    }

    function postExistingDocumentTest(answer) {
      deepEqual(answer, {
        "error": "conflict",
        "id": "post1",
        "message": "Cannot create a new document",
        "method": "post",
        "reason": "document exists",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      });
    }

    getMissingDocument().then(getMissingDocumentTest).
      then(postWithoutID).then(postWithoutIDTest).
      then(postNonEmptyDocument).then(postNonEmptyDocumentTest).
      then(getNonEmptyDocument).then(getNonEmptyDocumentTest).
      then(postExistingDocument).then(postExistingDocumentTest).
      fail(unexpectedError).
      always(start);
  });



  test("put & get", 4, function () {
    var jio = createQueryStorage('put-get');

    stop();

    function putNonEmptyDocument() {
      return jio.put({"_id": "put1", "title": "myPut1"});
    }

    function putNonEmptyDocumentTest(answer) {
      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      });
    }

    function getNonEmptyDocument() {
      return jio.get({"_id": "put1"});
    }

    function getNonEmptyDocumentTest(answer) {
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
      });
    }

    function putExistingDocument() {
      return success(jio.put({"_id": "put1", "title": "myPut2"}));
    }

    function putExistingDocumentTest(answer) {
      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      });
    }

    function getNonEmptyDocument2() {
      return jio.get({"_id": "put1"});
    }

    function getNonEmptyDocument2Test(answer) {
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
      });
    }

    putNonEmptyDocument().then(putNonEmptyDocumentTest).
      then(getNonEmptyDocument).then(getNonEmptyDocumentTest).
      then(putExistingDocument).then(putExistingDocumentTest).
      then(getNonEmptyDocument2).then(getNonEmptyDocument2Test).
      fail(unexpectedError).
      always(start);
  });


  test("putAttachment & get & getAttachment", 9, function () {
    var jio = createQueryStorage('putattachment-get-getattachment');

    stop();

    function getAttachmentMissingDocument() {
      return success(jio.getAttachment({
        "_id": "inexistent",
        "_attachment": "a"
      }));
    }

    function getAttachmentMissingDocumentTest(answer) {
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
      });
    }

    function getAttachmentFromEmptyDocument() {
      var promise = jio.put({"_id": "b"}).
        then(function () {
          return jio.getAttachment({"_id": "b", "_attachment": "inexistent"});
        });
      return success(promise);
    }

    function getAttachmentFromEmptyDocumentTest(answer) {
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
      });
    }

    function putAttachmentMissingDocument() {
      return success(jio.putAttachment({
        "_id": "inexistent",
        "_attachment": "putattmt2",
        "_data": ""
      }));
    }

    function putAttachmentMissingDocumentTest(answer) {
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
      });
    }

    function addAttachment() {
      var promise = jio.put({"_id": "putattmt1", "title": "myPutAttmt1"}).
        then(function () {
          return jio.putAttachment({
            "_id": "putattmt1",
            "_attachment": "putattmt2",
            "_data": ""
          });
        });
      return success(promise);
    }

    function addAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "putattmt2",
        "digest": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b93" +
          "4ca495991b7852b855",
        "id": "putattmt1",
        "method": "putAttachment",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      });
    }

    function checkDocumentAndAttachment() {
      return RSVP.all([
        jio.get({"_id": "putattmt1"}),
        jio.getAttachment({"_id": "putattmt1", "_attachment": "putattmt2"})
      ]);
    }

    function checkDocumentAndAttachmentTest(answers) {
      deepEqual(answers[0], {
        "data": {
          "_attachments": {
            "putattmt2": {
              "content_type": "",
              "digest": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4" +
                "649b934ca495991b7852b855",
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
      });

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
    }

    getAttachmentMissingDocument().then(getAttachmentMissingDocumentTest).
      then(getAttachmentFromEmptyDocument).
        then(getAttachmentFromEmptyDocumentTest).
      then(putAttachmentMissingDocument).
        then(putAttachmentMissingDocumentTest).
      then(addAttachment).then(addAttachmentTest).
      then(checkDocumentAndAttachment).then(checkDocumentAndAttachmentTest).
      fail(unexpectedError).
      always(start);
  });


  test("remove & removeAttachment", 5, function () {
    var jio = createQueryStorage('remove-removeattachment');

    stop();

    function putAttachment() {
      var promise = jio.put({"_id": "a"}).
        then(function () {
          return jio.putAttachment({
            "_id": "a",
            "_attachment": "b",
            "_data": "c"
          });
        });

      return promise;
    }

    function putAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "b",
        "digest": "sha256-2e7d2c03a9507ae265ecf5b5356885a53" +
          "393a2029d241394997265a1a25aefc6",
        "id": "a",
        "method": "putAttachment",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      });
    }

    function removeAttachment() {
      return success(jio.removeAttachment({"_id": "a", "_attachment": "b"}));
    }

    function removeAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "b",
        "id": "a",
        "method": "removeAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      });
    }

    function removeAttachmentAgainTest(answer) {
      deepEqual(answer, {
        "attachment": "b",
        "error": "not_found",
        "id": "a",
        "message": "Attachment not found",
        "method": "removeAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      });
    }

    function removeDocument() {
      return success(jio.remove({"_id": "a"}));
    }

    function removeDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      });
    }

    function removeDocumentAgainTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "Document not found",
        "method": "remove",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      });
    }

    putAttachment().then(putAttachmentTest).
      then(removeAttachment).then(removeAttachmentTest).
      then(removeAttachment).then(removeAttachmentAgainTest).
      then(removeDocument).then(removeDocumentTest).
      then(removeDocument).then(removeDocumentAgainTest).
      fail(unexpectedError).
      always(start);
  });


  test("allDocs", 5, function () {
    var jio = createQueryStorage('alldocs'),
      key_schema = {
        key_set: {
          case_insensitive_title: {
            read_from: 'title',
            equal_match: function (object_value, value) {
              return (object_value.toLowerCase() === value.toLowerCase());
            }
          }
        }
      };

    stop();


    function putDocuments() {
      var date_a = new Date(0),
        date_b = new Date(1234567890000);

      return RSVP.all([
        jio.put({
          "_id": "a",
          "title": "one",
          "date": date_a
        }).then(function () {
          return jio.putAttachment({
            "_id": "a",
            "_attachment": "aa",
            "_data": "aaa"
          });
        }),
        jio.put({"_id": "b", "title": "two", "date": date_a}),
        jio.put({"_id": "c", "title": "one", "date": date_b}),
        jio.put({"_id": "d", "title": "two", "date": date_b})
      ]);
    }

    function putDocumentsTest(answer) {
      // sort answer rows for comparison
      if (answer.data && answer.data.rows) {
        answer.data.rows.sort(function (a, b) {
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
      }

      deepEqual(answer, [
        {
          "attachment": "aa",
          "digest": "sha256-9834876dcfb05cb167a5c24953eba58" +
            "c4ac89b1adf57f28f2f9d09af107ee8f0",
          "id": "a",
          "method": "putAttachment",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        },
        {
          "id": "b",
          "method": "put",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        },
        {
          "id": "c",
          "method": "put",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        },
        {
          "id": "d",
          "method": "put",
          "result": "success",
          "status": 201,
          "statusText": "Created"
        }
      ]);

    }


    function listDocuments() {
      return jio.allDocs();
    }

    function listDocumentsTest(answer) {
      deepEqual(answer, {
        "data": {
          "rows": [
            {
              "id": "a",
              "key": "a",
              "value": {}
            },
            {
              "id": "b",
              "key": "b",
              "value": {}
            },
            {
              "id": "c",
              "key": "c",
              "value": {}
            },
            {
              "id": "d",
              "key": "d",
              "value": {}
            }
          ],
          "total_rows": 4
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      });
    }

    function listDocumentsQuery() {
      return jio.allDocs({
        "include_docs": true,
        "query": "title: \"two\""
      });
    }


    function listDocumentsQueryTest(answer) {
      deepEqual(answer, {
        "data": {
          "rows": [
            {
              "doc": {
                "_id": "b",
                "date": "1970-01-01T00:00:00.000Z",
                "title": "two"
              },
              "id": "b",
              "value": {}
            },
            {
              "doc": {
                "_id": "d",
                "date": "2009-02-13T23:31:30.000Z",
                "title": "two"
              },
              "id": "d",
              "value": {}
            }
          ],
          "total_rows": 2
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      });
    }

    function listDocumentSchemaQueryNoDocs() {
      var jio_schema = createQueryStorage('alldocs', key_schema);
      return jio_schema.allDocs({
        "include_docs": false,
        "query": "case_insensitive_title: \"oNe\""
      });
    }

    function listDocumentSchemaQueryNoDocsTest(answer) {
      deepEqual(answer, {
        "data": {
          "rows": [
            {
              "id": "a",
              "value": {}
            },
            {
              "id": "c",
              "value": {}
            }
          ],
          "total_rows": 2
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      });
    }


    function listDocumentSchemaQueryWithDocs() {
      var jio_schema = createQueryStorage('alldocs', key_schema);
      return jio_schema.allDocs({
        "include_docs": true,
        "query": "case_insensitive_title: \"oNe\""
      });
    }

    function listDocumentSchemaQueryWithDocsTest(answer) {
      deepEqual(answer, {
        "data": {
          "rows": [
            {
              "doc": {
                "_attachments": {
                  "aa": {
                    "content_type": "",
                    "digest": "sha256-9834876dcfb05cb167a5c24953eba58c" +
                      "4ac89b1adf57f28f2f9d09af107ee8f0",
                    "length": 3
                  }
                },
                "_id": "a",
                "date": "1970-01-01T00:00:00.000Z",
                "title": "one"
              },
              "id": "a",
              "value": {}
            },
            {
              "doc": {
                "_id": "c",
                "date": "2009-02-13T23:31:30.000Z",
                "title": "one"
              },
              "id": "c",
              "value": {}
            }
          ],
          "total_rows": 2
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      });
    }



    putDocuments().then(putDocumentsTest).
      then(listDocuments).then(listDocumentsTest).
      then(listDocumentsQuery).then(listDocumentsQueryTest).
      then(listDocumentSchemaQueryNoDocs).
        then(listDocumentSchemaQueryNoDocsTest).
      then(listDocumentSchemaQueryWithDocs).
        then(listDocumentSchemaQueryWithDocsTest).
      fail(unexpectedError).
      always(start);
  });



// XXX check/repair not tested yet, may change soon btw
// test("check & repair", 18, function () {
// })

}));
