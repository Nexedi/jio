/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global command: true */
var postCommand = function (spec, my) {
  var that = command(spec, my);

  spec = spec || {};
  my = my || {};

  // Methods //
  that.getLabel = function () {
    return 'post';
  };

  that.validateState = function () {
    return true;
  };
  that.executeOn = function (storage) {
    storage.post(that);
  };
  return that;
};
