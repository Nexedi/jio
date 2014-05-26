/*jslint
    indent: 2,
    maxlen: 80,
    plusplus: true,
    nomen: true,
    regexp: true
*/
/*global
    define,
    jIO,
    test,
    ok,
    sinon,
    module,
    clearTimeout,
    setTimeout,
    start,
    stop,
    deepEqual
*/

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO);
}(['jio', 'xwikistorage'], function (jIO) {
  "use strict";

  function nThen(next) {
    var funcs = [],
      timeouts = [],
      calls = 0,
      abort,
      ret,
      waitFor;
    waitFor = function (func) {
      calls++;
      return function () {
        if (func) {
          func.apply(null, arguments);
        }
        calls = (calls || 1) - 1;
        while (!calls && funcs.length && !abort) {
          funcs.shift()(waitFor);
        }
      };
    };
    waitFor.abort = function () {
      timeouts.forEach(clearTimeout);
      abort = 1;
    };
    ret = {
      nThen: function (next) {
        if (!abort) {
          if (!calls) {
            next(waitFor);
          } else {
            funcs.push(next);
          }
        }
        return ret;
      },
      orTimeout: function (func, milliseconds) {
        var cto, timeout;
        if (abort) { return ret; }
        if (!milliseconds) {
          throw new Error("Must specify milliseconds to orTimeout()");
        }
        timeout = setTimeout(function () {
          var f;
          while (f !== cto) { f = funcs.shift(); }
          func(waitFor);
          calls = (calls || 1) - 1;
          while (!calls && funcs.length) { funcs.shift()(waitFor); }
        }, milliseconds);
        cto = function () {
          var i;
          for (i = 0; i < timeouts.length; i++) {
            if (timeouts[i] === timeout) {
              timeouts.splice(i, 1);
              clearTimeout(timeout);
              return;
            }
          }
          throw new Error('timeout not listed in array');
        };
        funcs.push(cto);
        timeouts.push(timeout);
        return ret;
      }
    };
    return ret.nThen(next);
  }

  module('XWikiStorage');

  function setUp() {
    var o = {
      sinon: sinon.sandbox.create()
    };
    o.addFakeServerResponse =
      function (type, method, path, status, response, t) {
        t = t || 'application/xml';
        /*jslint unparam: true */
        o.sinon.server.respondWith(method, new RegExp(path), [
          status,
          {"Content-Type": t},
          response
        ]);
      };
    o.sinon.useFakeTimers();
    o.sinon.useFakeServer();

    o.respond = function () {
      o.sinon.clock.tick(5000);
      o.sinon.server.respond();
    };

    o.jio = jIO.createJIO(
      {type: 'xwiki', formTokenPath: 'form_token', xwikiurl: ''}
    );
    o.addFakeServerResponse("xwiki", "GET", "form_token", 200,
                            '<meta name="form_token" content="OMGHAX"/>');
    o._addFakeServerResponse = o.addFakeServerResponse;
    o.expectedRequests = [];
    o.addFakeServerResponse = function (a, b, c, d, e) {
      o._addFakeServerResponse(a, b, c, d, e);
      o.expectedRequests.push([b, c]);
    };
    o.assertReqs = function (count, message) {
      var i, j, req, expected, ex;
      o.requests = (o.requests || 0) + count;
      ok(o.sinon.server.requests.length === o.requests,
         message + "[expected [" + count + "] got [" +
         (o.sinon.server.requests.length - (o.requests - count)) + "]]");
      for (i = 1; i <= count; i += 1) {
        req = o.sinon.server.requests[o.sinon.server.requests.length - i];
        if (!req) {
          break;
        }
        for (j = o.expectedRequests.length - 1; j >= 0; j -= 1) {
          expected = o.expectedRequests[j];
          if (req.method === expected[0] &&
              req.url.indexOf(expected[1]) !== 0) {
            o.expectedRequests.splice(j, 1);
          }
        }
      }
      ex = o.expectedRequests.pop();
      if (ex) {
        ok(0, "expected [" +  ex[0] + "] request for [" + ex[1] + "]");
      }
    };
    return o;
  }

  function nThenTest(o, nt) {
    stop();
    nt.nThen(function () {
      o.sinon.restore();
      start();

    }).orTimeout(function () {
      o.sinon.restore();
      ok(0);
      start();
    }, 1000);
  }

  test("Post", function () {

    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // post non empty document
      o.addFakeServerResponse("xwiki", "POST", "myFile1", 201, "HTML RESPONSE");
      o.jio.post({"_id": "myFile1", "title": "hello there"}).
        then(waitFor(function (ret) {
          deepEqual({
            id: "myFile1",
            method: "post",
            result: "success",
            status: 201,
            statusText: "Created"
          }, ret);

        }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(
        3,
        "post -> 1 request to get csrf token, 1 to get doc and 1 to post data"
      );
    }));
  });

  test("Post2", function () {

    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // post but document already exists (post = error!, put = ok)
      o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>hello there</title></page>';
      o.addFakeServerResponse("xwiki", "GET", "pages/myFile2", 200, o.answer);

      o.jio.post({"_id": "myFile2", "title": "hello again"}).
        then(function () {
          ok(0);
        }, waitFor(function (err) {
          deepEqual({
            error: "conflict",
            id: "myFile2",
            message: "Cannot create a new document",
            method: "post",
            reason: "document exists",
            result: "error",
            status: 409,
            statusText: "Conflict"
          }, err);
        }));

      o.respond();

    }).nThen(function () {

      o.assertReqs(2, "post w/ existing doc -> 2 request to get doc then fail");

    }));

  });

  test("PutNoId", function () {

    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // put without id => id required
      o.jio.put({}).then(function () {
        ok(0);
      }, waitFor(function (err) {
        deepEqual({
          "error": "bad_request",
          "message": "Document id must be a non empty string.",
          "method": "put",
          "reason": "wrong document id",
          "result": "error",
          "status": 400,
          "statusText": "Bad Request"
        }, err);
      }));

    }).nThen(function () {

      o.assertReqs(0, "put w/o id -> 0 requests");

    }));
  });

  test("Put", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // put non empty document
      o.addFakeServerResponse("xwiki", "POST", "put1", 201, "HTML RESPONSE");
      o.jio.put({"_id": "put1", "title": "myPut1"}).
        then(waitFor(function (res) {
          deepEqual({
            "id": "put1",
            "method": "put",
            "result": "success",
            "status": 201,
            "statusText": "Created"
          }, res);
        }));

      o.respond();

    }).nThen(function () {

      o.assertReqs(
        3,
        "put normal doc -> 1 req to get doc (404), 1 for csrf token, 1 to post"
      );

    }));
  });

  test("PutUpdateDoc", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // put but document already exists = update
      o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>mtPut1</title></page>';
      o.addFakeServerResponse("xwiki", "GET", "put2", 200, o.answer);
      o.addFakeServerResponse("xwiki", "POST", "put2", 201, "HTML RESPONSE");

      o.jio.put({"_id": "put2", "title": "myPut2abcdedg"}).
        then(waitFor(function (ret) {
          deepEqual({
            "id": "put2",
            "method": "put",
            "result": "success",
            "status": 204,
            "statusText": "No Content"
          }, ret);
        }));

      o.respond();

    }).nThen(function () {

      o.assertReqs(
        4,
        "put update doc -> 2 req to get doc, 1 for csrf token, 1 to post"
      );

    }));
  });

  test("PutAttachmentNoDocId", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {
      // putAttachment without doc id => id required
      o.jio.putAttachment({}, function () {
        ok(0);
      }, waitFor(function (err) {
        deepEqual({
          "attachment": undefined,
          "error": "bad_request",
          "message": "Document id must be a non empty string.",
          "method": "putAttachment",
          "reason": "wrong document id",
          "result": "error",
          "status": 400,
          "statusText": "Bad Request"
        }, err);
      }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(0, "put attach w/o doc id -> 0 requests");
    }));
  });

  test("PutAttachmentNoAttachId", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {
      // putAttachment without attachment id => attachment id required
      o.jio.putAttachment({"_id": "putattmt1"}, function () {
        ok(0);
      }, waitFor(function (err) {
        deepEqual({
          "attachment": undefined,
          "error": "bad_request",
          "id": "putattmt1",
          "message": "Attachment id must be a non empty string.",
          "method": "putAttachment",
          "reason": "wrong attachment id",
          "result": "error",
          "status": 400,
          "statusText": "Bad Request"
        }, err);
      }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(0, "put attach w/o attach id -> 0 requests");
    }));
  });

  test("PutAttachmentUnderlyingDocumentNonexistant", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {
      // putAttachment without underlying document => not found
      o.jio.putAttachment(
        {"_id": "putattmtx", "_attachment": "putattmt2", "_data": ""},
        function () {
          ok(0);
        },
        waitFor(function (err) {
          deepEqual({
            "attachment": "putattmt2",
            "error": "not_found",
            "id": "putattmtx",
            "message": "Impossible to add attachment",
            "method": "putAttachment",
            "reason": "missing",
            "result": "error",
            "status": 404,
            "statusText": "Not Found"
          }, err);
        })
      );

      o.respond();

    }).nThen(function () {
      o.assertReqs(
        1,
        "put attach w/o existing document -> 1 request to get doc"
      );
    }));
  });

  test("GetNonexistantDoc", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {
      // get inexistent document
      o.jio.get({_id: "get_nonexistant_doc"}, function () {
        ok(0);
      }, waitFor(function (err) {
        deepEqual({
          "error": "not_found",
          "id": "get_nonexistant_doc",
          "message": "Cannot find document",
          "method": "get",
          "reason": "missing",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, err);
      }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(1, "try to get nonexistent doc -> 1 request");
    }));
  });

  test("GetAttachInNonexistantDoc", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {
      o.jio.getAttachment(
        {"_id": "noSuchDoc", "_attachment": "its_attachment"},
        function () {
          ok(0);
        },
        waitFor(function (err) {
          deepEqual({
            "attachment": "its_attachment",
            "error": "not_found",
            "id": "noSuchDoc",
            "message": "Cannot find document",
            "method": "getAttachment",
            "reason": "missing document",
            "result": "error",
            "status": 404,
            "statusText": "Not Found"
          }, err);
        })
      );

      o.respond();

    }).nThen(function () {
      o.assertReqs(1, "try to get nonexistent attach -> 1 request");
    }));
  });

  test("GetDoc", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {
      o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>some title</title></page>';
      o.addFakeServerResponse("xwiki", "GET", "get_doc", 200, o.answer);

      o.jio.get({_id: "get_doc"}).then(waitFor(function (ret) {
        deepEqual({
          "data": {
            "_attachments": {},
            "_id": "get_doc",
            "title": "some title"
          },
          "id": "get_doc",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, ret);
      }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(2, "get document -> 2 request");
    }));
  });

  test("GetNonexistantAttach", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // get inexistent attachment (document exists)
      o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>some title</title></page>';
      o.addFakeServerResponse(
        "xwiki",
        "GET",
        "get_nonexistant_attach",
        200,
        o.answer
      );

      o.jio.getAttachment(
        {"_id": "get_nonexistant_attach", "_attachment": "nxattach"},
        function () {
          ok(0);
        },
        waitFor(function (err) {
          deepEqual({
            "attachment": "nxattach",
            "error": "not_found",
            "id": "get_nonexistant_attach",
            "message": "Cannot find attachment",
            "method": "getAttachment",
            "reason": "missing attachment",
            "result": "error",
            "status": 404,
            "statusText": "Not Found"
          }, err);
        })
      );

      o.respond();

    }).nThen(function () {
      o.assertReqs(2, "get nonexistant attachment -> 2 request to get doc");
    }));
  });

  test("GetAttachHappyPath", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // get attachment
      o.addFakeServerResponse(
        "xwiki",
        "GET",
        "spaces/Main/pages/get_attachment$",
        200,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<page xmlns="http://www.xwiki.org"><title>some title</title></page>'
      );
      o.addFakeServerResponse(
        "xwiki",
        "GET",
        "spaces/Main/pages/get_attachment/attachments",
        200,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<attachments xmlns="http://www.xwiki.org">' +
          '<attachment><name>attach_name</name></attachment>' +
          '</attachments>'
      );

      // We can't fully test this
      // because sinon doesn't support HTML5 blob responses.
      //o.addFakeServerResponse(
      //    "xwiki", "GET", "download/Main/get_attachment/attach_name", 200,
      //    "content", "application/octet-stream");

      o.jio.getAttachment(
        {"_id": "get_attachment", "_attachment": "attach_name"},
        waitFor(function (ret) {
          deepEqual({
            "attachment": "attach_name",
            "error": "err_network_error",
            "id": "get_attachment",
            "message": "Failed to get attachment [get_attachment/attach_name]",
            "method": "getAttachment",
            "reason": "Error getting data from network",
            "result": "error",
            "status": 404,
            "statusText": "Not Found"
          }, ret);
        })
      );

      o.respond();

    }).nThen(function () {
      o.assertReqs(3, "get attachment -> 2 requests to get doc, 1 for attach");
    }));
  });


  test("RemoveNonexistantDocument", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // remove inexistent document
      o.addFakeServerResponse("xwiki", "GET", "remove1", 404, "HTML RESPONSE");

      o.jio.remove({"_id": "remove1"}, waitFor(function (ret) {
        deepEqual({
          "error": "error",
          "id": "remove1",
          "message": "Failed to delete document [remove1]",
          "method": "remove",
          "reason": "Not Found",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, ret);
      }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(
        2,
        "remove nonexistent doc -> 1 request for csrf and 1 for doc"
      );
    }));
  });


  test("RemoveNonexistantAttachment", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // remove inexistent document/attachment
      o.addFakeServerResponse("xwiki", "GET", "remove1/remove2", 404, "HTML" +
                              "RESPONSE");

      o.jio.removeAttachment(
        {"_id": "remove1", "_attachment": "remove2"},
        function () {
          ok(0);
        },
        waitFor(function (err) {
          deepEqual({
            "attachment": "remove2",
            "error": "not_found",
            "id": "remove1",
            "message": "Document not found",
            "method": "removeAttachment",
            "reason": "missing document",
            "result": "error",
            "status": 404,
            "statusText": "Not Found"
          }, err);
        })
      );

      o.respond();

    }).nThen(function () {
      o.assertReqs(1, "remove nonexistant attach -> 1 request for doc");
    }));
  });


  test("RemoveDocument", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      o.addFakeServerResponse("xwiki", "POST", "delete/Main/remove3",
                              200, "HTML RESPONSE");

      o.jio.remove({"_id": "remove3"}).then(waitFor(function (ret) {
        deepEqual({
          "id": "remove3",
          "method": "remove",
          "result": "success",
          "status": 204,
          "statusText": "No Content"
        }, ret);
      }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(
        2,
        "remove document -> 1 request for csrf and 1 for deleting doc"
      );
    }));
  });

  test("RemoveAttachment", function () {
    var o = setUp(this);
    nThenTest(o, nThen(function (waitFor) {

      // remove attachment
      o.addFakeServerResponse(
        "xwiki",
        "GET",
        "spaces/Main/pages/remove4$",
        200,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<page xmlns="http://www.xwiki.org"><title>some title</title></page>'
      );
      o.addFakeServerResponse(
        "xwiki",
        "GET",
        "spaces/Main/pages/remove4/attachments",
        200,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<attachments xmlns="http://www.xwiki.org">' +
          '<attachment><name>remove5</name></attachment>' +
          '</attachments>'
      );
      o.addFakeServerResponse(
        "xwiki",
        "POST",
        "delattachment/Main/remove4/remove5",
        200,
        "HTML RESPONSE"
      );

      o.jio.removeAttachment(
        {"_id": "remove4", "_attachment": "remove5"}
      ).always(waitFor(function (ret) {
        deepEqual({
          "attachment": "remove5",
          "id": "remove4",
          "method": "removeAttachment",
          "result": "success",
          "status": 204,
          "statusText": "No Content"
        }, ret);
      }));

      o.respond();

    }).nThen(function () {
      o.assertReqs(
        4,
        "remove attach -> get doc, get attachments, get csrf, remove attach"
      );
    }));
  });

}));
