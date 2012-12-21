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
     * Generates a hash code of a string
     * @method hashCode
     * @param  {string} string The string to hash
     * @return {string} The string hash code
     */
    that.hashCode = function (string) {
        return hex_sha256(string);
    };

    /**
     * Generates the next revision of [previous_revision]. [string] helps us
     * to generate a hash code.
     * @methode generateNextRev
     * @param  {string} previous_revision The previous revision
     * @param  {string} string String to help generate hash code
     * @return {array} 0:The next revision number and 1:the hash code
     */
    that.generateNextRevision = function (previous_revision, string) {
        return [parseInt(previous_revision.split('-')[0],10)+1,
                utilities.hashCode(previous_revision + string)];
    };

    /**
     * Creates the error object for all errors
     * @method createErrorObject
     * @param  {number} error_code The error code
     * @param  {string} error_name The error name
     * @param  {string} message The error message
     * @param  {object} error_object The error object (optional)
     * @return {object} Error object
     */
    that.createErrorObject = function (error_code, error_name,
                                       message, error_object) {
        error_object = error_object || {};
        error_okject["status"] = error_code || 0;
        error_object["statusText"] = error_name;
        error_object["error"] = error_name.toLowerCase().split(' ').join('_');
        error_object["message"] = error_object["error"] = message;
        return error_object;
    };

    /**
     * Creates an empty document tree
     * @method createDocumentTree
     * @param  {array} children An array of children (optional)
     * @return {object} The new document tree
     */
    that.createDocumentTree = function(children) {
        return {"children":children || []};
    };

    /**
     * Creates a new document tree node
     * @method createDocumentTreeNode
     * @param  {string} revision The node revision
     * @param  {string} status The node status
     * @param  {array} children An array of children (optional)
     * @return {object} The new document tree node
     */
    that.createDocumentTreeNode = function(revision,status,children) {
        return {"rev":revision,"status":status,"children":children || []};
    };

    /**
     * Gets the winner revision from a document tree.
     * The winner is the deeper revision on the left.
     * @method getWinnerRevisionFromDocumentTree
     * @param  {object} document_tree The document tree
     * @return {string} The winner revision
     */
    that.getWinnerRevisionFromDocumentTree = function (document_tree) {
        var i, result, search;
        result = {"deep":-1,"revision":''};
        // search method fills "result" with the winner revision
        search = function (document_tree, deep) {
            var i;
            if (document_tree.children.length === 0) {
                // This node is a leaf
                if (result.deep < deep) {
                    // The leaf is deeper than result
                    result = {"deep":deep,"revision":document_tree.rev};
                }
                return;
            }
            // This node has children
            for (i = 0; i < document_tree.children.length; i += 1) {
                // searching deeper to find the deeper leaf
                search(document_tree.children[i], deep+1);
            }
        };
        search(document_tree, 0);
        return result.rev;
    };

    /**
     * Gets an array of leaves revisions from document tree
     * @method getLeavesFromDocumentTree
     * @param  {object} document_tree The document tree
     * @return {array} The array of leaves revisions
     */
    that.getLeavesFromDocumentTree = function (document_tree) {
        var i, result, search;
        result = [];
        // search method fills [result] with the winner revision
        search = function (document_tree) {
            var i;
            if (document_tree.children.length === 0) {
                // This node is a leaf
                result.push(document_tree.rev);
                return;
            }
            // This node has children
            for (i = 0; i < document_tree.children.length; i += 1) {
                // searching deeper to find the deeper leaf
                search(document_tree.children[i]);
            }
        };
        search(document_tree);
        return result;
    };

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

    that._post = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet","\"Post\" command is not implemented"
            ));
        });
    };

    that._put = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet","\"Put\" command is not implemented"
            ));
        });
    };

    that._get = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet","\"Get\" command is not implemented"
            ));
        });
    };

    that._alldocs = function () {
        setTimeout(function () {
            that.error(that.createErrorObject(
                0,"Not Implemented Yet",
                "\"AllDocs\" command is not implemented"
            ));
        });
    };

    that._remove = function () {
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
