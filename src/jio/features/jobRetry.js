/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global arrayExtend, setTimeout, methodType, min, constants */

function enableJobRetry(jio, shared, options) {

  // dependencies
  // - param.method
  // - param.storage_spec
  // - param.kwargs
  // - param.options
  // - param.command

  // uses
  // - options.default_writers_max_retry number >= 0 or null
  // - options.default_readers_max_retry number >= 0 or null
  // - options.default_max_retry number >= 0 or null
  // - options.writers_max_retry number >= 0 or null
  // - options.readers_max_retry number >= 0 or null
  // - options.max_retry number >= 0 or null
  // - param.modified date
  // - param.tried number >= 0
  // - param.max_retry >= 0 or undefined
  // - param.state string 'ready' 'waiting'
  // - param.method string
  // - param.storage_spec object
  // - param.kwargs object
  // - param.options object
  // - param.command object

  // uses 'job:new' and 'job:retry' events
  // emits action 'job:start' event
  // emits 'job:retry', 'job:reject', 'job:modified' and 'job:stopped' events

  shared.job_keys = arrayExtend(shared.job_keys || [], ["max_retry"]);

  var writers_max_retry, readers_max_retry, max_retry;

  function defaultMaxRetry(param) {
    if (methodType(param.method) === 'writers') {
      if (max_retry === undefined) {
        return writers_max_retry;
      }
      return max_retry;
    }
    if (max_retry === undefined) {
      return readers_max_retry;
    }
    return max_retry;
  }

  function positiveNumberOrDefault(number, default_value) {
    return (typeof number === 'number' &&
            number >= 0 ?
            number : default_value);
  }

  function positiveNumberNullOrDefault(number, default_value) {
    return ((typeof number === 'number' &&
            number >= 0) || number === null ?
            number : default_value);
  }

  max_retry = positiveNumberNullOrDefault(
    options.max_retry || options.default_max_retry,
    undefined
  );
  writers_max_retry = positiveNumberNullOrDefault(
    options.writers_max_retry || options.default_writers_max_retry,
    null
  );
  readers_max_retry = positiveNumberNullOrDefault(
    options.readers_max_retry || options.default_readers_max_retry,
    2
  );

  function initJob(param) {
    if (typeof param.max_retry !== 'number' || param.max_retry < 0) {
      param.max_retry = positiveNumberOrDefault(
        param.options.max_retry,
        defaultMaxRetry(param)
      );
    }
    param.command.reject = function (status) {
      if (constants.http_action[status || 0] === "retry") {
        shared.emit('job:retry', param, arguments);
      } else {
        shared.emit('job:reject', param, arguments);
      }
    };
    param.command.retry = function () {
      shared.emit('job:retry', param, arguments);
    };
  }

  function retryIfRunning(param, args) {
    if (param.state === 'running') {
      if (param.max_retry === undefined ||
          param.max_retry === null ||
          param.max_retry >= param.tried) {
        param.state = 'waiting';
        param.modified = new Date();
        shared.emit('job:modified', param);
        shared.emit('job:stopped', param);
        setTimeout(function () {
          param.state = 'ready';
          param.modified = new Date();
          shared.emit('job:modified', param);
          shared.emit('job:start', param);
        }, min(10000, param.tried * 2000));
      } else {
        shared.emit('job:reject', param, args);
      }
    }
  }

  // listeners

  shared.on('job:new', initJob);

  shared.on('job:retry', retryIfRunning);
}
