/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, window, exports, require, jIO, fake_storage, ok, module, test,
  stop, start, deepEqual, FileReader, Blob, setTimeout, clearTimeout,
  localStorage, test_util */

(function (dependencies, factory) {
  "use strict";
  if (typeof define === "function" && define.amd) {
    return define(dependencies, factory);
  }
  if (typeof module === "object" && module !== null &&
      typeof module.exports === "object" && module.exports !== null &&
      typeof require === "function") {
    return factory(dependencies.map(require));
  }
  factory(fake_storage, jIO, test_util);
}([
  'fakestorage',
  'jio',
  'test_util',
  'sinon_qunit'
], function (fake_storage, jIO, util) {
  "use strict";
  var test_name, JIO = jIO.JIO, commands = fake_storage.commands;

  //////////////////////////////////////////////////////////////////////////////
  // Tests

  module('JIO and storages descriptions');

  test('should initialize itself without error', 1, function () {
    var jio = new JIO(undefined, {
      "workspace": {}
    });

    // tests if jio is an object
    ok(typeof jio === 'object', 'instance is an object');
  });

  test_name = 'should return an error when a wrong storage type is given';
  test(test_name, 1, function () {
    var jio = new JIO({
      "type": "blue"
    }, {
      "workspace": {}
    });

    stop();
    jio.post({}).always(function (answer) {
      start();
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "Check if the storage description respects the " +
          "constraints provided by the storage designer. (TypeError: " +
          "Unknown storage 'blue')",
        "method": "post",
        "reason": "invalid description",
        "result": "error",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "Unknown storage error");
    });
  });

  test('should return an error when a description is given', 1, function () {
    var jio = new JIO({
      "type": "fake",
      "id": ""
    }, {
      "workspace": {}
    });

    stop();
    jio.post({}).always(function (answer) {
      start();
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "Check if the storage description respects the " +
          "constraints provided by the storage designer. (TypeError: " +
          "Initialization error: wrong id)",
        "method": "post",
        "reason": "invalid description",
        "result": "error",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "Initialization error");
    });
  });

  module('JIO timeout');

  test('should fail after storage inactivity timeout', 2, function () {
    var i, called = false, jio = new JIO({
      "type": "fake",
      "id": "2 No Respons"
    }, {
      "workspace": {},
      "default_timeout": 10000
    });

    stop();
    jio.post({}).always(function (answer) {
      var message = (answer && answer.message) || "Timeout";
      called = true;
      if (i !== undefined) {
        start();
        clearTimeout(i);
      }
      delete answer.message;
      deepEqual(answer, {
        "error": "request_timeout",
        "method": "post",
        "result": "error",
        "reason": "timeout",
        "status": 408,
        "statusText": "Request Timeout"
      }, message);
    });
    setTimeout(function () {
      commands['2 No Respons/post'].notify();
    }, 5000);

    setTimeout(function () {
      commands['2 No Respons/post'].free();
    }, 6000);

    setTimeout(function () {
      ok(!called, "callback " + (called ? "" : "not") + " called");
    }, 14999);

    i = setTimeout(function () {
      i = undefined;
      start();
      ok(false, "No response");
    }, 16000);

  });

  test('should fail after jio option default timeout', 2, function () {
    var i, called = false, jio = new JIO({
      "type": "fake",
      "id": "3 No Respons"
    }, {
      "workspace": {},
      "default_timeout": 2000
    });

    stop();
    jio.post({}).always(function (answer) {
      var message = (answer && answer.message) || "Timeout";
      called = true;
      if (i !== undefined) {
        start();
        clearTimeout(i);
      }
      delete answer.message;
      deepEqual(answer, {
        "error": "request_timeout",
        "method": "post",
        "result": "error",
        "reason": "timeout",
        "status": 408,
        "statusText": "Request Timeout"
      }, message);
    });

    setTimeout(function () {
      commands['3 No Respons/post'].free();
    }, 100);

    setTimeout(function () {
      ok(!called, "callback " + (called ? "" : "not") + " called");
    }, 1999);

    i = setTimeout(function () {
      i = undefined;
      start();
      ok(false, "No response");
    }, 3000);
  });

  test('should fail after command option timeout', 2, function () {
    var i, called = false, jio = new JIO({
      "type": "fake",
      "id": "4 No Respons"
    }, {
      "workspace": {},
      "default_timeout": 2000
    });

    stop();
    jio.post({}, {"timeout": 3000}).always(function (answer) {
      var message = (answer && answer.message) || "Timeout";
      called = true;
      if (i !== undefined) {
        start();
        clearTimeout(i);
      }
      delete answer.message;
      deepEqual(answer, {
        "error": "request_timeout",
        "method": "post",
        "result": "error",
        "reason": "timeout",
        "status": 408,
        "statusText": "Request Timeout"
      }, message);
    });

    setTimeout(function () {
      commands['4 No Respons/post'].free();
    }, 1000);

    setTimeout(function () {
      ok(!called, "callback " + (called ? "" : "not") + " called");
    }, 2999);

    i = setTimeout(function () {
      i = undefined;
      start();
      ok(false, "No response");
    }, 4000);

  });

  module('JIO responses');

  test('should fail when command succeed with a bad response', 1, function () {
    var jio = new JIO({
      "type": "fake",
      "id": "1 Invalid Re"
    }, {
      "workspace": {}
    });

    stop();
    jio.post({}).always(function (answer) {
      start();
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "New document id have to be specified",
        "method": "post",
        "result": "error",
        "reason": "invalid response",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "response");
    });
    setTimeout(function () {
      commands['1 Invalid Re/post'].success();
    }, 50);
  });

  test('should fail when command end with a bad error', 1, function () {
    var jio = new JIO({
      "type": "fake",
      "id": "2 Invalid Re"
    }, {
      "workspace": {}
    });

    stop();
    jio.post({}).always(function (answer) {
      start();
      deepEqual(answer, {
        "error": "internal_storage_error",
        "message": "Unknown status \"undefined\"",
        "method": "post",
        "reason": "invalid response",
        "result": "error",
        "status": 551,
        "statusText": "Internal Storage Error"
      }, "response");
    });
    setTimeout(function () {
      commands['2 Invalid Re/post'].error();
    }, 50);
  });

  test('should succeed when giving a good `post` response', 1, function () {
    var jio = new JIO({
      "type": "fake",
      "id": "Valid post"
    }, {
      "workspace": {}
    });

    stop();
    jio.post({}).always(function (answer) {
      start();
      deepEqual(answer, {
        "id": "document id a",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "response");
    });
    setTimeout(function () {
      commands['Valid post/post'].success({"id": "document id a"});
    }, 50);
  });

  test('`getAttachment` should respond blob', 2, function () {
    var jio = new JIO({
      "type": "fake",
      "id": "Valid getA"
    }, {
      "workspace": {}
    });

    stop();
    jio.getAttachment({"_id": "a", "_attachment": "b"}).
      always(function (answer) {
        start();
        ok(answer.data instanceof Blob,
           "Get Attachment Command: Blob should be returned");
        delete answer.data;
        deepEqual(JSON.parse(JSON.stringify(answer)), {
          "attachment": "b",
          "id": "a",
          "method": "getAttachment",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        });
      });
    setTimeout(function () {
      commands['Valid getA/getAttachment'].success("ok", {
        "data": "document id a"
      });
    }, 50);
  });

  test('should be notified by the command', 4, function () {
    var i = 0, jio = new JIO({
      "type": "fake",
      "id": "Valid noti"
    }, {
      "workspace": {}
    });

    stop();
    jio.put({"_id": "a"}).then(function () {
      start();
    }, function (answer) {
      start();
      deepEqual(answer, "No error", "should not fail");
    }, function (answer) {
      deepEqual(answer, i, "notified");
      ok(i < 3, (i < 3 ? "" : "not ") + "called before success");
      i += 1;
    });
    setTimeout(function () {
      var notify = commands['Valid noti/put'].notify;
      notify(0);
      notify(1);
      commands['Valid noti/put'].success();
      notify(2);
    }, 50);
  });

  test('should be cancelled', 1, function () {
    var time_array = [], put_promise,
      start = util.starter(1000),
      jio = new JIO({
        "type": "fake",
        "id": "Cancel Err"
      }, {
        "workspace": {}
      });

    stop();
    put_promise = jio.put({"_id": "a"});
    put_promise.then(start, function (answer) {
      time_array.push(answer);
      deepEqual(time_array, ["cancelled", {
        "error": "cancelled",
        "id": "a",
        "message": "Command failed",
        "method": "put",
        "reason": "unknown",
        "result": "error",
        "status": 555,
        "statusText": "Cancelled"
      }]);
      start();
    });
    setTimeout(function () {
      commands['Cancel Err/put'].setCanceller(function () {
        time_array.push("cancelled");
      });
      put_promise.cancel();
    }, 50);
  });

  module('JIO parameters');

  test('should throw error when giving no parameter to `post`', 1, function () {
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
  });

  test_name = 'should not throw error when giving no param to `allDocs`';
  test(test_name, 1, function () {
    var result, jio = new JIO({
      "type": "fake",
      "id": "Good para"
    }, {
      "workspace": {}
    });

    try {
      jio.allDocs(); // allDocs([options], [callbacks]);
      result = "No error thrown";
    } catch (e2) {
      result = e2.name + ": " + e2.message;
    }
    deepEqual(result, "No error thrown", "Good parameter");
  });

  test('metadata values should be formatted on `post`', 1, function () {
    var request, response, jio = new JIO({
      "type": "fake",
      "id": "Metadata v"
    }, {
      "workspace": {}
    });

    request = {
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

    response = {
      "number": -13,
      "date": new Date(0).toJSON(),
      "boolean": true,
      "array": "a",
      "long_array": ["a", "b"],
      "object": "c",
      "long_object": {"content": "d", "scheme": "e"},
      "toJSON": "hey!"
    };

    stop();
    jio.post(request);
    setTimeout(function () {
      start();
      deepEqual(
        commands["Metadata v/post"].param,
        response,
        "Post"
      );
      commands["Metadata v/post"].success();
    }, 50);

    // o.request._id = 'a';
    // o.response._id = 'a';
    // jio.put(o.request);
    // clock.tick(1);
    // deepEqual(commands["Metadata v/put"].param, o.response, "Put");
    // commands["Metadata v/put"].success();
    // clock.tick(1);

    // jio.get({
    //   "_id": "a"
    // });
    // clock.tick(1);
    // deepEqual(commands["Metadata v/get"].param, {
    //   "_id": "a"
    // }, "Get");
    // commands["Metadata v/get"].success();
    // clock.tick(1);

    // jio.remove({
    //   "_id": "a"
    // });
    // clock.tick(1);
    // deepEqual(commands["Metadata v/remove"].param, {
    //   "_id": "a"
    // }, "Remove");
    // commands["Metadata v/remove"].success();
    // clock.tick(1);

  });

  test('data should be converted to blob on `putAttachment`', 3, function () {
    var request, jio = new JIO({
      "type": "fake",
      "id": "Metadata v"
    }, {
      "workspace": {}
    });

    request = {
      "_id": "a",
      "_attachment": "body",
      "_data": "b",
      "_mimetype": "c"
    };

    stop();
    jio.putAttachment(request);
    setTimeout(function () {
      start();
      ok(commands["Metadata v/putAttachment"].param._blob instanceof Blob,
         "param._blob should be a blob");
      deepEqual(
        commands["Metadata v/putAttachment"].param._blob.type,
        "c",
        "param._blob type should be equal to request._mimetype"
      );
      deepEqual([
        commands["Metadata v/putAttachment"].param._id,
        commands["Metadata v/putAttachment"].param._attachment
      ], ["a", "body"], "param._id and param._attachment exist");
      commands["Metadata v/putAttachment"].success();
    }, 50);
  });

  test('blob should be given to param on `putAttachment`', 3, function () {
    var request = {}, jio = new JIO({
      "type": "fake",
      "id": "Metadata 2"
    }, {
      "workspace": {}
    });

    request._id = "a";
    request._attachment = "body";
    request._blob = new Blob(['d'], {"type": "e"});

    stop();
    jio.putAttachment(request);
    setTimeout(function () {
      start();
      ok(commands["Metadata 2/putAttachment"].param._blob === request._blob,
         "param._blob should be the given blob");
      deepEqual(
        commands["Metadata 2/putAttachment"].param._blob.type,
        "e",
        "param._blob type should be equal to request._mimetype"
      );
      deepEqual([
        commands["Metadata 2/putAttachment"].param._id,
        commands["Metadata 2/putAttachment"].param._attachment
      ], ["a", "body"], "param._id and param._attachment exist");
      commands["Metadata 2/putAttachment"].success();
    }, 50);

  });

  test('no param should be given to `allDocs`', 1, function () {
    var jio = new JIO({
      "type": "fake",
      "id": "Metadata v"
    }, {
      "workspace": {}
    });

    stop();
    jio.allDocs();
    setTimeout(function () {
      start();
      deepEqual(commands["Metadata v/allDocs"].param, {}, "No param given");
      commands["Metadata v/allDocs"].success();
    }, 50);

  });

  module('JIO job management');

  test("job should respond 3 retries to return an error", 4, function () {
    var jio, state;
    jio = new JIO({
      "type": "fake",
      "id": "1 Job Retry"
    }, {
      "workspace": {}
    });

    stop();
    state = "Not called yet";
    jio.get({"_id": "a"}).always(function (answer) {
      state = "Called";
      deepEqual(answer, {
        "error": "internal_server_error",
        "id": "a",
        "message": "Command failed",
        "method": "get",
        "reason": "unknown",
        "result": "error",
        "status": 500,
        "statusText": "Internal Server Error"
      }, "Error response");
    });
    setTimeout(function () {
      commands['1 Job Retry/get'].retry('internal_server_error');
    }, 50); // wait 50 ms
    setTimeout(function () {
      deepEqual(state, "Not called yet", "Check callback state.");
    }, 100); // wait 50 ms
    setTimeout(function () {
      commands['1 Job Retry/get'].retry('internal_server_error');
    }, 2150); // wait 2050 ms
    setTimeout(function () {
      deepEqual(state, "Not called yet", "Check callback state.");
    }, 2200); // wait 50 ms
    setTimeout(function () {
      commands['1 Job Retry/get'].retry('internal_server_error');
    }, 6250); // wait 4050 ms
    setTimeout(function () {
      start();
      deepEqual(state, "Called", "Check callback state.");
    }, 6300); // wait 50 ms
  });

  test("Job Management", 8, function () {
    var tmp, workspace = {}, jio, o = {};
    jio = new JIO({
      "type": "fake",
      "id": "1 Job Manage"
    }, {
      "workspace": workspace
    });

    stop();
    // Launch a get command, check the workspace and then respond
    jio.get({"_id": "a"}, {"max_retry": 2, "timeout": 1200}).
      always(function (answer) {
        deepEqual(answer, {
          "id": "a",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok",
          "data": {"b": "c"}
        }, "Job respond");
      });
    o.job1 = {
      "kwargs": {"_id": "a"},
      "options": {"max_retry": 2, "timeout": 1200},
      "storage_spec": {"type": "fake", "id": "1 Job Manage"},
      "method": "get",
      //"created": new Date(),
      "tried": 0, // deferred writing 1
      "state": "ready", // deferred writing "running"
      //"modified": new Date(),
      "max_retry": 2,
      "timeout": 1200,
      "id": 1
    };
    tmp = workspace["jio/jobs/{\"id\":\"1 Job Manage\",\"type\":\"fake\"}"];
    tmp = JSON.parse(tmp);
    delete tmp[0].created;
    delete tmp[0].modified;
    deepEqual(tmp, [o.job1], 'workspace have one job');

    setTimeout(function () {
      commands["1 Job Manage/get"].success({"data": {"b": "c"}});
    }, 100); // wait 100 ms
    setTimeout(function () {
      deepEqual(workspace, {}, 'Job ended, empty workspace');

      // Launch a get command which launches another get command
      // check workspace after every command and respond
      jio.get({"_id": "b"}, {"max_retry": 2, "timeout": 1200}).
        always(function (answer) {
          deepEqual(answer, {
            "id": "b",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok",
            "data": {"c": "d"}
          }, "First job respond");
        });
      o.job1.kwargs._id = 'b';
      // o.job1.created = new Date();
      // o.job1.modified = new Date();
    }, 200); // wait 100 ms
    setTimeout(function () {
      commands["1 Job Manage/get"].storage({
        "type": "fake",
        "id": "2 Job Manage"
      }).get({"_id": "c"}).always(function (answer) {
        start();
        deepEqual(answer, {
          "id": "c",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok",
          "data": {"d": "e"}
        }, "Second job respond");
      });

      o.job1.tried = 1;
      o.job1.state = 'running';

      o.job2 = {
        "kwargs": {"_id": "c"},
        "options": {},
        "storage_spec": {"type": "fake", "id": "2 Job Manage"},
        "method": "get",
        //"created": new Date(),
        "tried": 0, // deferred writing 1
        "state": "ready", // deferred writing "running"
        //"modified": new Date(),
        "max_retry": 2,
        "timeout": 0,
        "id": 2
      };

      tmp = workspace["jio/jobs/{\"id\":\"1 Job Manage\",\"type\":\"fake\"}"];
      tmp = JSON.parse(tmp);
      delete tmp[0].created;
      delete tmp[0].modified;
      delete tmp[1].created;
      delete tmp[1].modified;
      deepEqual(tmp, [
        o.job1,
        o.job2
      ], 'Job calls another job, workspace have two jobs');
    }, 300); // wait 100 ms
    setTimeout(function () {
      commands['1 Job Manage/get'].end();
      tmp = workspace["jio/jobs/{\"id\":\"1 Job Manage\",\"type\":\"fake\"}"];
      tmp = JSON.parse(tmp);
      delete tmp[0].created;
      delete tmp[0].modified;

      o.job2.tried = 1;
      o.job2.state = 'running';

      deepEqual(tmp, [o.job2], 'First Job ended, second still there');

      commands['1 Job Manage/get'].success({"data": {"c": "d"}});
      commands['2 Job Manage/get'].success({"data": {"d": "e"}});

      deepEqual(workspace, {}, 'No more job in the queue');
    }, 400); // wait 100 ms
  });

  test('job state running, job recovery', 2, function () {
    var workspace, jio;

    //////////////////////////////
    // Running job recovery

    workspace = {};
    // create instance
    jio = new JIO({
      "type": "fake",
      "id": "Job Recove"
    }, {
      "workspace": workspace,
      "default_timeout": 10000
    });

    stop();
    // create a job
    jio.post({});
    // copy workspace when job is running
    workspace = jIO.util.deepClone(workspace);
    setTimeout(function () {
      commands['Job Recove/post'].success({"id": "a"});
    }, 50);
    // create instance with copied workspace
    jio = new JIO({
      "type": "fake",
      "id": "Job Recove"
    }, {
      "workspace": workspace,
      "recovery_delay": 10000
    });

    setTimeout(function () {
      if (commands['Job Recove/post']) {
        ok(false, "Command called, job recovered to earlier");
      }
    }, 19999);

    setTimeout(function () {
      if (!commands['Job Recove/post']) {
        ok(false, "Command not called, job recovery failed");
      } else {
        ok(true, "Command called, job recovery ok");
      }
      commands['Job Recove/post'].success({"id": "a"});
    }, 20050);

    setTimeout(function () {
      start();
      deepEqual(workspace, {}, 'No more job in the queue');
    }, 20100);
  });

  test('job state waiting for time, job recovery', 2, function () {
    var workspace, jio;
    //////////////////////////////
    // Waiting for time job recovery

    workspace = {};
    // create instance
    jio = new JIO({
      "type": "fake",
      "id": "Job Recovw"
    }, {
      "workspace": workspace,
      "default_timeout": 10000
    });

    stop();
    // create a job
    jio.post({});
    setTimeout(function () {
      // copy workspace when job is waiting
      commands['Job Recovw/post'].retry();

    }, 50);
    setTimeout(function () {
      workspace = jIO.util.deepClone(workspace);
    }, 100);
    setTimeout(function () {
      commands['Job Recovw/post'].success({"id": "a"});
    }, 2100);

    // create instance with copied workspace
    setTimeout(function () {
      jio = new JIO({
        "type": "fake",
        "id": "Job Recovw"
      }, {
        "workspace": workspace,
        "recovery_delay": 10000
      });

      setTimeout(function () {
        if (commands['Job Recovw/post']) {
          ok(false, "Command called, job recovered to earlier");
        }
      }, 19889); // need to wait around 19900 ms

      setTimeout(function () {
        if (!commands['Job Recovw/post']) {
          ok(false, "Command not called, job recovery failed");
        } else {
          ok(true, "Command called, job recovery ok");
        }
        commands['Job Recovw/post'].success({"id": "a"});
      }, 20050);

      setTimeout(function () {
        start();
        deepEqual(workspace, {}, 'No more job in the queue');
      }, 20100);
    }, 150);

    //////////////////////////////
    // XXX Waiting for jobs job recovery

  });

  test('Job Update', 5, function () {
    var jio, o = {};

    o.workspace = {};
    jio = new JIO({
      "type": "fake",
      "id": "Job Update"
    }, {
      "workspace": o.workspace
    });

    stop();
    jio.put({"_id": "a"}).always(function (answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "First put respond");
    });

    setTimeout(function () {
      o.first_put_command = commands["Job Update/put"];
      ok(o.first_put_command, "First command called");
      o.first_put_command.free();
    }, 50);

    setTimeout(function () {
      jio.put({"_id": "a"}).always(function (answer) {
        deepEqual(answer, {
          "id": "a",
          "method": "put",
          "result": "success",
          "status": 204,
          "statusText": "No Content"
        }, "Second put respond");
      });
    }, 51);

    setTimeout(function () {
      ok(commands['Job Update/put'] === undefined,
         'Second command not called');
      o.first_put_command.success();
    }, 100);

    setTimeout(function () {
      start();
      deepEqual(o.workspace, {}, 'No job in the queue');
    }, 150);

  });

  test('Job Wait', 6, function () {
    var jio, o = {};

    o.workspace = {};
    jio = new JIO({
      "type": "fake",
      "id": "Job Wait"
    }, {
      "workspace": o.workspace
    });

    stop();
    jio.put({"_id": "a"}).always(function (answer) {
      deepEqual(answer, {
        "id": "a",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "First put respond");
    });

    setTimeout(function () {
      o.first_put_command = commands["Job Wait/put"];
      ok(o.first_put_command, "First command called");
      o.first_put_command.free();
    }, 50);

    setTimeout(function () {
      jio.put({"_id": "a", "a": "b"}).always(function (answer) {
        deepEqual(answer, {
          "id": "a",
          "method": "put",
          "result": "success",
          "status": 204,
          "statusText": "No Content"
        }, "Second put respond");
      });
    }, 51);

    setTimeout(function () {
      ok(commands['Job Wait/put'] === undefined,
         'Second command not called yet');
      o.first_put_command.success();
    }, 100);

    setTimeout(function () {
      ok(commands['Job Wait/put'], 'Second command called');
      commands['Job Wait/put'].success();
    }, 150);

    setTimeout(function () {
      start();
      deepEqual(o.workspace, {}, 'No job in the queue');
    }, 200);
  });

  test('Job Deny + Job condition addition', 2, function () {
    var jio, workspace = {};

    jIO.addJobRuleCondition('isGetMethod', function (job) {
      return job.method === 'get';
    });

    jio = new JIO({
      "type": "fake",
      "id": "Job Wait"
    }, {
      "workspace": workspace,
      "job_rules": [{
        "code_name": "get rejecter",
        "single": true,
        "action": "deny",
        "conditions": ["isGetMethod"]
      }]
    });

    stop();
    jio.get({"_id": "a"}).always(function (answer) {
      deepEqual(answer, {
        "error": "precondition_failed",
        "id": "a",
        "message": "Command rejected by the job checker.",
        "method": "get",
        "reason": "command denied",
        "result": "error",
        "status": 412,
        "statusText": "Precondition Failed"
      }, "Get respond");
    });

    setTimeout(function () {
      start();
      deepEqual(workspace, {}, 'No job in the queue');
    }, 50);

  });
}));
