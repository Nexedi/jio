/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global exports, defaults */

function Storage() { // (storage_spec, util)
  return undefined; // this is a constructor
}
// end Storage

function createStorage(storage_spec, util) {
  if (typeof storage_spec.type !== 'string') {
    throw new TypeError("Invalid storage description");
  }
  if (!defaults.storage_types[storage_spec.type]) {
    throw new TypeError("Unknown storage '" + storage_spec.type + "'");
  }
  return new defaults.storage_types[storage_spec.type](storage_spec, util);
}

function addStorage(type, Constructor) {
  // var proto = {};
  if (typeof type !== 'string') {
    throw new TypeError("jIO.addStorage(): Argument 1 is not of type 'string'");
  }
  if (typeof Constructor !== 'function') {
    throw new TypeError("jIO.addStorage(): " +
                        "Argument 2 is not of type 'function'");
  }
  if (defaults.storage_types[type]) {
    throw new TypeError("jIO.addStorage(): Storage type already exists");
  }
  // dictUpdate(proto, Constructor.prototype);
  // inherits(Constructor, Storage);
  // dictUpdate(Constructor.prototype, proto);
  defaults.storage_types[type] = Constructor;
}
exports.addStorage = addStorage;
