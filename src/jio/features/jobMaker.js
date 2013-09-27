/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global arrayExtend */

function enableJobMaker(jio, shared, options) {

  // dependencies
  // - param.method
  // - param.storage_spec
  // - param.kwargs
  // - param.options

  // uses (Job)
  // - param.created date
  // - param.modified date
  // - param.tried number >= 0
  // - param.state string 'ready'
  // - param.method string
  // - param.storage_spec object
  // - param.kwargs object
  // - param.options object
  // - param.command object

  // uses method events
  // add emits 'job' events

  // the job can emit 'jobDone', 'jobFail' and 'jobNotify'

  shared.job_keys = arrayExtend(shared.job_keys || [], [
    "created",
    "modified",
    "tried",
    "state",
    "method",
    "storage_spec",
    "kwargs",
    "options"
  ]);

  function addCommandToJob(param) {
    param.command = {};
    param.command.resolve = function () {
      shared.emit('jobDone', param, arguments);
    };
    param.command.success = param.command.resolve;
    param.command.reject = function () {
      shared.emit('jobFail', param, arguments);
    };
    param.command.error = param.command.reject;
    param.command.notify = function () {
      shared.emit('jobNotify', param, arguments);
    };
    param.command.storage = function () {
      return shared.createRestApi.apply(null, arguments);
    };
  }

  // listeners

  shared.rest_method_names.forEach(function (method) {
    shared.on(method, function (param) {
      if (param.solver) {
        // params are good
        shared.emit('job', param);
      }
    });
  });

  shared.on('job', function (param) {
    // new or recovered job
    param.state = 'ready';
    if (typeof param.tried !== 'number' || !isFinite(param.tried)) {
      param.tried = 0;
    }
    if (!param.created) {
      param.created = new Date();
    }
    if (!param.command) {
      addCommandToJob(param);
    }
    param.modified = new Date();
  });

}
