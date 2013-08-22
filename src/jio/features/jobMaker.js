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

  // listeners

  shared.rest_method_names.forEach(function (method) {
    shared.on(method, function (param) {
      if (param.deferred) {
        // params are good
        param.created = new Date();
        param.tried = 0;
        param.state = 'ready';
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
        param.modified = new Date();
        shared.emit('job', param);
      }
    });
  });

}
