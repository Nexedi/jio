/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global announcement: true */
var announcement = function (spec, my) {
  var that = {},
    callback_a = [],
    announcer = spec.announcer || {};

  spec = spec || {};
  my = my || {};

  // Methods //
  that.add = function (callback) {
    callback_a.push(callback);
  };

  that.remove = function (callback) {
    var i, tmp_callback_a = [];
    for (i = 0; i < callback_a.length; i += 1) {
      if (callback_a[i] !== callback) {
        tmp_callback_a.push(callback_a[i]);
      }
    }
    callback_a = tmp_callback_a;
  };

  that.register = function () {
    announcer.register(that);
  };

  that.unregister = function () {
    announcer.unregister(that);
  };

  that.trigger = function (args) {
    var i;
    for (i = 0; i < callback_a.length; i += 1) {
      callback_a[i].apply(null, args);
    }
  };

  return that;
};
