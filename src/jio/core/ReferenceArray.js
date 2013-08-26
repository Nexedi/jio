/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global */

/**
 * An array that contain object (or array) references.
 *
 * @class ReferenceArray
 * @constructor
 * @param  {array} [array] The array where to work on
 */
function ReferenceArray(array) {
  if (Array.isArray(array)) {
    this._array = array;
  } else {
    this._array = [];
  }
}

/**
 * Returns the array version of the job queue
 *
 * @method asArray
 * @return {Array} The job queue as array
 */
ReferenceArray.prototype.asArray = function () {
  return this._array;
};

/**
 * Returns the index of the object
 *
 * @method indexOf
 * @param  {Object} object The object to search
 */
ReferenceArray.prototype.indexOf = function (object) {
  var i;
  for (i = 0; i < this._array.length; i += 1) {
    if (this._array[i] === object) {
      return i;
    }
  }
  return -1;
};

/**
 * Put an object to the list. If an object already exists, do nothing.
 *
 * @method put
 * @param  {Object} object The object to add
 */
ReferenceArray.prototype.put = function (object) {
  var i;
  for (i = 0; i < this._array.length; i += 1) {
    if (this._array[i] === object) {
      return false;
    }
  }
  this._array[i] = object;
  return true;
};

/**
 * Removes an object from the list
 *
 * @method remove
 * @param  {Object} object The object to remove
 */
ReferenceArray.prototype.remove = function (object) {
  var i;
  for (i = 0; i < this._array.length; i += 1) {
    if (this._array[i] === object) {
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
ReferenceArray.prototype.clear = function () {
  this._array.length = 0;
  return this;
};
