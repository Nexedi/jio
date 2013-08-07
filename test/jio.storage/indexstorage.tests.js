/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jio_tests, test, ok, deepEqual, sinon */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jio_tests);
}(['jio', 'jio_tests', 'indexstorage'], function (jIO, util) {
  "use strict";

  function generateTools() {
    return {
      clock: sinon.useFakeTimers(),
      spy: util.ospy,
      tick: util.otick
    };
  }

  module("IndexStorage");

  test("Post", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["title"]},
        {"id": "B", "index": ["title", "year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "ipost",
        "application_name": "ipost"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // post without id
    o.spy(o, "jobstatus", "done", "Post without id");
    o.jio.post({}, function (err, response) {
      o.id = (response || {}).id;
      o.f(err, response);
    });
    o.tick(o);

    // post non empty document
    o.doc = {"_id": "some_id", "title": "My Title",
             "year": 2000, "hey": "def"};
    o.spy(o, "value", {"ok": true, "id": "some_id"}, "Post document");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.fakeIndexA = {
      "indexing": ["title"],
      "free": [],
      "location": {
        "some_id": 0
      },
      "database": [
        {"_id": "some_id", "title": "My Title"}
      ]
    };
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB = {
      "indexing": ["title", "year"],
      "free": [],
      "location": {
        "some_id": 0
      },
      "database": [
        {"_id": "some_id", "title": "My Title", "year": 2000}
      ]
    };
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // post with escapable characters
    o.doc = {
      "_id": "other_id",
      "title": "myPost2",
      "findMeA": "keyword_*§$%&/()=?",
      "findMeB": "keyword_|ð@ł¶đæðſæðæſ³"
    };
    o.spy(o, "value", {"ok": true, "id": "other_id"},
          "Post with escapable characters");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // post and document already exists
    o.doc = {
      "_id": "some_id",
      "title": "myPost3",
      "findMeA": "keyword_ghi",
      "findMeB": "keyword_jkl"
    };
    o.spy(o, "status", 409, "Post and document already exists");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Put", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "iput",
        "application_name": "iput"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // put without id
    // error 20 -> document id required
    o.spy(o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.doc = {"_id": "put1", "title": "myPut1", "author": "John Doe"};
    o.spy(o, "value", {"ok": true, "id": "put1"}, "Put-create document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndexA = {
      "indexing": ["author"],
      "free": [],
      "location": {
        "put1": 0
      },
      "database": [{"_id": "put1", "author": "John Doe"}]
    };
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB = {
      "indexing": ["year"],
      "free": [],
      "location": {},
      "database": []
    };
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // modify document - modify keyword on index!
    o.doc = {"_id": "put1", "title": "myPuttter1", "author": "Jane Doe"};
    o.spy(o, "value", {"ok": true, "id": "put1"}, "Modify existing document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndexA.database[0].author = "Jane Doe";
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // add new document with same keyword!
    o.doc = {"_id": "new_doc", "title": "myPut2", "author": "Jane Doe"};
    o.spy(o, "value", {"ok": true, "id": "new_doc"},
           "Add new document with same keyword");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndexA.location.new_doc = 1;
    o.fakeIndexA.database.push({"_id": "new_doc", "author": "Jane Doe"});
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // add second keyword to index file
    o.doc = {"_id": "put1", "title": "myPut2", "author": "Jane Doe",
             "year": "1912"};
    o.spy(o, "value", {"ok": true, "id": "put1"},
           "add second keyword to index file");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB.location.put1 = 0;
    o.fakeIndexB.database.push({"_id": "put1", "year": "1912"});
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // remove a keyword from an existing document
    o.doc = {"_id": "new_doc", "title": "myPut2"};
    o.spy(o, "value", {"ok": true, "id": "new_doc"},
           "Remove keyword from existing document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    delete o.fakeIndexA.location.new_doc;
    o.fakeIndexA.database[1] = null;
    o.fakeIndexA.free.push(1);
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Check & Repair", function () {
    var o = generateTools(), i;

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["director"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "indexstoragerepair"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
        delete response.location;
        response.database.sort(function (a, b) {
          return a._id < b._id ? -1 : a._id > b._id ? 1 : 0;
        });
      }
      o.f(err, response);
    };

    o.fakeIndexA = {
      "indexing": ["director"],
      "free": [],
      "database": []
    };
    o.fakeIndexB = {
      "indexing": ["year"],
      "free": [],
      "database": []
    };

    for (i = 0; i < 10; i += 1) {
      o.jio.put({
        "_id": "id" + i,
        "director": "D" + i,
        "year": i,
        "title": "T" + i
      });

      o.tmp = o.fakeIndexA.free.pop() || o.fakeIndexA.database.length;
      o.fakeIndexA.database[o.tmp] = {"_id": "id" + i, "director": "D" + i};

      o.tmp = o.fakeIndexB.free.pop() || o.fakeIndexB.database.length;
      o.fakeIndexB.database[o.tmp] = {"_id": "id" + i, "year": i};
    }
    o.clock.tick(5000);

    o.spy(o, "status", 40, "Check database");
    o.jio.check({"_id": "A"}, o.f);
    o.tick(o);

    o.spy(o, "status", 40, "Check database");
    o.jio.check({"_id": "B"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"id": "A", "ok": true}, "Repair database");
    o.jio.repair({"_id": "A"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"id": "B", "ok": true}, "Repair database");
    o.jio.repair({"_id": "B"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"id": "A", "ok": true}, "Check database again");
    o.jio.check({"_id": "A"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"id": "B", "ok": true}, "Check database again");
    o.jio.check({"_id": "B"}, o.f);
    o.tick(o);

    // check index file
    o.spy(o, "value", o.fakeIndexA, "Manually check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.spy(o, "value", o.fakeIndexB, "Manually check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.jio2 = jIO.newJio({"type": "local", "username": "indexstoragerepair"});

    o.jio2.put({"_id": "blah", "title": "t", "year": "y", "director": "d"});
    o.clock.tick(1000);
    util.closeAndcleanUpJio(o.jio2);

    o.fakeIndexA.database.unshift({"_id": "blah", "director": "d"});
    o.fakeIndexB.database.unshift({"_id": "blah", "year": "y"});

    o.spy(o, "status", 40, "Check Document");
    o.jio.check({"_id": "blah"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"id": "blah", "ok": true}, "Repair Document");
    o.jio.repair({"_id": "blah"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"id": "blah", "ok": true}, "Check Document again");
    o.jio.repair({"_id": "blah"}, o.f);
    o.tick(o);

    // check index file
    o.spy(o, "value", o.fakeIndexA, "Manually check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.spy(o, "value", o.fakeIndexB, "Manually check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("PutAttachment", function () {

    // not sure these need to be run, because the index does not change
    // and only small modifications have been made to handle putAttachment
    // tests are from localStorage putAttachment
    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "iputatt",
        "application_name": "iputatt"
      }
    });

    // putAttachment without doc id
    // error 20 -> document id required
    o.spy(o, "status", 20, "PutAttachment without doc id");
    o.jio.putAttachment({}, o.f);
    o.tick(o);

    // putAttachment without attachment id
    // error 22 -> attachment id required
    o.spy(o, "status", 22, "PutAttachment without attachment id");
    o.jio.putAttachment({"_id": "putattmt1"}, o.f);
    o.tick(o);

    // putAttachment without document
    // error 404 -> not found
    o.spy(o, "status", 404, "PutAttachment without document");
    o.jio.putAttachment({"_id": "putattmt1", "_attachment": "putattmt2"}, o.f);
    o.tick(o);

    // putAttachment with document
    o.doc = {"_id": "putattmt1", "title": "myPutAttmt1"};
    o.spy(o, "value", {"ok": true, "id": "putattmt1"},
          "Put underlying document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    o.spy(o, "value", {
      "ok": true,
      "id": "putattmt1",
      "attachment": "putattmt2"
    }, "PutAttachment with document, without data");
    o.jio.putAttachment({"_id": "putattmt1", "_attachment": "putattmt2"}, o.f);
    o.tick(o);

    // check document
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/iputatt/iputatt/putattmt1"
    ), {
      "_id": "putattmt1",
      "title": "myPutAttmt1",
      "_attachments": {
        "putattmt2": {
          "length": 0,
          // md5("")
          "digest": "md5-d41d8cd98f00b204e9800998ecf8427e"
        }
      }
    }, "Check document");

    // check attachment
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/iputatt/iputatt/putattmt1/putattmt2"
    ), "", "Check attachment");

    // update attachment
    o.spy(o, "value",
          {"ok": true, "id": "putattmt1", "attachment": "putattmt2"},
          "Update Attachment, with data");
    o.jio.putAttachment({
      "_id": "putattmt1",
      "_attachment": "putattmt2",
      "_data": "abc"
    }, o.f);
    o.tick(o);

    // check document
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/iputatt/iputatt/putattmt1"
    ), {
      "_id": "putattmt1",
      "title": "myPutAttmt1",
      "_attachments": {
        "putattmt2": {
          "length": 3,
          // md5("abc")
          "digest": "md5-900150983cd24fb0d6963f7d28e17f72"
        }
      }
    }, "Check document");

    // check attachment
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/iputatt/iputatt/putattmt1/putattmt2"
    ), "abc", "Check attachment");

    util.closeAndcleanUpJio(o.jio);
  });

  test("Get", function () {

    // not sure these need to be run, because the index does not change
    // and only small modifications have been made to handle putAttachment
    // tests are from localStorage putAttachment
    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "iget",
        "application_name": "iget"
      }
    });

    // get inexistent document
    o.spy(o, "status", 404, "Get inexistent document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment
    o.spy(o, "status", 404, "Get inexistent attachment");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // adding a document
    o.doc_get1 = {
      "_id": "get1",
      "title": "myGet1"
    };
    util.jsonlocalstorage.setItem(
      "jio/localstorage/iget/iget/get1",
      o.doc_get1
    );

    // get document
    o.spy(o, "value", o.doc_get1, "Get document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment (document exists)
    o.spy(o, "status", 404, "Get inexistent attachment (document exists)");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // adding an attachment
    o.doc_get1._attachments = {
      "get2": {
        "length": 2,
        // md5("de")
        "digest": "md5-5f02f0889301fd7be1ac972c11bf3e7d"
      }
    };
    util.jsonlocalstorage.setItem(
      "jio/localstorage/iget/iget/get1",
      o.doc_get1
    );
    util.jsonlocalstorage.setItem("jio/localstorage/iget/iget/get1/get2", "de");

    // get attachment
    o.spy(o, "value", "de", "Get attachment");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Remove", function () {

    // not sure these need to be run, because the index does not change
    // and only small modifications have been made to handle putAttachment
    // tests are from localStorage putAttachment
    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "irem",
        "application_name": "irem"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // remove inexistent document
    o.spy(o, "status", 404, "Remove inexistent document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // remove inexistent document/attachment
    o.spy(o, "status", 404, "Remove inexistent attachment");
    o.jio.removeAttachment({"_id": "remove1", "_attachment": "remove2"}, o.f);
    o.tick(o);

    // adding a document
    o.jio.put({"_id": "remove1", "title": "myRemove1",
               "author": "Mr. President", "year": "2525"
              });
    o.tick(o);

    // adding a 2nd document with same keywords
    o.jio.put({"_id": "removeAlso", "title": "myRemove2",
               "author": "Martin Mustermann", "year": "2525"
              });
    o.tick(o);

    // remove document
    o.spy(o, "value", {"ok": true, "id": "remove1"}, "Remove document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // check index
    o.fakeIndexA = {
      "indexing": ["author"],
      "free": [0],
      "location": {
        "removeAlso": 1
      },
      "database": [null, {"_id": "removeAlso", "author": "Martin Mustermann"}]
    };
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB = {
      "indexing": ["year"],
      "free": [0],
      "location": {
        "removeAlso": 1
      },
      "database": [null, {"_id": "removeAlso", "year": "2525"}]
    };
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // check document
    o.spy(o, "status", 404, "Check if document has been removed");
    o.jio.get({"_id": "remove1"}, o.f);
    o.tick(o);

    // adding a new document
    o.jio.put({"_id": "remove3",
               "title": "myRemove1",
               "author": "Mrs Sunshine",
               "year": "1234"
              });
    o.tick(o);

    // adding an attachment
    o.jio.putAttachment({
      "_id": "remove3",
      "_attachment": "removeAtt",
      "_mimetype": "text/plain",
      "_data": "hello"
    });
    o.tick(o);

    // add another attachment
    o.jio.putAttachment({
      "_id": "remove3",
      "_attachment": "removeAtt2",
      "_mimetype": "text/plain",
      "_data": "hello2"
    });
    o.tick(o);

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "remove3", "attachment": "removeAtt2"},
          "Remove one of multiple attachment");
    o.jio.removeAttachment({
      "_id": "remove3",
      "_attachment": "removeAtt2"
    }, o.f);
    o.tick(o);

    // check index
    o.fakeIndexA.free = [];
    o.fakeIndexA.location.remove3 = 0;
    o.fakeIndexA.database[0] = {"_id": "remove3", "author": "Mrs Sunshine"};
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB.free = [];
    o.fakeIndexB.location.remove3 = 0;
    o.fakeIndexB.database[0] = {"_id": "remove3", "year": "1234"};
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // remove document and attachment together
    o.spy(o, "value", {"ok": true, "id": "remove3"},
          "Remove one document and attachment together");
    o.jio.remove({"_id": "remove3"}, o.f);
    o.tick(o);

    // check index
    o.fakeIndexA.free = [0];
    delete o.fakeIndexA.location.remove3;
    o.fakeIndexA.database[0] = null;
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB.free = [0];
    delete o.fakeIndexB.location.remove3;
    o.fakeIndexB.database[0] = null;
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // check attachment
    o.spy(o, "status", 404, "Check if attachment has been removed");
    o.jio.getAttachment({"_id": "remove3", "_attachment": "removeAtt"}, o.f);
    o.tick(o);

    // check document
    o.spy(o, "status", 404, "Check if document has been removed");
    o.jio.get({"_id": "remove3"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("AllDocs", function () {

    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "iall",
        "application_name": "iall"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // adding documents
    o.all1 = { "_id": "dragon.doc",
               "title": "some title", "author": "Dr. No", "year": "1968"
             };
    o.spy(o, "value", {"ok": true, "id": "dragon.doc"}, "Put 1");
    o.jio.put(o.all1, o.f);
    o.tick(o);
    o.all2 = {
      "_id": "timemachine",
      "title": "hello world",
      "author": "Dr. Who",
      "year": "1968"
    };
    o.spy(o, "value", {"ok": true, "id": "timemachine"}, "Put 2");
    o.jio.put(o.all2, o.f);
    o.tick(o);
    o.all3 = {
      "_id": "rocket.ppt",
      "title": "sunshine.",
      "author": "Dr. Snuggles",
      "year": "1985"
    };
    o.spy(o, "value", {"ok": true, "id": "rocket.ppt"}, "Put 3");
    o.jio.put(o.all3, o.f);
    o.tick(o);
    o.all4 = {
      "_id": "stick.jpg",
      "title": "clouds",
      "author": "Dr. House",
      "year": "2005"
    };
    o.spy(o, "value", {"ok": true, "id": "stick.jpg"}, "Put 4");
    o.jio.put(o.all4, o.f);
    o.tick(o);

    // check index
    o.fakeIndexA = {
      "indexing": ["author"],
      "free": [],
      "location": {
        "dragon.doc": 0,
        "timemachine": 1,
        "rocket.ppt": 2,
        "stick.jpg": 3
      },
      "database": [
        {"_id": "dragon.doc", "author": "Dr. No"},
        {"_id": "timemachine", "author": "Dr. Who"},
        {"_id": "rocket.ppt", "author": "Dr. Snuggles"},
        {"_id": "stick.jpg", "author": "Dr. House"}
      ]
    };
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.thisShouldBeTheAnswer = {
      "rows": [
        {"id": "dragon.doc", "key": "dragon.doc", "value": {} },
        {"id": "timemachine", "key": "timemachine", "value": {} },
        {"id": "rocket.ppt", "key": "rocket.ppt", "value": {} },
        {"id": "stick.jpg", "key": "stick.jpg", "value": {} }
      ],
      "total_rows": 4
    };
    o.spy(o, "value", o.thisShouldBeTheAnswer, "allDocs (served by index)");
    o.jio.allDocs(o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("AllDocs Complex Queries", function () {

    var o = generateTools(), i, m = 15;

    o.jio = jIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["director"]},
        {"id": "B", "index": ["title", "year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "icomplex",
        "application_name": "acomplex"
      }
    });
    o.localpath = "jio/localstorage/icomplex/acomplex";

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // sample data
    o.titles = [
      "Shawshank Redemption",
      "Godfather",
      "Godfather 2",
      "Pulp Fiction",
      "The Good, The Bad and The Ugly",
      "12 Angry Men",
      "The Dark Knight",
      "Schindlers List",
      "Lord of the Rings - Return of the King",
      "Fight Club",
      "Star Wars Episode V",
      "Lord Of the Rings - Fellowship of the Ring",
      "One flew over the Cuckoo's Nest",
      "Inception", "Godfellas"
    ];
    o.years = [
      1994,
      1972,
      1974,
      1994,
      1966,
      1957,
      2008,
      1993,
      2003,
      1999,
      1980,
      2001,
      1975,
      2010,
      1990
    ];
    o.director = [
      "Frank Darabont",
      "Francis Ford Coppola",
      "Francis Ford Coppola",
      "Quentin Tarantino",
      "Sergio Leone",
      "Sidney Lumet",
      "Christopher Nolan",
      "Steven Spielberg",
      "Peter Jackson",
      "David Fincher",
      "Irvin Kershner",
      "Peter Jackson",
      "Milos Forman",
      "Christopher Nolan",
      " Martin Scorsese"
    ];

    o.fakeIndexA = {
      "indexing": ["director"],
      "free": [],
      "location": {},
      "database": []
    };

    o.fakeIndexB = {
      "indexing": ["title", "year"],
      "free": [],
      "location": {},
      "database": []
    };

    for (i = 0; i < m; i += 1) {
      o.jio.put({
        "_id": i.toString(),
        "director": o.director[i],
        "year": o.years[i],
        "title": o.titles[i]
      });

      o.tmp = o.fakeIndexA.free.pop() || o.fakeIndexA.database.length;
      o.fakeIndexA.database[o.tmp] = {
        "_id": i.toString(),
        "director": o.director[i]
      };
      o.fakeIndexA.location[i] = o.tmp;

      o.tmp = o.fakeIndexB.free.pop() || o.fakeIndexB.database.length;
      o.fakeIndexB.database[o.tmp] = {
        "_id": i.toString(),
        "year": o.years[i],
        "title": o.titles[i]
      };
      o.fakeIndexB.location[i] = o.tmp;

      o.clock.tick(1000);
    }
    // o.clock.tick(1000);

    // check index file
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // response
    o.allDocsResponse = {};
    o.allDocsResponse.rows = [];
    o.allDocsResponse.total_rows = m;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse.rows.push({
        "id": i.toString(),
        "key": i.toString(),
        "value": {},
        "doc": {
          "_id": i.toString(),
          "title": o.titles[i],
          "year": o.years[i],
          "director": o.director[i]
        }
      });
    }

    o.response = JSON.parse(JSON.stringify(o.allDocsResponse));
    for (i = 0; i < o.response.rows.length; i += 1) {
      delete o.response.rows[i].doc;
    }

    // alldocs
    o.spy(o, "value", o.response, "AllDocs response generated from index");
    o.jio.allDocs(o.f);
    o.tick(o, 1000);

    // complex queries
    o.response = JSON.parse(JSON.stringify(o.allDocsResponse));
    i = 0;
    while (i < o.response.rows.length) {
      if (o.response.rows[i].year < 1980) {
        o.response.rows.splice(i, 1);
      } else {
        o.response.rows[i].value = {
          "year": o.response.rows[i].doc.year,
          "title": o.response.rows[i].doc.title
        };
        delete o.response.rows[i].doc;
        i += 1;
      }
    }
    o.response.rows.sort(function (a, b) {
      return (a.value.year > b.value.year ? -1 :
              a.value.year < b.value.year ? 1 : 0);
    });
    o.response.rows.length = 5;
    o.response.total_rows = 5;
    o.spy(o, "value", o.response,
          "allDocs (complex queries year >= 1980, index used to do query)");
    o.jio.allDocs({
      // "query":'(year: >= "1980" AND year: < "2000")',
      "query": '(year: >= "1980")',
      "limit": [0, 5],
      "sort_on": [['year', 'descending']],
      "select_list": ['title', 'year']
    }, o.f);
    o.tick(o);

    // complex queries
    o.spy(o, "value", {"total_rows": 0, "rows": []},
          "allDocs (complex queries year >= 1980, can't use index)");
    o.jio.allDocs({
      // "query":'(year: >= "1980" AND year: < "2000")',
      "query": '(year: >= "1980")',
      "limit": [0, 5],
      "sort_on": [['year', 'descending']],
      "select_list": ['director', 'year']
    }, o.f);
    o.tick(o);

    // empty query returns all
    o.response = JSON.parse(JSON.stringify(o.allDocsResponse));
    i = 0;
    while (i < o.response.rows.length) {
      o.response.rows[i].value.title =
        o.response.rows[i].doc.title;
      delete o.response.rows[i].doc;
      i += 1;
    }
    o.response.rows.sort(function (a, b) {
      return (a.value.title > b.value.title ? -1 :
              a.value.title < b.value.title ? 1 : 0);
    });
    o.spy(o, "value", o.response,
          "allDocs (empty query in complex query)");
    o.jio.allDocs({
      "sort_on": [['title', 'descending']],
      "select_list": ['title']
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });
}));
