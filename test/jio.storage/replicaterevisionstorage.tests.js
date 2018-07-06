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
/*global define, jIO, test_util, hex_sha256, test, ok, deepEqual, sinon,
  expect, module, stop, start, RSVP */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, test_util, {hex_sha256: hex_sha256}, RSVP);
}([
  'jio',
  'test_util',
  'sha256',
  'rsvp',
  'localstorage',
  'revisionstorage',
  'replicaterevisionstorage'
], function (jIO, util, sha256, RSVP) {
  "use strict";

  //////////////////////////////////////////////////////////////////////////////
  // Tools

  var tool = {
    "deepClone": jIO.util.deepClone,
    "uniqueJSONStringify": jIO.util.uniqueJSONStringify,
    "readBlobAsBinaryString": jIO.util.readBlobAsBinaryString
  };

  function reverse(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      promise.then(reject, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  function generateRevisionHash(doc, revisions, deleted_flag) {
    var string;
    doc = tool.deepClone(doc);
    delete doc._rev;
    delete doc._revs;
    delete doc._revs_info;
    string = tool.uniqueJSONStringify(doc) +
      tool.uniqueJSONStringify(revisions) +
      JSON.stringify(deleted_flag ? true : false);
    return sha256.hex_sha256(string);
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

  //////////////////////////////////////////////////////////////////////////////
  // Tests

  module("Replicate Revision Storage");

  function testReplicateRevisionStorage(jio_description) {

    var shared = {}, jio, jio_leaves = [];
    shared.workspace = {};
    jio = jIO.createJIO(jio_description, {"workspace": shared.workspace});

    function leavesAction(action, storage_description) {
      var i;
      if (storage_description.type === "replicaterevision") {
        // it is the replicate revision storage tree
        for (i = 0; i < storage_description.storage_list.length; i += 1) {
          leavesAction(action, storage_description.storage_list[i]);
        }
      } else if (storage_description.type === "revision") {
        // it is the revision storage tree
        leavesAction(action, storage_description.sub_storage);
      } else {
        // it is the storage tree leaf
        action(storage_description);
      }
    }

    leavesAction(function (storage_description) {
      jio_leaves.push(jIO.createJIO(storage_description, {
        "workspace": shared.workspace
      }));
    }, jio_description);

    jio_leaves.run = function (method, argument) {
      var i, promises = [];
      for (i = 0; i < this.length; i += 1) {
        promises[i] = this[i][method].apply(
          this[i],
          argument
        );
      }
      return RSVP.all(promises);
    };
    jio_leaves.get = function () {
      return this.run("get", arguments);
    };
    jio_leaves.allDocs = function () {
      return this.run("allDocs", arguments);
    };

    stop();

    // post a new document without id
    shared.doc = {"title": "post document without id"};

    jio.post(shared.doc).then(function (answer) {

      shared.revisions = {"start": 0, "ids": []};
      shared.uuid = answer.id;
      shared.rev = answer.rev;
      shared.rev_hash = shared.rev.slice(2);
      shared.doc._id = shared.uuid;
      ok(util.isUuid(shared.uuid), "Uuid should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + shared.uuid);
      deepEqual(answer, {
        "id": shared.uuid,
        "method": "post",
        "result": "success",
        "rev": "1-" + generateRevisionHash(shared.doc, shared.revisions),
        "status": 201,
        "statusText": "Created"
      }, "Post document (without id)");
      delete shared.doc._id;

      return jio_leaves.get({"_id": shared.uuid + "." + shared.rev});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, {
          "_id": shared.uuid + "." + shared.rev,
          "title": "post document without id"
        }, "Check document " + (i + 1));
      }

      return jio.get({"_id": shared.uuid}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": shared.uuid,
        "_rev": shared.rev,
        "_revisions": {
          "ids": [shared.rev_hash],
          "start": 1
        },
        "_revs_info": [{
          "rev": shared.rev,
          "status": "available"
        }],
        "title": "post document without id"
      }, "Get the generated document, the winner");

      // post a new document with id
      shared.doc = {"_id": "doc1", "title": "post new doc with id"};
      shared.rev1_1_hash = generateRevisionHash(shared.doc, shared.revisions);
      shared.rev1_1 = "1-" + shared.rev1_1_hash;
      shared.rev1_1_history = {"start": 1, "ids": [shared.rev1_1_hash]};
      shared.rev1_1_revs_info = [{"rev": shared.rev1_1, "status": "available"}];

      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "post",
        "result": "success",
        "rev": shared.rev1_1,
        "status": 201,
        "statusText": "Created"
      }, "Post new document with an id");

      //  /
      //  |
      // 1-1

      // check document
      return jio_leaves.get({"_id": "doc1." + shared.rev1_1});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, {
          "_id": "doc1." + shared.rev1_1,
          "title": "post new doc with id"
        }, "Check document " + (i + 1));
      }

      // get the post document without revision
      return jio.get({"_id": "doc1"}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "doc1",
        "_rev": shared.rev1_1,
        "_revisions": {"start": 1, "ids": [shared.rev1_1_hash]},
        "_revs_info": [{"rev": shared.rev1_1, "status": "available"}],
        "title": "post new doc with id"
      }, "Get the previous document (without revision)");

      // post same document without revision
      shared.doc = {
        "_id": "doc1",
        "title": "post same document without revision"
      };
      shared.rev1_2_hash = generateRevisionHash(shared.doc, shared.revisions);
      shared.rev1_2 = "1-" + shared.rev1_2_hash;
      shared.rev1_2_history = {"start": 1, "ids": [shared.rev1_2_hash]};
      shared.rev1_2_revs_info = [{"rev": shared.rev1_2, "status": "available"}];

      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "post",
        "result": "success",
        "rev": shared.rev1_2,
        "status": 201,
        "statusText": "Created"
      }, "Post same document (without revision)");

      //    /
      //   / \
      // 1-1 1-2

      // check document
      return jio_leaves.get({"_id": "doc1." + shared.rev1_2});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, {
          "_id": "doc1." + shared.rev1_2,
          "title": "post same document without revision"
        }, "Check document " + (i + 1));
      }

      // post a new revision
      shared.doc = {
        "_id": "doc1",
        "title": "post new revision",
        "_rev": shared.rev1_2
      };
      shared.revisions.start += 1;
      shared.revisions.ids.unshift(shared.rev1_2_hash);
      shared.rev2_3_hash = generateRevisionHash(shared.doc, shared.revisions);
      shared.rev2_3 = "2-" + shared.rev2_3_hash;
      shared.rev2_3_history = tool.deepClone(shared.rev1_2_history);
      shared.rev2_3_history.start += 1;
      shared.rev2_3_history.ids.unshift(shared.rev2_3_hash);
      shared.rev2_3_revs_info = tool.deepClone(shared.rev1_2_revs_info);
      shared.rev2_3_revs_info.unshift({
        "rev": shared.rev2_3,
        "status": "available"
      });

      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "post",
        "result": "success",
        "rev": shared.rev2_3,
        "status": 201,
        "statusText": "Created"
      }, "Post document (with revision)");

      //    /
      //   / \
      // 1-1 1-2
      //      |
      //     2-3

      // check document
      return jio_leaves.get({"_id": "doc1." + shared.rev2_3});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, {
          "_id": "doc1." + shared.rev2_3,
          "title": "post new revision"
        }, "Check document " + (i + 1));
      }

      // get the post document with revision
      return jio.get({"_id": "doc1", "_rev": shared.rev1_2}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "doc1",
        "_rev": shared.rev1_2,
        "_revisions": {"start": 1, "ids": [shared.rev1_2_hash]},
        "_revs_info": [{"rev": shared.rev1_2, "status": "available"}],
        "_conflicts": [shared.rev1_1],
        "title": "post same document without revision"
      }, "Get the previous document (with revision)");

      // put document without rev
      shared.doc = {"_id": "doc1", "title": "put new document"};
      shared.rev1_4_hash = generateRevisionHash(shared.doc, {
        "start": 0,
        "ids": []
      });
      shared.rev1_4 = "1-" + shared.rev1_4_hash;
      shared.rev1_4_history = {"start": 1, "ids": [shared.rev1_4_hash]};
      shared.rev1_4_revs_info = [{"rev": shared.rev1_4, "status": "available"}];

      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "put",
        "result": "success",
        "rev": shared.rev1_4,
        "status": 204,
        "statusText": "No Content"
      }, "Put document without rev");

      //    __/__
      //   /  |  \
      // 1-1 1-2 1-4
      //      |
      //     2-3

      // put new revision
      shared.doc = {
        "_id": "doc1",
        "title": "put new revision",
        "_rev": shared.rev1_4
      };
      shared.rev2_5_hash =
        generateRevisionHash(shared.doc, shared.rev1_4_history);
      shared.rev2_5 = "2-" + shared.rev2_5_hash;
      shared.rev2_5_history = {
        "start": 2,
        "ids": [shared.rev2_5_hash, shared.rev1_4_hash]
      };
      shared.rev2_5_revs_info = tool.deepClone(shared.rev1_4_revs_info);
      shared.rev2_5_revs_info.unshift({
        "rev": shared.rev2_5,
        "status": "available"
      });

      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "put",
        "result": "success",
        "rev": shared.rev2_5,
        "status": 204,
        "statusText": "No Content"
      }, "Put new revision");

      //    __/__
      //   /  |  \
      // 1-1 1-2 1-4
      //      |   |
      //     2-3 2-5

      // putAttachment to inexistent document
      shared.doc = {
        "_id": "doc2",
        "_content_type": "text/plain",
        "_data": "doc 2 - attachment 1",
        "_attachment": "attachment1"
      };
      shared.rev_hash = generateRevisionHash(shared.doc, {
        "start": 0,
        "ids": []
      });
      shared.rev = "1-" + shared.rev_hash;

      return jio.putAttachment(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "attachment1",
        "id": "doc2",
        "method": "putAttachment",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content"
      }, "Put an attachment to an inexistent document");

      // putAttachment
      shared.doc = {
        "_id": "doc1",
        "_content_type": "text/plain",
        "_data": "doc 1 - attachment 1",
        "_attachment": "attachment1",
        "_rev": shared.rev2_5
      };
      shared.attmt1_digest = "sha256-7b6f6ec759b90a0d2aea0b2a6172544c904c6722" +
        "1a04fb871477825db92c42ff";
      shared.rev3_6_hash =
        generateRevisionHash(shared.doc, shared.rev2_5_history);
      shared.rev3_6 = "3-" + shared.rev3_6_hash;
      shared.rev3_6_history = tool.deepClone(shared.rev2_5_history);
      shared.rev3_6_history.start += 1;
      shared.rev3_6_history.ids.unshift(shared.rev3_6_hash);
      shared.rev3_6_revs_info = tool.deepClone(shared.rev2_5_revs_info);
      shared.rev3_6_revs_info.unshift({
        "rev": shared.rev3_6,
        "status": "available"
      });

      return jio.putAttachment(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "attachment1",
        "id": "doc1",
        "method": "putAttachment",
        "result": "success",
        "rev": shared.rev3_6,
        "status": 204,
        "statusText": "No Content"
      }, "Put an attachment to the first document");

      //    __/__
      //   /  |  \
      // 1-1 1-2 1-4
      //      |   |
      //     2-3 2-5
      //          |
      //        3-6+a1

      // get document
      return jio.get({"_id": "doc1"}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "doc1",
        "_rev": shared.rev3_6,
        "_revisions": shared.rev3_6_history,
        "_revs_info": shared.rev3_6_revs_info,
        "_conflicts": [shared.rev2_3, shared.rev1_1],
        "_attachments": {
          "attachment1": {
            "length": "doc 1 - attachment 1".length,
            "content_type": "text/plain",
            "digest": shared.attmt1_digest
          }
        },
        "title": "put new revision"
      }, "Get document, the winner");

      // get winner attachment
      return jio.getAttachment({
        "_id": "doc1",
        "_attachment": "attachment1"
      });

    }).then(function (answer) {
      return tool.readBlobAsBinaryString(answer.data);
    }).then(function (event) {

      deepEqual(event.target.result, "doc 1 - attachment 1",
                "Get the winner's attachment");

      // put document
      shared.doc = {
        "_id": "doc1",
        "_rev": shared.rev3_6,
        "title": "Put revision, attachment must be copied"
      };
      shared.rev4_7_hash =
        generateRevisionHash(shared.doc, shared.rev3_6_history);
      shared.rev4_7 = "4-" + shared.rev4_7_hash;
      shared.rev4_7_history = tool.deepClone(shared.rev3_6_history);
      shared.rev4_7_history.start += 1;
      shared.rev4_7_history.ids.unshift(shared.rev4_7_hash);
      shared.rev4_7_revs_info = tool.deepClone(shared.rev3_6_revs_info);
      shared.rev4_7_revs_info.unshift({
        "rev": shared.rev4_7,
        "status": "available"
      });

      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "put",
        "result": "success",
        "rev": shared.rev4_7,
        "status": 204,
        "statusText": "No Content"
      }, "Update document, attachment should be copied");

      //    __/__
      //   /  |  \
      // 1-1 1-2 1-4
      //      |   |
      //     2-3 2-5
      //          |
      //        3-6+a1
      //          |
      //        4-7+a1

      // get document, attachment must be copied
      shared.doc = {
        "_id": "doc1",
        "_rev": shared.rev4_7,
        "title": shared.doc.title,
        "_attachments": {
          "attachment1": {
            "length": "doc 1 - attachment 1".length,
            "content_type": "text/plain",
            "digest": shared.attmt1_digest
          }
        },
        "_conflicts": [shared.rev2_3, shared.rev1_1],
        "_revisions": shared.rev4_7_history,
        "_revs_info": shared.rev4_7_revs_info
      };

      return jio.get({"_id": "doc1"}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc,
                "Get the new winner document and its attachment metadata");

      // get winner attachment
      return jio.getAttachment({
        "_id": "doc1",
        "_attachment": "attachment1"
      });

    }).then(function (answer) {
      return tool.readBlobAsBinaryString(answer.data);
    }).then(function (event) {

      deepEqual(event.target.result, "doc 1 - attachment 1",
                "Get the winner's attachment again");

      // remove attachment
      shared.doc = {
        "_id": "doc1",
        "_attachment": "attachment1",
        "_rev": shared.rev4_7
      };
      shared.rev5_8_hash =
        generateRevisionHash(shared.doc, shared.rev4_7_history);
      shared.rev5_8 = "5-" + shared.rev5_8_hash;
      shared.rev5_8_history = tool.deepClone(shared.rev4_7_history);
      shared.rev5_8_history.start += 1;
      shared.rev5_8_history.ids.unshift(shared.rev5_8_hash);
      shared.rev5_8_revs_info = tool.deepClone(shared.rev4_7_revs_info);
      shared.rev5_8_revs_info.unshift({
        "rev": shared.rev5_8,
        "status": "available"
      });

      return jio.removeAttachment(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "attachment1",
        "id": "doc1",
        "method": "removeAttachment",
        "result": "success",
        "rev": shared.rev5_8,
        "status": 204,
        "statusText": "No Content"
      }, "Remove attachment");

      //    __/__
      //   /  |  \
      // 1-1 1-2 1-4
      //      |   |
      //     2-3 2-5
      //          |
      //        3-6+a1
      //          |
      //        4-7+a1
      //          |
      //         5-8

      // get document to check attachment existence
      shared.doc = {
        "_id": "doc1",
        "_rev": shared.rev5_8,
        "title": "Put revision, attachment must be copied",
        "_conflicts": [shared.rev2_3, shared.rev1_1],
        "_revisions": shared.rev5_8_history,
        "_revs_info": shared.rev5_8_revs_info
      };

      return jio.get({"_id": "doc1"}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc,
                "Get the new winner document, no attachment must be provided");

      // get specific document
      shared.doc = {
        "_id": "doc1",
        "_rev": shared.rev4_7,
        "title": shared.doc.title,
        "_attachments": {
          "attachment1": {
            "length": "doc 1 - attachment 1".length,
            "content_type": "text/plain",
            "digest": shared.attmt1_digest
          }
        },
        "_conflicts": [shared.rev2_3, shared.rev1_1],
        "_revisions": shared.rev4_7_history,
        "_revs_info": shared.rev4_7_revs_info
      };

      return jio.get({"_id": "doc1", "_rev": shared.rev4_7}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc,
                "Get specific revision and its attachment metadata");

      // get inexistent attachment
      return reverse(jio.getAttachment({
        "_id": "doc1",
        "_attachment": "attachment1"
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "attachment1",
        "error": "not_found",
        "id": "doc1",
        "message": "Unable to get an inexistent attachment",
        "method": "getAttachment",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent winner attachment -> 404 Not Found");

      // get specific attachment
      shared.doc = {
        "_id": "doc1",
        "_attachment": "attachment1",
        "_rev": shared.rev3_6
      };
      return jio.getAttachment(shared.doc);

    }).then(function (answer) {
      return tool.readBlobAsBinaryString(answer.data);
    }).then(function (event) {

      deepEqual(event.target.result, "doc 1 - attachment 1",
                "Get a specific attachment");

      // remove specific document and conflict
      shared.doc = {"_id": "doc1", "_rev": shared.rev1_1};
      // generate with deleted_flag
      shared.rev2_9_hash =
        generateRevisionHash(shared.doc, shared.rev1_1_history, true);
      shared.rev2_9 = "2-" + shared.rev2_9_hash;
      shared.rev2_9_history = tool.deepClone(shared.rev1_1_history);
      shared.rev2_9_history.start += 1;
      shared.rev2_9_history.ids.unshift(shared.rev2_9_hash);
      shared.rev2_9_revs_info = tool.deepClone(shared.rev1_1_revs_info);
      shared.rev2_9_revs_info.unshift({
        "rev": shared.rev2_9,
        "status": "deleted"
      });

      return jio.remove(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "remove",
        "result": "success",
        "rev": shared.rev2_9,
        "status": 204,
        "statusText": "No Content"
      }, "Remove specific document, and one conflict");

      //    __/___
      //   /   |  \
      // 1-1  1-2 1-4
      //  |    |   |
      // D2-9 2-3 2-5
      //           |
      //         3-6+a1
      //           |
      //         4-7+a1
      //           |
      //          5-8

      // remove specific document and conflict
      shared.doc = {"_id": "doc1", "_rev": shared.rev2_3};
      shared.rev3_10_hash =
        generateRevisionHash(shared.doc, shared.rev2_3_history, true);
      shared.rev3_10 = "3-" + shared.rev3_10_hash;
      shared.rev3_10_history = tool.deepClone(shared.rev2_3_history);
      shared.rev3_10_history.start += 1;
      shared.rev3_10_history.ids.unshift(shared.rev3_10_hash);
      shared.rev3_10_revs_info = tool.deepClone(shared.rev2_3_revs_info);
      shared.rev3_10_revs_info.unshift({
        "rev": shared.rev3_10,
        "status": "deleted"
      });

      return jio.remove(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "remove",
        "result": "success",
        "rev": shared.rev3_10,
        "status": 204,
        "statusText": "No Content"
      }, "Remove anther specific document, and one conflict");

      //    ___/____
      //   /   |    \
      // 1-1  1-2   1-4
      //  |    |     |
      // D2-9 2-3   2-5
      //       |     |
      //     D3-10 3-6+a1
      //             |
      //           4-7+a1
      //             |
      //            5-8

      // get document no more conflict
      shared.doc = {
        "_id": "doc1",
        "_rev": shared.rev5_8,
        "title": "Put revision, attachment must be copied",
        "_revisions": shared.rev5_8_history,
        "_revs_info": shared.rev5_8_revs_info
      };

      return jio.get({"_id": "doc1"}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc,
               "Get the new winner document, no more conflicts");

      // remove document
      shared.doc = {
        "_id": "doc1",
        "_rev": shared.rev5_8
      };
      shared.rev6_11_hash =
        generateRevisionHash(shared.doc, shared.rev5_8_history, true);
      shared.rev6_11 = "6-" + shared.rev6_11_hash;

      return jio.remove(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "remove",
        "result": "success",
        "rev": shared.rev6_11,
        "status": 204,
        "statusText": "No Content"
      }, "Remove the last document");

      //    ___/____
      //   /   |    \
      // 1-1  1-2   1-4
      //  |    |     |
      // D2-9 2-3   2-5
      //       |     |
      //     D3-10 3-6+a1
      //             |
      //           4-7+a1
      //             |
      //            5-8
      //             |
      //           D6-11

      // get inexistent document
      return reverse(jio.get({"_id": "doc3"}, {
        "conflicts": true,
        "revs": true,
        "revisions": true
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "doc3",
        "message": "Document not found",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent document -> 404 Not Found");

      // get specific deleted document
      return reverse(jio.get({"_id": "doc1", "rev": shared.rev3_10}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "doc1",
        "message": "Document not found",
        "method": "get",
        "reason": "deleted",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get specific deleted document -> 404 Not Found");

      // get deleted document
      return reverse(jio.get({"_id": "doc1"}, {
        "conflicts": true,
        "revs": true,
        "revs_info": true
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "doc1",
        "message": "Document not found",
        "method": "get",
        "reason": "deleted",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get deleted document -> 404 Not Found");

    }).fail(unexpectedError).always(start);

  }

  test("[Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage({
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevloc",
          "mode": "memory"
        }
      }]
    });
  });
  test("[Replicate Revision + Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage({
      "type": "replicaterevision",
      "storage_list": [{
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc",
            "mode": "memory"
          }
        }]
      }]
    });
  });
  test("2x [Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage({
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevlocloc1",
          "mode": "memory"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevlocloc2",
          "mode": "memory"
        }
      }]
    });
  });
  test("2x [Replicate Rev + 2x [Rev + Local]] Scenario", function () {
    testReplicateRevisionStorage({
      "type": "replicaterevision",
      "storage_list": [{
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc1",
            "mode": "memory"
          }
        }, {
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc2",
            "mode": "memory"
          }
        }]
      }, {
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc3",
            "mode": "memory"
          }
        }, {
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc4",
            "mode": "memory"
          }
        }]
      }]
    });
  });

  function replicateStorageSynchronisationGenerator(jio_description) {

    var shared = {}, jio, jio_leaves = [];
    shared.workspace = {};
    jio = jIO.createJIO(jio_description, {"workspace": shared.workspace});

    function leavesAction(action, storage_description) {
      var i;
      if (storage_description.type === "replicaterevision") {
        // it is the replicate revision storage tree
        for (i = 0; i < storage_description.storage_list.length; i += 1) {
          leavesAction(action, storage_description.storage_list[i]);
        }
      } else if (storage_description.type === "revision") {
        // it is the revision storage tree
        leavesAction(action, storage_description.sub_storage);
      } else {
        // it is the storage tree leaf
        action(storage_description);
      }
    }

    leavesAction(function (storage_description) {
      jio_leaves.push(jIO.createJIO(storage_description, {
        "workspace": shared.workspace
      }));
    }, jio_description);

    if (jio_leaves.length !== 4) {
      // please make a jio description with 4 localstorage
      ok(false, "More or less then 4 localstorage were provided");
      return;
    }

    jio_leaves.run = function (method, argument) {
      var i, promises = [];
      for (i = 0; i < this.length; i += 1) {
        promises[i] = this[i][method].apply(
          this[i],
          argument
        );
      }
      return RSVP.all(promises);
    };
    jio_leaves.get = function () {
      return this.run("get", arguments);
    };
    jio_leaves.put = function () {
      return this.run("put", arguments);
    };
    jio_leaves.allDocs = function () {
      return this.run("allDocs", arguments);
    };

    stop();

    // add documents to localstorage
    shared.doctree1_1 = {
      "_id": "doc1.revision_tree.json",
      "children": JSON.stringify([{
        "rev": "1-111",
        "status": "available",
        "children": []
      }])
    };
    shared.doc1_1 = {"_id": "doc1.1-111", "title": "A"};
    jio_leaves.put(shared.doctree1_1).then(function () {
      return jio_leaves.put(shared.doc1_1);
    }).then(function () {

      // no synchronisation
      return jio.check({"_id": "doc1"});

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "check",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Check document");

      return jio.check({"_id": "doc1", "_rev": "1-111"});

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "check",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Check document with revision");

      return jio.repair({"_id": "doc1"});

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document");

      // check documents from localstorage
      return jio_leaves.get({"_id": "doc1.revision_tree.json"});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, shared.doctree1_1, "Check revision tree " +
                  i + ", no syncho done");
      }

      // add documents to localstorage
      shared.doctree2_2 = tool.deepClone(shared.doctree1_1);
      shared.doctree2_2.children = JSON.parse(shared.doctree2_2.children);
      shared.doctree2_2.children[0].children.push({
        "rev": "2-222",
        "status": "available",
        "children": []
      });
      shared.doctree2_2.children = JSON.stringify(shared.doctree2_2.children);
      shared.doc2_2 = {
        "_id": "doc1.2-222",
        "title": "B",
        "_attachments": {
          "haha": {
            "length": 3,
            "digest": "sha256-ba7816bf8f01cfea414140de5dae2223b00361a3" +
              "96177a9cb410ff61f20015ad",
            "content_type": "text/plain"
          }
        }
      };

      return jio_leaves[0].put(shared.doctree2_2);
    }).then(function () {
      return jio_leaves[0].put(shared.doc2_2);
    }).then(function () {
      return jio_leaves[0].putAttachment({
        "_id": shared.doc2_2._id,
        "_attachment": "haha",
        "_data": "abc",
        "_content_type": "text/plain"
      });
    }).then(function () {

      // document synchronisation without conflict
      return reverse(jio.check({"_id": "doc1"}));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "conflict",
        "id": "doc1",
        "message": "Some documents are different in the sub storages",
        "method": "check",
        "reason": "Storage contents differ",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Check document");

      return jio.repair({"_id": "doc1"});

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document");

      // check document trees
      return jio_leaves.get({"_id": "doc1.revision_tree.json"});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, shared.doctree2_2, "Check revision tree " +
                  i + ", " + (i ? "" : "no") + " synchro done");
      }

      // check document 2
      return jio_leaves[2].get({"_id": "doc1.2-222"});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc2_2, "Check document 2");

      // check attachment 2
      return jio_leaves[2].getAttachment({
        "_id": "doc1.2-222",
        "_attachment": "haha"
      });

    }).then(function (answer) {
      return tool.readBlobAsBinaryString(answer.data);
    }).then(function (event) {

      deepEqual(event.target.result, "abc", "Check attachment 2");

      // add documents to localstorage
      shared.doctree2_3 = tool.deepClone(shared.doctree2_2);
      shared.doctree2_3.children = JSON.parse(shared.doctree2_3.children);
      shared.doctree2_3.children[0].children.unshift({
        "rev": "2-223",
        "status": "available",
        "children": []
      });
      shared.doctree2_3.children = JSON.stringify(shared.doctree2_3.children);
      shared.doc2_3 = {"_id": "doc1.2-223", "title": "C"};

      return jio_leaves[0].put(shared.doctree2_3);
    }).then(function () {
      return jio_leaves[0].put(shared.doc2_3);
    }).then(function () {

      // document synchronisation with conflict
      return reverse(jio.check({"_id": "doc1"}));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "conflict",
        "id": "doc1",
        "message": "Some documents are different in the sub storages",
        "method": "check",
        "reason": "Storage contents differ",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Check document");

      return jio.repair({"_id": "doc1"});

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "doc1",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document");

      // check documents from localstorage
      return jio_leaves.get({"_id": "doc1.revision_tree.json"});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, shared.doctree2_3, "Check revision tree " +
                  i + ", " + (i ? "" : "no") + " synchro done");
      }

      // check document 2
      return jio_leaves[2].get({"_id": "doc1.2-223"});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc2_3, "Check document 2");

    }).fail(unexpectedError).always(start);

  }

  test("Storage Synchronisation (Repair) 4x [Rev + Local]", function () {
    replicateStorageSynchronisationGenerator({
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc1",
          "application_name": "1",
          "mode": "memory"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc2",
          "application_name": "1",
          "mode": "memory"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc3",
          "application_name": "1",
          "mode": "memory"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc4",
          "application_name": "1",
          "mode": "memory"
        }
      }]
    });
  });

  test(
    "Storage Synchronisation (Repair) 2x [Rep 2x [Rev + Local]]",
    function () {
      replicateStorageSynchronisationGenerator({
        "type": "replicaterevision",
        "storage_list": [{
          "type": "replicaterevision",
          "storage_list": [{
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc1",
              "application_name": "2",
              "mode": "memory"
            }
          }, {
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc2",
              "application_name": "2",
              "mode": "memory"
            }
          }]
        }, {
          "type": "replicaterevision",
          "storage_list": [{
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc3",
              "application_name": "2",
              "mode": "memory"
            }
          }, {
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc4",
              "application_name": "2",
              "mode": "memory"
            }
          }]
        }]
      });
    }
  );

}));
