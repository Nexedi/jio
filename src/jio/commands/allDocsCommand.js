var allDocsCommand = function (spec, my) {
  var that = command(spec, my);

  spec = spec || {};
  my = my || {};
  // Attributes //
  // Methods //
  that.getLabel = function () {
    return 'allDocs';
  };

  that.executeOn = function (storage) {
    storage.allDocs(that);
  };

  that.canBeRestored = function () {
    return false;
  };

  that.validateState = function () {
    return true;
  };

  return that;
};