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

    that.specToStore = function () {
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
        return (/^[0-9]+-[0-9a-zA-Z]+$/.test(revision));
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
     * Gets the specific revision from a document tree.
     * @method getRevisionFromDocumentTree
     * @param  {object} document_tree The document tree
     * @param  {string} revision The specific revision
     * @return {array} The good revs info array
     */
    priv.getRevisionFromDocumentTree = function (document_tree, revision) {
        var i, result, search, revs_info = [];
        result = [];
        // search method fills "result" with the good revs info
        search = function (document_tree) {
            var i;
            if (typeof document_tree.rev !== "undefined") {
                // node is not root
                revs_info.unshift({
                    "rev":document_tree.rev,
                    "status":document_tree.status
                });
                if (document_tree.rev === revision) {
                    result = revs_info;
                    return;
                }
            }
            // This node has children
            for (i = 0; i < document_tree.children.length; i += 1) {
                // searching deeper to find the good rev
                search(document_tree.children[i]);
                if (result.length > 0) {
                    // The result is already found
                    return;
                }
                revs_info.shift();
            }
        };
        search(document_tree);
        return result;
    };

    /**
     * Gets the winner revision from a document tree.
     * The winner is the deeper revision on the left.
     * @method getWinnerRevisionFromDocumentTree
     * @param  {object} document_tree The document tree
     * @return {array} The winner revs info array
     */
    priv.getWinnerRevisionFromDocumentTree = function (document_tree) {
        var i, result, search, revs_info = [];
        result = [];
        // search method fills "result" with the winner revs info
        search = function (document_tree, deep) {
            var i;
            if (typeof document_tree.rev !== "undefined") {
                // node is not root
                revs_info.unshift({
                    "rev":document_tree.rev,
                    "status":document_tree.status
                });
            }
            if (document_tree.children.length === 0) {
                // This node is a leaf
                if (result.length < deep) {
                    // The leaf is deeper than result
                    result = [];
                    for (i = 0; i < revs_info.length; i += 1) {
                        result.push(revs_info[i]);
                    }
                }
                return;
            }
            // This node has children
            for (i = 0; i < document_tree.children.length; i += 1) {
                // searching deeper to find the deeper leaf
                search(document_tree.children[i], deep+1);
                revs_info.shift();
            }
        };
        search(document_tree, 0);
        return result;
    };

    /**
     * Add a document revision to the document tree
     * @method postToDocumentTree
     * @param  {object} doctree The document tree object
     * @param  {object} doc The document object
     * @param  {boolean} set_node_to_deleted true/false
     * @return {array} The added document revs_info
     */
    priv.postToDocumentTree = function (doctree, doc, set_node_to_deleted) {
        var i, revs_info, next_rev, next_rev_str, next_rev_status,
            selectNode, selected_node,
            revs_info = [],
            selected_node = doctree;

        if (doc._rev === undefined && priv.missing_revision){
            doc._rev = priv.missing_revision;
        }

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
        next_rev_status = set_node_to_deleted === true ? "deleted" : "available";

        // don't add if the next rev already exists
        for (i = 0; i < selected_node.children.length; i += 1) {
            if (selected_node.children[i].rev === next_rev_str) {
                revs_info.unshift({
                    "rev": next_rev_str,
                    "status": next_rev_status
                });
                if (selected_node.children[i].status !== next_rev_status) {
                    selected_node.children[i].status = next_rev_status;
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
     * @param  {string} except The revision to except
     * @return {array} The array of leaves revisions
     */
    priv.getLeavesFromDocumentTree = function (document_tree, except) {
        var i, result, search;
        result = [];
        // search method fills [result] with the winner revision
        search = function (document_tree) {
            var i;
            if (except !== undefined && except === document_tree.rev) {
                return;
            }
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
     * Check if revision is a leaf
     * @method isRevisionALeaf
     * @param  {string} revision revision to check
     * @param  {array} leaves all leaves on tree
     * @return {boolean} true/false
     */
    priv.isRevisionALeaf = function (revision, leaves) {
        var i;
        for (i = 0; i < leaves.length; i+=1) {
            if (leaves[i] === revision){
                return true;
            }
        }
        return false;
    };

    /**
     * Convert revs_info to a simple revisions history
     * @method revsInfoToHistory
     * @param  {array} revs_info The revs info
     * @return {object} The revisions history
     */
    priv.revsInfoToHistory = function (revs_info) {
        var revisions = {"start":0,"ids":[]}, i;
        if (revs_info.length > 0) {
            revisions.start = parseInt(revs_info[0].rev.split('-')[0],10);
        }
        for (i = 0; i < revs_info.length; i += 1) {
            revisions.ids.push(revs_info[i].rev.split('-')[1]);
        }
        return revisions;
    };

    /**
     * Returns the revision of the revision position from a revs_info array.
     * @method getRevisionFromPosition
     * @param  {array} revs_info The revs_info array
     * @param  {number} rev_pos The revision position number
     * @return {string} The revision of the good position (empty string if fail)
     */
    priv.getRevisionFromPosition = function (revs_info, rev_pos) {
        var i;
        for (i = revs_info.length - 1; i >= 0; i -= 1) {
            if (priv.revisionToArray(revs_info[i].rev)[0] === rev_pos) {
                return revs_info[i].rev;
            }
        }
        return '';
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
            !priv.checkRevisionFormat(doc._rev)) {
            that.error({
                "status": 31,
                "statusText": "Wrong Revision Format",
                "error": "wrong_revision_format",
                "message": "The document previous revision does not match "+
                    "^[0-9]+-[0-9a-zA-Z]+$",
                "reason": "Previous revision is wrong"
            });
            return;
        }
        if (typeof docid !== "string") {
            doc._id = priv.generateUuid();
            docid = doc._id;
        }
        if (priv.update_doctree_allowed === undefined) {
            priv.update_doctree_allowed = true;
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
                    if (priv.update_doctree_allowed) {
                        f.postDocument("put");
                    } else {
                        that.error({
                            "status": 409,
                            "statusText": "Conflict",
                            "error": "conflict",
                            "message": "Cannot update a document",
                            "reason": "Document update conflict"
                        });
                    }
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
                },
                function (err) {
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
                    });
                },
                function (err) {
                    // xxx do we try to delete the posted document ?
                    err.message = "Cannot save document revision tree";
                    that.error(err);
                }
            );
        };
        f.getDocumentTree();
    };

    /**
     * Update the document metadata and update a document tree.
     * Options:
     * - {boolean} keep_revision_history To keep the previous revisions
     *                                   (false by default) (NYI).
     * @method put
     * @param  {object} command The JIO command
     */
    that.put = function (command) {
        if (command.cloneDoc()._rev === undefined) {
            priv.update_doctree_allowed = false;
        }
        that.post(command);
    };

    /**
     * Get the document metadata or attachment.
     * Options:
     * - {boolean} revs Add simple revision history (false by default).
     * - {boolean} revs_info Add revs info (false by default).
     * - {boolean} conflicts Add conflict object (false by default).
     * @method get
     * @param  {object} command The JIO command
     */
    that.get = function (command) {
        var f = {}, doctree, revs_info, prev_rev, option;
        option = command.cloneOption();
        if (option["max_retry"] === 0) {
            option["max_retry"] = 3;
        }
        prev_rev = command.getOption("rev");
        if (typeof prev_rev === "string") {
            if (!priv.checkRevisionFormat(prev_rev)) {
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
        }
        f.getDocumentTree = function () {
            that.addJob(
                "get",
                priv.substorage,
                command.getDocId()+priv.doctree_suffix,
                option,
                function (response) {
                    doctree = response;
                    if (prev_rev === undefined) {
                        revs_info =
                            priv.getWinnerRevisionFromDocumentTree(doctree);
                        prev_rev = revs_info[0].rev;
                    } else {
                        revs_info =
                            priv.getRevisionFromDocumentTree(doctree, prev_rev);
                    }
                    f.getDocument(command.getDocId()+"."+prev_rev,
                                  command.getAttachmentId());
                }, function (err) {
                    switch(err.status) {
                    case 404:
                        that.error(err);
                        break;
                    default:
                        err.message = "Cannot get document revision tree";
                        that.error(err);
                        break;
                    }
                }
            );
        };
        f.getDocument = function (docid, attmtid) {
            that.addJob(
                "get",
                priv.substorage,
                docid,
                option,
                function (response) {
                    var attmt;
                    if (typeof response !== "string") {
                        if (attmtid !== undefined) {
                            if (response._attachments !== undefined) {
                                attmt = response._attachments[attmtid];
                                if (attmt !== undefined) {
                                    prev_rev =
                                        priv.getRevisionFromPosition(
                                            revs_info, attmt.revpos);
                                    f.getDocument(command.getDocId()+"."+
                                                  prev_rev+"/"+attmtid);
                                    return;
                                }
                            }
                            that.error({
                                "status": 404,
                                "statusText": "Not Found",
                                "error": "not_found",
                                "message": "Cannot find the attachment",
                                "reason": "Attachment is missing"
                            });
                            return;
                        }
                        response._id = command.getDocId();
                        response._rev = prev_rev;
                        if (command.getOption("revs") === true) {
                            response._revisions =
                                priv.revsInfoToHistory(revs_info);
                        }
                        if (command.getOption("revs_info") === true) {
                            response._revs_info = revs_info;
                        }
                        if (command.getOption("conflicts") === true) {
                            response._conflicts =
                                priv.getLeavesFromDocumentTree(
                                    doctree, prev_rev);
                            if (response._conflicts.length === 0) {
                                delete response._conflicts;
                            }
                        }
                    }
                    that.success(response);
                }, function (err) {
                    that.error(err);
                }
            );
        };
        if (command.getAttachmentId() && prev_rev !== undefined) {
            f.getDocument(command.getDocId()+"."+prev_rev+
                          "/"+command.getAttachmentId());
        } else {
            f.getDocumentTree();
        }
    };

    /**
     * Remove document or attachment.
     * Options:
     * - {boolean} keep_revision_history To keep the previous revisions
     * @method remove
     * @param  {object} command The JIO command
     */
    that.remove = function (command) {
        var f = {}, del_rev, option, i,
        revision_found = false, revision_count = 0, correct_revision;
        option = command.cloneOption();
        if (option["max_retry"] === 0) {
            option["max_retry"] = 3;
        }
        del_rev = command.getDoc()._rev;

        f.removeDocument = function (docid) {
            if (command.getOption("keep_revision_history") !== true) {
                that.addJob(
                    "remove",
                    priv.substorage,
                    docid,
                    option,
                    function (response) {
                        if ( command.getAttachmentId() === undefined ) {
                            priv.update_doctree_on_remove = true;
                        } else {
                            priv.update_doctree_on_remove = false;
                        }
                        that.post(command);
                    },
                    function (err) {
                        that.error({
                            "status": 404,
                            "statusText": "Not Found",
                            "error": "not_found",
                            "message": "File not found",
                            "reason": "Document was not found"
                        });
                        return;
                    }
                );
            } else {
                // keep history = update document tree only
                if (command.getAttachmentId() === undefined ) {
                    priv.update_doctree_on_remove = true;
                } else {
                    priv.update_doctree_on_remove = false;
                }
                that.post(command);
            }
        };
        if (typeof del_rev === "string") {
            if (!priv.checkRevisionFormat(del_rev)) {
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
        }

        // get doctree
        that.addJob(
            "get",
            priv.substorage,
            command.getDocId()+priv.doctree_suffix,
            option,
            function (response) {
                response._conflicts = priv.getLeavesFromDocumentTree(response);

                // really necessary...?
                if (del_rev === undefined) {
                    // single leaf = can be deleted
                    if (response._conflicts.length === 1) {
                        f.removeDocument(command.getDocId()+"."+
                            response._conflicts[0]);
                        delete response._conflicts;
                    } else {
                        // multiple leaves = only if deleting attachment,
                        // because unique document.revision/attachment
                        if (typeof command.getAttachmentId() === "string"){
                            for (i = 0; i < response._conflicts.length; i += 1){
                                del_rev = response._conflicts[i];
                                that.addJob(
                                    "get",
                                    priv.substorage,
                                    command.getDocId()+"."+response._conflicts[i],
                                    option,
                                    function (nested_response) {
                                        if (typeof nested_response._attachments === "object") {
                                            if (nested_response._attachments[command.getAttachmentId()] !== undefined){
                                                revision_found = true;
                                                correct_revision = del_rev;
                                            }
                                        }

                                        if ( revision_count === response._conflicts.length-1 &&
                                            revision_found !== true ){
                                            that.error({
                                                "status": 404,
                                                "statusText": "Not Found",
                                                "error": "not_found",
                                                "message": "Attachment not found, please check attachment ID",
                                                "reason": "Incorrect Attachment ID"
                                            });
                                            return;
                                        }

                                        if (revision_found === true ){
                                            priv.missing_revision = correct_revision;
                                            delete response._conflicts;
                                            f.removeDocument(command.getDocId()+"."+
                                                correct_revision+"/"+command.getAttachmentId());
                                        }
                                        revision_count += 1;
                                    },
                                    function (err) {
                                        that.error({
                                            "status": 404,
                                            "statusText": "Not Found",
                                            "error": "not_found",
                                            "message": "Attachment not found, please check document ID",
                                            "reason": "Incorrect document ID"
                                        });
                                    }
                                );
                            }
                        } else {
                        // conflict
                        // return conflict message here, so user can pick a document version
                        that.error({
                            "status": 409,
                            "statusText": "Conflict",
                            "error": "conflict",
                            "message": "Document update conflict.",
                            "reason": "Cannot delete a document without revision when multiple versions exist"
                        });
                        return;
                        }
                    }
                } else {
                    // revision provided
                    if (typeof command.getAttachmentId() === "string"){
                        f.removeDocument(command.getDocId()+"."+del_rev+"/"+
                            command.getAttachmentId());
                    } else {
                        if (priv.isRevisionALeaf(del_rev, response._conflicts)){
                            f.removeDocument(command.getDocId()+"."+del_rev);
                        } else {
                            that.error({
                                "status": 409,
                                "statusText": "Conflict",
                                "error": "conflict",
                                "message": "Document update conflict.",
                                "reason": "Trying to remove an outdated revision"
                            });
                            return;
                        }
                    }
                }
            },
            function (err) {
                that.error({
                    "status": 404,
                    "statusText": "Not Found",
                    "error": "not_found",
                    "message": "Document tree not found, please check document ID",
                    "reason": "Incorrect document ID"
                });
                return;
            }
        );
    };

    return that;
});
