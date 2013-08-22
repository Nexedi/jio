/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global JobQueue, uniqueJSONStringify, deepClone, dictFilter */

/**
 * Manipulates a job queue and is also able to store it in a specific place.
 *
 * @class JobWorkspace
 * @constructor
 * @param  {Workspace} workspace The workspace where to store
 * @param  {JobQueue} job_queue The job queue to use
 * @param  {String} namespace The namespace to use in the workspace
 * @param  {Array} job_keys An array of job keys to store
 */
function JobWorkspace(workspace, job_queue, namespace, job_keys) {
  this._workspace = workspace;
  this._job_queue = job_queue;
  this._namespace = namespace;
  this._job_keys = job_keys;
}

/**
 * Store the job queue into the workspace.
 *
 * @method save
 */
JobWorkspace.prototype.save = function () {
  var i, job_queue = deepClone(this._job_queue._array);
  for (i = 0; i < job_queue.length; i += 1) {
    dictFilter(job_queue[i], this._job_keys);
  }
  if (this._job_queue._array.length === 0) {
    this._workspace.removeItem(this._namespace);
  } else {
    this._workspace.setItem(
      this._namespace,
      uniqueJSONStringify(job_queue)
    );
  }
  return this;
};

/**
 * Loads the job queue from the workspace.
 *
 * @method load
 */
JobWorkspace.prototype.load = function () {
  var job_list;
  try {
    job_list = JSON.parse(this._workspace.getItem(this._namespace));
  } catch (ignore) {}
  if (!Array.isArray(job_list)) {
    job_list = [];
  }
  this._job_queue.clear();
  new JobQueue(job_list).repair();
  this._job_queue.update(job_list);
  return this;
};

/**
 * Returns the array version of the job queue
 *
 * @method asArray
 * @return {Array} The job queue as array
 */
JobWorkspace.prototype.asArray = function () {
  return this._job_queue._array;
};

/**
 * Post a job in the job queue
 *
 * @method post
 * @param  {Object} job The job object
 * @return {Number} The generated id
 */
JobWorkspace.prototype.post = function (job) {
  return this._job_queue.post(job);
};

/**
 * Put a job to the job queue
 *
 * @method put
 * @param  {Object} job The job object with an id
 */
JobWorkspace.prototype.put = function (job) {
  return this._job_queue.put(job);
};

/**
 * Get a job from an id. Returns undefined if not found
 *
 * @method get
 * @param  {Number} id The job id
 * @return {Object} The job or undefined
 */
JobWorkspace.prototype.get = function (id) {
  return this._job_queue.get(id);
};

/**
 * Removes a job from an id
 *
 * @method remove
 * @param  {Number} id The job id
 */
JobWorkspace.prototype.remove = function (id) {
  return this._job_queue.remove(id);
};
