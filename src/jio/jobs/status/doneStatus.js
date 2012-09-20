var doneStatus = function(spec, my) {
    var that = jobStatus(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function() {
        return 'done';
    };

    that.canStart = function() {
        return false;
    };
    that.canRestart = function() {
        return false;
    };

    that.isDone = function() {
        return true;
    };
    return that;
};
