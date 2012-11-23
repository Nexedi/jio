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
     * Create a document in the local storage.
     * It will store the file in 'jio/local/USR/APP/FILE_NAME'.
     * The command may have some options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     * @method post
     */
    that.post = function (command) {
        var now = Date.now();
        // wait a little in order to simulate asynchronous saving
        setTimeout (function () {
            var docid, hash, doc, ret, path;

            if (command.getAttachmentId()) {
                that.error({
                    status:403,statusText:'Forbidden',error:'forbidden',
                    message:'Cannot add an attachment with post request.',
                    reason:'attachment cannot be added with a post request'
                });
                return;
            }

            docid = command.getDocId();
            path = 'jio/local/'+priv.secured_username+'/'+
                priv.secured_applicationname+'/'+docid;

            // reading
            doc = localstorage.getItem(path);
            if (!doc) {
                hash = priv.hashCode('' + doc + ' ' + now + '');
                // create document
                doc = {};
                doc._id = docid;
                doc._rev = '1-'+hash;
                doc._revisions = {
                    start: 1,
                    ids: [hash]
                };
                doc._revs_info = [{
                    rev: '1-'+hash,
                    // status can be 'available', 'deleted' or 'missing'
                    status: 'available'
                }];
                if (!priv.doesUserExist (priv.secured_username)) {
                    priv.addUser (priv.secured_username);
                }
                priv.addFileName(docid);
            } else {
                // cannot overwrite
                that.error ({
                    status:409,statusText:'Conflict',error:'conflict',
                    message:'Document already exists.',
                    reason:'the document already exists'
                });
                return;
            }
            localstorage.setItem(path, doc);
            that.success (
                priv.manageOptions(
                    {ok:true,id:docid,rev:doc._rev},
                    command,
                    doc
                )
            );
        });
    };

    /**
     * Saves a document in the local storage.
     * It will store the file in 'jio/local/USR/APP/FILE_NAME'.
     * @method put
     */
    that.put = function (command) {
        var now = Date.now();
        // wait a little in order to simulate asynchronous saving
        setTimeout (function () {
            var docid, doc, docpath, attmtid, attmt, attmtpath, prev_rev, rev;
            docid = command.getDocId();
            prev_rev = command.getDocInfo('_rev');
            docpath ='jio/local/'+priv.secured_username+'/'+
                priv.secured_applicationname+'/'+docid;

            // reading
            doc = localstorage.getItem(docpath);
            if (!doc) {
                that.error({
                    status:404,statusText:'Not found',error:'not_found',
                    message:'Document not found.',
                    reason:'document not found'
                });
                return;
            }
            if (doc._rev !== prev_rev) {
                // want to update an older document
                that.error({
                    status:409,statusText:'Conflict',error:'conflict',
                    message:'Document update conflict.',
                    reason:'document update conflict.'
                });
                return;
            }
            // it is the good document
            attmtid = command.getAttachmentId();
            if (attmtid) {
                attmtpath = docpath+'/'+attmtid;
                // this is an attachment
                attmt = localstorage.getItem(attmtpath);
                if (!attmt) {
                    // there is no attachment to update
                    that.error({
                        status:404,statusText:'Not found',error:'not_found',
                        message:'Document is missing attachment.',
                        reason:'document is missing attachment'
                    });
                    return;
                }
                // updating attachment
                doc._attachments[attmtid].revpos =
                    parseInt(doc._rev.split('-')[0],10);
                localstorage.setItem(attmtpath,command.getContent());
            } else {
                // update document metadata
                priv.documentObjectUpdate(doc,command.cloneDoc());
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
    }; // end put

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
     * Removes a document from the local storage.
     * It will also remove the path from the local file array.
     * @method remove
     */
    that.remove = function (command) {
        setTimeout (function () {
            var secured_docid = priv.secureDocId(command.getDocId()),
            path = 'jio/local/'+
                priv.secured_username+'/'+
                priv.secured_applicationname+'/'+
                secured_docid;
            if (!priv.checkSecuredDocId(
                secured_docid,command.getDocId(),'remove')) {return;}
            // deleting
            localstorage.deleteItem(path);
            priv.removeFileName(secured_docid);
            that.success ({ok:true,id:command.getDocId()});
        });
    }; // end remove

    return that;
};
jIO.addStorageType('local', newLocalStorage);
