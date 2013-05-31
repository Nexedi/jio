/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global jobStatus: true */
var initialStatus = function (spec, my) {
  var that = jobStatus(spec, my);
  spec = spec || {};
  my = my || {};
  // Attributes //
  // Methods //
  that.getLabel = function () {
    return "initial";
  };

  that.canStart = function () {
    return true;
  };
  that.canRestart = function () {
    return true;
  };
  return that;
};
