var newCryptedStorage = function ( spec, my ) {
    spec = spec || {};
    var that = my.basicStorage( spec, my ), priv = {};

    var is_valid_storage = (spec.storage?true:false);

    priv.username = spec.username || '';
    priv.password = spec.password || '';
    priv.secondstorage_spec = spec.storage || {type:'base'};
    priv.secondstorage_string = JSON.stringify (priv.secondstorage_string);

    var super_serialized = that.serialized;
    that.serialized = function () {
        var o = super_serialized();
        o.username = priv.username;
        o.password = priv.password; // TODO : unsecured !!!
        o.storage = priv.secondstorage_string;
        return o;
    };

    that.validateState = function () {
        if (priv.username && is_valid_storage) {
            return '';
        }
        return 'Need at least two parameters: "username" and "storage".';
    };

    // TODO : IT IS NOT SECURE AT ALL!
    // WE MUST REWORK CRYPTED STORAGE!
    priv.encrypt_param_object = {
        "iv":"kaprWwY/Ucr7pumXoTHbpA",
        "v":1,
        "iter":1000,
        "ks":256,
        "ts":128,
        "mode":"ccm",
        "adata":"",
        "cipher":"aes",
        "salt":"K4bmZG9d704"
    };
    priv.decrypt_param_object = {
        "iv":"kaprWwY/Ucr7pumXoTHbpA",
        "ks":256,
        "ts":128,
        "salt":"K4bmZG9d704"
    };
    priv.encrypt = function (data,callback) {
        // end with a callback in order to improve encrypt to an
        // asynchronous encryption.
        var tmp = sjcl.encrypt (priv.username+':'+
                                priv.password, data,
                                priv.encrypt_param_object);
        callback(JSON.parse(tmp).ct);
    };
    priv.decrypt = function (data,callback) {
        var tmp, param = $.extend(true,{},priv.decrypt_param_object);
        param.ct = data || '';
        param = JSON.stringify (param);
        try {
            tmp = sjcl.decrypt (priv.username+':'+
                                priv.password,
                                param);
        } catch (e) {
            callback({status:403,statusText:'Forbidden',error:'forbidden',
                      message:'Unable to decrypt.',reason:'unable to decrypt'});
            return;
        }
        callback(undefined,tmp);
    };

    priv.newAsyncModule = function () {
        var async = {};
        async.call = function (obj,function_name,arglist) {
            obj._wait = obj._wait || {};
            if (obj._wait[function_name]) {
                obj._wait[function_name]--;
                return function () {};
            }
            // ok if undef or 0
            arglist = arglist || [];
            setTimeout(function (){
                obj[function_name].apply(obj[function_name],arglist);
            });
        };
        async.neverCall = function (obj,function_name) {
            obj._wait = obj._wait || {};
            obj._wait[function_name] = -1;
        };
        async.wait = function (obj,function_name,times) {
            obj._wait = obj._wait || {};
            obj._wait[function_name] = times;
        };
        async.end = function () {
            async.call = function(){};
        };
        return async;
    };

    that.post = function (command) {
        that.put (command);
    };

    /**
     * Saves a document.
     * @method put
     */
    that.put = function (command) {
        var new_file_name, new_file_content, am = priv.newAsyncModule(), o = {};
        o.encryptFilePath = function () {
            priv.encrypt(command.getDocId(),function(res) {
                new_file_name = res;
                am.call(o,'save');
            });
        };
        o.encryptFileContent = function () {
            priv.encrypt(command.getDocContent(),function(res) {
                new_file_content = res;
                am.call(o,'save');
            });
        };
        o.save = function () {
            var success = function (val) {
                val.id = command.getDocId();
                that.success (val);
            },
            error = function (err) {
                that.error (err);
            },
            cloned_doc = command.cloneDoc();
            cloned_doc._id = new_file_name;
            cloned_doc.content = new_file_content;
            that.addJob ('put',priv.secondstorage_spec,cloned_doc,
                         command.cloneOption(),success,error);
        };
        am.wait(o,'save',1);
        am.call(o,'encryptFilePath');
        am.call(o,'encryptFileContent');
    }; // end put

    /**
     * Loads a document.
     * @method get
     */
    that.get = function (command) {
        var new_file_name, option, am = priv.newAsyncModule(), o = {};
        o.encryptFilePath = function () {
            priv.encrypt(command.getDocId(),function(res) {
                new_file_name = res;
                am.call(o,'get');
            });
        };
        o.get = function () {
            that.addJob('get',priv.secondstorage_spec,new_file_name,
                        command.cloneOption(),o.success,o.error);
        };
        o.success = function (val) {
            val._id = command.getDocId();
            if (command.getOption('metadata_only')) {
                that.success (val);
            } else {
                priv.decrypt (val.content, function(err,res){
                    if (err) {
                        that.error(err);
                    } else {
                        val.content = res;
                        that.success (val);
                    }
                });
            }
        };
        o.error = function (error) {
            that.error(error);
        };
        am.call(o,'encryptFilePath');
    }; // end get

    /**
     * Gets a document list.
     * @method allDocs
     */
    that.allDocs = function (command) {
        var result_array = [], am = priv.newAsyncModule(), o = {};
        o.allDocs = function () {
            that.addJob ('allDocs', priv.secondstorage_spec, null,
                         command.cloneOption(), o.onSuccess, o.error);
        };
        o.onSuccess = function (val) {
            if (val.total_rows === 0) {
                return am.call(o,'success');
            }
            result_array = val.rows;
            var i, decrypt = function (c) {
                priv.decrypt (result_array[c].id,function (err,res) {
                    if (err) {
                        am.call(o,'error',[err]);
                    } else {
                        result_array[c].id = res;
                        result_array[c].key = res;
                        am.call(o,'success');
                    }
                });
                if (!command.getOption('metadata_only')) {
                    priv.decrypt (
                        result_array[c].value.content,
                        function (err,res) {
                            if (err) {
                                am.call(o,'error',[err]);
                            } else {
                                result_array[c].value.content = res;
                                am.call(o,'success');
                            }
                        });
                }
            };
            if (command.getOption('metadata_only')) {
                am.wait(o,'success',val.total_rows*1-1);
            } else {
                am.wait(o,'success',val.total_rows*2-1);
            }
            for (i = 0; i < result_array.length; i+= 1) {
                decrypt(i);
            }
        };
        o.error = function (error) {
            am.end();
            that.error (error);
        };
        o.success = function () {
            am.end();
            that.success ({total_rows:result_array.length,rows:result_array});
        };
        am.call(o,'allDocs');
    }; // end allDocs

    /**
     * Removes a document.
     * @method remove
     */
    that.remove = function (command) {
        var new_file_name, o = {};
        o.encryptDocId = function () {
            priv.encrypt(command.getDocId(),function(res) {
                new_file_name = res;
                o.removeDocument();
            });
        };
        o.removeDocument = function () {
            var cloned_doc = command.cloneDoc();
            cloned_doc._id = new_file_name;
            that.addJob ('remove', priv.secondstorage_spec, cloned_doc,
                         command.cloneOption(), o.success, that.error);
        };
        o.success = function (val) {
            val.id = command.getDocId();
            that.success (val);
        };
        o.encryptDocId();
    }; // end remove

    return that;
};
jIO.addStorageType('crypt', newCryptedStorage);
