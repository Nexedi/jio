/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jio_tests, hex_sha256, test, ok, deepEqual, sinon,
  expect */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jio_tests, hex_sha256);
}([
  'jio',
  'jio_tests',
  'sha256',
  'localstorage',
  'revisionstorage',
  'replicaterevisionstorage'
], function (jIO, util, hex_sha256) {
  "use strict";

  //////////////////////////////////////////////////////////////////////////////
  // Tools

  /**
   * Clones all native object in deep. Managed types: Object, Array, String,
   * Number, Boolean, Function, null.
   *
   * @param  {A} object The object to clone
   * @return {A} The cloned object
   */
  function deepClone(object) {
    var i, cloned;
    if (Array.isArray(object)) {
      cloned = [];
      for (i = 0; i < object.length; i += 1) {
        cloned[i] = deepClone(object[i]);
      }
      return cloned;
    }
    if (typeof object === "object") {
      cloned = {};
      for (i in object) {
        if (object.hasOwnProperty(i)) {
          cloned[i] = deepClone(object[i]);
        }
      }
      return cloned;
    }
    return object;
  }

  function generateTools() {
    return {
      clock: sinon.useFakeTimers(),
      spy: util.ospy,
      tick: util.otick
    };
  }

  function generateRevisionHash(doc, revisions, deleted_flag) {
    var string;
    doc = deepClone(doc);
    delete doc._rev;
    delete doc._revs;
    delete doc._revs_info;
    string = JSON.stringify(doc) + JSON.stringify(revisions) +
      JSON.stringify(deleted_flag ? true : false);
    return hex_sha256(string);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Tests

  module("Replicate Revision Storage");

  var testReplicateRevisionStorage = function (sinon, jio_description) {

    var o = generateTools(), leavesAction, generateLocalPath;

    o.jio = jIO.newJio(jio_description);

    generateLocalPath = function (storage_description) {
      return "jio/localstorage/" + storage_description.username + "/" +
        storage_description.application_name;
    };

    leavesAction = function (action, storage_description, param) {
      var i;
      if (param === undefined) {
        param = {};
      } else {
        param = deepClone(param);
      }
      if (storage_description.storage_list !== undefined) {
        // it is the replicate revision storage tree
        for (i = 0; i < storage_description.storage_list.length; i += 1) {
          leavesAction(action, storage_description.storage_list[i], param);
        }
      } else if (storage_description.sub_storage !== undefined) {
        // it is the revision storage tree
        param.revision = true;
        leavesAction(action, storage_description.sub_storage, param);
      } else {
        // it is the storage tree leaf
        param[storage_description.type] = true;
        action(storage_description, param);
      }
    };
    o.leavesAction = function (action) {
      leavesAction(action, jio_description);
    };

    // post a new document without id
    o.doc = {"title": "post document without id"};
    o.spy(o, "status", undefined, "Post document (without id)");
    o.jio.post(o.doc, function (err, response) {
      o.f.apply(arguments);
      o.response_rev = (err || response).rev;
      if (util.isUuid((err || response).id)) {
        ok(true, "Uuid format");
        o.uuid = (err || response).id;
      } else {
        deepEqual((err || response).id,
                  "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "Uuid format");
      }
    });
    o.tick(o);

    // check document
    o.doc._id = o.uuid;
    o.revisions = {"start": 0, "ids": []};
    o.rev_hash = generateRevisionHash(o.doc, o.revisions);
    o.rev = "1-" + o.rev_hash;
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = deepClone(o.doc);
      if (param.revision) {
        deepEqual(o.response_rev, o.rev, "Check revision");
        doc._id += "." + o.rev;
        suffix = "." + o.rev;
      }
      deepEqual(util.jsonlocalstorage.getItem(
        generateLocalPath(storage_description) + "/" + o.uuid + suffix
      ), doc, "Check document");
    });

    // get the post document without revision
    o.spy(o, "value", {
      "_id": o.uuid,
      "title": "post document without id",
      "_rev": o.rev,
      "_revisions": {"start": 1, "ids": [o.rev_hash]},
      "_revs_info": [{"rev": o.rev, "status": "available"}]
    }, "Get the generated document, the winner");
    o.jio.get({"_id": o.uuid}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // post a new document with id
    o.doc = {"_id": "doc1", "title": "post new doc with id"};
    o.rev1_1_hash = generateRevisionHash(o.doc, o.revisions);
    o.rev1_1 = "1-" + o.rev1_1_hash;
    o.rev1_1_history = {"start": 1, "ids": [o.rev1_1_hash]};
    o.rev1_1_revs_info = [{"rev": o.rev1_1, "status": "available"}];
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev1_1},
          "Post new document with an id");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    //  /
    //  |
    // 1-1

    // check document
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = deepClone(o.doc);
      if (param.revision) {
        doc._id += "." + o.rev1_1;
        suffix = "." + o.rev1_1;
      }
      deepEqual(util.jsonlocalstorage.getItem(
        generateLocalPath(storage_description) + "/doc1" + suffix
      ), doc, "Check document");
    });

    // get the post document without revision
    o.spy(o, "value", {
      "_id": "doc1",
      "title": "post new doc with id",
      "_rev": o.rev1_1,
      "_revisions": {"start": 1, "ids": [o.rev1_1_hash]},
      "_revs_info": [{"rev": o.rev1_1, "status": "available"}]
    }, "Get the previous document (without revision)");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // post same document without revision
    o.doc = {"_id": "doc1", "title": "post same document without revision"};
    o.rev1_2_hash = generateRevisionHash(o.doc, o.revisions);
    o.rev1_2 = "1-" + o.rev1_2_hash;
    o.rev1_2_history = {"start": 1, "ids": [o.rev1_2_hash]};
    o.rev1_2_revs_info = [{"rev": o.rev1_2, "status": "available"}];
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev1_2},
          "Post same document (without revision)");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    //    /
    //   / \
    // 1-1 1-2

    // check document
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = deepClone(o.doc);
      if (param.revision) {
        doc._id += "." + o.rev1_2;
        suffix = "." + o.rev1_2;
      }
      deepEqual(util.jsonlocalstorage.getItem(
        generateLocalPath(storage_description) + "/doc1" + suffix
      ), doc, "Check document");
    });

    // post a new revision
    o.doc = {"_id": "doc1", "title": "post new revision", "_rev": o.rev1_2};
    o.revisions.start += 1;
    o.revisions.ids.unshift(o.rev1_2_hash);
    o.rev2_3_hash = generateRevisionHash(o.doc, o.revisions);
    o.rev2_3 = "2-" + o.rev2_3_hash;
    o.rev2_3_history = deepClone(o.rev1_2_history);
    o.rev2_3_history.start += 1;
    o.rev2_3_history.ids.unshift(o.rev2_3_hash);
    o.rev2_3_revs_info = deepClone(o.rev1_2_revs_info);
    o.rev2_3_revs_info.unshift({"rev": o.rev2_3, "status": "available"});
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev2_3},
          "Post document (with revision)");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    //    /
    //   / \
    // 1-1 1-2
    //      |
    //     2-3

    // check document
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = deepClone(o.doc);
      delete doc._rev;
      if (param.revision) {
        doc._id += "." + o.rev2_3;
        suffix = "." + o.rev2_3;
      }
      deepEqual(util.jsonlocalstorage.getItem(
        generateLocalPath(storage_description) + "/doc1" + suffix
      ), doc, "Check document");
    });

    // get the post document with revision
    o.spy(o, "value", {
      "_id": "doc1",
      "title": "post same document without revision",
      "_rev": o.rev1_2,
      "_revisions": {"start": 1, "ids": [o.rev1_2_hash]},
      "_revs_info": [{"rev": o.rev1_2, "status": "available"}],
      "_conflicts": [o.rev1_1]
    }, "Get the previous document (with revision)");
    o.jio.get({"_id": "doc1", "_rev": o.rev1_2}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // put document without id
    o.spy(o, "status", 20, "Put document without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put document without rev
    o.doc = {"_id": "doc1", "title": "put new document"};
    o.rev1_4_hash = generateRevisionHash(o.doc, {"start": 0, "ids": []});
    o.rev1_4 = "1-" + o.rev1_4_hash;
    o.rev1_4_history = {"start": 1, "ids": [o.rev1_4_hash]};
    o.rev1_4_revs_info = [{"rev": o.rev1_4, "status": "available"}];
    o.spy(o, "value", {"id": "doc1", "ok": true, "rev": o.rev1_4},
          "Put document without rev");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    //    __/__
    //   /  |  \
    // 1-1 1-2 1-4
    //      |
    //     2-3

    // put new revision
    o.doc = {"_id": "doc1", "title": "put new revision", "_rev": o.rev1_4};
    o.rev2_5_hash = generateRevisionHash(o.doc, o.rev1_4_history);
    o.rev2_5 = "2-" + o.rev2_5_hash;
    o.rev2_5_history = {"start": 2, "ids": [o.rev2_5_hash, o.rev1_4_hash]};
    o.rev2_5_revs_info = deepClone(o.rev1_4_revs_info);
    o.rev2_5_revs_info.unshift({"rev": o.rev2_5, "status": "available"});
    o.spy(o, "value", {"id": "doc1", "ok": true, "rev": o.rev2_5},
          "Put new revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    //    __/__
    //   /  |  \
    // 1-1 1-2 1-4
    //      |   |
    //     2-3 2-5

    // putAttachment to inexistent document
    o.doc = {
      "_id": "doc2",
      "_mimetype": "text/plain",
      "_data": "doc 2 - attachment 1",
      "_attachment": "attachment1"
    };
    o.rev_hash = generateRevisionHash(o.doc, {"start": 0, "ids": []});
    o.rev = "1-" + o.rev_hash;
    o.spy(o, "value",
          {"ok": true, "id": "doc2", "attachment": "attachment1", "rev": o.rev},
          "Put an attachment to an inexistent document");
    o.jio.putAttachment(o.doc, o.f);
    o.tick(o);

    // putAttachment
    o.doc = {
      "_id": "doc1",
      "_mimetype": "text/plain",
      "_data": "doc 1 - attachment 1",
      "_attachment": "attachment1",
      "_rev": o.rev2_5
    };
    o.rev3_6_hash = generateRevisionHash(o.doc, o.rev2_5_history);
    o.rev3_6 = "3-" + o.rev3_6_hash;
    o.rev3_6_history = deepClone(o.rev2_5_history);
    o.rev3_6_history.start += 1;
    o.rev3_6_history.ids.unshift(o.rev3_6_hash);
    o.rev3_6_revs_info = deepClone(o.rev2_5_revs_info);
    o.rev3_6_revs_info.unshift({"rev": o.rev3_6, "status": "available"});
    o.spy(o, "value", {
      "ok": true,
      "id": "doc1",
      "attachment": "attachment1",
      "rev": o.rev3_6
    }, "Put an attachment to the first document");
    o.jio.putAttachment(o.doc, o.f);
    o.tick(o);

    //    __/__
    //   /  |  \
    // 1-1 1-2 1-4
    //      |   |
    //     2-3 2-5
    //          |
    //        3-6+a1

    // get document
    o.doc = {
      "_id": "doc1",
      "_rev": o.rev3_6,
      "_revisions": o.rev3_6_history,
      "_revs_info": o.rev3_6_revs_info,
      "_conflicts": [o.rev2_3, o.rev1_1],
      "_attachments": {
        "attachment1": {
          "length": "doc 1 - attachment 1".length,
          "content_type": "text/plain",
          "digest": "md5-0505c1fb6aae02dd1695d33841726564"
        }
      },
      "title": "put new revision"
    };
    o.spy(o, "value", o.doc, "Get document, the winner");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // get attachment
    o.doc = {
      "_id": "doc1",
      "_attachment": "attachment1"
    };
    o.spy(o, "value", "doc 1 - attachment 1", "Get the winner's attachment");
    o.jio.getAttachment(o.doc, o.f);
    o.tick(o);

    // put document
    o.doc = {
      "_id": "doc1",
      "_rev": o.rev3_6,
      "title": "Put revision, attachment must be copied"
    };
    o.rev4_7_hash = generateRevisionHash(o.doc, o.rev3_6_history);
    o.rev4_7 = "4-" + o.rev4_7_hash;
    o.rev4_7_history = deepClone(o.rev3_6_history);
    o.rev4_7_history.start += 1;
    o.rev4_7_history.ids.unshift(o.rev4_7_hash);
    o.rev4_7_revs_info = deepClone(o.rev3_6_revs_info);
    o.rev4_7_revs_info.unshift({"rev": o.rev4_7, "status": "available"});
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev4_7},
          "Update document, attachment should be copied");
    o.jio.put(o.doc, o.f);
    o.tick(o);

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
    o.doc = {
      "_id": "doc1",
      "_rev": o.rev4_7,
      "title": o.doc.title,
      "_attachments": {
        "attachment1": {
          "length": "doc 1 - attachment 1".length,
          "content_type": "text/plain",
          "digest": "md5-0505c1fb6aae02dd1695d33841726564"
        }
      },
      "_conflicts": [o.rev2_3, o.rev1_1],
      "_revisions": o.rev4_7_history,
      "_revs_info": o.rev4_7_revs_info
    };
    o.spy(o, "value", o.doc,
          "Get the new winner document and its attachment metadata");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // get attachment
    o.doc = {
      "_id": "doc1",
      "_attachment": "attachment1"
    };
    o.spy(o, "value", "doc 1 - attachment 1",
          "Get the winner's attachment again");
    o.jio.getAttachment(o.doc, o.f);
    o.tick(o);

    // remove attachment
    o.doc = {
      "_id": "doc1",
      "_attachment": "attachment1",
      "_rev": o.rev4_7
    };
    o.rev5_8_hash = generateRevisionHash(o.doc, o.rev4_7_history);
    o.rev5_8 = "5-" + o.rev5_8_hash;
    o.rev5_8_history = deepClone(o.rev4_7_history);
    o.rev5_8_history.start += 1;
    o.rev5_8_history.ids.unshift(o.rev5_8_hash);
    o.rev5_8_revs_info = deepClone(o.rev4_7_revs_info);
    o.rev5_8_revs_info.unshift({"rev": o.rev5_8, "status": "available"});
    o.spy(o, "value", {
      "ok": true,
      "id": "doc1",
      "attachment": "attachment1",
      "rev": o.rev5_8
    }, "Remove attachment");
    o.jio.removeAttachment(o.doc, o.f);
    o.tick(o);


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
    o.doc = {
      "_id": "doc1",
      "_rev": o.rev5_8,
      "title": "Put revision, attachment must be copied",
      "_conflicts": [o.rev2_3, o.rev1_1],
      "_revisions": o.rev5_8_history,
      "_revs_info": o.rev5_8_revs_info
    };
    o.spy(o, "value", o.doc,
          "Get the new winner document, no attachment must be provided");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // get specific document
    o.doc = {
      "_id": "doc1",
      "_rev": o.rev4_7,
      "title": o.doc.title,
      "_attachments": {
        "attachment1": {
          "length": "doc 1 - attachment 1".length,
          "content_type": "text/plain",
          "digest": "md5-0505c1fb6aae02dd1695d33841726564"
        }
      },
      "_conflicts": [o.rev2_3, o.rev1_1],
      "_revisions": o.rev4_7_history,
      "_revs_info": o.rev4_7_revs_info
    };
    o.spy(o, "value", o.doc,
          "Get the new winner document and its attachment metadata");
    o.jio.get({"_id": "doc1", "_rev": o.rev4_7}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // get inexistent attachment
    o.spy(o, "status", 404, "Get inexistent winner attachment" +
          " -> 404 Not Found");
    o.jio.get({"_id": "doc1/attachment1"}, o.f);
    o.tick(o);

    // get specific attachment
    o.doc = {
      "_id": "doc1",
      "_attachment": "attachment1",
      "_rev": o.rev3_6
    };
    o.spy(o, "value", "doc 1 - attachment 1", "Get a specific attachment");
    o.jio.getAttachment(o.doc, o.f);
    o.tick(o);

    // remove specific document and conflict
    o.doc = {"_id": "doc1", "_rev": o.rev1_1};
    // generate with deleted_flag
    o.rev2_9_hash = generateRevisionHash(o.doc, o.rev1_1_history, true);
    o.rev2_9 = "2-" + o.rev2_9_hash;
    o.rev2_9_history = deepClone(o.rev1_1_history);
    o.rev2_9_history.start += 1;
    o.rev2_9_history.ids.unshift(o.rev2_9_hash);
    o.rev2_9_revs_info = deepClone(o.rev1_1_revs_info);
    o.rev2_9_revs_info.unshift({"rev": o.rev2_9, "status": "deleted"});
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev2_9},
          "Remove specific document, and one conflict");
    o.jio.remove(o.doc, o.f);
    o.tick(o);

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
    o.doc = {"_id": "doc1", "_rev": o.rev2_3};
    o.rev3_10_hash = generateRevisionHash(o.doc, o.rev2_3_history, true);
    o.rev3_10 = "3-" + o.rev3_10_hash;
    o.rev3_10_history = deepClone(o.rev2_3_history);
    o.rev3_10_history.start += 1;
    o.rev3_10_history.ids.unshift(o.rev3_10_hash);
    o.rev3_10_revs_info = deepClone(o.rev2_3_revs_info);
    o.rev3_10_revs_info.unshift({"rev": o.rev3_10, "status": "deleted"});
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev3_10},
          "Remove specific document, and one conflict");
    o.jio.remove(o.doc, o.f);
    o.tick(o);

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
    o.doc = {
      "_id": "doc1",
      "_rev": o.rev5_8,
      "title": "Put revision, attachment must be copied",
      "_revisions": o.rev5_8_history,
      "_revs_info": o.rev5_8_revs_info
    };
    o.spy(o, "value", o.doc,
          "Get the new winner document, no more conflicts");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // remove document
    o.doc = {
      "_id": "doc1",
      "_rev": o.rev5_8
    };
    o.rev6_11_hash = generateRevisionHash(o.doc, o.rev5_8_history, true);
    o.rev6_11 = "6-" + o.rev6_11_hash;
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev6_11},
          "Remove the last document");
    o.jio.remove(o.doc, o.f);
    o.tick(o);

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
    o.spy(o, "status", 404, "Get inexistent document -> 404 Not Found");
    o.jio.get({"_id": "doc3"}, {
      "conflicts": true,
      "revs": true,
      "revisions": true
    }, o.f);
    o.tick(o);

    // get specific deleted document
    o.spy(o, "status", 404, "Get deleted document -> 404 Not Found");
    o.jio.get({"_id": "doc1", "rev": o.rev3_10}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // get specific deleted document
    o.spy(o, "status", 404, "Get deleted document -> 404 Not Found");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);

  };

  test("[Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevloc",
          "application_name": "areprevloc"
        }
      }]
    });
  });
  test("[Replicate Revision + Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc",
            "application_name": "arepreprevloc"
          }
        }]
      }]
    });
  });
  test("2x [Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevlocloc1",
          "application_name": "areprevlocloc1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevlocloc2",
          "application_name": "areprevlocloc2"
        }
      }]
    });
  });
  test("2x [Replicate Rev + 2x [Rev + Local]] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc1",
            "application_name": "arepreprevloc1"
          }
        }, {
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc2",
            "application_name": "arepreprevloc2"
          }
        }]
      }, {
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc3",
            "application_name": "arepreprevloc3"
          }
        }, {
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc4",
            "application_name": "arepreprevloc4"
          }
        }]
      }]
    });
  });

  function replicateStorageSynchronisationGenerator(
    that,
    description,
    index
  ) {
    var o = generateTools();

    o.jio = jIO.newJio(description);
    o.localpath1 = "jio/localstorage/usyncreprevlocloc1/" + index;
    o.localpath2 = "jio/localstorage/usyncreprevlocloc2/" + index;
    o.localpath3 = "jio/localstorage/usyncreprevlocloc3/" + index;
    o.localpath4 = "jio/localstorage/usyncreprevlocloc4/" + index;

    // add documents to localstorage
    o.doctree1_1 = {
      "_id": "doc1.revision_tree.json",
      "children": [{
        "rev": "1-111",
        "status": "available",
        "children": [],
      }]
    };
    o.doc1_1 = {"_id": "doc1.1-111", "title": "A"};
    util.jsonlocalstorage.setItem(o.localpath1 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    util.jsonlocalstorage.setItem(o.localpath2 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    util.jsonlocalstorage.setItem(o.localpath3 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    util.jsonlocalstorage.setItem(o.localpath4 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    util.jsonlocalstorage.setItem(o.localpath1 + "/" + o.doc1_1._id, o.doc1_1);
    util.jsonlocalstorage.setItem(o.localpath2 + "/" + o.doc1_1._id, o.doc1_1);
    util.jsonlocalstorage.setItem(o.localpath3 + "/" + o.doc1_1._id, o.doc1_1);
    util.jsonlocalstorage.setItem(o.localpath4 + "/" + o.doc1_1._id, o.doc1_1);

    // no synchronisation
    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Check document");
    o.jio.check({"_id": "doc1"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": "1-111"},
          "Check document with revision");
    o.jio.check({"_id": "doc1", "_rev": "1-111"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Repair document");
    o.jio.repair({"_id": "doc1"}, o.f);
    o.tick(o);

    // check documents from localstorage
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath1 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 1, no synchro done"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath2 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 2, no synchro done"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath3 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 3, no synchro done"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath4 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 4, no synchro done"
    );

    // add documents to localstorage
    o.doctree2_2 = deepClone(o.doctree1_1);
    o.doctree2_2.children[0].children.push({
      "rev": "2-222",
      "status": "available",
      "children": []
    });
    o.doc2_2 = {
      "_id": "doc1.2-222",
      "title": "B",
      "_attachments": {
        "haha": {
          "length": 3,
          "digest": "md5-900150983cd24fb0d6963f7d28e17f72",
          "content_type": "text/plain"
        }
      }
    };
    util.jsonlocalstorage.setItem(o.localpath1 + "/doc1.revision_tree.json",
                         o.doctree2_2);
    util.jsonlocalstorage.setItem(o.localpath1 + "/" + o.doc2_2._id, o.doc2_2);
    util.jsonlocalstorage.setItem(o.localpath1 + "/" + o.doc2_2._id +
                                  "/haha", "abc");

    // document synchronisation without conflict
    o.spy(o, "status", 41, "Check document");
    o.jio.check({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Repair document");
    o.jio.repair({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    // check documents from localstorage
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath1 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 1, no synchro done"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath2 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 2, revision synchro done"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath3 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 3, revision synchro done"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath3 + "/doc1.2-222"),
      o.doc2_2,
      "Check document 3"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath3 + "/doc1.2-222/haha"),
      "abc",
      "Check attachment 3"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath4 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 4, revision synchro done"
    );

    // add documents to localstorage
    o.doctree2_3 = deepClone(o.doctree2_2);
    o.doctree2_3.children[0].children.unshift({
      "rev": "2-223",
      "status": "available",
      "children": []
    });
    o.doc2_3 = {"_id": "doc1.2-223", "title": "C"};
    util.jsonlocalstorage.setItem(o.localpath1 + "/doc1.revision_tree.json",
                         o.doctree2_3);
    util.jsonlocalstorage.setItem(o.localpath1 + "/" + o.doc2_3._id, o.doc2_3);

    // document synchronisation with conflict
    o.spy(o, "status", 41, "Check document");
    o.jio.check({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Repair document");
    o.jio.repair({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    // check documents from localstorage
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath1 + "/doc1.revision_tree.json"),
      o.doctree2_3,
      "Check revision tree 1, rev synchro"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath2 + "/doc1.revision_tree.json"),
      o.doctree2_3,
      "Check revision tree 2, rev synchro"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath3 + "/doc1.revision_tree.json"),
      o.doctree2_3,
      "Check revision tree 3, rev synchro"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath3 + "/doc1.2-223"),
      o.doc2_3,
      "Check document 3"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath4 + "/doc1.revision_tree.json"),
      o.doctree2_3,
      "Check revision tree 4, rev synchro"
    );

    util.closeAndcleanUpJio(o.jio);

  }

  test("Storage Synchronisation (Repair) 4x [Rev + Local]", function () {
    replicateStorageSynchronisationGenerator(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc1",
          "application_name": "1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc2",
          "application_name": "1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc3",
          "application_name": "1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc4",
          "application_name": "1"
        }
      }]
    }, "1");
  });

  test(
    "Storage Synchronisation (Repair) 2x [Rep 2x [Rev + Local]]",
    function () {
      replicateStorageSynchronisationGenerator(this, {
        "type": "replicaterevision",
        "storage_list": [{
          "type": "replicaterevision",
          "storage_list": [{
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc1",
              "application_name": "2"
            }
          }, {
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc2",
              "application_name": "2"
            }
          }]
        }, {
          "type": "replicaterevision",
          "storage_list": [{
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc3",
              "application_name": "2"
            }
          }, {
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "usyncreprevlocloc4",
              "application_name": "2"
            }
          }]
        }]
      }, "2");
    }
  );

}));
