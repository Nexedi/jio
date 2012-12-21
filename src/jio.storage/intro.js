/**
 * Adds 6 storages to JIO.
 * - LocalStorage ('local')
 * - DAVStorage ('dav')
 * - ReplicateStorage ('replicate')
 * - IndexedStorage ('indexed')
 * - CryptedStorage ('crypted')
 * - ConflictManagerStorage ('conflictmanager')
 *
 * @module cross-storage methods
*/
var utilities = {

    /**
     * Generates a hash code of a string
     * @method hashCode
     * @param  {string} string The string to hash
     * @return {string} The string hash code
     */
    hashCode : function (string) {
        return hex_sha256(string);
    },

    /**
     * Generates the next revision of [previous_revision]. [string] helps us
     * to generate a hash code.
     * @methode generateNextRev
     * @param  {string} previous_revision The previous revision
     * @param  {string} string String to help generate hash code
     * @return {array} 0:The next revision number and 1:the hash code
     */
    generateNextRevision : function (previous_revision, string) {
        return [parseInt(previous_revision.split('-')[0],10)+1,
                utilities.hashCode(previous_revision + string)];
    },

    /**
     * Replace substrings to others substring following a [list_of_replacement].
     * It will be executed recusively to replace substrings which are not
     * replaced substrings.
     * It starts from the last element of the list of replacement.
     * @method replaceSubString
     * @param  {string} string The string to replace
     * @param  {array} list_of_replacement A list containing arrays with 2
     * values:
     * - {string} The substring to replace
     * - {string} The new substring
     * ex: [['b', 'abc'], ['abc', 'cba']]
     * @return {string} The new string
     */
    replaceSubString : function (string, list_of_replacement) {
        var i, split_string = string.split(list_of_replacement[0][0]);
        if (list_of_replacement[1]) {
            for (i = 0; i < split_string.length; i += 1) {
                split_string[i] = utilities.replaceSubString (
                    split_string[i],
                    list_of_replacement.slice(1)
                );
            }
        }
        return split_string.join(list_of_replacement[0][1]);
    },

    /**
     * It secures the [string] replacing all '%' by '%%' and '/' by '%2F'.
     * @method secureString
     * @param  {string} string The string to secure
     * @return {string} The secured string
     */
    secureString : function (string) {
        return utilities.replaceSubString (string, [['/','%2F'],['%','%%']]);
    },

    /**
     * It replaces all '%2F' by '/' and '%%' by '%'.
     * @method unsecureString
     * @param  {string} string The string to convert
     * @return {string} The converted string
     */
    unsecureString : function (string) {
        return utilities.replaceSubString (string, [['%%','%'],['%2F','/']]);
    },

    // ============================ CREATE/UPDATE DOCUMENT =====================
    /**
     * @method createDocument   - Creates a new document
     * @info                    - docid POST = "" for POST, PUT = string
     * @param  {docid} string   - id for the new document
     * @stored                  - 'jio/local/USR/APP/FILE_NAME'
     * @returns {doc} object    - document object
     */
    createDocument : function (docId) {
        var now = Date.now(),
            doc = {},
            hash = utilities.hashCode('' + doc + ' ' + now + '');

        doc._id = docId;
        doc._rev = '1-'+hash;
        doc._revisions = {
            start: 1,
            ids: [hash]
        };
        doc._revs_info = [{
            rev: '1-'+hash,
            status: 'available'
        }];

        return doc;
    },

    /**
     * @method updateDocument   - updates a document
     * @info                    - called from PUT or PUTATTACHMENT
     * @info                    - deletes old document (purge & replace)
     * @param  {docid} string   - id for the new document
     * @param  {docpath} string - the path where to store the document
     * @param  {previousRevision} string - the previous revision
     * @param  {attachmentId}   - string - in case attachments are handled
     * @returns {doc} object    - new document
     */
    updateDocument : function (doc, docPath, previousRevision, attachmentId) {
        var now = Date.now(),
            rev = utilities.generateNextRevision(previousRevision, ''+
                    doc+' '+now+'');

        // in case the update is made because of an attachment
        if (attachmentId !== undefined) {
            // create _attachments
            if (doc._attachments === undefined){
                doc._attachments = {};
            }

            // create _attachments object for this attachment
            if (doc._attachments[attachmentId] === undefined){
                doc._attachments[attachmentId] = {};
            }

            // set revpos
            doc._attachments[attachmentId].revpos =
                parseInt(doc._rev.split('-')[0],10);
        }

        // update document
        doc._rev = rev.join('-');
        doc._revisions.ids.unshift(rev[1]);
        doc._revisions.start = rev[0];
        doc._revs_info[0].status = 'deleted';
        doc._revs_info.unshift({
            "rev": rev.join('-'),
            "status": "available"
        });
        return doc;
    },

    /**
     * @method updateDocumentTree- update a document tree
     * @param {docTreeNode} object - document tree
     * @param  {old_rev} string  - revision of the tree node to set to "branch"
     * @param  {new_rev } string - revison of the tree node to add as leaf
     * @param  {revs_info} object- history of new_rev to merge with remote tree
     */
    updateDocumentTree : function (docTreeNode, old_rev, new_rev,
                                        revs_info, deletedLeaf ) {

        if (typeof revs_info === "object") {
            // a new document version is being stored from another storage
            utilities.mergeRemoteTree(docTreeNode, docTreeNode, old_rev, new_rev,
                                            revs_info, [], false, deletedLeaf);
        } else {
            // update an existing version of document = add a node to the tree
            utilities.setTreeNode(docTreeNode, old_rev, new_rev, 'available');
        }

        return docTreeNode;
    },

// ==================== SET/MERGE/CHECK TREE NODES ==================
    /**
     * @method setTreeNode      - adds a new tree node/changes leaf to branch
     * @param {docTreeNode} object - document tree
     * @param {old_rev} string  - revision of the tree node to set to "branch"
     * @param {new_rev } string - revison of the tree node to add as leaf
     * @param {new_status}string- status the new node should have
     * @info                    - status is necessary, because we may also
     *                            add deleted nodes to the tree from a
     *                            remote storage
     */
    setTreeNode : function (docTreeNode, old_rev, new_rev, new_status){
        var kids = docTreeNode['kids'],
            rev = docTreeNode['rev'],
            numberOfKids,
            i,
            key;

        for(key in docTreeNode){
            if (key === "rev"){
                // grow the tree
                if (old_rev === rev && new_rev !== rev) {
                    docTreeNode.type = 'branch';
                    docTreeNode.status = 'deleted';
                    docTreeNode.kids.push({
                                    type:'leaf',
                                    status:new_status,
                                    rev:new_rev,
                                    kids:[]
                                    });
                } else {
                    // traverse until correct node is found!
                    if ( utilities.isObjectEmpty( kids ) === false ) {
                        numberOfKids = utilities.isObjectSize(kids);
                        for ( i = 0; i < numberOfKids; i+=1 ){
                            utilities.setTreeNode(kids[i], old_rev, new_rev, new_status);
                        }
                    }
                }
            }
        }
        return docTreeNode;
    },

    /**
     * Merges document object trees
     * @method mergeDocumentTree
     * @param {object} document_tree_list The document tree array
     */
    mergeDocumentTree: function (document_tree_list) {
        var arrayConcat, each, synchronizeFrom, tree_list;

        // arrayConcat([1,2], [3,4]) = [1,2,3,4]
        arrayConcat = function () {
            var i,newlist=[];
            for (j=0; j<arguments.length; ++j) {
                for (i=0; i<arguments[j].length; ++i) {
                    newlist.push(arguments[j][i]);
                }
            }
            return newlist;
        };

        // "each" executes "fun" on each values of "array"
        // if return false, then stop browsing
        each = function (array, fun, start) {
            var i;
            for (i = start || 0; i < array.length; i += 1) {
                if (fun(array[i], i) === false) {
                    return false;
                }
            }
            return true;
        };

        // merges all trees
        synchronize = function (tree_list) {
            var new_children;
            new_children = [];
            each(tree_list, function (tree, tree_index) {
                var res;
                if (new_children.length === 0) {
                    new_children.push(tree);
                    return;
                }
                res = each(new_children, function (child, child_index) {
                    if (tree.rev === child.rev) {
                        new_children[child_index].children = synchronize(
                            arrayConcat(
                                tree.children,
                                child.children
                            )
                        )
                        return false;
                    }
                });
                if (res === true) {
                    new_children.push(tree);
                }
            });
            return new_children;
        };

        tree_list = [];
        each(document_tree_list, function (tree) {
            tree_list = arrayConcat(tree_list, tree.children);
        });
        return {"children":synchronize(tree_list)};
    },

    /**
     * Gets the winner revision from a document tree.
     * The winner is the deeper revision on the left.
     * @method getWinnerRevisionFromDocumentTree
     * @param  {object} document_tree The document tree
     * @return {string} The winner revision
     */
    getWinnerRevisionFromDocumentTree: function (document_tree) {
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
    },

    /**
     * Gets an array of leaves revisions from document tree
     * @method getLeavesFromDocumentTree
     * @param  {object} document_tree The document tree
     * @return {array} The array of leaves revisions
     */
    getLeavesFromDocumentTree : function (document_tree) {
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
    },

    /**
     * @method isDeadLeaf       - Check if revision is branch or status deleted
     * @param  {node} string    - revision
     * @param  {tree} object    - active leaves (versions of a document)
     * @returns                 - true/false
     */
    isDeadLeaf : function (prev_rev, docTreeNode ){
        var type = docTreeNode['type'],
            status = docTreeNode['status'],
            kids = docTreeNode['kids'],
            rev = docTreeNode['rev'],
            result = false,
            numberOfKids,
            i,
            key;

        for ( key in docTreeNode ){
            if ( key === "rev" ){
                // if prev_rev is found, check if deleted or branch
                if ( prev_rev === rev &&
                        ( type === 'branch' || status === 'deleted' ) ){
                    result = true;
                }
                if ( utilities.isObjectEmpty( kids ) === false ){

                    numberOfKids = utilities.isObjectSize( kids );
                    for ( i = 0; i < numberOfKids; i+=1 ){
                        // recurse
                        if ( utilities.isDeadLeaf( prev_rev, kids[i] ) === true ){
                            result = true;
                        }
                    }
                }
                return result;
            }
        }
    }
};

/*
 * @module JIOStorages
 */
(function(LocalOrCookieStorage, $, Base64, sjcl, hex_sha256, jIO) {
