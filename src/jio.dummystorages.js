// Adds 3 dummy storages to JIO
// type:
//     - dummyallok
//     - dummyallfail
//     - dummyallnotfound
//     - dummyall3tries
(function () { var jioDummyStorageLoader = function ( jIO ) {

    ////////////////////////////////////////////////////////////////////////////
    // Dummy Storage 1 : all ok
    var newDummyStorageAllOk = function ( spec, my ) {
        var that = my.basicStorage( spec, my );

        var super_serialized = that.serialized;
        that.serialized = function () {
            var o = super_serialized();
            o.username = spec.username;
            return o;
        };

        // Fake revisions
        var fakeCount = 0;
        var generateRevision = function(command, action, reset){

            var that = {},
                priv = {},
                fakeRevision = "",
                fakeCount = reset === true ? 0 : fakeCount,
                now = Date.now();

            that.makeHash = function(){
                return that.hashCode('' + command.getDocId() + ' ' + now + '');
            };

            that.hashCode = function (string) {
                return hex_sha256(string);
            };

            that.generateNextRev = function (previous_revision, string) {
                return (parseInt(previous_revision.split('-')[0],10)+1) + '-' +
                    priv.hashCode(previous_revision + string);
            };

            if ( fakeRevision === "" && fakeCount === 0 ){
                fakeRevision = '1-'+that.makeHash();
            } else {
                if( action !== "post"){
                    fakeRevision = that.generateNextRev( fakeRev, that.makeHash );
                }
            }

            return fakeRevision;
        };
        

        that.post = function (command) {
            setTimeout (function () {
                that.success({
                    ok:true,
                    id:command.getDocId(),
                    rev:generateRevision(command, "post", true)
                });
            }, 100);
        }; // end post

        that.put = function (command) {
            setTimeout (function () {
                that.success ({
                    ok:true,
                    id:command.getDocId(),
                    rev:generateRevision(command, "put", true)
                });
            }, 100);            // 100 ms, for jiotests simple job waiting
        }; // end put

        that.get = function (command) {
            setTimeout(function () {
                that.success ({
                    _id:command.getDocId(),
                    content:'content',
                    _creation_date: 10000,
                    _last_modified: 15000
                });
            }, 100);
        }; // end get

        that.allDocs = function (command) {
            setTimeout(function () {
                var o = {
                    total_rows: 2,
                    rows: [{
                        id:'file',
                        key:'file',
                        value: {
                            content:'filecontent',
                            _creation_date:10000,
                            _last_modified:15000
                        }
                    },{
                        id:'memo',
                        key:'memo',
                        value: {
                            content:'memocontent',
                            _creation_date:20000,
                            _last_modified:25000
                        }
                    }]
                };
                if (command.getOption('metadata_only')) {
                    delete o.rows[0].value.content;
                    delete o.rows[1].value.content;
                }
                that.success (o);
            }, 100);
        }; // end allDocs

        that.remove = function (command) {
            setTimeout (function () {
                that.success ({ok:true,id:command.getDocId()});
            }, 100);
        }; // end remove

        return that;
    },
    // end Dummy Storage All Ok
    ////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////
    // Dummy Storage 2 : all fail
    newDummyStorageAllFail = function ( spec, my ) {
        var that = my.basicStorage( spec, my ), priv = {};

        priv.error = function () {
            setTimeout (function () {
                that.error ({status:0,statusText:'Unknown Error',
                             error:'unknown_error',
                             message:'Execution encountred an error.',
                             reason:'Execution encountred an error'});
            });
        };

        that.post = function (command) {
            priv.error();
        }; // end post

        that.put = function (command) {
            priv.error();
        }; // end put

        that.get = function (command) {
            priv.error();
        }; // end get

        that.allDocs = function (command) {
            priv.error();
        }; // end allDocs

        that.remove = function (command) {
            priv.error();
        }; // end remove
        return that;
    },
    // end Dummy Storage All Fail
    ////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////
    // Dummy Storage 3 : all not found
    newDummyStorageAllNotFound = function ( spec, my ) {
        var that = my.basicStorage( spec, my );

        that.post = function (command) {
            setTimeout (function () {
                that.success ({
                    ok:true,
                    id:command.getDocId()
                });
            }, 100);
        }; // end post

        that.put = function (command) {
            setTimeout (function () {
                that.success ({
                    ok:true,
                    id:command.getDocId()
                });
            }, 100);
        }; // end put

        that.get = function (command) {
            setTimeout(function () {
                that.error ({status:404,statusText:'Not Found',
                             error:'not_found',
                             message:'Document "'+ command.getDocId() +
                             '" not found.',
                             reason:'Document "'+ command.getDocId() +
                             '" not found'});
            }, 100);
        }; // end get

        that.allDocs = function (command) {
            setTimeout(function () {
                that.error ({status:404,statusText:'Not Found',
                             error:'not_found',
                             message:'User list not found.',
                             reason:'User list not found'});
            }, 100);
        }; // end allDocs

        that.remove = function (command) {
            setTimeout (function () {
                that.success ({
                    ok:true,
                    id:command.getDocId()
                });
            }, 100);
        }; // end remove

        return that;
    },
    // end Dummy Storage All Not Found
    ////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////
    // Dummy Storage 4 : all 3 tries
    newDummyStorageAll3Tries = function ( spec, my ) {
        var that = my.basicStorage( spec, my ), priv = {};

        // this serialized method is used to make simple difference between
        // two dummyall3tries storages:
        // so  {type:'dummyall3tries',a:'b'} differs from
        //     {type:'dummyall3tries',c:'d'}.
        var super_serialized = that.serialized;
        that.serialized = function () {
            var o = super_serialized();
            o.applicationname = spec.applicationname;
            return o;
        };

        priv.doJob = function (command,if_ok_return) {
            // wait a little in order to simulate asynchronous operation
            setTimeout(function () {
                priv.Try3OKElseFail (command.getTried(),if_ok_return);
            }, 100);
        };
        priv.Try3OKElseFail = function (tries,if_ok_return) {
            if ( typeof tries === 'undefined' ) {
                return that.error ({status:0,statusText:'Unknown Error',
                                    error:'unknown_error',
                                    message:'Cannot get tried.',
                                    reason:'Cannot get tried'});
            }
            if ( tries < 3 ) {
                return that.retry (
                    {message:'' + (3 - tries) + ' tries left.'});
            }
            if ( tries === 3 ) {
                return that.success (if_ok_return);
            }
            if ( tries > 3 ) {
                return that.error ({status:1,statusText:'Too Much Tries',
                                    error:'too_much_tries',
                                    message:'Too much tries.',
                                    reason:'Too much tries'});
            }
        };

        that.post = function (command) {
            priv.doJob (command,{ok:true,id:command.getDocId()});
        }; // end post

        that.put = function (command) {
            priv.doJob (command,{ok:true,id:command.getDocId()});
        }; // end put

        that.get = function (command) {
            priv.doJob (command,{
                _id: command.getDocId(),
                content: 'content '+command.getDocId(),
                _creation_date: 11000,
                _last_modified: 17000
            });
        }; // end get

        that.allDocs = function (command) {
            priv.doJob(command,{
                total_rows:2,
                rows:[{
                    id:'file',key:'file',
                    value:{
                        _creation_date:10000,
                        _last_modified:15000
                    }
                },{
                    id:'memo',key:'memo',
                    value:{
                        _creation_date:20000,
                        _last_modified:25000
                    }
                }]});
        }; // end allDocs

        that.remove = function (command) {
            priv.doJob(command,{ok:true,id:command.getDocId()});
        }; // end remove

        return that;
    };
    // end Dummy Storage All 3 Tries
    ////////////////////////////////////////////////////////////////////////////

    // add key to storageObjectType of global jio
    jIO.addStorageType('dummyallok', newDummyStorageAllOk);
    jIO.addStorageType('dummyallfail', newDummyStorageAllFail);
    jIO.addStorageType('dummyallnotfound', newDummyStorageAllNotFound);
    jIO.addStorageType('dummyall3tries', newDummyStorageAll3Tries);

};

if (window.requirejs) {
    define ('JIODummyStorages',['jIO'], jioDummyStorageLoader);
} else {
    jioDummyStorageLoader ( jIO );
}

}());
