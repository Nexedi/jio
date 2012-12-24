var putCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    var priv = {};

    // Methods //
    that.getLabel = function() {
        return 'put';
    };

    that.executeOn = function(storage) {
        storage.put (that);
    };

    return that;
};
