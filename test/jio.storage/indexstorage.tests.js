/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, module, test_util, RSVP, jIO, local_storage, test, ok,
  deepEqual, stop, start */

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
  'indexstorage'
], function (util, RSVP, jIO, local_storage) {
  "use strict";

  function success(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      /*jslint unparam: true*/
      promise.then(resolve, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  /**
   * sequence(thens): Promise
   *
   * Executes a sequence of *then* callbacks. It acts like
   * `smth().then(callback).then(callback)...`. The first callback is called
   * with no parameter.
   *
   * Elements of `thens` array can be a function or an array contaning at most
   * three *then* callbacks: *onFulfilled*, *onRejected*, *onNotified*.
   *
   * When `cancel()` is executed, each then promises are cancelled at the same
   * time.
   *
   * @param  {Array} thens An array of *then* callbacks
   * @return {Promise} A new promise
   */
  function sequence(thens) {
    var promises = [];
    return new RSVP.Promise(function (resolve, reject, notify) {
      var i;
      promises[0] = new RSVP.Promise(function (resolve) {
        resolve();
      });
      for (i = 0; i < thens.length; i += 1) {
        if (Array.isArray(thens[i])) {
          promises[i + 1] = promises[i].
            then(thens[i][0], thens[i][1], thens[i][2]);
        } else {
          promises[i + 1] = promises[i].then(thens[i]);
        }
      }
      promises[i].then(resolve, reject, notify);
    }, function () {
      var i;
      for (i = 0; i < promises.length; i += 1) {
        promises[i].cancel();
      }
    });
  }

  module("IndexStorage");

  test("Scenario", 39, function () {

    var LOCAL_STORAGE_SPEC = local_storage.createDescription(
      'indexstorage tests',
      'scenario',
      'memory'
    ), INDEX_STORAGE_SPEC = {
      "type": "index",
      "indices": [
        {"id": "A", "index": ["contributor"], "metadata": {
          "title": "Database - A"
        }},
        {"id": "B", "index": ["author"]},
        {"id": "C", "index": ["title"]},
        {"id": "D", "index": ["title", "year"]}
      ],
      "sub_storage": LOCAL_STORAGE_SPEC
    }, option = {"workspace": {}}, shared = {}, jio_index, jio_local;

    jio_index = jIO.createJIO(INDEX_STORAGE_SPEC, option);
    jio_local = jIO.createJIO(LOCAL_STORAGE_SPEC, option);

    function postNewDocument() {
      return jio_index.post({"title": "Unique ID"});
    }

    function postNewDocumentTest(answer) {
      var uuid = answer.id;
      answer.id = "<uuid>";
      deepEqual(answer, {
        "id": "<uuid>",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post a new document");
      ok(util.isUuid(uuid), "New document id should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
      shared.created_document_id = uuid;
    }

    function getCreatedDocument() {
      return jio_index.get({"_id": shared.created_document_id});
    }

    function getCreatedDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_id": shared.created_document_id,
          "title": "Unique ID"
        },
        "id": shared.created_document_id,
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get new document");
    }

    // function postSpecificDocuments() {
    //   return success(RSVP.all([
    //     jio_index.post({"_id": "b", "title": "Bee", "year": 2013}),
    //     jio_index.post({"_id": "ce", "contributor": "DCee"}),
    //     jio_index.post({"_id": "dee", "format": "text/plain"})
    //   ]));
    // }

    // function postSpecificDocumentsTest(answers) {
    //   deepEqual(answers[0], {
    //     "id": "b",
    //     "method": "post",
    //     "result": "success",
    //     "status": 201,
    //     "statusText": "Created"
    //   }, "Post specific document 'b'");

    //   deepEqual(answers[1], {
    //     "id": "ce",
    //     "method": "post",
    //     "result": "success",
    //     "status": 201,
    //     "statusText": "Created"
    //   }, "Post specific document 'ce'");

    //   deepEqual(answers[2], {
    //     "id": "dee",
    //     "method": "post",
    //     "result": "success",
    //     "status": 201,
    //     "statusText": "Created"
    //   }, "Post specific document 'dee'");
    // }

    // XXX the 2 following functions should be replaced by the 2 commented
    // previous ones (which don't work yet)
    function postSpecificDocuments() {
      return sequence([function () {
        return jio_index.post({"_id": "b", "title": "Bee", "year": 2013});
      }, function () {
        return jio_index.post({"_id": "ce", "contributor": "DCee"});
      }, function () {
        return jio_index.post({"_id": "dee", "format": "text/plain"});
      }]);
    }

    function postSpecificDocumentsTest(last_answer) {
      deepEqual(last_answer, {
        "id": "dee",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post documents: 'b', 'ce', 'dee' (testing 'dee' response only)");
    }

    function listDocumentsFromIndexContributor() {
      return jio_index.allDocs({"select_list": ["contributor"]});
    }

    function listDocumentsFromIndexContributorTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a, b) {
          return a.id.length < b.id.length ? -1 : (
            a.id.length > b.id.length ? 1 : 0
          );
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 1,
          "rows": [{
            "id": "ce",
            "value": {"contributor": "DCee"}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 1 document from 'contributor'");
    }

    function listDocumentsFromIndexTitleYear() {
      return jio_index.allDocs({"select_list": ["year", "title"]});
    }

    function listDocumentsFromIndexTitleYearTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a, b) {
          return a.id.length < b.id.length ? -1 : (
            a.id.length > b.id.length ? 1 : 0
          );
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 2,
          "rows": [{
            "id": "b",
            "value": {"title": "Bee", "year": 2013}
          }, {
            "id": shared.created_document_id,
            "value": {"title": "Unique ID"}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 2 documents from 'year' and 'title'");
    }

    function listDocumentsFromIndexTitle() {
      return jio_index.allDocs({"select_list": ["title"]});
    }

    function listDocumentsFromIndexTitleTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a, b) {
          return a.id.length < b.id.length ? -1 : (
            a.id.length > b.id.length ? 1 : 0
          );
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 2,
          "rows": [{
            "id": "b",
            "value": {"title": "Bee"}
          }, {
            "id": shared.created_document_id,
            "value": {"title": "Unique ID"}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 2 documents from 'title'");
    }

    function listDocumentsFromIndexAuthor() {
      return jio_index.allDocs({"select_list": ["author"]});
    }

    function listDocumentsFromIndexAuthorTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a, b) {
          return a.id.length < b.id.length ? -1 : (
            a.id.length > b.id.length ? 1 : 0
          );
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 0,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 0 document from 'author'");
    }

    function listDocumentsFromNothing() {
      return jio_index.allDocs();
    }

    function listDocumentsFromNothingTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a, b) {
          return a.id.length < b.id.length ? -1 : (
            a.id.length > b.id.length ? 1 : 0
          );
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 1,
          "rows": [{
            "id": "ce",
            "value": {}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 1 document from first index (`allDocs()`)");
    }

    function listDocumentsFromLocal() {
      return jio_local.allDocs();
    }

    function listDocumentsFromLocalTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a, b) {
          return a.id.length < b.id.length ? -1 : (
            a.id.length > b.id.length ? 1 : (
              a.id < b.id ? -1 : a.id > b.id ? 1 : 0
            )
          );
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 8,
          "rows": [{
            "id": "A",
            "value": {}
          }, {
            "id": "B",
            "value": {}
          }, {
            "id": "C",
            "value": {}
          }, {
            "id": "D",
            "value": {}
          }, {
            "id": "b",
            "value": {}
          }, {
            "id": "ce",
            "value": {}
          }, {
            "id": "dee",
            "value": {}
          }, {
            "id": shared.created_document_id,
            "value": {}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 8 documents from local (4 document + 4 databases)");
    }

    function getDatabaseMetadata() {
      return jio_local.get({"_id": "A"});
    }

    function getDatabaseMetadataTest(answer) {
      deepEqual(answer, {
        "data": {
          "_attachments": {
            "body": {
              "content_type": "application/json",
              "digest": "sha256-365910ba219365b68e3431f9762eef21f" +
                "77cd390dbcc55d827d42555c66340a6",
              "length": 105
            }
          },
          "_id": "A",
          "title": "Database - A"
        },
        "id": "A",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Check one index database metadata");
    }

    // function removeCreatedDocuments() {
    //   return success(RSVP.all([
    //     jio_index.remove({"_id": shared.created_document_id}),
    //     jio_index.remove({"_id": "b"}),
    //     jio_index.remove({"_id": "ce"}),
    //     jio_index.remove({"_id": "dee"})
    //   ]));
    // }

    // function removeCreatedDocumentsTest(answers) {
    //   deepEqual(answers[0], {
    //     "id": shared.created_document_id,
    //     "method": "remove",
    //     "result": "success",
    //     "status": 204,
    //     "statusText": "No Content"
    //   }, "Remove first document");

    //   deepEqual(answers[1], {
    //     "id": "b",
    //     "method": "remove",
    //     "result": "success",
    //     "status": 204,
    //     "statusText": "No Content"
    //   }, "Remove document 'b'");

    //   deepEqual(answers[2], {
    //     "id": "ce",
    //     "method": "remove",
    //     "result": "success",
    //     "status": 204,
    //     "statusText": "No Content"
    //   }, "Remove document 'ce'");

    //   deepEqual(answers[3], {
    //     "id": "dee",
    //     "method": "remove",
    //     "result": "success",
    //     "status": 204,
    //     "statusText": "No Content"
    //   }, "Remove document 'dee'");
    // }

    // XXX the 2 following functions should be replaced by the 2 commented
    // previous ones (which don't work yet)
    function removeCreatedDocuments() {
      return sequence([function () {
        return jio_index.remove({"_id": shared.created_document_id});
      }, function () {
        return jio_index.remove({"_id": "b"});
      }, function () {
        return jio_index.remove({"_id": "ce"});
      }, function () {
        return jio_index.remove({"_id": "dee"});
      }]);
    }

    function removeCreatedDocumentsTest(last_answer) {
      deepEqual(last_answer, {
        "id": "dee",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove first document, 'b', 'ce' and 'dee' (testing 'dee' only)");
    }

    function listEmptyIndexes() {
      return RSVP.all([
        success(jio_index.allDocs({"select_list": ["contributor"]})),
        success(jio_index.allDocs({"select_list": ["title"]})),
        success(jio_index.allDocs({"select_list": ["title", "year"]})),
        success(jio_index.allDocs({"select_list": ["author"]})),
        success(jio_index.allDocs())
      ]);
    }

    function listEmptyIndexesTest(answers) {
      deepEqual(answers[0], {
        "data": {
          "total_rows": 0,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List empty indexes 'contributor'");

      deepEqual(answers[1], {
        "data": {
          "total_rows": 0,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List empty indexes 'title'");

      deepEqual(answers[2], {
        "data": {
          "total_rows": 0,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List empty indexes 'title', 'year'");

      deepEqual(answers[3], {
        "data": {
          "total_rows": 0,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List empty indexes 'author'");

      deepEqual(answers[4], {
        "data": {
          "total_rows": 0,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List default empty indexes");
    }

    function putNewDocument() {
      return jio_index.put({"_id": "a", "title": "Hey"});
    }

    function putNewDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "put",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Put new document");
    }

    function getCreatedDocument2() {
      return jio_index.get({"_id": "a"});
    }

    function getCreatedDocument2Test(answer) {
      deepEqual(answer, {
        "data": {
          "_id": "a",
          "title": "Hey"
        },
        "id": "a",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get new document");
    }

    function postSameDocument() {
      return success(jio_index.post({"_id": "a", "title": "Hoo"}));
    }

    function postSameDocumentTest(answer) {
      deepEqual(answer, {
        "error": "conflict",
        "id": "a",
        "message": "Cannot create a new document",
        "method": "post",
        "reason": "document exists",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Unable to post the same document (conflict)");
    }

    function createAttachment() {
      return jio_index.putAttachment({
        "_id": "a",
        "_attachment": "aa",
        "_data": "aaa",
        "_content_type": "text/plain"
      });
    }

    function createAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "aa",
        "digest": "sha256-9834876dcfb05cb167a5c24953eba58c4" +
          "ac89b1adf57f28f2f9d09af107ee8f0",
        "id": "a",
        "method": "putAttachment",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Create new attachment");
    }

    function updateAttachment() {
      return jio_index.putAttachment({
        "_id": "a",
        "_attachment": "aa",
        "_data": "aab",
        "_content_type": "text/plain"
      });
    }

    function updateAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "aa",
        "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
          "0728e095ff24218119d51bd22475363",
        "id": "a",
        "method": "putAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Update last attachment");
    }

    function createAnotherAttachment() {
      return jio_index.putAttachment({
        "_id": "a",
        "_attachment": "ab",
        "_data": "aba",
        "_content_type": "text/plain"
      });
    }

    function createAnotherAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
          "ed343e6c739e54131fcb3a56e4bc1bd",
        "id": "a",
        "method": "putAttachment",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Create another attachment");
    }

    function updateLastDocument() {
      return jio_index.put({"_id": "a", "title": "Hoo"});
    }

    function updateLastDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Update document metadata");
    }

    function getFirstAttachment() {
      return jio_index.getAttachment({"_id": "a", "_attachment": "aa"});
    }

    function getFirstAttachmentTest(answer) {
      var blob = answer.data;
      answer.data = "<blob>";
      deepEqual(answer, {
        "attachment": "aa",
        "data": "<blob>",
        "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
          "0728e095ff24218119d51bd22475363",
        "id": "a",
        "method": "getAttachment",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get first attachment");
      return jIO.util.readBlobAsText(blob).then(function (e) {
        deepEqual(blob.type, "text/plain", "Check blob type");
        deepEqual(e.target.result, "aab", "Check blob text content");
      }, function (err) {
        deepEqual(err, "no error", "Check blob text content");
      });
    }

    function getSecondAttachment() {
      return jio_index.getAttachment({"_id": "a", "_attachment": "ab"});
    }

    function getSecondAttachmentTest(answer) {
      var blob = answer.data;
      answer.data = "<blob>";
      deepEqual(answer, {
        "attachment": "ab",
        "data": "<blob>",
        "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
          "ed343e6c739e54131fcb3a56e4bc1bd",
        "id": "a",
        "method": "getAttachment",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get first attachment");
      return jIO.util.readBlobAsText(blob).then(function (e) {
        deepEqual(blob.type, "text/plain", "Check blob type");
        deepEqual(e.target.result, "aba", "Check blob text content");
      }, function (err) {
        deepEqual(err, "no error", "Check blob text content");
      });
    }

    function getLastDocument() {
      return jio_index.get({"_id": "a"});
    }

    function getLastDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_id": "a",
          "title": "Hoo",
          "_attachments": {
            "aa": {
              "content_type": "text/plain",
              "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
                "0728e095ff24218119d51bd22475363",
              "length": 3
            },
            "ab": {
              "content_type": "text/plain",
              "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
                "ed343e6c739e54131fcb3a56e4bc1bd",
              "length": 3
            }
          }
        },
        "id": "a",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get last document metadata");
    }

    function removeSecondAttachment() {
      return jio_index.removeAttachment({"_id": "a", "_attachment": "ab"});
    }

    function removeSecondAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "id": "a",
        "method": "removeAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove second document");
    }

    function getInexistentSecondAttachment() {
      return success(jio_index.getAttachment({
        "_id": "a",
        "_attachment": "ab"
      }));
    }

    function getInexistentSecondAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": "a",
        "message": "Cannot find attachment",
        "method": "getAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent second attachment");
    }

    function getOneAttachmentDocument() {
      return jio_index.get({"_id": "a"});
    }

    function getOneAttachmentDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_attachments": {
            "aa": {
              "content_type": "text/plain",
              "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
                "0728e095ff24218119d51bd22475363",
              "length": 3
            }
          },
          "_id": "a",
          "title": "Hoo"
        },
        "id": "a",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get document metadata");
    }

    function removeSecondAttachmentAgain() {
      return success(jio_index.removeAttachment({
        "_id": "a",
        "_attachment": "ab"
      }));
    }

    function removeSecondAttachmentAgainTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": "a",
        "message": "Attachment not found",
        "method": "removeAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove inexistent attachment");
    }

    function removeDocument() {
      return jio_index.remove({"_id": "a"});
    }

    function removeDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove document and its attachments");
    }

    function getInexistentFirstAttachment() {
      return success(jio_index.getAttachment({
        "_id": "a",
        "_attachment": "aa"
      }));
    }

    function getInexistentFirstAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "aa",
        "error": "not_found",
        "id": "a",
        "message": "Cannot find document",
        "method": "getAttachment",
        "reason": "missing document",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent first attachment");
    }

    function getInexistentDocument() {
      return success(jio_index.get({"_id": "a"}));
    }

    function getInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "Cannot find document",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent document");
    }

    function removeInexistentDocument() {
      return success(jio_index.remove({"_id": "a"}));
    }

    function removeInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "Document not found",
        "method": "remove",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove already removed document");
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

    stop();

    // # Post new documents, list them and remove them
    // post a 201
    postNewDocument().then(postNewDocumentTest).
      // get 200
      then(getCreatedDocument).then(getCreatedDocumentTest).
      // post b ce dee 201
      then(postSpecificDocuments).then(postSpecificDocumentsTest).
      // allD 200 1 documents from index contributor
      then(listDocumentsFromIndexContributor).
      then(listDocumentsFromIndexContributorTest).
      // allD 200 2 documents from index title
      then(listDocumentsFromIndexTitle).
      then(listDocumentsFromIndexTitleTest).
      // allD 200 2 documents from index title year
      then(listDocumentsFromIndexTitleYear).
      then(listDocumentsFromIndexTitleYearTest).
      // allD 200 0 documents from index author
      then(listDocumentsFromIndexAuthor).
      then(listDocumentsFromIndexAuthorTest).
      // allD 200 0 documents from nothing (no select_list option)
      then(listDocumentsFromNothing).
      then(listDocumentsFromNothingTest).
      // allD 200 8 documents from local
      then(listDocumentsFromLocal).then(listDocumentsFromLocalTest).
      // get 200 database to check metadatas from local
      then(getDatabaseMetadata).then(getDatabaseMetadataTest).
      // remove a b ce dee 204
      then(removeCreatedDocuments).then(removeCreatedDocumentsTest).
      // allD 200 empty indexes
      then(listEmptyIndexes).then(listEmptyIndexesTest).

      // # Create and update documents, and some attachment and remove them
      // put 201
      then(putNewDocument).then(putNewDocumentTest).
      // get 200
      then(getCreatedDocument2).then(getCreatedDocument2Test).
      // post 409
      then(postSameDocument).then(postSameDocumentTest).
      // putA a 204
      then(createAttachment).then(createAttachmentTest).
      // putA a 204
      then(updateAttachment).then(updateAttachmentTest).
      // putA b 204
      then(createAnotherAttachment).then(createAnotherAttachmentTest).
      // put 204
      then(updateLastDocument).then(updateLastDocumentTest).
      // getA a 200
      then(getFirstAttachment).then(getFirstAttachmentTest).
      // getA b 200
      then(getSecondAttachment).then(getSecondAttachmentTest).
      // get 200
      then(getLastDocument).then(getLastDocumentTest).
      // removeA b 204
      then(removeSecondAttachment).then(removeSecondAttachmentTest).
      // getA b 404
      then(getInexistentSecondAttachment).
      then(getInexistentSecondAttachmentTest).
      // get 200
      then(getOneAttachmentDocument).then(getOneAttachmentDocumentTest).
      // removeA b 404
      then(removeSecondAttachmentAgain).then(removeSecondAttachmentAgainTest).
      // remove 204
      then(removeDocument).then(removeDocumentTest).
      // getA a 404
      then(getInexistentFirstAttachment).then(getInexistentFirstAttachmentTest).
      // get 404
      then(getInexistentDocument).then(getInexistentDocumentTest).
      // remove 404
      then(removeInexistentDocument).then(removeInexistentDocumentTest).
      // // check 204
      // //then(checkDocument).done(checkDocumentTest).
      // //then(checkStorage).done(checkStorageTest).
      fail(unexpectedError).
      always(start);

  });

}));
