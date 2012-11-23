var putAttachmentCommand = function(spec, my) {
    var that = command(spec, my);
    spec = spec || {};
    my = my || {};
    // Attributes //
    // Methods //
    that.getLabel = function () {
        return 'putAttachment';
    };

    that.executeOn = function (storage) {
        storage.putAttachment (that);
    };

    that.validateState = function () {
        if (typeof that.getContent() !== 'string') {
            that.error({
                status:22,statusText:'Content Required',
                error:'content_required',
                message:'No data to put.',reason:'no data to put'
            });
            return false;
        }
        return true;
    };

    return that;
};
