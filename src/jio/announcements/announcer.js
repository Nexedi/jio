/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global announcement: true */
var announcer = (function (spec, my) {
  var that = {},
    announcement_o = {};
  spec = spec || {};
  my = my || {};

  // Methods //
  that.register = function (name) {
    if (!announcement_o[name]) {
      announcement_o[name] = announcement();
    }
  };

  that.unregister = function (name) {
    if (announcement_o[name]) {
      delete announcement_o[name];
    }
  };

  that.at = function (name) {
    return announcement_o[name];
  };

  that.on = function (name, callback) {
    that.register(name);
    that.at(name).add(callback);
  };

  that.trigger = function (name, args) {
    that.at(name).trigger(args);
  };

  return that;
}());
