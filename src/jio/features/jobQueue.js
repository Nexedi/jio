/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global arrayExtend, localStorage, Workspace, uniqueJSONStringify, JobQueue,
  JobWorkspace, constants */

function enableJobQueue(jio, shared, options) {

  // dependencies
  // - shared.storage_spec Object

  // uses
  // - options.workspace Workspace
  // - shared.job_keys String Array

  // creates
  // - shared.storage_spec_str String
  // - shared.workspace Workspace
  // - shared.job_queue JobWorkspace

  // uses 'job', 'jobRun', 'jobStop', 'jobEnd' events
  // emits 'jobEnd' events

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

    shared.job_queue = new JobWorkspace(
      shared.workspace,
      new JobQueue([]),
      'jio/jobs/' + shared.storage_spec_str,
      shared.job_keys
    );

    shared.on('job', function (param) {
      if (!param.stored) {
        shared.job_queue.load();
        shared.job_queue.post(param);
        shared.job_queue.save();
        param.stored = true;
      }
    });

    ['jobRun', 'jobStop'].forEach(function (event) {
      shared.on(event, function (param) {
        if (param.stored) {
          shared.job_queue.load();
          if (param.state === 'done' || param.state === 'fail') {
            if (shared.job_queue.remove(param.id)) {
              shared.job_queue.save();
              delete param.storad;
            }
          } else {
            shared.job_queue.put(param);
            shared.job_queue.save();
          }
        }
      });
    });

    shared.on('jobEnd', function (param) {
      if (param.stored) {
        shared.job_queue.load();
        if (shared.job_queue.remove(param.id)) {
          shared.job_queue.save();
        }
      }
    });

  }

  shared.on('job', function (param) {
    if (!param.command.end) {
      param.command.end = function () {
        shared.emit('jobEnd', param);
      };
    }
  });

}
