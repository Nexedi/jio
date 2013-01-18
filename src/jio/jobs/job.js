/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global jobIdHandler: true, initialStatus: true, invalidJobException: true,
waitStatus: true, failStatus: true, tooMuchTriesJobException: true,
jobManager: true, jobNotReadyException: true, onGoingStatus: true */
var job = function (spec) {
  var that = {},
    priv = {};

  spec = spec || {};

  priv.id = jobIdHandler.nextId();
  priv.command = spec.command;
  priv.storage = spec.storage;
  priv.status = initialStatus();
  priv.date = new Date();

  // Initialize //
  if (!priv.storage) {
    throw invalidJobException({
      job: that,
      message: 'No storage set'
    });
  }
  if (!priv.command) {
    throw invalidJobException({
      job: that,
      message: 'No command set'
    });
  }
  // Methods //
  /**
  * Returns the job command.
  * @method getCommand
  * @return {object} The job command.
  */
  that.getCommand = function () {
    return priv.command;
  };

  that.getStatus = function () {
    return priv.status;
  };

  that.getId = function () {
    return priv.id;
  };

  that.getStorage = function () {
    return priv.storage;
  };

  that.getDate = function () {
    return priv.date;
  };

  /**
  * Checks if the job is ready.
  * @method isReady
  * @return {boolean} true if ready, else false.
  */
  that.isReady = function () {
    if (priv.command.getTried() === 0) {
      return priv.status.canStart();
    }
    return priv.status.canRestart();
  };

  /**
    * Returns a serialized version of this job.
    * @method serialized
    * @return {object} The serialized job.
    */
  that.serialized = function () {
    return {
      id: priv.id,
      date: priv.date.getTime(),
      status: priv.status.serialized(),
      command: priv.command.serialized(),
      storage: priv.storage.serialized()
    };
  };

  /**
  * Tells the job to wait for another one.
  * @method waitForJob
  * @param  {object} job The job to wait for.
  */
  that.waitForJob = function (job) {
    if (priv.status.getLabel() !== 'wait') {
      priv.status = waitStatus({});
    }
    priv.status.waitForJob(job);
  };

  /**
  * Tells the job to do not wait for a job.
  * @method dontWaitForJob
  * @param  {object} job The other job.
  */
  that.dontWaitFor = function (job) {
    if (priv.status.getLabel() === 'wait') {
      priv.status.dontWaitForJob(job);
    }
  };

  /**
  * Tells the job to wait for a while.
  * @method waitForTime
  * @param  {number} ms Time to wait in millisecond.
  */
  that.waitForTime = function (ms) {
    if (priv.status.getLabel() !== 'wait') {
      priv.status = waitStatus({});
    }
    priv.status.waitForTime(ms);
  };

  /**
  * Tells the job to do not wait for a while anymore.
  * @method stopWaitForTime
  */
  that.stopWaitForTime = function () {
    if (priv.status.getLabel() === 'wait') {
      priv.status.stopWaitForTime();
    }
  };

  that.eliminated = function () {
    priv.command.error({
      status: 10,
      statusText: 'Stopped',
      error: 'stopped',
      message: 'This job has been stopped by another one.',
      reason: 'this job has been stopped by another one'
    });
  };

  that.notAccepted = function () {
    priv.command.onEndDo(function () {
      priv.status = failStatus();
      jobManager.terminateJob(that);
    });
    priv.command.error({
      status: 11,
      statusText: 'Not Accepted',
      error: 'not_accepted',
      message: 'This job is already running.',
      reason: 'this job is already running'
    });
  };

  /**
  * Updates the date of the job with the another one.
  * @method update
  * @param  {object} job The other job.
  */
  that.update = function (job) {
    priv.command.error({
      status: 12,
      statusText: 'Replaced',
      error: 'replaced',
      message: 'Job has been replaced by another one.',
      reason: 'job has been replaced by another one'
    });
    priv.date = new Date(job.getDate().getTime());
    priv.command = job.getCommand();
    priv.status = job.getStatus();
  };

  /**
  * Executes this job.
  * @method execute
  */
  that.execute = function () {
    if (!that.getCommand().canBeRetried()) {
      throw tooMuchTriesJobException({
        job: that,
        message: 'The job was invoked too much time.'
      });
    }
    if (!that.isReady()) {
      throw jobNotReadyException({
        job: that,
        message: 'Can not execute this job.'
      });
    }
    priv.status = onGoingStatus();
    priv.command.onRetryDo(function () {
      var ms = priv.command.getTried();
      ms = ms * ms * 200;
      if (ms > 10000) {
        ms = 10000;
      }
      that.waitForTime(ms);
    });
    priv.command.onEndDo(function (status) {
      priv.status = status;
      jobManager.terminateJob(that);
    });
    priv.command.execute(priv.storage);
  };
  return that;
};
