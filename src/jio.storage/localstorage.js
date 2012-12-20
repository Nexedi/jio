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

    priv.username = spec.username || '';
    priv.secured_username = utilities.secureString(priv.username);
    priv.applicationname = spec.applicationname || 'untitled';
    priv.secured_applicationname = utilities.secureString(priv.applicationname);

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
     * runDocumentUpdate        - run the whole update process for localstorage
     * @param  {object} doc     - the original document object.
     * @param  {object} docTree - the document tree
     * @param  {object} command - command object
     * @param  {string} docId   - document id
     * @param  {string} attachmentId - attachmentId
     * @param  {string} docPath - document paths
     * @param  {string} prev_rev- previous revision
     * @param  {string} treePath- document tree paths
     * @param  {boolean} sync   - whether this is an update or sync operation!
     * @returns {object} success- success object
     */
    priv.runDocumentUpdate = function ( doc, docTree, command, docId, attachmentId,
                                        docPath, prev_rev, treePath, sync ){

        var docPathRev,
            newRevision,
            revs_info,
            deletedLeaf;

        // update ...I don't know what this is doing?
        priv.documentObjectUpdate(doc,command.cloneDoc());

        // update document - not when put sync-ing
        if ( sync === false ){
            // create a new revision
            doc = utilities.updateDocument(doc, docPath, prev_rev, attachmentId);

            docPathRev = docPath+'/'+doc._rev;
            newRevision = doc._rev;
            revs_info  = undefined;

            // delete old doc (.../DOCID/old_REVISION)
            localstorage.deleteItem(docPath+'/'+prev_rev);

        } else {
            docPathRev = docPath +'/'+doc._revs_info[0].rev;
            newRevision = null;
            revs_info = doc._revs_info;
            if ( revs_info[0].status === 'deleted' ){
                deletedLeaf = true;
            }
        }
        if ( deletedLeaf === undefined ){
            // store new doc (.../DOCID/new_REVISION)
            localstorage.setItem(docPathRev, doc);
        }

        // update tree and store
        localstorage.setItem(treePath, utilities.updateDocumentTree(
                            docTree, prev_rev, newRevision,
                            revs_info, deletedLeaf)
                            );

        // return SUCCESS
        return priv.manageOptions({ok:true,id:docId,rev:doc._rev}, command, doc);
    };

    /**
     * runDocumentCreate        - run the whole create process for localstorage
     * @param  {string} docId   - document id
     * @param  {object} command - command object
     * @returns {object} success- success object
     */
    priv.runDocumenCreate = function (docId, command){

        // create new document and tree
        var docPath = 'jio/local/'+priv.secured_username+'/'+
                    priv.secured_applicationname+'/'+docId,
            doc = utilities.createDocument( docId, docPath ),
            tree = utilities.createDocumentTree( doc ),
            treePath = docPath+'/revision_tree';

        // store document
        localstorage.setItem(docPath + '/' + doc._rev, doc);

        // store tree
        localstorage.setItem(treePath, tree);

        // add user
        if (!priv.doesUserExist(priv.secured_username)) {
            priv.addUser(priv.secured_username);
        }

        // add fileName
        priv.addFileName(docId);

        // return SUCCESS
        return priv.manageOptions({ok:true,id:docId,rev:doc._rev}, command, doc);
    };

