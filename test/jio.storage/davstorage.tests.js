/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jio_tests, window, test, ok, deepEqual, sinon, expect */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jio_tests);
}(['jio', 'jio_tests', 'davstorage'], function (jIO, util) {
  "use strict";

  function generateTools() {
    return {
      clock: sinon.useFakeTimers(),
      spy: util.ospy,
      tick: util.otick
    };
  }

  module("DAVStorage");

  test("Post", function () {

    var o = generateTools(this);

    o.jio = jIO.newJio({
      "type": "dav",
      "url": "https://ca-davstorage:8080",
      "auth_type": "basic",
      "username": "admin",
      "password": "pwd"
    });

    // post without id
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/[0-9a-fA-F]{4}"),
      [
        404,
        {"Content-Type": "text/html"},
        "<h1>Document not found</h1>"
      ]
    );
    o.server.respondWith(
      "PUT",
      new RegExp("https://ca-davstorage:8080/[0-9a-fA-F]{4}"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>Document updated!</h1>"
      ]
    );
    o.spy(o, "jobstatus", "done", "Post without id");
    o.jio.post({}, {"max_retry": 1}, function (err, response) {
      o.f.apply(arguments);
      if (response) {
        ok(util.isUuid(response.id), "Uuid should look like " +
           "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + response.id);
      }
    });
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // post document with id
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        404,
        {"Content-Type": "text/html"},
        "<h1>Document not found</h1>"
      ]
    );
    o.server.respondWith(
      "PUT",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>Document updated!</h1>"
      ]
    );
    o.spy(o, "value", {"id": "http://100%.json", "ok": true},
          "Create document with an id");
    o.jio.post({
      "_id": "http://100%.json",
      "title": "Hello There"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // post already existant file
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/plain"},
        '{"_id":"doc1","title":"Hello There"}'
      ]
    );
    o.spy(o, "status", 405, "Update document previous -> 405");
    o.jio.post({
      "_id": "http://100%.json",
      "title": "Hello There Again"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    util.closeAndcleanUpJio(o.jio);
  });

  test("Put", function () {

    var o = generateTools(this);

    o.jio = jIO.newJio({
      "type": "dav",
      "url": "https://ca-davstorage:8080",
      "auth_type": "basic",
      "username": "admin",
      "password": "pwd"
    });

    // put without id => 20 Id Required
    o.spy(o, "status", 20, "Put without id -> 20");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "PUT",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>OK1</h1>"
      ]
    );
    o.spy(o, "value", {"ok": true, "id": "http://100%.json"},
           "Create document");
    o.jio.put({
      "_id": "http://100%.json",
      "title": "Hi There"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // update document
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "PUT",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>OK!</h1>"
      ]
    );
    o.spy(o, "value", {"ok": true, "id": "http://100%.json"},
           "Update document");
    o.jio.put({
      "_id": "http://100%.json",
      "title": "Hi There Again"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // putAttachment without document id => 20 Id Required
    o.spy(o, "status", 20, "PutAttachment without doc id -> 20");
    o.jio.putAttachment({"_attachment": "body.html"}, o.f);
    o.tick(o);

    // putAttachment without attachment id => 22 Attachment Id Required
    o.spy(o, "status", 22, "PutAttachment without attachment id -> 22");
    o.jio.putAttachment({"_id": "http://100%.json"}, o.f);
    o.tick(o);

    // putAttachment without underlying document => 404 Not Found
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        404,
        {"Content-Type": "text/html"},
        "<h1>Not Found</h1>"
      ]
    );
    o.spy(o, "status", 404, "PutAttachment without document -> 404");
    o.jio.putAttachment({
      "_id": "http://100%.json",
      "_attachment": "putattmt2"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // upload attachment
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/plain"},
        '{"_id":"http://100%.json","title":"Hi There!"}'
      ]
    );
    o.server.respondWith(
      "PUT",
      new RegExp("https://ca-davstorage:8080/" +
                 "http:%252F%252F100%2525_\\.json.body_\\.html"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>OK!</h1>"
      ]
    );
    o.server.respondWith(
      "PUT",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>OK!</h1>"
      ]
    );
    o.spy(o, "value", {
      "ok": true,
      "id": "http://100%.json",
      "attachment": "body.html"
    }, "Upload attachment");
    o.jio.putAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html",
      "_mimetype": "text/html",
      "_data": "<h1>Hi There!!</h1><p>How are you?</p>"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    util.closeAndcleanUpJio(o.jio);
  });

  test("Get", function () {

    var o = generateTools(this);

    o.jio = jIO.newJio({
      "type": "dav",
      "url": "https://ca-davstorage:8080",
      "auth_type": "basic",
      "username": "admin",
      "password": "pwd"
    });

    // get inexistent document
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        404,
        {"Content-Type": "text/html"},
        "<h1>Not Found</h1>"
      ]
    );
    o.spy(o, "status", 404, "Get non existing document -> 404");
    o.jio.get({"_id": "http://100%.json"}, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // get document
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        '{"_id":"http://100%.json","title":"Hi There!"}'
      ]
    );
    o.spy(o, "value", {"_id": "http://100%.json", "title": "Hi There!"},
          "Get document");
    o.jio.get({"_id": "http://100%.json"}, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // get inexistent attachment
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/" +
                 "http:%252F%252F100%2525_\\.json\\.body_\\.html"),
      [
        404,
        {"Content-Type": "text/html"},
        "<h1>Not Found</h1>"
      ]
    );
    o.spy(o, "status", 404, "Get inexistent attachment -> 404");
    o.jio.getAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // get attachment
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/" +
                 "http:%252F%252F100%2525_\\.json\\.body_\\.html"),
      [
        200,
        {"Content-Type": "text/plain"},
        "My Attachment Content"
      ]
    );
    o.spy(o, "value", "My Attachment Content", "Get attachment");
    o.jio.getAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    util.closeAndcleanUpJio(o.jio);
  });

  test("Remove", function () {

    var o = generateTools(this);

    o.jio = jIO.newJio({
      "type": "dav",
      "url": "https://ca-davstorage:8080",
      "auth_type": "basic",
      "username": "admin",
      "password": "pwd"
    });

    // remove inexistent document
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        404,
        {"Content-Type": "text/html"},
        "<h1>Not Found</h1>"
      ]
    );
    o.spy(o, "status", 404, "Remove inexistent document -> 404");
    o.jio.remove({"_id": "http://100%.json"}, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // remove document
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        "{My corrupted document}"
      ]
    );
    o.server.respondWith(
      "DELETE",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/plain"},
        "<h1>Deleted</h1>"
      ]
    );
    o.spy(o, "value", {"ok": true, "id": "http://100%.json"},
          "Remove document");
    o.jio.remove({"_id": "http://100%.json"}, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // remove inexistent attachment
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/plain"},
        "{}"
      ]
    );
    o.spy(o, "status", 404, "Remove inexistent attachment -> 404");
    o.jio.removeAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    // o.server.respond();
    // o.server.respond();
    o.server.restore();

    // remove attachment
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/plain"},
        JSON.stringify({
          "_attachments": {
            "body.html": {
              "length": 32,
              "digest": "md5-dontcare",
              "content_type": "text/html"
            }
          }
        })
      ]
    );
    o.server.respondWith(
      "PUT",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>OK</h1>"
      ]
    );
    o.server.respondWith(
      "DELETE",
      new RegExp("https://ca-davstorage:8080/" +
                 "http:%252F%252F100%2525_\\.json.body_\\.html"),
      [
        200,
        {"Content-Type": "text/html"},
        "<h1>OK</h1>"
      ]
    );
    o.spy(o, "value", {
      "ok": true,
      "id": "http://100%.json",
      "attachment": "body.html"
    }, "Remove attachment");
    o.jio.removeAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // remove document with multiple attachments
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/html"},
        JSON.stringify({
          "_attachments": {
            "body.html": {
              "length": 32,
              "digest": "md5-dontcare",
              "content_type": "text/html"
            },
            "other": {
              "length": 3,
              "digest": "md5-dontcare-again",
              "content_type": "text/plain"
            }
          }
        })
      ]
    );
    o.server.respondWith(
      "DELETE",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/plain"},
        "<h1>Deleted</h1>"
      ]
    );
    o.server.respondWith(
      "DELETE",
      new RegExp("https://ca-davstorage:8080/" +
                 "http:%252F%252F100%2525_\\.json\\.body_\\.html"),
      [
        200,
        {"Content-Type": "text/plain"},
        "<h1>Deleted</h1>"
      ]
    );
    o.server.respondWith(
      "DELETE",
      new RegExp("https://ca-davstorage:8080/" +
                 "http:%252F%252F100%2525_\\.json\\.other"),
      [
        200,
        {"Content-Type": "text/plain"},
        "<h1>Deleted</h1>"
      ]
    );
    o.spy(o, "value", {"ok": true, "id": "http://100%.json"},
          "Remove document containing multiple attachments");
    o.jio.remove({"_id": "http://100%.json"}, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    util.closeAndcleanUpJio(o.jio);
  });

  test("AllDocs", function () {

    // need to make server requests before activating fakeServer
    var davlist, o = generateTools();
    davlist = "<?xml version=\"1.0\" encoding=\"utf-8\"?> <D:multist" +
      "atus xmlns:D=\"DAV:\"> <D:response xmlns:lp1=\"DAV:\" xmlns:lp2" +
      "=\"http://apache.org/dav/props/\"> <D:href>/some/path/</D:href>" +
      " <D:propstat> <D:prop> <lp1:resourcetype><D:collection/></lp1:r" +
      "esourcetype> <lp1:creationdate>2012-05-02T12:48:33Z</lp1:creati" +
      "ondate> <lp1:getlastmodified>Wed, 02 May 2012 12:48:33 GMT</lp1" +
      ":getlastmodified> <lp1:getetag>\"1000-4bf0d1aeb9e43\"</lp1:gete" +
      "tag> <D:supportedlock> <D:lockentry> <D:lockscope><D:exclusive/" +
      "></D:lockscope> <D:locktype><D:write/></D:locktype> </D:lockent" +
      "ry> <D:lockentry> <D:lockscope><D:shared/></D:lockscope> <D:loc" +
      "ktype><D:write/></D:locktype> </D:lockentry> </D:supportedlock>" +
      " <D:lockdiscovery/> <D:getcontenttype>httpd/unix-directory</D:g" +
      "etcontenttype> </D:prop> <D:status>HTTP/1.1 200 OK</D:status> <" +
      "/D:propstat> </D:response> <D:response xmlns:lp1=\"DAV:\" xmlns" +
      ":lp2=\"http://apache.org/dav/props/\"> <D:href>/some/path/http:" +
      "%252F%252F100%2525_.json</D:href> <D:propstat> <D:prop> <lp1:re" +
      "sourcetype/> <lp1:creationdate>2012-05-02T12:48:31Z</lp1:creati" +
      "ondate> <lp1:getcontentlength>201</lp1:getcontentlength> <lp1:g" +
      "etlastmodified>Wed, 02 May 2012 12:48:27 GMT</lp1:getlastmodifi" +
      "ed> <lp1:getetag>\"c9-4bf0d1a845df9\"</lp1:getetag> <lp2:execut" +
      "able>F</lp2:executable> <D:supportedlock> <D:lockentry> <D:lock" +
      "scope><D:exclusive/></D:lockscope> <D:locktype><D:write/></D:lo" +
      "cktype> </D:lockentry> <D:lockentry> <D:lockscope><D:shared/></" +
      "D:lockscope> <D:locktype><D:write/></D:locktype> </D:lockentry>" +
      " </D:supportedlock> <D:lockdiscovery/> </D:prop> <D:status>HTTP" +
      "/1.1 200 OK</D:status> </D:propstat> </D:response> <D:response " +
      "xmlns:lp1=\"DAV:\" xmlns:lp2=\"http://apache.org/dav/props/\"> " +
      "<D:href>/some/path/ISBN:1038729410372</D:href> <D:propstat> <D:" +
      "prop> <lp1:resourcetype/> <lp1:creationdate>2012-05-01T17:41:13" +
      "Z</lp1:creationdate> <lp1:getcontentlength>223</lp1:getcontentl" +
      "ength> <lp1:getlastmodified>Wed, 02 May 2012 10:48:33 GMT</lp1:" +
      "getlastmodified> <lp1:getetag>\"c9-4bf0d1aeb9e43\"</lp1:getetag" +
      "> <lp2:executable>F</lp2:executable> <D:supportedlock> <D:locke" +
      "ntry> <D:lockscope><D:exclusive/></D:lockscope> <D:locktype><D:" +
      "write/></D:locktype> </D:lockentry> <D:lockentry> <D:lockscope>" +
      "<D:shared/></D:lockscope> <D:locktype><D:write/></D:locktype> <" +
      "/D:lockentry> </D:supportedlock> <D:lockdiscovery/> </D:prop> <" +
      "D:status>HTTP/1.1 200 OK</D:status> </D:propstat> </D:response>" +
      " <D:response xmlns:lp1=\"DAV:\" xmlns:lp2=\"http://apache.org/d" +
      "av/props/\"> <D:href>/some/path/http:%252F%252F100%2525_.json.b" +
      "ody_.html</D:href> <D:propstat> <D:prop> <lp1:resourcetype/> <l" +
      "p1:creationdate>2012-05-01T17:41:13Z</lp1:creationdate> <lp1:ge" +
      "tcontentlength>223</lp1:getcontentlength> <lp1:getlastmodified>" +
      "Wed, 02 May 2012 10:48:33 GMT</lp1:getlastmodified> <lp1:geteta" +
      "g>\"c9-4bf0d1aeb9e43\"</lp1:getetag> <lp2:executable>F</lp2:exe" +
      "cutable> <D:supportedlock> <D:lockentry> <D:lockscope><D:exclus" +
      "ive/></D:lockscope> <D:locktype><D:write/></D:locktype> </D:loc" +
      "kentry> <D:lockentry> <D:lockscope><D:shared/></D:lockscope> <D" +
      ":locktype><D:write/></D:locktype> </D:lockentry> </D:supportedl" +
      "ock> <D:lockdiscovery/> </D:prop> <D:status>HTTP/1.1 200 OK</D:" +
      "status> </D:propstat> </D:response> </D:multistatus>";

    o.jio = jIO.newJio({
      "type": "dav",
      "url": "https://ca-davstorage:8080",
      "auth_type": "basic",
      "username": "admin",
      "password": "pwd"
    });

    // get all documents
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "PROPFIND",
      new RegExp("https://ca-davstorage:8080/"),
      [
        200,
        {"Content-Type": "text/xml"},
        davlist
      ]
    );
    o.spy(o, "value", {
      "rows": [
        {"id": "http://100%.json", "key": "http://100%.json", "value": {}},
        {"id": "ISBN:1038729410372", "key": "ISBN:1038729410372", "value": {}}
      ],
      "total_rows": 2
    }, "allDocs");
    o.jio.allDocs(o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    // allDocs with option include_docs
    o.server = sinon.fakeServer.create();
    o.server.respondWith(
      "PROPFIND",
      new RegExp("https://ca-davstorage:8080/"),
      [
        200,
        {"Content-Type": "text/xml"},
        davlist
      ]
    );
    o.doc1 = {"_id": "http://100%.json", "_attachments": {
      "body.html": {
        "length": 32,
        "digest": "md5-doncare",
        "content_type": "text/html"
      }
    }};
    o.doc2 = {"_id": "ISBN:1038729410372", "title": "Book Title"};
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/http:%252F%252F100%2525_\\.json"),
      [
        200,
        {"Content-Type": "text/plain"},
        JSON.stringify(o.doc1)
      ]
    );
    o.server.respondWith(
      "GET",
      new RegExp("https://ca-davstorage:8080/ISBN:1038729410372"),
      [
        200,
        {"Content-Type": "text/plain"},
        JSON.stringify(o.doc2)
      ]
    );
    o.spy(o, "value", {
      "rows": [{
        "id": "http://100%.json",
        "key": "http://100%.json",
        "value": {},
        "doc": o.doc1
      }, {
        "id": "ISBN:1038729410372",
        "key": "ISBN:1038729410372",
        "value": {},
        "doc": o.doc2
      }],
      "total_rows": 2
    }, "allDocs (include_docs)");
    o.jio.allDocs({"include_docs": true}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    util.closeAndcleanUpJio(o.jio);
  });
}));
