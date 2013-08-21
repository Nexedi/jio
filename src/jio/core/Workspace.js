/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global */

/**
 * A class that acts like localStorage on a simple object.
 *
 * Like localStorage, the object will contain only strings.
 *
 * @class Workspace
 * @constructor
 */
function Workspace(object) {
  this._object = object;
}

// // Too dangerous, never use it
// /**
//  * Empty the entire space.
//  *
//  * @method clear
//  */
// Workspace.prototype.clear = function () {
//   var k;
//   for (k in this._object) {
//     if (this._object.hasOwnProperty(k)) {
//       delete this._object;
//     }
//   }
//   return undefined;
// };

/**
 * Get an item from the space. If the value does not exists, it returns
 * null. Else, it returns the string value.
 *
 * @method getItem
 * @param  {String} key The location where to get the item
 * @return {String} The item
 */
Workspace.prototype.getItem = function (key) {
  return this._object[key] === undefined ? null : this._object[key];
};

/**
 * Set an item into the space. The value to store is converted to string before.
 *
 * @method setItem
 * @param  {String} key The location where to set the item
 * @param  {Any} value The value to store
 */
Workspace.prototype.setItem = function (key, value) {
  if (value === undefined) {
    this._object[key] = 'undefined';
  } else if (value === null) {
    this._object[key] = 'null';
  } else {
    this._object[key] = value.toString();
  }
  return undefined;
};

/**
 * Removes an item from the space.
 *
 * @method removeItem
 * @param  {String} key The location where to remove the item
 */
Workspace.prototype.removeItem = function (key) {
  delete this._object[key];
  return undefined;
};
