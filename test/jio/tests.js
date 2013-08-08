/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, localStorage, window, test, ok, deepEqual, sinon,
  expect */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports, require('jio'));
  }
  window.jio_tests = {};
  module(window.jio_tests, jIO);
}(['exports', 'jio', 'sinon_qunit'], function (exports, jIO) {
  "use strict";
  var tmp;

  // localStorage cleanup
  for (tmp in localStorage) {
    if (localStorage.hasOwnProperty(tmp)) {
      if (/^jio\//.test(tmp)) {
        localStorage.removeItem(tmp);
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Tools

  function spyJioCallback(result_type, value, message) {
    return function (err, response) {
      var val;
      switch (result_type) {
      case 'value':
        val = err || response;
        break;
      case 'status':
        val = (err || {}).status;
        break;
      case 'jobstatus':
        val = (err ? 'fail' : 'done');
        break;
      default:
        ok(false, "Unknown case " + result_type);
        break;
      }
      deepEqual(val, value, message);
    };
  }
  exports.spyJioCallback = spyJioCallback;

  // XXX docstring
  function isUuid(uuid) {
    var x = "[0-9a-fA-F]";
    if (typeof uuid !== "string") {
      return false;
    }
    return (uuid.match(
      "^" + x + "{8}-" + x + "{4}-" +
        x + "{4}-" + x + "{4}-" + x + "{12}$"
    ) === null ? false : true);
  }
  exports.isUuid = isUuid;

  // XXX docstring
  exports.jsonlocalstorage = {
    clear: function () {
      return localStorage.clear();
    },
    getItem: function (item) {
      var value = localStorage.getItem(item);
      return value === null ? null : JSON.parse(value);
    },
    setItem: function (item, value) {
      return localStorage.setItem(item, JSON.stringify(value));
    },
    removeItem: function (item) {
      return localStorage.removeItem(item);
    }
  };

  function objectifyDocumentArray(array) {
    var obj = {}, k;
    for (k = 0; k < array.length; k += 1) {
      obj[array[k]._id] = array[k];
    }
    return obj;
  }

  function closeAndcleanUpJio(jio) {
    jio.close();
    exports.jsonlocalstorage.removeItem("jio/id/" + jio.getId());
    exports.jsonlocalstorage.removeItem("jio/job_array/" + jio.getId());
  }
  exports.closeAndcleanUpJio = closeAndcleanUpJio;

  function getJioLastJob(jio) {
    return (exports.jsonlocalstorage.getItem(
      "jio/job_array/" + jio.getId()
    ) || [undefined]).pop();
  }

  //////////////////////////////////////////////////////////////////////////////
  // Compatibility

  function ospy(o, result_type, value, message, function_name) {
    function_name = function_name || 'f';
    o[function_name] = function (err, response) {
      var val;
      switch (result_type) {
      case 'value':
        val = err || response;
        break;
      case 'status':
        val = (err || {}).status;
        break;
      case 'jobstatus':
        val = (err ? 'fail' : 'done');
        break;
      default:
        ok(false, "Unknown case " + result_type);
        break;
      }
      deepEqual(val, value, message);
    };
    sinon.spy(o, function_name);
  }
  exports.ospy = ospy;

  function otick(o, a, b) {
    var tick = 10000, function_name = 'f';
    if (typeof a === 'number' && !isNaN(a)) {
      tick = a;
      a = b;
    }
    if (typeof a === 'string') {
      function_name = a;
    }
    o.clock.tick(tick);
    if (!o[function_name].calledOnce) {
      if (o[function_name].called) {
        ok(false, 'too much results');
      } else {
        ok(false, 'no response');
      }
    }
  }
  exports.otick = otick;

  //////////////////////////////////////////////////////////////////////////////
  // Dummy Storage

  // XX docstring
  function dummyStorage(spec, my) {
    var that = my.basicStorage(spec, my);

    that._mode = spec.mode || 'normal';
    that._key = spec.key;
    that._value = spec.value;

    if (that._mode === 'spec error') {
      throw new TypeError(
        "Initialization error set by the storage description."
      );
    }

    that.specToStore = function () {
      return {
        "mode": that._mode,
        "key": that._key,
        "value": that._value
      };
    };

    that.post = function (command) {
      setTimeout(function () {
        var metadata = command.cloneDoc(), options = command.cloneOption();
        if (that._mode === 'no response') {
          return;
        }
        // if (that._mode === 'no response + timeout reset') {
        //   return setTimeout(function () {
        //     command.resetTimeout();
        //   }, that._value);
        // }
        if (that._mode === 'invalid error response') {
          return that.error();
        }
        if (that._mode === 'always fail') {
          return that.error({
            "error": "conflict",
            "message": "",
            "reason": "unknown",
            "status": 409,
            "statusText": "Conflict"
          });
        }
        if (that._mode === 'post response no id') {
          return that.success();
        }
        that.success({"id": "document id a", "ok": true});
      });
    };

    that.put = function (command) {
      setTimeout(function () {
        var metadata = command.cloneDoc(), options = command.cloneOption();
        if (that._mode === 'retry') {
          if (!dummyStorage[that._key]) {
            dummyStorage[that._key] = 0;
          }
          dummyStorage[that._key] += 1;
          if (dummyStorage[that._key] === that._value) {
            return that.success({"id": metadata._id, "ok": true});
          }
          return that.retry();
        }
        that.success({"id": metadata._id, "ok": true});
      });
    };

    that.remove = function (command) {
      setTimeout(function () {
        var metadata = command.cloneDoc(), options = command.cloneOption();
        that.success({"id": metadata._id, "ok": true});
      });
    };

    return that;
  }

  jIO.addStorageType('dummy', dummyStorage);
  exports.dummyStorage = dummyStorage;

  //////////////////////////////////////////////////////////////////////////////
  // Tests

  module("JIO");

  /**
   * Tests the instance initialization
   */
  test('Instanciation', function () {
    expect(1);
    var jio = jIO.newJio(undefined);

    // tests if jio is an object
    ok(typeof jio === 'object', 'Init ok!');

    // checks the workspace
    // XXX nothing to check for the moment, need to be implemented first

    closeAndcleanUpJio(jio);
  });

  module("JIO Dummy Storage");

  // XXX This will be uncommented when given parameters checking will be implem
  // /**
  //  * Tests wrong commands
  //  */
  // test('Wrong parameters', function () {
  //   var result, jio = jIO.newJio({
  //     "type": "dummy",
  //     "mode": "normal"
  //   }, {
  //     "workspace": {}
  //   });

  //   try {
  //     jio.post(); // post(kwargs, [options], [callbacks]);
  //     result = "No error thrown";
  //   } catch (e1) {
  //     result = e1.name + ": " + e1.message;
  //   }
  //   deepEqual(
  //     result,
  //     "TypeError: JIO().post(): Argument 1 is not of type 'object'",
  //     "Wrong parameter"
  //   );

  //   try {
  //     jio.allDocs(); // allDocs([options], [callbacks]);
  //     result = "No error thrown";
  //   } catch (e2) {
  //     result = e2.name + ": " + e2.message;
  //   }
  //   deepEqual(result, "No error thrown", "Good parameter");
  // });

  // XXX this will be uncommented when validateState will be replaced by a
  //     simple `throw` in the storage init
  // /**
  //  * Tests a storage initialization error
  //  */
  // test('Description Error', function () {
  //   var clock, jio;
  //   clock = sinon.useFakeTimers();
  //   jio = jIO.newJio({
  //     "type": "blue"
  //   }, {
  //     "workspace": {}
  //   });

  //   // Tests wrong storage type
  //   jio.post({}).always(function (answer) {
  //     deepEqual(answer, {
  //       "error": "internal_storage_error",
  //       "message": "Check if the storage description respects the " +
  //         "constraints provided by the storage designer. (TypeError: " +
  //         "Unknown storage 'blue')",
  //       "reason": "invalid description",
  //       "status": 551,
  //       "statusText": "Internal Storage Error"
  //     }, "Unknown storage");
  //   });
  //   clock.tick(1);

  //   // Tests wrong storage description
  //   jio = jIO.newJio({
  //     "type": "dummy",
  //     "mode": "spec error"
  //   }, {
  //     "workspace": {}
  //   });

  //   jio.post({}).always(function (answer) {
  //     deepEqual(answer, {
  //       "error": "internal_storage_error",
  //       "message": "Check if the storage description respects the " +
  //         "constraints provided by the storage designer. (TypeError: " +
  //         "Initialization error set by the storage description.)",
  //       "reason": "invalid description",
  //       "status": 551,
  //       "statusText": "Internal Storage Error"
  //     }, "Initialization error");
  //   });
  //   clock.tick(1);
  // });


  // XXX timeout is not implemented yet
  // /**
  //  * Tests a command which does not respond
  //  */
  // test('No Response or Response Timeout', function () {
  //   var clock, jio, state;
  //   expect(5);
  //   clock = sinon.useFakeTimers();
  //   jio = jIO.newJio({
  //     "type": "dummy",
  //     "mode": "no response"
  //   }, {
  //     "workspace": {}
  //   });

  //   // tests with default timeout
  //   jio.post({}).always(function (answer) {
  //     deepEqual(answer, {
  //       "error": "request_timeout",
  //       "message": "Operation canceled after around 10000 milliseconds.",
  //       "reason": "timeout",
  //       "status": 408,
  //       "statusText": "Request Timeout"
  //     }, "Timeout error (default timeout)");
  //   });
  //   clock.tick(10000); // wait 10 seconds

  //   jio = jIO.newJio({
  //     "type": "dummy",
  //     "mode": "no response + timeout reset",
  //     "value": 5000 // reset after 5 seconds
  //   }, {
  //     "workspace": {}
  //   });

  //   // tests with storage timeout extension
  //   state = "Not called yet";
  //   jio.post({}).always(function (answer) {
  //     state = "Called";
  //     deepEqual(answer, {
  //       "error": "request_timeout",
  //       "message": "Operation canceled after around 15000 milliseconds.",
  //       "reason": "timeout",
  //       "status": 408,
  //       "statusText": "Request Timeout"
  //     }, "Timeout error (storage timeout reset)");
  //   });
  //   clock.tick(10000); // wait 10 seconds
  //   deepEqual(state, "Not called yet", "Check callback state.");
  //   clock.tick(5000); // wait 5 seconds

  //   jio = jIO.newJio({
  //     "type": "dummy",
  //     "mode": "no response"
  //   }, {
  //     "workspace": {},
  //     "default_timeout": 2
  //   });

  //   // tests with jio option timeout
  //   jio.post({}).always(function (answer) {
  //     deepEqual(answer, {
  //       "error": "request_timeout",
  //       "message": "Operation canceled after around 2 milliseconds.",
  //       "reason": "timeout",
  //       "status": 408,
  //       "statusText": "Request Timeout"
  //     }, "Timeout error (specific default timeout)");
  //   });
  //   clock.tick(2);

  //   // tests with command option timeout
  //   jio.post({}, {"timeout": 50}).always(function (answer) {
  //     deepEqual(answer, {
  //       "error": "request_timeout",
  //       "message": "Operation canceled after around 50 milliseconds.",
  //       "reason": "timeout",
  //       "status": 408,
  //       "statusText": "Request Timeout"
  //     }, "Timeout error (command timeout)");
  //   });
  //   clock.tick(50);
  // });

  // /**
  //  * Tests wrong responses
  //  */
  // test('Invalid Response', function () {
  //   var clock, jio;
  //   clock = sinon.useFakeTimers();
  //   jio = jIO.newJio({
  //     "type": "dummy",
  //     "mode": "post response no id"
  //   });

  //   jio.post({}, function (err, response) {
  //     deepEqual(err || response, {
  //       "error": "internal_storage_error",
  //       "message": "New document id have to be specified",
  //       "reason": "invalid response",
  //       "status": 551,
  //       "statusText": "Internal Storage Error"
  //     }, "Invalid Post Response");
  //   });
  //   clock.tick(1000);

  //   closeAndcleanUpJio(jio);

  //   jio = jIO.newJio({
  //     "type": "dummy",
  //     "mode": "invalid error response"
  //   });

  //   jio.post({}, function (err, response) {
  //     deepEqual(err || response, {
  //       "error": "internal_storage_error",
  //       "message": "Unknown status \"undefined\"",
  //       "reason": "invalid response",
  //       "status": 551,
  //       "statusText": "Internal Storage Error"
  //     }, "Invalid Post Error Response");
  //   });
  //   clock.tick(1000);

  //   closeAndcleanUpJio(jio);
  // });

  /**
   * Tests a valid responses
   */
  test('Valid Responses & Callbacks', function () {
    expect(4);
    var clock, jio, message;
    clock = sinon.useFakeTimers();

    jio = jIO.newJio({
      "type": "dummy",
      "mode": "normal"
    });

    // Tests post command callbacks post(metadata).always(onResponse) +
    // valid response.
    message = "Post Command: post(metadata).always(function (answer) {..}) + " +
      "valid response.";
    jio.post({}, function (err, response) {
      deepEqual(err || response, {
        "ok": true,
        "id": "document id a"
      }, message);
    });
    clock.tick(1000);

    // Tests post command callbacks post(metadata).done(onSuccess).fail(onError)
    message = "Post Command: post(metadata).done(function (answer) {..})." +
      "fail(function (answer) {..})";
    jio.post({}, function (answer) {
      deepEqual(answer, {
        "ok": true,
        "id": "document id a"
      }, message);
    }, function (answer) {
      deepEqual(answer, "Should not fail", message);
    });
    clock.tick(1000);

    // Tests post command callbacks post(metadata, onResponse)
    message = "Post Command: post(metadata, function (err, response) {..})";
    jio.post({}, function (err, response) {
      if (err) {
        return deepEqual(err, "Should not fail", message);
      }
      deepEqual(response, {
        "ok": true,
        "id": "document id a"
      }, message);
    });
    clock.tick(1000);

    closeAndcleanUpJio(jio);

    // Tests post command callbacks post(metadata, onSuccess, onError) + error
    // response.
    message = "Post Command: post(metadata, function (response) {..}, " +
      "function (err) {..}) + valid error response.";
    jio = jIO.newJio({
      "type": "dummy",
      "mode": "always fail"
    });

    jio.post({}, function (response) {
      deepEqual(response, "Should fail", message);
    }, function (err) {
      deepEqual(err, {
        "status": 409,
        "statusText": "Conflict",
        "error": "conflict",
        "reason": "unknown",
        "message": ""
      }, message);
    });
    clock.tick(1000);

    closeAndcleanUpJio(jio);
  });

  module("JIO Job Management");

  test("Several Jobs at the same time", function () {
    expect(3);
    var clock = sinon.useFakeTimers(), jio = jIO.newJio({"type": "dummy"});

    jio.put({"_id": "file1",  "title": "t1"}, spyJioCallback('value', {
      "ok": true,
      "id": "file1"
    }, "job1"));
    jio.put({"_id": "file2", "title": "t2"}, spyJioCallback('value', {
      "ok": true,
      "id": "file2"
    }, "job2"));
    jio.put({"_id": "file3", "title": "t3"}, spyJioCallback('value', {
      "ok": true,
      "id": "file3"
    }, "job3"));
    clock.tick(1000);

    closeAndcleanUpJio(jio);
  });

  test("Similar Jobs at the same time (Update)", function () {
    expect(8);
    var clock = sinon.useFakeTimers(), jio = jIO.newJio({"type": "dummy"});
    function compareResults(err, response) {
      deepEqual(err || response, {"id": "file", "ok": true}, "job ok");
    }
    jio.put({"_id": "file", "title": "t"}, compareResults);
    jio.put({"_id": "file", "title": "t"}, compareResults);
    jio.put({"_id": "file", "title": "t"}, compareResults);
    deepEqual(getJioLastJob(jio).id, 1, "Check job queue");
    clock.tick(1000);

    jio.put({"_id": "file", "content": "content"}, compareResults);
    jio.remove({"_id": "file", "content": "content"}, compareResults);
    jio.put({"_id": "file", "content": "content"}, compareResults);
    deepEqual(getJioLastJob(jio).id, 5, "Check job queue");
    clock.tick(10000);

    closeAndcleanUpJio(jio);
  });

  test("Same document jobs at the same time (Wait for job(s))", function () {
    expect(6);
    var clock = sinon.useFakeTimers(), jio = jIO.newJio({"type": "dummy"});

    function compareResults(err, response) {
      deepEqual(err || response, {"id": "file", "ok": true}, "job ok");
    }

    jio.put({"_id": "file", "content": "content"}, compareResults);
    deepEqual(
      getJioLastJob(jio).status.waitforjob,
      undefined,
      "Job 1 is not waiting for someone"
    );

    jio.remove({"_id": "file", "content": "content"}, compareResults);
    deepEqual(
      getJioLastJob(jio).status.waitforjob,
      [1],
      "Job 2 is wainting for 1"
    );

    jio.put({"_id": "file"}, compareResults);
    deepEqual(
      getJioLastJob(jio).status.waitforjob,
      [1, 2],
      "Job 3 is waiting for 1 and 2"
    );

    clock.tick(1000);

    closeAndcleanUpJio(jio);
  });

  test("Server will be available soon (Wait for time)", function () {
    expect(2);
    var clock = sinon.useFakeTimers(), jio;
    jio = jIO.newJio({
      "type": "dummy",
      "mode": "retry",
      "key": "035139054",
      "value": 3
    });
    jio.put(
      {"_id": "file", "content": "content"},
      {"max_retry": 3},
      function (err, response) {
        deepEqual(err || response, {"id": "file", "ok": true}, "Job ok");
      }
    );
    clock.tick(2000);

    deepEqual(dummyStorage['035139054'], 3, "tried 3 times");
    delete dummyStorage['035139054'];

    closeAndcleanUpJio(jio);
  });

  test("Restore old Jio", function () {

    var o = {
      clock: sinon.useFakeTimers(),
      spy: ospy,
      tick: otick
    };

    function waitUntilLastJobIs(state) {
      while (true) {
        if (getJioLastJob(o.jio) === undefined) {
          ok(false, "No job have state: " + state);
          break;
        }
        if (getJioLastJob(o.jio).status.label === state) {
          break;
        }
        o.clock.tick(25);
      }
    }

    function waitUntilAJobExists(timeout) {
      var cpt = 0, job = false;
      while (true) {
        if (getJioLastJob(o.jio) !== undefined) {
          job = true;
          break;
        }
        if (cpt >= timeout) {
          break;
        }
        o.clock.tick(25);
        cpt += 25;
      }
      ok(job, "Wait until a job is created");
    }

    o.jio = jIO.newJio({
      "type": "dummy",
      "mode": "retry",
      "key": "12314",
      "value": 3
    });

    o.jio_id = o.jio.getId();

    o.jio.put({"_id": "file", "title": "myFile"}, {"max_retry": 3}, o.f);
    waitUntilLastJobIs("initial"); // "on going" or "wait" should work
    // xxx also test with waitUntilLastJobIs("on going") ?
    o.jio.close();

    o.jio = jIO.newJio({
      "type": "dummy",
      "mode": "retry",
      "key": "12314",
      "value": 3
    });
    waitUntilAJobExists(30000); // timeout 30 sec

    deepEqual(getJioLastJob(o.jio).command.label, 'put', 'Job restored');
    o.clock.tick(2000);
    ok(getJioLastJob(o.jio) === undefined, "Job executed");
    o.clock.tick(1000);

    exports.jsonlocalstorage.removeItem("jio/id/" + o.jio_id);
    exports.jsonlocalstorage.removeItem("jio/job_array/" + o.jio_id);
    closeAndcleanUpJio(o.jio);

  });

}));
