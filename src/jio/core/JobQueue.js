/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global deepClone, dictFilter, uniqueJSONStringify */

/**
 * Tool to manipulate a list of object containing at least one property: 'id'.
 * Id must be a number > 0.
 *
 * @class JobQueue
 * @constructor
 * @param  {Workspace} workspace The workspace where to store
 * @param  {String} namespace The namespace to use in the workspace
 * @param  {Array} job_keys An array of job keys to store
 * @param  {Array} [array] An array of object
 */
function JobQueue(workspace, namespace, job_keys, array) {
  this._workspace = workspace;
  this._namespace = namespace;
  this._job_keys = job_keys;
  if (Array.isArray(array)) {
    this._array = array;
  } else {
    this._array = [];
  }
}

/**
 * Store the job queue into the workspace.
 *
 * @method save
 */
JobQueue.prototype.save = function () {
  var i, job_queue = deepClone(this._array);
  for (i = 0; i < job_queue.length; i += 1) {
    dictFilter(job_queue[i], this._job_keys);
  }
  if (this._array.length === 0) {
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
JobQueue.prototype.load = function () {
  var job_list;
  try {
    job_list = JSON.parse(this._workspace.getItem(this._namespace));
  } catch (ignore) {}
  if (!Array.isArray(job_list)) {
    job_list = [];
  }
  this.clear();
  new JobQueue(job_list).repair();
  this.update(job_list);
  return this;
};

/**
 * Returns the array version of the job queue
 *
 * @method asArray
 * @return {Array} The job queue as array
 */
JobQueue.prototype.asArray = function () {
  return this._array;
};

/**
 * Removes elements which are not objects containing at least 'id' property.
 *
 * @method repair
 */
JobQueue.prototype.repair = function () {
  var i, job;
  for (i = 0; i < this._array.length; i += 1) {
    job = this._array[i];
    if (typeof job !== 'object' || Array.isArray(job) ||
        typeof job.id !== 'number' || job.id <= 0) {
      this._array.splice(i, 1);
      i -= 1;
    }
  }
};

/**
 * Post an object and generate an id
 *
 * @method post
 * @param  {Object} job The job object
 * @return {Number} The generated id
 */
JobQueue.prototype.post = function (job) {
  console.log('jio core');
  console.log(job);
  var i, next = 1;
  // get next id
  for (i = 0; i < this._array.length; i += 1) {
    if (this._array[i].id >= next) {
      next = this._array[i].id + 1;
    }
  }
  job.id = next;
  this._array[this._array.length] = deepClone(job);
  return this;
};

/**
 * Put an object to the list. If an object contains the same id, it is replaced
 * by the new one.
 *
 * @method put
 * @param  {Object} job The job object with an id
 */
JobQueue.prototype.put = function (job) {
  var i;
  if (typeof job.id !== 'number' || job.id <= 0) {
    throw new TypeError("JobQueue().put(): Job id should be a positive number");
  }
  for (i = 0; i < this._array.length; i += 1) {
    if (this._array[i].id === job.id) {
      break;
    }
  }
  this._array[i] = deepClone(job);
  return this;
};

/**
 * Puts some object into the list. Update object with the same id, and add
 * unreferenced one.
 *
 * @method update
 * @param  {Array} job_list A list of new jobs
 */
JobQueue.prototype.update = function (job_list) {
  var i, j = 0, j_max, index = {}, next = 1, job, post_list = [];
  j_max = this._array.length;
  for (i = 0; i < job_list.length; i += 1) {
    if (typeof job_list[i].id !== 'number' || job_list[i].id <= 0) {
      // this job has no id, it has to be post
      post_list[post_list.length] = job_list[i];
    } else {
      job = deepClone(job_list[i]);
      if (index[job.id] !== undefined) {
        // this job is on the list, update
        this._array[index[job.id]] = job;
      } else if (j === j_max) {
        // this job is not on the list, update
        this._array[this._array.length] = job;
      } else {
        // don't if the job is there or not
        // searching same job in the original list
        while (j < j_max) {
          // references visited job
          index[this._array[j].id] = j;
          if (this._array[j].id >= next) {
            next = this._array[j].id + 1;
          }
          if (this._array[j].id === job.id) {
            // found on the list, just update
            this._array[j] = job;
            break;
          }
          j += 1;
        }
        if (j === j_max) {
          // not found on the list, add to the end
          this._array[this._array.length] = job;
        } else {
          // found on the list, already updated
          j += 1;
        }
      }
      if (job.id >= next) {
        next = job.id + 1;
      }
    }
  }
  for (i = 0; i < post_list.length; i += 1) {
    // adding job without id
    post_list[i].id = next;
    next += 1;
    this._array[this._array.length] = deepClone(post_list[i]);
  }
  return this;
};

/**
 * Get an object from an id. Returns undefined if not found
 *
 * @method get
 * @param  {Number} id The job id
 * @return {Object} The job or undefined
 */
JobQueue.prototype.get = function (id) {
  var i;
  for (i = 0; i < this._array.length; i += 1) {
    if (this._array[i].id === id) {
      return deepClone(this._array[i]);
    }
  }
};

/**
 * Removes an object from an id
 *
 * @method remove
 * @param  {Number} id The job id
 */
JobQueue.prototype.remove = function (id) {
  var i;
  for (i = 0; i < this._array.length; i += 1) {
    if (this._array[i].id === id) {
      this._array.splice(i, 1);
      return true;
    }
  }
  return false;
};

/**
 * Clears the list.
 *
 * @method clear
 */
JobQueue.prototype.clear = function () {
  this._array.length = 0;
  return this;
};
