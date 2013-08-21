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

  // uses 'job', 'jobDone', 'jobFail', 'jobRetry' and 'jobNotify' events

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

  // listeners

  shared.on('job', function (param) {
    if (typeof param.timeout !== 'number' || param.timeout < 0) {
      param.timeout = positiveNumberOrDefault(
        param.options.timeout,
        default_timeout
      );
    }
    param.modified = new Date();
  });

  ["jobDone", "jobFail", "jobRetry"].forEach(function (event) {
    shared.on(event, function (param) {
      clearTimeout(param.timeout_ident);
      delete param.timeout_ident;
    });
  });

  ["jobRun", "jobNotify", "jobEnd"].forEach(function (event) {
    shared.on(event, function (param) {
      clearTimeout(param.timeout_ident);
      if (param.state === 'running' && param.timeout > 0) {
        param.timeout_ident = setTimeout(timeoutReject(param), param.timeout);
        param.modified = new Date();
      } else {
        delete param.timeout_ident;
      }
    });
  });
}
