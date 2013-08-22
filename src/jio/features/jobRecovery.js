/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global setTimeout */

function enableJobRecovery(jio, shared, options) {

  // dependencies
  // - JobQueue enabled and before this

  // uses
  // - shared.job_queue JobWorkspace

  function numberOrDefault(number, default_value) {
    return (typeof number === 'number' &&
            isFinite(number) ? number : default_value);
  }

  function recoverJob(param) {
    shared.job_queue.remove(param.id);
    shared.job_queue.save();
    shared.emit('job', param);
  }

  function jobWaiter(id, modified) {
    return function () {
      var job;
      shared.job_queue.load();
      job = shared.job_queue.get(id);
      if (job.modified === modified) {
        // job not modified, no one takes care of it
        recoverJob(job);
      }
    };
  }

  var i, job_array, delay, deadline, recovery_delay;

  recovery_delay = numberOrDefault(options.recovery_delay, 10000);
  if (recovery_delay < 0) {
    recovery_delay = 10000;
  }

  if (options.job_management !== false && options.job_recovery !== false) {

    shared.job_queue.load();
    job_array = shared.job_queue.asArray();

    for (i = 0; i < job_array.length; i += 1) {
      if (job_array[i].state === 'ready' ||
          job_array[i].state === 'running') {
        delay = numberOrDefault(job_array[i].timeout + recovery_delay,
                                recovery_delay);
        deadline = new Date(job_array[i].modified).getTime() + delay;
        if (!isFinite(delay)) {
          // 'modified' date is broken
          recoverJob(job_array[i]);
        } else if (deadline <= Date.now()) {
          // deadline reached
          recoverJob(job_array[i]);
        } else {
          // deadline not reached yet
          // wait until deadline is reached then check job again
          setTimeout(jobWaiter(job_array[i].id, job_array[i].modified),
                     deadline - Date.now());
        }
      }
    }

  }
}
