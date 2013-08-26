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
        var res = command.success.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
        return res;
      },
      error: function () {
        var res = command.error.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
        return res;
      },
      retry: function () {
        var res = command.retry.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
        return res;
      },
      notify: function () {
        return command.notify.apply(command, arguments);
      },
      storage: function () {
        return command.storage.apply(command, arguments);
      },
      end: function () {
        return command.end.apply(command, arguments);
      },
      commit: function () {
        return command.commit.apply(command, arguments);
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
   * Tests job management
   */
  test("Job Management", function () {
    var workspace = {}, clock, jio, o = {};
    expect(8);

    clock = sinon.useFakeTimers();
    jio = new JIO({
      "type": "fake",
      "id": "1 Job Manage"
    }, {
      "workspace": workspace
    });

    // Launch a get command, check the workspace and then respond
    jio.get({"_id": "a"}, {"max_retry": 2, "timeout": 12}).
      always(function (answer) {
        deepEqual(answer, {
          "_id": "a",
          "b": "c",
          "ok": true,
          "status": 200,
          "statusText": "Ok"
        }, "Job respond");
      });
    o.job1 = {
      "kwargs": {"_id": "a"},
      "options": {"max_retry": 2, "timeout": 12},
      "storage_spec": {"type": "fake", "id": "1 Job Manage"},
      "method": "get",
      "created": new Date(),
      "tried": 1,
      "state": "running",
      "modified": new Date(),
      "max_retry": 2,
      "timeout": 12,
      "id": 1
    };
    deepEqual(workspace, {
      "jio/jobs/{\"id\":\"1 Job Manage\",\"type\":\"fake\"}": jIO.util.
        uniqueJSONStringify([o.job1])
    }, 'Job added, workspace have one job');

    clock.tick(1); // now: 1 ms
    fakestorage["1 Job Manage/get"].success({"_id": "a", "b": "c"});
    clock.tick(1); // now: 2 ms

    deepEqual(workspace, {}, 'Job ended, empty workspace');

    // Launch a get command which launches another get command
    // check workspace after every command and respond
    jio.get({"_id": "b"}, {"max_retry": 2, "timeout": 12}).
      always(function (answer) {
        deepEqual(answer, {
          "_id": "b",
          "c": "d",
          "ok": true,
          "status": 200,
          "statusText": "Ok"
        }, "First job respond");
      });
    o.job1.kwargs._id = 'b';
    o.job1.created = new Date();
    o.job1.modified = new Date();
    clock.tick(1); // now: 3 ms
    fakestorage["1 Job Manage/get"].storage({
      "type": "fake",
      "id": "2 Job Manage"
    }).get({"_id": "c"}).always(function (answer) {
      deepEqual(answer, {
        "_id": "c",
        "d": "e",
        "ok": true,
        "status": 200,
        "statusText": "Ok"
      }, "Second job respond");
    });

    o.job2 = {
      "kwargs": {"_id": "c"},
      "options": {},
      "storage_spec": {"type": "fake", "id": "2 Job Manage"},
      "method": "get",
      "created": new Date(),
      "tried": 1,
      "state": "running",
      "modified": new Date(),
      "max_retry": 3,
      "timeout": 10000,
      "id": 2
    };
    deepEqual(workspace, {
      "jio/jobs/{\"id\":\"1 Job Manage\",\"type\":\"fake\"}": jIO.util.
        uniqueJSONStringify([o.job1, o.job2])
    }, 'Job calls another job, workspace have two jobs');

    clock.tick(1);
    fakestorage['1 Job Manage/get'].end();
    deepEqual(workspace, {
      "jio/jobs/{\"id\":\"1 Job Manage\",\"type\":\"fake\"}": jIO.util.
        uniqueJSONStringify([o.job2])
    }, 'First Job ended, second still there');

    fakestorage['1 Job Manage/get'].success({"_id": "b", "c": "d"});
    fakestorage['2 Job Manage/get'].success({"_id": "c", "d": "e"});

    deepEqual(workspace, {}, 'No more job in the queue');

    clock.tick(1); // success 1 and 2
  });

  /**
   * Test job recovery
   */
  test('Job Recovery', function () {
    expect(4);
    var workspace, clock, jio;

    clock = sinon.useFakeTimers();

    //////////////////////////////
    // Running job recovery

    workspace = {};
    // create instance
    jio = new JIO({
      "type": "fake",
      "id": "Job Recove"
    }, {
      "workspace": workspace
    });

    // create a job
    jio.post({});
    // copy workspace when job is running
    workspace = jIO.util.deepClone(workspace);
    clock.tick(1); // now: 1 ms
    fakestorage['Job Recove/post'].success({"id": "a"});

    // create instance with copied workspace
    jio = new JIO({
      "type": "fake",
      "id": "Job Recove"
    }, {
      "workspace": workspace
    });

    clock.tick(19998); // now: 19999 ms
    if (fakestorage['Job Recove/post']) {
      ok(false, "Command called, job recovered to earlier");
    }
    clock.tick(1); // now: 20000 ms
    if (!fakestorage['Job Recove/post']) {
      ok(false, "Command not called, job recovery failed");
    } else {
      ok(true, "Command called, job recovery ok");
    }
    fakestorage['Job Recove/post'].success({"id": "a"});
    clock.tick(1); // now: 20001 ms

    deepEqual(workspace, {}, 'No more job in the queue');
    clock.tick(79999); // now: 100000 ms

    //////////////////////////////
    // Waiting for time job recovery

    workspace = {};
    // create instance
    jio = new JIO({
      "type": "fake",
      "id": "Job Recove"
    }, {
      "workspace": workspace
    });

    // create a job
    jio.post({});
    clock.tick(1); // now: 1 ms
    // copy workspace when job is waiting
    fakestorage['Job Recove/post'].retry();
    workspace = jIO.util.deepClone(workspace);
    clock.tick(2000); // now: 2001 ms
    fakestorage['Job Recove/post'].success({"id": "a"});

    // create instance with copied workspace
    jio = new JIO({
      "type": "fake",
      "id": "Job Recove"
    }, {
      "workspace": workspace
    });

    clock.tick(17999); // now: 20000 ms
    if (fakestorage['Job Recove/post']) {
      ok(false, "Command called, job recovered to earlier");
    }
    clock.tick(1); // now: 20001 ms
    if (!fakestorage['Job Recove/post']) {
      ok(false, "Command not called, job recovery failed");
    } else {
      ok(true, "Command called, job recovery ok");
    }
    fakestorage['Job Recove/post'].success({"id": "a"});
    clock.tick(1); // now: 20002 ms

    deepEqual(workspace, {}, 'No more job in the queue');
    clock.tick(79998); // now: 100000 ms

    //////////////////////////////
    // XXX Waiting for jobs job recovery

  });

  test('Job Update', function () {
    expect(4);
    var clock, jio, o = {};
    clock = sinon.useFakeTimers();

    jio = new JIO({
      "type": "fake",
      "id": "Job Update"
    }, {
      "workspace": {}
    });

    jio.put({"_id": "a"}).always(function (answer) {
      deepEqual(answer, {
        "id": "a",
        "ok": true,
        "status": 200,
        "statusText": "Ok"
      }, "First put respond");
    });

    clock.tick(1);
    o.first_put_command = fakestorage["Job Update/put"];
    ok(o.first_put_command, "First command called");
    o.first_put_command.free();

    jio.put({"_id": "a"}).always(function (answer) {
      deepEqual(answer, {
        "id": "a",
        "ok": true,
        "status": 200,
        "statusText": "Ok"
      }, "Second put respond");
    });

    clock.tick(1);
    ok(fakestorage['Job Update/put'] === undefined,
       'Second command not called');
    o.first_put_command.success();
    clock.tick(1);

  });

  test('Job Wait', function () {
    expect(5);
    var clock, jio, o = {};
    clock = sinon.useFakeTimers();

    jio = new JIO({
      "type": "fake",
      "id": "Job Wait"
    }, {
      "workspace": {}
    });

    jio.put({"_id": "a"}).always(function (answer) {
      deepEqual(answer, {
        "id": "a",
        "ok": true,
        "status": 200,
        "statusText": "Ok"
      }, "First put respond");
    });

    clock.tick(1);
    o.first_put_command = fakestorage["Job Wait/put"];
    ok(o.first_put_command, "First command called");
    o.first_put_command.free();

    jio.put({"_id": "a", "a": "b"}).always(function (answer) {
      deepEqual(answer, {
        "id": "a",
        "ok": true,
        "status": 200,
        "statusText": "Ok"
      }, "Second put respond");
    });

    clock.tick(1);
    ok(fakestorage['Job Wait/put'] === undefined,
       'Second command not called yet');
    o.first_put_command.success();
    clock.tick(1);
    ok(fakestorage['Job Wait/put'], 'Second command called');
    fakestorage['Job Wait/put'].success();
    clock.tick(1);

  });

}));
