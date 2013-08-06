/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jio_tests, hex_sha256, window, test, ok, deepEqual, sinon,
  expect */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jio_tests, hex_sha256);
}(['jio', 'jio_tests', 'sha256', 'revisionstorage'], function (
  jIO,
  util,
  hex_sha256
) {
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
    doc = util.deepClone(doc);
    delete doc._rev;
    delete doc._revs;
    delete doc._revs_info;
    string = JSON.stringify(doc) + JSON.stringify(revisions) +
      JSON.stringify(deleted_flag ? true : false);
    return hex_sha256(string);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Tests

  module("Revision Storage + Local Storage");

  test("Post", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "urevpost",
        "application_name": "arevpost"
      }
    });
    o.localpath = "jio/localstorage/urevpost/arevpost";

    // post without id
    o.revisions = {"start": 0, "ids": []};
    o.spy(o, "status", undefined, "Post without id");
    o.jio.post({}, function (err, response) {
      o.f.apply(arguments);
      o.uuid = (err || response).id;
      ok(util.isUuid(o.uuid), "Uuid should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + o.uuid);
    });
    o.tick(o);
    o.rev = "1-" + generateRevisionHash({"_id": o.uuid}, o.revisions);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/" + o.uuid + "." + o.rev),
      {"_id": o.uuid + "." + o.rev},
      "Check document"
    );

    // check document tree
    o.doc_tree = {
      "_id": o.uuid + ".revision_tree.json",
      "children": [{
        "rev": o.rev,
        "status": "available",
        "children": []
      }]
    };
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/" + o.uuid + ".revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // post non empty document
    o.doc = {"_id": "post1", "title": "myPost1"};
    o.rev = "1-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"ok": true, "id": "post1", "rev": o.rev}, "Post");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "post1." + o.rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/post1." + o.rev),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children[0] = {
      "rev": o.rev,
      "status": "available",
      "children": []
    };
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/post1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // post and document already exists
    o.doc = {"_id": "post1", "title": "myPost2"};
    o.rev = "1-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {
      "ok": true,
      "id": "post1",
      "rev": o.rev
    }, "Post and document already exists");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "post1." + o.rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/post1." + o.rev),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children.unshift({
      "rev": o.rev,
      "status": "available",
      "children": []
    });
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/post1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // post + revision
    o.doc = {"_id": "post1", "_rev": o.rev, "title": "myPost2"};
    o.revisions = {"start": 1, "ids": [o.rev.split('-')[1]]};
    o.rev = "2-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"ok": true, "id": "post1", "rev": o.rev},
           "Post + revision");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // // keep_revision_history
    // ok (false, "keep_revision_history Option Not Implemented");

    // check document
    o.doc._id = "post1." + o.rev;
    delete o.doc._rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/post1." + o.rev),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children[0].children.unshift({
      "rev": o.rev,
      "status": "available",
      "children": []
    });
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/post1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // add attachment
    o.doc._attachments = {
      "attachment_test": {
        "length": 35,
        "digest": "A",
        "content_type": "oh/yeah"
      }
    };
    util.jsonlocalstorage.setItem(o.localpath + "/post1." + o.rev, o.doc);
    util.jsonlocalstorage.setItem(
      o.localpath + "/post1." + o.rev + "/attachment_test",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );

    // post + attachment copy
    o.doc = {"_id": "post1", "_rev": o.rev, "title": "myPost2"};
    o.revisions = {
      "start": 2,
      "ids": [o.rev.split('-')[1], o.revisions.ids[0]]
    };
    o.rev = "3-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"ok": true, "id": "post1", "rev": o.rev},
           "Post + attachment copy");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check attachment
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/post1." + o.rev +
                                    "/attachment_test"),
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "Check Attachment"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children[0].children[0].children.unshift({
      "rev": o.rev,
      "status": "available",
      "children": []
    });
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/post1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // post + wrong revision
    o.doc = {"_id": "post1", "_rev": "3-wr3", "title": "myPost3"};
    o.revisions = {"start": 3, "ids": ["wr3"]};
    o.rev = "4-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"id": "post1", "ok": true, "rev": o.rev},
          "Postt + wrong revision");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/post1.3-wr3"),
      null,
      "Check document"
    );

    // check document
    o.doc._id = "post1." + o.rev;
    delete o.doc._rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/post1." + o.rev),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children.unshift({
      "rev": "3-wr3",
      "status": "missing",
      "children": [{
        "rev": o.rev,
        "status": "available",
        "children": []
      }]
    });
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/post1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    util.closeAndcleanUpJio(o.jio);
  });

  test("Put", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "urevput",
        "application_name": "arevput"
      }
    });
    o.localpath = "jio/localstorage/urevput/arevput";

    // put without id
    // error 20 -> document id required
    o.spy(o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.doc = {"_id": "put1", "title": "myPut1"};
    o.revisions = {"start": 0, "ids": []};
    o.rev = "1-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"ok": true, "id": "put1", "rev": o.rev},
           "Creates a document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/put1." + o.rev),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree = {
      "_id": "put1.revision_tree.json",
      "children": [{
        "rev": o.rev,
        "status": "available",
        "children": []
      }]
    };
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/put1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // put without rev and document already exists
    o.doc = {"_id": "put1", "title": "myPut2"};
    o.rev = "1-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"ok": true, "id": "put1", "rev": o.rev},
           "Put same document without revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    o.doc_tree.children.unshift({
      "rev": o.rev,
      "status": "available",
      "children": []
    });

    // put + revision
    o.doc = {"_id": "put1", "_rev": o.rev, "title": "myPut2"};
    o.revisions = {"start": 1, "ids": [o.rev.split('-')[1]]};
    o.rev = "2-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"id": "put1", "ok": true, "rev": o.rev},
           "Put + revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    delete o.doc._rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/put1." + o.rev),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree.children[0].children.unshift({
      "rev": o.rev,
      "status": "available",
      "children": []
    });
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/put1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // put + wrong revision
    o.doc = {"_id": "put1", "_rev": "3-wr3", "title": "myPut3"};
    o.revisions = {"start": 3, "ids": ["wr3"]};
    o.rev = "4-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"id": "put1", "ok": true, "rev": o.rev},
           "Put + wrong revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    delete o.doc._rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/put1." + o.rev),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree.children.unshift({
      "rev": "3-wr3",
      "status": "missing",
      "children": [{
        "rev": o.rev,
        "status": "available",
        "children": []
      }]
    });
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/put1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // put + revision history
    o.doc = {
      "_id": "put1",
      //"_revs": ["3-rh3", "2-rh2", "1-rh1"], // same as below
      "_revs": {"start": 3, "ids": ["rh3", "rh2", "rh1"]},
      "title": "myPut3"
    };
    o.spy(o, "value", {"id": "put1", "ok": true, "rev": "3-rh3"},
           "Put + revision history");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1.3-rh3";
    delete o.doc._revs;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/put1.3-rh3"),
      o.doc,
      "Check document"
    );

    // check document tree
    o.doc_tree.children.unshift({
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
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/put1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    // add attachment
    o.doc._attachments = {
      "att1": {
        "length": 1,
        "content_type": "text/plain",
        "digest": "md5-0cc175b9c0f1b6a831c399e269772661"
      },
      "att2": {
        "length": 2,
        "content_type": "dont/care",
        "digest": "md5-5360af35bde9ebd8f01f492dc059593c"
      }
    };
    util.jsonlocalstorage.setItem(o.localpath + "/put1.3-rh3", o.doc);
    util.jsonlocalstorage.setItem(o.localpath + "/put1.3-rh3/att1", "a");
    util.jsonlocalstorage.setItem(o.localpath + "/put1.3-rh3/att2", "bc");

    // put + revision with attachment
    o.attachments = o.doc._attachments;
    o.doc = {"_id": "put1", "_rev": "3-rh3", "title": "myPut4"};
    o.revisions = {"start": 3, "ids": ["rh3", "rh2", "rh1"]};
    o.rev = "4-" + generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"id": "put1", "ok": true, "rev": o.rev},
           "Put + revision (document contains attachments)");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    o.doc._attachments = o.attachments;
    delete o.doc._rev;
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/put1." + o.rev),
      o.doc,
      "Check document"
    );

    // check attachments
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/put1." + o.rev + "/att1"),
      "a",
      "Check Attachment"
    );
    deepEqual(
      util.jsonlocalstorage.getItem(o.localpath + "/put1." + o.rev + "/att2"),
      "bc",
      "Check Attachment"
    );

    // check document tree
    o.doc_tree.children[0].children[0].children[0].children.unshift({
      "rev": o.rev,
      "status": "available",
      "children": []
    });
    deepEqual(
      util.jsonlocalstorage.getItem(
        o.localpath + "/put1.revision_tree.json"
      ),
      o.doc_tree,
      "Check document tree"
    );

    util.closeAndcleanUpJio(o.jio);

  });

  test("Put Attachment", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "urevputattmt",
        "application_name": "arevputattmt"
      }
    });

    // putAttachment without doc id
    // error 20 -> document id required
    o.spy(o, "status", 20, "PutAttachment without doc id" +
          " -> 20 document id required");
    o.jio.putAttachment({}, o.f);
    o.tick(o);

    // putAttachment without attachment id
    // erorr 22 -> attachment id required
    o.spy(o, "status", 22, "PutAttachment without attachment id" +
          " -> 22 attachment id required");
    o.jio.putAttachment({"_id": "putattmt1"}, o.f);
    o.tick(o);

    // putAttachment without document
    o.revisions = {"start": 0, "ids": []};
    o.rev_hash = generateRevisionHash({"_id": "doc1", "_attachment": "attmt1"},
                                      o.revisions);
    o.rev = "1-" + o.rev_hash;
    o.spy(o, "value",
          {"ok": true, "id": "doc1", "attachment": "attmt1", "rev": o.rev},
          "PutAttachment without document, without data");
    o.jio.putAttachment({"_id": "doc1", "_attachment": "attmt1"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem(
        "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
      ),
      {
        "_id": "doc1." + o.rev,
        "_attachments": {
          "attmt1": {
            "length": 0,
            // md5("")
            "digest": "md5-d41d8cd98f00b204e9800998ecf8427e"
          }
        }
      },
      "Check document"
    );

    // check attachment
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
        + "/attmt1"
    ), "", "Check attachment");
    // adding a metadata to the document
    o.doc = util.jsonlocalstorage.getItem(
      "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
    );
    o.doc.title = "My Title";
    util.jsonlocalstorage.setItem(
      "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev,
      o.doc
    );

    // update attachment
    o.prev_rev = o.rev;
    o.revisions = {"start": 1, "ids": [o.rev_hash]};
    o.rev_hash = generateRevisionHash({
      "_id": "doc1",
      "_data": "abc",
      "_attachment": "attmt1",
    }, o.revisions);
    o.rev = "2-" + o.rev_hash;
    o.spy(o, "value",
          {"ok": true, "id": "doc1", "attachment": "attmt1", "rev": o.rev},
          "Update Attachment, with data");
    o.jio.putAttachment({
      "_id": "doc1",
      "_data": "abc",
      "_attachment": "attmt1",
      "_rev": o.prev_rev
    }, o.f);
    o.tick(o);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem(
        "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
      ),
      {
        "_id": "doc1." + o.rev,
        "title": "My Title",
        "_attachments": {
          "attmt1": {
            "length": 3,
            // md5("abc")
            "digest": "md5-900150983cd24fb0d6963f7d28e17f72"
          }
        }
      },
      "Check document"
    );

    // check attachment
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev +
        "/attmt1"
    ), "abc", "Check attachment");

    // putAttachment new attachment
    o.prev_rev = o.rev;
    o.revisions = {"start": 2, "ids": [o.rev_hash, o.revisions.ids[0]]};
    o.rev_hash = generateRevisionHash({
      "_id": "doc1",
      "_data": "def",
      "_attachment": "attmt2",
    }, o.revisions);
    o.rev = "3-" + o.rev_hash;
    o.spy(o, "value",
          {"ok": true, "id": "doc1", "attachment": "attmt2", "rev": o.rev},
          "PutAttachment without document, without data");
    o.jio.putAttachment({
      "_id": "doc1",
      "_data": "def",
      "_attachment": "attmt2",
      "_rev": o.prev_rev
    }, o.f);
    o.tick(o);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem(
        "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
      ),
      {
        "_id": "doc1." + o.rev,
        "title": "My Title",
        "_attachments": {
          "attmt1": {
            "length": 3,
            "digest": "md5-900150983cd24fb0d6963f7d28e17f72"
          },
          "attmt2": {
            "length": 3,
            // md5("def")
            "digest": "md5-4ed9407630eb1000c0f6b63842defa7d"
          }
        }
      },
      "Check document"
    );

    // check attachment
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev +
        "/attmt2"
    ), "def", "Check attachment");

    util.closeAndcleanUpJio(o.jio);

  });

  test("Get", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "urevget",
        "application_name": "arevget"
      }
    });
    o.localpath = "jio/localstorage/urevget/arevget";

    // get inexistent document
    o.spy(o, "status", 404, "Get inexistent document (winner)" +
          " -> 404 Not Found");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment
    o.spy(o, "status", 404, "Get inexistent attachment (winner)" +
          " -> 404 Not Found");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // adding a document
    o.doctree = {"children": [{
      "rev": "1-rev1",
      "status": "available",
      "children": []
    }]};
    o.doc_myget1 = {"_id": "get1.1-rev1", "title": "myGet1"};
    util.jsonlocalstorage.setItem(
      o.localpath + "/get1.revision_tree.json",
      o.doctree
    );
    util.jsonlocalstorage.setItem(o.localpath + "/get1.1-rev1", o.doc_myget1);

    // get document
    o.doc_myget1_cloned = util.deepClone(o.doc_myget1);
    o.doc_myget1_cloned._id = "get1";
    o.doc_myget1_cloned._rev = "1-rev1";
    o.doc_myget1_cloned._revisions = {"start": 1, "ids": ["rev1"]};
    o.doc_myget1_cloned._revs_info = [{
      "rev": "1-rev1",
      "status": "available"
    }];
    o.spy(o, "value", o.doc_myget1_cloned, "Get document (winner)");
    o.jio.get({"_id": "get1"}, {
      "revs_info": true,
      "revs": true,
      "conflicts": true
    }, o.f);
    o.tick(o);

    // adding two documents
    o.doctree = {"children": [{
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
    }]};
    o.doc_myget2 = {"_id": "get1.1-rev2", "title": "myGet2"};
    o.doc_myget3 = {"_id": "get1.2-rev3", "title": "myGet3"};
    util.jsonlocalstorage.setItem(
      o.localpath + "/get1.revision_tree.json",
      o.doctree
    );
    util.jsonlocalstorage.setItem(o.localpath + "/get1.1-rev2", o.doc_myget2);
    util.jsonlocalstorage.setItem(o.localpath + "/get1.2-rev3", o.doc_myget3);

    // get document
    o.doc_myget3_cloned = util.deepClone(o.doc_myget3);
    o.doc_myget3_cloned._id = "get1";
    o.doc_myget3_cloned._rev = "2-rev3";
    o.doc_myget3_cloned._revisions = {"start": 2, "ids": ["rev3", "rev2"]};
    o.doc_myget3_cloned._revs_info = [{
      "rev": "2-rev3",
      "status": "available"
    }, {
      "rev": "1-rev2",
      "status": "available"
    }];
    o.doc_myget3_cloned._conflicts = ["1-rev1"];
    o.spy(o, "value", o.doc_myget3_cloned,
          "Get document (winner, after posting another one)");
    o.jio.get({"_id": "get1"},
              {"revs_info": true, "revs": true, "conflicts": true},
              o.f);
    o.tick(o);

    // get inexistent specific document
    o.spy(o, "status", 404, "Get document (inexistent specific revision)" +
          " -> 404 Not Found");
    o.jio.get({"_id": "get1", "_rev": "1-rev0"}, {
      "revs_info": true,
      "revs": true,
      "conflicts": true,
    }, o.f);
    o.tick(o);

    // get specific document
    o.doc_myget2_cloned = util.deepClone(o.doc_myget2);
    o.doc_myget2_cloned._id = "get1";
    o.doc_myget2_cloned._rev = "1-rev2";
    o.doc_myget2_cloned._revisions = {"start": 1, "ids": ["rev2"]};
    o.doc_myget2_cloned._revs_info = [{
      "rev": "1-rev2",
      "status": "available"
    }];
    o.doc_myget2_cloned._conflicts = ["1-rev1"];
    o.spy(o, "value", o.doc_myget2_cloned, "Get document (specific revision)");
    o.jio.get({"_id": "get1", "_rev": "1-rev2"}, {
      "revs_info": true,
      "revs": true,
      "conflicts": true,
    }, o.f);
    o.tick(o);

    // adding an attachment
    o.attmt_myget3 = {
      "get2": {
        "length": 3,
        "digest": "md5-dontcare",
        "content_type": "oh/yeah"
      }
    };
    o.doc_myget3._attachments = o.attmt_myget3;
    util.jsonlocalstorage.setItem(o.localpath + "/get1.2-rev3", o.doc_myget3);
    util.jsonlocalstorage.setItem(o.localpath + "/get1.2-rev3/get2", "abc");

    // get attachment winner
    o.spy(o, "value", "abc", "Get attachment (winner)");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // get inexistent attachment specific rev
    o.spy(o, "status", 404, "Get inexistent attachment (specific revision)" +
          " -> 404 Not Found");
    o.jio.getAttachment({
      "_id": "get1",
      "_attachment": "get2",
      "_rev": "1-rev1"
    }, {
      "revs_info": true,
      "revs": true,
      "conflicts": true,
    }, o.f);
    o.tick(o);

    // get attachment specific rev
    o.spy(o, "value", "abc", "Get attachment (specific revision)");
    o.jio.getAttachment({
      "_id": "get1",
      "_attachment": "get2",
      "_rev": "2-rev3"
    }, {
      "revs_info": true,
      "revs": true,
      "conflicts": true,
    }, o.f);
    o.tick(o);

    // get document with attachment (specific revision)
    delete o.doc_myget2_cloned._attachments;
    o.spy(o, "value", o.doc_myget2_cloned,
          "Get document which have an attachment (specific revision)");
    o.jio.get({"_id": "get1", "_rev": "1-rev2"}, {
      "revs_info": true,
      "revs": true,
      "conflicts": true
    }, o.f);
    o.tick(o);

    // get document with attachment (winner)
    o.doc_myget3_cloned._attachments = o.attmt_myget3;
    o.spy(o, "value", o.doc_myget3_cloned,
          "Get document which have an attachment (winner)");
    o.jio.get({"_id": "get1"},
              {"revs_info": true, "revs": true, "conflicts": true},
              o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);

  });

  test("Remove", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "urevrem",
        "application_name": "arevrem"
      }
    });
    o.localpath = "jio/localstorage/urevrem/arevrem";

    // 1. remove document without revision
    o.spy(o, "status", 409, "Remove document without revision " +
          "-> 409 Conflict");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // 2. remove attachment without revision
    o.spy(o, "status", 409, "Remove attachment without revision " +
          "-> 409 Conflict");
    o.jio.removeAttachment({"_id": "remove1", "_attachment": "remove2"}, o.f);
    o.tick(o);

    // adding a document with attachments
    o.doc_myremove1 = {
      "_id": "remove1.1-veryoldrev",
      "title": "myRemove1"
    };

    util.jsonlocalstorage.setItem(o.localpath + "/remove1.1-veryoldrev",
                         o.doc_myremove1);

    o.doc_myremove1._id = "remove1.2-oldrev";
    o.attachment_remove2 = {
      "length": 3,
      "digest": "md5-dontcare",
      "content_type": "oh/yeah"
    };
    o.attachment_remove3 = {
      "length": 5,
      "digest": "md5-865f5cc7fbd7854902eae9d8211f178a",
      "content_type": "he/ho"
    };
    o.doc_myremove1._attachments = {
      "remove2": o.attachment_remove2,
      "remove3": o.attachment_remove3
    };

    util.jsonlocalstorage.setItem(o.localpath + "/remove1.2-oldrev",
                         o.doc_myremove1);
    util.jsonlocalstorage.setItem(
      o.localpath + "/remove1.2-oldrev/remove2",
      "abc"
    );
    util.jsonlocalstorage.setItem(
      o.localpath + "/remove1.2-oldrev/remove3",
      "defgh"
    );

    // add document tree
    o.doctree = {
      "children": [{
        "rev": "1-veryoldrev",
        "status": "available",
        "children": [{
          "rev": "2-oldrev",
          "status": "available",
          "children": []
        }]
      }]
    };
    util.jsonlocalstorage.setItem(o.localpath + "/remove1.revision_tree.json",
                         o.doctree);

    // 3. remove inexistent attachment
    o.spy(o, "status", 404, "Remove inexistent attachment -> 404 Not Found");
    o.jio.removeAttachment({
      "_id": "remove1",
      "_attachment": "remove0",
      "_rev": "2-oldrev"
    }, o.f);
    o.tick(o);

    // 4. remove existing attachment
    o.rev_hash = generateRevisionHash({
      "_id": "remove1",
      "_attachment": "remove2",
    }, {"start": 2, "ids": ["oldrev", "veryoldrev"]});
    o.spy(o, "value", {
      "ok": true,
      "id": "remove1",
      "attachment": "remove2",
      "rev": "3-" + o.rev_hash
    }, "Remove existing attachment");
    o.jio.removeAttachment({
      "_id": "remove1",
      "_attachment": "remove2",
      "_rev": "2-oldrev"
    }, o.f);
    o.tick(o);

    o.doctree = {
      "_id": "remove1.revision_tree.json",
      "children": [{
        "rev": "1-veryoldrev",
        "status": "available",
        "children": [{
          "rev": "2-oldrev",
          "status": "available",
          "children": [{
            "rev": "3-" + o.rev_hash,
            "status": "available",
            "children": []
          }]
        }]
      }]
    };

    // 5. check if document tree has been updated correctly
    deepEqual(util.jsonlocalstorage.getItem(
      o.localpath + "/remove1.revision_tree.json"
    ), o.doctree, "Check document tree");

    // 6. check if the attachment still exists
    deepEqual(util.jsonlocalstorage.getItem(
      o.localpath + "/remove1.2-oldrev/remove2"
    ), "abc", "Check attachment -> still exists");

    // 7. check if document is updated
    deepEqual(util.jsonlocalstorage.getItem(
      o.localpath + "/remove1.3-" + o.rev_hash
    ), {
      "_id": "remove1.3-" + o.rev_hash,
      "title": "myRemove1",
      "_attachments": {"remove3": o.attachment_remove3}
    }, "Check document");

    // 8. remove document with wrong revision
    o.spy(o, "status", 409, "Remove document with wrong revision " +
          "-> 409 Conflict");
    o.jio.remove({"_id": "remove1", "_rev": "1-a"}, o.f);
    o.tick(o);

    // 9. remove attachment wrong revision
    o.spy(o, "status", 409, "Remove attachment with wrong revision " +
          "-> 409 Conflict");
    o.jio.removeAttachment({
      "_id": "remove1",
      "_attachment": "remove2",
      "_rev": "1-a"
    }, o.f);
    o.tick(o);

    // 10. remove document
    o.last_rev = "3-" + o.rev_hash;
    o.rev_hash = generateRevisionHash(
      {"_id": "remove1"},
      {"start": 3, "ids": [o.rev_hash, "oldrev", "veryoldrev"]},
      true
    );
    o.spy(o, "value", {"ok": true, "id": "remove1", "rev": "4-" + o.rev_hash},
          "Remove document");
    o.jio.remove({"_id": "remove1", "_rev": o.last_rev}, o.f);
    o.tick(o);

    // 11. check document tree
    o.doctree.children[0].children[0].children[0].children.unshift({
      "rev": "4-" + o.rev_hash,
      "status": "deleted",
      "children": []
    });
    deepEqual(util.jsonlocalstorage.getItem(
      o.localpath + "/remove1.revision_tree.json"
    ), o.doctree, "Check document tree");

    util.closeAndcleanUpJio(o.jio);
  });

  test("allDocs", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "urevad1",
        "application_name": "arevad1"
      }
    });
    o.localpath = "jio/localstorage/urevad1/arevad1";

    // adding 3 documents
    o.jio.put({"_id": "yes"}, function (err, response) {
      o.rev1 = (response || {}).rev;
    });
    o.jio.put({"_id": "no"}, function (err, response) {
      o.rev2 = (response || {}).rev;
    });
    o.jio.put({"_id": "maybe"}, function (err, response) {
      o.rev3 = (response || {}).rev;
    });
    o.clock.tick(1000);

    // adding conflicts
    o.jio.put({"_id": "maybe"});

    // adding 2 attachments
    o.jio.putAttachment({
      "_id": "yes",
      "_attachment": "blue",
      "_mimetype": "text/plain",
      "_rev": o.rev1,
      "_data": "sky"
    }, function (err, response) {
      o.rev1 = (response || {}).rev;
    });
    o.jio.putAttachment({
      "_id": "no",
      "_attachment": "Heeeee!",
      "_mimetype": "text/plain",
      "_rev": o.rev2,
      "_data": "Hooooo!"
    }, function (err, response) {
      o.rev2 = (response || {}).rev;
    });
    o.clock.tick(1000);

    o.rows = {
      "total_rows": 3,
      "rows": [{
        "id": "maybe",
        "key": "maybe",
        "value": {
          "rev": o.rev3
        }
      }, {
        "id": "no",
        "key": "no",
        "value": {
          "rev": o.rev2
        }
      }, {
        "id": "yes",
        "key": "yes",
        "value": {
          "rev": o.rev1
        }
      }]
    };
    o.spy(o, "value", o.rows, "allDocs");
    o.jio.allDocs(function (err, response) {
      if (response && response.rows) {
        response.rows.sort(function (a, b) {
          return a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
        });
      }
      o.f(err, response);
    });
    o.tick(o);

    o.rows.rows[0].doc = {
      "_id": "maybe",
      "_rev": o.rev3
    };
    o.rows.rows[1].doc = {
      "_id": "no",
      "_rev": o.rev2,
      "_attachments": {
        "Heeeee!": {
          "content_type": "text/plain",
          "digest": "md5-2686969b0bc0fd9bc186146a1ecb09a7",
          "length": 7
        }
      },
    };
    o.rows.rows[2].doc = {
      "_id": "yes",
      "_rev": o.rev1,
      "_attachments": {
        "blue": {
          "content_type": "text/plain",
          "digest": "md5-900bc885d7553375aec470198a9514f3",
          "length":  3
        }
      },
    };
    o.spy(o, "value", o.rows, "allDocs + include docs");
    o.jio.allDocs({"include_docs": true}, function (err, response) {
      if (response && response.rows) {
        response.rows.sort(function (a, b) {
          return a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
        });
      }
      o.f(err, response);
    });
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Scenario", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "usam1",
        "application_name": "asam1"
      }
    });
    o.localpath = "jio/localstorage/usam1/asam1";

    // new application
    ok(o.jio, "I open my application with revision and localstorage");

    // put non empty document A-1
    o.doc = {"_id": "sample1", "title": "mySample1"};
    o.revisions = {"start": 0, "ids": []};
    o.hex = generateRevisionHash(o.doc, o.revisions);
    o.rev = "1-" + o.hex;

    o.spy(o, "value", {"ok": true, "id": "sample1", "rev": o.rev},
          "Then, I create a new document (no attachment), my application " +
          "keep the revision in memory");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // open new tab (JIO)
    o.jio2 = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "usam1",
        "application_name": "asam1"
      }
    });
    o.localpath = "jio/localstorage/usam1/asam1";

    // Create a new JIO in a new tab
    ok(o.jio2, "Now, I am opening a new tab, with the same application" +
       " and the same storage tree");

    // Get the document from the first storage
    o.doc._rev = o.rev;
    o.doc._revisions = {"ids": [o.hex], "start": 1};
    o.doc._revs_info = [{"rev": o.rev, "status": "available"}];
    o.spy(o, "value", o.doc, "And, on this new tab, I load the document," +
          "and my application keep the revision in memory");
    o.jio2.get({"_id": "sample1", "_rev": o.rev}, {
      "revs_info": true,
      "revs": true,
      "conflicts": true,
    }, o.f);
    o.tick(o);

    // MODIFY the 2nd version
    o.doc_2 = {"_id": "sample1", "_rev": o.rev,
               "title": "mySample2_modified"};
    o.revisions_2 = {"start": 1, "ids": [o.hex]};
    o.hex_2 = generateRevisionHash(o.doc_2, o.revisions_2);
    o.rev_2 = "2-" + o.hex_2;
    o.spy(o, "value", {"id": "sample1", "ok": true, "rev": o.rev_2},
          "So, I can modify and update it");
    o.jio2.put(o.doc_2, o.f);
    o.tick(o);

    // MODIFY first version
    o.doc_1 = {
      "_id": "sample1",
      "_rev": o.rev,
      "title": "mySample1_modified"
    };
    o.revisions_1 = {"start": 1, "ids": [o.rev.split('-')[1]]};
    o.hex_1 = generateRevisionHash(o.doc_1, o.revisions_1);
    o.rev_1 = "2-" + o.hex_1;
    o.spy(o, "value", {"id": "sample1", "ok": true, "rev": o.rev_1},
          "Back to the first tab, I update the document.");
    o.jio.put(o.doc_1, o.f);
    o.tick(o);

    // Close 1st tab
    o.jio.close();

    // Close 2nd tab
    o.jio2.close();
    ok(o.jio2, "I close tab both tabs");

    // Reopen JIO
    o.jio = jIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "usam1",
        "application_name": "asam1"
      }
    });
    o.localpath = "jio/localstorage/usam1/asam1";
    ok(o.jio, "Later, I open my application again");

    // GET document without revision = winner & conflict!
    o.mydocSample3 = {"_id": "sample1", "title": "mySample1_modified",
                      "_rev": o.rev_1};
    o.mydocSample3._conflicts = [o.rev_2];
    o.mydocSample3._revs_info = [{"rev": o.rev_1, "status": "available"}, {
      "rev": o.rev,
      "status": "available"
    }];
    o.mydocSample3._revisions = {"ids": [o.hex_1, o.hex], "start": 2};
    o.spy(o, "value", o.mydocSample3, "I load the same document as before" +
          ", and a popup shows that there is a conflict");
    o.jio.get({"_id": "sample1"}, {
      "revs_info": true,
      "revs": true,
      "conflicts": true
    }, o.f);
    o.tick(o);

    // REMOVE one of the two conflicting versions
    o.revisions = {"start": 2, "ids": [
      o.rev_1.split('-')[1],
      o.rev.split('-')[1]
    ]};
    o.doc_myremove3 = {"_id": "sample1", "_rev": o.rev_1};
    o.rev_3 = "3-" + generateRevisionHash(o.doc_myremove3, o.revisions, true);

    o.spy(o, "value", {"ok": true, "id": "sample1", "rev": o.rev_3},
           "I choose one of the document and close the application.");
    o.jio.remove({"_id": "sample1", "_rev": o.rev_1}, o.f);
    o.tick(o);

    // check to see if conflict still exists
    o.mydocSample4 = {
      "_id": "sample1",
      "title": "mySample2_modified",
      "_rev": o.rev_2
    };
    o.mydocSample4._revs_info = [{"rev": o.rev_2, "status": "available"}, {
      "rev": o.rev,
      "status": "available"
    }];
    o.mydocSample4._revisions = {"ids": [o.hex_2, o.hex], "start": 2};

    o.spy(o, "value", o.mydocSample4, "Test if conflict still exists");
    o.jio.get({"_id": "sample1"}, {
      "revs_info": true,
      "revs": true,
      "conflicts": true
    }, o.f);
    o.tick(o);

    // END
    util.closeAndcleanUpJio(o.jio);
  });

}));
