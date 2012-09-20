var removeCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function() {
        return 'remove';
    };

    that.executeOn = function(storage) {
        storage.remove (that);
    };

    return that;
};
