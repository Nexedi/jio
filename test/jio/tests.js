/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, window, exports, jIO, ok, module, test, expect, deepEqual,
  sinon, FileReader, Blob, setTimeout */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports, jIO);
  }
  window.jio_tests = {};
  module(window.jio_tests, jIO);
}(['exports', 'jio', 'sinon_qunit'], function (exports, jIO) {
  "use strict";
  var JIO = jIO.JIO, fakestorage = {};

  //////////////////////////////////////////////////////////////////////////////
  // Fake Storage

  function FakeStorage(spec) {
    this._id = spec.id;
    if (typeof this._id !== 'string' || this._id.length <= 0) {
      throw new TypeError(
        "Initialization error: wrong id"
      );
    }
  }

  FakeStorage.createNamespace = function (
    that,
    method,
    command,
    param,
    options
  ) {
    fakestorage[that._id + '/' + method] = {
      param: param,
      options: options,
      success: function () {
        command.success.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
      },
      error: function () {
        command.error.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
      },
      retry: function () {
        command.retry.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
      },
      notify: function () {
        command.notify.apply(command, arguments);
      },
      storage: function () {
        command.storage.apply(command, arguments);
      },
      end: function () {
        command.end.apply(command, arguments);
      },
      commit: function () {
        command.commit.apply(command, arguments);
      },
      free: function () {
        delete fakestorage[that._id + '/' + method];
      }
    };
  };

  FakeStorage.makeMethod = function (method) {
    return function (command, param, options) {
      FakeStorage.createNamespace(this, method, command, param, options);
    };
  };

  FakeStorage.prototype.post = FakeStorage.makeMethod('post');
  FakeStorage.prototype.put = FakeStorage.makeMethod('put');
  FakeStorage.prototype.get = FakeStorage.makeMethod('get');
  FakeStorage.prototype.remove = FakeStorage.makeMethod('remove');
  FakeStorage.prototype.putAttachment = FakeStorage.makeMethod('putAttachment');
  FakeStorage.prototype.getAttachment = FakeStorage.makeMethod('getAttachment');
  FakeStorage.prototype.removeAttachment =
    FakeStorage.makeMethod('removeAttachment');
  FakeStorage.prototype.check = FakeStorage.makeMethod('check');
  FakeStorage.prototype.repair = FakeStorage.makeMethod('repair');
  FakeStorage.prototype.allDocs = FakeStorage.makeMethod('allDocs');

  jIO.addStorage('fake', FakeStorage);
  exports.fakestorage = fakestorage;

  //////////////////////////////////////////////////////////////////////////////
  // Tests

  module('JIO');

  /**
   * Tests the instance initialization
   */
  test('Init', function () {
    expect(1);
    var workspace = {}, jio = new JIO(undefined, {
      "workspace": workspace
    });

    // tests if jio is an object
    ok(typeof jio === 'object', 'Init ok!');
  });

  /**
   * Tests a wrong command
   */
  test('Wrong parameters', function () {
    expect(2);
    var result, jio = new JIO({
      "type": "fake",
      "id": "Wrong para"
    }, {
      "workspace": {}
    });

    try {
      jio.post(); // post(kwargs, [options], [callbacks]);
      result = "No error thrown";
    } catch (e1) {
      result = e1.name + ": " + e1.message;
    }
    deepEqual(
      result,
      "TypeError: JIO().post(): Argument 1 is not of type 'object'",
      "Wrong parameter"
    );

    try {
      jio.allDocs(); // allDocs([options], [callbacks]);
      result = "No error thrown";
    } catch (e2) {
      result = e2.name + ": " + e2.message;
    }
    deepEqual(result, "No error thrown", "Good parameter");
  });

  /**
   * Tests asynchrony
   */
  test("Asynchrony", function () {
    var workspace = {}, clock, jio, count = 0;
    expect(8);

    clock = sinon.useFakeTimers();
    jio = new JIO({
      "type": "fake",
      "id": "Asynchrony"
    }, {
      "workspace": workspace
    });

    jio.post({}).done(function () {
      count += 1;
      deepEqual(count, 6, "Command done");
    }).progress(function () {
      count += 1;
      deepEqual(count, 3, "Command notifiy");
    });
    count += 1;
    deepEqual(count, 1, "JIO post");
    ok(!fakestorage['Asynchrony/post'], "Command not called yet");
    clock.tick(1);
    count += 1;
    deepEqual(count, 2, "Next instructions");
    ok(fakestorage['Asynchrony/post'], "Command called");
    fakestorage['Asynchrony/post'].notify();
    count += 1;
    deepEqual(count, 4, "Next timer");
    fakestorage['Asynchrony/post'].success({"id": "a"});
    count += 1;
    deepEqual(count, 5, "Command success requested");
    clock.tick(1);
  });

  /**
   * Tests a storage initialization error
   */
  test('Description Error', function () {
    var clock, jio;
    expect(2);
    clock = sinon.useFakeTimers();
    jio = new JIO({
      "type": "blue"
    }, {
      "workspace": {}
    });

    // Tests wrong storage type
    jio.post({}).always(function (answer) {
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "Check if the storage description respects the " +
          "constraints provided by the storage designer. (TypeError: " +
          "Unknown storage 'blue')",
        "reason": "invalid description",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "Unknown storage");
    });
    clock.tick(1);

    // Tests wrong storage description
    jio = new JIO({
      "type": "fake",
      "id": ""
    }, {
      "workspace": {}
    });

    jio.post({}).always(function (answer) {
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "Check if the storage description respects the " +
          "constraints provided by the storage designer. (TypeError: " +
          "Initialization error: wrong id)",
        "reason": "invalid description",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "Initialization error");
    });
    clock.tick(1);
  });

  /**
   * Tests a command which does not respond
   */
  test('No Response or Response Timeout', function () {
    var clock, jio, state;
    expect(5);
    clock = sinon.useFakeTimers();
    jio = new JIO({
      "type": "fake",
      "id": "1 No Respons"
    }, {
      "workspace": {}
    });

    // tests default timeout
    jio.post({}).always(function (answer) {
      deepEqual(answer, {
        "error": "request_timeout",
        "message": "Operation canceled after around " +
          "10000 milliseconds of inactivity.",
        "reason": "timeout",
        "status": 408,
        "statusText": "Request Timeout"
      }, "Timeout error (default timeout)");
    });
    clock.tick(1);
    clock.tick(10000); // wait 10 seconds
    fakestorage['1 No Respons/post'].free();

    jio = new JIO({
      "type": "fake",
      "id": "2 No Respons"
    }, {
      "workspace": {}
    });

    // tests storage timeout
    state = "Not called yet";
    jio.post({}).always(function (answer) {
      state = "Called";
      deepEqual(answer, {
        "error": "request_timeout",
        "message": "Operation canceled after around " +
          "10000 milliseconds of inactivity.",
        "reason": "timeout",
        "status": 408,
        "statusText": "Request Timeout"
      }, "Timeout error (storage timeout reset)");
    });
    clock.tick(1);
    clock.tick(4999); // wait 5 seconds
    fakestorage['2 No Respons/post'].notify();
    clock.tick(5000); // wait 5 seconds
    deepEqual(state, "Not called yet", "Check callback state.");
    clock.tick(5000); // wait 5 seconds
    fakestorage['2 No Respons/post'].free();

    jio = new JIO({
      "type": "fake",
      "id": "3 No Respons"
    }, {
      "workspace": {},
      "default_timeout": 2
    });

    // tests jio option timeout
    jio.post({}).always(function (answer) {
      deepEqual(answer, {
        "error": "request_timeout",
        "message": "Operation canceled after around " +
          "2 milliseconds of inactivity.",
        "reason": "timeout",
        "status": 408,
        "statusText": "Request Timeout"
      }, "Timeout error (specific default timeout)");
    });
    clock.tick(1);
    clock.tick(1);

    // tests command option timeout
    jio.post({}, {"timeout": 50}).always(function (answer) {
      deepEqual(answer, {
        "error": "request_timeout",
        "message": "Operation canceled after around " +
          "50 milliseconds of inactivity.",
        "reason": "timeout",
        "status": 408,
        "statusText": "Request Timeout"
      }, "Timeout error (command timeout)");
    });
    clock.tick(1);
    clock.tick(49);
  });

  /**
   * Tests wrong responses
   */
  test('Invalid Response', function () {
    var clock, jio;
    expect(2);
    clock = sinon.useFakeTimers();
    jio = new JIO({
      "type": "fake",
      "id": "1 Invalid Re"
    }, {
      "workspace": {}
    });

    jio.post({}).always(function (answer) {
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "New document id have to be specified",
        "reason": "invalid response",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "Invalid Post Response");
    });
    clock.tick(1);
    fakestorage['1 Invalid Re/post'].success();
    clock.tick(1);

    jio = new JIO({
      "type": "fake",
      "id": "2 Invalid Re"
    }, {
      "workspace": {}
    });

    jio.post({}).always(function (answer) {
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "Unknown status \"undefined\"",
        "reason": "invalid response",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "Invalid Post Error Response");
    });
    clock.tick(1);
    fakestorage['2 Invalid Re/post'].error();
    clock.tick(1);
  });

  /**
   * Tests valid responses
   */
  test('Valid Responses & Callbacks', function () {
    var clock, jio, o = {};
    expect(7);
    clock = sinon.useFakeTimers();

    jio = new JIO({
      "type": "fake",
      "id": "Valid Resp"
    }, {
      "workspace": {}
    });

    // Tests post command callbacks post(metadata).always(onResponse) +
    // valid response.
    o.message = "Post Command: post(metadata).always(function (answer) {..}) " +
      "+ valid response.";
    jio.post({}).always(function (answer) {
      deepEqual(answer, {
        "ok": true,
        "id": "document id a",
        "status": 201,
        "statusText": "Created"
      }, o.message);
    });
    clock.tick(1);
    fakestorage['Valid Resp/post'].success({"id": "document id a"});
    clock.tick(1);

    // Tests post command callbacks post(metadata).done(onSuccess).fail(onError)
    o.message = "Post Command: post(metadata).done(function (answer) {..})." +
      "fail(function (answer) {..})";
    jio.post({}).done(function (answer) {
      deepEqual(answer, {
        "ok": true,
        "id": "document id a",
        "status": 201,
        "statusText": "Created"
      }, o.message);
    }).fail(function (answer) {
      deepEqual(answer, "Should not fail", o.message);
    });
    clock.tick(1);
    fakestorage['Valid Resp/post'].success({"id": "document id a"});
    clock.tick(1);

    // Tests post command callbacks post(metadata, onResponse)
    o.message = "Post Command: post(metadata, function (err, response) {..})";
    jio.post({}, function (err, response) {
      if (err) {
        return deepEqual(err, "Should not fail", o.message);
      }
      deepEqual(response, {
        "ok": true,
        "id": "document id a",
        "status": 201,
        "statusText": "Created"
      }, o.message);
    });
    clock.tick(1);
    fakestorage['Valid Resp/post'].success({"id": "document id a"});
    clock.tick(1);

    // Tests post command callbacks post(metadata, onSuccess, onError) + error
    // response.
    o.message = "Post Command: post(metadata, function (response) {..}, " +
      "function (err) {..}) + valid error response.";

    jio.post({}, function (response) {
      deepEqual(response, "Should fail", o.message);
    }, function (err) {
      deepEqual(err, {
        "status": 409,
        "statusText": "Conflict",
        "error": "conflict",
        "reason": "unknown",
        "message": ""
      }, o.message);
    });
    clock.tick(1);
    fakestorage['Valid Resp/post'].error('conflict');
    clock.tick(1);

    // Tests getAttachment command string response
    jio.getAttachment({"_id": "a", "_attachment": "b"}).
      always(function (answer) {
        ok(answer instanceof Blob, "Get Attachment Command: Blob returned");
      });
    clock.tick(1);
    fakestorage['Valid Resp/getAttachment'].success("document id a");
    clock.tick(1);

    // Tests notify responses
    o.notified = true;
    o.message = "Synchronous Notify";
    jio.post({}).progress(function (answer) {
      deepEqual(answer, o.answer, o.message);
    });
    clock.tick(1);
    o.answer = undefined;
    fakestorage['Valid Resp/post'].notify();
    o.answer = 'hoo';
    fakestorage['Valid Resp/post'].notify(o.answer);
    o.answer = 'Forbidden!!!';
    o.message = 'Notification forbidden after success';
    setTimeout(fakestorage['Valid Resp/post'].notify, 2);
    fakestorage['Valid Resp/post'].success();
    clock.tick(2);

  });

  /**
   * Tests metadata values
   */
  test('Metadata values', function () {
    expect(9);
    var o, clock = sinon.useFakeTimers(), jio = new JIO({
      "type": "fake",
      "id": "Metadata v"
    }, {
      "workspace": {}
    });

    o = {};

    o.request = {
      "_id": undefined,
      "number": -13,
      "date": new Date(0),
      "boolean": true,
      "array": ['a'],
      "long_array": ['a', 'b'],
      "object": {'content': 'c'},
      "long_object": {'content': 'd', "scheme": "e"},
      "toJSON": {toJSON: function () {
        return 'hey!';
      }},
      "null": null,
      "undefined": undefined,
      "invalid_date": new Date('aoeuh'),
      "not_finite": Infinity,
      "empty_array": [],
      "empty_object": {},
      "no_content_object": {"e": "f"},
      "wrong_array": [{}, null, {"blue": "green"}]
    };

    o.response = {
      "number": -13,
      "date": new Date(0).toJSON(),
      "boolean": true,
      "array": "a",
      "long_array": ["a", "b"],
      "object": "c",
      "long_object": {"content": "d", "scheme": "e"},
      "toJSON": "hey!"
    };

    jio.post(o.request);
    clock.tick(1);
    deepEqual(
      fakestorage["Metadata v/post"].param,
      o.response,
      "Post"
    );
    fakestorage["Metadata v/post"].success();
    clock.tick(1);

    o.request._id = 'a';
    o.response._id = 'a';
    jio.put(o.request);
    clock.tick(1);
    deepEqual(fakestorage["Metadata v/put"].param, o.response, "Put");
    fakestorage["Metadata v/put"].success();
    clock.tick(1);

    jio.get({
      "_id": "a"
    });
    clock.tick(1);
    deepEqual(fakestorage["Metadata v/get"].param, {
      "_id": "a"
    }, "Get");
    fakestorage["Metadata v/get"].success();
    clock.tick(1);

    jio.remove({
      "_id": "a"
    });
    clock.tick(1);
    deepEqual(fakestorage["Metadata v/remove"].param, {
      "_id": "a"
    }, "Remove");
    fakestorage["Metadata v/remove"].success();
    clock.tick(1);

    jio.allDocs();
    clock.tick(1);
    deepEqual(fakestorage["Metadata v/allDocs"].param, {}, "AllDocs");
    fakestorage["Metadata v/allDocs"].success();
    clock.tick(1);

    o.request = {
      "_id": "a",
      "_attachment": "body",
      "_data": "b",
      "_mimetype": "c"
    };
    jio.putAttachment(o.request);
    clock.tick(1);
    ok(fakestorage["Metadata v/putAttachment"].param._blob instanceof Blob,
       "Put Attachment + check blob");
    deepEqual([
      fakestorage["Metadata v/putAttachment"].param._id,
      fakestorage["Metadata v/putAttachment"].param._attachment
    ], ["a", "body"], "Put Attachment + check ids");
    fakestorage["Metadata v/putAttachment"].success();
    clock.tick(1);

    o.request._blob = new Blob(['d'], {"type": "e"});
    delete o.request._mimetype;
    delete o.request._data;
    jio.putAttachment(o.request);
    clock.tick(1);
    ok(fakestorage["Metadata v/putAttachment"].param._blob === o.request._blob,
       "Put Attachment with blob + check blob");
    deepEqual([
      fakestorage["Metadata v/putAttachment"].param._id,
      fakestorage["Metadata v/putAttachment"].param._attachment
    ], ["a", "body"], "Put Attachment with blob + check ids");
    fakestorage["Metadata v/putAttachment"].success();
    clock.tick(1);
  });

  /**
   * Tests job retry
   */
  test("Job Retry", function () {
    var clock, jio, state;
    expect(4);
    clock = sinon.useFakeTimers();

    jio = new JIO({
      "type": "fake",
      "id": "1 Job Retry"
    }, {
      "workspace": {}
    });

    state = "Not called yet";
    jio.get({"_id": "a"}).always(function (answer) {
      state = "Called";
      deepEqual(answer, {
        "error": "internal_server_error",
        "message": "",
        "reason": "unknown",
        "status": 500,
        "statusText": "Internal Server Error"
      }, "Error response");
    });
    clock.tick(1);
    fakestorage['1 Job Retry/get'].retry('internal_server_error');
    clock.tick(1);
    deepEqual(state, "Not called yet", "Check callback state.");

    clock.tick(1999);
    fakestorage['1 Job Retry/get'].retry('internal_server_error');
    clock.tick(1);
    deepEqual(state, "Not called yet", "Check callback state.");

    clock.tick(3999);
    fakestorage['1 Job Retry/get'].retry('internal_server_error');
    clock.tick(1);
    deepEqual(state, "Called", "Check callback state.");
  });

  /**
   * Tests job workspace
   */
  test("Job Workspace", function () {
    var workspace = {}, clock, jio;
    expect(2);

    clock = sinon.useFakeTimers();
    jio = new JIO({
      "type": "fake",
      "id": "1 Job Worksp"
    }, {
      "workspace": workspace
    });

    jio.get({"_id": "a"}, {"max_retry": 2, "timeout": 12});

    deepEqual(workspace, {
      "jio/jobs/{\"id\":\"1 Job Worksp\",\"type\":\"fake\"}": jIO.util.
        uniqueJSONStringify([{
          "kwargs": {"_id": "a"},
          "options": {"max_retry": 2, "timeout": 12},
          "storage_spec": {"type": "fake", "id": "1 Job Worksp"},
          "method": "get",
          "created": new Date(0),
          "tried": 1,
          "state": "running",
          "modified": new Date(0),
          "max_retry": 2,
          "timeout": 12,
          "id": 1
        }])
    }, 'Check workspace');

    clock.tick(1);
    fakestorage["1 Job Worksp/get"].success({"_id": "a", "b": "c"});
    clock.tick(1);

    deepEqual(workspace, {}, 'Check workspace');
  });

}));
