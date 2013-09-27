/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global setTimeout, Job, createStorage, deepClone, min, restCommandResolver,
  restCommandRejecter */

function enableJobExecuter(jio, shared) { // , options) {

  // uses 'job', 'jobDone', 'jobFail' and 'jobNotify' events
  // emits 'jobRun' and 'jobEnd' events

  // listeners

  shared.on('job', function (param) {
    var storage;
    if (param.state === 'ready') {
      param.tried += 1;
      param.started = new Date();
      param.state = 'running';
      param.modified = new Date();
      shared.emit('jobRun', param);
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
  });

  shared.on('jobDone', function (param, args) {
    if (param.state === 'running') {
      param.state = 'done';
      param.modified = new Date();
      shared.emit('jobEnd', param);
      if (param.solver) {
        restCommandResolver(param, args);
      }
    }
  });

  shared.on('jobFail', function (param, args) {
    if (param.state === 'running') {
      param.state = 'fail';
      param.modified = new Date();
      shared.emit('jobEnd', param);
      if (param.solver) {
        restCommandRejecter(param, args);
      }
    }
  });

  shared.on('jobNotify', function (param, args) {
    if (param.state === 'running' && param.solver) {
      param.solver.notify(args[0]);
    }
  });
}
