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

  // list of job events:
  // - Job existence -> new, end
  // - Job execution -> started, stopped
  // - Job resolution -> resolved, rejected, notified, cancelled
  // - Job modification -> modified

  // emits actions 'job:resolve', 'job:reject' and 'job:notify'

  // uses `rest method` events
  // emits 'job:new' event

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

  function addCommandToJob(job) {
    job.command = {};
    job.command.resolve = function () {
      shared.emit('job:resolve', job, arguments);
    };
    job.command.success = job.command.resolve;
    job.command.reject = function () {
      shared.emit('job:reject', job, arguments);
    };
    job.command.error = job.command.reject;
    job.command.notify = function () {
      shared.emit('job:notify', job, arguments);
    };
    job.command.storage = function () {
      return shared.createRestApi.apply(null, arguments);
    };
    job.command.setCanceller = function (canceller) {
      job.cancellers["command:canceller"] = canceller;
    };
    job.cancellers = job.cancellers || {};
    job.cancellers["job:canceller"] = function () {
      shared.emit("job:reject", job, ["cancelled"]);
    };
  }

  function createJobFromRest(param) {
    if (param.solver) {
      // rest parameters are good
      shared.emit('job:new', param);
    }
  }

  function initJob(job) {
    job.state = 'ready';
    if (typeof job.tried !== 'number' || !isFinite(job.tried)) {
      job.tried = 0;
    }
    if (!job.created) {
      job.created = new Date();
    }
    addCommandToJob(job);
    job.modified = new Date();
  }

  // listeners

  shared.rest_method_names.forEach(function (method) {
    shared.on(method, createJobFromRest);
  });

  shared.on('job:new', initJob);

}
