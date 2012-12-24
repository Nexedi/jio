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
    that.super_serialized = function() {
        var o = that.serialized() || {};
        o["type"] = that.getType();
        return o;
    };

    /**
     * Returns a serialized version of this storage.
     * Override this method!
     * @method serialized
     * @return {object} The serialized version of this storage
     */
    that.serialized = function () {
        return {};
    }

    /**
     * Validate the storage state. It returns a empty string all is ok.
     * @method validateState
     * @return {string} empty: ok, else error message.
     */
    that.validateState = function() {
        return '';
    };

    that.post = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet","\"Post\" command is not implemented"
            ));
        });
    };

    that.put = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet","\"Put\" command is not implemented"
            ));
        });
    };

    that.putAttachment = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet",
                "\"PutAttachment\" command is not implemented"
            ));
        });
    };

    that.get = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet","\"Get\" command is not implemented"
            ));
        });
    };

    that.allDocs = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet",
                "\"AllDocs\" command is not implemented"
            ));
        });
    };

    that.remove = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet",
                "\"Remove\" command is not implemented"
            ));
        });
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
