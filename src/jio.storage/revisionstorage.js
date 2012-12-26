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
    "use strict";
    var that, priv = {};
    spec = spec || {};
    that = my.basicStorage(spec, my);

    priv.substorage_key = "secondstorage";
    priv.doctree_suffix = ".revision_tree.json";
    priv.substorage = spec[priv.substorage_key];

    that.serialized = function () {
        var o = {};
        o[priv.substorage_key] = priv.substorage;
        return o;
    };

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
     * Add a document revision to the document tree
     * @method postToDocumentTree
     * @param  {object} doctree The document tree object
     * @param  {object} doc The document object
     * @return {array} The added document revs_info
     */
    priv.postToDocumentTree = function (doctree, doc) {
        var i, revs_info, next_rev, next_rev_str, selectNode, selected_node;
        revs_info = [];
        selected_node = doctree;
        selectNode = function (node) {
            var i;
            if (typeof node.rev !== "undefined") {
                // node is not root
                revs_info.unshift({"rev":node.rev,"status":node.status});
            }
            if (node.rev === doc._rev) {
                selected_node = node;
                return "node_selected";
            } else {
                for (i = 0; i < node.children.length; i += 1) {
                    if (selectNode(node.children[i]) === "node_selected") {
                        return "node_selected";
                    }
                    revs_info.shift();
                }
            }
        };
        if (typeof doc._rev === "string") {
            // document has a previous revision
            if (selectNode(selected_node) !== "node_selected") {
                // no node was selected, so add a node with a specific rev
                revs_info.unshift({
                    "rev": doc._rev,
                    "status": "missing"
                });
                selected_node.children.unshift({
                    "rev": doc._rev,
                    "status": "missing",
                    "children": []
                });
                selected_node = selected_node.children[0];
            }
        }
        next_rev = priv.generateNextRevision(
            doc._rev || 0, JSON.stringify(doc) + JSON.stringify(revs_info));
        next_rev_str = next_rev.join("-");
        // don't add if the next rev already exists
        console.log (JSON.stringify (revs_info));
        for (i = 0; i < selected_node.children.length; i += 1) {
            console.log (selected_node.children[i].rev);
            if (selected_node.children[i].rev === next_rev_str) {
                revs_info.unshift({
                    "rev": next_rev_str,
                    "status": "available"
                });
                if (selected_node.children[i].status !== "available") {
                    selected_node.children[i].status = "available";
                }
                return revs_info;
            }
        }
        revs_info.unshift({
            "rev": next_rev.join('-'),
            "status": "available"
        });
        selected_node.children.unshift({
            "rev": next_rev.join('-'),
            "status": "available",
            "children": []
        });
        return revs_info;
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


    /**
     * Post the document metadata and create or update a document tree.
     * Options:
     * - {boolean} keep_revision_history To keep the previous revisions
     *                                   (false by default) (NYI).
     * @method post
     * @param  {object} command The JIO command
     */
    that.post = function (command) {
        var f = {}, doctree, revs_info, doc, docid;
        doc = command.cloneDoc();
        docid = command.getDocId();
        if (typeof doc._rev === "string" &&
            priv.checkRevisionFormat(doc._rev)) {
            that.error({
                "status": 31,
                "statusText": "Wrong Revision Format",
                "error": "wrong_revision_format",
                "message": "The document previous revision does not match "+
                    "[0-9]+-[0-9a-zA-Z]+",
                "reason": "Previous revision is wrong"
            });
            return;
        }
        if (typeof docid !== "string") {
            doc._id = priv.generateUuid();
            docid = doc._id;
        }
        f.getDocumentTree = function () {
            var option = command.cloneOption();
            if (option["max_retry"] === 0) {
                option["max_retry"] = 3;
            }
            that.addJob(
                "get",
                priv.substorage,
                docid+priv.doctree_suffix,
                option,
                function (response) {
                    doctree = response;
                    f.postDocument("put");
                }, function (err) {
                    switch(err.status) {
                    case 404:
                        doctree = priv.createDocumentTree();
                        f.postDocument("post");
                        break;
                    default:
                        err.message = "Cannot get document revision tree";
                        that.error(err);
                        break;
                    }
                }
            );
        };
        f.postDocument = function (doctree_update_method) {
            revs_info = priv.postToDocumentTree(doctree, doc);
            doc._id = docid+"."+revs_info[0].rev;
            that.addJob(
                "post",
                priv.substorage,
                doc,
                command.cloneOption(),
                function (response) {
                    f.sendDocumentTree (doctree_update_method);
                }, function (err) {
                    switch(err.status) {
                    case 409:
                        // file already exists
                        f.sendDocumentTree (doctree_update_method);
                        break;
                    default:
                        err.message = "Cannot upload document".
                        that.error(err);
                        break;
                    }
                }
            );
        };
        f.sendDocumentTree = function (method) {
            doctree._id = docid+priv.doctree_suffix;
            that.addJob(
                method,
                priv.substorage,
                doctree,
                command.cloneOption(),
                function (response) {
                    that.success({
                        "ok":true,
                        "id":docid,
                        "rev":revs_info[0].rev
                    })
                }, function (err) {
                    // xxx do we try to delete the posted document ?
                    err.message = "Cannot save document revision tree";
                    that.error(err);
                }
            );
        };
        f.getDocumentTree();
    };

    return that;
});
