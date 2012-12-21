var _allDocsCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function() {
        return '_allDocs';
    };

    that.executeOn = function(storage) {
        storage._allDocs (that);
    };

    that.canBeRestored = function() {
        return false;
    };

    that.validateState = function () {
        return true;
    };

    return that;
};
