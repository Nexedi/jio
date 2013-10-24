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

  test("Scenario", function () {

    var LOCAL_STORAGE_SPEC = local_storage.createDescription(
      'indexstorage tests',
      'scenario',
      'memory'
    ), INDEX_STORAGE_SPEC = {
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["contributor"]},
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
            "key": "A",
            "value": {}
          }, {
            "id": "B",
            "key": "B",
            "value": {}
          }, {
            "id": "C",
            "key": "C",
            "value": {}
          }, {
            "id": "D",
            "key": "D",
            "value": {}
          }, {
            "id": "b",
            "key": "b",
            "value": {}
          }, {
            "id": "ce",
            "key": "ce",
            "value": {}
          }, {
            "id": "dee",
            "key": "dee",
            "value": {}
          }, {
            "id": shared.created_document_id,
            "key": shared.created_document_id,
            "value": {}
          }]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List 8 documents from local (4 document + 4 databases)");
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
          "total_rows": 7000,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "List empty indexes 'contributor'");

      deepEqual(answers[1], {
        "data": {
          "total_rows": 7000,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "List empty indexes 'title'");

      deepEqual(answers[2], {
        "data": {
          "total_rows": 7000,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "List empty indexes 'title', 'year'");

      deepEqual(answers[3], {
        "data": {
          "total_rows": 7000,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "List empty indexes 'author'");

      deepEqual(answers[4], {
        "data": {
          "total_rows": 7000,
          "rows": []
        },
        "method": "allDocs",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "List default empty indexes");
    }

    // // XXX the 2 following functions should be replaced by the 2 commented
    // // previous ones (which don't work yet)
    // function removeCreatedDocuments() {
    //   return sequence([function () {
    //     return jio_index.remove({"_id": shared.created_document_id});
    //   }, function () {
    //     return jio_index.remove({"_id": "b"});
    //   }, function () {
    //     return jio_index.remove({"_id": "ce"});
    //   }, function () {
    //     return jio_index.remove({"_id": "dee"});
    //   }]);
    // }

    // function removeCreatedDocumentsTest(last_answer) {
    //   deepEqual(last_answer, {
    //     "id": "dee",
    //     "method": "remove",
    //     "result": "success",
    //     "status": 204,
    //     "statusText": "No Content"
    //   }, "Remove first document, 'b', 'ce' and 'dee' (testing 'dee' only)");
    // }

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
      // remove a b ce dee 204
      then(removeCreatedDocuments).then(removeCreatedDocumentsTest).
      // allD 200 empty indexes
      then(listEmptyIndexes).then(listEmptyIndexesTest).

      // // # Create and update documents, and some attachment and remove them
      // // put 201
      // then(putNewDocument).then(putNewDocumentTest).
      // // get 200
      // then(getCreatedDocument2).then(getCreatedDocument2Test).
      // // post 409
      // then(postSameDocument).then(postSameDocumentTest).
      // // putA a 204
      // then(createAttachment).then(createAttachmentTest).
      // // putA a 204
      // then(updateAttachment).then(updateAttachmentTest).
      // // putA b 204
      // then(createAnotherAttachment).then(createAnotherAttachmentTest).
      // // put 204
      // then(updateLastDocument).then(updateLastDocumentTest).
      // // getA a 200
      // then(getFirstAttachment).then(getFirstAttachmentTest).
      // // getA b 200
      // then(getSecondAttachment).then(getSecondAttachmentTest).
      // // get 200
      // then(getLastDocument).then(getLastDocumentTest).
      // // removeA b 204
      // then(removeSecondAttachment).then(removeSecondAttachmentTest).
      // // getA b 404
      // then(getInexistentSecondAttachment).
      // then(getInexistentSecondAttachmentTest).
      // // get 200
      // then(getOneAttachmentDocument).then(getOneAttachmentDocumentTest).
      // // removeA b 404
      //then(removeSecondAttachmentAgain).then(removeSecondAttachmentAgainTest).
      // // remove 204
      // then(removeDocument).then(removeDocumentTest).
      // // getA a 404
      //then(getInexistentFirstAttachment)
      //.then(getInexistentFirstAttachmentTest).
      // // get 404
      // then(getInexistentDocument).then(getInexistentDocumentTest).
      // // remove 404
      // then(removeInexistentDocument).then(removeInexistentDocumentTest).
      // // check 204
      // //then(checkDocument).done(checkDocumentTest).
      // //then(checkStorage).done(checkStorageTest).
      fail(unexpectedError).
      always(start);

  });

}));
