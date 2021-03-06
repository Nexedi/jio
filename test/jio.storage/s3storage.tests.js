/*jslint indent: 2, maxlen: 80, nomen: true */
/*global module, test, stop, start, expect, ok, deepEqual, location, sinon,
  davstorage_spec, RSVP, jIO, test_util, dav_storage, btoa, s3storage_spec */

(function () {
  "use strict";

  var spec, use_fake_server = true;
  if (typeof s3storage_spec === 'object') {
    use_fake_server = false;
    spec = s3storage_spec;
  }

  module("S3 Storage");

  function success(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      /*jslint unparam: true*/
      promise.then(resolve, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  test("Scenario", function () {

    var server, responses = [], shared = {}, jio = jIO.createJIO(spec, {
      "workspace": {},
      "max_retry": 2
    });

    stop();

    if (use_fake_server) {
      /*jslint regexp: true */
      server = sinon.fakeServer.create();
      server.autoRespond = true;
      server.autoRespondAfter = 5;
      server.respondWith(/.*/, function (xhr) {
        var response = responses.shift();
        if (response) {
          return xhr.respond.apply(xhr, response);
        }
        ok(false, "No response associated to the latest request!");
      });
    } else {
      responses.push = function () {
        return;
      };
      server = {restore: function () {
        return;
      }};
    }

    function postNewDocument() {
      responses.push([404, {}, '']); // GET
      responses.push([201, {}, '']); // PUT
      return jio.post({"title": "Unique ID"});
    }

    function postNewDocumentTest(answer) {
      var uuid = answer.id;
      answer.id = "<uuid>";
      deepEqual(answer, {
        "id": "<uuid>",
        "method": "post",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Post a new document");
      //ok(/^no_document_id_[0-9]+$/.test(uuid),
      //"New document id should look like no_document_id_479658600408584 : " +
      //uuid);
      //shared.created_document_id = uuid;
      ok(test_util.isUuid(uuid), "New document id should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
      shared.created_document_id = uuid;
    }

    function getCreatedDocument() {
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": shared.created_document_id,
        "title": "Unique ID"
      })]); // GET
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
      responses.push([404, {}, '']); // GET
      responses.push([201, {}, '']); // PUT
      return jio.post({"_id": "b", "title": "Bee"});
    }

    function postSpecificDocumentTest(answer) {
      deepEqual(answer, {
        "id": "b",
        "method": "post",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Post specific document");
    }

    function listDocuments() {
      //quelle utilité à pousser le xml ?
      responses.push([
        200,
        {"Content-Type": "text/xml"}, ''
      ]); // PROPFIND
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

    function removeCreatedDocument() {
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": shared.created_document_id,
        "title": "Unique ID"
      })]); // GET
      responses.push([204, {}, '']); // DELETE
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "b",
        "title": "Bee"
      })]); // GET
      responses.push([204, {}, '']); // DELETE
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
      responses.push([
        200,
        {"Content-Type": "text/xml"},
        ''
      ]); // PROPFIND
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
      responses.push([404, {}, '']); // GET
      responses.push([200, {}, '']); // PUT
      return jio.put({"_id": "a", "title": "Hey"});
    }

    function putNewDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "put",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Put new document");
    }

    function getCreatedDocument2() {
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hey"
      })]); // GET
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hey"
      })]); // GET
      return success(jio.post({"_id": "a", "title": "Hoo"}));
    }

    function postSameDocumentTest(answer) {
      deepEqual(answer, {
        "error": "conflict",
        "id": "a",
        "message": "Cannot create document",
        "method": "post",
        "reason": "Document already exists",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Unable to post the same document (conflict)");
    }

    function createAttachment() {
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hey"
      })]); // GET
      responses.push([201, {}, '']); // PUT (attachment)
      responses.push([204, {}, '']); // PUT (metadata)
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hey",
        "_attachments": {
          "aa": {
            "content_type": "text/plain",
            "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
              "0728e095ff24218119d51bd22475363",
            "length": 3
          }
        }
      })]); // GET
      responses.push([204, {}, '']); // PUT (attachment)
      responses.push([204, {}, '']); // PUT (metadata)
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hey",
        "_attachments": {
          "aa": {
            "content_type": "text/plain",
            "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
              "0728e095ff24218119d51bd22475363",
            "length": 3
          }
        }
      })]); // GET
      responses.push([201, {}, '']); // PUT (attachment)
      responses.push([204, {}, '']); // PUT (metadata)
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hey",
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
      })]); // GET
      responses.push([204, {}, '']); // PUT
      return jio.put({"_id": "a", "title": "Hoo"});
    }

    function updateLastDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "put",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Update document metadata");
    }

    function getFirstAttachment() {
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
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
      })]); // GET
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, "aab"]); // GET
      return jio.getAttachment({"_id": "a", "_attachment": "aa"});
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
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
      })]); // GET
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, "aba"]); // GET
      return jio.getAttachment({"_id": "a", "_attachment": "ab"});
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
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
      })]); // GET
      return jio.get({"_id": "a"});
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
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
      })]); // GET
      responses.push([204, {}, '']); // PUT
      responses.push([204, {}, '']); // DELETE
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hoo",
        "_attachments": {
          "aa": {
            "content_type": "text/plain",
            "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
              "0728e095ff24218119d51bd22475363",
            "length": 3
          }
        }
      })]); // GET
      return success(jio.getAttachment({"_id": "a", "_attachment": "ab"}));
    }

    function getInexistentSecondAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": "a",
        "message": "File does not exist",
        "method": "getAttachment",
        "reason": "Not Found",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent second attachment");
    }

    function getOneAttachmentDocument() {
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hoo",
        "_attachments": {
          "aa": {
            "content_type": "text/plain",
            "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
              "0728e095ff24218119d51bd22475363",
            "length": 3
          }
        }
      })]); // GET
      return jio.get({"_id": "a"});
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
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hoo",
        "_attachments": {
          "aa": {
            "content_type": "text/plain",
            "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
              "0728e095ff24218119d51bd22475363",
            "length": 3
          }
        }
      })]); // GET
      return success(jio.removeAttachment({"_id": "a", "_attachment": "ab"}));
    }

    function removeSecondAttachmentAgainTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": "a",
        "message": "This Attachment does not exist",
        "method": "removeAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove inexistent attachment");
    }

    function removeDocument() {
      responses.push([200, {
        "Content-Type": "application/octet-stream"
      }, JSON.stringify({
        "_id": "a",
        "title": "Hoo",
        "_attachments": {
          "aa": {
            "content_type": "text/plain",
            "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
              "0728e095ff24218119d51bd22475363",
            "length": 3
          }
        }
      })]); // GET
      responses.push([204, {}, '']); // DELETE (metadata)
      responses.push([204, {}, '']); // DELETE (attachment aa)
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
      responses.push([404, {}, '']); // GET
      return success(jio.getAttachment({"_id": "a", "_attachment": "aa"}));
    }

    function getInexistentFirstAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "aa",
        "error": "not_found",
        "id": "a",
        "message": "File does not exist",
        "method": "getAttachment",
        "reason": "Not Found",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent first attachment");
    }

    function getInexistentDocument() {
      responses.push([404, {}, '']); // GET
      return success(jio.get({"_id": "a"}));
    }

    function getInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "File does not exist",
        "method": "get",
        "reason": "Not Found",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent document");
    }

    function removeInexistentDocument() {
      responses.push([404, {}, '']); // GET
      return success(jio.remove({"_id": "a"}));
    }

    function removeInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": "a",
        "message": "File does not exist",
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
      //postSpecificDocument().then(postSpecificDocumentTest).
      // allD 200 2 documents
      then(listDocuments).then(list2DocumentsTest).
      //listDocuments().then(list2DocumentsTest).
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
      // check 204
      //then(checkDocument).done(checkDocumentTest).
      //then(checkStorage).done(checkStorageTest).
      fail(unexpectedError).
      always(start).
      always(server.restore.bind(server));

  });

  module("SplitStorage + S3 Storage");


}());
