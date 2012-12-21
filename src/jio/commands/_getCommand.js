var _getCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function() {
        return '_get';
    };

    that.validateState = function() {
        if (!that.getDocId()) {
            that.error({
                status:20,statusText:'Document Id Required',
                error:'document_id_required',
                message:'No document id.',reason:'no document id'
            });
            return false;
        }
        return true;
    };

    that.executeOn = function(storage) {
        storage._get (that);
    };

    that.canBeRestored = function() {
        return false;
    };

    return that;
};
