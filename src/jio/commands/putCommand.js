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

    that.validateState = function () {
        if (!(typeof that.getDocId() === "string" && that.getDocId() !== "")) {
            that.error({
                "status": 20,
                "statusText": "Document Id Required",
                "error": "document_id_required",
                "message": "The document id is not provided",
                "reason": "Document id is undefined"
            });
            return false;
        }
        if (typeof that.getAttachmentId() !== "undefined") {
            that.error({
                "status": 21,
                "statusText": "Invalid Document Id",
                "error": "invalid_document_id",
                "message": "The document id contains '/' characters "+
                    "which are forbidden",
                "reason": "Document id contains '/' character(s)"
            });
            return false;
        }
        return true;
    };

    that.executeOn = function(storage) {
        storage.put (that);
    };

    return that;
};
