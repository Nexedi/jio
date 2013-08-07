(function () { var thisfun = function(loader) {
    var JIO = loader.JIO;

// localStorage cleanup
var k;
for (k in localStorage) {
    if (/^jio\//.test(k)) {
        localStorage.removeItem(k);
    }
}
delete k;

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
clone = function (obj) {
  var tmp = JSON.stringify(obj);
  if (tmp !== undefined) {
    return JSON.parse(tmp);
  }
  return tmp;
},
// generates a revision hash from document metadata, revision history
// and the deleted_flag
generateRevisionHash = function (doc, revisions, deleted_flag) {
  var string;
  doc = clone(doc);
  delete doc._rev;
  delete doc._revs;
  delete doc._revs_info;
  string = JSON.stringify(doc) + JSON.stringify(revisions) +
    JSON.stringify(deleted_flag? true: false);
  return hex_sha256(string);
},
// localStorage wrapper
localstorage = {
    clear: function () {
        return localStorage.clear();
    },
    getItem: function (item) {
        var value = localStorage.getItem(item);
        return value === null? null: JSON.parse(value);
    },
    setItem: function (item,value) {
        return localStorage.setItem(item,JSON.stringify (value));
    },
    removeItem: function (item) {
        return localStorage.removeItem(item);
    }
},
cleanUpLocalStorage = function(){
    var k, storageObject = localstorage.getAll();
    for (k in storageObject) {
        var splitk = k.split('/');
        if ( splitk[0] === 'jio' ) {
            localstorage.removeItem(k);
        }
    }
    var d = document.createElement ('div');
    d.setAttribute('id','log');
    document.querySelector ('body').appendChild(d);
    // remove everything
    localStorage.clear();
},
base_tick = 30000,
basicTestFunctionGenerator = function(o,res,value,message) {

    return function(err,val) {
        var jobstatus = (err?'fail':'done');

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
            ok(false, "Unknown case " + res);
        }
        deepEqual (val,value,message);
    };
},

/**
 * Prepare a specific test for jio and create a spy.
 * It creates a function [function_name] in [obj] which can be use as a
 * jio callback. To prepare the test, we need to know what kind of return
 * value you want -> [result_type]:
 * - "status": [value] is compared with err.status, the error code
 * - "jobstatus": [value] check if the request is "fail" or "done"
 * - "value": [value] is compared to the response
 * @method basicSpyFunction
 * @param  {object} obj The object to work with
 * @param  {string} result_type The result type
 * @param  {object} value The value to be compared
 * @param  {string} message The test message
 * @param  {string} function_name The callback name
 */
basicSpyFunction = function(obj, result_type, value, message, function_name) {
    function_name = function_name || 'f';
    obj[function_name] =
        basicTestFunctionGenerator(obj, result_type, value, message);
    obj.t.spy(obj, function_name);
},

/**
 * Advances in time and execute the test previously prepared.
 * The default function to test is "f" in [obj].
 * @method basicTickFunction
 * @param  {object} obj The object to work with
 * @param  {number} tick The time to advance in ms (optional)
 * @param  {function_name} function_name The callback to test (optional)
 */
basicTickFunction = function (obj) {
    var tick, fun, i = 1;
    tick = 10000;
    fun = "f";

    if (typeof arguments[i] === 'number') {
        tick = arguments[i]; i++;
    }
    if (typeof arguments[i] === 'string') {
        fun = arguments[i]; i++;
    }
    obj.clock.tick(tick);
    if (!obj[fun].calledOnce) {
        if (obj[fun].called) {
            ok(false, 'too much results (obj.' + fun +')');
        } else {
            ok(false, 'no response (obj.' + fun +')');
        }
    }
},
getXML = function (url) {
  var xml = $.ajax({url:url, async:false});
  return xml.responseText;
},
objectifyDocumentArray = function (array) {
    var obj = {}, k;
    for (k = 0; k < array.length; k += 1) {
        obj[array[k]._id] = array[k];
    }
    return obj;
},
getLastJob = function (id) {
    return (localstorage.getItem("jio/job_array/"+id) || [undefined]).pop();
},
generateTools = function (test_namespace) {
    var o = {};

    o.t = test_namespace;
    o.server = o.t.sandbox.server;
    o.clock = o.t.sandbox.clock;
    o.clock.tick(base_tick);
    o.spy = basicSpyFunction;
    o.tick = basicTickFunction;

    // test methods
    o.testLastJobLabel = function (label, mess) {
        var lastjob = getLastJob(o.jio.getId());
        if (lastjob) {
            deepEqual(lastjob.command.label, label, mess);
        } else {
            deepEqual("No job on the queue", "Job with label: "+label, mess);
        }
    };
    o.testLastJobId = function (id, mess) {
        var lastjob = getLastJob(o.jio.getId());
        if (lastjob) {
            deepEqual(lastjob.id, id, mess);
        } else {
            deepEqual("No job on the queue", "Job with id: "+id, mess);
        }
    };
    o.testLastJobWaitForTime = function (mess) {
        var lastjob = getLastJob(o.jio.getId());
        if (lastjob) {
            ok(lastjob.status.waitfortime > 0, mess);
        } else {
            deepEqual("No job on the queue", "Job waiting for time", mess);
        }
    };
    o.testLastJobWaitForJob = function (job_id_array, mess) {
        var lastjob = getLastJob(o.jio.getId());
        if (lastjob) {
            deepEqual(lastjob.status.waitforjob, job_id_array, mess);
        } else {
            deepEqual(
                "No job on the queue",
                "Job waiting for: " + JSON.stringify (job_id_array),
                mess
            );
        }
    };
    // wait method
    // NOTED: not sure I understood this correctly
    o.waitUntilAJobExists = function (timeout) {
        var cpt = 0, job = false;
        while (true) {
            if (getLastJob(o.jio.getId()) !== undefined) {
                job = true;
                break;
            }
            if (cpt >= timeout) {
                break;
            }
            o.clock.tick(25);
            cpt += 25;
        }
        ok(job, "Waited until job was created");
    };
    o.waitUntilLastJobIs = function (state) {
        while (true) {
            if (getLastJob(o.jio.getId()) === undefined) {
                ok(false, "No job have state: " + state);
                break;
            }
            if (getLastJob(o.jio.getId()).status.label === state) {
                break;
            }
            o.clock.tick(25);
        }
    };
    o.constructFakeServerUrl = function(type, path) {
      switch (type) {
        case "dav":
          return 'https:\\/\\/ca-davstorage:8080\\/' + path + '(\\?.*|$)';
        default:
          return path;
      }
    };
    o.addFakeServerResponse = function (type, method, path, status, response) {
      var url = new RegExp(o.constructFakeServerUrl(type, path) );
      o.server.respondWith(method, url,
        [status, { "Content-Type": 'application/xml' }, response]
      );
    };
    o.sortArrayById = function(field, reverse, primer){
      var key = function (x) {return primer ? primer(x[field]) : x[field]};

      return function (a,b) {
        var A = key(a), B = key(b);
        return ( (A < B) ? -1 : ((A > B) ? 1 : 0) ) * [-1,1][+!!reverse];
      }
    };
    return o;
},
//// end tools

//// test function
isUuid = function (uuid) {
    var x = "[0-9a-fA-F]{4}";
    if (typeof uuid !== "string" ) {
        return false;
    }
    return uuid.match("^"+x+x+"-"+x+"-"+x+"-"+x+"-"+x+x+x+"$") === null?
        false: true;
};
//// QUnit Tests ////
module ( "Jio Dummy Storages" );

test ("All requests ok", function () {
    // Tests the request methods and the response with dummy storages

    var o = generateTools(this);

    // All Ok Dummy Storage
    o.jio = JIO.newJio({"type": "dummyallok"});

    // post empty document, some storage can create there own id (like couchdb
    // generates uuid). In this case, the dummy storage write an undefined id.
    o.spy(o, "value", {"ok": true, "id": undefined},
          "Post document with empty id");
    o.jio.post({}, o.f);
    o.tick(o);

    // post non empty document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Post non empty document");
    o.jio.post({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put without id
    // error 20 -> document id required
    o.spy(o, "status", 20, "Put document with empty id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Put non empty document");
    o.jio.put({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put an attachment without attachment id
    // error 22 -> attachment id required
    o.spy(o, "status", 22,
          "Put attachment without id");
    o.jio.putAttachment({
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file", "attachment": "attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file",
        "_attachment": "attmt",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "value", {"_id": "file", "title": "get_title"}, "Get document");
    o.jio.get({"_id": "file"}, o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "value", "0123456789", "Get attachment");
    o.jio.getAttachment({"_id": "file", "_attachment": "attmt"}, o.f);
    o.tick(o);

    // remove document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "file", "attachment": "attmt"},
          "Remove attachment");
    o.jio.removeAttachment({"_id": "file", "_attachment": "attmt"}, o.f);
    o.tick(o);

    // alldocs
    // error 405 -> Method not allowed
    o.spy(o, "status", 405, "AllDocs fail");
    o.jio.allDocs(o.f);
    o.tick(o);

    o.jio.stop();
});

test ("All requests fail", function () {
    // Tests the request methods and the err object with dummy storages

    var o = generateTools(this);

    // All Ok Dummy Storage
    o.jio = JIO.newJio({"type": "dummyallfail"});

    // post empty document
    // error 0 -> unknown
    o.spy(o, "status", 0, "Post document with empty id");
    o.jio.post({}, o.f);
    o.tick(o);

    // test if the job still exists
    if (getLastJob(o.jio.getId()) !== undefined) {
        ok(false, "The job is not removed from the job queue");
    }

    // post non empty document
    o.spy(o, "status", 0, "Post non empty document");
    o.jio.post({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put without id
    // error 20 -> document id required
    o.spy(o, "status", 20, "Put document with empty id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.spy(o, "status", 0, "Put non empty document");
    o.jio.put({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put an attachment without attachment id
    // error 22 -> attachment id required
    o.spy(o, "status", 22,
          "Put attachment without id");
    o.jio.putAttachment({
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "status", 0,
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file",
        "_attachment": "attmt",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "status", 0, "Get document");
    o.jio.get({"_id": "file"}, o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "status", 0, "Get attachment");
    o.jio.get({"_id": "file", "_attachment": "attmt"}, o.f);
    o.tick(o);

    // remove document
    o.spy(o, "status", 0, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "status", 0, "Remove attachment");
    o.jio.remove({"_id": "file", "_attachment": "attmt"}, o.f);
    o.tick(o);

    // alldocs
    // error 405 -> Method not allowed
    o.spy(o, "status", 405, "AllDocs fail");
    o.jio.allDocs(o.f);
    o.tick(o);

    o.jio.stop();
});

test ("All document not found", function () {
    // Tests the request methods without document

    var o = generateTools(this);

    // All Ok Dummy Storage
    o.jio = JIO.newJio({"type": "dummyallnotfound"});

    // post document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Post document");
    o.jio.post({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Put document");
    o.jio.put({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put an attachment without attachment id
    // error 22 -> attachment id required
    o.spy(o, "status", 22,
          "Put attachment without id");
    o.jio.putAttachment({
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file", "attachment": "attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file",
        "_attachment": "attmt",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "status", 404, "Get document");
    o.jio.get({"_id": "file"}, o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "status", 404, "Get attachment");
    o.jio.get({"_id": "file/attmt"}, o.f);
    o.tick(o);

    // remove document
    o.spy(o, "status", 404, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "status", 404, "Remove attachment");
    o.jio.removeAttachment({"_id": "file", "_attachment": "attmt"}, o.f);
    o.tick(o);

    o.jio.stop();
});

test ("All document found", function () {
    // Tests the request methods with document

    var o = generateTools(this);

    // All Ok Dummy Storage
    o.jio = JIO.newJio({"type": "dummyallfound"});

    // post non empty document
    o.spy(o, "status", 409, "Post document");
    o.jio.post({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put non empty document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Put non empty document");
    o.jio.put({"_id": "file", "title": "myFile"}, o.f);
    o.tick(o);

    // put an attachment without attachment id
    // error 22 -> attachment id required
    o.spy(o, "status", 22,
          "Put attachment without id");
    o.jio.putAttachment({
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file", "attachment": "attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file",
        "_attachment": "attmt",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "value", {"_id": "file", "title": "get_title"}, "Get document");
    o.jio.get({"_id": "file"}, o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "value", "0123456789", "Get attachment");
    o.jio.getAttachment({"_id": "file", "_attachment": "attmt"}, o.f);
    o.tick(o);

    // remove document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "file", "attachment": "attmt"},
          "Remove attachment");
    o.jio.removeAttachment({"_id": "file", "_attachment": "attmt"}, o.f);
    o.tick(o);

    o.jio.stop();
});

// NOTES: this test is for a live webDav server on localstorage
// see the documentation how to setup an apache2 webDav-server
// tests cannot be run subsequently, so only do one test at a time
/*
test ("webDav Live Server setup", function () {

    var o = generateTools(this);

    // turn off fakeserver - otherwise no requests will be made
    o.server.restore();

    o.jio = JIO.newJio({
        "type": "dav",
        "username": "davlive",
        "password": "checkpwd",
        "url": "http://127.0.1.1/dav"
    });

    // not used, check console for responses
    // o.spy(o, "value", {"id": "_id_", "ok": true}, "Live Webdav");

    // post a new document
    o.jio.post({"_id": "one.json", "title": "hello"}), o.f);
    o.clock.tick(5000);

    // modify document
    o.jio.put({"_id": "one.json", "title": "hello modified"}), o.f);
    o.clock.tick(5000);

    // add attachment
    o.jio.putAttachment({
      "id": "one.json/att.txt",
      "mimetype": "text/plain",
      "content":"there2"
    }, o.f);

    // test allDocs
    o.jio.allDocs({"include_docs":true},
      function(s){console.log(s);},
      function ( e ) {console.log(e);
    }, o.f);
    o.clock.tick(5000);

    // get Attachment
    o.jio.get("one.json/att.txt", o.f);
    o.clock.tick(5000);

    // remove Attachment
    o.jio.remove("one.json/att.txt", o.f.);
    o.clock.tick(5000);

    // remove Document
    o.jio.remove("one.json", o.f.);
    o.clock.tick(5000);
    o.jio.stop();
});
*/
/*
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
*/
/*
module ('Jio CryptedStorage');

test ('Document save' , function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    clock.tick(base_tick);
    o.jio=JIO.newJio({type:'crypt',
                      username:'cryptsave',
                      password:'mypwd',
                      storage:{type:'local',
                               username:'cryptsavelocal',
                               application_name:'jiotests'}});
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
                               application_name:'jiotests'}});
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
                               application_name:'jiotests'}});
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
                               application_name:'jiotests'}});
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
                                 application_name:'jiotests'}});
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
    o.sub_storage_spec = {type:'local',
                            username:'revisionconflict',
                            application_name:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.sub_storage_spec});
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
    o.sub_storage_spec = {type:'local',
                            username:'conflictconflict',
                            application_name:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.sub_storage_spec});
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
    o.sub_storage_spec = {type:'local',
                            username:'removeconflict',
                            application_name:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.sub_storage_spec});

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
    o.sub_storage_spec = {type:'local',
                            username:'loadrevisions',
                            application_name:'jiotests'}
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.sub_storage_spec});
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
    o.sub_storage_spec = {type:'local',
                            username:'getrevisionlist',
                            application_name:'jiotests'}
    o.rev = {};
    //////////////////////////////////////////////////////////////////////
    o.jio = JIO.newJio({type:'conflictmanager',
                        storage:o.sub_storage_spec});
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
/*
test ("AllDocs", function () {

  // need to make server requests before activating fakeServer
  var davlist = getXML('responsexml/davlist'),
    o = setUp(this);

  // get allDocs, no content
  addFakeServerResponse("xwiki", "PROPFIND", "", 200, davlist);
  o.thisShouldBeTheAnswer = {
      "rows": [
        {"id": "alldocs1", "key": "alldocs1", "value": {}},
        {"id": "alldocs2", "key": "alldocs2", "value": {}}
      ],
      "total_rows": 2
  }
  o.spy(o, "value", o.thisShouldBeTheAnswer, "allDocs (no content)");
  o.jio.allDocs(o.f);
  o.clock.tick(5000);
  respond();

  // allDocs with option include
  o.all1 = {"_id": "allDocs1", "title": "a doc title"};
  o.all2 = {"_id": "allDocs2", "title": "another doc title"};
  o.thisShouldBeTheAnswer = {
      "rows": [
        {"id": "alldocs1", "key": "alldocs1", "value": {}, "doc": o.all1},
        {"id": "alldocs2", "key": "alldocs2", "value": {}, "doc": o.all2}
      ],
      "total_rows": 2
  }
  addFakeServerResponse("xwiki", "GET", "alldocs1", 200,
    JSON.stringify(o.all1));
  addFakeServerResponse("xwiki", "GET", "alldocs2", 200,
    JSON.stringify(o.all2));
  o.spy(o, "value", o.thisShouldBeTheAnswer, "allDocs (include_docs)");
  o.jio.allDocs({"include_docs":true}, o.f);
  o.clock.tick(5000);
  respond();

  o.jio.stop();
});
*/

module("Amazon S3 Storage");

/*
Post without id
Create = POST non empty document
Post but document already exists
*/

test ("Post", function(){
   var o = generateTools(this);
    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"https://jiobucket.s3.amazonaws.com"
    });

    o.server = sinon.fakeServer.create();

    //Post without ID (ID is generated by storage)

    o.server.respondWith("GET",
    "https://jiobucket.s3.amazonaws.com/",
    [404, {}, "HTML Response"]
    );

    o.server.respondWith("POST",
    "https://jiobucket.s3.amazonaws.com/",
    [204, {}, "HTML Response"]
    );

    //o.spy (o, "status", 405, "Post without id");
    o.spy(o, "jobstatus", "done", "Post without ID");
    o.jio.post({}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();


    //Post with ID
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
    "https://jiobucket.s3.amazonaws.com/post1",
    [404, {}, "HTML Response"]
    );

    o.server.respondWith("POST",
    "https://jiobucket.s3.amazonaws.com/",
    [204, {}, "HTML Response"]
    );

    o.spy(o, "value", {'ok':true,'id':'post1'}, "Post with ID");
    o.jio.post({"_id": "post1", "title": "myPost1"}, o.f);

    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();


    //Post but document already exists (update)
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/post2",
    [200, {}, "HTML Response"]
    );

    o.spy (o, "status", 409, "Post but document already exists (update)");
    //o.spy(o, "jobstatus", "done", "Post without ID");
    o.jio.post({"_id": "post2", "title": "myPost2"}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();
});

/*
Put without id
Create = PUT non empty document
Updated the document
*/


test("Put", function(){
    var o = generateTools(this);
    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"http://s3.amazonaws.com/jiobucket/put1"
    });

    // put without id => id required
    o.server = sinon.fakeServer.create();
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);

    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    //Put non empty document
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [404, {}, "HTML Response"]
    );

    o.server.respondWith("PUT",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200, {}, "HTML Response"]
    );

    o.spy (o, "value", {"ok": true, "id": "http://100%.json"},
           "PUT non empty document");

    o.jio.put({"_id": "http://100%.json", "title": "myPut1"}, o.f);

    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    //Put an existing document (update)
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200, {}, "HTML Response"]
    );

    o.server.respondWith("PUT",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200, {}, "HTML Response"]
    );

    o.spy (o, "value", {"ok": true, "id": "http://100%.json"},
           "PUT non empty document");

    o.jio.put({"_id": "http://100%.json", "title": "myPut1"}, o.f);

    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();

});


test ("PutAttachment", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"https://jiobucket.s3.amazonaws.com"
    });

    //PutAttachment without document ID (document ID is required)
    o.server = sinon.fakeServer.create();

    //PutAttachment without attachment ID (attachment ID is required)
    o.spy(o, "status", 20, "PutAttachment without doc id -> 20");
    o.jio.putAttachment({"_attachment": "putattmt1"}, o.f);
    o.tick(o);

    // putAttachment without attachment id => 22 Attachment Id Required
    o.spy(o, "status", 22, "PutAttachment without attachment id -> 22");
    o.jio.putAttachment({"_id": "http://100%.json"}, o.f);
    o.tick(o);

    //PutAttachment without underlying document (document is required)
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [404, {}, "HTML Response"]
    );

    o.spy(o, "status", 404, "PutAttachment without document -> 404");
    o.jio.putAttachment({
      "_id": "http://100%.json",
      "_attachment": "putattmt2"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    //PutAttachment
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200,{"Content-Type": "text/plain"},'{"_id":"http://100%.json","title":"Hi There!"}']
    );

    o.server.respondWith("PUT",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200, {}, "HTML Response"]
    );

    o.server.respondWith("PUT",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json.body_.html",
    [200, {}, "HTML Response"]
    );

    o.spy(o, "value", {
      "ok": true,
      "id": "http://100%.json",
      "attachment": "body.html"
    }, "PutAttachment");

    o.jio.putAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html",
      "_mimetype": "text/html",
      "_data": "<h1>Hi There!!</h1><p>How are you?</p>"
    }, {"max_retry": 1}, o.f);

    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();

});


/*
Get non existing document
Get non existing attachment
Get document
Get non existing attachment (doc exists)
Get attachment
*/

test("Get", function(){
    var o = generateTools(this);
    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"https://jiobucket.s3.amazonaws.com"
    });

    //Get non existing document
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
        "https://jiobucket.s3.amazonaws.com/doc",
        [404, {}, "HTML Response"]
        );

    o.spy(o, "status", 404, "Get non existing document" );

    o.jio.get("doc", {"max_retry":1}, o.f);

    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    //Get document
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200,{"Content-Type": "text/plain"},'{"_id":"http://100%.json","title":"Hi There!"}']
    );


    o.spy(o, "value", {"_id":"http://100%.json","title":"Hi There!"}, "Get document" )
    o.jio.get({"_id":"http://100%.json"}, {"max_retry":1}, o.f);

    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();
});

