/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global jobStatus: true */
var onGoingStatus = function (spec, my) {
  var that = jobStatus(spec, my);
  spec = spec || {};
  my = my || {};
  // Attributes //
  // Methods //
  that.getLabel = function () {
    return 'on going';
  };

  that.canStart = function () {
    return false;
  };
  that.canRestart = function () {
    return false;
  };
  return that;
};
