/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, test_util, RSVP, test, ok, deepEqual, module, stop,
  start, hex_sha256 */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, test_util, RSVP);
}([
  'jio',
  'test_util',
  'rsvp',
  'localstorage',
  'splitstorage'
], function (jIO, util, RSVP) {
  "use strict";

  var tool = {
    "readBlobAsBinaryString": jIO.util.readBlobAsBinaryString
  };

  function reverse(promise) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      promise.then(reject, resolve, notify);
    }, function () {
      promise.cancel();
    });
  }

  /**
   * sequence(thens): Promise
   *
   * Executes a sequence of *then* callbacks. It acts like
   * `smth().then(callback).then(callback)...`. The first callback is called
   * with no parameter.
   *
   * Elements of `thens` array can be a function or an array contaning at most
   * three *then* callbacks: *onFulfilled*, *onRejected*, *onNotified*.
   *
   * When `cancel()` is executed, each then promises are cancelled at the same
   * time.
   *
   * @param  {Array} thens An array of *then* callbacks
   * @return {Promise} A new promise
   */
  function sequence(thens) {
    var promises = [];
    return new RSVP.Promise(function (resolve, reject, notify) {
      var i;
      promises[0] = new RSVP.Promise(function (resolve) {
        resolve();
      });
      for (i = 0; i < thens.length; i += 1) {
        if (Array.isArray(thens[i])) {
          promises[i + 1] = promises[i].
            then(thens[i][0], thens[i][1], thens[i][2]);
        } else {
          promises[i + 1] = promises[i].then(thens[i]);
        }
      }
      promises[i].then(resolve, reject, notify);
    }, function () {
      var i;
      for (i = 0; i < promises.length; i += 1) {
        promises[i].cancel();
      }
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

  module("SplitStorage + LocalStorage");

  test("Post", function () {
    var shared = {}, jio, jio_local_list = [];

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "post1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "post2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});
    jio_local_list[0] = jIO.createJIO(shared.local_storage_description1, {
      "workspace": shared.workspace
    });
    jio_local_list[1] = jIO.createJIO(shared.local_storage_description2, {
      "workspace": shared.workspace
    });
    jio_local_list.run = function (method, argument) {
      var i, promises = [];
      for (i = 0; i < this.length; i += 1) {
        promises[i] = this[i][method].apply(this[i], argument);
      }
      return RSVP.all(promises);
    };
    jio_local_list.get = function () {
      return this.run("get", arguments);
    };

    stop();
    // post without id
    jio.post({
      "_underscored_meta": "uvalue",
      "meta": "data"
    }).then(function (answer) {
      shared.uuid = answer.id;
      answer.id = "<uuid>";
      ok(util.isUuid(shared.uuid), "Uuid should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + shared.uuid);
      deepEqual(answer, {
        "id": "<uuid>",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post document without id");

      // check uploaded documents
      return jio_local_list.get({"_id": shared.uuid});

    }).then(function (answers) {
      var i;
      for (i = 0; i < answers.length; i += 1) {
        deepEqual(answers[i].data, {
          "_id": shared.uuid,
          "_underscored_meta": "uvalue",
          "data": i === 0 ? "{\"meta\"" : ":\"data\"}"
        }, "Check uploaded document in sub storage " + (i + 1));
      }

      // post with id
      return jio.post({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data",
        "hello": "world"
      });

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "one",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post document with id");

      // check uploaded documents
      return jio_local_list.get({"_id": "one"});

    }).then(function (answers) {

      deepEqual(answers[0].data, {
        "_id": "one",
        "_underscored_meta": "uvalue",
        "data": "{\"meta\":\"data\","
      }, "Check uploaded document in sub storage 1");

      deepEqual(answers[1].data, {
        "_id": "one",
        "_underscored_meta": "uvalue",
        "data": "\"hello\":\"world\"}"
      }, "Check uploaded document in sub storage 2");

      // post with id
      return reverse(jio.post({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data",
        "hello": "world"
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "conflict",
        "id": "one",
        "message": "Unable to post document",
        "method": "post",
        "reason": "document exists",
        "result": "error",
        "status": 409,
        "statusText": "Conflict"
      }, "Post document with same id -> 409 Conflict");

    }).fail(unexpectedError).always(start);

  });

  test("PutAttachment", function () {
    var shared = {}, jio, jio_local_list = [];

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "putAttachment1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "putAttachment2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});
    jio_local_list[0] = jIO.createJIO(shared.local_storage_description1, {
      "workspace": shared.workspace
    });
    jio_local_list[1] = jIO.createJIO(shared.local_storage_description2, {
      "workspace": shared.workspace
    });
    jio_local_list.run = function (method, argument) {
      var i, promises = [];
      for (i = 0; i < this.length; i += 1) {
        promises[i] = this[i][method].apply(this[i], argument);
      }
      return RSVP.all(promises);
    };
    jio_local_list.get = function () {
      return this.run("get", arguments);
    };
    jio_local_list.getAttachmentAsBinaryString = function () {
      return this.run("getAttachment", arguments).then(function (answers) {
        var i, promises = [];
        for (i = 0; i < answers.length; i += 1) {
          promises[i] = tool.readBlobAsBinaryString(answers[i].data);
        }
        return RSVP.all(promises);
      });
    };

    stop();

    return reverse(jio.putAttachment({
      "_id": "one",
      "_attachment": "my_attachment",
      "_data": "My Data",
      "_content_type": "text/plain"
    })).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "error": "not_found",
        "id": "one",
        "message": "Unable to put attachment",
        "method": "putAttachment",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Put attachment on a inexistent document -> 404 Not Found");

      return jio.post({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      });

    }).then(function () {

      return jio.putAttachment({
        "_id": "one",
        "_attachment": "my_attachment",
        "_data": "My Data",
        "_mimetype": "text/plain"
      });

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "id": "one",
        "method": "putAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Put attachment on a document");

      // check uploaded documents
      return jio_local_list.get({"_id": "one"});

    }).then(function (answers) {

      deepEqual(answers[0].data, {
        "_attachments": {
          "my_attachment": {
            "content_type": "text/plain",
            "digest": "sha256-ebf2d770a6a2dfa135f6c81431f22fc3cbcde9ae" +
              "e52759ca9e520d4d964c1322", // sha256("My ")
            "length": 3
          }
        },
        "_id": "one",
        "_underscored_meta": "uvalue",
        "data": "{\"meta\""
      }, "Check uploaded document in sub storage 1");

      deepEqual(answers[1].data, {
        "_attachments": {
          "my_attachment": {
            "content_type": "text/plain",
            "digest": "sha256-cec3a9b89b2e391393d0f68e4bc12a9fa6cf358b" +
              "3cdf79496dc442d52b8dd528", // sha256("Data")
            "length": 4
          }
        },
        "_id": "one",
        "_underscored_meta": "uvalue",
        "data": ":\"data\"}"
      }, "Check uploaded document in sub storage 2");

      return jio_local_list.getAttachmentAsBinaryString({
        "_id": "one",
        "_attachment": "my_attachment"
      });

    }).then(function (events) {

      deepEqual(events[0].target.result, "My ",
                "Check uploaded document in sub storage 1");
      deepEqual(events[1].target.result, "Data",
                "Check uploaded document in sub storage 1");

    }).fail(unexpectedError).always(start);

  });

  test("Get", function () {
    var shared = {}, jio;

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "get1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "get2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});

    stop();

    reverse(jio.get({"_id": "one"})).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "one",
        "message": "Unable to get document",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get missing document");

      return jio.post({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      });

    }).then(function () {

      return jio.get({"_id": "one"});

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      }, "Get posted document");

      return jio.putAttachment({
        "_id": "one",
        "_attachment": "my_attachment",
        "_data": "My Data",
        "_content_type": "text/plain"
      });

    }).then(function () {

      return jio.get({"_id": "one"});

    }).then(function (answer) {

      deepEqual(answer.data, {
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

    }).fail(unexpectedError).always(start);

  });

  test("GetAttachment", function () {
    var shared = {}, jio;

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "getAttachment1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "getAttachment2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});

    stop();

    reverse(jio.getAttachment({
      "_id": "one",
      "_attachment": "my_attachment"
    })).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "error": "not_found",
        "id": "one",
        "message": "Unable to get attachment",
        "method": "getAttachment",
        "reason": "missing document",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get attachment from missing document -> 404 Not Found");

      return jio.post({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      });

    }).then(function () {

      return reverse(jio.getAttachment({
        "_id": "one",
        "_attachment": "my_attachment"
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "error": "not_found",
        "id": "one",
        "message": "Unable to get attachment",
        "method": "getAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Get missing attachment from document");

      return jio.putAttachment({
        "_id": "one",
        "_attachment": "my_attachment",
        "_data": "My Data",
        "_mimetype": "text/plain"
      });

    }).then(function () {

      return jio.getAttachment({"_id": "one", "_attachment": "my_attachment"});

    }).then(function (answer) {
      return tool.readBlobAsBinaryString(answer.data);
    }).then(function (event) {

      deepEqual(event.target.result, "My Data", "Get attachment");

    }).fail(unexpectedError).always(start);

  });

  test("RemoveAttachment", function () {
    var shared = {}, jio;

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "removeAttachment1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "removeAttachment2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});

    stop();

    reverse(jio.removeAttachment({
      "_id": "one",
      "_attachment": "my_attachment"
    })).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "error": "not_found",
        "id": "one",
        "message": "Unable to remove attachment",
        "method": "removeAttachment",
        "reason": "missing document",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove attachment from inexistent document -> 404 Not Found");

      return jio.post({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      });

    }).then(function () {

      return reverse(jio.removeAttachment({
        "_id": "one",
        "_attachment": "my_attachment"
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "error": "not_found",
        "id": "one",
        "message": "Unable to remove attachment",
        "method": "removeAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove inexistent attachment -> 404 Not Found");

      return jio.putAttachment({
        "_id": "one",
        "_attachment": "my_attachment",
        "_data": "My Data",
        "_mimetype": "text/plain"
      });

    }).then(function () {

      return jio.removeAttachment({
        "_id": "one",
        "_attachment": "my_attachment"
      });

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "id": "one",
        "method": "removeAttachment",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove attachment");

      return jio.get({"_id": "one"});

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      }, "Check document");

      return reverse(jio.getAttachment({
        "_id": "one",
        "_attachment": "my_attachment"
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "error": "not_found",
        "id": "one",
        "message": "Unable to get attachment",
        "method": "getAttachment",
        "reason": "missing attachment",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Check attachment -> 404 Not Found");

    }).fail(unexpectedError).always(start);

  });

  test("Remove", function () {
    var shared = {}, jio;

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "remove1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "remove2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});

    stop();

    reverse(jio.remove({"_id": "one"})).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "one",
        "message": "Unable to remove document",
        "method": "remove",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Remove missing document -> 404 Not Found");

      return jio.post({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      });

    }).then(function () {

      return jio.putAttachment({
        "_id": "one",
        "_attachment": "my_attachment",
        "_data": "My Data",
        "_mimetype": "text/plain"
      });

    }).then(function () {

      return jio.remove({"_id": "one"});

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "one",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove document");

      return reverse(jio.getAttachment({
        "_id": "one",
        "_attachment": "my_attachment"
      }));

    }).then(function (answer) {

      deepEqual(answer, {
        "attachment": "my_attachment",
        "error": "not_found",
        "id": "one",
        "message": "Unable to get attachment",
        "method": "getAttachment",
        "reason": "missing document",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Check attachment -> 404 Not Found");

      return reverse(jio.get({"_id": "one"}));

    }).then(function (answer) {

      deepEqual(answer, {
        "error": "not_found",
        "id": "one",
        "message": "Unable to get document",
        "method": "get",
        "reason": "missing",
        "result": "error",
        "status": 404,
        "statusText": "Not Found"
      }, "Check document -> 404 Not Found");

    }).fail(unexpectedError).always(start);

  });

  test("Put", function () {
    var shared = {}, jio;

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "put1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "put2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});

    stop();

    jio.put({
      "_id": "one",
      "_underscored_meta": "uvalue",
      "meta": "data"
    }).then(function (answer) {

      deepEqual(answer, {
        "id": "one",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Put new document");

      return jio.get({"_id": "one"});

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meta": "data"
      }, "Check document");

      return jio.put({
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meow": "dog"
      });

    }).then(function (answer) {

      deepEqual(answer, {
        "id": "one",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Put same document again");

      return jio.get({"_id": "one"});

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "one",
        "_underscored_meta": "uvalue",
        "meow": "dog"
      }, "Get document for check");

    }).fail(unexpectedError).always(start);

  });

  test("AllDocs", function () {
    var shared = {}, jio;

    shared.workspace = {};
    shared.local_storage_description1 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "alldocs1",
      "mode": "memory"
    };
    shared.local_storage_description2 = {
      "type": "local",
      "username": "splitstorage",
      "application_name": "alldocs2",
      "mode": "memory"
    };
    jio = jIO.createJIO({
      "type": "split",
      "storage_list": [
        shared.local_storage_description1,
        shared.local_storage_description2
      ]
    }, {"workspace": shared.workspace});

    stop();

    function prepareDatabase() {
      var i, do_list = [];
      function post(i) {
        return function () {
          return jio.post({
            "_id": "doc" + i,
            "_underscored_meta": "uvalue" + i,
            "meta": "data" + i
          });
        };
      }
      function putAttachment(i) {
        return function () {
          return jio.putAttachment({
            "_id": "doc" + i,
            "_attachment": "my_attachment" + i,
            "_data": "My Data" + i,
            "_content_type": "text/plain"
          });
        };
      }
      for (i = 0; i < 5; i += 1) {
        do_list.push(post(i));
      }
      for (i = 0; i < 2; i += 1) {
        do_list.push(putAttachment(i));
      }
      return sequence(do_list);
    }

    prepareDatabase().then(function () {

      return jio.get({"_id": "doc1"});

    }).then(function (answer) {

      deepEqual(answer.data, {
        "_id": "doc1",
        "_underscored_meta": "uvalue1",
        "meta": "data1",
        "_attachments": {
          "my_attachment1": {
            "length": 8,
            "content_type": "text/plain"
          }
        }
      }, "Check document");

      return jio.allDocs();

    }).then(function (answer) {

      answer.data.rows.sort(function (a, b) {
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

      deepEqual(answer.data, {
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

    }).fail(unexpectedError).always(start);

  });

}));
