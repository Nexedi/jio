var _removeCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function() {
        return '_remove';
    };

    that.executeOn = function(storage) {
        storage._remove (that);
    };

    return that;
};
