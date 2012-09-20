var jobStatus = function(spec, my) {
    var that = {};
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function() {
        return 'job status';
    };

    that.canStart = function() {};
    that.canRestart = function() {};

    that.serialized = function() {
        return {label:that.getLabel()};
    };

    that.isWaitStatus = function() {
        return false;
    };

    that.isDone = function() {
        return false;
    };

    return that;
};
