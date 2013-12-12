/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jio_tests, test, ok, deepEqual, sinon, module */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jio_tests);
}(['jio', 'jio_tests', 'localstorage', 'splitstorage'], function (jIO, util) {
  "use strict";

  function generateTools() {
    return {
      clock: sinon.useFakeTimers(),
      spy: util.ospy,
      tick: util.otick
    };
  }

  module("SplitStorage + LocalStorage");

  test("Post", function () {
    var o = generateTools();
    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "post1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "post2"
      }]
    });

    // post without id
    o.spy(o, "jobstatus", "done", "Post document without id");
    o.jio.post({
      "_underscored_meta": "uvalue",
      "meta": "data"
    }, function (err, response) {
      o.f(err, response);
      o.uuid = (err || response).id;
      ok(util.isUuid(o.uuid), "Uuid should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + o.uuid);
    });
    o.tick(o);

    // check uploaded documents
    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/post1/' + o.uuid
    ), {
      "_id": o.uuid,
      "_underscored_meta": "uvalue",
      "data": "{\"meta\""
    }, "Check uploaded document in sub storage 1");

    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/post2/' + o.uuid
    ), {
      "_id": o.uuid,
      "_underscored_meta": "uvalue",
      "data": ":\"data\"}"
    }, "Check uploaded document in sub storage 2");

    // post with id
    o.spy(o, "value", {"ok": true, "id": "one"}, "Post document with id");
    o.jio.post({
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data",
      "hello": "world"
    }, o.f);
    o.tick(o);

    // check uploaded documents
    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/post1/one'
    ), {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "data": "{\"meta\":\"data\","
    }, "Check uploaded document in sub storage 1");

    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/post2/one'
    ), {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "data": "\"hello\":\"world\"}"
    }, "Check uploaded document in sub storage 2");

    // post with id
    o.spy(o, "status", 409, "Post document with same id");
    o.jio.post({
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data",
      "hello": "world"
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("PutAttachment", function () {
    var o = generateTools();
    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "putAttachment1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "putAttachment2"
      }]
    });

    o.spy(o, "status", 404, "Put attachment on a inexistent document");
    o.jio.putAttachment({
      "_id": "one",
      "_attachment": "my_attachment",
      "_data": "My Data",
      "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
    o.clock.tick(1000);

    o.spy(o, "value", {
      "ok": true,
      "id": "one",
      "attachment": "my_attachment"
    }, "Put attachment");
    o.jio.putAttachment({
      "_id": "one",
      "_attachment": "my_attachment",
      "_data": "My Data",
      "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // check uploaded documents
    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/putAttachment1/one'
    ), {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "data": "{\"meta\"",
      "_attachments": {
        "my_attachment": {
          "length": 3,
          "digest": "md5-1b4686bc8ca15befdccb1da1dcb8c271", // md5("My ")
          "content_type": "text/plain"
        }
      }
    }, "Check uploaded document in sub storage 1");

    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/putAttachment2/one'
    ), {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "data": ":\"data\"}",
      "_attachments": {
        "my_attachment": {
          "length": 4,
          "digest": "md5-f6068daa29dbb05a7ead1e3b5a48bbee", // md5("Data")
          "content_type": "text/plain"
        }
      }
    }, "Check uploaded document in sub storage 2");

    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/putAttachment1/one/my_attachment'
    ), "My ", "Check uploaded document in sub storage 1");

    deepEqual(util.jsonlocalstorage.getItem(
      'jio/localstorage/splitstorage/putAttachment2/one/my_attachment'
    ), "Data", "Check uploaded document in sub storage 2");

    util.closeAndcleanUpJio(o.jio);
  });

  test("Get", function () {
    var o = generateTools();
    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "get1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "get2"
      }]
    });

    o.spy(o, "status", 404, "Get missing document");
    o.jio.get({"_id": "one"}, o.f);
    o.tick(o);

    o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
    o.clock.tick(1000);

    o.spy(o, "value", {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data"
    }, "Get posted document");
    o.jio.get({"_id": "one"}, o.f);
    o.tick(o);

    o.jio.putAttachment({
      "_id": "one",
      "_attachment": "my_attachment",
      "_data": "My Data",
      "_mimetype": "text/plain"
    });
    o.clock.tick(1000);

    o.spy(o, "value", {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data",
      "_attachments": {
        "my_attachment": {
          "length": 7,
          "content_type": "text/plain"
        }
      }
    }, "Get document with attachment informations");
    o.jio.get({"_id": "one"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("GetAttachment", function () {
    var o = generateTools();
    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "getAttachment1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "getAttachment2"
      }]
    });

    o.spy(o, "status", 404, "Get attachment from missing document");
    o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
    o.clock.tick(1000);

    o.spy(o, "status", 404, "Get missing attachment from document");
    o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    o.jio.putAttachment({
      "_id": "one",
      "_attachment": "my_attachment",
      "_data": "My Data",
      "_mimetype": "text/plain"
    });
    o.clock.tick(1000);

    o.spy(o, "value", "My Data", "Get attachment");
    o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("removeAttachment", function () {
    var o = generateTools();

    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "removeAttachment1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "removeAttachment2"
      }]
    });

    o.spy(o, "status", 404, "Remove attachment from inexistent document");
    o.jio.removeAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
    o.clock.tick(1000);

    o.spy(o, "status", 404, "Remove inexistent attachment");
    o.jio.removeAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    o.jio.putAttachment({
      "_id": "one",
      "_attachment": "my_attachment",
      "_data": "My Data",
      "_mimetype": "text/plain"
    });
    o.clock.tick(1000);

    o.spy(o, "value", {
      "ok": true,
      "id": "one",
      "attachment": "my_attachment"
    }, "Remove attachment");
    o.jio.removeAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    o.spy(o, "value", {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data"
    }, "Get document for check");
    o.jio.get({"_id": "one"}, o.f);
    o.tick(o);

    o.spy(o, "status", 404, "Get attachment for check");
    o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("remove", function () {
    var o = generateTools();
    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "remove1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "remove2"
      }]
    });

    o.spy(o, "status", 404, "Remove missing document");
    o.jio.remove({"_id": "one"}, o.f);
    o.tick(o);

    o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
    o.clock.tick(1000);

    o.jio.putAttachment({
      "_id": "one",
      "_attachment": "my_attachment",
      "_data": "My Data",
      "_mimetype": "text/plain"
    });
    o.clock.tick(1000);

    o.spy(o, "value", {"ok": true, "id": "one"}, "Remove document");
    o.jio.remove({"_id": "one"}, o.f);
    o.tick(o);

    o.spy(o, "status", 404, "Get attachment for check");
    o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
    o.tick(o);

    o.spy(o, "status", 404, "Get document for check");
    o.jio.get({"_id": "one"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Put", function () {
    var o = generateTools();
    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "put1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "put2"
      }]
    });

    o.spy(o, "value", {"ok": true, "id": "one"}, "Put document");
    o.jio.put({
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data"
    }, o.f);
    o.tick(o);

    o.spy(o, "value", {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data"
    }, "Get document for check");
    o.jio.get({"_id": "one"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"ok": true, "id": "one"}, "Put document again");
    o.jio.put({
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meow": "dog"
    }, o.f);
    o.tick(o);

    o.spy(o, "value", {
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meow": "dog"
    }, "Get document for check");
    o.jio.get({"_id": "one"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("AllDocs", function () {
    var o = generateTools();
    o.jio = jIO.newJio({
      "type": "split",
      "storage_list": [{
        "type": "local",
        "username": "splitstorage",
        "application_name": "alldocs1"
      }, {
        "type": "local",
        "username": "splitstorage",
        "application_name": "alldocs2"
      }]
    });

    for (o.i = 0; o.i < 5; o.i += 1) {
      o.jio.post({
        "_id": "doc" + o.i,
        "_underscored_meta": "uvalue" + o.i,
        "meta": "data" + o.i
      });
      o.clock.tick(1000);
    }

    for (o.i = 0; o.i < 2; o.i += 1) {
      o.jio.putAttachment({
        "_id": "doc" + o.i,
        "_attachment": "my_attachment" + o.i,
        "_data": "My Data" + o.i,
        "_mimetype": "text/plain"
      });
      o.clock.tick(1000);
    }

    o.spy(o, "value", {
      "_id": "doc1",
      "_underscored_meta": "uvalue1",
      "meta": "data1",
      "_attachments": {
        "my_attachment1": {
          "length": 8,
          "content_type": "text/plain"
        }
      }
    }, "Get document for check");
    o.jio.get({"_id": "doc1"}, o.f);
    o.tick(o);

    o.spy(o, "value", {
      "total_rows": 5,
      "rows": [{
        "id": "doc0",
        "key": "doc0",
        "value": {}
      }, {
        "id": "doc1",
        "key": "doc1",
        "value": {}
      }, {
        "id": "doc2",
        "key": "doc2",
        "value": {}
      }, {
        "id": "doc3",
        "key": "doc3",
        "value": {}
      }, {
        "id": "doc4",
        "key": "doc4",
        "value": {}
      }]
    }, "AllDocs with document ids only");
    o.jio.allDocs(function (err, response) {
      if (response && Array.isArray(response.rows)) {
        response.rows.sort(function (a, b) {
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
      }
      o.f(err, response);
    });
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

}));
