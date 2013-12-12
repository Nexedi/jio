/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, test_util, hex_sha256, RSVP, test, ok, deepEqual, start,
  stop, module */

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
  'revisionstorage'
], function (jIO, util, sha256, RSVP) {
  "use strict";

  //////////////////////////////////////////////////////////////////////////////
  // Tools

  var tool = {
    "deepClone": jIO.util.deepClone,
    "uniqueJSONStringify": jIO.util.uniqueJSONStringify,
    "readBlobAsBinaryString": jIO.util.readBlobAsBinaryString
  };

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

  function isRevision(revision) {
    return (/^[0-9]+-[0-9a-zA-Z]+$/).test(revision);
  }

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

  //////////////////////////////////////////////////////////////////////////////
  // Tests

  module("Revision Storage + Local Storage");

  test("Post", function () {

    var shared = {}, jio, jio_local;

    shared.workspace = {};
    shared.local_storage_description = {
      "type": "local",
      "username": "revision post",
      "mode": "memory"
    };

    jio = jIO.createJIO({
      "type": "revision",
      "sub_storage": shared.local_storage_description
    }, {"workspace": shared.workspace});

    jio_local = jIO.createJIO(shared.local_storage_description, {
      "workspace": shared.workspace
    });

    stop();

    // post without id
    shared.revisions = {"start": 0, "ids": []};
    jio.post({}).then(function (response) {

      shared.uuid = response.id;
      response.id = "<uuid>";
      shared.rev = response.rev;
      response.rev = "<rev>";
      ok(util.isUuid(shared.uuid), "Uuid should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + shared.uuid);
      ok(isRevision(shared.rev), "Revision should look like " +
         "x-xxxxxxxxxxxxxxxxxxxxxxxxx... : " + shared.rev);
      deepEqual(
        shared.rev,
        "1-" + generateRevisionHash({"_id": shared.uuid}, shared.revisions),
        "Check revision value"
      );
      deepEqual(response, {
        "id": "<uuid>",
        "rev": "<rev>",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post without id");

      return jio_local.get({"_id": shared.uuid + "." + shared.rev});

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": shared.uuid + "." + shared.rev
      }, "Check document");

      return jio_local.get({"_id": shared.uuid + ".revision_tree.json"});

    }).then(function (answer) {

      shared.doc_tree = {
        "_id": shared.uuid + ".revision_tree.json",
        "children": JSON.stringify([{
          "rev": shared.rev,
          "status": "available",
          "children": []
        }])
      };
      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // post non empty document
      shared.doc = {"_id": "post1", "title": "myPost1"};
      shared.rev = "1-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "post1",
        "method": "post",
        "result": "success",
        "rev": shared.rev,
        "status": 201,
        "statusText": "Created"
      }, "Post");

      // check document
      shared.doc._id = "post1." + shared.rev;
      return jio_local.get(shared.doc);

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": shared.doc._id,
        "title": "myPost1"
      }, "Check document");

      // check document tree
      shared.doc_tree._id = "post1.revision_tree.json";
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children[0] = {
        "rev": shared.rev,
        "status": "available",
        "children": []
      };
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);

      return jio_local.get(shared.doc_tree);

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // post and document already exists
      shared.doc = {"_id": "post1", "title": "myPost2"};
      shared.rev = "1-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "post1",
        "method": "post",
        "result": "success",
        "rev": shared.rev,
        "status": 201,
        "statusText": "Created"
      }, "Post and document already exists");

      // check document
      shared.doc._id = "post1." + shared.rev;
      return jio_local.get(shared.doc);

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc, "Check document");

      // check document tree
      shared.doc_tree._id = "post1.revision_tree.json";
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children.unshift({
        "rev": shared.rev,
        "status": "available",
        "children": []
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);

      return jio_local.get(shared.doc_tree);

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // post + revision
      shared.doc = {"_id": "post1", "_rev": shared.rev, "title": "myPost2"};
      shared.revisions = {"start": 1, "ids": [shared.rev.split('-')[1]]};
      shared.rev = "2-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "post1",
        "method": "post",
        "result": "success",
        "rev": shared.rev,
        "status": 201,
        "statusText": "Created" // XXX should be 204 no content
      }, "Post + revision");

      // // keep_revision_history
      // ok (false, "keep_revision_history Option Not Implemented");

      // check document
      shared.doc._id = "post1." + shared.rev;
      delete shared.doc._rev;
      return jio_local.get(shared.doc);

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc, "Check document");

      // check document tree
      shared.doc_tree._id = "post1.revision_tree.json";
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children[0].children.unshift({
        "rev": shared.rev,
        "status": "available",
        "children": []
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);
      return jio_local.get(shared.doc_tree);

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // add attachment
      return jio_local.putAttachment({
        "_id": "post1." + shared.rev,
        "_attachment": "attachment_test",
        "_data": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "_content_type": "oh/yeah"
      });

    }).then(function () {

      // post + attachment copy
      shared.doc = {"_id": "post1", "_rev": shared.rev, "title": "myPost2"};
      shared.revisions = {
        "start": 2,
        "ids": [shared.rev.split('-')[1], shared.revisions.ids[0]]
      };
      shared.rev = "3-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "post1",
        "method": "post",
        "result": "success",
        "rev": shared.rev,
        "status": 201,
        "statusText": "Created"
      }, "Post + attachment copy");

      // check attachment
      return jio_local.getAttachment({
        "_id": "post1." + shared.rev,
        "_attachment": "attachment_test"
      });

    }).then(function (answer) {

      return tool.readBlobAsBinaryString(answer.data);

    }).then(function (event) {

      deepEqual(event.target.result, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "Check Attachment");

      // check document tree
      shared.doc_tree._id = "post1.revision_tree.json";
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children[0].children[0].children.unshift({
        "rev": shared.rev,
        "status": "available",
        "children": []
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);

      return jio_local.get({"_id": shared.doc_tree._id});

    }).then(function (answer) {

      deepEqual(
        answer.data,
        shared.doc_tree,
        "Check document tree"
      );

      // post + wrong revision
      shared.doc = {"_id": "post1", "_rev": "3-wr3", "title": "myPost3"};
      shared.revisions = {"start": 3, "ids": ["wr3"]};
      shared.rev = "4-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.post(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "post1",
        "method": "post",
        "rev": shared.rev,
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post + wrong revision");

      return success(jio_local.get({"_id": "post1.3-wr3"}));

    }).then(function (answer) {

      // check document
      deepEqual(answer, {
        "error": "not_found",
        "id": "post1.3-wr3",
        "message": "Cannot find document",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Check document");

      // check document
      shared.doc._id = "post1." + shared.rev;
      delete shared.doc._rev;

      return jio_local.get({"_id": shared.doc._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc, "Check document");

      // check document tree
      shared.doc_tree._id = "post1.revision_tree.json";
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children.unshift({
        "rev": "3-wr3",
        "status": "missing",
        "children": [{
          "rev": shared.rev,
          "status": "available",
          "children": []
        }]
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);

      return jio_local.get({"_id": "post1.revision_tree.json"});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

    }).fail(unexpectedError).always(start);

  });

  test("Put", function () {

    var shared = {}, jio, jio_local;

    shared.workspace = {};
    shared.local_storage_description = {
      "type": "local",
      "username": "revision put",
      "mode": "memory"
    };

    jio = jIO.createJIO({
      "type": "revision",
      "sub_storage": shared.local_storage_description
    }, {"workspace": shared.workspace});

    jio_local = jIO.createJIO(shared.local_storage_description, {
      "workspace": shared.workspace
    });

    stop();

    // put non empty document
    shared.doc = {"_id": "put1", "title": "myPut1"};
    shared.revisions = {"start": 0, "ids": []};
    shared.rev = "1-" + generateRevisionHash(shared.doc, shared.revisions);
    jio.put(shared.doc).then(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content" // XXX should 201 Created
      }, "Create a document");

      // check document
      shared.doc._id = "put1." + shared.rev;
      return jio_local.get({"_id": shared.doc._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc, "Check document");

      // check document tree
      shared.doc_tree = {
        "_id": "put1.revision_tree.json",
        "children": [{
          "rev": shared.rev,
          "status": "available",
          "children": []
        }]
      };
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);

      return jio_local.get({"_id": shared.doc_tree._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // put without rev and document already exists
      shared.doc = {"_id": "put1", "title": "myPut2"};
      shared.rev = "1-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content" // XXX should be 201 Created
      }, "Put same document without revision");


      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children.unshift({
        "rev": shared.rev,
        "status": "available",
        "children": []
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);

      // put + revision
      shared.doc = {"_id": "put1", "_rev": shared.rev, "title": "myPut2"};
      shared.revisions = {"start": 1, "ids": [shared.rev.split('-')[1]]};
      shared.rev = "2-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content"
      }, "Put + revision");

      // check document
      shared.doc._id = "put1." + shared.rev;
      delete shared.doc._rev;
      return jio_local.get({"_id": shared.doc._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc, "Check document");

      // check document tree
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children[0].children.unshift({
        "rev": shared.rev,
        "status": "available",
        "children": []
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);
      return jio_local.get({"_id": shared.doc_tree._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // put + wrong revision
      shared.doc = {"_id": "put1", "_rev": "3-wr3", "title": "myPut3"};
      shared.revisions = {"start": 3, "ids": ["wr3"]};
      shared.rev = "4-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content"
      }, "Put + wrong revision");

      // check document
      shared.doc._id = "put1." + shared.rev;
      delete shared.doc._rev;
      return jio_local.get({"_id": shared.doc._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc, "Check document");

      // check document tree
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children.unshift({
        "rev": "3-wr3",
        "status": "missing",
        "children": [{
          "rev": shared.rev,
          "status": "available",
          "children": []
        }]
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);
      return jio_local.get({"_id": shared.doc_tree._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // put + revision history
      shared.doc = {
        "_id": "put1",
        //"_revs": ["3-rh3", "2-rh2", "1-rh1"], // same as below
        "_revs": {"start": 3, "ids": ["rh3", "rh2", "rh1"]},
        "title": "myPut3"
      };
      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "rev": "3-rh3",
        "status": 204,
        "statusText": "No Content"
      }, "Put + revision history");

      // check document
      shared.doc._id = "put1.3-rh3";
      delete shared.doc._revs;
      return jio_local.get({"_id": shared.doc._id});

    }).then(function (answer) {
      deepEqual(answer.data, shared.doc, "Check document");

      // check document tree
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children.unshift({
        "rev": "1-rh1",
        "status": "missing",
        "children": [{
          "rev": "2-rh2",
          "status": "missing",
          "children": [{
            "rev": "3-rh3",
            "status": "available",
            "children": []
          }]
        }]
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);
      return jio_local.get({"_id": shared.doc_tree._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

      // add attachment
      shared.doc._attachments = {
        "att1": {
          "length": 1,
          "content_type": "text/plain",
          "digest": "sha256-ca978112ca1bbdcafac231b39a23dc4da" +
            "786eff8147c4e72b9807785afee48bb"
        },
        "att2": {
          "length": 2,
          "content_type": "dont/care",
          "digest": "sha256-1e0bbd6c686ba050b8eb03ffeedc64fdc" +
            "9d80947fce821abbe5d6dc8d252c5ac"
        }
      };
      return RSVP.all([jio_local.putAttachment({
        "_id": "put1.3-rh3",
        "_attachment": "att1",
        "_data": "a",
        "_content_type": "text/plain"
      }), jio_local.putAttachment({
        "_id": "put1.3-rh3",
        "_attachment": "att2",
        "_data": "bc",
        "_content_type": "dont/care"
      })]);

    }).then(function () {

      // put + revision with attachment
      shared.attachments = shared.doc._attachments;
      shared.doc = {"_id": "put1", "_rev": "3-rh3", "title": "myPut4"};
      shared.revisions = {"start": 3, "ids": ["rh3", "rh2", "rh1"]};
      shared.rev = "4-" + generateRevisionHash(shared.doc, shared.revisions);
      return jio.put(shared.doc);

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "put1",
        "method": "put",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content"
      }, "Put + revision (document contains attachments)");

      // check document
      shared.doc._id = "put1." + shared.rev;
      shared.doc._attachments = shared.attachments;
      delete shared.doc._rev;
      return jio_local.get({"_id": shared.doc._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc, "Check document");

      // check attachments
      return RSVP.all([jio_local.getAttachment({
        "_id": "put1." + shared.rev,
        "_attachment": "att1"
      }), jio_local.getAttachment({
        "_id": "put1." + shared.rev,
        "_attachment": "att2"
      })]);

    }).then(function (answers) {

      deepEqual(answers[0].data.type, "text/plain", "Check attachment 1 type");
      deepEqual(answers[1].data.type, "dont/care", "Check attachment 2 type");

      return RSVP.all([
        tool.readBlobAsBinaryString(answers[0].data),
        tool.readBlobAsBinaryString(answers[1].data)
      ]);

    }).then(function (answers) {

      deepEqual(answers[0].target.result, "a", "Check attachment 1 content");
      deepEqual(answers[1].target.result, "bc", "Check attachment 2 content");

      // check document tree
      shared.doc_tree.children = JSON.parse(shared.doc_tree.children);
      shared.doc_tree.children[0].children[0].children[0].children.unshift({
        "rev": shared.rev,
        "status": "available",
        "children": []
      });
      shared.doc_tree.children = JSON.stringify(shared.doc_tree.children);
      return jio_local.get({"_id": shared.doc_tree._id});

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_tree, "Check document tree");

    }).fail(unexpectedError).always(start);

  });

  test("Put Attachment", function () {

    var shared = {}, jio, jio_local;

    shared.workspace = {};
    shared.local_storage_description = {
      "type": "local",
      "username": "revision putAttachment",
      "mode": "memory"
    };

    jio = jIO.createJIO({
      "type": "revision",
      "sub_storage": shared.local_storage_description
    }, {"workspace": shared.workspace});

    jio_local = jIO.createJIO(shared.local_storage_description, {
      "workspace": shared.workspace
    });

    stop();

    // putAttachment without document
    shared.revisions = {"start": 0, "ids": []};
    shared.rev_hash = generateRevisionHash({
      "_id": "doc1",
      "_attachment": "attmt1",
      "_data": "",
      "_content_type": ""
    }, shared.revisions);
    shared.rev = "1-" + shared.rev_hash;
    jio.putAttachment({
      "_id": "doc1",
      "_attachment": "attmt1",
      "_data": ""
    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "attmt1",
        "id": "doc1",
        "method": "putAttachment",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content" // XXX should be 201 Created
      }, "PutAttachment without document");

      return jio_local.get({"_id": "doc1." + shared.rev});

    }).then(function (answer) {

      // check document
      deepEqual(
        answer.data,
        {
          "_id": "doc1." + shared.rev,
          "_attachments": {
            "attmt1": {
              "content_type": "",
              "length": 0,
              "digest": "sha256-e3b0c44298fc1c149afbf4c8996fb9242" +
                "7ae41e4649b934ca495991b7852b855"
            }
          }
        },
        "Check document"
      );

      // check attachment
      return jio_local.getAttachment({
        "_id": "doc1." + shared.rev,
        "_attachment": "attmt1"
      });

    }).then(function (answer) {

      return tool.readBlobAsBinaryString(answer.data);

    }).then(function (event) {

      deepEqual(event.target.result, "", "Check attachment");

      // adding a metadata to the document
      return jio_local.get({"_id": "doc1." + shared.rev});

    }).then(function (answer) {

      answer.data._id = "doc1." + shared.rev;
      answer.data.title = "My Title";
      return jio_local.put(answer.data);

    }).then(function () {

      // update attachment
      shared.prev_rev = shared.rev;
      shared.revisions = {"start": 1, "ids": [shared.rev_hash]};
      shared.rev_hash = generateRevisionHash({
        "_id": "doc1",
        "_data": "abc",
        "_content_type": "",
        "_attachment": "attmt1"
      }, shared.revisions);
      shared.rev = "2-" + shared.rev_hash;
      return jio.putAttachment({
        "_id": "doc1",
        "_data": "abc",
        "_attachment": "attmt1",
        "_rev": shared.prev_rev
      });

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "attmt1",
        "id": "doc1",
        "method": "putAttachment",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content"
      }, "Update attachment");

      // check document
      return jio_local.get({"_id": "doc1." + shared.rev});

    }).then(function (answer) {

      deepEqual(
        answer.data,
        {
          "_id": "doc1." + shared.rev,
          "title": "My Title",
          "_attachments": {
            "attmt1": {
              "content_type": "",
              "length": 3,
              "digest": "sha256-ba7816bf8f01cfea414140de5dae2223b00361a3" +
                "96177a9cb410ff61f20015ad"
            }
          }
        },
        "Check document"
      );

      // check attachment
      return jio_local.getAttachment({
        "_id": "doc1." + shared.rev,
        "_attachment": "attmt1"
      });

    }).then(function (answer) {

      return tool.readBlobAsBinaryString(answer.data);

    }).then(function (event) {

      deepEqual(event.target.result, "abc", "Check attachment");

      // putAttachment new attachment
      shared.prev_rev = shared.rev;
      shared.revisions = {
        "start": 2,
        "ids": [shared.rev_hash, shared.revisions.ids[0]]
      };
      shared.rev_hash = generateRevisionHash({
        "_id": "doc1",
        "_data": "def",
        "_attachment": "attmt2",
        "_content_type": ""
      }, shared.revisions);
      shared.rev = "3-" + shared.rev_hash;
      return jio.putAttachment({
        "_id": "doc1",
        "_data": "def",
        "_attachment": "attmt2",
        "_rev": shared.prev_rev
      });

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "attmt2",
        "id": "doc1",
        "method": "putAttachment",
        "result": "success",
        "rev": shared.rev,
        "status": 204,
        "statusText": "No Content" // XXX should be 201 Created
      }, "PutAttachment without document");

      return jio_local.get({"_id": "doc1." + shared.rev});

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "doc1." + shared.rev,
        "title": "My Title",
        "_attachments": {
          "attmt1": {
            "content_type": "",
            "length": 3,
            "digest": "sha256-ba7816bf8f01cfea414140de5dae2223b00361a3" +
                "96177a9cb410ff61f20015ad"
          },
          "attmt2": {
            "content_type": "",
            "length": 3,
            "digest": "sha256-cb8379ac2098aa165029e3938a51da0bcecfc008" +
              "fd6795f401178647f96c5b34"
          }
        }
      }, "Check document");

      // check attachment
      return jio_local.getAttachment({
        "_id": "doc1." + shared.rev,
        "_attachment": "attmt2"
      });

    }).then(function (answer) {

      return tool.readBlobAsBinaryString(answer.data);

    }).then(function (event) {

      deepEqual(event.target.result, "def", "Check attachment");

    }).fail(unexpectedError).always(start);

  });

  test("Get & GetAttachment", function () {

    var shared = {}, jio, jio_local;

    shared.workspace = {};
    shared.local_storage_description = {
      "type": "local",
      "username": "revision get",
      "mode": "memory"
    };

    jio = jIO.createJIO({
      "type": "revision",
      "sub_storage": shared.local_storage_description
    }, {"workspace": shared.workspace});

    jio_local = jIO.createJIO(shared.local_storage_description, {
      "workspace": shared.workspace
    });

    stop();

    success(jio.get({"_id": "get1"})).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "get1",
        "message": "Document not found",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent document (winner) -> 404 Not Found");

      return success(jio.getAttachment({"_id": "get1", "_attachment": "get2"}));

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "get2",
        "error": "not_found",
        "id": "get1",
        "message": "Document not found",
        "method": "getAttachment",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent attachment (winner) -> 404 Not Found");

      // adding a document
      shared.doctree = {
        "_id": "get1.revision_tree.json",
        "children": JSON.stringify([{
          "rev": "1-rev1",
          "status": "available",
          "children": []
        }])
      };
      shared.doc_myget1 = {"_id": "get1.1-rev1", "title": "myGet1"};


      return jio_local.put(shared.doctree);
    }).then(function () {
      return jio_local.put(shared.doc_myget1);
    }).then(function () {

      // get document
      shared.doc_myget1_cloned = tool.deepClone(shared.doc_myget1);
      shared.doc_myget1_cloned._id = "get1";
      shared.doc_myget1_cloned._rev = "1-rev1";
      shared.doc_myget1_cloned._revisions = {"start": 1, "ids": ["rev1"]};
      shared.doc_myget1_cloned._revs_info = [{
        "rev": "1-rev1",
        "status": "available"
      }];

      return jio.get({"_id": "get1"}, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      });

    }).then(function (answer) {

      deepEqual(answer.data, shared.doc_myget1_cloned, "Get document (winner)");

      // adding two documents
      shared.doctree = {
        "_id": "get1.revision_tree.json",
        "children": JSON.stringify([{
          "rev": "1-rev1",
          "status": "available",
          "children": []
        }, {
          "rev": "1-rev2",
          "status": "available",
          "children": [{
            "rev": "2-rev3",
            "status": "available",
            "children": []
          }]
        }])
      };
      shared.doc_myget2 = {"_id": "get1.1-rev2", "title": "myGet2"};
      shared.doc_myget3 = {"_id": "get1.2-rev3", "title": "myGet3"};

      return jio_local.put(shared.doctree);
    }).then(function () {
      return jio_local.put(shared.doc_myget2);
    }).then(function () {
      return jio_local.put(shared.doc_myget3);
    }).then(function () {

      // get document
      shared.doc_myget3_cloned = tool.deepClone(shared.doc_myget3);
      shared.doc_myget3_cloned._id = "get1";
      shared.doc_myget3_cloned._rev = "2-rev3";
      shared.doc_myget3_cloned._revisions =
        {"start": 2, "ids": ["rev3", "rev2"]};
      shared.doc_myget3_cloned._revs_info = [{
        "rev": "2-rev3",
        "status": "available"
      }, {
        "rev": "1-rev2",
        "status": "available"
      }];
      shared.doc_myget3_cloned._conflicts = ["1-rev1"];

      return jio.get({"_id": "get1"}, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      });
    }).then(function (answer) {

      deepEqual(answer.data,
                shared.doc_myget3_cloned,
                "Get document (winner, after posting another one)");

      return success(jio.get({"_id": "get1", "_rev": "1-rev0"}, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "get1",
        "message": "Unable to find the document",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get document (inexistent specific revision)");

      // get specific document
      shared.doc_myget2_cloned = tool.deepClone(shared.doc_myget2);
      shared.doc_myget2_cloned._id = "get1";
      shared.doc_myget2_cloned._rev = "1-rev2";
      shared.doc_myget2_cloned._revisions = {"start": 1, "ids": ["rev2"]};
      shared.doc_myget2_cloned._revs_info = [{
        "rev": "1-rev2",
        "status": "available"
      }];
      shared.doc_myget2_cloned._conflicts = ["1-rev1"];
      return jio.get({"_id": "get1", "_rev": "1-rev2"}, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      });

    }).then(function (answer) {

      deepEqual(answer.data,
                shared.doc_myget2_cloned,
                "Get document (specific revision)");

      // adding an attachment
      shared.attmt_myget3 = {
        "get2": {
          "length": 3,
          "digest": "sha256-ba7816bf8f01cfea414140de5dae2223b00361a3" +
            "96177a9cb410ff61f20015ad",
          "content_type": "oh/yeah"
        }
      };
      shared.doc_myget3._attachments = shared.attmt_myget3;

      return jio_local.putAttachment({
        "_id": shared.doc_myget3._id,
        "_attachment": "get2",
        "_data": "abc",
        "_content_type": "oh/yeah"
      });

    }).then(function () {

      return jio.getAttachment({"_id": "get1", "_attachment": "get2"});

    }).then(function (answer) {

      return tool.readBlobAsBinaryString(answer.data);

    }).then(function (event) {

      deepEqual(event.target.result, "abc", "Get attachment (winner)");

      // get inexistent attachment specific rev
      return success(jio.getAttachment({
        "_id": "get1",
        "_attachment": "get2",
        "_rev": "1-rev1"
      }, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "get2",
        "error": "not_found",
        "id": "get1",
        "message": "Unable to get an inexistent attachment",
        "method": "getAttachment",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get inexistent attachment (specific revision) -> 404 Not Found");

      return jio.getAttachment({
        "_id": "get1",
        "_attachment": "get2",
        "_rev": "2-rev3"
      }, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      });

    }).then(function (answer) {

      return tool.readBlobAsBinaryString(answer.data);

    }).then(function (event) {

      deepEqual(event.target.result,
                "abc",
                "Get attachment (specific revision)");

      // get document with attachment (specific revision)
      delete shared.doc_myget2_cloned._attachments;
      return jio.get({"_id": "get1", "_rev": "1-rev2"}, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      });

    }).then(function (answer) {

      deepEqual(answer.data,
                shared.doc_myget2_cloned,
                "Get document which have an attachment (specific revision)");

      // get document with attachment (winner)
      shared.doc_myget3_cloned._attachments = shared.attmt_myget3;
      return jio.get({"_id": "get1"}, {
        "revs_info": true,
        "revs": true,
        "conflicts": true
      });

    }).then(function (answer) {

      deepEqual(answer.data,
                shared.doc_myget3_cloned,
                "Get document which have an attachment (winner)");

    }).fail(unexpectedError).always(start);

  });

  // test("Remove", function () {

  //   var o = generateTools();

  //   o.jio = jIO.newJio({
  //     "type": "revision",
  //     "sub_storage": {
  //       "type": "local",
  //       "username": "urevrem",
  //       "application_name": "arevrem"
  //     }
  //   });
  //   o.localpath = "jio/localstorage/urevrem/arevrem";

  //   // 1. remove document without revision
  //   o.spy(o, "status", 409, "Remove document without revision " +
  //         "-> 409 Conflict");
  //   o.jio.remove({"_id": "remove1"}, o.f);
  //   o.tick(o);

  //   // 2. remove attachment without revision
  //   o.spy(o, "status", 409, "Remove attachment without revision " +
  //         "-> 409 Conflict");
  //  o.jio.removeAttachment({"_id": "remove1", "_attachment": "remove2"}, o.f);
  //   o.tick(o);

  //   // adding a document with attachments
  //   o.doc_myremove1 = {
  //     "_id": "remove1.1-veryoldrev",
  //     "title": "myRemove1"
  //   };

  //   util.jsonlocalstorage.setItem(o.localpath + "/remove1.1-veryoldrev",
  //                        o.doc_myremove1);

  //   o.doc_myremove1._id = "remove1.2-oldrev";
  //   o.attachment_remove2 = {
  //     "length": 3,
  //     "digest": "md5-dontcare",
  //     "content_type": "oh/yeah"
  //   };
  //   o.attachment_remove3 = {
  //     "length": 5,
  //     "digest": "md5-865f5cc7fbd7854902eae9d8211f178a",
  //     "content_type": "he/ho"
  //   };
  //   o.doc_myremove1._attachments = {
  //     "remove2": o.attachment_remove2,
  //     "remove3": o.attachment_remove3
  //   };

  //   util.jsonlocalstorage.setItem(o.localpath + "/remove1.2-oldrev",
  //                        o.doc_myremove1);
  //   util.jsonlocalstorage.setItem(
  //     o.localpath + "/remove1.2-oldrev/remove2",
  //     "abc"
  //   );
  //   util.jsonlocalstorage.setItem(
  //     o.localpath + "/remove1.2-oldrev/remove3",
  //     "defgh"
  //   );

  //   // add document tree
  //   o.doctree = {
  //     "children": [{
  //       "rev": "1-veryoldrev",
  //       "status": "available",
  //       "children": [{
  //         "rev": "2-oldrev",
  //         "status": "available",
  //         "children": []
  //       }]
  //     }]
  //   };
  //  util.jsonlocalstorage.setItem(o.localpath + "/remove1.revision_tree.json",
  //                        o.doctree);

  //   // 3. remove inexistent attachment
  //   o.spy(o, "status", 404, "Remove inexistent attachment -> 404 Not Found");
  //   o.jio.removeAttachment({
  //     "_id": "remove1",
  //     "_attachment": "remove0",
  //     "_rev": "2-oldrev"
  //   }, o.f);
  //   o.tick(o);

  //   // 4. remove existing attachment
  //   o.rev_hash = generateRevisionHash({
  //     "_id": "remove1",
  //     "_attachment": "remove2",
  //   }, {"start": 2, "ids": ["oldrev", "veryoldrev"]});
  //   o.spy(o, "value", {
  //     "ok": true,
  //     "id": "remove1",
  //     "attachment": "remove2",
  //     "rev": "3-" + o.rev_hash
  //   }, "Remove existing attachment");
  //   o.jio.removeAttachment({
  //     "_id": "remove1",
  //     "_attachment": "remove2",
  //     "_rev": "2-oldrev"
  //   }, o.f);
  //   o.tick(o);

  //   o.doctree = {
  //     "_id": "remove1.revision_tree.json",
  //     "children": [{
  //       "rev": "1-veryoldrev",
  //       "status": "available",
  //       "children": [{
  //         "rev": "2-oldrev",
  //         "status": "available",
  //         "children": [{
  //           "rev": "3-" + o.rev_hash,
  //           "status": "available",
  //           "children": []
  //         }]
  //       }]
  //     }]
  //   };

  //   // 5. check if document tree has been updated correctly
  //   deepEqual(util.jsonlocalstorage.getItem(
  //     o.localpath + "/remove1.revision_tree.json"
  //   ), o.doctree, "Check document tree");

  //   // 6. check if the attachment still exists
  //   deepEqual(util.jsonlocalstorage.getItem(
  //     o.localpath + "/remove1.2-oldrev/remove2"
  //   ), "abc", "Check attachment -> still exists");

  //   // 7. check if document is updated
  //   deepEqual(util.jsonlocalstorage.getItem(
  //     o.localpath + "/remove1.3-" + o.rev_hash
  //   ), {
  //     "_id": "remove1.3-" + o.rev_hash,
  //     "title": "myRemove1",
  //     "_attachments": {"remove3": o.attachment_remove3}
  //   }, "Check document");

  //   // 8. remove document with wrong revision
  //   o.spy(o, "status", 409, "Remove document with wrong revision " +
  //         "-> 409 Conflict");
  //   o.jio.remove({"_id": "remove1", "_rev": "1-a"}, o.f);
  //   o.tick(o);

  //   // 9. remove attachment wrong revision
  //   o.spy(o, "status", 409, "Remove attachment with wrong revision " +
  //         "-> 409 Conflict");
  //   o.jio.removeAttachment({
  //     "_id": "remove1",
  //     "_attachment": "remove2",
  //     "_rev": "1-a"
  //   }, o.f);
  //   o.tick(o);

  //   // 10. remove document
  //   o.last_rev = "3-" + o.rev_hash;
  //   o.rev_hash = generateRevisionHash(
  //     {"_id": "remove1"},
  //     {"start": 3, "ids": [o.rev_hash, "oldrev", "veryoldrev"]},
  //     true
  //   );
  //  o.spy(o, "value", {"ok": true, "id": "remove1", "rev": "4-" + o.rev_hash},
  //         "Remove document");
  //   o.jio.remove({"_id": "remove1", "_rev": o.last_rev}, o.f);
  //   o.tick(o);

  //   // 11. check document tree
  //   o.doctree.children[0].children[0].children[0].children.unshift({
  //     "rev": "4-" + o.rev_hash,
  //     "status": "deleted",
  //     "children": []
  //   });
  //   deepEqual(util.jsonlocalstorage.getItem(
  //     o.localpath + "/remove1.revision_tree.json"
  //   ), o.doctree, "Check document tree");

  //   util.closeAndcleanUpJio(o.jio);
  // });

  // test("allDocs", function () {

  //   var o = generateTools();

  //   o.jio = jIO.newJio({
  //     "type": "revision",
  //     "sub_storage": {
  //       "type": "local",
  //       "username": "urevad1",
  //       "application_name": "arevad1"
  //     }
  //   });
  //   o.localpath = "jio/localstorage/urevad1/arevad1";

  //   // adding 3 documents
  //   o.jio.put({"_id": "yes"}, function (err, response) {
  //     o.rev1 = (response || {}).rev;
  //   });
  //   o.jio.put({"_id": "no"}, function (err, response) {
  //     o.rev2 = (response || {}).rev;
  //   });
  //   o.jio.put({"_id": "maybe"}, function (err, response) {
  //     o.rev3 = (response || {}).rev;
  //   });
  //   o.clock.tick(1000);

  //   // adding conflicts
  //   o.jio.put({"_id": "maybe"});

  //   // adding 2 attachments
  //   o.jio.putAttachment({
  //     "_id": "yes",
  //     "_attachment": "blue",
  //     "_mimetype": "text/plain",
  //     "_rev": o.rev1,
  //     "_data": "sky"
  //   }, function (err, response) {
  //     o.rev1 = (response || {}).rev;
  //   });
  //   o.jio.putAttachment({
  //     "_id": "no",
  //     "_attachment": "Heeeee!",
  //     "_mimetype": "text/plain",
  //     "_rev": o.rev2,
  //     "_data": "Hooooo!"
  //   }, function (err, response) {
  //     o.rev2 = (response || {}).rev;
  //   });
  //   o.clock.tick(1000);

  //   o.rows = {
  //     "total_rows": 3,
  //     "rows": [{
  //       "id": "maybe",
  //       "key": "maybe",
  //       "value": {
  //         "rev": o.rev3
  //       }
  //     }, {
  //       "id": "no",
  //       "key": "no",
  //       "value": {
  //         "rev": o.rev2
  //       }
  //     }, {
  //       "id": "yes",
  //       "key": "yes",
  //       "value": {
  //         "rev": o.rev1
  //       }
  //     }]
  //   };
  //   o.spy(o, "value", o.rows, "allDocs");
  //   o.jio.allDocs(function (err, response) {
  //     if (response && response.rows) {
  //       response.rows.sort(function (a, b) {
  //         return a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  //       });
  //     }
  //     o.f(err, response);
  //   });
  //   o.tick(o);

  //   o.rows.rows[0].doc = {
  //     "_id": "maybe",
  //     "_rev": o.rev3
  //   };
  //   o.rows.rows[1].doc = {
  //     "_id": "no",
  //     "_rev": o.rev2,
  //     "_attachments": {
  //       "Heeeee!": {
  //         "content_type": "text/plain",
  //         "digest": "md5-2686969b0bc0fd9bc186146a1ecb09a7",
  //         "length": 7
  //       }
  //     },
  //   };
  //   o.rows.rows[2].doc = {
  //     "_id": "yes",
  //     "_rev": o.rev1,
  //     "_attachments": {
  //       "blue": {
  //         "content_type": "text/plain",
  //         "digest": "md5-900bc885d7553375aec470198a9514f3",
  //         "length":  3
  //       }
  //     },
  //   };
  //   o.spy(o, "value", o.rows, "allDocs + include docs");
  //   o.jio.allDocs({"include_docs": true}, function (err, response) {
  //     if (response && response.rows) {
  //       response.rows.sort(function (a, b) {
  //         return a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  //       });
  //     }
  //     o.f(err, response);
  //   });
  //   o.tick(o);

  //   util.closeAndcleanUpJio(o.jio);
  // });

  // test("Scenario", function () {

  //   var o = generateTools();

  //   o.jio = jIO.newJio({
  //     "type": "revision",
  //     "sub_storage": {
  //       "type": "local",
  //       "username": "usam1",
  //       "application_name": "asam1"
  //     }
  //   });
  //   o.localpath = "jio/localstorage/usam1/asam1";

  //   // new application
  //   ok(o.jio, "I open my application with revision and localstorage");

  //   // put non empty document A-1
  //   o.doc = {"_id": "sample1", "title": "mySample1"};
  //   o.revisions = {"start": 0, "ids": []};
  //   o.hex = generateRevisionHash(o.doc, o.revisions);
  //   o.rev = "1-" + o.hex;

  //   o.spy(o, "value", {"ok": true, "id": "sample1", "rev": o.rev},
  //         "Then, I create a new document (no attachment), my application " +
  //         "keep the revision in memory");
  //   o.jio.put(o.doc, o.f);
  //   o.tick(o);

  //   // open new tab (JIO)
  //   o.jio2 = jIO.newJio({
  //     "type": "revision",
  //     "sub_storage": {
  //       "type": "local",
  //       "username": "usam1",
  //       "application_name": "asam1"
  //     }
  //   });
  //   o.localpath = "jio/localstorage/usam1/asam1";

  //   // Create a new JIO in a new tab
  //   ok(o.jio2, "Now, I am opening a new tab, with the same application" +
  //      " and the same storage tree");

  //   // Get the document from the first storage
  //   o.doc._rev = o.rev;
  //   o.doc._revisions = {"ids": [o.hex], "start": 1};
  //   o.doc._revs_info = [{"rev": o.rev, "status": "available"}];
  //   o.spy(o, "value", o.doc, "And, on this new tab, I load the document," +
  //         "and my application keep the revision in memory");
  //   o.jio2.get({"_id": "sample1", "_rev": o.rev}, {
  //     "revs_info": true,
  //     "revs": true,
  //     "conflicts": true,
  //   }, o.f);
  //   o.tick(o);

  //   // MODIFY the 2nd version
  //   o.doc_2 = {"_id": "sample1", "_rev": o.rev,
  //              "title": "mySample2_modified"};
  //   o.revisions_2 = {"start": 1, "ids": [o.hex]};
  //   o.hex_2 = generateRevisionHash(o.doc_2, o.revisions_2);
  //   o.rev_2 = "2-" + o.hex_2;
  //   o.spy(o, "value", {"id": "sample1", "ok": true, "rev": o.rev_2},
  //         "So, I can modify and update it");
  //   o.jio2.put(o.doc_2, o.f);
  //   o.tick(o);

  //   // MODIFY first version
  //   o.doc_1 = {
  //     "_id": "sample1",
  //     "_rev": o.rev,
  //     "title": "mySample1_modified"
  //   };
  //   o.revisions_1 = {"start": 1, "ids": [o.rev.split('-')[1]]};
  //   o.hex_1 = generateRevisionHash(o.doc_1, o.revisions_1);
  //   o.rev_1 = "2-" + o.hex_1;
  //   o.spy(o, "value", {"id": "sample1", "ok": true, "rev": o.rev_1},
  //         "Back to the first tab, I update the document.");
  //   o.jio.put(o.doc_1, o.f);
  //   o.tick(o);

  //   // Close 1st tab
  //   o.jio.close();

  //   // Close 2nd tab
  //   o.jio2.close();
  //   ok(o.jio2, "I close tab both tabs");

  //   // Reopen JIO
  //   o.jio = jIO.newJio({
  //     "type": "revision",
  //     "sub_storage": {
  //       "type": "local",
  //       "username": "usam1",
  //       "application_name": "asam1"
  //     }
  //   });
  //   o.localpath = "jio/localstorage/usam1/asam1";
  //   ok(o.jio, "Later, I open my application again");

  //   // GET document without revision = winner & conflict!
  //   o.mydocSample3 = {"_id": "sample1", "title": "mySample1_modified",
  //                     "_rev": o.rev_1};
  //   o.mydocSample3._conflicts = [o.rev_2];
  //   o.mydocSample3._revs_info = [{"rev": o.rev_1, "status": "available"}, {
  //     "rev": o.rev,
  //     "status": "available"
  //   }];
  //   o.mydocSample3._revisions = {"ids": [o.hex_1, o.hex], "start": 2};
  //   o.spy(o, "value", o.mydocSample3, "I load the same document as before" +
  //         ", and a popup shows that there is a conflict");
  //   o.jio.get({"_id": "sample1"}, {
  //     "revs_info": true,
  //     "revs": true,
  //     "conflicts": true
  //   }, o.f);
  //   o.tick(o);

  //   // REMOVE one of the two conflicting versions
  //   o.revisions = {"start": 2, "ids": [
  //     o.rev_1.split('-')[1],
  //     o.rev.split('-')[1]
  //   ]};
  //   o.doc_myremove3 = {"_id": "sample1", "_rev": o.rev_1};
  //  o.rev_3 = "3-" + generateRevisionHash(o.doc_myremove3, o.revisions, true);

  //   o.spy(o, "value", {"ok": true, "id": "sample1", "rev": o.rev_3},
  //          "I choose one of the document and close the application.");
  //   o.jio.remove({"_id": "sample1", "_rev": o.rev_1}, o.f);
  //   o.tick(o);

  //   // check to see if conflict still exists
  //   o.mydocSample4 = {
  //     "_id": "sample1",
  //     "title": "mySample2_modified",
  //     "_rev": o.rev_2
  //   };
  //   o.mydocSample4._revs_info = [{"rev": o.rev_2, "status": "available"}, {
  //     "rev": o.rev,
  //     "status": "available"
  //   }];
  //   o.mydocSample4._revisions = {"ids": [o.hex_2, o.hex], "start": 2};

  //   o.spy(o, "value", o.mydocSample4, "Test if conflict still exists");
  //   o.jio.get({"_id": "sample1"}, {
  //     "revs_info": true,
  //     "revs": true,
  //     "conflicts": true
  //   }, o.f);
  //   o.tick(o);

  //   // END
  //   util.closeAndcleanUpJio(o.jio);
  // });

}));
