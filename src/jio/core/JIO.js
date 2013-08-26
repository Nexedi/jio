/*jslint indent: 2, maxlen: 80, nomen: true, sloppy: true */
/*global EventEmitter, deepClone, inherits, exports */
/*global enableRestAPI, enableRestParamChecker, enableJobMaker, enableJobRetry,
  enableJobChecker, enableJobQueue, enableJobRecovery, enableJobTimeout,
  enableJobExecuter */

function JIO(storage_spec, options) {
  JIO.super_.call(this);
  var shared = new EventEmitter();

  shared.storage_spec = deepClone(storage_spec);

  if (options === undefined) {
    options = {};
  } else if (typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError("JIO(): Optional argument 2 is not of type 'object'");
  }

  enableRestAPI(this, shared, options);
  enableRestParamChecker(this, shared, options);
  enableJobMaker(this, shared, options);
  enableJobReference(this, shared, options);
  enableJobRetry(this, shared, options);
  enableJobChecker(this, shared, options);
  enableJobQueue(this, shared, options);
  enableJobRecovery(this, shared, options);
  enableJobTimeout(this, shared, options);
  enableJobExecuter(this, shared, options);

  shared.emit('load');
}
inherits(JIO, EventEmitter);

JIO.createInstance = function (storage_spec, options) {
  return new JIO(storage_spec, options);
};

exports.JIO = JIO;

exports.createJIO = JIO.createInstance;