test("GetAttachment", function(){
    var o = generateTools(this);
    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"https://jiobucket.s3.amazonaws.com"
    });

    //Get non existing attachment
    o.server = sinon.fakeServer.create();
    o.server.respondWith("GET",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json.body_.html",
        [404, {}, "HTML Response"]
        );

    o.spy(o, "status", 404, "Get non existing attachment" );

    o.jio.getAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);

    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    //Get attachment
    o.server = sinon.fakeServer.create();
        o.server.respondWith("GET",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json.body_.html",
        [200, {"Content-Type": "text/plain"}, "My Attachment Content"]
        );

    o.spy(o, "value", "My Attachment Content", "Get attachment");

    o.jio.getAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);

    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();
});


//begins the remove tests

/*
Remove inexistent document
Remove inexistent document/attachment
Remove document
Check index file
Check if document has been removed
Remove one of multiple attachment
Check index file
Remove one document and attachment together
Check index file
Check if attachment has been removed
Check if document has been removed
*/

test ("Remove", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"https://jiobucket.s3.amazonaws.com/"
    });

    //Remove non-existing document
    o.server = sinon.fakeServer.create();
    o.server.respondWith("DELETE",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
        [404, {}, "HTML RESPONSE"]
        );

    o.spy(o, "status", 404, "Remove non existing document");
    o.jio.remove({"_id": "http://100%.json"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.server.restore();

    //Remove document
    o.server = sinon.fakeServer.create();
    o.server.respondWith("DELETE",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
        [200, {"Content-Type": "text/plain"}, "My Attachment Content"]
        );

    o.spy(o, "value", {"ok":true, "id":"http://100%.json"}, "Remove document");
    o.jio.remove({"_id": "http://100%.json"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    //Remove document with multiple attachments
    o.server = sinon.fakeServer.create();

    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
          [
        200,
        {"Content-Type": "text/html"},
        JSON.stringify({
          "_attachments": {
            "body.html": {
              "length": 32,
              "digest": "md5-dontcare",
              "content_type": "text/html"
            },
            "other": {
              "length": 3,
              "digest": "md5-dontcare-again",
              "content_type": "text/plain"
            }
          }
        })
      ]
    );

    o.server.respondWith("DELETE",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
        [200, {"Content-Type": "text/plain"}, "<h1>Deleted</h1>"]
        );

    o.server.respondWith("DELETE",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json.body_.html",
        [200, {"Content-Type": "text/plain"}, "<h1>Deleted</h1>"]
        );

    o.server.respondWith("DELETE",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json.other",
        [200, {"Content-Type": "text/plain"}, "<h1>Deleted</h1>"]
        );

    o.spy(o, "value", {"ok": true, "id": "http://100%.json"},
          "Remove document containing multiple attachments");
    o.jio.remove({"_id": "http://100%.json"}, {"max_retry": 1}, o.f);
    o.clock.tick(1000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();
});

test ("RemoveAttachment", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"https://jiobucket.s3.amazonaws.com/"
    });

    //Remove non-existing attachment
    o.server = sinon.fakeServer.create();

    o.server.respondWith("DELETE",
        "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json.body_.html",
        [404, {}, "HTML RESPONSE"]
        );

    o.spy(o, "status", 404, "Remove non existing attachment");
        o.jio.removeAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.server.restore();

    //Remove attachment
    o.server = sinon.fakeServer.create();

    o.server.respondWith("GET",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200,{"Content-Type": "text/plain"},'{"_id":"http://100%.json","title":"Hi There!"}']
    );

    o.server.respondWith("PUT",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json",
    [200,{"Content-Type": "text/plain"},'{"_id":"http://100%.json","title":"Hi There!"}']
    );

    o.server.respondWith("DELETE",
    "http://s3.amazonaws.com/jiobucket/http:%252F%252F100%2525_.json.body_.html",
    [200, {"Content-Type": "text/plain"}, "My Attachment Content"]
    );

    o.spy(o, "value", {
      "ok": true,
      "id": "http://100%.json",
      "attachment": "body.html"
    }, "Remove attachment");

    o.jio.removeAttachment({
      "_id": "http://100%.json",
      "_attachment": "body.html"
    }, {"max_retry": 1}, o.f);

    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();
});


