var initialStatus = function(spec, my) {
    var that = jobStatus(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function() {
        return 'initial';
    };

    that.canStart = function() {
        return true;
    };
    that.canRestart = function() {
        return true;
    };
    return that;
};