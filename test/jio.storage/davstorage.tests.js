/*jslint maxlen: 120, nomen: true */
/*global localStorage, test_util, console, Blob, sinon*/
(function (jIO, QUnit, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    domain = "https://example.org";

  module("davStorage", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "dav",
        url: domain
//         "none"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.get
  /////////////////////////////////////////////////////////////////
  test("get inexistent document", function () {
    var url = domain + "/inexistent";
    this.server.respondWith("GET", url, [404, {
      "Content-Type": "text/html"
    }, "foo"]);

    stop();
    expect(3);

    this.jio.get({"_id": "inexistent"})
      .fail(function (error) {
        console.log(error);
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document", function () {
    var id = "post1",
      url = domain + "/" + id;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "octet/stream"
    }, JSON.stringify({title: "myPost1"})
      ]);
    stop();
    expect(1);

    this.jio.get({"_id": id})
      .then(function (result) {
        deepEqual(result, {
          "title": "myPost1"
        }, "Check document");
      })
      .fail(function (error) {
        console.error(error.stack);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // davStorage.post
  /////////////////////////////////////////////////////////////////
  test("post without id", function () {
    var id = "post1",
      url = domain + "/" + id;
    this.server.respondWith("GET", url, [200, {
      "Content-Type": "octet/stream"
    }, JSON.stringify({title: "myPost1"})
      ]);

    expect(2);
    stop();

    this.jio.post({})
//       .then(function (uuid) {
//         ok(util.isUuid(uuid), "Uuid should look like " +
//            "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
//         equal(davStorage[uuid], JSON.stringify({
//           "_id": uuid
//         }));
//       })
      .fail(function (error) {
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("post non empty document", function () {
    var id = "post1",
      url = domain + "/" + id,
      server = this.server;
    this.server.respondWith("PUT", url, [200, {
      "Content-Type": "octet/stream"
    }, JSON.stringify({title: "myPost1"})
      ]);

    expect(9);
    stop();

    this.jio.post({"_id": "post1", "title": "myPost1"})
      .then(function (uuid) {
        console.log(server.requests);
        equal(uuid, "post1");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, url);
        equal(server.requests[0].status, 404);
        equal(server.requests[1].method, "PUT");
        equal(server.requests[1].url, url);
        equal(server.requests[1].status, 200);
        equal(server.requests[1].requestBody, JSON.stringify({
          "_id": "post1",
          "title": "myPost1"
        }));
      })
      .fail(function (error) {
        console.error(error.stack);
        console.error(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

//   test("post but document already exists", function () {
//     var id = "post1";
//     davStorage[id] = JSON.stringify({
//       "_id": id,
//       title: "myPost1"
//     });
//     expect(4);
//     stop();
// 
//     this.jio.post({"_id": "post1", "title": "myPost2"})
//       .then(function (result) {
//         ok(false, result);
//       })
//       .fail(function (error) {
//         ok(error instanceof jIO.util.jIOError);
//         equal(error.message, "Cannot create a new document");
//         equal(error.status_code, 409);
// 
//         equal(davStorage.post1, JSON.stringify({
//           "_id": "post1",
//           "title": "myPost1"
//         }));
//       })
//       .always(function () {
//         start();
//       });
//   });

}(jIO, QUnit, sinon));




// /*jslint indent: 2, maxlen: 80, nomen: true */
// /*global module, test, stop, start, expect, ok, deepEqual, location, sinon,
//   davstorage_spec, RSVP, jIO, test_util, dav_storage, btoa, define,
//   setTimeout, clearTimeout, parseInt, console */
// 
// // define([module_name], [dependencies], module);
// (function (dependencies, module) {
//   "use strict";
//   if (typeof define === 'function' && define.amd) {
//     return define(dependencies, module);
//   }
//   module(test_util, RSVP, jIO, dav_storage);
// }([
//   'test_util',
//   'rsvp',
//   'jio',
//   'davstorage',
//   'qunit'
// ], function (util, RSVP, jIO, dav_storage) {
//   "use strict";
// 
//   var spec, use_fake_server = true;
// //   if (typeof davstorage_spec === 'object') {
// //     use_fake_server = false;
// //     spec = dav_storage.createDescription(
// //       davstorage_spec.url,
// //       davstorage_spec.auth_type,
// //       davstorage_spec.realm,
// //       davstorage_spec.username,
// //       davstorage_spec.password
// //     );
// //   } else {
// //     spec = dav_storage.createDescription(
// //       "http://localhost",
// //       "none"
// //     );
// //   }
//   spec = dav_storage.createDescription(
//     "http://localhost",
//     "none"
//   );
// 
//   module("Dav Storage");
// 
// //   function success(promise) {
// //     return new RSVP.Promise(function (resolve, reject, notify) {
// //       /*jslint unparam: true*/
// //       promise.then(resolve, resolve, notify);
// //     }, function () {
// //       promise.cancel();
// //     });
// //   }
// 
//   /**
//    * Tested with local webDav server
//    *
//    * Used header are:
//    * - Header always set Cache-Control "no-cache" # "private", "public",
//    *   "<seconds>" or "no-store" ("no-cache")
//    * - Header always set Access-Control-Max-Age "0"
//    * - Header always set Access-Control-Allow-Credentials "true"
//    * - Header always set Access-Control-Allow-Origin "*"
//    * - Header always set Access-Control-Allow-Methods "OPTIONS, GET, HEAD,
//    *   POST, PUT, DELETE, PROPFIND"
//    * - Header always set Access-Control-Allow-Headers "Content-Type,
//    *   X-Requested-With, X-HTTP-Method-Override, Accept, Authorization,
//    *   Depth"
//    */
//   test("Scenario", 48, function () {
// 
//     var server, responses = [], shared = {}, jio = jIO.createJIO(spec, {
//       "workspace": {},
//       "max_retry": 2
//     });
// 
//     stop();
// 
//     if (use_fake_server) {
//       /*jslint regexp: true */
//       // server = sinon.fakeServer.create();
//       // server.autoRespond = true;
//       // server.autoRespondAfter = 5;
//       // server.respondWith(/.*/, function (xhr) {
//       //   var response = responses.shift();
//       //   if (response) {
//       //     return xhr.respond.apply(xhr, response);
//       //   }
//       //   ok(false, "No response associated to the latest request!");
//       // });
//       //////////////////////////////
//       // Awaiting for some sinon js improvements to manage 'blob' xhr response
//       // type.  This hack overrides the jIO util ajax method which is used by
//       // dav storage connector to do http requests.  To restore the sinon js
//       // fake server, just uncomment the above lines.
//       server = {restore: function () {
//         return;
//       }};
//       jIO.util.ajax = function (param) {
//         var timeout, xhr = {}, response = responses.shift(), statusTexts = {
//           "404": "Not Found"
//         }, start, end, str;
//         if (!Array.isArray(response)) {
//           setTimeout(function () {
//             throw new ReferenceError("Fake server, no response set for " +
//                                      JSON.stringify(param, null, '  '));
//           });
//         }
//         xhr.readyState = 1;
//         xhr.setRequestHeader = function () {
//           return;
//         };
//         xhr.getResponseHeader = function (name) {
//           return response[1][name];
//         };
//         return new RSVP.Promise(function (resolve, reject) {
//           xhr.readyState = 4;
//           xhr.status = response[0];
//           xhr.statusText = statusTexts[response[0]];
//           xhr.responseType = param.dataType || "";
//           timeout = setTimeout(function () {
//             /*global Blob*/
//             if (xhr.responseType === 'blob') {
//               if (param.headers.Range !== undefined) {
//                 str = param.headers.Range;
//                 start = parseInt(str.substring(str.indexOf("=") + 1,
//                                                str.indexOf("-")), 10);
//                 if (str.indexOf("NaN") !== -1) {
//                   response[2] = response[2].substring(start);
//                 } else {
//                   end = parseInt(str.substring(str.indexOf("-") + 1), 10);
//                   response[2] = response[2].substring(start, end + 1);
//                 }
//               }
//               xhr.response = new Blob([response[2]], {
//                 "type": response[1]["Content-Type"] ||
//                   response[1]["Content-type"] ||
//                   response[1]["content-type"] || ''
//               });
//             } else if (xhr.responseType === 'json') {
//               xhr.responseText = response[2];
//               try {
//                 xhr.response = JSON.parse(xhr.responseText);
//               } catch (e) { // XXX
//                 xhr.responseText = undefined;
//                 xhr.status = 0;
//                 xhr.statusText = "Parse Error"; // XXX
//               }
//             } else {
//               xhr.response = xhr.responseText = response[2];
//             }
//             // XXX ArrayBuffer
//             if (xhr.status >= 400 || xhr.status === 0) {
//               return reject({"target": xhr});
//             }
//             resolve({"target": xhr});
//           }, 10);
//           // XXX on error (if necessary)
//           // XXX on progress
//           if (typeof param.beforeSend === 'function') {
//             param.beforeSend(xhr);
//           }
//         }, function () {
//           clearTimeout(timeout);
//         });
//       };
//     } else {
//       responses.push = function () {
//         return;
//       };
//       server = {restore: function () {
//         return;
//       }};
//     }
// 
//     function postNewDocument() {
// //       responses.push([404, {}, '']); // GET
// //       responses.push([201, {}, '']); // PUT
//       return jio.post({"title": "Unique ID"});
//     }
// 
//     function postNewDocumentTest(answer) {
//       var uuid = answer.id;
//       answer.id = "<uuid>";
//       deepEqual(answer, {
//         "id": "<uuid>",
//         "method": "post",
//         "result": "success",
//         "status": 201,
//         "statusText": "Created"
//       }, "Post a new document");
//       ok(util.isUuid(uuid), "New document id should look like " +
//          "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
//       shared.created_document_id = uuid;
//     }
// 
//     function getCreatedDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": shared.created_document_id,
//         "title": "Unique ID"
//       })]); // GET
//       return jio.get({"_id": shared.created_document_id});
//     }
// 
//     function getCreatedDocumentTest(answer) {
//       deepEqual(answer, {
//         "data": {
//           "_id": shared.created_document_id,
//           "title": "Unique ID"
//         },
//         "id": shared.created_document_id,
//         "method": "get",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get new document");
//     }
// 
//     function postSpecificDocument() {
//       responses.push([404, {}, '']); // GET
//       responses.push([201, {}, '']); // PUT
//       return jio.post({"_id": "b", "title": "Bee"});
//     }
// 
//     function postSpecificDocumentTest(answer) {
//       deepEqual(answer, {
//         "id": "b",
//         "method": "post",
//         "result": "success",
//         "status": 201,
//         "statusText": "Created"
//       }, "Post specific document");
//     }
// 
//     function checkDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "b",
//         "title": "Bee"
//       })]); // GET
//       return jio.check({"_id": "b"});
//     }
// 
//     function checkDocumentTest(answer) {
//       deepEqual(answer, {
//         "id": "b",
//         "method": "check",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Check specific document");
//     }
// 
//     function checkStorage() {
//       responses.push([
//         207,
//         {"Content-Type": "text/xml"},
//         '<?xml version="1.0" encoding="utf-8"?>' +
//           '<D:multistatus xmlns:D="DAV:">' +
//           '<D:response xmlns:lp1="DAV:" ' +
//           'xmlns:lp2="http://apache.org/dav/props/">' +
//           '<D:href>/uploads/</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype><D:collection/></lp1:resourcetype>' +
//           '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
//           '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"240be-1000-4e9f88a305c4e"</lp1:getetag>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '<D:getcontenttype>httpd/unix-directory</D:getcontenttype>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '<D:response xmlns:lp1="DAV:" ' +
//           'xmlns:lp2="http://apache.org/dav/props/">' +
//           '<D:href>/uploads/' + shared.created_document_id + '</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype/>' +
//           '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
//           '<lp1:getcontentlength>66</lp1:getcontentlength>' +
//           '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"20568-42-4e9f88a2ea198"</lp1:getetag>' +
//           '<lp2:executable>F</lp2:executable>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '<D:response xmlns:lp1="DAV:" ' +
//           'xmlns:lp2="http://apache.org/dav/props/">' +
//           '<D:href>/uploads/b</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype/>' +
//           '<lp1:creationdate>2013-10-30T17:19:46Z</lp1:creationdate>' +
//           '<lp1:getcontentlength>25</lp1:getcontentlength>' +
//           '<lp1:getlastmodified>Wed, 30 Oct 2013 17:19:46 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"21226-19-4e9f88a305c4e"</lp1:getetag>' +
//           '<lp2:executable>F</lp2:executable>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '</D:multistatus>'
//       ]); // PROPFIND
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": shared.created_document_id,
//         "title": "Unique ID"
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "b",
//         "title": "Bee"
//       })]); // GET
//       return jio.check({});
//     }
// 
//     function checkStorageTest(answer) {
//       deepEqual(answer, {
//         "method": "check",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Check storage state");
//     }
// 
//     function listDocuments() {
//       responses.push([
//         207,
//         {"Content-Type": "text/xml"},
//         '<?xml version="1.0" encoding="utf-8"?>' +
//           '<D:multistatus xmlns:D="DAV:">' +
//           '<D:response xmlns:lp2="http://apache.' +
//           'org/dav/props/" xmlns:lp1="DAV:">' +
//           '<D:href>/uploads/</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype><D:collection/></lp1:resourcetype>' +
//           '<lp1:creationdate>2013-09-19T11:54:43Z</lp1:creationdate>' +
//           '<lp1:getlastmodified>Thu, 19 Sep 2013 11:54:43 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"240be-1000-4e6bb383e5fbb"</lp1:getetag>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '<D:getcontenttype>httpd/unix-directory</D:getcontenttype>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '<D:response xmlns:lp2="http://apache.org/dav/props/" ' +
//           'xmlns:lp1="DAV:">' +
//           '<D:href>/uploads/' + shared.created_document_id + '</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype/>' +
//           '<lp1:creationdate>2013-09-19T11:54:43Z</lp1:creationdate>' +
//           '<lp1:getcontentlength>66</lp1:getcontentlength>' +
//           '<lp1:getlastmodified>Thu, 19 Sep 2013 11:54:43 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"20529-42-4e6bb383d0d30"</lp1:getetag>' +
//           '<lp2:executable>F</lp2:executable>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '<D:response xmlns:lp2="http://apache.org/dav/props/" ' +
//           'xmlns:lp1="DAV:">' +
//           '<D:href>/uploads/b</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype/>' +
//           '<lp1:creationdate>2013-09-19T11:54:43Z</lp1:creationdate>' +
//           '<lp1:getcontentlength>25</lp1:getcontentlength>' +
//           '<lp1:getlastmodified>Thu, 19 Sep 2013 11:54:43 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"20da3-19-4e6bb383e5fbb"</lp1:getetag>' +
//           '<lp2:executable>F</lp2:executable>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '</D:multistatus>'
//       ]); // PROPFIND
//       return jio.allDocs();
//     }
// 
//     function list2DocumentsTest(answer) {
//       if (answer && answer.data && Array.isArray(answer.data.rows)) {
//         answer.data.rows.sort(function (a) {
//           return a.id === "b" ? 1 : 0;
//         });
//       }
//       deepEqual(answer, {
//         "data": {
//           "total_rows": 2,
//           "rows": [{
//             "id": shared.created_document_id,
//             "value": {}
//           }, {
//             "id": "b",
//             "value": {}
//           }]
//         },
//         "method": "allDocs",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "List 2 documents");
//     }
// 
//     function listDocumentsWithMetadata() {
//       responses.push([
//         207,
//         {"Content-Type": "text/xml"},
//         '<?xml version="1.0" encoding="utf-8"?>' +
//           '<D:multistatus xmlns:D="DAV:">' +
//           '<D:response xmlns:lp2="http://apache.' +
//           'org/dav/props/" xmlns:lp1="DAV:">' +
//           '<D:href>/uploads/</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype><D:collection/></lp1:resourcetype>' +
//           '<lp1:creationdate>2013-09-19T11:54:43Z</lp1:creationdate>' +
//           '<lp1:getlastmodified>Thu, 19 Sep 2013 11:54:43 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"240be-1000-4e6bb383e5fbb"</lp1:getetag>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '<D:getcontenttype>httpd/unix-directory</D:getcontenttype>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '<D:response xmlns:lp2="http://apache.org/dav/props/" ' +
//           'xmlns:lp1="DAV:">' +
//           '<D:href>/uploads/' + shared.created_document_id + '</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype/>' +
//           '<lp1:creationdate>2013-09-19T11:54:43Z</lp1:creationdate>' +
//           '<lp1:getcontentlength>66</lp1:getcontentlength>' +
//           '<lp1:getlastmodified>Thu, 19 Sep 2013 11:54:43 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"20529-42-4e6bb383d0d30"</lp1:getetag>' +
//           '<lp2:executable>F</lp2:executable>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '<D:response xmlns:lp2="http://apache.org/dav/props/" ' +
//           'xmlns:lp1="DAV:">' +
//           '<D:href>/uploads/b</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype/>' +
//           '<lp1:creationdate>2013-09-19T11:54:43Z</lp1:creationdate>' +
//           '<lp1:getcontentlength>25</lp1:getcontentlength>' +
//           '<lp1:getlastmodified>Thu, 19 Sep 2013 11:54:43 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"20da3-19-4e6bb383e5fbb"</lp1:getetag>' +
//           '<lp2:executable>F</lp2:executable>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '</D:multistatus>'
//       ]); // PROPFIND
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": shared.created_document_id,
//         "title": "Unique ID"
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "b",
//         "title": "Bee"
//       })]); // GET
//       return jio.allDocs({"include_docs": true});
//     }
// 
//     function list2DocumentsWithMetadataTest(answer) {
//       if (answer && answer.data && Array.isArray(answer.data.rows)) {
//         answer.data.rows.sort(function (a) {
//           return a.id === "b" ? 1 : 0;
//         });
//       }
//       deepEqual(answer, {
//         "data": {
//           "total_rows": 2,
//           "rows": [{
//             "id": shared.created_document_id,
//             "value": {},
//             "doc": {
//               "_id": shared.created_document_id,
//               "title": "Unique ID"
//             }
//           }, {
//             "id": "b",
//             "value": {},
//             "doc": {
//               "_id": "b",
//               "title": "Bee"
//             }
//           }]
//         },
//         "method": "allDocs",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "List 2 documents with their metadata");
//     }
// 
//     function removeCreatedDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": shared.created_document_id,
//         "title": "Unique ID"
//       })]); // GET
//       responses.push([204, {}, '']); // DELETE
//       return jio.remove({"_id": shared.created_document_id});
//     }
// 
//     function removeCreatedDocumentTest(answer) {
//       deepEqual(answer, {
//         "id": shared.created_document_id,
//         "method": "remove",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Remove first document.");
//     }
// 
//     function removeSpecificDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "b",
//         "title": "Bee"
//       })]); // GET
//       responses.push([204, {}, '']); // DELETE
//       return jio.remove({"_id": "b"});
//     }
// 
//     function removeSpecificDocumentTest(answer) {
//       deepEqual(answer, {
//         "id": "b",
//         "method": "remove",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Remove second document.");
//     }
// 
//     function listEmptyStorage() {
//       responses.push([
//         207,
//         {"Content-Type": "text/xml"},
//         '<?xml version="1.0" encoding="utf-8"?>' +
//           '<D:multistatus xmlns:D="DAV:">' +
//           '<D:response xmlns:lp2="http://apache.org/dav/props/" ' +
//           'xmlns:lp1="DAV:">' +
//           '<D:href>/uploads/</D:href>' +
//           '<D:propstat>' +
//           '<D:prop>' +
//           '<lp1:resourcetype><D:collection/></lp1:resourcetype>' +
//           '<lp1:creationdate>2013-09-19T11:54:43Z</lp1:creationdate>' +
//           '<lp1:getlastmodified>Thu, 19 Sep 2013 11:54:43 GMT' +
//           '</lp1:getlastmodified>' +
//           '<lp1:getetag>"240be-1000-4e6bb3840a9ac"</lp1:getetag>' +
//           '<D:supportedlock>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:exclusive/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '<D:lockentry>' +
//           '<D:lockscope><D:shared/></D:lockscope>' +
//           '<D:locktype><D:write/></D:locktype>' +
//           '</D:lockentry>' +
//           '</D:supportedlock>' +
//           '<D:lockdiscovery/>' +
//           '<D:getcontenttype>httpd/unix-directory</D:getcontenttype>' +
//           '</D:prop>' +
//           '<D:status>HTTP/1.1 200 OK</D:status>' +
//           '</D:propstat>' +
//           '</D:response>' +
//           '</D:multistatus>'
//       ]); // PROPFIND
//       return jio.allDocs();
//     }
// 
//     function listEmptyStorageTest(answer) {
//       deepEqual(answer, {
//         "data": {
//           "total_rows": 0,
//           "rows": []
//         },
//         "method": "allDocs",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "List empty storage");
//     }
// 
//     function putNewDocument() {
//       responses.push([404, {}, '']); // GET
//       responses.push([201, {}, '']); // PUT
//       return jio.put({"_id": "a", "title": "Hey"});
//     }
// 
//     function putNewDocumentTest(answer) {
//       deepEqual(answer, {
//         "id": "a",
//         "method": "put",
//         "result": "success",
//         "status": 201,
//         "statusText": "Created"
//       }, "Put new document");
//     }
// 
//     function getCreatedDocument2() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hey"
//       })]); // GET
//       return jio.get({"_id": "a"});
//     }
// 
//     function getCreatedDocument2Test(answer) {
//       deepEqual(answer, {
//         "data": {
//           "_id": "a",
//           "title": "Hey"
//         },
//         "id": "a",
//         "method": "get",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get new document");
//     }
// 
//     function postSameDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hey"
//       })]); // GET
//       return success(jio.post({"_id": "a", "title": "Hoo"}));
//     }
// 
//     function postSameDocumentTest(answer) {
//       deepEqual(answer, {
//         "error": "conflict",
//         "id": "a",
//         "message": "DavStorage, cannot overwrite document metadata.",
//         "method": "post",
//         "reason": "Document exists",
//         "result": "error",
//         "status": 409,
//         "statusText": "Conflict"
//       }, "Unable to post the same document (conflict)");
//     }
// 
//     function putAttachmentToNonExistentDocument() {
//       responses.push([404, {}, ""]); // GET
//       return success(jio.putAttachment({
//         "_id": "ahaha",
//         "_attachment": "aa",
//         "_data": "aaa",
//         "_content_type": "text/plain"
//       }));
//     }
// 
//     function putAttachmentToNonExistentDocumentTest(answer) {
//       deepEqual(answer, {
//         "attachment": "aa",
//         "error": "not_found",
//         "id": "ahaha",
//         "message": "DavStorage unable to put attachment",
//         "method": "putAttachment",
//         "reason": "Not Found",
//         "result": "error",
//         "status": 404,
//         "statusText": "Not Found"
//       }, "Put attachment to a non existent document -> 404 Not Found");
//     }
// 
//     function createAttachment() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hey"
//       })]); // GET
//       responses.push([201, {}, '']); // PUT (attachment)
//       responses.push([204, {}, '']); // PUT (metadata)
//       return jio.putAttachment({
//         "_id": "a",
//         "_attachment": "aa",
//         "_data": "aaa",
//         "_content_type": "text/plain"
//       });
//     }
// 
//     function createAttachmentTest(answer) {
//       deepEqual(answer, {
//         "attachment": "aa",
//         "digest": "sha256-9834876dcfb05cb167a5c24953eba58c4" +
//           "ac89b1adf57f28f2f9d09af107ee8f0",
//         "id": "a",
//         "method": "putAttachment",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Create new attachment");
//     }
// 
//     function updateAttachment() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hey",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-9834876dcfb05cb167a5c24953eba58c4" +
//               "ac89b1adf57f28f2f9d09af107ee8f0",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([204, {}, '']); // PUT (attachment)
//       responses.push([204, {}, '']); // PUT (metadata)
//       return jio.putAttachment({
//         "_id": "a",
//         "_attachment": "aa",
//         "_data": "aab",
//         "_content_type": "text/plain"
//       });
//     }
// 
//     function updateAttachmentTest(answer) {
//       deepEqual(answer, {
//         "attachment": "aa",
//         "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//           "0728e095ff24218119d51bd22475363",
//         "id": "a",
//         "method": "putAttachment",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Update last attachment");
//     }
// 
//     function createAnotherAttachment() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hey",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([201, {}, '']); // PUT (attachment)
//       responses.push([204, {}, '']); // PUT (metadata)
//       return jio.putAttachment({
//         "_id": "a",
//         "_attachment": "ab",
//         "_data": "aba",
//         "_content_type": "text/plain"
//       });
//     }
// 
//     function createAnotherAttachmentTest(answer) {
//       deepEqual(answer, {
//         "attachment": "ab",
//         "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//           "ed343e6c739e54131fcb3a56e4bc1bd",
//         "id": "a",
//         "method": "putAttachment",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Create another attachment");
//     }
// 
//     function updateLastDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hey",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([204, {}, '']); // PUT
//       return jio.put({"_id": "a", "title": "Hoo"});
//     }
// 
//     function updateLastDocumentTest(answer) {
//       deepEqual(answer, {
//         "id": "a",
//         "method": "put",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Update document metadata");
//     }
// 
//     function getFirstAttachment() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, "aab"]); // GET
//       return jio.getAttachment({"_id": "a", "_attachment": "aa"});
//     }
// 
//     function getFirstAttachmentTest(answer) {
//       var blob = answer.data;
//       answer.data = "<blob>";
//       deepEqual(answer, {
//         "attachment": "aa",
//         "data": "<blob>",
//         "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//           "0728e095ff24218119d51bd22475363",
//         "id": "a",
//         "method": "getAttachment",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get first attachment");
//       return jIO.util.readBlobAsText(blob).then(function (e) {
//         deepEqual(blob.type, "text/plain", "Check blob type");
//         deepEqual(e.target.result, "aab", "Check blob text content");
//       }, function (err) {
//         deepEqual(err, "no error", "Check blob text content");
//       });
//     }
// 
// 
// 
// 
// 
// 
// 
// 
//     function getFirstAttachmentRange1() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, "aab"]); // GET
//       return jio.getAttachment({"_id": "a",
//                                 "_attachment": "aa",
//                                 "_start": 0});
//     }
// 
//     function getFirstAttachmentRangeTest1(answer) {
//       var blob = answer.data;
//       answer.data = "<blob>";
//       deepEqual(answer, {
//         "attachment": "aa",
//         "data": "<blob>",
//         "id": "a",
//         "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//           "0728e095ff24218119d51bd22475363",
//         "method": "getAttachment",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get first attachment with range:_start: 0, _end: undefined");
//       return jIO.util.readBlobAsText(blob).then(function (e) {
//         deepEqual(blob.type, "text/plain", "Check blob type");
//         deepEqual(e.target.result, "aab", "Check blob text content");
//       }, function (err) {
//         deepEqual(err, "no error", "Check blob text content");
//       });
//     }
// 
// 
// 
// 
// 
// 
// 
// 
//     function getFirstAttachmentRange2() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, "aab"]); // GET
//       return jio.getAttachment({"_id": "a",
//                                 "_attachment": "aa",
//                                 "_start": 0,
//                                 "_end": 1});
//     }
// 
//     function getFirstAttachmentRangeTest2(answer) {
//       var blob = answer.data;
//       answer.data = "<blob>";
//       deepEqual(answer, {
//         "attachment": "aa",
//         "data": "<blob>",
//         "id": "a",
//         "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//           "0728e095ff24218119d51bd22475363",
//         "method": "getAttachment",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get first attachment with range: _start:0, _end:1");
//       return jIO.util.readBlobAsText(blob).then(function (e) {
//         deepEqual(blob.type, "text/plain", "Check blob type");
//         deepEqual(e.target.result, "a", "Check blob text content");
//       }, function (err) {
//         deepEqual(err, "no error", "Check blob text content");
//       });
//     }
// 
// 
//     function getFirstAttachmentRange3() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, "aab"]); // GET
//       return jio.getAttachment({"_id": "a",
//                                 "_attachment": "aa",
//                                 "_start": 1,
//                                 "_end": 3});
//     }
// 
//     function getFirstAttachmentRangeTest3(answer) {
//       var blob = answer.data;
//       answer.data = "<blob>";
//       deepEqual(answer, {
//         "attachment": "aa",
//         "data": "<blob>",
//         "id": "a",
//         "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//           "0728e095ff24218119d51bd22475363",
//         "method": "getAttachment",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get first attachment with range:_start:1, _end:3 ");
//       return jIO.util.readBlobAsText(blob).then(function (e) {
//         deepEqual(blob.type, "text/plain", "Check blob type");
//         deepEqual(e.target.result, "ab", "Check blob text content");
//       }, function (err) {
//         deepEqual(err, "no error", "Check blob text content");
//       });
//     }
// 
// 
// 
// 
//     function getSecondAttachment() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, "aba"]); // GET
//       return jio.getAttachment({"_id": "a", "_attachment": "ab"});
//     }
// 
//     function getSecondAttachmentTest(answer) {
//       var blob = answer.data;
//       answer.data = "<blob>";
//       deepEqual(answer, {
//         "attachment": "ab",
//         "data": "<blob>",
//         "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//           "ed343e6c739e54131fcb3a56e4bc1bd",
//         "id": "a",
//         "method": "getAttachment",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get second attachment");
//       return jIO.util.readBlobAsText(blob).then(function (e) {
//         deepEqual(blob.type, "text/plain", "Check blob type");
//         deepEqual(e.target.result, "aba", "Check blob text content");
//       }, function (err) {
//         deepEqual(err, "no error", "Check blob text content");
//       });
//     }
// 
// 
//     function getSecondAttachmentRange1() {
//       return success(jio.getAttachment({"_id": "a",
//                                         "_attachment": "ab",
//                                         "_start": -1}));
//     }
//     function getSecondAttachmentRangeTest1(answer) {
//       deepEqual(answer, {
//         "attachment": "ab",
//         "error": "method_not_allowed",
//         "id": "a",
//         "message": "_start and _end must be positive",
//         "method": "getAttachment",
//         "reason": "invalide _start,_end",
//         "result": "error",
//         "status": 405,
//         "statusText": "Method Not Allowed"
//       }, "Get second attachment with range: _start: -1");
//     }
// 
//     function getSecondAttachmentRange2() {
//       return success(jio.getAttachment({"_id": "a",
//                                         "_attachment": "ab",
//                                         "_start": 1,
//                                         "_end": 0}));
//     }
//     function getSecondAttachmentRangeTest2(answer) {
//       deepEqual(answer, {
//         "attachment": "ab",
//         "error": "method_not_allowed",
//         "id": "a",
//         "message": "start is great then end",
//         "method": "getAttachment",
//         "reason": "invalide _start,_end",
//         "result": "error",
//         "status": 405,
//         "statusText": "Method Not Allowed"
//       }, "Get second attachment with range: _start: -1");
//     }
// 
// 
// 
//     function getSecondAttachmentRange3() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, "aab"]); // GET
//       return jio.getAttachment({"_id": "a",
//                                 "_attachment": "ab",
//                                 "_start": 1,
//                                 "_end": 2});
//     }
// 
//     function getSecondAttachmentRangeTest3(answer) {
//       var blob = answer.data;
//       answer.data = "<blob>";
//       deepEqual(answer, {
//         "attachment": "ab",
//         "data": "<blob>",
//         "id": "a",
//         "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//           "ed343e6c739e54131fcb3a56e4bc1bd",
//         "method": "getAttachment",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get second attachment with range:_start:1, _end:2 ");
//       return jIO.util.readBlobAsText(blob).then(function (e) {
//         deepEqual(blob.type, "text/plain", "Check blob type");
//         deepEqual(e.target.result, "a", "Check blob text content");
//       }, function (err) {
//         deepEqual(err, "no error", "Check blob text content");
//       });
//     }
// 
//     function getLastDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       return jio.get({"_id": "a"});
//     }
// 
//     function getLastDocumentTest(answer) {
//       deepEqual(answer, {
//         "data": {
//           "_id": "a",
//           "title": "Hoo",
//           "_attachments": {
//             "aa": {
//               "content_type": "text/plain",
//               "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//                 "0728e095ff24218119d51bd22475363",
//               "length": 3
//             },
//             "ab": {
//               "content_type": "text/plain",
//               "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//                 "ed343e6c739e54131fcb3a56e4bc1bd",
//               "length": 3
//             }
//           }
//         },
//         "id": "a",
//         "method": "get",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get last document metadata");
//     }
// 
//     function removeSecondAttachment() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           },
//           "ab": {
//             "content_type": "text/plain",
//             "digest": "sha256-e124adcce1fb2f88e1ea799c3d0820845" +
//               "ed343e6c739e54131fcb3a56e4bc1bd",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([204, {}, '']); // PUT
//       responses.push([204, {}, '']); // DELETE
//       return jio.removeAttachment({"_id": "a", "_attachment": "ab"});
//     }
// 
//     function removeSecondAttachmentTest(answer) {
//       deepEqual(answer, {
//         "attachment": "ab",
//         "id": "a",
//         "method": "removeAttachment",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Remove second document");
//     }
// 
//     function getInexistentSecondAttachment() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           }
//         }
//       })]); // GET
//       return success(jio.getAttachment({"_id": "a", "_attachment": "ab"}));
//     }
// 
//     function getInexistentSecondAttachmentTest(answer) {
//       deepEqual(answer, {
//         "attachment": "ab",
//         "error": "not_found",
//         "id": "a",
//         "message": "DavStorage, unable to get attachment.",
//         "method": "getAttachment",
//         "reason": "missing attachment",
//         "result": "error",
//         "status": 404,
//         "statusText": "Not Found"
//       }, "Get inexistent second attachment");
//     }
// 
//     function getOneAttachmentDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           }
//         }
//       })]); // GET
//       return jio.get({"_id": "a"});
//     }
// 
//     function getOneAttachmentDocumentTest(answer) {
//       deepEqual(answer, {
//         "data": {
//           "_attachments": {
//             "aa": {
//               "content_type": "text/plain",
//               "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//                 "0728e095ff24218119d51bd22475363",
//               "length": 3
//             }
//           },
//           "_id": "a",
//           "title": "Hoo"
//         },
//         "id": "a",
//         "method": "get",
//         "result": "success",
//         "status": 200,
//         "statusText": "Ok"
//       }, "Get document metadata");
//     }
// 
//     function removeSecondAttachmentAgain() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           }
//         }
//       })]); // GET
//       return success(jio.removeAttachment({"_id": "a", "_attachment": "ab"}));
//     }
// 
//     function removeSecondAttachmentAgainTest(answer) {
//       deepEqual(answer, {
//         "attachment": "ab",
//         "error": "not_found",
//         "id": "a",
//         "message": "DavStorage, document attachment not found.",
//         "method": "removeAttachment",
//         "reason": "missing attachment",
//         "result": "error",
//         "status": 404,
//         "statusText": "Not Found"
//       }, "Remove inexistent attachment");
//     }
// 
//     function removeDocument() {
//       responses.push([200, {
//         "Content-Type": "application/octet-stream"
//       }, JSON.stringify({
//         "_id": "a",
//         "title": "Hoo",
//         "_attachments": {
//           "aa": {
//             "content_type": "text/plain",
//             "digest": "sha256-38760eabb666e8e61ee628a17c4090cc5" +
//               "0728e095ff24218119d51bd22475363",
//             "length": 3
//           }
//         }
//       })]); // GET
//       responses.push([204, {}, '']); // DELETE (metadata)
//       responses.push([204, {}, '']); // DELETE (attachment aa)
//       return jio.remove({"_id": "a"});
//     }
// 
//     function removeDocumentTest(answer) {
//       deepEqual(answer, {
//         "id": "a",
//         "method": "remove",
//         "result": "success",
//         "status": 204,
//         "statusText": "No Content"
//       }, "Remove document and its attachments");
//     }
// 
//     function getInexistentFirstAttachment() {
//       responses.push([404, {}, '']); // GET
//       return success(jio.getAttachment({"_id": "a", "_attachment": "aa"}));
//     }
// 
//     function getInexistentFirstAttachmentTest(answer) {
//       deepEqual(answer, {
//         "attachment": "aa",
//         "error": "not_found",
//         "id": "a",
//         "message": "DavStorage, unable to get attachment.",
//         "method": "getAttachment",
//         "reason": "missing document",
//         "result": "error",
//         "status": 404,
//         "statusText": "Not Found"
//       }, "Get inexistent first attachment");
//     }
// 
//     function removeInexistentDocument() {
//       responses.push([404, {}, '']); // GET
//       return success(jio.remove({"_id": "a"}));
//     }
// 
//     function removeInexistentDocumentTest(answer) {
//       deepEqual(answer, {
//         "error": "not_found",
//         "id": "a",
//         "message": "DavStorage, unable to get metadata.",
//         "method": "remove",
//         "reason": "Not Found",
//         "result": "error",
//         "status": 404,
//         "statusText": "Not Found"
//       }, "Remove already removed document");
//     }
// 
//     // # Post new documents, list them and remove them
//     // post a 201
//     postNewDocument().then(postNewDocumentTest).
//       // get 200
//       then(getCreatedDocument).then(getCreatedDocumentTest).
//       // post b 201
//       then(postSpecificDocument).then(postSpecificDocumentTest).
//       // check b 204
//       then(checkDocument).then(checkDocumentTest).
//       // check storage 204
//       then(checkStorage).then(checkStorageTest).
//       // allD 200 2 documents
//       then(listDocuments).then(list2DocumentsTest).
//       // allD+include_docs 200 2 documents
//       then(listDocumentsWithMetadata).then(list2DocumentsWithMetadataTest).
//       // remove a 204
//       then(removeCreatedDocument).then(removeCreatedDocumentTest).
//       // remove b 204
//       then(removeSpecificDocument).then(removeSpecificDocumentTest).
//       // allD 200 empty storage
//       then(listEmptyStorage).then(listEmptyStorageTest).
//       // # Create and update documents, and some attachment and remove them
//       // put 201
//       then(putNewDocument).then(putNewDocumentTest).
//       // get 200
//       then(getCreatedDocument2).then(getCreatedDocument2Test).
//       // post 409
//       then(postSameDocument).then(postSameDocumentTest).
//       // putA 404
//       then(putAttachmentToNonExistentDocument).
//       then(putAttachmentToNonExistentDocumentTest).
//       // putA a 204
//       then(createAttachment).then(createAttachmentTest).
//       // putA a 204
//       then(updateAttachment).then(updateAttachmentTest).
//       // putA b 204
//       then(createAnotherAttachment).then(createAnotherAttachmentTest).
//       // put 204
//       then(updateLastDocument).then(updateLastDocumentTest).
//       // getA a 200
//       then(getFirstAttachment).then(getFirstAttachmentTest).
//       then(getFirstAttachmentRange1).then(getFirstAttachmentRangeTest1).
//       then(getFirstAttachmentRange2).then(getFirstAttachmentRangeTest2).
//       then(getFirstAttachmentRange3).then(getFirstAttachmentRangeTest3).
//       // getA b 200
//       then(getSecondAttachment).then(getSecondAttachmentTest).
//       then(getSecondAttachmentRange1).then(getSecondAttachmentRangeTest1).
//       then(getSecondAttachmentRange2).then(getSecondAttachmentRangeTest2).
//       then(getSecondAttachmentRange3).then(getSecondAttachmentRangeTest3).
//       // get 200
//       then(getLastDocument).then(getLastDocumentTest).
//       // removeA b 204
//       then(removeSecondAttachment).then(removeSecondAttachmentTest).
//       // getA b 404
//       then(getInexistentSecondAttachment).
//       then(getInexistentSecondAttachmentTest).
//       // get 200
//       then(getOneAttachmentDocument).then(getOneAttachmentDocumentTest).
//       // removeA b 404
//       then(removeSecondAttachmentAgain).then(removeSecondAttachmentAgainTest).
//       // remove 204
//       then(removeDocument).then(removeDocumentTest).
//       // getA a 404
//       then(getInexistentFirstAttachment).then(getInexistentFirstAttachmentTest).
//       // remove 404
//       then(removeInexistentDocument).then(removeInexistentDocumentTest).
//       // end
//       fail(function (error) {
//         console.log(error.stack);
//         console.log(error);
//         ok(false, error);
//       }).
//       always(function () {
//         start();
//         server.restore();
//       });
// 
//   });
// 
// }));
