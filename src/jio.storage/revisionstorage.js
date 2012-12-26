/**
 * JIO Revision Storage.
 * It manages document version and can generate conflicts.
 * Description:
 * {
 *     "type": "revision",
 *     "secondstorage": <sub storage description>
 * }
 */
jIO.addStorageType('revision', function (spec, my) {
    var that, priv = {};
    spec = spec || {};
    that = my.basicStorage(spec, my);

    /**
     * Generate a new uuid
     * @method generateUuid
     * @return {string} The new uuid
     */
    priv.generateUuid = function () {
        var S4 = function () {
            var i, string = Math.floor(
                Math.random() * 0x10000 /* 65536 */
            ).toString(16);
            for (i = string.length; i < 4; i += 1) {
                string = '0'+string;
            }
            return string;
        };
        return S4() + S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + S4() + S4();
    };

    /**
     * Generates a hash code of a string
     * @method hashCode
     * @param  {string} string The string to hash
     * @return {string} The string hash code
     */
    priv.hashCode = function (string) {
        return hex_sha256(string);
    };

    /**
     * Returns an array version of a revision string
     * @method revisionToArray
     * @param  {string} revision The revision string
     * @return {array} Array containing a revision number and a hash
     */
    priv.revisionToArray = function (revision) {
        if (typeof revision === "string") {
            return [parseInt(revision.split('-')[0],10),
                    revision.split('-')[1]]
        }
        return revision;
    };

    /**
     * Generates the next revision of [previous_revision]. [string] helps us
     * to generate a hash code.
     * @methode generateNextRev
     * @param  {string} previous_revision The previous revision
     * @param  {string} string String to help generate hash code
     * @return {array} 0:The next revision number and 1:the hash code
     */
    priv.generateNextRevision = function (previous_revision, string) {
        if (typeof previous_revision === "number") {
            return [previous_revision + 1, priv.hashCode(string)];
        }
        previous_revision = priv.revisionToArray(previous_revision);
        return [previous_revision[0]+1, priv.hashCode(string)];
    };

    /**
     * Checks a revision format
     * @method checkRevisionFormat
     * @param  {string} revision The revision string
     * @return {boolean} True if ok, else false
     */
    priv.checkRevisionFormat = function (revision) {
        return /^[0-9]+-[0-9a-zA-Z]+$/.test(revision);
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
    priv.createErrorObject = function (error_code, error_name,
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
    priv.createDocumentTree = function(children) {
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
    priv.createDocumentTreeNode = function(revision,status,children) {
        return {"rev":revision,"status":status,"children":children || []};
    };

    /**
     * Gets the winner revision from a document tree.
     * The winner is the deeper revision on the left.
     * @method getWinnerRevisionFromDocumentTree
     * @param  {object} document_tree The document tree
     * @return {string} The winner revision
     */
    priv.getWinnerRevisionFromDocumentTree = function (document_tree) {
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
    priv.getLeavesFromDocumentTree = function (document_tree) {
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

    priv.createDocument = function (doc, id, prev_rev) {
        var hash, rev;
        if (typeof prev_rev === "undefined") {
            hash = priv.hashCode(doc);
            doc._rev = "1-"+hash;
            doc._id = id;
            doc._revisions = {
                "start": 1,
                "ids": [hash]
            };
            doc._revs_info = [{
                "rev": "1-"+hash,
                "status": "available"
            }];

            return doc;
        } else {
            // xxx do not hash _key of doc!
            prev_rev = priv.revisionToArray(prev_rev);
            rev = priv.generateNextRevision(prev_rev,doc);
            doc._rev = rev.join('-');
            doc._id = id;
            doc._revisions = {
                "start": rev[0],
                "ids": [rev[1],prev_rev[1]]
            };
            doc._revs_info = [{
                "rev": rev.join('-'),
                "status": "available"
            },{
                "rev": prev_rev.join('-'),
                "status": "missing"
            }];
            return doc;
        }
    };

    return that;
});
