var _postCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    var priv = {};

    // Methods //
    that.getLabel = function() {
        return '_post';
    };

    that.executeOn = function(storage) {
        storage._post (that);
    };

    return that;
};
