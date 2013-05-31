/*jslint indent:2, maxlen: 80, sloppy: true */
var jioException = function (spec, my) {
  var that = {};
  spec = spec || {};
  my = my || {};
  that.name = 'jioException';
  that.message = spec.message || 'Unknown Reason.';
  that.toString = function () {
    return that.name + ': ' + that.message;
  };
  return that;
};

var invalidCommandState = function (spec, my) {
  var that = jioException(spec, my), command = spec.command;
  spec = spec || {};
  that.name = 'invalidCommandState';
  that.toString = function () {
    return that.name + ': ' +
      command.getLabel() + ', ' + that.message;
  };
  return that;
};

var invalidStorage = function (spec, my) {
  var that = jioException(spec, my), type = spec.storage.getType();
  spec = spec || {};
  that.name = 'invalidStorage';
  that.toString = function () {
    return that.name + ': ' +
      'Type "' + type + '", ' + that.message;
  };
  return that;
};

var invalidStorageType = function (spec, my) {
  var that = jioException(spec, my), type = spec.type;
  that.name = 'invalidStorageType';
  that.toString = function () {
    return that.name + ': ' +
      type + ', ' + that.message;
  };
  return that;
};

var jobNotReadyException = function (spec, my) {
  var that = jioException(spec, my);
  that.name = 'jobNotReadyException';
  return that;
};

var tooMuchTriesJobException = function (spec, my) {
  var that = jioException(spec, my);
  that.name = 'tooMuchTriesJobException';
  return that;
};

var invalidJobException = function (spec, my) {
  var that = jioException(spec, my);
  that.name = 'invalidJobException';
  return that;
};
