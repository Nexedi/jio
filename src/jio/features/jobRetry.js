/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global arrayExtend, setTimeout, indexOf, min */

function enableJobRetry(jio, shared, options) {

  // dependencies
  // - param.method
  // - param.storage_spec
  // - param.kwargs
  // - param.options
  // - param.command

  // uses
  // - param.modified date
  // - param.tried number >= 0
  // - param.max_retry >= 0 or undefined
  // - param.state string 'ready' 'waiting'
  // - param.method string
  // - param.storage_spec object
  // - param.kwargs object
  // - param.options object
  // - param.command object

  // uses 'job' and 'jobRetry' events
  // emits 'job', 'jobFail' and 'jobStateChange' events
  // job can emit 'jobRetry'

  shared.job_keys = arrayExtend(shared.job_keys || [], ["max_retry"]);

  function defaultMaxRetry(param) {
    if (
      indexOf(param.method, [
        'post',
        'put',
        'remove',
        'putAttachment',
        'removeAttachment',
        'repair'
      ]) !== -1
    ) {
      return 0;
    }
    return 3;
  }

  function positiveNumberOrDefault(number, default_value) {
    return (typeof number === 'number' &&
            number >= 0 ?
            number : default_value);
  }

  // listeners

  shared.on('job', function (param) {
    if (typeof param.max_retry !== 'number' || param.max_retry < 0) {
      param.max_retry = positiveNumberOrDefault(
        param.options.max_retry,
        defaultMaxRetry(param)
      );
    }
    param.command.retry = function () {
      shared.emit('jobRetry', param, arguments);
    };
  });

  shared.on('jobRetry', function (param, args) {
    if (param.state === 'running') {
      if (param.max_retry === undefined ||
          param.max_retry === 0 ||
          param.max_retry > param.tried) {
        param.state = 'waiting';
        param.modified = new Date();
        shared.emit('jobStop', param);
        setTimeout(function () {
          param.state = 'ready';
          param.modified = new Date();
          shared.emit('job', param);
        }, min(10000, param.tried * 2000));
      } else {
        shared.emit('jobFail', param, args);
      }
    }
  });
}
