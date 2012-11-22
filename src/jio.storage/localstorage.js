/**
 * JIO Local Storage. Type = 'local'.
 * It is a database located in the browser local storage.
 */
var newLocalStorage = function ( spec, my ) {
    spec = spec || {};
    var that = my.basicStorage( spec, my ), priv = {};

    priv.secureDocId = function (string) {
        var split = string.split('/'), i;
        if (split[0] === '') {
            split = split.slice(1);
        }
        for (i = 0; i < split.length; i+= 1) {
            if (split[i] === '') { return ''; }
        }
        return split.join('%2F');
    };
    priv.convertSlashes = function (string) {
        return string.split('/').join('%2F');
    };

    priv.restoreSlashes = function (string) {
        return string.split('%2F').join('/');
    };

    priv.username = spec.username || '';
    priv.secured_username = priv.convertSlashes(priv.username);
    priv.applicationname = spec.applicationname || 'untitled';
    priv.secured_applicationname = priv.convertSlashes(priv.applicationname);

    var storage_user_array_name = 'jio/local_user_array';
    var storage_file_array_name = 'jio/local_file_name_array/' +
        priv.secured_username + '/' + priv.secured_applicationname;

    var super_serialized = that.serialized;
    that.serialized = function() {
        var o = super_serialized();
        o.applicationname = priv.applicationname;
        o.username = priv.username;
        return o;
    };

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
        return localStorage.getItem(storage_user_array_name) || [];
    };

    /**
     * Adds a user to the user list.
     * @method addUser
     * @param  {string} user_name The user name.
     */
    priv.addUser = function (user_name) {
        var user_array = priv.getUserArray();
        user_array.push(user_name);
        localStorage.setItem(storage_user_array_name,user_array);
    };

    /**
     * checks if a user exists in the user array.
     * @method userExists
     * @param  {string} user_name The user name
     * @return {boolean} true if exist, else false
     */
    priv.userExists = function (user_name) {
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
        return localStorage.getItem(storage_file_array_name) || [];
    };

    /**
     * Adds a file name to the local file name array.
     * @method addFileName
     * @param  {string} file_name The new file name.
     */
    priv.addFileName = function (file_name) {
        var file_name_array = priv.getFileNameArray();
        file_name_array.push(file_name);
        localStorage.setItem(storage_file_array_name,file_name_array);
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
        localStorage.setItem(storage_file_array_name,new_array);
    };

    priv.checkSecuredDocId = function (secured_docid,docid,method) {
        if (!secured_docid) {
            that.error({
                status:403,statusText:'Method Not Allowed',
                error:'method_not_allowed',
                message:'Cannot '+method+' "'+docid+
                    '", file name is incorrect.',
                reason:'Cannot '+method+' "'+docid+
                    '", file name is incorrect'
            });
            return false;
        }
        return true;
    };

    that.post = function (command) {
        that.put(command);
    };

    /**
     * Saves a document in the local storage.
     * It will store the file in 'jio/local/USR/APP/FILE_NAME'.
     * @method put
     */
    that.put = function (command) {
        // wait a little in order to simulate asynchronous saving
        setTimeout (function () {
            var secured_docid = priv.secureDocId(command.getDocId()),
            doc = null, path =
                'jio/local/'+priv.secured_username+'/'+
                priv.secured_applicationname+'/'+
                secured_docid;

            if (!priv.checkSecuredDocId(
                secured_docid,command.getDocId(),'put')) {return;}
            // reading
            doc = LocalOrCookieStorage.getItem(path);
            if (!doc) {
                // create document
                doc = {
                    _id: command.getDocId(),
                    content: command.getDocContent(),
                    _creation_date: Date.now(),
                    _last_modified: Date.now()
                };
                if (!priv.userExists(priv.secured_username)) {
                    priv.addUser (priv.secured_username);
                }
                priv.addFileName(secured_docid);
            } else {
                // overwriting
                doc.content = command.getDocContent();
                doc._last_modified = Date.now();
            }
            localStorage.setItem(path, doc);
            that.success ({ok:true,id:command.getDocId()});
        });
    }; // end put

    /**
     * Loads a document from the local storage.
     * It will load file in 'jio/local/USR/APP/FILE_NAME'.
     * You can add an 'options' object to the job, it can contain:
     * - metadata_only {boolean} default false, retrieve the file metadata
     *   only if true.
     * @method get
     */
    that.get = function (command) {

        setTimeout(function () {
            var secured_docid = priv.secureDocId(command.getDocId()),
            doc = null;

            if (!priv.checkSecuredDocId(
                secured_docid,command.getDocId(),'get')) {return;}
            doc = localStorage.getItem(
                'jio/local/'+priv.secured_username+'/'+
                    priv.secured_applicationname+'/'+secured_docid);
            if (!doc) {
                that.error ({status:404,statusText:'Not Found.',
                             error:'not_found',
                             message:'Document "'+ command.getDocId() +
                             '" not found.',
                             reason:'missing'});
            } else {
                if (command.getOption('metadata_only')) {
                    delete doc.content;
                }
                that.success (doc);
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
                    localStorage.getItem(path+'/'+array[i]);
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
            delete localStorage[path];
            priv.removeFileName(secured_docid);
            that.success ({ok:true,id:command.getDocId()});
        });
    }; // end remove

    return that;
};
jIO.addStorageType('local', newLocalStorage);
