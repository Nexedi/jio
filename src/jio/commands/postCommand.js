var postCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    var priv = {};

    // Methods //
    that.getLabel = function() {
        return 'post';
    };

    that.executeOn = function(storage) {
        storage.post (that);
    };

    return that;
};
