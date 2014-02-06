/***********************************************************************
**   Written by Abdullatif Shikfa, Alcatel Lucent Bell-Labs France    **
**      With the invaluable help of Tristan Cavelier, Nexedi          **
**                        31/01/2014                                  **
***********************************************************************/

/*jslint indent: 2, maxlen: 80, nomen: true */
/*global module, test, stop, start, ok, deepEqual, RSVP, jIO, test_util, sjcl,
  define, Blob */

(function () {
  "use strict";

  var spec;
  spec = {
    "type": "searchableencryption",
    "url": "http://fakeserver",
    "password": "coincoin"
  };

  function reverse(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      promise.then(reject, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  jIO.util.ajax = (function () {
    /*jslint regexp: true */
    // TEST SERVER
    var dataBase, baseURLRe = /^http:\/\/fakeserver(\/[^\/]+)?(\/[^\/]+)?$/;
    dataBase = {};

    function bigModulo(arr, mod) {
      var i, result = 0, base = 1, maxIter = (2 * arr.length);
      for (i = 0; i < maxIter; i += 1) {
        result = result + (
          (sjcl.bitArray.bitSlice(arr, i * 16, (i + 1) * 16)[0]) % mod
        ) * base;
        base = (base * Math.pow(2, 16)) % mod;
      }
      result = result % mod;
      return result;
    }

    function test(id, encryptedQuery) {
      var j, result = true;
      for (j = 0; j < encryptedQuery.length; j += 1) {
        result = result && (dataBase[id].encryptedIndex[bigModulo(
          sjcl.hash.sha256.hash(encryptedQuery[j] + id),
          dataBase[id].encryptedIndex.length
        )] === 1);
      }
      return result;
    }

    function onPut(id, data) {
      dataBase[id] = dataBase[id] || {};
      dataBase[id].metadata = data.metadata;
      dataBase[id].encryptedIndex = data.encryptedIndex;
    }

    function onPost(id, data) {
      if (dataBase[id]) {
        throw new Error("Document already exists");
      }
      dataBase[id] = {};
      dataBase[id].metadata = data.metadata;
      dataBase[id].encryptedIndex = data.encryptedIndex;
    }

    //Caution: this method can throw an error if the document id does not
    //already exist
    //The attachment ID must not be metadata or encryptedIndex !
    function onPutAttachment(id, idAttachment, data) {
      dataBase[id][idAttachment] = data;
    }

    function onGet(id) {
      return dataBase[id].metadata;
    }

    function onGetAttachment(id, idAttachment) {
      return dataBase[id][idAttachment];
    }

    function onRemove(id) {
      delete dataBase[id];
    }

    function onRemoveAttachment(id, idAttachment) {
      delete dataBase[id][idAttachment];
    }

    function onAllDocs(encryptedQuery) {
      /*jslint forin: true */
      var id, result = [];
      for (id in dataBase) {
        if (test(id, encryptedQuery)) {
          result.push(dataBase[id].metadata);
        }
      }
      return result;
    }
    function FakeEvent(target) {
      this.target = target;
    }

    function ServerAjax(param) {
      return new RSVP.Promise(function (resolve, reject) {
        // param.type || "GET"
        // param.url
        // param.dataType (ignored)
        // param.headers (ignored)
        // param.beforeSend (ignored)
        // param.data
        var re_result = baseURLRe.exec(param.url), xhr = {};
        if (!re_result) {
          xhr.status = 1; // wrong url
          xhr.statusText = "Unknown";
          return reject(new FakeEvent(xhr));
        }
        if (re_result[1]) {
          re_result[1] = re_result[1].slice(1);
        }
        if (re_result[2]) {
          re_result[2] = re_result[2].slice(1);
        }
        xhr.status = 404;
        xhr.statusText = "Not Found";
        if (!param.type || param.type === "GET") {
          try {
            if (re_result[2]) {
              // jio.getAttachment
              xhr.response = new Blob([
                onGetAttachment(re_result[1], re_result[2])
              ]);
            } else {
              // jio.get
              xhr.response = onGet(re_result[1]);
              xhr.responseText = xhr.response;
            }
          } catch (e) {
            return reject(new FakeEvent(xhr));
          }
          xhr.status = 200;
          xhr.statusText = "OK";
          return resolve(new FakeEvent(xhr));
        }
        if (param.type === "DELETE") {
          try {
            if (re_result[2]) {
              // jio.removeAttachment
              onRemoveAttachment(re_result[1], re_result[2]);
            } else {
              // jio.remove
              onRemove(re_result[1]);
            }
          } catch (e2) {
            return reject(new FakeEvent(xhr));
          }
          xhr.status = 204;
          xhr.statusText = "No Content";
          return resolve(new FakeEvent(xhr));
        }
        xhr.status = 409;
        xhr.statusText = "Conflict";
        if (param.type === "POST") {
          try {
            if (re_result[1]) {
              // jio.post
              onPost(re_result[1], param.data);
            } else {
              // jio.allDocs
              xhr.response = onAllDocs(param.data.query);
            }
          } catch (e1) {
            return reject(new FakeEvent(xhr));
          }
          xhr.status = 200;
          xhr.statusText = "OK";
          return resolve(new FakeEvent(xhr));
        }
        if (param.type === "PUT") {
          try {
            if (re_result[2]) {
              // jio.putAttachment
              onPutAttachment(re_result[1], re_result[2], param.data);
            } else {
              // jio.put
              onPut(re_result[1], param.data);
            }
          } catch (e3) {
            return reject(new FakeEvent(xhr));
          }
          xhr.status = 204;
          xhr.statusText = "No Content";
          return resolve(new FakeEvent(xhr));
        }
      });
    }

    return ServerAjax;
  }());

  module("Searchable Encryption Storage");

  /**
   * Tested with local webDav server
   *
   * Used header are:
   * - Header always set Cache-Control "no-cache" # "private", "public",
   *   "<seconds>" or "no-store" ("no-cache")
   * - Header always set Access-Control-Max-Age "0"
   * - Header always set Access-Control-Allow-Credentials "true"
   * - Header always set Access-Control-Allow-Origin "*"
   * - Header always set Access-Control-Allow-Methods "OPTIONS, GET, HEAD,
   *   POST, PUT, DELETE, PROPFIND"
   * - Header always set Access-Control-Allow-Headers "Content-Type,
   *   X-Requested-With, X-HTTP-Method-Override, Accept, Authorization,
   *   Depth"
   */
  test("Scenario", function () {

    var jio = jIO.createJIO(spec, {
      "workspace": {},
      "max_retry": 2
    });

    stop();

    function getCreatedDocument() {
      return jio.get({"_id": "a"});
    }

    function getCreatedDocumentTest(answer) {
      deepEqual(answer, {
        "data": {
          "_id": "a",
          "title": "Hey",
          "keywords": ["1", "2", "3"]
        },
        "id": "a",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get new document");
    }

    function listDocuments() {
      return jio.allDocs({"query": "1"});
    }

    function listDocumentsTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a) {
          return a.id === "b" ? 1 : 0;
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 2,
          "rows": [{
            "id": "a",
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

    function listDocumentsTest2(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a) {
          return a.id === "b" ? 1 : 0;
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 1,
          "rows": [{
            "id": "b",
            "value": {}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 1 document");
    }
    function listOneDocument() {
      return jio.allDocs({"query": "2"});
    }

    function listOneDocumentTest(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a) {
          return a.id === "b" ? 1 : 0;
        });
      }
      deepEqual(answer, {
        "data": {
          "total_rows": 1,
          "rows": [{
            "id": "a",
            "value": {}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 1 document");
    }

    function listOneDocumentTest2(answer) {
      if (answer && answer.data && Array.isArray(answer.data.rows)) {
        answer.data.rows.sort(function (a) {
          return a.id === "b" ? 1 : 0;
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
      }, "List 0 document");
    }

    function removeCreatedDocument() {
      return jio.remove({"_id": "a"});
    }

    function removeCreatedDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove first document.");
    }

    function putNewDocument() {
      return jio.put({
        "_id": "a",
        "title": "Hey",
        "keywords": ["1", "2", "3"]
      });
    }

    function putNewDocumentTest(answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Put new document");
    }

    function postNewDocument() {
      return jio.post({
        "_id": "b",
        "title": "Hello",
        "keywords": ["1", "4", "5"]
      });
    }

    function postNewDocumentTest(answer) {
      deepEqual(answer, {
        "id": "b",
        "method": "post",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Post new document");
    }

    function postCreatedDocument() {
      return reverse(jio.post({
        "_id": "b",
        "title": "Hello",
        "keywords": ["1", "4", "5"]
      }));
    }

    function postCreatedDocumentTest(answer) {
      deepEqual(answer, {
        "error": "conflict",
        "id": "b",
        "message": "Document update from server failed",
        "method": "post",
        "reason": "Conflict",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Post new document failed -> conflict 409");
    }

    function putNewDocument2() {
      return jio.put({
        "_id": "b",
        "title": "Hello",
        "keywords": ["1", "4", "5"]
      });
    }

    function putNewDocument2Test(answer) {
      deepEqual(answer, {
        "id": "b",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Put new document");
    }

    function getCreatedDocument2() {
      return jio.get({"_id": "a"});
    }

    function getCreatedDocument2Test(answer) {
      deepEqual(answer, {
        "data": {
          "_id": "a",
          "keywords": [
            "1",
            "2",
            "3"
          ],
          "title": "Hey"
        },
        "id": "a",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get new document");
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
        "id": "a",
        "method": "putAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Create another attachment");
    }

    function updateLastDocument() {
      return jio.put({"_id": "a", "title": "Hoo", "keywords": ["1", "2", "3"]});
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
    // put a 204
    putNewDocument().then(putNewDocumentTest).
      // post b 204
      then(postNewDocument).then(postNewDocumentTest).
      // post a 409
      then(postCreatedDocument).then(postCreatedDocumentTest).
      // get a 200
      then(getCreatedDocument).then(getCreatedDocumentTest).
      // put b 204
      then(putNewDocument2).then(putNewDocument2Test).
      // allD 200 2 documents
      then(listDocuments).then(listDocumentsTest).
      // allD 200 1 document
      then(listOneDocument).then(listOneDocumentTest).
      // remove a 204
      then(removeCreatedDocument).then(removeCreatedDocumentTest).
      // allD 200 1 document
      then(listDocuments).then(listDocumentsTest2).
      // allD 200 0 document
      then(listOneDocument).then(listOneDocumentTest2).
      // put a 204
      then(putNewDocument).then(putNewDocumentTest).
      // putA a 204
      then(createAttachment).then(createAttachmentTest).
      // putA a 204
      then(updateAttachment).then(updateAttachmentTest).
      // putA b 204
      then(createAnotherAttachment).then(createAnotherAttachmentTest).
      // get 200
      then(getCreatedDocument2).then(getCreatedDocument2Test).
      // put 204
      then(updateLastDocument).then(updateLastDocumentTest).


      /*      // post b 201
      then(postSpecificDocument).then(postSpecificDocumentTest).
      // post 409
      then(postSameDocument).then(postSameDocumentTest).
      // getA a 200
//      then(getFirstAttachment).then(getFirstAttachmentTest).
      // getA b 200
//      then(getSecondAttachment).then(getSecondAttachmentTest).
      // get 200
      then(getLastDocument).then(getLastDocumentTest).
      // removeA b 204
//      then(removeSecondAttachment).then(removeSecondAttachmentTest).
      // getA b 404
//      then(getInexistentSecondAttachment).
//      then(getInexistentSecondAttachmentTest).
      // get 200
//      then(getOneAttachmentDocument).then(getOneAttachmentDocumentTest).
      // removeA b 404
//      then(removeSecondAttachmentAgain).then(removeSecondAttachmentAgainTest).
      // remove 204
//      then(removeDocument).then(removeDocumentTest).
      // getA a 404
//    then(getInexistentFirstAttachment).then(getInexistentFirstAttachmentTest).
      // get 404
//      then(getInexistentDocument).then(getInexistentDocumentTest).
      // remove 404
//      then(removeInexistentDocument).then(removeInexistentDocumentTest).
      // check 204
      //then(checkDocument).done(checkDocumentTest).
      //then(checkStorage).done(checkStorageTest).*/
      fail(unexpectedError).
      always(start);
//      always(server.restore.bind(server));
  });

}());
