/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global setTimeout, Job, createStorage, deepClone, restCommandResolver,
  restCommandRejecter */

function enableJobExecuter(jio, shared) { // , options) {

  // uses 'job:new' events
  // uses actions 'job:resolve', 'job:reject' and 'job:notify'

  // emits 'job:modified', 'job:started', 'job:resolved',
  // 'job:rejected', 'job:notified' and 'job:end' events
  // emits action 'job:start'

  function startJobIfReady(job) {
    if (job.state === 'ready') {
      shared.emit('job:start', job);
    }
  }

  function executeJobIfReady(param) {
    var storage;
    if (param.state === 'ready') {
      param.tried += 1;
      param.started = new Date();
      param.state = 'running';
      param.modified = new Date();
      shared.emit('job:modified', param);
      shared.emit('job:started', param);
      try {
        storage = createStorage(deepClone(param.storage_spec));
      } catch (e) {
        return param.command.reject(
          'internal_storage_error',
          'invalid description',
          'Check if the storage description respects the ' +
            'constraints provided by the storage designer. (' +
            e.name + ": " + e.message + ')'
        );
      }
      if (typeof storage[param.method] !== 'function') {
        return param.command.reject(
          'not_implemented',
          'method missing',
          'Storage "' + param.storage_spec.type + '", "' +
            param.method + '" method is missing.'
        );
      }
      setTimeout(function () {
        storage[param.method](
          deepClone(param.command),
          deepClone(param.kwargs),
          deepClone(param.options)
        );
      });
    }
  }

  function endAndResolveIfRunning(job, args) {
    if (job.state === 'running') {
      job.state = 'done';
      job.modified = new Date();
      shared.emit('job:modified', job);
      if (job.solver) {
        restCommandResolver(job, args);
      }
      shared.emit('job:resolved', job, args);
      shared.emit('job:end', job);
    }
  }

  function endAndRejectIfRunning(job, args) {
    if (job.state === 'running') {
      job.state = 'fail';
      job.modified = new Date();
      shared.emit('job:modified', job);
      if (job.solver) {
        restCommandRejecter(job, args);
      }
      shared.emit('job:rejected', job, args);
      shared.emit('job:end', job);
    }
  }

  function notifyJobIfRunning(job, args) {
    if (job.state === 'running' && job.solver) {
      job.solver.notify(args[0]);
      shared.emit('job:notified', job, args);
    }
  }

  // listeners

  shared.on('job:new', startJobIfReady);
  shared.on('job:start', executeJobIfReady);

  shared.on('job:resolve', endAndResolveIfRunning);
  shared.on('job:reject', endAndRejectIfRunning);
  shared.on('job:notify', notifyJobIfRunning);
}
