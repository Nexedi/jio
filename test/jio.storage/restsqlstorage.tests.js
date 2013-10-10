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

  function isUuid(uuid) {
    var x = "[0-9a-fA-F]{4}";
    if (typeof uuid !== "string") {
      return false;
    }
    return uuid.match("^" + x + x + "-" + x + "-" + x +
	  "-" + x + "-" + x + x + x + "$") === null ?
        false : true;
  }

  module("RestSQL Storage");

  test("Post", function () {
    var o = generateTools(this),
	  response1 = JSON.stringify({"metadatas": [] }),
      response2 = JSON.stringify({"ok": true, "id": "post1"}),
      response4 = JSON.stringify({"metadatas": [
        { "document_id": "post2", "data": "{\"title\":\"myPost2\"}" }
      ]});
    o.jio = jIO.newJio({
      "type": "restsql",
      "url": "http://localhost:8080/restsql",
      "database": "jio"
    });

    //fake sever
    o.server = sinon.fakeServer.create();
    o.server.respondWith("POST",
      /metadata/,
      [  200,
        {"Content-Type": "application/json"},
        response2
        ]
      );
    o.server.respondWith("GET",
      /post1/,
      [  200,
        {"Content-Type": "application/json"},
        response1
        ]
      );
    o.server.respondWith("GET",
      /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/,
      [  200,
        {"Content-Type": "application/json"},
        response1
        ]
      );
    o.server.respondWith("GET",
      /post2/,
      [  200,
        {"Content-Type": "application/json"},
        response4
        ]
      );

    //Post without ID
    o.spy(o, "jobstatus", "done", "Post without id");
    o.jio.post({"title": "myPost1"}, function (err, response) {
      var uuid;
      o.f(err, response);
      uuid = (err || response).id;
      ok(isUuid(uuid), "Uuid should look like " +
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
    });
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);


    //Post with ID
    o.spy(o, "value", {"ok": true, "id": "post1"}, "Post document with id");
    o.jio.post({"_id": "post1", "title": "myPost1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //Post but document already exists => erreur 409
    o.spy(o, "status", 409, "Post but document already exists => erreur 409");
    o.jio.post({"_id": "post2", "title": "myPost2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    o.server.restore();
  });

  test("Put", function () {
    var o = generateTools(this),
	  response1 = JSON.stringify({"metadatas": [] }),
      response2 = JSON.stringify({"ok": true, "id": "post1"}),
      response3 = JSON.stringify({"ok": true, "id": "post2"}),
      response4 = JSON.stringify({"metadatas": [
        { "document_id": "post2", "data": "{\"title\":\"myPost2\"}" }
      ]});
    o.jio = jIO.newJio({
      "type": "restsql",
      "url": "http://localhost:8080/restsql",
      "database": "jio"
    });

    //fake sever
    o.server = sinon.fakeServer.create();
    o.server.respondWith("POST",
      /metadata/,
      [  200,
        {"Content-Type": "application/json"},
        response2
        ]
         );
    o.server.respondWith("PUT",
      /metadata/,
      [  200,
        {"Content-Type": "application/json"},
        response3
        ]
         );
    o.server.respondWith("GET",
      /post1/,
      [  200,
        {"Content-Type": "application/json"},
        response1
        ]
      );
    o.server.respondWith("GET",
      /post2/,
      [  200,
        {"Content-Type": "application/json"},
        response4
        ]
      );

    //Put without ID
    o.spy(o, "status", 20, "Put document without id -> 20");
    o.jio.put({"title": "myPost1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //Put with ID => creation
    o.spy(o, "value", {"ok": true, "id": "post1"},
	  "Post non-existing document: creation");
    o.jio.put({"_id": "post1", "title": "myPost1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //Put with ID => update
    o.spy(o, "value", {"ok": true, "id": "post2"},
	  "Post existing document: update");
    o.jio.put({"_id": "post2", "title": "myPost1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    o.server.restore();
  });

  test("PutAttachment", function () {
    var o = generateTools(this),
	  response1 = JSON.stringify({"ok": true,
	    "id": "get1", "attachment": "my_att1"}),
      response2 = JSON.stringify({"attachments": []}),
      response3 = JSON.stringify({"attachments": [
        { "document_id": "get2", "attachment_id": "my_att2",
	      "minetype": "text/html", "data": "My attachment 2!" }
      ]}),
      response4 = JSON.stringify({ "metadatas": [
        { "document_id": "get2",
		  "metadata_data": "{\"titre\":\"Title 1\",\"auteur\":\"me\"}",
		  "attachment_id": "att2", "minetype": "text/plain",
		  "attachment_data": "My attachament1." }
      ]}),
      response5 = JSON.stringify({ "metadatas": [
        { "document_id": "get1",
          "metadata_data": "{\"titre\":\"Title 2\",\"auteur\":\"me\"}",
          "attachment_id": null, "minetype": null,
          "attachment_data": null }
      ]});
    o.jio = jIO.newJio({
      "type": "restsql",
      "url": "http://localhost:8080/restsql",
      "database": "jio"
    });

    //fake sever
    o.server = sinon.fakeServer.create();
    o.server.respondWith("POST",
      /attachment/,
      [  200,
        {"Content-Type": "application/json"},
        response1
        ]
      );
    o.server.respondWith("PUT",
      /attachment/,
      [  200,
        {"Content-Type": "application/json"},
        response1
        ]
         );
    o.server.respondWith("GET",
      /document_id=get1&attachment_id=my_att1/,
      [  200,
        {"Content-Type": "application/json"},
        response2
        ]
      );
    o.server.respondWith("GET",
      /document_id=get1/,
      [  200,
        {"Content-Type": "application/json"},
        response5
        ]
      );
    o.server.respondWith("GET",
      /document_id=get2&attachment_id=my_att2/,
      [  200,
        {"Content-Type": "application/json"},
        response3
        ]
      );
    o.server.respondWith("GET",
      /document_id=get2/,
      [  200,
        {"Content-Type": "application/json"},
        response4
        ]
      );

	  //PutAttachment without attachment id
    o.spy(o, "status", 20, "Put attachment without document id -> 22");
    o.jio.putAttachment({"_attachment": "yyyy"}, { "max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //PutAttachment without attachment id
    o.spy(o, "status", 22, "Put attachment without attachment id -> 22");
    o.jio.putAttachment({"_id": "xxxx"}, { "max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //PutAttachment non existing document
    o.spy(o, "status", 404, "PutAttachment non existing document -> 404");
    o.jio.putAttachment({"_id": "xxxx", "_attachment": "my_att1"},
	  {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //PutAttachment existing attachment
    o.spy(o, "value", {"ok": true, "id": "get2", "attachment": "my_att2"},
	  "PutAttachement existing attachment: update");
    o.jio.putAttachment({
      "_id": "get2",
      "_attachment": "my_att2",
      "_minetype": "text/html",
      "_data": "My attachment updated!"
    }, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //PutAttachment non existing attachment
    o.spy(o, "value", {"ok": true, "id": "get1", "attachment": "my_att1"},
	  "PutAttachement non existing attachment: creation");
    o.jio.putAttachment({
      "_id": "get1",
      "_attachment": "my_att1",
      "_minetype": "text/html",
      "_data": "My attachment!"
    }, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    o.server.restore();
  });

  test("Get", function () {
    var o = generateTools(this),
	  response = JSON.stringify({ "metadatas": [
        { "document_id": "get1", "metadata_data": "{\"title\":\"myGet1\"}",
		  "attachment_id": null, "minetype": null, "attachment_data": null }
      ]
        });
    o.jio = jIO.newJio({
      "type": "restsql",
      "url": "http://localhost:8080/restsql",
      "database": "jio"
    });

    //fake sever
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
      /xxxx/,
      [404, {}, "HTML Response"]
      );
    o.server.respondWith("GET",
      /get1/,
      [  200,
        {"Content-Type": "application/json"},
        response
        ]
      );

    //Get non existing document
    o.spy(o, "status", 404, "Get non existing document -> 404");
    o.jio.get({"_id": "xxxx"}, {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //Get document
    o.spy(o, "value", {"_id": "get1", "title": "myGet1",
	  "_attachments": {}}, "Get document");
    o.jio.get({"_id": "get1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    o.server.restore();
  });

  test("GetAttachment", function () {
    var o = generateTools(this),
	  response = JSON.stringify(
        { "attachments": [
          { "document_id": "get1", "attachment_id": "my_att1",
		    "minetype": "text/html", "data": "My attachment!"
		    }]
          }
      );
    o.jio = jIO.newJio({
      "type": "restsql",
      "url": "http://localhost:8080/restsql",
      "database": "jio"
    });
    //fake sever
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
      /xxxx/,
      [404, {}, "HTML Response"]
      );
    o.server.respondWith("GET",
      /document_id=get1&attachment_id=yyyy/,
      [404, {}, "HTML Response"]
      );
    o.server.respondWith("GET",
      /document_id=get1&attachment_id=my_att1/,
      [  200,
        {"Content-Type": "application/json"},
        response
        ]
       );

   //GetAttachment non existing document
    o.spy(o, "status", 404, "Get non existing document -> 404");
    o.jio.getAttachment({"_id": "xxxx", "_attachment": "my_att1"},
	  {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //GetAttachment without attachment id
    o.spy(o, "status", 22, "Get attachment without attachment id -> 22");
    o.jio.getAttachment({"_id": "get1"}, {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //GetAttachment non existing attachment
    o.spy(o, "status", 404, "Get non existing attachment -> 404");
    o.jio.getAttachment({"_id": "get1", "_attachment": "yyyy"},
	  {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //GetAttachment
    o.spy(o, "value", "My attachment!", "Get document");
    o.jio.getAttachment({"_id": "get1", "_attachment": "my_att1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    o.server.restore();
  });

  test("Remove", function () {
    var o = generateTools(this),
	  response = JSON.stringify({ "metadatas": [
        { "document_id": "get1", "metadata_data": "{\"title\":\"myGet1\"}",
		  "attachment_id": null, "minetype": null, "attachment_data": null
		  }]
        }),
      response2 = JSON.stringify({"document_id": "get1", "ok": true}),
      response3 = JSON.stringify({ "metadatas": [
        { "document_id": "get2", "metadata_data": "{\"title\":\"myGet2\"}",
		  "attachment_id": null, "minetype": null, "attachment_data": null
		  }]
        }),
      response4 = JSON.stringify({ "attachments": []
        }),
      response5 = JSON.stringify({ "attachments": [
        { "document_id": "get2", "attachment_id": "att_get2",
		  "data": "myGet2", "minetype": "text/html"
		  }]
        });
    o.jio = jIO.newJio({
      "type": "restsql",
      "url": "http://localhost:8080/restsql",
      "database": "jio"
    });

    //fake sever
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
      /xxxx/,
      [404, {}, "HTML Response"]
      );
    o.server.respondWith("GET",
      /MetadataAttachment(.*)get1/,
      [  200,
        {"Content-Type": "application/json"},
        response
        ]
      );
    o.server.respondWith("GET",
      /attachment(.*)get1/,
      [  200,
        {"Content-Type": "application/json"},
        response4
        ]
      );

    o.server.respondWith("DELETE",
      /get1/,
      [  200,
        {"Content-Type": "application/json"},
        response2
        ]
      );
    o.server.respondWith("GET",
      /MetadataAttachment(.*)get2/,
      [  200,
        {"Content-Type": "application/json"},
        response3
        ]
      );
    o.server.respondWith("GET",
      /attachment(.*)get2/,
      [  200,
        {"Content-Type": "application/json"},
        response5
        ]
      );
    o.server.respondWith("DELETE",
      /get2/,
      [  200,
        {"Content-Type": "application/json"},
        response2
        ]
      );

    // Remove non existing document
    o.spy(o, "status", 404, "Remove non existing document -> 404");
    o.jio.remove({"_id": "xxxx"}, {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    // Remove document without attachment
    o.spy(o, "value", {"id": "get1", "ok": true},
	  "Remove document without attachment");
    o.jio.remove({"_id": "get1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //Remove document with attachment
    o.spy(o, "value", {"id": "get2", "ok": true},
	  "Remove document with attachment");
    o.jio.remove({"_id": "get2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    // o.server.restore();
  });

  test("RemoveAttachment", function () {
    var o = generateTools(this),
	  response = JSON.stringify(
        { "attachments": [
          { "document_id": "get1", "attachment_id": "my_att1",
		    "minetype": "text/html", "data": "My attachment!"},
          { "document_id": "get2", "attachment_id": "my_att2",
		    "minetype": "text/html", "data": "My attachment 2!"}
        ]}
      ),
      response2 = JSON.stringify({
        "attachment": "my_att1",
        "id": "get1",
        "ok": true
      });
    o.jio = jIO.newJio({
      "type": "restsql",
      "url": "http://localhost:8080/restsql",
      "database": "jio"
    });

    //fake sever
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
      /xxxx/,
      [404, {}, "HTML Response"]
      );
    o.server.respondWith("GET",
      /document_id=get1&attachment_id=yyyy/,
      [404, {}, "HTML Response"]
      );
    o.server.respondWith("GET",
      /document_id=get1&attachment_id=my_att1/,
      [  200,
        {"Content-Type": "application/json"},
        response
        ]
       );
    o.server.respondWith("DELETE",
      /get1/,
      [  200,
        {"Content-Type": "application/json"},
        response2
        ]
       );

   //RemoveAttachment non existing document
    o.spy(o, "status", 404, "Remove non existing document -> 404");
    o.jio.removeAttachment({"_id": "xxxx", "_attachment": "my_att1"},
	  {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //RemoveAttachment without attachment id
    o.spy(o, "status", 22, "Remove attachment without attachment id -> 22");
    o.jio.removeAttachment({"_id": "get1"}, { "max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //RemoveAttachment non existing attachment
    o.spy(o, "status", 404, "Remove non existing attachment -> 404");
    o.jio.removeAttachment({"_id": "get1", "_attachment": "yyyy"},
	  {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    //RemoveAttachment
    o.spy(o, "value", {"attachment": "my_att1", "id": "get1", "ok": true},
	  "Remove attachment");
    o.jio.removeAttachment({"_id": "get1", "_attachment": "my_att1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);

    o.server.restore();
  });

}));