test ("AllDocs", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type":"s3",
        "AWSIdentifier":"dontcare",
        "password":"dontcare",
        "server":"jiobucket",
        "url":"https://jiobucket.s3.amazonaws.com/"
    });

    //allDocs without option
    o.server = sinon.fakeServer.create();

    o.server.respondWith("GET",
        "http://s3.amazonaws.com/jiobucket/",
        [204, {}, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>jiobucket</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>documentONE</Key><LastModified>2013-05-03T15:32:01.000Z</LastModified><ETag>&quot;8a65389818768e1f5e6530a949233581&quot;</ETag><Size>163</Size><Owner><ID>5d09e586ab92acad85e9d053f769cce65f82178e218d9ac9b0473f3ce7f89606</ID><DisplayName>jonathan.rivalan</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>documentONE.1st_Attachment_manual</Key><LastModified>2013-05-03T15:32:02.000Z</LastModified><ETag>&quot;f391dec65366d2b470406bc7b9595dea&quot;</ETag><Size>35</Size><Owner><ID>5d09e586ab92acad85e9d053f769cce65f82178e218d9ac9b0473f3ce7f89606</ID><DisplayName>jonathan.rivalan</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>']
        );

    o.spy(o, "jobstatus", "done", "AllDocs without include docs");
    o.jio.allDocs(o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    //allDocs with the include docs option
    o.server = sinon.fakeServer.create();

    o.server.respondWith("GET",
        "http://s3.amazonaws.com/jiobucket/",
        [204, {}, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>jiobucket</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>documentONE</Key><LastModified>2013-05-03T15:32:01.000Z</LastModified><ETag>&quot;8a65389818768e1f5e6530a949233581&quot;</ETag><Size>163</Size><Owner><ID>5d09e586ab92acad85e9d053f769cce65f82178e218d9ac9b0473f3ce7f89606</ID><DisplayName>jonathan.rivalan</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>documentONE.1st_Attachment_manual</Key><LastModified>2013-05-03T15:32:02.000Z</LastModified><ETag>&quot;f391dec65366d2b470406bc7b9595dea&quot;</ETag><Size>35</Size><Owner><ID>5d09e586ab92acad85e9d053f769cce65f82178e218d9ac9b0473f3ce7f89606</ID><DisplayName>jonathan.rivalan</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>']
        );

    o.server.respondWith("GET",
    "http://jiobucket.s3.amazonaws.com/documentONE",
          [
        200,
        {"Content-Type": "text/html"},
        JSON.stringify({
          "_attachments": {
            "body.html": {
              "length": 32,
              "digest": "md5-dontcare",
              "content_type": "text/html"
            },
            "other": {
              "length": 3,
              "digest": "md5-dontcare-again",
              "content_type": "text/plain"
            }
          }
        })
      ]
    );

    console.log(o);

    o.spy(o, "jobstatus", "done", "AllDocs with include docs");
    o.jio.allDocs({"include_docs": true},o.f);
    console.log(o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.tick(o);
    o.server.restore();

    o.jio.stop();
});

};                              // end thisfun

if (window.requirejs) {
    require.config ({
        paths: {
            jiotestsloader: './jiotests.loader',

            jQueryAPI: '../lib/jquery/jquery',
            jQuery: '../js/jquery.requirejs_module',
            JIO: '../src/jio',
            JIODummyStorages: '../src/jio.dummystorages',
            JIOStorages: '../src/jio.storage',
            SJCLAPI:'../lib/sjcl/sjcl.min',
            SJCL:'../js/sjcl.requirejs_module'
        }
    });
    require(['jiotestsloader'],thisfun);
} else {
    thisfun ({JIO:jIO});
}

}());
