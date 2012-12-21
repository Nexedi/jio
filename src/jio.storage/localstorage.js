/**
 * JIO Local Storage. Type = 'local'.
 * Local browser "database" storage.
 */
var newLocalStorage = function (spec, my) {

    spec = spec || {};
    var that = my.basicStorage(spec, my),
        priv = {},

        /*
        * Wrapper for the localStorage used to simplify instion of any kind of
        * values
        */
        localstorage = {
            getItem: function (item) {
                return JSON.parse(localStorage.getItem(item));
            },
            setItem: function (item, value) {
                return localStorage.setItem(item, JSON.stringify(value));
            },
            deleteItem: function (item) {
                delete localStorage[item];
            }
        },
        storage_user_array_name,
        storage_file_array_name;

    // attributes 
    priv.username = spec.username || '';
    priv.applicationname = spec.applicationname || 'untitled';

    storage_user_array_name = 'jio/local_user_array';
    storage_file_array_name = 'jio/local_file_name_array/' +
        priv.username + '/' + priv.applicationname;

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
        localstorage.setItem(storage_user_array_name, user_array);
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
        localstorage.setItem(storage_file_array_name, file_name_array);
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
        localstorage.setItem(storage_file_array_name, new_array);
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
            obj.conflicts = {total_rows:0, rows:[]};
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
     * Create a new document
     * @method setDocument
     * @param  {object} command Command object
     * @param  {string} trigger Put/Post
     */
    priv.setDocument = function (command, trigger) {
        var doc = command.getDoc(),
            document_id = doc._id,
            document_rev = doc._rev,
            document_path = 'jio/local/'+priv.username+'/'+
                    priv.applicationname+'/'+document_id+
                    '/'+document_rev;

        if (trigger === 'put'){
            priv.documentObjectUpdate(doc, command.cloneDoc());
        }

        localstorage.setItem(document_path, doc);

        if (trigger === 'post'){
            if (!priv.doesUserExist(priv.username)) {
                priv.addUser(priv.username);
            }
            priv.addFileName(document_id);
        }

        return priv.manageOptions(
            {ok:true,id:document_id,rev:document_rev}, command, doc);
    };

    /**
     * get a document or attachment
     * @method getDocument
     * @param  {object} command Command object
     */
    priv.getDocument = function (command) {
        var doc = command.getDoc();
            document_id = doc._id;
            document_rev = doc._rev;
            document_path = 'jio/local/'+priv.username+'/'+
                    priv.applicationname+'/'+document_id+
                    '/'+document_rev;

        localStorage.getItem( document_path );

        return priv.manageOptions(
            {ok:true,id:document_id,rev:document_rev}, command, doc);
    };

    /**
     * delete a document or attachment
     * @method getDocument
     * @param  {object} command Command object
     */
    priv.deleteDocument = function (command) {
        var doc = command.getDoc();
            document_id = doc._id;
            document_rev = doc._rev;
            document_path = 'jio/local/'+priv.username+'/'+
                    priv.applicationname+'/'+document_id+
                    '/'+document_rev;

        localStorage.deleteItem( document_path );

        return priv.manageOptions(
            {ok:true,id:document_id,rev:document_rev}, command, doc);
    }

    // ===================== overrides ======================
    that.serialized = function () {
        return {
            "applicationname": priv.applicationname,
            "username": priv.username
        };
    };

    that.validateState = function() {
        if (priv.username) {
            return '';
        }
        return 'Need at least one parameter: "username".';
    };

    /**
     * Create a document in local storage.
     * @method  _post
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     *
     */
    that._post = function (command) {
        setTimeout (function () {
            that.success(priv.setDocument(command,'post'));
        });
    };

    /**
     * Create or update a document in local storage.
     * @method  _put
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     *
     */
    that._put = function (command) {
        setTimeout(function () {
            var docid = command.getDocId(),
                path = 'jio/local/'+priv.username+'/'+
                        priv.applicationname+'/'+docid
                doc = localstorage.getItem(path);

            if (!doc) {
                that.success(priv.setDocument(command, 'post'));
            } else {
                that.success(priv.documentUpdate(command, 'put'));
            }
        });
    };

    /**
     * Add an attachment to a document
     * @method  _putAttachment
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     */
    that._putAttachment = function (command) {
        setTimeout(function () {
            that.success(priv.setDocument(command), 'put');
        });
    };

    /**
     * Get a document or attachment
     * @method  get
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     */
    that._get = function (command) {
        setTimeout (function () {
            that.success( priv.getDocument(command) );
        });

    };

    /**
     * Remove a document or attachment
     * @method  remove
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     */
    that._remove = function (command) {
        setTimeout (function () {
            localStorage.deleteItem( command.docId ) );
        });
    };

    /**
     * get all filenames belonging to a user from the document index
     * @method  allDocs
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     * - {boolean} include_docs Include documents with index
     */
    that._allDocs = function (command) {
        setTimeout(function () {
            var new_array = [],
                array = priv.getFileNameArray(),
                i,l,
                path = 'jio/local/'+priv.username+'/'+priv.applicationname,
                include_docs = command.getOption('include_docs'),
                doc, item;

            for (i = 0, l = array.length; i < l; i += 1) {
                item = array[i];

                if (include_docs === true){
                    doc = that._get(path+'/'+item.id+'/'+item.value.key );
                    new_array.push({
                        "id":item.id,
                        "key":item.key,
                        "value":item.value,
                        "doc":doc
                    });
                } else {
                    new_array.push({
                        "id":item.id,
                        "key":item.key,
                        "value":item.value
                    });
                }
            }
            that.success ({total_rows:new_array.length,rows:new_array});
        });
    };

    return that;
};
jIO.addStorageType('local', newLocalStorage);
