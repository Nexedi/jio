/*
 * Copyright 2013, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */
/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, test_util, RSVP, test, ok, deepEqual, sinon, module, stop,
  start */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(RSVP, jIO);
}([
  'rsvp',
  'jio',
  'localstorage',
  'gidstorage'
], function (RSVP, jIO) {
  "use strict";

  module("GID Storage");

  function success(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      /*jslint unparam: true*/
      promise.then(resolve, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  /**
   * Test with a memory storage, the responses of gid storage should not be
   * related to memory storage ones.
   */
  test("Scenario", 29, function () {

    var jio = jIO.createJIO({
      "type": "gid",
      "constraints": {
        "default": {
          "created": "date",
          "title": "string",
          "type": "DCMIType"
        }
      },
      "sub_storage": {
        "type": "local",
        "username": "gidtest",
        "application_name": "jiotests",
        "mode": "memory"
      }
    }, {
      "workspace": {},
      "max_retry": 2
    });

    function postNewDocument() {
      return jio.post({
        "created": "2013-10-10",
        "title": "Unique ID",
        "type": "Text"
      });
    }

    function postNewDocumentTest(answer) {
      deepEqual(answer, {
        "id": '{"created":"2013-10-10","title":"Unique ID","type":"Text"}',
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post a new document");
    }

    function getCreatedDocument() {
      return jio.get({
        "_id": '{"created":"2013-10-10","title":"Unique ID","type":"Text"}'
      });
    }

    function getCreatedDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_id": '{"created":"2013-10-10","title":"Unique ID","type":"Text"}',
          "created": "2013-10-10",
          "title": "Unique ID",
          "type": "Text"
        },
        "id": '{"created":"2013-10-10","title":"Unique ID","type":"Text"}',
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get new document");
    }

    function postSpecificDocument() {
      return jio.post({
        "_id": '{"created":"2013-10-10","title":"Bee","type":"Text"}',
        "created": "2013-10-10",
        "title": "Bee",
        "type": "Text"
      });
    }

    function postSpecificDocumentTest(answer) {
      deepEqual(answer, {
        "id": '{"created":"2013-10-10","title":"Bee","type":"Text"}',
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post specific document");
    }

    function listDocuments() {
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
            "id": '{"created":"2013-10-10","title":"Unique ID","type":"Text"}',
            "value": {}
          }, {
            "id": '{"created":"2013-10-10","title":"Bee","type":"Text"}',
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
      return jio.remove({
        "_id": '{"created":"2013-10-10","title":"Unique ID","type":"Text"}'
      });
    }

    function removeCreatedDocumentTest(answer) {
      deepEqual(answer, {
        "id": '{"created":"2013-10-10","title":"Unique ID","type":"Text"}',
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove first document.");
    }

    function removeSpecificDocument() {
      return jio.remove({
        "_id": '{"created":"2013-10-10","title":"Bee","type":"Text"}'
      });
    }

    function removeSpecificDocumentTest(answer) {
      deepEqual(answer, {
        "id": '{"created":"2013-10-10","title":"Bee","type":"Text"}',
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
      return jio.put({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "created": "2013-10-10",
        "title": "Hey",
        "type": "Text"
      });
    }

    function putNewDocumentTest(answer) {
      deepEqual(answer, {
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "put",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Put new document");
    }

    function getCreatedDocument2() {
      return jio.get({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}'
      });
    }

    function getCreatedDocument2Test(answer) {
      deepEqual(answer, {
        "data": {
          "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
          "created": "2013-10-10",
          "title": "Hey",
          "type": "Text"
        },
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get new document");
    }

    function postSameDocument() {
      return success(jio.post({
        "created": "2013-10-10",
        "title": "Hey",
        "type": "Text"
      }));
    }

    function postSameDocumentTest(answer) {
      deepEqual(answer, {
        "error": "conflict",
        "message": "Cannot post document",
        "method": "post",
        "reason": "Document already exists",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Unable to post the same document (conflict)");
    }

    function createAttachment() {
      return jio.putAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
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
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "putAttachment",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Create new attachment");
    }

    function updateAttachment() {
      return jio.putAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
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
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "putAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Update last attachment");
    }

    function createAnotherAttachment() {
      return jio.putAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
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
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "putAttachment",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Create another attachment");
    }

    function updateLastDocument() {
      return jio.put({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "created": "2013-10-10",
        "title": "Hey",
        "type": "Text",
        "modified": "2013-10-11"
      });
    }

    function updateLastDocumentTest(answer) {
      deepEqual(answer, {
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Update document metadata");
    }

    function getFirstAttachment() {
      return jio.getAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "_attachment": "aa"
      });
    }

    function getFirstAttachmentTest(answer) {
      var blob = answer.data;
      answer.data = "<blob>";
      deepEqual(answer, {
        "attachment": "aa",
        "data": "<blob>",
        "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
          "0728e095ff24218119d51bd22475363",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
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
      return jio.getAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "_attachment": "ab"
      });
    }

    function getSecondAttachmentTest(answer) {
      var blob = answer.data;
      answer.data = "<blob>";
      deepEqual(answer, {
        "attachment": "ab",
        "data": "<blob>",
        "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
          "ed343e6c739e54131fcb3a56e4bc1bd",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
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
      return jio.get({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}'
      });
    }

    function getLastDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
          "created": "2013-10-10",
          "modified": "2013-10-11",
          "title": "Hey",
          "type": "Text",
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
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get last document metadata");
    }

    function removeSecondAttachment() {
      return jio.removeAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "_attachment": "ab"
      });
    }

    function removeSecondAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "removeAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove second document");
    }

    function getInexistentSecondAttachment() {
      return success(jio.getAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "_attachment": "ab"
      }));
    }

    function getInexistentSecondAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "message": "Cannot get attachment",
        "method": "getAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent second attachment");
    }

    function getOneAttachmentDocument() {
      return jio.get({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}'
      });
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
          "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
          "created": "2013-10-10",
          "modified": "2013-10-11",
          "title": "Hey",
          "type": "Text"
        },
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get document metadata");
    }

    function removeSecondAttachmentAgain() {
      return success(jio.removeAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "_attachment": "ab"
      }));
    }

    function removeSecondAttachmentAgainTest(answer) {
      deepEqual(answer, {
        "attachment": "ab",
        "error": "not_found",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "message": "Cannot remove attachment",
        "method": "removeAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove inexistent attachment");
    }

    function getInexistentDocument() {
      return success(jio.get({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}'
      }));
    }

    function getInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "message": "Cannot get document",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent document");
    }

    function removeDocument() {
      return jio.remove({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}'
      });
    }

    function removeDocumentTest(answer) {
      deepEqual(answer, {
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove document and its attachments");
    }

    function getInexistentFirstAttachment() {
      return success(jio.getAttachment({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "_attachment": "aa"
      }));
    }

    function getInexistentFirstAttachmentTest(answer) {
      deepEqual(answer, {
        "attachment": "aa",
        "error": "not_found",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "message": "Cannot get attachment",
        "method": "getAttachment",
        "reason": "Document already exists",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent first attachment");
    }

    function removeInexistentDocument() {
      return success(jio.remove({
        "_id": '{"created":"2013-10-10","title":"Hey","type":"Text"}'
      }));
    }

    function removeInexistentDocumentTest(answer) {
      deepEqual(answer, {
        "error": "not_found",
        "id": '{"created":"2013-10-10","title":"Hey","type":"Text"}',
        "message": "Cannot remove document",
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
      // post b 201
      then(postSpecificDocument).then(postSpecificDocumentTest).
      // // check b 204
      // then(checkDocument).then(checkDocumentTest).
      // // check storage 204
      // then(checkStorage).then(checkStorageTest).
      // allD 200 2 documents
      then(listDocuments).then(list2DocumentsTest).
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
      // end
      fail(unexpectedError).
      always(start);

  });

}));
