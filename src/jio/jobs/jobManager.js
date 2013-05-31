/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global localstorage: true, setInterval: true, clearInterval: true,
 command: true, job: true, jobRules: true */
var jobManager = (function (spec) {
  var that = {},
    job_array_name = 'jio/job_array',
    priv = {};

  spec = spec || {};
  // Attributes //
  priv.id = spec.id;
  priv.interval_id = null;
  priv.interval = 200;
  priv.job_array = [];

  // Methods //
  /**
  * Get the job array name in the localStorage
  * @method getJobArrayName
  * @return {string} The job array name
  */
  priv.getJobArrayName = function () {
    return job_array_name + '/' + priv.id;
  };

  /**
  * Returns the job array from the localStorage
  * @method getJobArray
  * @return {array} The job array.
  */
  priv.getJobArray = function () {
    return localstorage.getItem(priv.getJobArrayName()) || [];
  };

  /**
  * Does a backup of the job array in the localStorage.
  * @method copyJobArrayToLocal
  */
  priv.copyJobArrayToLocal = function () {
    var new_a = [],
      i;
    for (i = 0; i < priv.job_array.length; i += 1) {
      new_a.push(priv.job_array[i].serialized());
    }
    localstorage.setItem(priv.getJobArrayName(), new_a);
  };

  /**
  * Removes a job from the current job array.
  * @method removeJob
  * @param  {object} job The job object.
  */
  priv.removeJob = function (job) {
    var i,
      tmp_job_array = [];
    for (i = 0; i < priv.job_array.length; i += 1) {
      if (priv.job_array[i] !== job) {
        tmp_job_array.push(priv.job_array[i]);
      }
    }
    priv.job_array = tmp_job_array;
    priv.copyJobArrayToLocal();
  };

  /**
  * Sets the job manager id.
  * @method setId
  * @param  {number} id The id.
  */
  that.setId = function (id) {
    priv.id = id;
  };

  /**
  * Starts listening to the job array, executing them regulary.
  * @method start
  */
  that.start = function () {
    var i;
    if (priv.interval_id === null) {
      priv.interval_id = setInterval(function () {
        priv.restoreOldJio();
        for (i = 0; i < priv.job_array.length; i += 1) {
          that.execute(priv.job_array[i]);
        }
      }, priv.interval);
    }
  };

  /**
  * Stops listening to the job array.
  * @method stop
  */
  that.stop = function () {
    if (priv.interval_id !== null) {
      clearInterval(priv.interval_id);
      priv.interval_id = null;
      if (priv.job_array.length === 0) {
        localstorage.removeItem(priv.getJobArrayName());
      }
    }
  };

  /**
  * Try to restore an the inactive older jio instances.
  * It will restore the on going or initial jobs from their job array
  * and it will add them to this job array.
  * @method restoreOldJio
  */
  priv.restoreOldJio = function () {
    var i,
      jio_id_a;
    priv.lastrestore = priv.lastrestore || 0;
    if (priv.lastrestore > (Date.now()) - 2000) {
      return;
    }
    jio_id_a = localstorage.getItem('jio/id_array') || [];
    for (i = 0; i < jio_id_a.length; i += 1) {
      priv.restoreOldJioId(jio_id_a[i]);
    }
    priv.lastrestore = Date.now();
  };

  /**
  * Try to restore an old jio according to an id.
  * @method restoreOldJioId
  * @param  {number} id The jio id.
  */
  priv.restoreOldJioId = function (id) {
    var jio_date;
    jio_date = localstorage.getItem('jio/id/' + id) || 0;
    if (new Date(jio_date).getTime() < (Date.now() - 10000)) { // 10 sec
      priv.restoreOldJobFromJioId(id);
      priv.removeOldJioId(id);
      priv.removeJobArrayFromJioId(id);
    }
  };

  /**
  * Try to restore all jobs from another jio according to an id.
  * @method restoreOldJobFromJioId
  * @param  {number} id The jio id.
  */
  priv.restoreOldJobFromJioId = function (id) {
    var i,
      command_object,
      jio_job_array;
    jio_job_array = localstorage.getItem('jio/job_array/' + id) || [];
    for (i = 0; i < jio_job_array.length; i += 1) {
      command_object = command(jio_job_array[i].command);
      if (command_object.canBeRestored()) {
        that.addJob(job({
          storage: that.storage(jio_job_array[i].storage),
          command: command_object
        }));
      }
    }
  };
  /**
  * Removes a jio instance according to an id.
  * @method removeOldJioId
  * @param  {number} id The jio id.
  */
  priv.removeOldJioId = function (id) {
    var i,
      jio_id_array,
      new_array = [];
    jio_id_array = localstorage.getItem('jio/id_array') || [];
    for (i = 0; i < jio_id_array.length; i += 1) {
      if (jio_id_array[i] !== id) {
        new_array.push(jio_id_array[i]);
      }
    }
    localstorage.setItem('jio/id_array', new_array);
    localstorage.removeItem('jio/id/' + id);
  };
  /**
  * Removes a job array from a jio instance according to an id.
  * @method removeJobArrayFromJioId
  * @param  {number} id The jio id.
  */
  priv.removeJobArrayFromJioId = function (id) {
    localstorage.removeItem('jio/job_array/' + id);
  };
  /**
  * Executes a job.
  * @method execute
  * @param  {object} job The job object.
  */
  that.execute = function (job) {
    try {
      job.execute();
    } catch (e) {
      switch (e.name) {
      case 'jobNotReadyException':
        break; // do nothing
      case 'tooMuchTriesJobException':
        break; // do nothing
      default:
        throw e;
      }
    }
    priv.copyJobArrayToLocal();
  };
  /**
  * Checks if a job exists in the job array according to a job id.
  * @method jobIdExists
  * @param  {number} id The job id.
  * @return {boolean} true if exists, else false.
  */
  that.jobIdExists = function (id) {
    var i;
    for (i = 0; i < priv.job_array.length; i += 1) {
      if (priv.job_array[i].getId() === id) {
        return true;
      }
    }
    return false;
  };
  /**
  * Terminate a job. It only remove it from the job array.
  * @method terminateJob
  * @param  {object} job The job object
  */
  that.terminateJob = function (job) {
    priv.removeJob(job);
  };
  /**
  * Adds a job to the current job array.
  * @method addJob
  * @param  {object} job The new job.
  */
  that.addJob = function (job) {
    var result_array = that.validateJobAccordingToJobList(priv.job_array, job);
    priv.appendJob(job, result_array);
  };
  /**
  * Generate a result array containing action string to do with the good job.
  * @method validateJobAccordingToJobList
  * @param  {array} job_array A job array.
  * @param  {object} job The new job to compare with.
  * @return {array} A result array.
  */
  that.validateJobAccordingToJobList = function (job_array, job) {
    var i,
      result_array = [];
    for (i = 0; i < job_array.length; i += 1) {
      result_array.push(jobRules.validateJobAccordingToJob(job_array[i], job));
    }
    return result_array;
  };
  /**
  * It will manage the job in order to know what to do thanks to a result
  * array. The new job can be added to the job array, but it can also be
  * not accepted. It is this method which can tells jobs to wait for another
  * one, to replace one or to eliminate some while browsing.
  * @method appendJob
  * @param  {object} job The job to append.
  * @param  {array} result_array The result array.
  */
  priv.appendJob = function (job, result_array) {
    var i;
    if (priv.job_array.length !== result_array.length) {
      throw new RangeError("Array out of bound");
    }
    for (i = 0; i < result_array.length; i += 1) {
      if (result_array[i].action === 'dont accept') {
        return job.notAccepted();
      }
    }
    for (i = 0; i < result_array.length; i += 1) {
      switch (result_array[i].action) {
      case 'eliminate':
        result_array[i].job.eliminated();
        priv.removeJob(result_array[i].job);
        break;
      case 'update':
        result_array[i].job.update(job);
        priv.copyJobArrayToLocal();
        return;
      case 'wait':
        job.waitForJob(result_array[i].job);
        break;
      default:
        break;
      }
    }
    priv.job_array.push(job);
    priv.copyJobArrayToLocal();
  };
  that.serialized = function () {
    var a = [],
      i,
      job_array = priv.job_array || [];
    for (i = 0; i < job_array.length; i += 1) {
      a.push(job_array[i].serialized());
    }
    return a;
  };
  return that;
}());
