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
     * @return {string} The next revision
     */
    priv.generateNextRev = function (previous_revision, string) {
         return (parseInt(previous_revision.split('-')[0],10)+1) + '-' +
            priv.hashCode(previous_revision + string);
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
