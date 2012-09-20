var storage = function(spec, my) {
    var that = {};
    spec = spec || {};
    my = my || {};
    // Attributes //
    var priv = {};
    priv.type = spec.type || '';

    // Methods //
    Object.defineProperty(that,"getType",{
        configurable:false,enumerable:false,writable:false,value:
        function() {
            return priv.type;
        }
    });

    /**
     * Execute the command on this storage.
     * @method execute
     * @param  {object} command The command
     */
    that.execute = function(command) {
        that.success = command.success;
        that.error   = command.error;
        that.retry   = command.retry;
        that.end     = command.end;
        if (that.validate(command)) {
            command.executeOn(that);
        }
    };

    /**
     * Override this function to validate specifications.
     * @method isValid
     * @return {boolean} true if ok, else false.
     */
    that.isValid = function() {
        return true;
    };

    that.validate = function () {
        var mess = that.validateState();
        if (mess) {
            that.error({
                status:0,statusText:'Invalid Storage',
                error:'invalid_storage',
                message:mess,reason:mess
            });
            return false;
        }
        return true;
    };

    /**
     * Returns a serialized version of this storage.
     * @method serialized
     * @return {object} The serialized storage.
     */
    that.serialized = function() {
        return {type:that.getType()};
    };

    that.saveDocument    = function(command) {
        that.error({status:0,statusText:'Unknown storage',
                    error:'unknown_storage',message:'Unknown Storage'});
    };
    that.loadDocument    = function(command) {
        that.saveDocument();
    };
    that.removeDocument  = function(command) {
        that.saveDocument();
    };
    that.getDocumentList = function(command) {
        that.saveDocument();
    };

    /**
     * Validate the storage state. It returns a empty string all is ok.
     * @method validateState
     * @return {string} empty: ok, else error message.
     */
    that.validateState = function() {
        return '';
    };

    that.success = function() {};
    that.retry   = function() {};
    that.error   = function() {};
    that.end     = function() {};  // terminate the current job.

    priv.newCommand = function (method, spec) {
        var o = spec || {};
        o.label = method;
        return command (o, my);
    };

    that.addJob = function (method,storage_spec,doc,option,success,error) {
        var command_opt = {
            options: option,
            callbacks:{success:success,error:error}
        };
        if (doc) {
            if (method === 'get') {
                command_opt.docid = doc;
            } else {
                command_opt.doc = doc;
            }
        }
        jobManager.addJob (
            job({
                storage:my.storage(storage_spec||{}),
                command:priv.newCommand(method,command_opt)
            }, my)
        );
    };

    return that;
};
