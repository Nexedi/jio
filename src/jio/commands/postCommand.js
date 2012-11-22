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

    /**
     * Validates the storage handler.
     * @param  {object} handler The storage handler
     */
    that.validate = function () {
        if (typeof that.getDocInfo('content') !== 'string') {
            that.error({
                status:21,statusText:'Content Required',
                error:'content_required',
                message:'No data to put.',reason:'no data to put'
            });
            return false;
        }
        return that.validateState();
    };

    that.executeOn = function(storage) {
        storage.post (that);
    };

    return that;
};
