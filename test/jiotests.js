(function () { var thisfun = function(loader) {
    var JIO = loader.JIO,
    LocalOrCookieStorage = loader.LocalOrCookieStorage,
    sjcl = loader.sjcl,
    Base64 = loader.Base64,
    $ = loader.jQuery;

//// Tools
var empty_fun = function (){},
contains = function (array,content) {
    var i;
    if (typeof array !== 'object') {
        return undefined;
    }
    for (i = 0; i < array.length || 0; i+= 1) {
        if (array[i] === content) {
            return true;
        }
    }
    return false;
},
clean_up_local_storage_function = function(){
    var k, storageObject = LocalOrCookieStorage.getAll();
    for (k in storageObject) {
        var splitk = k.split('/');
        if ( splitk[0] === 'jio' ) {
            LocalOrCookieStorage.deleteItem(k);
        }
    }
    var d = document.createElement ('div');
    d.setAttribute('id','log');
    document.querySelector ('body').appendChild(d);
    // remove everything
    localStorage.clear();
},
base_tick = 30000,
basic_test_function_generator = function(o,res,value,message) {

    return function(err,val) {
        var jobstatus = (err?'fail':'done'),
            val = ( isEmptyObject(value) && isUUID(val._id) ) ? {} : val;

        switch (res) {
        case 'status':
            err = err || {}; val = err.status;
            break;
        case 'jobstatus':
            val = jobstatus;
            break;
        case 'value':
            val = err || val;
            break;
        default:
            return;
        }
        deepEqual (val,value,message);
    };
},
basic_spy_function = function(o,res,value,message,fun) {

    fun = fun || 'f';
    o[fun] = basic_test_function_generator(o,res,value,message);
    o.t.spy(o,fun);
},
basic_tick_function = function (o) {
    var tick, fun, i = 1;
    tick = 1000;
    fun = fun || 'f';

    if (typeof arguments[i] === 'number') {
        tick = arguments[i]; i++;
    }
    if (typeof arguments[i] === 'string') {
        fun = arguments[i]; i++;
    }
    o.clock.tick(tick);
    if (!o[fun].calledOnce) {
        if (o[fun].called) {
            ok(false, 'too much results (o.' + fun +')');
        } else {
            ok(false, 'no response (o.' + fun +')');
        }
    }
},
// debug function to show custumized log at the bottom of the page
my_log = function (html_string) {
    document.querySelector ('div#log').innerHTML += html_string + '<hr/>';
},
getXML = function (url) {
    var tmp = '';
    $.ajax({'url':url,async:false,
            dataType:'text',success:function(xml){tmp=xml;}});
    return tmp;
},
objectifyDocumentArray = function (array) {
    var obj = {}, k;
    for (k = 0; k < array.length; k += 1) {
        obj[array[k].id] = array[k];
    }
    return obj;
},
addFileToLocalStorage = function (user,appid,file) {
    var i, l, found = false, filenamearray,
    userarray = LocalOrCookieStorage.getItem('jio/local_user_array') || [];
    for (i = 0, l = userarray.length; i < l; i+= 1) {
        if (userarray[i] === user) { found = true; }
    }
    if (!found) {
        userarray.push(user);
        LocalOrCookieStorage.setItem('jio/local_user_array',userarray);
        LocalOrCookieStorage.setItem(
            'jio/local_file_name_array/'+user+'/'+appid,[file._id]);
    } else {
        filenamearray =
            LocalOrCookieStorage.getItem(
                'jio/local_file_name_array/'+user+'/'+appid) || [];
        filenamearray.push(file._id);
        LocalOrCookieStorage.setItem(
            'jio/local_file_name_array/'+user+'/'+appid,
            filenamearray);
        LocalOrCookieStorage.setItem(
            'jio/local/'+user+'/'+appid+'/'+file._id,
            file);
    }
    LocalOrCookieStorage.setItem(
        'jio/local/'+user+'/'+appid+'/'+file._id,
        file);
},
removeFileFromLocalStorage = function (user,appid,file) {
    var i, l, newarray = [],
    filenamearray =
        LocalOrCookieStorage.getItem(
            'jio/local_file_name_array/'+user+'/'+appid) || [];
    for (i = 0, l = filenamearray.length; i < l; i+= 1) {
        if (filenamearray[i] !== file._id) {
            newarray.push(filenamearray[i]);
        }
    }
    LocalOrCookieStorage.setItem('jio/local_file_name_array/'+user+'/'+appid,
                                 newarray);
    LocalOrCookieStorage.deleteItem(
        'jio/local/'+user+'/'+appid+'/'+file._id);
},
makeRevsAccordingToRevsInfo = function (revs,revs_info) {
    var i, j;
    for (i = 0; i < revs.start; i+= 1) {
        for (j = 0; j < revs_info.length; j+= 1) {
            var id = revs_info[j].rev.split('-'); id.shift(); id = id.join('-');
            if (revs.ids[i] === id) {
                revs.ids[i] = revs_info[j].rev.split('-')[0];
                break;
            }
        }
    }
},
checkRev = function (rev) {
    if (typeof rev === 'string') {
        if (rev.split('-').length > 1 &&
            parseInt(rev.split('-')[0],10) > 0) {
            return rev;
        }
    }
    return 'ERROR: not a good revision!';
},
checkConflictRow = function (row) {
    var fun;
    if (typeof row === 'object') {
        if (row.value && typeof row.value._solveConflict === 'function') {
            fun = row.value._solveConflict;
            row.value._solveConflict = 'function';
        }
    }
    return fun;
},
getHashFromRev = function (rev) {
    var id = rev;
    if (typeof id === 'string') {
        id = id.split('-');
        id.shift(); id = id.join('-');
    }
    return id;
},
revs_infoContains = function (revs_info, rev) {
    var i;
    if (typeof revs_info !== 'object') {
        return undefined;
    }
    for (i = 0; i < revs_info.length || 0; i+= 1) {
        if (revs_info[i].rev && revs_info[i].rev === rev) {
            return true;
        }
    }
    return false;
},
isUUID = function( _id ){

    var re = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
    if ( re.test( _id ) ){
        return true;
    } else {
        return false;
    }
},
isEmptyObject = function( obj) {
    var key;

    if (obj.length && obj.length > 0){
        return false;
    }
    if (obj.length && obj.length === 0){
        return true;
    }
    for (key in obj) {
        if (hasOwnProperty.call(obj, key)){
            return false;
        }
    }
    return true;
},
//// end tools

//// test methods ////
checkReply = function(o,tick,fun){
    basic_tick_function(o,tick,fun);
},
checkFile = function (response, o, tick, value, fun) {
    o.tmp = localstorage.getItem('jio/local/'+o.username+'/jiotests/'+
        response.id+'/'+response.rev );

    // remove everything not needed for basic response
    o.tmp.ok = true;
    delete o.tmp._revisions;
    delete o.tmp._revs_info;
    delete o.tmp.content;

    if (o.tmp) {
        deepEqual (o.tmp,{
            "ok":response.ok,
            "_id":response.id,
            "_rev":response.rev,
            },'document was created or updated');
    } else {
        ok (false, 'document was not created or updated');
    }
},

checkTreeNode = function (response,o,tick,value,fun) {
    o.tmp = localstorage.getItem('jio/local/'+o.username+'/jiotests/'+
        response.id+'/revision_tree' );

    if (o.tmp) {
        deepEqual (o.tmp,o.buildTestTree,'tree node was created');
    } else {
        ok (false, 'tree node was not created');
    }
};



//// QUnit Tests ////

module ('Jio Global tests');

test ( "Jio simple methods", function () {
    var clock = this.sandbox.useFakeTimers(); clock.tick(base_tick);
    // Test Jio simple methods
    // It checks if we can create several instance of jio at the same
    // time. Checks if they don't overlap informations, if they are
    // started and stopped correctly and if they are ready when they
    // have to be ready.

    var o = {};
    o.jio = JIO.newJio();
    ok ( o.jio, 'a new jio -> 1');

    o.jio2 = JIO.newJio();
    ok ( o.jio2, 'another new jio -> 2');

    JIO.addStorageType('qunit', empty_fun);

    ok ( o.jio2.getId() !== o.jio.getId(), '1 and 2 must be different');

    o.jio.stop();
    o.jio2.stop();

});

// test ( 'Jio Publish/Sububscribe/Unsubscribe methods', function () {
//     // Test the Publisher, Subscriber of a single jio.
//     // It is just testing if these function are working correctly.
//     // The test publishes an event, waits a little, and check if the
//     // event has been received by the callback of the previous
//     // subscribe. Then, the test unsubscribe the callback function from
//     // the event, and publish the same event. If it receives the event,
//     // the unsubscribe method is not working correctly.

//     var o = {};
//     o.jio = JIO.newJio();

//     var spy1 = this.spy();

//     // Subscribe the pubsub_test event.
//     o.callback = o.jio.subscribe('pubsub_test',spy1);
//     // And publish the event.
//     o.jio.publish('pubsub_test');
//     ok (spy1.calledOnce, 'subscribing & publishing, event called once');

//     o.jio.unsubscribe('pubsub_test',spy1);
//     o.jio.publish('pubsub_test');
//     ok (spy1.calledOnce, 'unsubscribing, same event not called twice');

//     o.jio.stop();
// });

module ( 'Jio Dummy Storages' );

test ('All tests', function () {
    // Tests all dummy storages from jio.dummystorages.js
    // It is simple tests, but they will be used by replicate storage later
    // for sync operation.

    var o = {}; o.t = this; o.clock = o.t.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.spy = basic_spy_function;
    o.tick = basic_tick_function;

    // All Ok Dummy Storage
    o.jio = JIO.newJio({'type':'dummyallok'});

    // post empty
    o.jio.post({},
        function(err, response) {
            o.spy(o,'value',{"ok":true, "id":response.id, "rev":response.rev},
                  'dummyallok post/create empty object');
            o.f(response);
        });
    o.tick(o);

    // post
    o.jio.post({"content":"basic_content"},
        function(err, response) {
            o.spy(o,'value',{"ok":true, "id":response.id, "rev":response.rev},
                  'dummyallok post/create object');
            o.f(response);
        });
    o.tick(o);

    // put
    o.jio.put({"_id":"file","content":"basic_content"},
        function(err, response) {
            o.spy(o,'value',{"ok":true, "id":"file", "rev":response.rev},
                  'dummyallok put create object');
            o.f(response);
        });
    o.tick(o);

    /*

    // load
    o.spy(o,'value',{_id:'file',content:'content',_last_modified:15000,
                     _creation_date:10000},'dummyallok loading');
    o.jio.get('file',o.f);
    o.tick(o);

    // remove
    o.spy(o,'value',{ok:true,id:"file"},'dummyallok removing');
    o.jio.remove({_id:'file'},o.f);
    o.tick(o);

    // get list
    o.spy (o,'value',{
        total_rows:2,
        rows:[{
            id:'file',key:'file',
            value:{
                content:'filecontent',
                _last_modified:15000,
                _creation_date:10000
            }
        },{
            id:'memo',key:'memo',
            value:{
                content:'memocontent',
                _last_modified:25000,
                _creation_date:20000
            }
        }]
    },'dummyallok getting list');
    o.jio.allDocs({metadata_only:false},o.f);
    o.tick(o);
    o.jio.stop();


    o.jio = JIO.newJio({'type':'dummyallok'});
    // save
    o.spy(o,'value',{ok:true,id:'file'},'dummyallok saving1','f');
    o.spy(o,'value',{ok:true,id:'file2'},'dummyallok saving2','f2');
    o.spy(o,'value',{ok:true,id:'file3'},'dummyallok saving3','f3');
    o.jio.put({_id:'file',content:'content'},o.f);
    o.jio.put({_id:'file2',content:'content2'},o.f2);
    o.jio.put({_id:'file3',content:'content3'},o.f3);
    o.tick(o, 1000, 'f');
    o.tick(o, 'f2');
    o.tick(o, 'f3');
    o.jio.stop();


    // All Fail Dummy Storage
    o.jio = JIO.newJio({'type':'dummyallfail'});
    // save
    o.spy (o,'status',0,'dummyallfail saving');
    o.jio.put({_id:'file',content:'content'},o.f);
    o.tick(o);
    // load
    o.spy (o,'status',0,'dummyallfail loading');
    o.jio.get('file',o.f);
    o.tick(o);
    // remove
    o.spy (o,'status',0,'dummyallfail removing');
    o.jio.remove({_id:'file'},o.f);
    o.tick(o);
    // get list
    o.spy (o,'status',0,'dummyallfail getting list');
    o.jio.allDocs(o.f);
    o.tick(o);
    o.jio.stop();

    // All Not Found Dummy Storage
    o.jio = JIO.newJio({'type':'dummyallnotfound'});
    // save
    o.spy(o,'value',{ok:true,id:'file'},'dummyallnotfound saving');
    o.jio.put({_id:'file',content:'content'},o.f);
    o.tick(o);
    // load
    o.spy(o,'status',404,'dummyallnotfound loading')
    o.jio.get('file',o.f);
    o.tick(o);
    // remove
    o.spy(o,'value',{ok:true,id:'file'},'dummyallnotfound removing');
    o.jio.remove({_id:'file'},o.f);
    o.tick(o);
    // get list
    o.spy(o,'status',404,'dummyallnotfound getting list');
    o.jio.allDocs (o.f);
    o.tick(o);
    o.jio.stop();

    */
});
/*
module ( 'Jio Job Managing' );

test ('Simple Job Elimination', function () {
    var clock = this.sandbox.useFakeTimers(); clock.tick(base_tick);
    var o = {}, id = 0;
    o.f1 = this.spy(); o.f2 = this.spy();

    o.jio = JIO.newJio({type:'dummyallok',applicationname:'jiotests'});
    id = o.jio.getId();
    o.jio.put({_id:'file',content:'content'},
              {max_retry:1},o.f1);
    ok(LocalOrCookieStorage.getItem('jio/job_array/'+id)[0],
       'job creation');
    o.jio.remove({_id:'file'},{max_retry:1},o.f2);
    o.tmp = LocalOrCookieStorage.getItem('jio/job_array/'+id)[0];
    deepEqual(o.tmp.command.label,'remove','job elimination');
    o.jio.stop();
});

test ('Simple Job Replacement', function () {
    // Test if the second job write over the first one

    var o = {};
    o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.id = 0;
    o.f1 = function (err,val) {
        if (err) {
            o.err = err;
        } else {
            o.err = {status:'done'};
        }
    };
    this.spy(o,'f1');
    o.f2 = this.spy();

    o.jio = JIO.newJio({type:'dummyallok',applicationname:'jiotests'});
    o.id = o.jio.getId();
    o.jio.put({_id:'file',content:'content'},o.f1);
    o.clock.tick(10);
    o.jio.put({_id:'file',content:'content'},o.f2);
    deepEqual(LocalOrCookieStorage.getItem(
        'jio/job_array/'+o.id)[0].date,base_tick + 10,
              'The first job date have to be equal to the second job date.');
    o.clock.tick(1000);
    deepEqual([o.f1.calledOnce,o.err.status],[true,12],
       'callback for the first save request -> result fail');
    ok(o.f2.calledOnce,'second callback is called once');
    o.jio.stop();

    o.jio = JIO.newJio({type:'dummyallok',applicationname:'jiotests'});
    o.ok1 = 0;
    o.jio.get('file1',function (err,val) {
        deepEqual (err || val,
                   {_id:'file1',content:'content',
                    _creation_date:10000,_last_modified:15000},
                   'First load');
        o.ok1 ++;
    });
    o.ok2 = 0;
    o.jio.get('file2',function (err,val) {
        deepEqual (err || val,
                   {_id:'file2',content:'content',
                    _creation_date:10000,_last_modified:15000},
                   'Second load must not replace the first one');
        o.ok2 ++;
    });
    o.clock.tick(1000);
    if (o.ok1 !== 1) {
        ok (false,'no response / too much response');
    }
    if (o.ok2 !== 1) {
        ok (false,'no response / too much response');
    }
    o.jio.stop();
});

test ('Simple Job Waiting', function () {
    // Test if the second job doesn't erase the first on going one

    var o = {};
    o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.id = 0;
    o.f = function (err,val) {
        deepEqual(err || val,{ok:true,id:'file'},'job 1 result');
    };
    o.f3 = o.f; this.spy(o,'f3');
    o.f4 = o.f; this.spy(o,'f4');
    o.checkCallback = function (fun_name,message) {
        if (!o[fun_name].calledOnce) {
            if (o[fun_name].called) {
                ok(false, 'too much response');
            } else {
                ok(false, 'no response');
            }
        } else {
            ok(true,message);
        }
    };

    o.jio = JIO.newJio({type:'dummyallok',applicationname:'jiotests'});
    o.id = o.jio.getId();
    o.jio.put({_id:'file',content:'content'},o.f3);
    o.clock.tick(200);
    o.jio.put({_id:'file',content:'content1'},o.f4);

    o.tmp0 = LocalOrCookieStorage.getItem('jio/job_array/'+o.id)[0];
    o.tmp1 = LocalOrCookieStorage.getItem('jio/job_array/'+o.id)[1];

    ok(o.tmp0 && o.tmp0.id === 1,'job 1 exists');
    deepEqual(o.tmp0.status.label,'on going','job 1 is on going');
    ok(o.tmp1 && o.tmp1.id === 2,'job 2 exists');
    deepEqual(o.tmp1.status.label,'wait','job 2 waiting');
    deepEqual(o.tmp1.status.waitforjob,[1],
              'job 2 must wait for the first to end');

    o.clock.tick(1000);
    o.checkCallback('f3','first request passed');
    o.checkCallback('f4','restore waiting job');

    o.jio.stop();
});

test ('Simple Time Waiting' , function () {
    // Test if the job that have fail wait until a certain moment to restart.
    // It will use the dummyall3tries, which will work after the 3rd try.

    var o = {}, clock = this.sandbox.useFakeTimers(), id = 0;
    clock.tick(base_tick);
    o.f = function (err,val) {
        if (err) {
            o.res = err;
        } else {
            o.res = val;
        }
    };
    this.spy(o,'f');
    o.jio = JIO.newJio({type:'dummyall3tries',applicationname:'jiotests'});
    o.jio.put({_id:'file',content:'content'},{max_retry:3},o.f);
    clock.tick(10000);
    if (!o.f.calledOnce) {
        if (o.f.called) {
            ok(false,'callback called too much times.');
        } else {
            ok(false,'no response.');
        }
    }
    deepEqual(o.res,{ok:true,id:'file'},'job done.');
    o.jio.stop();
});

module ( 'Jio Restore');

test ('Restore old Jio', function() {
    var o = {};
    o.clock = this.sandbox.useFakeTimers();
    o.f = function() {
        ok(false,'must never be called!');
    };
    this.spy(o,'f');
    o.jio = JIO.newJio({type:'dummyall3tries',applicationname:'jiotests'});
    o.id = o.jio.getId();
    ok(true,'create jio, id = ' + o.id);
    o.jio.put({_id:'file',content:'content'},{max_retry:3},o.f);
    o.clock.tick(1000);
    o.jio.close();
    o.jio = JIO.newJio({type:'dummyallok',applicationname:'jiotests'});
    o.clock.tick(11000);        // 10 sec
    deepEqual(LocalOrCookieStorage.getItem('jio/job_array/'+o.id),null,
              'job array list must be empty');
    o.tmp1 = LocalOrCookieStorage.getItem('jio/job_array/'+o.jio.getId());
    if (o.tmp1.length > 0) {
        deepEqual([o.tmp1[0].command.label,o.tmp1[0].command.doc._id,
                   o.tmp1[0].command.doc.content],
                  ['put','file','content'],
                  'job which id is id = ' +o.jio.getId()+', restored the jio');
    } else {
        ok (false, 'The recovered job must exists');
    }
    o.jio.stop();
});

*/

module ( 'Jio LocalStorage' );

// ============================== POST ==========================
test ('Post', function(){

    // runs following assertions
    // 1) POST with id - should be an error
    // 2) POST with attachment - should be an error
    // 3) POST CREATE with content
    // 4) check that document is created with UUID.revision
    // 5) check that document revision tree is created
    // 6) POST UPDATE

    var o = {};
        o.t = this;
        o.clock = o.t.sandbox.useFakeTimers(),
        localstorage = {
            getItem: function (item) {
                return JSON.parse (localStorage.getItem(item));
            },
            setItem: function (item,value) {
                return localStorage.setItem(item,JSON.stringify(value));
            },
            deleteItem: function (item) {
                delete localStorage[item];
            }
        };

    o.clock.tick(base_tick);
    o.spy = basic_spy_function;
    o.clean = clean_up_local_storage_function();
    o.username = 'MrPost';
    o.testRevisionStorage = [];

    // let's go
    o.jio = JIO.newJio({ type:'local', username:o.username,
                         applicationname:'jiotests' });
    // ========================================
    // 1) POST with id
    o.jio.post({"_id":'file',"content":'content'},function(err, response){
        o.spy (o,'value',{
            "error": 'forbidden',
            "message": 'Forbidden',
            "reason": 'ID cannot be supplied with a POST request. Please use PUT',
            "status": 403,
            "statusText": 'Forbidden'
        },'POST with id = 403 forbidden');
        o.f(err);
    });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 2) POST attachment
    o.jio.post({"_id":'file/ABC', "mimetype":'text/html', 
               "content":'<b>hello</b>'},function(err, response){
        o.spy (o,'value',{
            "error": 'forbidden',
            "message": 'Forbidden',
            "reason": 'Attachment cannot be added with a POST request',
            "status": 403,
            "statusText": 'Forbidden'
            },'POST attachment = 403 forbidden'); 
        o.f(err);
    });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 3) POST content
    o.jio.post({"content":'content'},
        function(err, response) {
            o.spy(o,'value',{"ok":true,"id":response.id,"rev":response.rev},
                    'POST content = ok');
            o.f(response);

            // store falseRevision
            o.falseRevision = response.rev;

            // build tree manually
            o.testRevisionStorage.push(response.rev);
            o.buildTestTree = {"kids":[],"rev":o.testRevisionStorage[0],
                "status":'available',"type":'leaf'};

            // 4) check if document is created and correct
            checkFile(response, o, null, true);
            // 5) check if document tree is created and correct
            checkTreeNode(response, o, null, true);
        });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // END POST
    o.jio.stop();
    o.clean;
});

// ============================== PUT ==========================

test ('Put', function(){

    // runs following assertions
    // 1)  PUT without ID = 409
    // 2)  PUT with wrong ID/rev = 404
    // 3)  PUT CREATE response
    // 4)  check file was created
    // 5)  check tree was created
    // 6)  PUT UPDATE response
    // 7)  check file was replaced
    // 8)  check tree was updated
    // 9)  PUT UPDATE 2 response
    // 10) check file was replaced
    // 11) check tree was updated
    // 12) PUT UPDATE false revision = 409
    // 13) SYNC-PUT no revs_info = 409
    // 14) SYNC-PUT revs_info response
    // 15) check if file created
    // 16) check if tree was merged
    // 17) SYNC-PUT revs_info dead leaf response
    // 18) check that file was NOT created
    // 19) check that tree was updated

    var fake_rev_0,
        fake_rev_1,
        fake_rev_2,
        fake_id_0,
        fake_id_1,
        fake_id_2,

        o = {}; 
        o.t = this;
        o.clock = o.t.sandbox.useFakeTimers();
        o.falseRevision;
        localstorage = {
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

    o.clock.tick(base_tick);
    o.spy = basic_spy_function;
    o.clean = clean_up_local_storage_function();
    o.username = 'MrPutt';
    o.testRevisionStorage = [];

    // let's go
    o.jio = JIO.newJio({ type:'local', username:o.username,
                         applicationname:'jiotests' });
    // ========================================
    // 1) PUT without ID
    o.jio.put({"content":'content'},function(err, response){

        o.spy (o,'value',{
            "error": 'conflict',
            "message": 'Document update conflict.',
            "reason": 'Missing Document ID and or Revision',
            "status": 409,
            "statusText": 'Conflict'
            },'PUT without id = 409 Conflict');
        o.f(err);
    });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    //  2) PUT wrong id/rev
    o.jio.put({"content":'content', "_id":'myDoc',
               "_rev":'1-ABCDEFG'}, function(err, response){
        o.spy (o,'value',{
            "error": 'not found',
            "message": 'Document not found.',
            "reason": 'Document not found, please check revision and/or ID',
            "status": 404,
            "statusText": 'Not found'
        },'PUT with wrong id/revision = 404 Not found');
        o.f(err);
    });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 3) PUT content
    o.jio.put({"content":'content',"_id":'myDoc'},
        function(err, response) {

            o.spy(o,'value',{"ok":true,"id":response.id,"rev":response.rev},
                    'PUT content = ok');
            o.f(response);

            o.falseRevision = response.rev;
            o.testRevisionStorage.unshift(response.rev);
            o.buildTestTree = {"kids":[],"rev":o.testRevisionStorage[0],
                "status":'available',"type":'leaf'};
            // ========================================
            // 4) check file was created
            checkFile(response, o, null, true);
            // ========================================
            // 5) check tree was created
            checkTreeNode(response, o, null, true);
        });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 6) PUT UPDATE (modify content)
    o.jio.put({"content":'content_modified',"_id":'myDoc',
                    "_rev":o.testRevisionStorage[0]},
        function(err, response) {
            o.spy(o,'value',{"ok":true,"id":response.id,"rev":response.rev},
                'PUT content = ok');
            o.f(response);

            o.testRevisionStorage.unshift(response.rev);
            o.buildTestTree = {"kids":[{"kids":[],"rev":
                o.testRevisionStorage[0],"status":'available',
                "type":'leaf'}],"rev":o.testRevisionStorage[1],
                "status":'deleted',"type":'branch'};
            // ========================================
            // 7) check document was replaced
            checkFile(response, o, null, true);
            // ========================================
            // 8) check tree was updated
            checkTreeNode(response, o, null, true);
        });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 9. update document (modify again)
    o.jio.put({"content":'content_modified_again',
                "_id":'myDoc', "_rev":o.testRevisionStorage[0]},
        function(err, response) {
            o.spy(o,'value',{"ok":true,"id":response.id,
                    "rev":response.rev}, 'PUT content = ok');
            o.f(response);

            o.testRevisionStorage.unshift(response.rev);
            o.buildTestTree = {"kids":[{"kids":[{"kids":[],
                "rev":o.testRevisionStorage[0],"status":'available',
                "type":'leaf'}],"rev":o.testRevisionStorage[1],
                "status":'deleted',"type":'branch'}],
                "rev":o.testRevisionStorage[2],"status":'deleted',
                "type":'branch'};

            // 10) check document was replaced
            checkFile(response, o, null, true);
            // 11) check tree was updated
            checkTreeNode(response, o, null, true);

        });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 12) PUT false revision
    o.jio.put({"content":'content_modified_false',
                "_id":'myDoc',
                "_rev":o.falseRevision},function(err, response){
        o.spy (o,'value',{
            "error": 'conflict',
            "message": 'Document update conflict.',
            "reason":
                'Revision supplied is not the latest revision',
            "status": 409,
            "statusText": 'Conflict'
        },'PUT false revision = 409 Conflict');
        o.f(err);
    });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 13) SYNC-PUT no revs_info
    o.jio.put({"content":'content_modified_false',
                "_id":'myDoc',
                "_rev":'1-abcdefg'},function(err, response){
        o.spy (o,'value',{
            "error": 'conflict',
            "message": 'Document update conflict.',
            "reason":
                'Missing revs_info required for sync-put',
            "status": 409,
            "statusText": 'Conflict'
        },'PUT no sync info = 409 Conflict');
        o.f(err);
    });
    checkReply(o,null,true);
    o.clock.tick(base_tick);

    // add a new document version with fake revs_info
    // the new document has the same origin and first edit,
    // then it was changed to a new version (3-a9d...),
    // which was changed to a fourth version (4-b5bb...),
    // the tree must merge on o.testRevisionStorage[1]
    // and add the two new dummy revisions into the final
    // tree. Also the new document should be stored
    // in local storage.
    fake_rev_2 = o.testRevisionStorage[2];
    fake_rev_1 = o.testRevisionStorage[1];
    fake_rev_0 = o.testRevisionStorage[0];
    fake_id_2 = o.testRevisionStorage[2].split('-')[1];
    fake_id_1 = o.testRevisionStorage[1].split('-')[1];
    fake_id_0 = o.testRevisionStorage[0].split('-')[1];
    // ========================================
    // 14) PUT UPDATE A TREE using revs_info
    o.jio.put({
        "content":'a_new_version',
        "_id":'myDoc',
        "_rev":"4-b5bb2f1657ac5ac270c14b2335e51ef1ffccc0a7259e14bce46380d6c446eb89",
        "_revs_info":[
            {"rev":"4-b5bb2f1657ac5ac270c14b2335e51ef1ffccc0a7259e14bce46380d6c446eb89","status":"available"},
            {"rev":"3-a9dac9ff5c8e1b2fce58e5397e9b6a8de729d5c6eff8f26a7b71df6348986123","status":"deleted"},
            {"rev":fake_rev_1,"status":"deleted"},
            {"rev":fake_rev_0,"status":"deleted"}
        ],
        "_revisions":{
            "start":4,
            "ids":[
                "b5bb2f1657ac5ac270c14b2335e51ef1ffccc0a7259e14bce46380d6c446eb89",
                "a9dac9ff5c8e1b2fce58e5397e9b6a8de729d5c6eff8f26a7b71df6348986123",
                fake_id_1,
                fake_id_0
                ]}
        },
        function(err, response) {
            o.buildTestTree = {
                "kids":[
                    {
                    "kids":[
                        {"kids":[],"rev":o.testRevisionStorage[0],"status":'available',"type":'leaf'},
                        {"kids":[{
                            "kids":[],
                            "rev":"4-b5bb2f1657ac5ac270c14b2335e51ef1ffccc0a7259e14bce46380d6c446eb89",
                            "status":'available', "type":'leaf'
                            }],
                            "rev":"3-a9dac9ff5c8e1b2fce58e5397e9b6a8de729d5c6eff8f26a7b71df6348986123",
                            "status":'deleted',"type":'branch'
                            }],
                    "rev":o.testRevisionStorage[1],"status":'deleted',"type":'branch'}],
                "rev":o.testRevisionStorage[2],"status":'deleted',"type":'branch'
            };
            o.spy(o,'value',{"ok":true,"id":response.id,
                    "rev":response.rev}, 'PUT SYNC = ok');
            o.f(response);
            // 15) check document was stored
            checkFile(response, o, null, true);
            // 16) check tree was updated
            checkTreeNode(response, o, null, true);
        });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // ========================================
    // 17) PUT UPDATE (deleted tree)
    o.jio.put({
        "content":'a_deleted_version',
        "_id":'myDoc',
        "_rev":"3-05210795b6aa8cb5e1e7f021960d233cf963f1052b1a41777ca1a2aff8fd4b61",
        "_revs_info":[
                {"rev":"3-05210795b6aa8cb5e1e7f021960d233cf963f1052b1a41777ca1a2aff8fd4b61","status":"deleted"},
                {"rev":"2-67ac10df5b7e2582f2ea2344b01c68d461f44b98fef2c5cba5073cc3bdb5a844","status":"deleted"},
                {"rev":fake_rev_2,"status":"deleted"}
        ],
        "_revisions":{
            "start":3,
            "ids":[
                "05210795b6aa8cb5e1e7f021960d233cf963f1052b1a41777ca1a2aff8fd4b61",
                "67ac10df5b7e2582f2ea2344b01c68d461f44b98fef2c5cba5073cc3bdb5a844",
                fake_id_2
            ]}
        },
        function(err, response) {

            o.buildTestTree = {
                "kids":[{
                    "kids":[
                        {"kids":[],
                         "rev":o.testRevisionStorage[0],
                         "status":'available',
                         "type":'leaf'
                        },
                        {"kids":[{
                            "kids":[],
                            "rev":"4-b5bb2f1657ac5ac270c14b2335e51ef1ffccc0a7259e14bce46380d6c446eb89",
                            "status":'available', "type":'leaf'
                         }],
                        "rev":"3-a9dac9ff5c8e1b2fce58e5397e9b6a8de729d5c6eff8f26a7b71df6348986123",
                        "status":'deleted',
                        "type":'branch'
                        }],
                    "rev":o.testRevisionStorage[1],
                    "status":'deleted',
                    "type":'branch'
                    },{
                     "kids":[
                        {
                        "kids":[],
                        "rev":"3-05210795b6aa8cb5e1e7f021960d233cf963f1052b1a41777ca1a2aff8fd4b61",
                        "status":'deleted',
                        "type":'leaf'
                        }],
                     "rev":"2-67ac10df5b7e2582f2ea2344b01c68d461f44b98fef2c5cba5073cc3bdb5a844",
                     "status":'deleted',
                     "typ":'branch'
                    }],
                "rev":o.testRevisionStorage[2],
                "status":'deleted',
                "type":'branch'
            };
            o.spy(o,'value',{"ok":true,"id":response.id,
                    "rev":response.rev}, 'PUT SYNC dead leaf = ok');
            o.f(response);
            // 18) check document was stored
            checkFile(response, o, null, true);
            // 19) check tree was updated
            checkTreeNode(response, o, null, true);
        });
    checkReply(o,null,true);
    o.clock.tick(base_tick);
    // END PUT
    o.jio.stop();
    o.clean;
});


