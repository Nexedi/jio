var newIndexStorage = function ( spec, my ) {
    spec = spec || {};
    var that = my.basicStorage( spec, my ), priv = {};

    var validatestate_secondstorage = spec.storage || false;
    priv.secondstorage_spec = spec.storage || {type:'base'};
    priv.secondstorage_string = JSON.stringify (priv.secondstorage_spec);

    var storage_object_name = 'jio/indexed_storage_object';
    var storage_file_object_name = 'jio/indexed_file_object/'+
        priv.secondstorage_string;

    var super_serialized = that.serialized;
    that.serialized = function () {
        var o = super_serialized();
        o.storage = priv.secondstorage_spec;
        return o;
    };

    that.validateState = function () {
        if (!validatestate_secondstorage) {
            return 'Need at least one parameter: "storage" '+
                'containing storage specifications.';
        }
        return '';
    };

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

    priv.indexStorage = function () {
        var obj = LocalOrCookieStorage.getItem (storage_object_name) || {};
        obj[priv.secondstorage_spec] = new Date().getTime();
        LocalOrCookieStorage.setItem (storage_object_name,obj);
    };

    priv.formatToFileObject = function (row) {
        var k, obj = {_id:row.id};
        for (k in row.value) {
            obj[k] = row.value[k];
        }
        return obj;
    };

    priv.allDocs = function (files_object) {
        var k, obj = {rows:[]}, i = 0;
        for (k in files_object) {
            obj.rows[i] = {};
            obj.rows[i].value = files_object[k];
            obj.rows[i].id = obj.rows[i].key = obj.rows[i].value._id;
            delete obj.rows[i].value._id;
            i ++;
        }
        obj.total_rows = obj.rows.length;
        return obj;
    };

    priv.setFileArray = function (file_array) {
        var i, obj = {};
        for (i = 0; i < file_array.length; i+= 1) {
            obj[file_array[i].id] = priv.formatToFileObject(file_array[i]);
        }
        LocalOrCookieStorage.setItem (storage_file_object_name,obj);
    };

    priv.getFileObject = function (docid) {
        var obj = LocalOrCookieStorage.getItem (storage_file_object_name) || {};
        return obj[docid];
    };

    priv.addFile = function (file_obj) {
        var obj = LocalOrCookieStorage.getItem (storage_file_object_name) || {};
        obj[file_obj._id] = file_obj;
        LocalOrCookieStorage.setItem (storage_file_object_name,obj);
    };

    priv.removeFile = function (docid) {
        var obj = LocalOrCookieStorage.getItem (storage_file_object_name) || {};
        delete obj[docid];
        LocalOrCookieStorage.setItem (storage_file_object_name,obj);
    };

    /**
     * updates the storage.
     * It will retreive all files from a storage. It is an asynchronous task
     * so the update can be on going even if IndexedStorage has already
     * returned the result.
     * @method update
     */
    priv.update = function () {
        var success = function (val) {
            priv.setFileArray(val.rows);
        };
        that.addJob ('allDocs', priv.secondstorage_spec,null,
                     {max_retry:3},success,function(){});
    };

    that.post = function (command) {
        that.put(command);
    };

    /**
     * Saves a document.
     * @method put
     */
    that.put = function (command) {
        var cloned_doc = command.cloneDoc(),
        cloned_option = command.cloneOption(),
        success = function (val) {
            priv.update();
            that.success(val);
        },
        error = function (err) {
            that.error(err);
        };
        priv.indexStorage();
        that.addJob ('put',priv.secondstorage_spec,cloned_doc,
                     cloned_option,success,error);
    }; // end put

    /**
     * Loads a document.
     * @method get
     */
    that.get = function (command) {
        var file_array,
        success = function (val) {
            that.success(val);
        },
        error = function (err) {
            that.error(err);
        },
        get = function () {
            var cloned_option = command.cloneOption();
            that.addJob ('get',priv.secondstorage_spec,command.cloneDoc(),
                         cloned_option,success,error);
            that.end();
        };
        priv.indexStorage();
        priv.update();
        if (command.getOption('metadata_only')) {
            setTimeout(function () {
                var file_obj = priv.getFileObject(command.getDocId());
                if (file_obj &&
                    (file_obj._last_modified ||
                     file_obj._creation_date)) {
                    that.success (file_obj);
                } else {
                    get();
                }
            });
        } else {
            get();
        }
    }; // end get

    /**
     * Gets a document list.
     * @method allDocs
     */
    that.allDocs = function (command) {
        var obj = LocalOrCookieStorage.getItem (storage_file_object_name);
        if (obj) {
            priv.update();
            setTimeout(function (){
                that.success (priv.allDocs(obj));
            });
        } else {
            var success = function (val) {
                priv.setFileArray(val.rows);
                that.success(val);
            },
            error = function (err) {
                that.error(err);
            };
            that.addJob ('allDocs', priv.secondstorage_spec,null,
                         command.cloneOption(),success,error);
        }
    }; // end allDocs

    /**
     * Removes a document.
     * @method remove
     */
    that.remove = function (command) {
        var success = function (val) {
            priv.removeFile(command.getDocId());
            priv.update();
            that.success(val);
        },
        error = function (err) {
            that.error(err);
        };
        that.addJob ('remove',priv.secondstorage_spec,command.cloneDoc(),
                     command.cloneOption(),success,error);
    }; // end remove

    return that;
};
jIO.addStorageType ('indexed', newIndexStorage);
