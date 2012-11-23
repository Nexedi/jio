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

    /**
     * Validates the storage handler.
     * @param  {object} handler The storage handler
     */
    that.validate = function () {
        return that.validateState();
    };

    that.executeOn = function(storage) {
        storage.put (that);
    };

    return that;
};