// ====================== PUTATTACHMENT ==========================
test ('PutAttachment', function(){

    // runs following assertions
    // 1) PUTATTACHMENT with wrong id/rev1
    // 2) PUTATTACHMENT without id/rev1

    var o = {}; 
        o.t = this;
        o.clock = o.t.sandbox.useFakeTimers();
        o.falseRevision;
        localstorage = {
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

    o.clock.tick(base_tick);
    o.spy = basic_spy_function;
    o.clean = clean_up_local_storage_function();
    o.username = 'MrPuttAttachment';
    o.testRevisionStorage = [];

    // let's go
    o.jio = JIO.newJio({ type:'local', username:o.username,
                         applicationname:'jiotests' });
    // ========================================
    // 1) PUTATTACHMENT with wrong id/rev
    o.jio.putAttachment("ABC/DEF","A-1aaa","<b>hello</b>","text/html",function(err, response){
        o.spy (o,'value',{
            "error": 'not found',
            "message": 'Document not found.',
            "reason": 'Document not found, please check document ID',
            "status": 404,
            "statusText": 'Not found'
            },'PUTATTACHMENT without id = 404 NOT FOUND');
        o.f(err);
    });
    checkReply(o,null,true);
    // ========================================
    // 2) PUTATTACHMENT with wrong id/rev
    /*
    o.jio.putAttachment("ABC/DEF","text/html","<b>hello</b>",function(err, response){
        o.spy (o,'value',{
            "error": 'not found',
            "message": 'Document not found.',
            "reason": 'Document not found, please check document ID',
            "status": 404,
            "statusText": 'Not found'
            },'PUTATTACHMENT without id = 404 NOT FOUND');
        o.f(err);
    });
    checkReply(o,null,true);
    */
});

/*
test ('Document load', function () {
    // Test if LocalStorage can load documents.
    // We launch a loading from localstorage and we check if the file is
    // realy loaded.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.spy = basic_spy_function;
    o.tick = basic_tick_function;

    o.jio = JIO.newJio({type:'local',username:'MrLoadName',
                        applicationname:'jiotests'});
    // save and check document existence
    o.doc = {_id:'file',content:'content',
             _last_modified:1234,_creation_date:1000};

    o.spy(o,'status',404,'loading document failure');
    o.jio.get('file',o.f);
    o.tick(o);

    addFileToLocalStorage('MrLoadName','jiotests',o.doc);
    o.spy(o,'value',o.doc,'loading document success');
    o.jio.get('file',o.f);
    o.tick(o);

    o.jio.stop();
});
*//*
test ('Get document list', function () {
    // Test if LocalStorage can get a list of documents.
    // We create 2 documents inside localStorage to check them.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.mytest = function (value){
        o.f = function (err,val) {
            if (val) {
                deepEqual (objectifyDocumentArray(val.rows),
                           objectifyDocumentArray(value),'getting list');
            } else {
                deepEqual (err,value,'getting list');
            }
        };
        o.t.spy(o,'f');
        o.jio.allDocs(o.f);
        o.clock.tick(1000);
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'local',username:'MrListName',
                        applicationname:'jiotests'});
    o.doc1 = {_id:'file',content:'content',
              _last_modified:1,_creation_date:0};
    o.doc2 = {_id:'memo',content:'test',
              _last_modified:5,_creation_date:2};
    addFileToLocalStorage ('MrListName','jiotests',o.doc1);
    addFileToLocalStorage ('MrListName','jiotests',o.doc2);
    o.mytest ([{
        id:o.doc2._id,key:o.doc2._id,
        value:{
            _creation_date:o.doc2._creation_date,
            _last_modified:o.doc2._last_modified
        }
    },{
        id:o.doc1._id,key:o.doc1._id,
        value:{
            _last_modified:o.doc1._last_modified,
            _creation_date:o.doc1._creation_date
        }
    }]);

    o.jio.stop();
});
*//*
test ('Document remove', function () {
    // Test if LocalStorage can remove documents.
    // We launch a remove from localstorage and we check if the file is
    // realy removed.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.spy = basic_spy_function;
    o.tick = function () {
        basic_tick_function.apply(basic_tick_function,arguments);
        // check if the file is still there
        o.tmp = LocalOrCookieStorage.getItem (
            'jio/local/MrRemoveName/jiotests/file');
        ok (!o.tmp, 'check no content');
    };

    o.jio = JIO.newJio({type:'local',username:'MrRemoveName',
                        applicationname:'jiotests'});
    // test removing a file
    o.spy (o,'value',{ok:true,id:'file'},'removing document');
    addFileToLocalStorage ('MrRemoveName','jiotests',{_id:'file'});
    o.jio.remove({_id:'file'},o.f);
    o.tick (o);

    o.jio.stop();
});
*/
/*
module ('Jio DAVStorage');

test ('Document load', function () {
    // Test if DavStorage can load documents.

    var o = {};
    o.davload = getXML('responsexml/davload'),
    o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.t = this;
    o.mytest = function (message,doc,errprop,errget) {
        var server = o.t.sandbox.useFakeServer();
        server.respondWith (
            "PROPFIND",
                /https:\/\/ca-davstorage:8080\/davload\/jiotests\/file(\?.*|$)/,
            [errprop,{'Content-Type':'text/xml; charset="utf-8"'},
             o.davload]);
        server.respondWith (
            "GET",
                /https:\/\/ca-davstorage:8080\/davload\/jiotests\/file(\?.*|$)/,
            [errget,{},'content']);
        o.f = function (err,val) {
            if (err) {
                err = err.status;
            }
            deepEqual (err || val,doc,message);
        };
        o.t.spy(o,'f');
        o.jio.get('file',{max_retry:1},o.f);
        o.clock.tick(1000);
        server.respond();
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'dav',username:'davload',
                        password:'checkpwd',
                        url:'https://ca-davstorage:8080',
                        applicationname:'jiotests'});
    // note: http errno:
    //     200 OK
    //     201 Created
    //     204 No Content
    //     207 Multi Status
    //     403 Forbidden
    //     404 Not Found
    // load an inexistant document.
    o.mytest ('load inexistant document',404,404,404);
    // load a document.
    o.mytest ('load document',{_id:'file',content:'content',
                               _last_modified:1335953199000,
                               _creation_date:1335953202000},207,200);
    o.jio.stop();
});

test ('Document save', function () {
    // Test if DavStorage can save documents.

    var o = {};
    o.davsave = getXML('responsexml/davsave');
    o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.t = this;
    o.mytest = function (message,value,errnoput,errnoprop) {
        var server = o.t.sandbox.useFakeServer();
        server.respondWith (
            // lastmodified = 7000, creationdate = 5000
            "PROPFIND",
                /https:\/\/ca-davstorage:8080\/davsave\/jiotests\/file(\?.*|$)/,
            [errnoprop,{'Content-Type':'text/xml; charset="utf-8"'},
             o.davsave]);
        server.respondWith (
            "PUT",
                /https:\/\/ca-davstorage:8080\/davsave\/jiotests\/file(\?.*|$)/,
            [errnoput, {'Content-Type':'x-www-form-urlencoded'},
             'content']);
        server.respondWith (
            "GET",
                /https:\/\/ca-davstorage:8080\/davsave\/jiotests\/file(\?.*|$)/,
            [errnoprop===207?200:errnoprop,{},'content']);
        // server.respondWith ("MKCOL","https://ca-davstorage:8080/dav",
        //                     [200,{},'']);
        // server.respondWith ("MKCOL","https://ca-davstorage:8080/dav/davsave",
        //                     [200,{},'']);
        // server.respondWith ("MKCOL",
        //                    "https://ca-davstorage:8080/dav/davsave/jiotests",
        //                     [200,{},'']);
        o.f = basic_test_function_generator(o,'value',value,message);
        o.t.spy(o,'f');
        o.jio.put({_id:'file',content:'content'},o.f);
        o.clock.tick(1000);
        server.respond();
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'dav',username:'davsave',
                        password:'checkpwd',
                        url:'https://ca-davstorage:8080',
                        applicationname:'jiotests'});
    // note: http errno:
    //     200 OK
    //     201 Created
    //     204 No Content
    //     207 Multi Status
    //     403 Forbidden
    //     404 Not Found
    // // the path does not exist, we want to create it, and save the file.
    // mytest('create path if not exists, and create document',
    //        true,201,404);
    // the document does not exist, we want to create it
    o.mytest('create document',{ok:true,id:'file'},201,404);
    o.clock.tick(8000);
    // the document already exists, we want to overwrite it
    o.mytest('overwrite document',{ok:true,id:'file'},204,207);
    o.jio.stop();
});

test ('Get Document List', function () {
    // Test if DavStorage can get a list a document.

    var o = {};
    o.davlist = getXML('responsexml/davlist');
    o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.t = this;
    o.mytest = function (message,metadata_only,value,errnoprop) {
        var server = o.t.sandbox.useFakeServer();
        server.respondWith (
            "PROPFIND",
                /https:\/\/ca-davstorage:8080\/davlist\/jiotests\/(\?.*|$)/,
            [errnoprop,{'Content-Type':'text/xml; charset="utf-8"'},
             o.davlist]);
        server.respondWith (
            "GET",
                /https:\/\/ca-davstorage:8080\/davlist\/jiotests\/file(\?.*|$)/,
            [200,{},'content']);
        server.respondWith (
            "GET",
                /https:\/\/ca-davstorage:8080\/davlist\/jiotests\/memo(\?.*|$)/,
            [200,{},'content2']);
        o.f = function (err,val) {
            if (err) {
                result = undefined;
            } else {
                deepEqual (objectifyDocumentArray(val.rows),
                           objectifyDocumentArray(value),message);
                return;
            }
            deepEqual (result, value, message);
        };
        o.t.spy(o,'f');
        o.jio.allDocs({metadata_only:metadata_only},o.f);
        o.clock.tick(1000);
        server.respond();
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'dav',username:'davlist',
                        password:'checkpwd',
                        url:'https://ca-davstorage:8080',
                        applicationname:'jiotests'});
    o.mytest('fail to get list',true,undefined,404);
    o.mytest('getting list',true,[{
        id:'file',key:'file',
        value:{
            _creation_date:1335962911000,
            _last_modified:1335962907000
        }
    },{
        id:'memo',key:'memo',
        value:{
            _creation_date:1335894073000,
            _last_modified:1335955713000
        }
    }],207);
    o.mytest('getting list',false,[{
        id:'file',key:'file',
        value:{
            content:'content',
            _creation_date:1335962911000,
            _last_modified:1335962907000
        }
    },{
        id:'memo',key:'memo',
        value:{
            content:'content2',
            _creation_date:1335894073000,
            _last_modified:1335955713000
        }
    }],207);
    o.jio.stop();
});

test ('Remove document', function () {
    // Test if DavStorage can remove documents.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.mytest = function (message,value,errnodel) {
        var server = o.t.sandbox.useFakeServer();
        server.respondWith (
            "DELETE",
                /https:\/\/ca-davstorage:8080\/davremove\/jiotests\/file(\?.*|$)/,
            [errnodel,{},'']);
        o.f = function (err,val) {
            if (err) {
                err = err.status;
            }
            deepEqual (err || val,value,message);
        };
        o.t.spy(o,'f');
        o.jio.remove({_id:'file'},o.f);
        o.clock.tick(1000);
        server.respond();
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'dav',username:'davremove',
                        password:'checkpwd',
                        url:'https://ca-davstorage:8080',
                        applicationname:'jiotests'});

    o.mytest('remove document',{ok:true,id:'file'},204);
    o.mytest('remove an already removed document',404,404);
    o.jio.stop();
});

module ('Jio ReplicateStorage');

test ('Document load', function () {
    // Test if ReplicateStorage can load several documents.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.mytest = function (message,doc,doc2) {
        o.f = function (err,val) {
            var gooddoc = doc;
            if (val) {
                if (doc2 && val.content === doc2.content) {
                    gooddoc = doc2;
                }
            }
            deepEqual (err || val,gooddoc,message);
        };
        o.t.spy(o,'f');
        o.jio.get('file',{max_retry:3},o.f);
        o.clock.tick(10000);
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'replicate',storagelist:[
        {type:'dummyallok',username:'1'},
        {type:'dummyallok',username:'2'}]});
    o.mytest('DummyStorageAllOK,OK: load same file',{
        _id:'file',content:'content',
        _last_modified:15000,
        _creation_date:10000
    });
    o.jio.stop();

    o.jio = JIO.newJio({type:'replicate',storagelist:[
        {type:'dummyall3tries'},
        {type:'dummyallok'}]});
    o.mytest('DummyStorageAllOK,3tries: load 2 different files',
             {
                 _id:'file',content:'content',
                 _last_modified:15000,_creation_date:10000
             },{
                 _id:'file',content:'content file',
                 _last_modified:17000,_creation_date:11000
             });
    o.jio.stop();
});

test ('Document save', function () {
    // Test if ReplicateStorage can save several documents.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.mytest = function (message,value) {
        o.f = function (err,val) {
            if (err) {
                err = err.status;
            }
            deepEqual (err || val,value,message);
        };
        o.t.spy(o,'f');
        o.jio.put({_id:'file',content:'content'},{max_retry:3},o.f);
        o.clock.tick(500);
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'replicate',storagelist:[
        {type:'dummyallok',username:'1'},
        {type:'dummyallok',username:'2'}]});
    o.mytest('DummyStorageAllOK,OK: save a file.',{ok:true,id:'file'});
    o.jio.stop();

    o.jio = JIO.newJio({type:'replicate',storagelist:[
        {type:'dummyall3tries',username:'1'},
        {type:'dummyallok',username:'2'}]});
    o.mytest('DummyStorageAll3Tries,OK: save a file.',{ok:true,id:'file'});
    o.jio.stop();
});

test ('Get Document List', function () {
    // Test if ReplicateStorage can get several list.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.mytest = function (message,value) {
        o.f = function (err,val) {
            deepEqual (err || objectifyDocumentArray(val.rows),
                       objectifyDocumentArray(value),message);
        };
        o.t.spy(o,'f');
        o.jio.allDocs({max_retry:3},o.f);
        o.clock.tick(10000);
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'replicate',storagelist:[
        {type:'dummyall3tries',username:'1'},
        {type:'dummyallok',username:'2'}]});
    o.doc1 = {id:'file',key:'file',value:{
              _last_modified:15000,_creation_date:10000}};
    o.doc2 = {id:'memo',key:'memo',value:{
              _last_modified:25000,_creation_date:20000}};
    o.mytest('DummyStorageAllOK,3tries: get document list.',
             [o.doc1,o.doc2]);
    o.jio.stop();

    o.jio = JIO.newJio({type:'replicate',storagelist:[
        {type:'dummyall3tries',username:'3'},
        {type:'dummyall3tries',username:'4'}]});
    o.mytest('DummyStorageAll3tries,3tries: get document list.',
             [o.doc1,o.doc2]);
    o.jio.stop();
});

test ('Remove document', function () {
    // Test if ReplicateStorage can remove several documents.

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.mytest = function (message,value) {
        o.f = function (err,val) {
            if (err) {
                err = err.status;
            }
            deepEqual (err || val,value,message);
        };
        o.t.spy(o,'f');
        o.jio.remove({_id:'file'},{max_retry:3},o.f);
        o.clock.tick(10000);
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'replicate',storagelist:[
        {type:'dummyallok',username:'1'},
        {type:'dummyall3tries',username:'2'}]});
    o.mytest('DummyStorageAllOK,3tries: remove document.',{ok:true,id:'file'});
    o.jio.stop();
});

module ('Jio IndexedStorage');

test ('Document load', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.jio = JIO.newJio({type:'indexed',storage:{type:'dummyall3tries'}});
    // loading must take long time with dummyall3tries
    o.f = this.spy();
    o.jio.get('memo',{max_retry:3,metadata_only:true},o.f);
    o.clock.tick(1000);
    ok(!o.f.called,'Callback must not be called');
    // wait long time too retreive list
    o.clock.tick(1000);

    // now we can test if the document metadata are loaded faster.
    o.doc = {_id:'memo',_last_modified:25000,_creation_date:20000};
    o.f2 = function (err,val) {
        deepEqual (err||val,o.doc,'Document metadata retrieved');
    };
    this.spy(o,'f2');
    o.jio.get('memo',{max_retry:3,metadata_only:true},o.f2);
    o.clock.tick(1000);
    if (!o.f2.calledOnce) {
        if (o.f2.called) {
            ok (false, 'too much results');
        } else {
            ok (false, 'no response');
        }
    }

    // test a simple document loading
    o.doc2 = {_id:'file',_last_modified:17000,
              _creation_date:11000,content:'content file'};
    o.f3 = function (err,val) {
        deepEqual (err||val,o.doc2,'Simple document loading');
    };
    this.spy(o,'f3');
    o.jio.get('file',{max_retry:3},o.f3);
    o.clock.tick(2000);
    if (!o.f3.calledOnce) {
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

test ('Document save', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.jio = JIO.newJio({type:'indexed',
                        storage:{type:'dummyall3tries',
                                 username:'indexsave'}});
    o.f = function (err,val) {
        if (err) {
            err = err.status;
        }
        deepEqual (err || val,{ok:true,id:'file'},'document save');
    };
    this.spy(o,'f');
    o.jio.put({_id:'file',content:'content'},{max_retry:3},o.f);
    o.clock.tick(2000);
    if (!o.f.calledOnce){
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

test ('Get document list', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.jio = JIO.newJio({type:'indexed',
                        storage:{type:'dummyall3tries',
                                 username:'indexgetlist'}});
    o.doc1 = {id:'file',key:'file',value:{
        _last_modified:15000,_creation_date:10000}};
    o.doc2 = {id:'memo',key:'memo',value:{
        _last_modified:25000,_creation_date:20000}};
    // getting list must take long time with dummyall3tries
    o.f = this.spy();
    o.jio.allDocs({max_retry:3},o.f);
    o.clock.tick(1000);
    ok(!o.f.called,'Callback must not be called');
    // wail long time too retreive list
    o.clock.tick(1000);
    // now we can test if the document list is loaded faster
    o.f2 = function (err,val) {
        deepEqual (err || objectifyDocumentArray(val.rows),
                   objectifyDocumentArray([o.doc1,o.doc2]),'get document list');
    };
    this.spy(o,'f2');
    o.jio.allDocs({max_retry:3},o.f2);
    o.clock.tick(1000)
    if (!o.f2.calledOnce) {
        ok (false, 'no response / too much results');
    }
});

test ('Remove document', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers();
    o.clock.tick(base_tick);
    o.secondstorage = {type:'dummyall3tries',username:'indexremove'}
    o.storage_file_object_name = 'jio/indexed_file_object/'+
        JSON.stringify (o.secondstorage);

    o.jio = JIO.newJio({type:'indexed',storage:o.secondstorage});
    o.f = function (err,val) {
        if (err) {
            err = err.status;
        }
        deepEqual (err || val,{ok:true,id:'file'},'document remove');
    };
    this.spy(o,'f');
    o.jio.remove({_id:'file'},{max_retry:3},o.f);
    o.clock.tick(2000);
    if (!o.f.calledOnce){
        ok (false, 'no response / too much results');
    }

    o.tmp = LocalOrCookieStorage.getItem(o.storage_file_object_name) || {};
    ok (!o.tmp.file,'File does not exists anymore');

    o.jio.stop();
});

module ('Jio CryptedStorage');

test ('Document save' , function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    clock.tick(base_tick);
    o.jio=JIO.newJio({type:'crypt',
                      username:'cryptsave',
                      password:'mypwd',
                      storage:{type:'local',
                               username:'cryptsavelocal',
                               applicationname:'jiotests'}});
    o.f = function (err,val) {
        if (err) {
            err = err.status;
        }
        deepEqual (err || val,{ok:true,id:'testsave'},'save ok');
    };
    this.spy(o,'f');
    o.jio.put({_id:'testsave',content:'contentoftest'},o.f);
    clock.tick(1000);
    if (!o.f.calledOnce) {
        ok (false, 'no response / too much results');
    }
    // encrypt 'testsave' with 'cryptsave:mypwd' password
    o.tmp = LocalOrCookieStorage.getItem( // '/' = '%2F'
        'jio/local/cryptsavelocal/jiotests/rZx5PJxttlf9QpZER%2F5x354bfX54QFa1');
    if (o.tmp) {
        delete o.tmp._last_modified;
        delete o.tmp._creation_date;
    }
    deepEqual (o.tmp,
               {_id:'rZx5PJxttlf9QpZER/5x354bfX54QFa1',
                content:'upZkPIpitF3QMT/DU5jM3gP0SEbwo1n81rMOfLE'},
               'Check if the document is realy encrypted');
    o.jio.stop();
});

test ('Document load' , function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    clock.tick(base_tick);
    o.jio=JIO.newJio({type:'crypt',
                      username:'cryptload',
                      password:'mypwd',
                      storage:{type:'local',
                               username:'cryptloadlocal',
                               applicationname:'jiotests'}});
    o.f = function (err,val) {
        deepEqual (err || val,{
            _id:'testload',content:'contentoftest',
            _last_modified:500,_creation_date:500},'load ok');
    };
    this.spy(o,'f');
    // encrypt 'testload' with 'cryptload:mypwd' password
    // and 'contentoftest' with 'cryptload:mypwd'
    o.doc = {
        _id:'hiG4H80pwkXCCrlLl1X0BD0BfWLZwDUX',
        content:'kSulH8Qo105dSKHcY2hEBXWXC9b+3PCEFSm1k7k',
        _last_modified:500,_creation_date:500};
    addFileToLocalStorage('cryptloadlocal','jiotests',o.doc);
    o.jio.get('testload',o.f);
    clock.tick(1000);
    if (!o.f.calledOnce) {
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

test ('Get Document List', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    clock.tick(base_tick);
    o.jio=JIO.newJio({type:'crypt',
                      username:'cryptgetlist',
                      password:'mypwd',
                      storage:{type:'local',
                               username:'cryptgetlistlocal',
                               applicationname:'jiotests'}});
    o.f = function (err,val) {
        deepEqual (err || objectifyDocumentArray(val.rows),
                   objectifyDocumentArray(o.doc_list),'Getting list');
    };
    o.tick = function (tick) {
        clock.tick (tick || 1000);
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok (false, 'too much results');
            } else {
                ok (false, 'no response');
            }
        }
    };
    this.spy(o,'f');
    o.doc_list = [{
        id:'testgetlist1',key:'testgetlist1',value:{
            _last_modified:500,_creation_date:200}
    },{
        id:'testgetlist2',key:'testgetlist2',value:{
            _last_modified:300,_creation_date:300}
    }];
    o.doc_encrypt_list = [
        {_id:'541eX0WTMDw7rqIP7Ofxd1nXlPOtejxGnwOzMw',
         content:'/4dBPUdmLolLfUaDxPPrhjRPdA',
         _last_modified:500,_creation_date:200},
        {_id:'541eX0WTMDw7rqIMyJ5tx4YHWSyxJ5UjYvmtqw',
         content:'/4FBALhweuyjxxD53eFQDSm4VA',
         _last_modified:300,_creation_date:300}
    ];
    // encrypt with 'cryptgetlist:mypwd' as password
    LocalOrCookieStorage.setItem(
        'jio/local_file_name_array/cryptgetlistlocal/jiotests',
        [o.doc_encrypt_list[0]._id,o.doc_encrypt_list[1]._id]);
    LocalOrCookieStorage.setItem(
        'jio/local/cryptgetlistlocal/jiotests/'+o.doc_encrypt_list[0]._id,
        o.doc_encrypt_list[0]);
    LocalOrCookieStorage.setItem(
        'jio/local/cryptgetlistlocal/jiotests/'+o.doc_encrypt_list[1]._id,
        o.doc_encrypt_list[1]);
    o.jio.allDocs(o.f);
    o.tick(10000);

    o.jio.stop();
});

test ('Remove document', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    clock.tick(base_tick);
    o.jio=JIO.newJio({type:'crypt',
                      username:'cryptremove',
                      password:'mypwd',
                      storage:{type:'local',
                               username:'cryptremovelocal',
                               applicationname:'jiotests'}});
    o.f = function (err,val) {
        deepEqual (err || val,{ok:true,id:'file'},'Document remove');
    };
    this.spy(o,'f');
    // encrypt with 'cryptremove:mypwd' as password
    o.doc = {_id:'JqCLTjyxQqO9jwfxD/lyfGIX+qA',
             content:'LKaLZopWgML6IxERqoJ2mUyyO',
             _last_modified:500,_creation_date:500};
    o.jio.remove({_id:'file'},o.f);
    clock.tick(1000);
    if (!o.f.calledOnce){
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});


module ('Jio ConflictManagerStorage');

test ('Simple methods', function () {
    // Try all the simple methods like saving, loading, removing a document and
    // getting a list of document without testing conflicts

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick(base_tick);
    o.spy = function(value,message) {
        o.f = function(err,val) {
            deepEqual (err || val,value,message);
        };
        o.t.spy(o,'f');
    };
    o.tick = function (tick) {
        o.clock.tick(tick || 1000);
        if (!o.f.calledOnce) {
            if (o.f.called) {
                ok(false, 'too much results');
            } else {
                ok(false, 'no response');
            }
        }
    };
    o.jio = JIO.newJio({type:'conflictmanager',
                        username:'methods',
                        storage:{type:'local',
                                 username:'conflictmethods',
                                 applicationname:'jiotests'}});
    // PUT
    o.spy({ok:true,id:'file.doc',rev:'1'},'saving "file.doc".');
    o.jio.put({_id:'file.doc',content:'content1'},function (err,val) {
        if (val) {
            o.rev1 = val.rev;
            val.rev = val.rev.split('-')[0];
        }
        o.f (err,val);
    });
    o.tick();
    // PUT with options
    o.spy({ok:true,id:'file2.doc',rev:'1',
           conflicts:{total_rows:0,rows:[]},
           revisions:{start:1,ids:['1']},
           revs_info:[{rev:'1',status:'available'}]},
          'saving "file2.doc".');
    o.jio.put({_id:'file2.doc',content:'yes'},
              {revs:true,revs_info:true,conflicts:true},
              function (err,val) {
                  if (val) {
                      o.rev2 = val.rev;
                      val.rev = val.rev.split('-')[0];
                      if (val.revs_info) {
                          if (val.revisions) {
                              makeRevsAccordingToRevsInfo(
                                  val.revisions,val.revs_info);
                          }
                          val.revs_info[0].rev =
                              val.revs_info[0].rev.split('-')[0];
                      }
                 }
                  o.f (err,val);
              });
    o.tick();

    // GET
    o.get_callback = function (err,val) {
        if (val) {
            val._rev = (val._rev?val._rev.split('-')[0]:'/');
            val._creation_date = (val._creation_date?true:undefined);
            val._last_modified = (val._last_modified?true:undefined);
        }
        o.f(err,val);
    };
    o.spy({_id:'file.doc',content:'content1',_rev:'1',
           _creation_date:true,_last_modified:true},'loading "file.doc".');
    o.jio.get('file.doc',o.get_callback);
    o.tick();
    // GET with options
    o.get_callback = function (err,val) {
        if (val) {
            val._rev = (val._rev?val._rev.split('-')[0]:'/');
            val._creation_date = (val._creation_date?true:undefined);
            val._last_modified = (val._last_modified?true:undefined);
            if (val._revs_info) {
                if (val._revisions) {
                    makeRevsAccordingToRevsInfo(
                        val._revisions,val._revs_info);
                }
                val._revs_info[0].rev =
                    val._revs_info[0].rev.split('-')[0];
            }
        }
        o.f(err,val);
    };
    o.spy({_id:'file2.doc',content:'yes',_rev:'1',
           _creation_date:true,_last_modified:true,
           _conflicts:{total_rows:0,rows:[]},
           _revisions:{start:1,ids:['1']},
           _revs_info:[{rev:'1',status:'available'}]},
          'loading "file2.doc".');
    o.jio.get('file2.doc',{revs:true,revs_info:true,conflicts:true},
              o.get_callback);
    o.tick();

    // allDocs
    o.spy({total_rows:2,rows:[{
        id:'file.doc',key:'file.doc',
        value:{_rev:'1',_creation_date:true,_last_modified:true}
    },{
        id:'file2.doc',key:'file2.doc',
        value:{_rev:'1',_creation_date:true,_last_modified:true}
    }]},'getting list.');
    o.jio.allDocs(function (err,val) {
        if (val) {
            var i;
            for (i = 0; i < val.total_rows; i+= 1) {
                val.rows[i].value._creation_date =
                    val.rows[i].value._creation_date?
                    true:undefined;
                val.rows[i].value._last_modified =
                    val.rows[i].value._last_modified?
                    true:undefined;
                val.rows[i].value._rev = val.rows[i].value._rev.split('-')[0];
            }
            // because the result can be disordered
            if (val.total_rows === 2 && val.rows[0].id === 'file2.doc') {
                var tmp = val.rows[0];
                val.rows[0] = val.rows[1];
                val.rows[1] = tmp;
            }
        }
        o.f(err,val);
    });
    o.tick();

    // remove
    o.spy({ok:true,id:'file.doc',rev:'2'},
          'removing "file.doc"');
    o.jio.remove({_id:'file.doc'},{rev:o.rev1},function (err,val) {
        if (val) {
            val.rev = val.rev?val.rev.split('-')[0]:undefined;
        }
        o.f(err,val);
    });
    o.tick();
    // remove with options
    o.spy({
        ok:true,id:'file2.doc',rev:'2',
        conflicts:{total_rows:0,rows:[]},
        revisions:{start:2,ids:['2',getHashFromRev(o.rev2)]},
        revs_info:[{rev:'2',status:'deleted'}]
    },'removing "file2.doc"');
    o.jio.remove(
        {_id:'file2.doc'},
        {rev:o.rev2,conflicts:true,revs:true,revs_info:true},
        function (err,val) {
            if (val) {
                val.rev = val.rev?val.rev.split('-')[0]:undefined;
                if (val.revs_info) {
                    if (val.revisions) {
                        makeRevsAccordingToRevsInfo(
                            val.revisions,val.revs_info);
                    }
                    val.revs_info[0].rev =
                        val.revs_info[0].rev.split('-')[0];
                }
            }
            o.f(err,val);
        });
    o.tick();

    o.spy(404,'loading document fail.');
    o.jio.get('file.doc',function (err,val) {
        if (err) {
            err = err.status;
        }
        o.f(err,val);
    });
    o.tick();

    o.jio.stop();
});

test ('Revision Conflict', function() {
    // Try to tests all revision conflict possibility

    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick (base_tick);
    o.spy = basic_spy_function;
    o.tick = basic_tick_function;

    o.localNamespace = 'jio/local/revisionconflict/jiotests/';
    o.rev={};
    o.checkContent = function (string,message) {
        ok (LocalOrCookieStorage.getItem(o.localNamespace + string),
            message || '"' + string + '" is saved.');
    };
    o.checkNoContent = function (string,message) {
        ok (!LocalOrCookieStorage.getItem(o.localNamespace + string),
            message || '"' + string + '" does not exists.');
    };
    o.secondstorage_spec = {type:'local',
                            username:'revisionconflict',
                            applicationname:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.secondstorage_spec});
    // create a new file
    o.spy(o,'value',
          {ok:true,id:'file.doc',rev:'1',conflicts:{total_rows:0,rows:[]},
           revs_info:[{rev:'1',status:'available'}],
           revisions:{start:1,ids:['1']}},
          'new file "file.doc".');
    o.jio.put(
        {_id:'file.doc',content:'content1'},
        {revs:true,revs_info:true,conflicts:true},
        function (err,val) {
            if (val) {
                o.rev.first = val.rev;
                val.rev = val.rev?val.rev.split('-')[0]:undefined;
                if (val.revs_info) {
                    if (val.revisions) {
                        makeRevsAccordingToRevsInfo(
                            val.revisions,val.revs_info);
                    }
                    val.revs_info[0].rev =
                        val.revs_info[0].rev.split('-')[0];
                }
            }
            o.f(err,val);
        }
    );
    o.tick(o);
    o.checkContent('file.doc.'+o.rev.first);
    // modify the file
    o.spy(o,'value',
          {ok:true,id:'file.doc',rev:'2',
           conflicts:{total_rows:0,rows:[]},
           revisions:{start:2,ids:['2',getHashFromRev(o.rev.first)]},
           revs_info:[{rev:'2',status:'available'}]},
          'modify "file.doc", revision: "'+
          o.rev.first+'".');
    o.jio.put(
        {_id:'file.doc',content:'content2',_rev:o.rev.first},
        {revs:true,revs_info:true,conflicts:true},
        function (err,val) {
            if (val) {
                o.rev.second = val.rev;
                val.rev = val.rev?val.rev.split('-')[0]:undefined;
                if (val.revs_info) {
                    if (val.revisions) {
                        makeRevsAccordingToRevsInfo(
                            val.revisions,val.revs_info);
                    }
                    val.revs_info[0].rev =
                        val.revs_info[0].rev.split('-')[0];
                }
            }
            o.f(err,val);
        }
    );
    o.tick(o);
    o.checkContent('file.doc.'+o.rev.second);
    o.checkNoContent('file.doc.'+o.rev.first);
    // modify the file from the second revision instead of the third
    o.test_message = 'modify "file.doc", revision: "'+
        o.rev.first+'" -> conflict!';
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file.doc',content:'content3',_rev:o.rev.first},
        {revs:true,revs_info:true,conflicts:true},function (err,val) {
            o.f();
            var k;
            if (err) {
                o.rev.third = err.rev;
                err.rev = checkRev(err.rev);
                if (err.conflicts && err.conflicts.rows) {
                    o.tmp = err.conflicts;
                    o.solveConflict = checkConflictRow (err.conflicts.rows[0]);
                }
                for (k in {'error':0,'message':0,'reason':0,'statusText':0}) {
                    if (err[k]) {
                        delete err[k];
                    } else {
                        err[k] = 'ERROR: ' + k + ' is missing !';
                    }
                }
            }
            deepEqual(err||val,{
                rev:o.rev.third,
                conflicts:{total_rows:1,rows:[
                    {id:'file.doc',key:[o.rev.second,o.rev.third],
                     value:{_solveConflict:'function'}}]},
                status:409,
                // just one revision in the history, it does not keep older
                // revisions because it is not a revision manager storage.
                revisions:{start:1,ids:[getHashFromRev(o.rev.third)]},
                revs_info:[{rev:o.rev.second,status:'available'},
                           {rev:o.rev.third,status:'available'}]
            },o.test_message);
            ok (!revs_infoContains(err.revs_info,o.rev.first),
                'check if the first revision is not include to '+
                'the conflict list.');
            ok (revs_infoContains(err.revs_info,err.rev),
                'check if the new revision is include to '+
                'the conflict list.');
        });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.third);
    // loading test
    o.spy(o,'value',{_id:'file.doc',_rev:o.rev.third,content:'content3',
                     _conflicts:o.tmp},
          'loading "file.doc" -> conflict!');
    o.jio.get('file.doc',{conflicts:true},function (err,val) {
        var k;
        if (val) {
            if (val._conflicts && val._conflicts.rows) {
                checkConflictRow (val._conflicts.rows[0]);
            }
            for (k in {'_creation_date':0,'_last_modified':0}) {
                if (val[k]) {
                    delete val[k];
                } else {
                    val[k] = 'ERROR: ' + k + ' is missing !';
                }
            }
        }
        o.f(err,val);
    });
    o.tick(o);
    if (!o.solveConflict) { return ok(false,'Cannot to continue the tests'); }
    // solving conflict
    o.spy(o,'value',{ok:true,id:'file.doc',rev:'3'},
          'solve conflict "file.doc".');
    o.solveConflict(
        'content4',function (err,val) {
            if (val) {
                o.rev.forth = val.rev;
                val.rev = val.rev?val.rev.split('-')[0]:undefined;
            }
            o.f(err,val);
        });
    o.tick(o);
    o.checkContent('file.doc.'+o.rev.forth);
    o.checkNoContent('file.doc.'+o.rev.second);
    o.checkNoContent('file.doc.'+o.rev.third);
    o.jio.stop();
});

test ('Conflict in a conflict solving', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick (base_tick);
    o.spy = basic_spy_function;
    o.tick = basic_tick_function;

    o.localNamespace = 'jio/local/conflictconflict/jiotests/';
    o.rev={};
    o.checkContent = function (string,message) {
        ok (LocalOrCookieStorage.getItem(o.localNamespace + string),
            message || '"' + string + '" is saved.');
    };
    o.checkNoContent = function (string,message) {
        ok (!LocalOrCookieStorage.getItem(o.localNamespace + string),
            message || '"' + string + '" does not exists.');
    };
    o.secondstorage_spec = {type:'local',
                            username:'conflictconflict',
                            applicationname:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.secondstorage_spec});
    // create a new file
    o.test_message = 'new file "file.doc", revision: "0".'
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file.doc',content:'content1'},
        {conflicts:true,revs:true,revs_info:true},
        function(err,val) {
            o.f();
            if (val) {
                o.rev.first = val.rev;
                val.rev = checkRev(val.rev);
            }
            deepEqual(err||val,{
                ok:true,id:'file.doc',rev:o.rev.first,
                conflicts:{total_rows:0,rows:[]},
                revisions:{start:1,ids:[getHashFromRev(o.rev.first)]},
                revs_info:[{rev:o.rev.first,status:'available'}]
            },o.test_message);
        });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.first);
    // modify the file from the second revision instead of the third
    o.test_message = 'modify "file.doc", revision: "0" -> conflict!';
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file.doc',content:'content2'},
        {conflicts:true,revs:true,revs_info:true},
        function (err,val) {
        o.f();
        var k;
        if (err) {
            o.rev.second = err.rev;
            err.rev = checkRev(err.rev);
            if (err.conflicts && err.conflicts.rows) {
                o.solveConflict = checkConflictRow (err.conflicts.rows[0]);
            }
            for (k in {'error':0,'message':0,'reason':0,'statusText':0}) {
                if (err[k]) {
                    delete err[k];
                } else {
                    err[k] = 'ERROR: ' + k + ' is missing !';
                }
            }
        }
        deepEqual(err||val,{
            rev:o.rev.second,
            conflicts:{total_rows:1,rows:[
                {id:'file.doc',key:[o.rev.first,o.rev.second],
                 value:{_solveConflict:'function'}}]},
            status:409,
            // just one revision in the history, it does not keep older
            // revisions because it is not a revision manager storage.
            revisions:{start:1,ids:[getHashFromRev(o.rev.second)]},
            revs_info:[{rev:o.rev.first,status:'available'},
                       {rev:o.rev.second,status:'available'}]
        },o.test_message);
    });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.second);
    if (!o.solveConflict) { return ok(false,'Cannot to continue the tests'); }
    // saving another time
    o.test_message = 'modify "file.doc" when solving, revision: "'+
        o.rev.first+'" -> conflict!';
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file.doc',content:'content3',_rev:o.rev.first},
        {conflicts:true,revs:true,revs_info:true},
        function(err,val){
            o.f();
            if (err) {
                o.rev.third = err.rev;
                err.rev = checkRev(err.rev);
                if (err.conflicts && err.conflicts.rows) {
                    checkConflictRow (err.conflicts.rows[0]);
                }
                for (k in {'error':0,'message':0,'reason':0,'statusText':0}) {
                    if (err[k]) {
                        delete err[k];
                    } else {
                        err[k] = 'ERROR: ' + k + ' is missing !';
                    }
                }
            }
            deepEqual(err||val,{
                rev:o.rev.third,
                conflicts:{total_rows:1,rows:[
                    {id:'file.doc',key:[o.rev.second,o.rev.third],
                     value:{_solveConflict:'function'}}]},
                status:409,
                // just one revision in the history, it does not keep older
                // revisions because it is not a revision manager storage.
                revisions:{start:2,ids:[getHashFromRev(o.rev.third),
                                        getHashFromRev(o.rev.first)]},
                revs_info:[{rev:o.rev.second,status:'available'},
                           {rev:o.rev.third,status:'available'}]
            },o.test_message);
        });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.third);
    o.checkNoContent ('file.doc.'+o.rev.first);
    // solving first conflict
    o.test_message = 'solving conflict "file.doc" -> conflict!';
    o.f = o.t.spy();
    o.solveConflict(
        'content4',{conflicts:true,revs:true,revs_info:true},
        function (err,val) {
            o.f();
            if (err) {
                o.rev.forth = err.rev;
                err.rev = checkRev(err.rev);
                if (err.conflicts && err.conflicts.rows) {
                    o.solveConflict = checkConflictRow (err.conflicts.rows[0]);
                }
                for (k in {'error':0,'message':0,'reason':0,'statusText':0}) {
                    if (err[k]) {
                        delete err[k];
                    } else {
                        err[k] = 'ERROR: ' + k + ' is missing !';
                    }
                }
            }
            deepEqual(err||val,{
                rev:o.rev.forth,
                conflicts:{total_rows:1,rows:[
                    {id:'file.doc',key:[o.rev.third,o.rev.forth],
                     value:{_solveConflict:'function'}}]},
                status:409,
                // just one revision in the history, it does not keep older
                // revisions because it is not a revision manager storage.
                revisions:{start:2,ids:[getHashFromRev(o.rev.forth),
                                        getHashFromRev(o.rev.second)]},
                revs_info:[{rev:o.rev.third,status:'available'},
                           {rev:o.rev.forth,status:'available'}]
            },o.test_message);
        });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.forth);
    o.checkNoContent ('file.doc.'+o.rev.second);
    if (!o.solveConflict) { return ok(false,'Cannot to continue the tests'); }
    // solving last conflict
    o.test_message = 'solving last conflict "file.doc".';
    o.f = o.t.spy();
    o.solveConflict(
        'content5',{conflicts:true,revs:true,revs_info:true},
        function (err,val) {
            if (val) {
                o.rev.fifth = val.rev;
                val.rev = checkRev(val.rev);
            }
            deepEqual(err||val,{
                ok:true,id:'file.doc',rev:o.rev.fifth,
                conflicts:{total_rows:0,rows:[]},
                revisions:{start:3,ids:[getHashFromRev(o.rev.fifth),
                                        getHashFromRev(o.rev.forth),
                                        getHashFromRev(o.rev.second)]},
                revs_info:[{rev:o.rev.fifth,status:'available'}]
            },o.test_message);
            o.f();
        });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.fifth);

    o.jio.stop();
});

test ('Remove revision conflict', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick (base_tick);
    o.spy = basic_spy_function;
    o.tick = basic_tick_function;

    o.localNamespace = 'jio/local/removeconflict/jiotests/';
    o.rev={};
    o.checkContent = function (string,message) {
        ok (LocalOrCookieStorage.getItem(o.localNamespace + string),
            message || '"' + string + '" is saved.');
    };
    o.checkNoContent = function (string,message) {
        ok (!LocalOrCookieStorage.getItem(o.localNamespace + string),
            message || '"' + string + '" does not exists.');
    };
    o.secondstorage_spec = {type:'local',
                            username:'removeconflict',
                            applicationname:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.secondstorage_spec});

    o.test_message = 'new file "file.doc", revision: "0".';
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file.doc',content:'content1'},
        {conflicts:true,revs:true,revs_info:true},
        function(err,val) {
            o.f();
            if (val) {
                o.rev.first = val.rev;
                val.rev = checkRev(val.rev);
            }
            deepEqual(err||val,{
                ok:true,id:'file.doc',rev:o.rev.first,
                conflicts:{total_rows:0,rows:[]},
                revisions:{start:1,ids:[getHashFromRev(o.rev.first)]},
                revs_info:[{rev:o.rev.first,status:'available'}]
            },o.test_message);
        });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.first);

    o.test_message = 'remove "file.doc", revision: "wrong" -> conflict!';
    o.f = o.t.spy();
    o.jio.remove(
        {_id:'file.doc'},
        {conflicts:true,revs:true,revs_info:true,rev:'wrong'},
        function (err,val) {
            o.f();
            if (err) {
                o.rev.second = err.rev;
                err.rev = checkRev(err.rev);
                if (err.conflicts && err.conflicts.rows) {
                    o.solveConflict = checkConflictRow (err.conflicts.rows[0]);
                }
                for (k in {'error':0,'message':0,'reason':0,'statusText':0}) {
                    if (err[k]) {
                        delete err[k];
                    } else {
                        err[k] = 'ERROR: ' + k + ' is missing !';
                    }
                }
            }
            deepEqual(err||val,{
                rev:o.rev.second,
                conflicts:{total_rows:1,rows:[
                    {id:'file.doc',key:[o.rev.first,o.rev.second],
                     value:{_solveConflict:'function'}}]},
                status:409,
                // just one revision in the history, it does not keep older
                // revisions because it is not a revision manager storage.
                revisions:{start:1,ids:[getHashFromRev(o.rev.second)]},
                revs_info:[{rev:o.rev.first,status:'available'},
                           {rev:o.rev.second,status:'deleted'}]
            },o.test_message);
        });
    o.tick(o);

    o.test_message = 'new file again "file.doc".';
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file.doc',content:'content2'},
        {conflicts:true,revs:true,revs_info:true},
        function (err,val) {
            o.f();
            if (err) {
                o.rev.third = err.rev;
                err.rev = checkRev(err.rev);
                if (err.conflicts && err.conflicts.rows) {
                    o.solveConflict = checkConflictRow (err.conflicts.rows[0]);
                }
                for (k in {'error':0,'message':0,'reason':0,'statusText':0}) {
                    if (err[k]) {
                        delete err[k];
                    } else {
                        err[k] = 'ERROR: ' + k + ' is missing !';
                    }
                }
            }
            deepEqual(err||val,{
                rev:o.rev.third,
                conflicts:{total_rows:1,rows:[
                    {id:'file.doc',key:[o.rev.first,o.rev.second,o.rev.third],
                     value:{_solveConflict:'function'}}]},
                status:409,
                // just one revision in the history, it does not keep older
                // revisions because it is not a revision manager storage.
                revisions:{start:1,ids:[getHashFromRev(o.rev.third)]},
                revs_info:[{rev:o.rev.first,status:'available'},
                           {rev:o.rev.second,status:'deleted'},
                           {rev:o.rev.third,status:'available'}]
            },o.test_message);
        });
    o.tick(o);
    o.checkContent ('file.doc.'+o.rev.third);

    o.test_message = 'remove "file.doc", revision: "'+o.rev.first+
        '" -> conflict!'
    o.f = o.t.spy();
    o.jio.remove(
        {_id:'file.doc'},
        {conflicts:true,revs:true,revs_info:true,rev:o.rev.first},
        function (err,val) {
            o.f();
            if (err) {
                o.rev.forth = err.rev;
                err.rev = checkRev(err.rev);
                if (err.conflicts && err.conflicts.rows) {
                    o.solveConflict = checkConflictRow (err.conflicts.rows[0]);
                }
                for (k in {'error':0,'message':0,'reason':0,'statusText':0}) {
                    if (err[k]) {
                        delete err[k];
                    } else {
                        err[k] = 'ERROR: ' + k + ' is missing !';
                    }
                }
            }
            deepEqual(err||val,{
                rev:o.rev.forth,
                conflicts:{total_rows:1,rows:[
                    {id:'file.doc',key:[o.rev.second,o.rev.third,o.rev.forth],
                     value:{_solveConflict:'function'}}]},
                status:409,
                // just one revision in the history, it does not keep older
                // revisions because it is not a revision manager storage.
                revisions:{start:2,ids:[getHashFromRev(o.rev.forth),
                                        getHashFromRev(o.rev.first)]},
                revs_info:[{rev:o.rev.second,status:'deleted'},
                           {rev:o.rev.third,status:'available'},
                           {rev:o.rev.forth,status:'deleted'}]
            },o.test_message);
        });
    o.tick(o);
    o.checkNoContent ('file.doc.'+o.rev.first);
    o.checkNoContent ('file.doc.'+o.rev.forth);

    if (!o.solveConflict) { return ok(false, 'Cannot continue the tests'); }
    o.test_message = 'solve "file.doc"';
    o.f = o.t.spy();
    o.solveConflict({conflicts:true,revs:true,revs_info:true},function(err,val){
        o.f();
        if (val) {
            o.rev.fifth = val.rev;
            val.rev = checkRev(val.rev);
        }
        deepEqual(err||val,{
            ok:true,id:'file.doc',rev:o.rev.fifth,
            conflicts:{total_rows:0,rows:[]},
            revisions:{start:3,ids:[getHashFromRev(o.rev.fifth),
                                    getHashFromRev(o.rev.forth),
                                    getHashFromRev(o.rev.first)]},
            revs_info:[{rev:o.rev.fifth,status:'deleted'}]
        },o.test_message);
    });
    o.tick(o);
    o.checkNoContent ('file.doc.'+o.rev.second);
    o.checkNoContent ('file.doc.'+o.rev.forth);
    o.checkNoContent ('file.doc.'+o.rev.fifth);

    o.test_message = 'save "file3.doc"';
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file3.doc',content:'content3'},
        function(err,val) {
            o.f();
            if (val) {
                o.rev.sixth = val.rev;
                val.rev = checkRev(val.rev);
            }
            deepEqual(err||val,{
                ok:true,id:'file3.doc',rev:o.rev.sixth
            },o.test_message);
        });
    o.tick(o);
    o.test_message = 'save "file3.doc", rev "'+o.rev.sixth+'"';
    o.f = o.t.spy();
    o.jio.put(
        {_id:'file3.doc',content:'content3',_rev:o.rev.sixth},
        function(err,val) {
            o.f();
            if (val) {
                o.rev.seventh = val.rev;
                val.rev = checkRev(val.rev);
            }
            deepEqual(err||val,{
                ok:true,id:'file3.doc',rev:o.rev.seventh
            },o.test_message);
        });
    o.tick(o);

    o.test_message = 'remove last "file3.doc"';
    o.f = o.t.spy();
    o.jio.remove(
        {_id:'file3.doc'},
        {conflicts:true,revs:true,revs_info:true,rev:'last'},
        function (err,val) {
            o.f();
            if (val) {
                o.rev.eighth = val.rev;
                val.rev = checkRev(val.rev);
            }
            deepEqual(err||val,{
                ok:true,id:'file3.doc',
                rev:o.rev.eighth,
                conflicts:{total_rows:0,rows:[]},
                // just one revision in the history, it does not keep older
                // revisions because it is not a revision manager storage.
                revisions:{start:3,ids:[getHashFromRev(o.rev.eighth),
                                        getHashFromRev(o.rev.seventh),
                                        getHashFromRev(o.rev.sixth)]},
                revs_info:[{rev:o.rev.eighth,status:'deleted'}]
            },o.test_message);
        });
    o.tick(o);

    o.jio.stop();
});

test ('Load Revisions', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick (base_tick);
    o.spy = basic_spy_function;
    o.tick = basic_tick_function;
    o.secondstorage_spec = {type:'local',
                            username:'loadrevisions',
                            applicationname:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.secondstorage_spec});
    o.spy(o,'status',404,'load file rev:1,','f'); // 12 === Replaced
    o.spy(o,'status',404,'load file rev:2','g');
    o.spy(o,'status',404,'and load file rev:3 at the same time','h');
    o.jio.get('file',{rev:'1'},o.f);
    o.jio.get('file',{rev:'2'},o.g);
    o.jio.get('file',{rev:'3'},o.h);
    o.tick(o,1000,'f'); o.tick(o,0,'g'); o.tick(o,0,'h');
    o.jio.stop();
});

test ('Get revision List', function () {
    var o = {}; o.clock = this.sandbox.useFakeTimers(); o.t = this;
    o.clock.tick (base_tick);
    o.spy = basic_spy_function;
    o.tick = basic_tick_function;
    o.secondstorage_spec = {type:'local',
                            username:'getrevisionlist',
                            applicationname:'jiotests'}
    o.rev = {};
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.secondstorage_spec});
    o.spy(o,'value',{total_rows:0,rows:[]},'Get revision list');
    o.jio.allDocs(o.f);
    o.tick(o);

    o.spy(o,'value',{total_rows:0,rows:[],conflicts:{total_rows:0,rows:[]}},
          'Get revision list with informations');
    o.jio.allDocs({conflicts:true,revs:true,info_revs:true},o.f);
    o.tick(o);

    o.spy(o,'jobstatus','done','saving file');
    o.jio.put({_id:'file',content:'content file'},function (err,val) {
        o.rev.file1 = val?val.rev:undefined;
        o.f(err,val);
    });
    o.tick(o);
    o.spy(o,'jobstatus','done','saving memo');
    o.jio.put({_id:'memo',content:'content memo'},function (err,val) {
        o.rev.memo1 = val?val.rev:undefined;
        o.f(err,val);
    });
    o.tick(o);
    o.spy(o,'status',409,'saving memo conflict');
    o.jio.put({_id:'memo',content:'content memo'},function (err,val) {
        o.rev.memo2 = err?err.rev:undefined;
        o.f(err,val);
    });
    o.tick(o);

    o.f = o.t.spy();
    o.jio.allDocs(function (err,val) {
        var i;
        if (val) {
            for (i = 0; i < val.total_rows; i+= 1) {
                val.rows[i].value._creation_date =
                    val.rows[i].value._creation_date?true:undefined;
                val.rows[i].value._last_modified =
                    val.rows[i].value._last_modified?true:undefined;
                o.rev[i] = checkRev (val.rows[i].value._rev);
            }
        }
        deepEqual(err||val,{total_rows:2,rows:[{
            id:'file',key:'file',value:{
                _creation_date:true,_last_modified:true,_rev:o.rev[0]
            }
        },{
            id:'memo',key:'memo',value:{
                _creation_date:true,_last_modified:true,_rev:o.rev[1]
            }
        }]},'Get revision list after adding 2 files');
        o.f();
    });
    o.tick(o);

    o.f = o.t.spy();
    o.jio.allDocs(
        {conflicts:true,revs:true,revs_info:true},
        function (err,val) {
            var i;
            if (val) {
                for (i = 0; i < val.total_rows; i+= 1) {
                    val.rows[i].value._creation_date =
                        val.rows[i].value._creation_date?true:undefined;
                    val.rows[i].value._last_modified =
                        val.rows[i].value._last_modified?true:undefined;
                    if (val.conflicts && val.conflicts.rows) {
                        o.solveConflict =
                            checkConflictRow (val.conflicts.rows[0]);
                    }
                }
            }
            deepEqual(err||val,{
                total_rows:2,rows:[{
                    id:'file',key:'file',value:{
                        _creation_date:true,_last_modified:true,
                        _revisions:{start:1,ids:[getHashFromRev(o.rev.file1)]},
                        _rev:o.rev.file1,_revs_info:[{
                            rev:o.rev.file1,status:'available'
                        }]
                    }
                },{
                    id:'memo',key:'memo',value:{
                        _creation_date:true,_last_modified:true,
                        _revisions:{start:1,ids:[getHashFromRev(o.rev.memo2)]},
                        _rev:o.rev.memo2,_revs_info:[{
                            rev:o.rev.memo1,status:'available'
                        },{
                            rev:o.rev.memo2,status:'available'
                        }]
                    }
                }],
                conflicts:{total_rows:1,rows:[{
                    id:'memo',key:[o.rev.memo1,o.rev.memo2],
                    value:{_solveConflict:'function'}
                }]}
            },'Get revision list with informations after adding 2 files');
            o.f();
        });
    o.tick(o);

    o.jio.stop();
});
*/
};                              // end thisfun

if (window.requirejs) {
    require.config ({
        paths: {
            jiotestsloader: './jiotests.loader',

            LocalOrCookieStorage: './testlocalorcookiestorage',
            jQueryAPI: '../lib/jquery/jquery',
            jQuery: '../js/jquery.requirejs_module',
            JIO: '../src/jio',
            Base64API: '../lib/base64/base64',
            Base64: '../js/base64.requirejs_module',
            JIODummyStorages: '../src/jio.dummystorages',
            JIOStorages: '../src/jio.storage',
            SJCLAPI:'../lib/sjcl/sjcl.min',
            SJCL:'../js/sjcl.requirejs_module'
        }
    });
    require(['jiotestsloader'],thisfun);
} else {
    thisfun ({LocalOrCookieStorage:LocalOrCookieStorage,
              JIO:jIO,
              sjcl:sjcl,
              Base64:Base64,
              jQuery:jQuery});
}

}());
