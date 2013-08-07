/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jio_tests, test, ok, deepEqual, sinon */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jio_tests);
}(['jio', 'jio_tests', 'localstorage', 'gidstorage'], function (jIO, util) {
  "use strict";

  function generateTools() {
    return {
      clock: sinon.useFakeTimers(),
      spy: util.ospy,
      tick: util.otick
    };
  }

  module("GID Storage");

  test("Post", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage post test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
    o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
    o.clock.tick(2000);

    util.closeAndcleanUpJio(o.local_jio);

    // Fail to post a document because metadata doesn't respect constraints
    // XXX check reason
    o.spy(o, 'status', 400, 'Post document without respecting constraints ' +
          '-> bad request');
    o.jio.post({}, o.f);
    o.tick(o);

    // Fail to post a document but a document already exists
    o.spy(o, 'status', 409, 'Post existent document -> conflict');
    o.jio.post({"creator": "a", "title": "water"}, o.f);
    o.tick(o);

    // Succeed to post because no document with the same gid has been found
    o.spy(o, 'value', {
      "id": "{\"creator\":[\"a%\"]}",
      "ok": true
    }, 'Post respecting constraints');
    o.jio.post({"creator": "a%", "title": "fire"}, o.f);
    o.tick(o);

    // Fail to post because this document has been uploaded right before
    o.spy(o, 'status', 409, 'Post same document respecting constraints ' +
          '-> conflicts');
    o.jio.post({"creator": "a%", "title": "space"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Get", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage get test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
    o.local_jio.put({"_id": "red", "creator": ["ac", "b"], "title": "wind"});
    o.clock.tick(2000);

    util.closeAndcleanUpJio(o.local_jio);

    // Fail to get document because _id doesn't respect constraints
    o.spy(o, 'status', 400, 'Get document without respecting constraints ' +
          '-> bad request');
    o.jio.get({"_id": "a"}, o.f);
    o.tick(o);

    // Fail to get because no document with the same gid has been found
    o.spy(o, 'status', 404, 'Get inexistent document');
    o.jio.get({"_id": "{\"creator\":[\"c\"]}"}, o.f);
    o.tick(o);

    // Succeed to get, gid is good, document found
    o.spy(o, 'value', {
      "_id": "{\"creator\":[\"b\"]}",
      "creator": ["ac", "b"],
      "title": "wind"
    }, 'Get document');
    o.jio.get({"_id": "{\"creator\":[\"b\"]}"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("AllDocs", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage allDocs test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "green", "creator": ["a"], "title": "earth"});
    o.local_jio.put({"_id": "red", "creator": ["a", "b"], "title": "water"});
    o.local_jio.put({"_id": "yellow", "creator": ["c", "d"], "title": "wind"});
    o.local_jio.put({"_id": "purple", "creator": ["s", "d"], "title": "fire"});
    o.local_jio.put({"_id": "blue", "title": "space"})
    o.clock.tick(3000);

    util.closeAndcleanUpJio(o.local_jio);

    // Get all document and sort to make comparison easier
    o.spy(o, 'value', {
      "rows": [{
        "id": "{\"creator\":[\"a\"]}",
        "value": {}
      }, {
        "id": "{\"creator\":[\"a\",\"b\"]}",
        "value": {}
      }, {
        "id": "{\"creator\":[\"c\",\"d\"]}",
        "value": {}
      }, {
        "id": "{\"creator\":[\"s\",\"d\"]}",
        "value": {}
      }],
      "total_rows": 4
    }, 'Get all docs');
    o.jio.allDocs({
      "sort_on": [["creator", "ascending"]]
    }, o.f);
    o.tick(o);

    // Get all document with complex queries
    o.spy(o, 'value', {
      "rows": [{
        "id": "{\"creator\":[\"s\",\"d\"]}",
        "value": {"creator": ["s", "d"]}
      }],
      "total_rows": 1
    }, 'Get all docs with complex query');
    o.jio.allDocs({
      "query": 'creator: "d"',
      "select_list": ["creator"],
      "limit": [1, 1],
      "sort_on": [["creator", "ascending"]]
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Put", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage put test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
    o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
    o.clock.tick(2000);

    // Fail to put document because id does not respect constraints
    o.spy(o, 'status', 400, 'Put document without respecting constraints ' +
          '-> bad request');
    o.jio.put({"_id": "a", "creator": "a", "title": "fire"}, o.f);
    o.tick(o);

    // Fail to put because gid given != gid generated by the constraints
    o.spy(o, 'status', 400, 'Put document without respecting constraints ' +
          '-> bad request');
    o.jio.put({
      "_id": "{\"creator\":[\"a\"]}",
      "creator": "b",
      "title": "water"
    }, o.f);
    o.tick(o);

    // Succeed to update a document with its gid
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"creator\":[\"a\"]}"
    }, 'Update document');
    o.jio.put({
      "_id": "{\"creator\":[\"a\"]}",
      "creator": "a",
      "title": "space"
    }, o.f);
    o.tick(o);

    // Succeed to create a document, the gid given is good
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"creator\":[\"c\"]}"
    }, 'Create document');
    o.jio.put({
      "_id": "{\"creator\":[\"c\"]}",
      "creator": "c",
      "title": "magma"
    }, o.f);
    o.tick(o);

    // Check if the local storage document is well updated to make sure the second
    // put did not update the wrong document.
    o.spy(o, 'value', {
      "_id": "blue",
      "creator": "a",
      "title": "space"
    }, "Check sub documents");
    o.local_jio.get({"_id": "blue"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.local_jio);
    util.closeAndcleanUpJio(o.jio);
  });

  test("Remove", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage remove test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
    o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
    o.clock.tick(2000);

    util.closeAndcleanUpJio(o.local_jio);

    // Fail to remove document because given gid does not respect constraints
    o.spy(o, 'status', 400, 'Remove document without respecting constraints ' +
          '-> bad request');
    o.jio.remove({"_id": "a"}, o.f);
    o.tick(o);

    // Succeed to remove
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"creator\":[\"b\"]}"
    }, 'Remove document');
    o.jio.remove({
      "_id": "{\"creator\":[\"b\"]}"
    }, o.f);
    o.tick(o);

    // Fail to remove the same document. This test checks also that only one
    // document matches the gid constraints
    o.spy(o, 'status', 404, 'Remove inexistent document');
    o.jio.remove({
      "_id": "{\"creator\":[\"b\"]}"
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("putAttachment", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage put attachment test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
    o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
    o.clock.tick(2000);

    // Fail to put attachment because given gid doesn't respect constraints
    o.spy(o, 'status', 400, 'put attachment without respecting constraints ' +
          '-> bad request');
    o.jio.putAttachment({
      "_id": "a",
      "_attachment": "body",
      "_data": "abc",
      "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // Succeed to put an attachment to a document
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"creator\":[\"b\"]}",
      "attachment": "body"
    }, 'put attachment');
    o.jio.putAttachment({
      "_id": "{\"creator\":[\"b\"]}",
      "_attachment": "body",
      "_data": "abc",
      "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // Check if the local storage document really have the new attachment
    o.spy(o, 'value', "abc", "Check attachment");
    o.local_jio.getAttachment({"_id": "green", "_attachment": "body"}, o.f);
    o.tick(o);

    // Succeed to update an attachment
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"creator\":[\"b\"]}",
      "attachment": "body"
    }, 'put attachment');
    o.jio.putAttachment({
      "_id": "{\"creator\":[\"b\"]}",
      "_attachment": "body",
      "_data": "def",
      "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // Check if the local storage attachment really changed
    o.spy(o, 'value', "def", "Check attachment");
    o.local_jio.getAttachment({"_id": "green", "_attachment": "body"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.local_jio);
    util.closeAndcleanUpJio(o.jio);
  });

  test("getAttachment", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage get attachment test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
    o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
    o.clock.tick(2000);

    // Fail to get attachment because given gid doesn't respect constraints
    o.spy(o, 'status', 400, 'get attachment without respecting constraints ' +
          '-> bad request');
    o.jio.getAttachment({
      "_id": "a",
      "_attachment": "body"
    }, o.f);
    o.tick(o);

    // Fail to get an inexistent attachment from a document
    o.spy(o, 'status', 404, 'Get inexistent attachment');
    o.jio.getAttachment({
      "_id": "{\"creator\":[\"a\"]}",
      "_attachment": "body"
    }, o.f);
    o.tick(o);

    // Add an attachment manually to the document 'blue'
    o.local_jio.putAttachment({
      "_id": "blue",
      "_attachment": "body",
      "_data": "lol",
      "_mimetype": "text/plain"
    });
    o.clock.tick(2000);
    util.closeAndcleanUpJio(o.local_jio);

    // Succeed to get the previous attachment
    o.spy(o, 'value', "lol", 'Get attachment');
    o.jio.getAttachment({
      "_id": "{\"creator\":[\"a\"]}",
      "_attachment": "body"
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("removeAttachment", function () {
    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage remove attachment test"
    };

    // local jio is going to help us to prepare localstorage for gid tests
    o.local_jio = jIO.newJio(o.localstorage_spec);

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "creator": "list"
        }
      }
    });

    // preparing localstorage with documents
    o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
    o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
    o.clock.tick(2000);
    o.local_jio.putAttachment({
      "_id": "blue",
      "_attachment": "body",
      "_data": "lol",
      "_mimetype": "text/plain"
    });
    o.clock.tick(2000);

    // Fail to remove attachment because given gid doesn't respect constraints
    o.spy(o, 'status', 400, 'Remove attachment without respecting constraints ' +
          '-> bad request');
    o.jio.removeAttachment({
      "_id": "a",
      "_attachment": "body",
      "_data": "abc",
      "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // Succeed to remove an attachment from a document
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"creator\":[\"a\"]}",
      "attachment": "body"
    }, 'Remove attachment');
    o.jio.removeAttachment({
      "_id": "{\"creator\":[\"a\"]}",
      "_attachment": "body"
    }, o.f);
    o.tick(o);

    // Check if the local storage document doesn't have attachment anymore
    o.spy(o, 'status', 404, "Check attachment");
    o.local_jio.getAttachment({"_id": "green", "_attachment": "body"}, o.f);
    o.tick(o);

    // Fail to remove the same attachment because it's already removed
    o.spy(o, 'status', 404, 'Remove attachment');
    o.jio.removeAttachment({
      "_id": "{\"creator\":[\"b\"]}",
      "_attachment": "body",
      "_data": "def",
      "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.local_jio);
    util.closeAndcleanUpJio(o.jio);
  });

  test("More Constraints", function () {
    // This test will use gid storage in a 'real case'

    var o = generateTools(this);

    o.localstorage_spec = {
      "type": "local",
      "username": "one",
      "application_name": "gid storage more constraints test"
    };

    o.jio = jIO.newJio({
      "type": "gid",
      "sub_storage": o.localstorage_spec,
      "constraints": {
        "default": {
          "type": "DCMIType",
          "title": "string"
        },
        "Text": {
          "date": "date",
          "language": "string"
        },
        "Image": {
          "format": "contentType"
        }
      }
    });

    // Post a text document. This test also checks if the gid is well
    // created. Indeed, the json string "id" of the response is a dict with keys
    // inserted in alphabetic order, so that a gid is universal. It also checks
    // document types list management. It checks 'string', 'DCMIType' and 'date'
    // metadata types.
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
        "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}"
    }, 'Post a text document');
    o.jio.post({
      "type": ["Text", "web page"],
      "title": {"lang": "fr", "content": "Texte pour ce test"},
      "date": "2012-12-12",
      "modified": "2012-12-12",
      "format": "text/html",
      "language": "fr"
    }, o.f);
    o.tick(o);

    // Put the associated attachment
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
        "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
      "attachment": "body"
    }, 'Put text content as body');
    o.jio.putAttachment({
      "_id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
        "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
      "_attachment": "body",
      "_data": "<h1>Mon document html.</h1>",
      "_mimetype": "text/html"
    }, o.f);
    o.tick(o);

    // Post an image. It checks 'string', 'DCMIType' and 'contentType' metadata
    // types.
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"format\":\"text/svg+xml\"," +
        "\"title\":\"My image title\",\"type\":\"Image\"}"
    }, 'Post an image document');
    o.jio.post({
      "type": "Image",
      "title": "My image title",
      "date": "2012-12-13",
      "modified": "2012-12-13",
      "format": "text/svg+xml"
    }, o.f);
    o.tick(o);

    // Put the associated attachment
    o.spy(o, 'value', {
      "ok": true,
      "id": "{\"format\":\"text/svg+xml\"," +
        "\"title\":\"My image title\",\"type\":\"Image\"}",
      "attachment": "body"
    }, 'Put text content as body');
    o.jio.putAttachment({
      "_id": "{\"format\":\"text/svg+xml\"," +
        "\"title\":\"My image title\",\"type\":\"Image\"}",
      "_attachment": "body",
      "_data": "<svg/>",
      "_mimetype": "text/svg+xml"
    }, o.f);
    o.tick(o);

    // Get the html document
    o.spy(o, 'value', {
      "_id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
        "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
      "type": ["Text", "web page"],
      "title": {"lang": "fr", "content": "Texte pour ce test"},
      "date": "2012-12-12",
      "modified": "2012-12-12",
      "format": "text/html",
      "language": "fr",
      "_attachments": {
        "body": {
          "length": 27,
          "digest": "md5-6f40c762ca7a8fac52567f12ce5441ef",
          "content_type": "text/html"
        }
      }
    }, "Get html metadata");
    o.jio.get({
      "_id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
        "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
    }, o.f);
    o.tick(o);

    // Get a list of documents
    o.spy(o, 'value', {
      "rows": [{
        "id": "{\"format\":\"text/svg+xml\"," +
          "\"title\":\"My image title\",\"type\":\"Image\"}",
        "value": {}
      }, {
        "id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
          "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
        "value": {}
      }],
      "total_rows": 2
    }, 'Get a document list');
    o.jio.allDocs({"sort_on": [["title", "ascending"]]}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

}));
