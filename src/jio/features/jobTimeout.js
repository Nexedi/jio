/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global arrayExtend, setTimeout, clearTimeout */

function enableJobTimeout(jio, shared, options) {

  // dependencies
  // - param.tried number > 0
  // - param.state string 'running'

  // uses
  // - param.tried number > 0
  // - param.timeout number >= 0
  // - param.timeout_ident Timeout
  // - param.state string 'running'

  // uses 'job:new', 'job:stopped', 'job:started',
  // 'job:notified' and 'job:end' events
  // emits 'job:modified' event

  shared.job_keys = arrayExtend(shared.job_keys || [], ["timeout"]);

  function positiveNumberOrDefault(number, default_value) {
    return (typeof number === 'number' &&
            number >= 0 ?
            number : default_value);
  }

  // 10 seconds by default
  var default_timeout = positiveNumberOrDefault(options.default_timeout, 10000);

  function timeoutReject(param) {
    return function () {
      param.command.reject(
        'request_timeout',
        'timeout',
        'Operation canceled after around ' + (
          Date.now() - param.modified.getTime()
        ) + ' milliseconds of inactivity.'
      );
    };
  }

  function initJob(job) {
    if (typeof job.timeout !== 'number' || job.timeout < 0) {
      job.timeout = positiveNumberOrDefault(
        job.options.timeout,
        default_timeout
      );
    }
    job.modified = new Date();
    shared.emit('job:modified', job);
  }

  function clearJobTimeout(job) {
    clearTimeout(job.timeout_ident);
    delete job.timeout_ident;
  }

  function restartJobTimeoutIfRunning(job) {
    clearTimeout(job.timeout_ident);
    if (job.state === 'running' && job.timeout > 0) {
      job.timeout_ident = setTimeout(timeoutReject(job), job.timeout);
      job.modified = new Date();
    } else {
      delete job.timeout_ident;
    }
  }

  // listeners

  shared.on('job:new', initJob);

  shared.on("job:stopped", clearJobTimeout);
  shared.on("job:end", clearJobTimeout);

  shared.on("job:started", restartJobTimeoutIfRunning);
  shared.on("job:notified", restartJobTimeoutIfRunning);
}
