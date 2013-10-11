/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global arrayExtend, localStorage, Workspace, uniqueJSONStringify, JobQueue,
  constants, indexOf, setTimeout, clearTimeout */

function enableJobQueue(jio, shared, options) {

  // dependencies
  // - shared.storage_spec Object

  // uses
  // - options.workspace Workspace
  // - shared.job_keys String Array

  // creates
  // - shared.storage_spec_str String
  // - shared.workspace Workspace
  // - shared.job_queue JobQueue

  // uses 'job:new', 'job:started', 'job:stopped', 'job:modified',
  // 'job:notified', 'job:end' events

  // emits 'job:end' event

  function postJobIfReady(param) {
    if (!param.stored && param.state === 'ready') {
      clearTimeout(param.queue_ident);
      delete param.queue_ident;
      shared.job_queue.load();
      shared.job_queue.post(param);
      shared.job_queue.save();
      param.stored = true;
    }
  }

  function deferredPutJob(param) {
    if (param.queue_ident === undefined) {
      param.queue_ident = setTimeout(function () {
        delete param.queue_ident;
        if (param.stored) {
          shared.job_queue.load();
          shared.job_queue.put(param);
          shared.job_queue.save();
        }
      });
    }
  }

  function removeJob(param) {
    clearTimeout(param.queue_ident);
    delete param.queue_ident;
    if (param.stored) {
      shared.job_queue.load();
      shared.job_queue.remove(param.id);
      shared.job_queue.save();
      delete param.stored;
      delete param.id;
    }
  }

  function initJob(param) {
    if (!param.command.end) {
      param.command.end = function () {
        shared.emit('job:end', param);
      };
    }
  }

  shared.on('job:new', initJob);

  if (options.job_management !== false) {

    shared.job_keys = arrayExtend(shared.job_keys || [], ["id"]);

    if (typeof options.workspace !== 'object') {
      shared.workspace = localStorage;
    } else {
      shared.workspace = new Workspace(options.workspace);
    }

    if (!shared.storage_spec_str) {
      shared.storage_spec_str = uniqueJSONStringify(shared.storage_spec);
    }

    shared.job_queue = new JobQueue(
      shared.workspace,
      'jio/jobs/' + shared.storage_spec_str,
      shared.job_keys
    );

    // Listeners

    shared.on('job:new', postJobIfReady);

    shared.on('job:started', deferredPutJob);
    shared.on('job:stopped', deferredPutJob);
    shared.on('job:modified', deferredPutJob);
    shared.on('job:notified', deferredPutJob);

    shared.on('job:end', removeJob);

  }

}
