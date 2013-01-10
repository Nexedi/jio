/*jslint indent: 2, maxlen: 80, sloppy: true */
var jobIdHandler = (function (spec) {
  var that = {},
    id = 0;
  spec = spec || {};

  // Methods //
  that.nextId = function () {
    id = id + 1;
    return id;
  };

  return that;
}());
