var newConflictManagerStorage = function ( spec, my ) {
    spec = spec || {};
    var that = my.basicStorage( spec, my ), priv = {};

    var storage_exists = (spec.storage?true:false);
    priv.secondstorage_spec = spec.storage || {type:'base'};
    priv.secondstorage_string = JSON.stringify (priv.secondstorage_spec);

    var local_namespace = 'jio/conflictmanager/'+
        priv.secondstorage_string+'/';

    var empty_fun = function (){};

    var super_serialized = that.serialized;
    that.serialized = function () {
        var o = super_serialized();
        o.storage = priv.secondstorage_spec;
        return o;
    };

    that.validateState = function () {
        if (storage_exists) {
            return '';
        }
        return 'Need at least one parameter: "storage".';
    };

    priv.getDistantMetadata = function (command,path,success,error) {
        var cloned_option = command.cloneOption ();
        cloned_option.metadata_only = false;
        that.addJob ('get',priv.secondstorage_spec,path,cloned_option,
                     success, error);
    };

    priv.saveMetadataToDistant = function (command,path,content,success,error) {
        that.addJob ('put',priv.secondstorage_spec,
                     {_id:path,content:JSON.stringify (content)},
                     command.cloneOption(),success,error);
    };

    priv.saveNewRevision = function (command,path,content,success,error) {
        that.addJob ('post',priv.secondstorage_spec,{_id:path,content:content},
                     command.cloneOption(),success,error);
    };

    priv.loadRevision = function (command,path,success,error) {
        that.addJob('get',priv.secondstorage_spec,path,command.cloneOption(),
                    success, error);
    };

    priv.deleteAFile = function (command,path,success,error) {
        var cloned_option = command.cloneOption();
        that.addJob ('remove',priv.secondstorage_spec,{_id:path},
                     command.cloneOption(), success, error);
    };

    priv.chooseARevision = function (metadata) {
        var tmp_last_modified = 0, ret_rev = '', rev;
        for (rev in metadata) {
            if (tmp_last_modified <
                metadata[rev]._last_modified) {
                tmp_last_modified =
                    metadata[rev]._last_modified;
                ret_rev = rev;
            }
        }
        return ret_rev;
    };

    priv._revs = function (metadata,revision) {
        if (!(metadata && revision)) { return null; }
        if (metadata[revision]) {
            return {start:metadata[revision]._revisions.length,
                    ids:metadata[revision]._revisions};
        } else {
            return null;
        }
    };

    priv._revs_info = function (metadata) {
        if (!metadata) { return null; }
        var k, l = [];
        for (k in metadata) {
            l.push({
                rev:k,status:(metadata[k]?(
                    metadata[k]._deleted?'deleted':'available'):'missing')
            });
        }
        return l;
    };

    priv.solveConflict = function (doc,option,param) {
        var o = {}, am = priv.newAsyncModule(),

        command = param.command,
        metadata_file_path = param.docid + '.metadata',
        current_revision = '',
        current_revision_file_path = '',
        metadata_file_content = null,
        on_conflict = false, conflict_object = {total_rows:0,rows:[]},
        on_remove = param._deleted,
        previous_revision = param.previous_revision,
        previous_revision_content_object = null,
        now = new Date(),
        failerror;

        o.getDistantMetadata = function (){
            priv.getDistantMetadata (
                command, metadata_file_path,
                function (result) {
                    var previous_revision_number =
                        parseInt(previous_revision.split('-')[0],10);
                    metadata_file_content = JSON.parse (result.content);
                    // set current revision
                    current_revision = (previous_revision_number + 1) + '-' +
                        hex_sha256 ('' + doc.content +
                                    previous_revision +
                                    JSON.stringify (metadata_file_content));
                    current_revision_file_path = param.docid + '.' +
                        current_revision;
                    previous_revision_content_object = metadata_file_content[
                        previous_revision] || {};
                    if (!on_remove) {
                        am.wait(o,'saveMetadataOnDistant',1);
                        am.call(o,'saveNewRevision');
                    }
                    am.call(o,'previousUpdateMetadata');
                },function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.saveNewRevision = function (){
            priv.saveNewRevision (
                command, current_revision_file_path, doc.content,
                function (result) {
                    am.call(o,'saveMetadataOnDistant');
                }, function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.previousUpdateMetadata = function () {
            var i;
            for (i = 0; i < param.key.length; i+= 1) {
                delete metadata_file_content[param.key[i]];
            }
            am.call(o,'checkForConflicts');
        };
        o.checkForConflicts = function () {
            var rev;
            for (rev in metadata_file_content) {
                var revision_index;
                on_conflict = true;
                failerror = {
                    status:409,error:'conflict',
                    statusText:'Conflict',reason:'document update conflict',
                    message:'There is one or more conflicts'
                };
                break;
            }
            am.call(o,'updateMetadata');
        };
        o.updateMetadata = function (){
            var revision_history, id = '';
            id = current_revision.split('-'); id.shift(); id = id.join('-');
            revision_history = previous_revision_content_object._revisions;
            revision_history.unshift(id);
            metadata_file_content[current_revision] = {
                _creation_date:previous_revision_content_object._creation_date||
                    now.getTime(),
                _last_modified: now.getTime(),
                _revisions: revision_history,
                _conflict: on_conflict,
                _deleted: on_remove
            };
            if (on_conflict) {
                conflict_object =
                    priv.createConflictObject(
                        command, metadata_file_content, current_revision
                    );
            }
            am.call(o,'saveMetadataOnDistant');
        };
        o.saveMetadataOnDistant = function (){
            priv.saveMetadataToDistant(
                command, metadata_file_path, metadata_file_content,
                function (result) {
                    am.call(o,'deleteAllConflictingRevision');
                    if (on_conflict) {
                        am.call(o,'error');
                    } else {
                        am.call(o,'success');
                    }
                },function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.deleteAllConflictingRevision = function (){
            var i;
            for (i = 0; i < param.key.length; i+= 1) {
                priv.deleteAFile (
                    command, param.docid+'.'+param.key[i], empty_fun,empty_fun);
            }
        };
        o.success = function (){
            var a = {ok:true,id:param.docid,rev:current_revision};
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            if (option.revs) {
                a.revisions = priv._revs(metadata_file_content,
                                         current_revision);
            }
            if (option.revs_info) {
                a.revs_info = priv._revs_info(metadata_file_content);
            }
            if (option.conflicts) {
                a.conflicts = conflict_object;
            }
            param.success(a);
        };
        o.error = function (error){
            var err = error || failerror ||
                {status:0,statusText:'Unknown',error:'unknown_error',
                 message:'Unknown error.',reason:'unknown error'};
            if (current_revision) {
                err.rev = current_revision;
            }
            if (option.revs) {
                err.revisions = priv._revs(metadata_file_content,
                                           current_revision);
            }
            if (option.revs_info) {
                err.revs_info = priv._revs_info(metadata_file_content);
            }
            if (option.conflicts) {
                err.conflicts = conflict_object;
            }
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            param.error(err);
        };
        am.call(o,'getDistantMetadata');
    };

    priv.createConflictObject = function (command, metadata, revision) {
        return {
            total_rows:1,
            rows:[priv.createConflictRow(command,command.getDocId(),
                                         metadata,revision)]
        };
    };

    priv.getParam = function (list) {
        var param = {}, i = 0;
        if (typeof list[i] === 'string') {
            param.content = list[i];
            i ++;
        }
        if (typeof list[i] === 'object') {
            param.options = list[i];
            i ++;
        } else {
            param.options = {};
        }
        param.callback = function (err,val){};
        param.success = function (val) {
            param.callback(undefined,val);
        };
        param.error = function (err) {
            param.callback(err,undefined);
        };
        if (typeof list[i] === 'function') {
            if (typeof list[i+1] === 'function') {
                param.success = list[i];
                param.error = list[i+1];
            } else {
                param.callback = list[i];
            }
        }
        return param;
    };

    priv.createConflictRow = function (command, docid, metadata, revision) {
        var row = {id:docid,key:[],value:{
            _solveConflict: function (/*content, option, success, error*/) {
                var param = {}, got = priv.getParam(arguments);
                if (got.content === undefined) {
                    param._deleted = true;
                } else {
                    param._deleted = false;
                }
                param.success = got.success;
                param.error = got.error;
                param.previous_revision = revision;
                param.docid = docid;
                param.key = row.key;
                param.command = command.clone();
                return priv.solveConflict (
                    {_id:docid,content:got.content,_rev:revision},
                    got.options,param
                );
            }
        }}, k;
        for (k in metadata) {
            row.key.push(k);
        }
        return row;
    };

    priv.newAsyncModule = function () {
        var async = {};
        async.call = function (obj,function_name,arglist) {
            obj._wait = obj._wait || {};
            if (obj._wait[function_name]) {
                obj._wait[function_name]--;
                return empty_fun;
            }
            // ok if undef or 0
            arglist = arglist || [];
            setTimeout(function(){
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
            async.call = empty_fun;
        };
        return async;
    };

    that.post = function (command) {
        that.put (command);
    };

    /**
     * Save a document and can manage conflicts.
     * @method put
     */
    that.put = function (command) {
        var o = {}, am = priv.newAsyncModule(),

        metadata_file_path = command.getDocId() + '.metadata',
        current_revision = '',
        current_revision_file_path = '',
        metadata_file_content = null,
        on_conflict = false, conflict_object = {total_rows:0,rows:[]},
        previous_revision = command.getDocInfo('_rev') || '0',
        previous_revision_file_path = command.getDocId() + '.' +
            previous_revision,
        now = new Date(),
        failerror;

        o.getDistantMetadata = function (){
            priv.getDistantMetadata (
                command,metadata_file_path,
                function (result) {
                    var previous_revision_number =
                        parseInt(previous_revision.split('-')[0],10);
                    metadata_file_content = JSON.parse (result.content);
                    // set current revision
                    current_revision = (previous_revision_number + 1) + '-' +
                        hex_sha256 ('' + command.getDocContent() +
                                    previous_revision +
                                    JSON.stringify (metadata_file_content));
                    current_revision_file_path = command.getDocId() + '.' +
                        current_revision;
                    am.wait(o,'saveMetadataOnDistant',1);
                    am.call(o,'saveNewRevision');
                    am.call(o,'checkForConflicts');
                },function (error) {
                    if (error.status === 404) {
                        current_revision = '1-' +
                            hex_sha256 (command.getDocContent());
                        current_revision_file_path = command.getDocId() + '.' +
                            current_revision;
                        am.wait(o,'saveMetadataOnDistant',1);
                        am.call(o,'saveNewRevision');
                        am.call(o,'createMetadata');
                    } else {
                        am.call(o,'error',[error]);
                    }
                }
            );
        };
        o.saveNewRevision = function (){
            priv.saveNewRevision (
                command,current_revision_file_path,command.getDocContent(),
                function (result) {
                    am.call(o,'saveMetadataOnDistant');
                }, function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.checkForConflicts = function () {
            var rev;
            for (rev in metadata_file_content) {
                if (rev !== previous_revision) {
                    on_conflict = true;
                    failerror = {
                        status:409,error:'conflict',
                        statusText:'Conflict',reason:'document update conflict',
                        message:'Document update conflict.'
                    };
                    break;
                }
            }
            am.call(o,'updateMetadata');
        };
        o.createMetadata = function (){
            var id = current_revision;
            id = id.split('-'); id.shift(); id = id.join('-');
            metadata_file_content = {};
            metadata_file_content[current_revision] = {
                _creation_date: now.getTime(),
                _last_modified: now.getTime(),
                _revisions: [id],
                _conflict: false,
                _deleted: false
            };
            am.call(o,'saveMetadataOnDistant');
        };
        o.updateMetadata = function (){
            var previous_creation_date, revision_history = [], id = '';
            if (metadata_file_content[previous_revision]) {
                previous_creation_date = metadata_file_content[
                    previous_revision]._creation_date;
                revision_history = metadata_file_content[
                    previous_revision]._revisions;
                delete metadata_file_content[previous_revision];
            }
            id = current_revision.split('-'); id.shift(); id = id.join('-');
            revision_history.unshift(id);
            metadata_file_content[current_revision] = {
                _creation_date: previous_creation_date || now.getTime(),
                _last_modified: now.getTime(),
                _revisions: revision_history,
                _conflict: on_conflict,
                _deleted: false
            };
            if (on_conflict) {
                conflict_object =
                    priv.createConflictObject(
                        command, metadata_file_content, current_revision
                    );
            }
            am.call(o,'saveMetadataOnDistant');
        };
        o.saveMetadataOnDistant = function (){
            priv.saveMetadataToDistant(
                command, metadata_file_path, metadata_file_content,
                function (result) {
                    am.call(o,'deletePreviousRevision');
                    if (on_conflict) {
                        am.call(o,'error');
                    } else {
                        am.call(o,'success');
                    }
                },function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.deletePreviousRevision = function (){
            if (previous_revision !== '0' /*&& !on_conflict*/) {
                priv.deleteAFile (
                    command, previous_revision_file_path,
                    empty_fun,empty_fun);
            }
        };
        o.success = function () {
            var a = {ok:true,id:command.getDocId(),rev:current_revision};
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            if (command.getOption('revs')) {
                a.revisions = priv._revs(metadata_file_content,
                                         current_revision);
            }
            if (command.getOption('revs_info')) {
                a.revs_info = priv._revs_info(metadata_file_content);
            }
            if (command.getOption('conflicts')) {
                a.conflicts = conflict_object;
            }
            that.success(a);
        };
        o.error = function (error) {
            var err = error || failerror ||
                {status:0,statusText:'Unknown',error:'unknown_error',
                 message:'Unknown error.',reason:'unknown error'};
            if (current_revision) {
                err.rev = current_revision;
            }
            if (command.getOption('revs')) {
                err.revisions = priv._revs(metadata_file_content,
                                           current_revision);
            }
            if (command.getOption('revs_info')) {
                err.revs_info = priv._revs_info(metadata_file_content);
            }
            if (command.getOption('conflicts')) {
                err.conflicts = conflict_object;
            }
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            that.error(err);
        };
        am.call(o,'getDistantMetadata');
    }; // end put

    /**
     * Load a document from several storages, and send the first retreived
     * document.
     * @method get
     */
    that.get = function (command) {
        var o = {}, am = priv.newAsyncModule(),

        metadata_file_path = command.getDocId() + '.metadata',
        current_revision = command.getOption('rev') || '',
        metadata_file_content = null,
        metadata_only = command.getOption('metadata_only'),
        on_conflict = false, conflict_object = {total_rows:0,rows:[]},
        now = new Date(),
        doc = {_id:command.getDocId()},
        call404 = function (message) {
            am.call(o,'error',[{
                status:404,statusText:'Not Found',error:'not_found',
                message:message,reason:message
            }]);
        };

        o.getDistantMetadata = function (){
            priv.getDistantMetadata (
                command,metadata_file_path,
                function (result) {
                    metadata_file_content = JSON.parse (result.content);
                    if (!metadata_only) {
                        am.wait(o,'success',1);
                    }
                    am.call(o,'affectMetadata');
                    am.call(o,'checkForConflicts');
                },function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.affectMetadata = function () {
            if (current_revision) {
                if (!metadata_file_content[current_revision]) {
                    return call404('Document revision does not exists.');
                }
            } else {
                current_revision = priv.chooseARevision(metadata_file_content);
            }
            doc._last_modified =
                metadata_file_content[current_revision]._last_modified;
            doc._creation_date =
                metadata_file_content[current_revision]._creation_date;
            doc._rev = current_revision;
            if (metadata_only) {
                am.call(o,'success');
            } else {
                am.call(o,'loadRevision');
            }
        };
        o.loadRevision = function (){
            if (!current_revision ||
                metadata_file_content[current_revision]._deleted) {
                return call404('Document has been removed.');
            }
            priv.loadRevision (
                command, doc._id+'.'+current_revision,
                function (result) {
                    doc.content = result.content;
                    am.call(o,'success');
                }, function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.checkForConflicts = function () {
            if (metadata_file_content[current_revision]._conflict) {
                on_conflict = true;
                conflict_object =
                    priv.createConflictObject(
                        command,
                        metadata_file_content,
                        current_revision
                    );
            }
            am.call(o,'success');
        };
        o.success = function (){
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            if (command.getOption('revs')) {
                doc._revisions = priv._revs(metadata_file_content,
                                            current_revision);
            }
            if (command.getOption('revs_info')) {
                doc._revs_info = priv._revs_info(metadata_file_content);
            }
            if (command.getOption('conflicts')) {
                doc._conflicts = conflict_object;
            }
            that.success(doc);
        };
        o.error = function (error) {
            var err = error || {status:0,statusText:'Unknown',
                                      message:'Unknown error.'};
            if (command.getOption('revs')) {
                err._revisions = priv._revs(metadata_file_content,
                                            current_revision);
            }
            if (command.getOption('revs_info')) {
                err._revs_info = priv._revs_info(metadata_file_content);
            }
            if (command.getOption('conflicts')) {
                err._conflicts = conflict_object;
            }
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            that.error(err);
        };
        am.call(o,'getDistantMetadata');
    };

    /**
     * Get a document list from several storages, and returns the first
     * retreived document list.
     * @method allDocs
     */
    that.allDocs = function (command) {
        var o = {}, am = priv.newAsyncModule(),
        metadata_only = command.getOption('metadata_only'),
        result_list = [], conflict_object = {total_rows:0,rows:[]},
        nb_loaded_file = 0,
        success_count = 0, success_max = 0;
        o.retreiveList = function () {
            var cloned_option = command.cloneOption (),
            success = function (result) {
                am.call(o,'filterTheList',[result]);
            },error = function (error) {
                am.call(o,'error',[error]);
            };
            cloned_option.metadata_only = true;
            that.addJob ('allDocs',priv.secondstorage_spec,null,cloned_option,
                         success,error);
        };
        o.filterTheList = function (result) {
            var i;
            success_max ++;
            for (i = 0; i < result.total_rows; i+= 1) {
                var splitname = result.rows[i].id.split('.') || [];
                if (splitname.length > 0 &&
                    splitname[splitname.length-1] === 'metadata') {
                    success_max ++;
                    splitname.length --;
                    am.call(o,'loadMetadataFile',[splitname.join('.')]);
                }
            }
            am.call(o,'success');
        };
        o.loadMetadataFile = function (path) {
            priv.getDistantMetadata (
                command, path+'.metadata',
                function (data) {
                    data = JSON.parse (data.content);
                    var revision = priv.chooseARevision(data);
                    if (!data[revision]._deleted) {
                        am.call(
                            o,'loadFile',[path,revision,data]
                        );
                    } else {
                        am.call(o,'success');
                    }
                },function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.loadFile = function (path,revision,data) {
            var doc = {
                id: path,key: path,value:{
                    _last_modified:data[revision]._last_modified,
                    _creation_date:data[revision]._creation_date,
                    _rev:revision
                }
            };
            if (command.getOption('revs')) {
                doc.value._revisions = priv._revs(data,revision);
            }
            if (command.getOption('revs_info')) {
                doc.value._revs_info = priv._revs_info(data,revision);
            }
            if (command.getOption('conflicts')) {
                if (data[revision]._conflict) {
                    conflict_object.total_rows ++;
                    conflict_object.rows.push(priv.createConflictRow(
                        command, path, data, revision
                    ));
                }
            }
            if (!metadata_only) {
                priv.loadRevision (
                    command,path+'.'+revision,
                    function (data) {
                        doc.content = data.content;
                        result_list.push(doc);
                        am.call(o,'success');
                    },function (error) {
                        am.call(o,'error',[error]);
                    });
            } else {
                result_list.push(doc);
                am.call(o,'success');
            }
        };
        o.success = function (){
            var obj;
            success_count ++;
            if (success_count >= success_max) {
                am.end();
                obj = {total_rows:result_list.length,rows:result_list};
                if (command.getOption('conflicts')) {
                    obj.conflicts = conflict_object;
                }
                that.success(obj);
            }
        };
        o.error = function (error){
            am.end();
            that.error(error);
        };
        am.call(o,'retreiveList');
    }; // end allDocs

    /**
     * Remove a document from several storages.
     * @method remove
     */
    that.remove = function (command) {
        var o = {}, am = priv.newAsyncModule(),

        metadata_file_path = command.getDocId() + '.metadata',
        current_revision = '',
        current_revision_file_path = '',
        metadata_file_content = null,
        on_conflict = false, conflict_object = {total_rows:0,rows:[]},
        previous_revision = command.getOption('rev') || '0',
        previous_revision_file_path = command.getDocId() + '.' +
            previous_revision,
        now = new Date(),
        failerror;

        o.getDistantMetadata = function (){
            priv.getDistantMetadata (
                command,metadata_file_path,
                function (result) {
                    metadata_file_content = JSON.parse (result.content);
                    if (previous_revision === 'last') {
                        previous_revision =
                            priv.chooseARevision (metadata_file_content);
                        previous_revision_file_path = command.getDocId() + '.' +
                            previous_revision;
                    }
                    var previous_revision_number =
                        parseInt(previous_revision.split('-')[0],10) || 0;
                    // set current revision
                    current_revision = (previous_revision_number + 1) + '-' +
                        hex_sha256 ('' + previous_revision +
                                    JSON.stringify (metadata_file_content));
                    current_revision_file_path = command.getDocId() + '.' +
                        current_revision;
                    am.call(o,'checkForConflicts');
                },function (error) {
                    if (error.status === 404) {
                        am.call(o,'error',[{
                            status:404,statusText:'Not Found',
                            error:'not_found',reason:'missing',
                            message:'Document not found.'
                        }]);
                    } else {
                        am.call(o,'error',[error]);
                    }
                }
            );
        };
        o.checkForConflicts = function () {
            var rev;
            for (rev in metadata_file_content) {
                if (rev !== previous_revision) {
                    on_conflict = true;
                    failerror = {
                        status:409,error:'conflict',
                        statusText:'Conflict',reason:'document update conflict',
                        message:'There is one or more conflicts'
                    };
                    break;
                }
            }
            am.call(o,'updateMetadata');
        };
        o.updateMetadata = function (){
            var previous_creation_date, revision_history = [], id = '';
            if (metadata_file_content[previous_revision]) {
                previous_creation_date = metadata_file_content[
                    previous_revision]._creation_date;
                revision_history = metadata_file_content[
                    previous_revision]._revisions;
                delete metadata_file_content[previous_revision];
            }
            id = current_revision;
            id = id.split('-'); id.shift(); id = id.join('-');
            revision_history.unshift(id);
            metadata_file_content[current_revision] = {
                _creation_date: previous_creation_date || now.getTime(),
                _last_modified: now.getTime(),
                _revisions: revision_history,
                _conflict: on_conflict,
                _deleted: true
            };
            if (on_conflict) {
                conflict_object =
                    priv.createConflictObject(
                        command, metadata_file_content, current_revision
                    );
            }
            am.call(o,'saveMetadataOnDistant');
        };
        o.saveMetadataOnDistant = function (){
            priv.saveMetadataToDistant(
                command, metadata_file_path, metadata_file_content,
                function (result) {
                    am.call(o,'deletePreviousRevision');
                    if (on_conflict) {
                        am.call(o,'error');
                    } else {
                        am.call(o,'success');
                    }
                },function (error) {
                    am.call(o,'error',[error]);
                }
            );
        };
        o.deletePreviousRevision = function (){
            if (previous_revision !== '0' /*&& !on_conflict*/) {
                priv.deleteAFile (
                    command, previous_revision_file_path,
                    empty_fun,empty_fun);
            }
        };
        o.success = function (revision){
            var a = {ok:true,id:command.getDocId(),
                     rev:revision || current_revision};
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            if (command.getOption('revs')) {
                a.revisions = priv._revs(metadata_file_content,
                                         current_revision);
            }
            if (command.getOption('revs_info')) {
                a.revs_info = priv._revs_info(metadata_file_content);
            }
            if (command.getOption('conflicts')) {
                a.conflicts = conflict_object;
            }
            that.success(a);
        };
        o.error = function (error){
            var err = error || failerror ||
                {status:0,statusText:'Unknown',error:'unknown_error',
                 message:'Unknown error.',reason:'unknown error'};
            if (current_revision) {
                err.rev = current_revision;
            }
            if (command.getOption('revs')) {
                err.revisions = priv._revs(metadata_file_content,
                                           current_revision);
            }
            if (command.getOption('revs_info')) {
                err.revs_info = priv._revs_info(metadata_file_content);
            }
            if (command.getOption('conflicts')) {
                err.conflicts = conflict_object;
            }
            am.neverCall(o,'error');
            am.neverCall(o,'success');
            that.error(err);
        };
        am.call(o,'getDistantMetadata');
    }; // end remove

    return that;
};
jIO.addStorageType('conflictmanager', newConflictManagerStorage);
