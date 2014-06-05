/*jslint indent: 2, maxlen: 80, nomen: true */
/*global module, test, stop, start, expect, ok, deepEqual, location, sinon,
  davstorage_spec, RSVP, jIO, test_util, dav_storage, btoa, define,
  setTimeout, clearTimeout */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(test_util, RSVP, jIO);
}([
  'test_util',
  'rsvp',
  'jio',
  'indexeddbstorage',
  'qunit'
], function (util, RSVP, jIO) {
  "use strict";
  module("Indexeddb Storage");
  function success(promise) {
    return new RSVP.Promise(function (resolve, notify) {
      promise.then(resolve, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  test("Scenario", 32, function () {
//    indexedDB.deleteDatabase("jio:test");
    var server, shared = {}, jio = jIO.createJIO(
      {"type"     : "indexeddb",
        "database" : "test"
        },
      {"workspace": {}}
    );

    stop();
    server = {restore: function () {
      return;
    }};







    function postNewDocument() {
      return jio.post({"title": "Unique ID"});
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
      return jio.get({"_id": shared.created_document_id});
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

    function postSpecificDocument() {
      return jio.post({"_id": "b", "title": "Bee"});
    }

    function postSpecificDocumentTest(answer) {
      deepEqual(answer, {
        "id": "b",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post specific document");
    }

    function listDocument() {
      return jio.allDocs();
    }

    function list2DocumentsTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a) {
          return a.id === "b" ? 1 : 0;
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 2,
          "rows": [{
            "id": shared.created_document_id,
            "value": {}
          }, {
            "id": "b",
            "value": {}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 2 documents");
    }

    function listDocumentsWithMetadata() {
      return jio.allDocs({"include_docs": true});
    }

    function list2DocumentsWithMetadataTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a) {
          return a.id === "b" ? 1 : 0;
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 2,
          "rows": [{
            "id": shared.created_document_id,
            "value": {},
            "doc": {
              "_id": shared.created_document_id,
              "title": "Unique ID"
            }
          }, {
            "id": "b",
            "value": {},
            "doc": {
              "_id": "b",
              "title": "Bee"
            }
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 2 documents with their metadata");
    }

    function removeCreatedDocument() {
      return jio.remove({"_id": shared.created_document_id});
    }

    function removeCreatedDocumentTest(answer) {
      deepEqual(answer, {
        "id": shared.created_document_id,
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove first document.");
    }

    function removeSpecificDocument() {
      return jio.remove({"_id": "b"});
    }

    function removeSpecificDocumentTest(answer) {
      deepEqual(answer, {
        "id": "b",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove second document.");
    }

    function listEmptyStorage() {
      return jio.allDocs();
    }

    function listEmptyStorageTest(answer) {
      deepEqual(answer, {
        "data": {
          "total_rows": 0,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List empty storage");
    }

    function putNewDocument() {
      return jio.put({"_id": "a", "title": "Hey"});
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
      return jio.get({"_id": "a"});
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
      return success(jio.post({"_id": "a", "title": "Hoo"}));
    }

    function postSameDocumentTest(answer) {
      deepEqual(answer, {
        "error": "conflict",
        "id": "a",
        "message": "Command failed",
        "method": "post",
        "reason": "Document exists",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Unable to post the same document (conflict)");
    }

    function putAttachmentToNonExistentDocument() {
      return success(jio.putAttachment({
        "_id": "ahaha",
        "_attachment": "aa",
        "_data": "aaa",
        "_content_type": "text/plain"
      }));
    }

    function putAttachmentToNonExistentDocumentTest(answer) {
      deepEqual(answer, {
        "attachment": "aa",
        "error": "not_found",
        "id": "ahaha",
        "message": "indexeddbStorage unable to put attachment",
        "method": "putAttachment",
        "reason": "Not Found",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Put attachment to a non existent document -> 404 Not Found");
    }

    function createAttachment() {
      return jio.putAttachment({
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
        "status": 204,
        "statusText": "No Content"
      }, "Create new attachment");
    }

    function updateAttachment() {
      return jio.putAttachment({
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
      return jio.putAttachment({
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
        "status": 204,
        "statusText": "No Content"
      }, "Create another attachment");
    }


    function updateLastDocument() {
      return jio.put({"_id": "a", "title": "Hoo"});
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
      return jio.getAttachment({"_id": "a", "_attachment": "aa"});
    }

    function getFirstAttachmentTest(answer) {
      var blob = answer.data;
      answer.data = "<blob>";
      return jIO.util.readBlobAsText(blob).then(function (e) {
        deepEqual(blob.type, "text/plain", "Check blob type");
        deepEqual(e.target.result, "aab", "Check blob text content");
        answer.digest =  jIO.util.makeBinaryStringDigest(e.target.result);
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
      }, function (err) {
        deepEqual(err, "no error", "Check blob text content");
      });
    }



    function getSecondAttachment() {
      return jio.getAttachment({"_id": "a", "_attachment": "ab"});
    }

    function getSecondAttachmentTest(answer) {
      var blob = answer.data;
      answer.data = "<blob>";
      return jIO.util.readBlobAsText(blob).then(function (e) {
        deepEqual(blob.type, "text/plain", "Check blob type");
        deepEqual(e.target.result, "aba", "Check blob text content");
        answer.digest =  jIO.util.makeBinaryStringDigest(e.target.result);
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
      }, function (err) {
        deepEqual(err, "no error", "Check blob text content");
      });
    }

    function getLastDocument() {
      return jio.get({"_id": "a"});
    }

    function getLastDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_id": "a",
          "title": "Hoo",
          "_attachment": {
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
      return jio.removeAttachment({"_id": "a", "_attachment": "ab"});
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
      return success(jio.getAttachment({"_id": "a", "_attachment": "ab"}));
    }

    function getInexistentSecondAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": "a",
        "message": "IndexeddbStorage, unable to get attachment.",
        "method": "getAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent second attachment");
    }

    function getOneAttachmentDocument() {
      return jio.get({"_id": "a"});
    }

    function getOneAttachmentDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_attachment": {
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
      return success(jio.removeAttachment({"_id": "a", "_attachment": "ab"}));
    }

    function removeSecondAttachmentAgainTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": "a",
        "message": "IndexeddbStorage, document attachment not found.",
        "method": "removeAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove inexistent attachment");
    }

    function removeDocument() {
      return jio.remove({"_id": "a"});
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
      return success(jio.getAttachment({"_id": "a", "_attachment": "aa"}));
    }

    function getInexistentFirstAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "aa",
        "error": "not_found",
        "id": "a",
        "message": "IndexeddbStorage, unable to get attachment.",
        "method": "getAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent first attachment");
    }

    function getInexistentDocument() {
      return success(jio.get({"_id": "a"}));
    }

    function getInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "IndexeddbStorage, unable to get document.",
        "method": "get",
        "reason": "Not Found",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent document");
    }

    function removeInexistentDocument() {
      return success(jio.remove({"_id": "a"}));
    }

    function removeInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "IndexeddbStorage, unable to get metadata.",
        "method": "remove",
        "reason": "Not Found",
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

 // # Post new documents, list them and remove them
 // post a 201
    postNewDocument().then(postNewDocumentTest).
     // get 200 
      then(getCreatedDocument).then(getCreatedDocumentTest).
     // post b 201
      then(postSpecificDocument).then(postSpecificDocumentTest).
     // allD 200 2 documents
      then(listDocument).then(list2DocumentsTest).
     // allD+include_docs 200 2 documents
      then(listDocumentsWithMetadata).then(list2DocumentsWithMetadataTest).
     // remove a 204
      then(removeCreatedDocument).then(removeCreatedDocumentTest).
     // remove b 204
      then(removeSpecificDocument).then(removeSpecificDocumentTest).
     // allD 200 empty storage
      then(listEmptyStorage).then(listEmptyStorageTest).
     // # Create and update documents, and some attachment and remove them
     // put 201
      then(putNewDocument).then(putNewDocumentTest).
     // get 200
      then(getCreatedDocument2).then(getCreatedDocument2Test).
     // post 409
      then(postSameDocument).then(postSameDocumentTest).
     // putA 404
      then(putAttachmentToNonExistentDocument).
      then(putAttachmentToNonExistentDocumentTest).
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
     // end 
      fail(unexpectedError).
      always(start).
      always(function () {
        server.restore();
      });
  });
}));
