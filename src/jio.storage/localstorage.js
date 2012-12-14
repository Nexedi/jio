/**
 * JIO Local Storage. Type = 'local'.
 * It is a database located in the browser local storage.
 */
var newLocalStorage = function ( spec, my ) {
    spec = spec || {};
    var that = my.basicStorage( spec, my ), priv = {};

    /*
     * Wrapper for the localStorage used to simplify instion of any kind of
     * values
     */
    var localstorage = {
        getItem: function (item) {
            return JSON.parse (localStorage.getItem(item));
        },
        setItem: function (item,value) {
            return localStorage.setItem(item,JSON.stringify (value));
        },
        deleteItem: function (item) {
            delete localStorage[item];
        }
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
     * Generates the next revision of [previous_revision]. [string] helps us
     * to generate a hash code.
     * @methode generateNextRev
     * @param  {string} previous_revision The previous revision
     * @param  {string} string String to help generate hash code
     * @return {array} 0:The next revision number and 1:the hash code
     */
    priv.generateNextRev = function (previous_revision, string) {
        return [parseInt(previous_revision.split('-')[0],10)+1,
                priv.hashCode(previous_revision + string)];
    };

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
    priv.replaceSubString = function (string, list_of_replacement) {
        var i, split_string = string.split(list_of_replacement[0][0]);
        if (list_of_replacement[1]) {
            for (i = 0; i < split_string.length; i += 1) {
                split_string[i] = priv.replaceSubString (
                    split_string[i],
                    list_of_replacement.slice(1)
                );
            }
        }
        return split_string.join(list_of_replacement[0][1]);
    };

    /**
     * It secures the [string] replacing all '%' by '%%' and '/' by '%2F'.
     * @method secureString
     * @param  {string} string The string to secure
     * @return {string} The secured string
     */
    priv.secureString = function (string) {
        return priv.replaceSubString (string, [['/','%2F'],['%','%%']]);
    };

    /**
     * It replaces all '%2F' by '/' and '%%' by '%'.
     * @method unsecureString
     * @param  {string} string The string to convert
     * @return {string} The converted string
     */
    priv.unsecureString = function (string) {
        return priv.replaceSubString (string, [['%%','%'],['%2F','/']]);
    };

    priv.username = spec.username || '';
    priv.secured_username = priv.secureString(priv.username);
    priv.applicationname = spec.applicationname || 'untitled';
    priv.secured_applicationname = priv.secureString(priv.applicationname);

    var storage_user_array_name = 'jio/local_user_array';
    var storage_file_array_name = 'jio/local_file_name_array/' +
        priv.secured_username + '/' + priv.secured_applicationname;

    // Overriding serialized()
    var super_serialized = that.serialized;
    that.serialized = function() {
        var o = super_serialized();
        o.applicationname = priv.applicationname;
        o.username = priv.username;
        return o;
    };

    // Overrinding validateState()
    that.validateState = function() {
        if (priv.secured_username) {
            return '';
        }
        return 'Need at least one parameter: "username".';
    };

    /**
     * Returns a list of users.
     * @method getUserArray
     * @return {array} The list of users.
     */
    priv.getUserArray = function () {
        return localstorage.getItem(storage_user_array_name) || [];
    };

    /**
     * Adds a user to the user list.
     * @method addUser
     * @param  {string} user_name The user name.
     */
    priv.addUser = function (user_name) {
        var user_array = priv.getUserArray();
        user_array.push(user_name);
        localstorage.setItem(storage_user_array_name,user_array);
    };

    /**
     * checks if a user exists in the user array.
     * @method doesUserExist
     * @param  {string} user_name The user name
     * @return {boolean} true if exist, else false
     */
    priv.doesUserExist = function (user_name) {
        var user_array = priv.getUserArray(), i, l;
        for (i = 0, l = user_array.length; i < l; i += 1) {
            if (user_array[i] === user_name) {
                return true;
            }
        }
        return false;
    };

    /**
     * Returns the file names of all existing files owned by the user.
     * @method getFileNameArray
     * @return {array} All the existing file paths.
     */
    priv.getFileNameArray = function () {
        return localstorage.getItem(storage_file_array_name) || [];
    };

    /**
     * Adds a file name to the local file name array.
     * @method addFileName
     * @param  {string} file_name The new file name.
     */
    priv.addFileName = function (file_name) {
        var file_name_array = priv.getFileNameArray();
        file_name_array.push(file_name);
        localstorage.setItem(storage_file_array_name,file_name_array);
    };

    /**
     * Removes a file name from the local file name array.
     * @method removeFileName
     * @param  {string} file_name The file name to remove.
     */
    priv.removeFileName = function (file_name) {
        var i, l, array = priv.getFileNameArray(), new_array = [];
        for (i = 0, l = array.length; i < l; i+= 1) {
            if (array[i] !== file_name) {
                new_array.push(array[i]);
            }
        }
        localstorage.setItem(storage_file_array_name,new_array);
    };

    /**
     * Extends [obj] adding 0 to 3 values according to [command] options.
     * @method manageOptions
     * @param  {object} obj The obj to extend
     * @param  {object} command The JIO command
     * @param  {object} doc The document object
     */
    priv.manageOptions = function (obj, command, doc) {
        obj = obj || {};
        if (command.getOption('revs')) {
            obj.revisions = doc._revisions;
        }
        if (command.getOption('revs_info')) {
            obj.revs_info = doc._revs_info;
        }
        if (command.getOption('conflicts')) {
            obj.conflicts = {total_rows:0,rows:[]};
        }
        return obj;
    };

    /**
     * Update [doc] the document object and remove [doc] keys
     * which are not in [new_doc]. It only changes [doc] keys not starting
     * with an underscore.
     * ex: doc:     {key:value1,_key:value2} with
     *     new_doc: {key:value3,_key:value4} updates
     *     doc:     {key:value3,_key:value2}.
     * @param  {object} doc The original document object.
     * @param  {object} new_doc The new document object
     */
    priv.documentObjectUpdate = function (doc, new_doc) {
        var k;
        for (k in doc) {
            if (k[0] !== '_') {
                delete doc[k];
            }
        }
        for (k in new_doc) {
            if (k[0] !== '_') {
                doc[k] = new_doc[k];
            }
        }
    };

    /**
     * @method throwError       - Creates the error object for all errors
     * 
     * @param  {code} string    - the error code.
     * @param  {reason} string  - the error reason
     */
    priv.throwError = function ( code, reason ) {
        var statusText, error, message, e;

        switch( code ){

            case 409:
                statusText = 'Conflict';
                error = 'conflict';
                message = 'Document update conflict.';
                break;

            case 403:
                statusText = 'Forbidden';
                error = 'forbidden';
                message = 'Forbidden';
                break;

            case 404:
                statusText = 'Not found';
                error = 'not_found';
                message = 'Document not found.';
                break;
        }

        // create object
        e = ({
                status:code,
                statusText:statusText,
                error:error,
                message:message,
                reason:reason
            });
        return e;
    };

    /**
     * @method createDocument   - Creates a new document
     *
     * docid will be "" for POST and a string for PUT
     *
     * @param  {docid} string   - id for the new document
     * @param  {docpath} string - the path where to store the document
     *
     * @stored 'jio/local/USR/APP/FILE_NAME'
     */
    priv.createDocument = function ( docId, docPath ) {
        var now = Date.now(),
            doc = {},
            hash = priv.hashCode('' + doc + ' ' + now + ''),
            docPathRev;

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

        // allow to store multiple versions of a document by including rev
        docPathRev = docPath + '/' + doc._rev;

        // store
        localstorage.setItem(docPathRev, doc);

        return doc;
    };

    /**
     * @method updateDocument   - updates a document
     *
     * called from PUT or PUTATTACHMENT (or REMOVE?)
     *
     * @param  {docid} string   - id for the new document
     * @param  {docpath} string - the path where to store the document
     * @param  {prev_rev} string- the previous revision
     *
     */
    priv.updateDocument = function ( doc, docPath, prev_rev ) {
        var now = Date.now(),
            rev = priv.generateNextRev(prev_rev, ''+doc+' '+now+'');

        // update document
        doc._rev = rev.join('-');
        doc._revisions.ids.unshift(rev[1]);
        doc._revisions.start = rev[0];
        doc._revs_info[0].status = 'deleted';
        doc._revs_info.unshift({
            "rev": rev.join('-'),
            "status": "available"
        });

        // store
        localstorage.setItem(docPath, doc);
 
        return doc; 
    };

    /**
     * @method createDocumentTree - Creates a new document.tree
     *
     * @param  {docId} string   - id for the new document
     * @param  {doc } object    - the document object
     * @param  {docPath} string - the path where to store the document
     *
     * the tree will include 
     * @key  {type} string      - branch or leaf
     * @key  {status} string    - available or deleted
     * @key  {rev} string       - revision string of this node
     * @key  {spawns} object    - child branches/leaves
     *
     * @stored 'jio/local/USR/APP/FILE_NAME/TREE_revision'.
     *
     * the tree is maintained as long as more than one leaf exists(!)
     * a leaf set to status "deleted" implies a deleted document version
     * When all leaves have been set to "deleted", the tree is also deleted.
     * 
     */
    priv.createDocumentTree = function ( doc, docId, docPath ){
        var tree = {
                type:'leaf',
                status:'available',
                rev:doc._rev,
                kids:{}
            },
            treePath = docPath+'/revision_tree';

        // store
        localstorage.setItem(treePath, tree);
    };

    /**
     * @method updateDocumentTree - update a document tree
     *
     * @param  {docId} string   - id for the new document
     * @param  {doc } object    - the document object
     * @param  {docPath} string - the path where to store the document
     *
     * a tree can be grown (update a document) or split (when creating
     * a new version). Growing the tree means changing a leaf into
     * a branch and creating a new leaf. This is done here.
     *
     */
    priv.updateDocumentTree = function ( ){

    };

    /**
     * @method getLastTreeRevision - find a leaf
     *
     * @param  {docTree} string - the tree for this document
     *
     * this method should get the last leaf on the tree.
     * If there are multiple leaves that come into question
     * we select same as COUCHDB, highest rev counter, than
     * compare ASCII. We will return only a single document
     *
     */
    priv.getLastTreeRevision = function ( docTree ){

    };

    /**
     * @method post
     *
     * Create a document in local storage.
     *
     * Available options:
     * - {boolean} conflicts    - Add a conflicts object to the response
     * - {boolean} revs         - Add the revisions history of the document
     * - {boolean} revs_info    - Add revisions informations
     *
     */
    that.post = function (command) {

        setTimeout (function () {

            var docId = command.getDocId(),
                docPath = 'jio/local/'+priv.secured_username+'/'+
                    priv.secured_applicationname+'/'+docId,
                treePath = docPath+'/revision_tree',
                docTree = localstorage.getItem(treePath),
                doc = localstorage.getItem(docPath),
                reg;

            // no attachments allowed
            if (command.getAttachmentId()) {
                that.error( priv.throwError( 403,
                    'Attachment cannot be added with a POST request')
                );
                return;
            }

            // check for UUID
            reg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test( docId );

            if ( reg !== true ) {

                // id was supplied, use PUT
                that.error( priv.throwError( 403,
                    'ID cannot be supplied with a POST request. Please use PUT')
                );
                return;

            } else {
                // create and store new document
                doc = priv.createDocument( docId, docPath );

                // create and store new document.tree
                priv.createDocumentTree( doc, docId, docPath );

                // add user
                if (!priv.doesUserExist (priv.secured_username)) {
                    priv.addUser (priv.secured_username);
                }

                // add fileName
                priv.addFileName(docId);

                that.success (
                    priv.manageOptions(
                        {ok:true,id:docId,rev:doc._rev},
                        command,
                        doc
                    )
                );
            }
        });
    }; // end post

    /**
     * @method put
     *
     * Create or Update a document in local storage.
     *
     * Available options:
     * - {boolean} conflicts    - Add a conflicts object to the response
     * - {boolean} revs         - Add the revisions history of the document
     * - {boolean} revs_info    - Add revisions informations
     */
    that.put = function (command) {

        setTimeout (function () {

            var docId = command.getDocId(),
                prev_rev = command.getDocInfo('_rev'),
                docPath ='jio/local/'+priv.secured_username+'/'+
                    priv.secured_applicationname+'/'+docId,
                docPathRev = docPath +'/'+prev_rev,
                treePath = docPath+'/revision_tree',
                docTree = localstorage.getItem(treePath),
                doc,
                reg;

            // no tree = create document or error
            if (!docTree) {

                // check UUID
                reg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test( docId );

                // id/revision provided = update, revision must be incorrect
                if ( prev_rev !== undefined && reg === false ){
                    that.error( priv.throwError( 409,
                        'Incorrect Revision or ID')
                    );
                    return;
                }

                // revision provided = update, wrong revision or missing id
                if ( prev_rev !== undefined ){
                    that.error( priv.throwError( 404,
                        'Document not found, please check revision and/or ID')
                    );
                    return;
                }

                // no revision and UUID = create, no id provided
                if ( prev_rev === undefined && reg === true){
                    that.error( priv.throwError( 409,
                        'Missing Document ID and or Revision')
                    );
                    return;
                }

                // if passed here, we create.
                // it could be create (id+content) or update (without revision)
                // but since no tree was found and the tree includes id only
                // we only end here with a NEW id, so update sans revision cannot
                // be the case.

                // create and store new document
                doc = priv.createDocument( docId, docPath );

                // create and store new document.tree
                priv.createDocumentTree( doc, docId, docPath );

                // add user
                if (!priv.doesUserExist (priv.secured_username)) {
                    priv.addUser (priv.secured_username);
                }

                // add fileName
                priv.addFileName(docId);

                that.success (
                    priv.manageOptions(
                        {ok:true,id:docId,rev:doc._rev},
                        command,
                        doc
                    )
                );

            } else {
                // we found a tree

/*
                console.log( docTree );

                console.log( prev_rev );
                console.log( docId );
                console.log( docPath );
                console.log( docPathRev );
*/
                doc = localstorage.getItem(docPathRev);

                console.log( doc );

                // check if rev_supplied is on the tree
                // check if last node
                // check if multiple leaves or one (do I need to???)
                // if on tree and only leaf = expand
                // if on tree and multiple leaves = ???
                // if on tree, but not a leaf = error
                // if not on tree, can be error or new version
                // get revs_info from new document
                // not available = error on PUT 
                // available = compare revs_info current and supplied
                // start @root
                // if nodes are the same and BRANCH, make sure they are branch and deleted if not the last nodes
                // if nodes are not the same STOP
                // add new kid to last branch
                // continue with supplied revs_info to last version and add all the nodes on supplied revs_info
                // this should "copy" the tree from supplied revs_info into the current document tree

                // we have a tree, we know the last revision
                //priv.getLastTreeRevision( docTree );

                if (!doc) {

                } 


                if (doc._rev !== prev_rev) {

                    that.error( priv.throwError( 409, 
                        'Revision supplied is not the latest revision')
                    );
                    return;
                }

                // update ...?
                priv.documentObjectUpdate(doc,command.cloneDoc());

                // update document (and get it back)
                doc = priv.updateDocument( doc, docPath, prev_rev );

                // update document tree
                priv.updateDocumentTree();

                that.success (
                    priv.manageOptions(
                        {ok:true,id:docId,rev:doc._rev},
                        command,
                        doc
                    )
                );
            }
        });
    }; // end put

     /**
     * Saves/updates an attachment of a specified document.
     * attachment will be stored @ 'jio/local/USR/APP/FILE_NAME/ATTACHMENTID'.
     * @method putAttachment
     */
    that.putAttachment = function (command) {
        var now = Date.now();
        // wait a little in order to simulate asynchronous saving
        setTimeout (function () {

            var docid, doc, docpath, attmtid, attmt, attmtpath, prev_rev, rev;
            docid = command.getDocId();
            prev_rev = command.getDocInfo('_rev');
            docpath ='jio/local/'+priv.secured_username+'/'+
                priv.secured_applicationname+'/'+docid;

             // 404
            doc = localstorage.getItem(docpath);
            if (!doc) {
                that.error({
                    status:404,statusText:'Not found',error:'not_found',
                    message:'Document not found.',
                    reason:'Document with specified id does not exist'
                });
                return;
            }

            // 409
            if (doc._rev !== prev_rev) {
                // want to update an older document
                that.error({
                    status:409,statusText:'Conflict',error:'conflict',
                    message:'Document update conflict.',
                    reason:'Trying to update a previous document version'
                });
                return;
            }

            // check attachment id
            attmtid = command.getAttachmentId();
            if (attmtid) {
                attmtpath = docpath+'/'+attmtid;
                attmt = localstorage.getItem(attmtpath);

                // create _attachments
                if ( doc._attachments === undefined ){
                    doc._attachments = {};
                }

                // create _attachments object for this attachment
                if ( doc._attachments[attmtid] === undefined ){
                    doc._attachments[attmtid] = {};
                }

                // set revpos
                doc._attachments[attmtid].revpos =
                    parseInt(doc._rev.split('-')[0],10);

                    // store/update attachment
                localstorage.setItem(attmtpath,command.getContent());
            } else  {
                // no attachment id specified
                that.error({
                    status:409,statusText:'Conflict',error:'conflict',
                    message:'Document update conflict.',
                    reason:'No attachment id specified'
                });
                return; 
            }

            // rev = [number, hash]
            rev = priv.generateNextRev(prev_rev, ''+doc+' '+now+'');
            doc._rev = rev.join('-');
            doc._revisions.ids.unshift(rev[1]);
            doc._revisions.start = rev[0];
            doc._revs_info[0].status = 'deleted';
            doc._revs_info.unshift({
                "rev": rev.join('-'),
                "status": "available"
            });
            localstorage.setItem(docpath, doc);
            that.success (
                priv.manageOptions(
                    {"ok":true,"id":docid,"rev":doc._rev},
                    command,
                    doc
                )
            );
        });
    }; // end putAttachment

    /**
     * Loads a document from the local storage.
     * It will load file in 'jio/local/USR/APP/FILE_NAME'.
     * @method get
     */
    that.get = function (command) {

        setTimeout(function () {
            var docid, doc, docpath, attmtid, attmt;
            docid = command.getDocId();
            docpath = 'jio/local/'+priv.secured_username+'/'+
                priv.secured_applicationname+'/'+docid;
            attmtid = command.getAttachmentId();
            if (attmtid) {
                // this is an attachment
                attmt = localstorage.getItem(docpath+'/'+attmtid);
                if (!attmt) {
                    // there is no attachment to get
                    that.error({
                        status:404,statusText:'Not found',error:'not_found',
                        message:'Document is missing attachment.',
                        reason:'document is missing attachment'
                    });
                    return;
                }
                // send the attachment content
                that.success(attmt);
            } else {
                // this is a document
                doc = localstorage.getItem(docpath);
                if (!doc) {
                    // the document does not exist
                    that.error ({
                        status:404,statusText:'Not Found.',
                        error:'not_found',
                        message:'Document "'+ docid + '" not found.',
                        reason:'missing'
                    });
                } else {
                    if (!command.getDocInfo('revs')) {
                        delete doc._revisions;
                    }
                    if (!command.getDocInfo('revs_info')) {
                        delete doc._revs_info;
                    }
                    if (command.getDocInfo('conflicts')) {
                        doc._conflicts = {total_rows:0,rows:[]};
                    }
                    that.success (doc);
                }
            }
        });
    }; // end get

    /**
     * Gets a document list from the local storage.
     * It will retreive an array containing files meta data owned by
     * the user.
     * @method allDocs
     */
// ============== NOT MODIFIED YET ===============
    that.allDocs = function (command) {

        setTimeout(function () {
            var new_array = [], array = [], i, l, k = 'key',
            path = 'jio/local/'+priv.secured_username+'/'+
                priv.secured_applicationname, file_object = {};

            array = priv.getFileNameArray();
            for (i = 0, l = array.length; i < l; i += 1) {
                file_object =
                    localstorage.getItem(path+'/'+array[i]);
                if (file_object) {
                    if (command.getOption('metadata_only')) {
                        new_array.push ({
                            id:file_object._id,key:file_object._id,value:{
                                _creation_date:file_object._creation_date,
                                _last_modified:file_object._last_modified}});
                    } else {
                        new_array.push ({
                            id:file_object._id,key:file_object._id,value:{
                                content:file_object.content,
                                _creation_date:file_object._creation_date,
                                _last_modified:file_object._last_modified}});
                    }
                }
            }
            that.success ({total_rows:new_array.length,rows:new_array});
        });
    }; // end allDocs

    /**
     * Removes a document or attachment from the local storage.
     * It will also remove the path from the local file array.
     * @method remove
     */
// ============== FILES WON'T BE DELETED YET ===============
    that.remove = function (command) {
        // wait a little in order to simulate asynchronous saving
        setTimeout (function () {
            var docid, doc, docpath, prev_rev, attmtid, attmt, attpath;
                docid = command.getDocId();
                docpath = 'jio/local/'+priv.secured_username+'/'+
                    priv.secured_applicationname+'/'+docid;
                prev_rev = command.getDocInfo('_rev');
                attmtid = command.getAttachmentId();

            // xxx remove attachment if exists
            if( attmtid ){
                attpath = docpath+'/'+attmtid;
                attmt = localstorage.getItem(attpath);

                if ( attmt ){
                    // deleting
                    localstorage.deleteItem(attpath);
                    priv.removeFileName(attpath);

                    // xxx add new revision to tree here
                    that.success ({ok:true,id:command.getDocId()});

                } else {
                     // the document does not exist
                    that.error ({
                        status:404,statusText:'Not Found.',
                        error:'not_found',
                        message:'Document "'+ docid + '" not found.',
                        reason:'missing'
                    });
                }
            // xxx remove document if exists
            } else {
                doc = localstorage.getItem(docpath);

                // document exists
                if (doc){
                    // check for wrong revision
                    if ( doc._rev === prev_rev ){

                        localstorage.deleteItem(docpath);
                        priv.removeFileName(docid);

                        // xxx add new revision to tree here
                        that.success ({ok:true,id:command.getDocId()});

                    } else {
                        // the document does not exist
                        that.error ({
                        status:409,statusText:'Conflict',error:'conflict',
                        message:'Document update conflict.',
                        reason:'Trying to update an outdated revision'
                        });
                    }
                } else {
                    // the document does not exist
                    that.error ({
                        status:404,statusText:'Not Found.',
                        error:'not_found',
                        message:'Document "'+ docid + '" not found.',
                        reason:'missing'
                    });
                }
            }

        });
    }; // end remove

    return that;
};
jIO.addStorageType('local', newLocalStorage);