// =============================== METHODS ======================

    /**
     * @method post             - Create a document in local storage.
     * @stored                  - 'jio/local/USR/APP/FILE_NAME/REVISION'.
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
                reg = utilities.isUUID(docId);

            // 403 - no attachments allowed
            if (command.getAttachmentId()) {
                that.error( utilities.throwError( 403,
                    'Attachment cannot be added with a POST request')
                );
                return;
            }

            // 403 id was supplied, use PUT
            if (reg !== true) {
                that.error( utilities.throwError( 403,
                    'ID cannot be supplied with a POST request. Please use PUT')
                );
                return;

            // ok
            } else {
                that.success(
                    priv.runDocumenCreate(docId, command)
                );
            }
        });
    };

    /**
     * @method put              - Create or Update a document in local storage.
     * @stored                  - 'jio/local/USR/APP/FILE_NAME/REVISION'.
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
                treePath = docPath+'/revision_tree',
                docTree = localstorage.getItem(treePath),
                doc,
                docPathRev,
                activeLeaves,
                reg = utilities.isUUID(docId);

            // no tree = create document or error
            if (!docTree) {

                // 404 id/revision provided = update, incorrect revision
                if ( prev_rev !== undefined && reg === false ){
                    that.error( utilities.throwError( 404,
                        'Document not found, please check revision and/or ID')
                    );
                    return;
                }

                // 409 no revision and UUID = create, no id provided
                if ( prev_rev === undefined && reg === true){
                    that.error( utilities.throwError( 409,
                        'Missing Document ID and or Revision')
                    );
                    return;
                }

                // if passed here, we create.
                // it could be create (id+content) or update (sans revision)
                // but since no tree was found we end here with a NEW id only
                // (otherwise tree would be have been found).
                that.success(
                    priv.runDocumenCreate(docId, command)
                );

            } else {
                // found a tree
                activeLeaves = utilities.getActiveLeaves( docTree );

                // check if revision is on doc-tree and if it is an active leaf
                if ( !utilities.isInObject( prev_rev, activeLeaves ) ) {

                    // check if it's a dead leaf (wrong revision)
                    if ( utilities.isDeadLeaf( prev_rev, docTree ) ){
                        // 409 deleted leaf/branch = wrong revision
                        that.error( utilities.throwError( 409,
                            'Revision supplied is not the latest revision')
                        );
                        return;
                    }

                    // maybe a sync-PUT from another storage, we must
                    // have revs_info option, otherwise we cannot know
                    // where to put the file and update the storage tree
                    if ( !utilities.isDeadLeaf( prev_rev, docTree ) &&
                            command.getDocInfo('_revs_info') === undefined ){

                        // 409 no revs_info provided
                        that.error( utilities.throwError( 409,
                            'Missing revs_info required for sync-put')
                        );
                        return;

                    } else {
                        // SYNC PUT

                        // revs_info is provided, this is a new version
                        // store this document and merge
                        // NOTE: we also have to SYNC PUT deleted versions
                        // otherwise the tree will not be the same AND
                        // other storages will not know which versions of a
                        // document have been deleted!!!!

                        // get the new document
                        doc = command.getDoc();

                        // ok
                        that.success(
                           priv.runDocumentUpdate(doc, docTree, command,
                                    docId, undefined, docPath, prev_rev,
                                    treePath, true)
                        );

                    }
                } else {
                    // revision matches a currently active leaf
                    // = update of an existing document version

                    // get doc
                    docPathRev = docPath +'/'+prev_rev;
                    doc = localstorage.getItem(docPathRev);

                    if (!doc ){
                        // 404 document not available, should not happen!
                        that.error( utilities.throwError( 404,
                            'Referenced document not found')
                        );
                        return;
                    } else {
                        // ok
                        that.success(
                            priv.runDocumentUpdate(doc, docTree, command,
                                    docId, undefined, docPath, prev_rev,
                                    treePath, false)
                        );
                    }
                }
            }
        });
    };

    /**
     * @method putAttachment    - Saves/updates an attachment of a document
    * @stored at      - 'jio/local/USR/APP/FILE_NAME/REVISION/ATTACHMENTID'.
     *
     * Available options:
     * - {boolean} conflicts    - Add a conflicts object to the response
     * - {boolean} revs         - Add the revisions history of the document
     * - {boolean} revs_info    - Add revisions informations
     */
    that.putAttachment = function (command) {

        setTimeout( function () {

            var docId = command.getDocId(),
                docPath ='jio/local/'+priv.secured_username+'/'+
                priv.secured_applicationname+'/'+docId,
                prev_rev = command.getDocInfo('_rev'),
                treePath = docPath+'/revision_tree',
                docTree = localstorage.getItem(treePath),
                doc,
                docPathRev,
                activeLeaves,
                attachmentId,
                attachment,
                attachmentPath;

            if (!docTree) {

                // 404 document wasn't found = wrong id or revision
                that.error( utilities.throwError( 404,
                    'Document not found, please check document ID')
                );
                return;

            } else {
                // found a tree
                activeLeaves = utilities.getActiveLeaves( docTree );

                // check if revision is on tree
                if ( utilities.isInObject( prev_rev, activeLeaves ) ) {

                    // check if dead leaf
                    if ( utilities.isDeadLeaf( prev_rev, docTree ) ){

                        // 409 deleted leaf/branch = wrong revision
                        that.error( utilities.throwError( 409,
                            'Trying to update on a previous document version')
                        );
                        return;

                    } else {
                        // revision is ok
                        attachmentId = command.getAttachmentId();

                        // 409 missing attachment id
                        if ( !attachmentId ){
                            that.error( utilities.throwError( 409,
                                'No attachment id specified')
                            );
                            return;

                        } else {
                            // set attachment
                            attachmentPath = docPath+'/'+prev_rev+'/'+attachmentId;
                            attachment = localstorage.getItem(attachmentPath);

                            // store/update attachment
                            localstorage.setItem(attachmentPath,command.getContent());

                            // get doc
                            docPathRev = docPath +'/'+prev_rev;
                            doc = localstorage.getItem(docPathRev);

                            // ok
                            that.success(
                                priv.runDocumentUpdate(doc, docTree, command,
                                    docId, attachmentId, docPath, prev_rev,
                                    treePath, false)
                            );
                        }
                    }

                } else {
                    // 404 revision supplied is not on tree
                    that.error( utilities.throwError( 404,
                        'Document not found, please check revision')
                    );
                    return;
                }
            }
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
                docid = command.getDocId(),
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
