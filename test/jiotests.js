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
module ("Jio IndexStorage");

test ("Post", function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["title"]},
        {"id": "B", "index": ["title", "year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "ipost",
        "application_name": "ipost"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // post without id
    o.spy (o, "jobstatus", "done", "Post without id");
    o.jio.post({}, function (err, response) {
      o.id = (response || {}).id;
      o.f(err, response);
    });
    o.tick(o);

    // post non empty document
    o.doc = {"_id": "some_id", "title": "My Title",
             "year": 2000, "hey": "def"};
    o.spy (o, "value", {"ok": true, "id": "some_id"}, "Post document");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.fakeIndexA = {
      "indexing": ["title"],
      "free": [],
      "location": {
        "some_id": 0
      },
      "database": [
        {"_id": "some_id", "title": "My Title"}
      ]
    };
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB = {
      "indexing": ["title", "year"],
      "free": [],
      "location": {
        "some_id": 0
      },
      "database": [
        {"_id": "some_id", "title": "My Title", "year": 2000}
      ]
    };
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // post with escapable characters
    o.doc = {"_id": "other_id", "title": "myPost2",
      "findMeA":"keyword_*§$%&/()=?", "findMeB":"keyword_|ð@ł¶đæðſæðæſ³"
    };
    o.spy (o, "value", {"ok": true, "id": "other_id"},
           "Post with escapable characters");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // post and document already exists
    o.doc = {"_id": "some_id", "title": "myPost3",
      "findMeA":"keyword_ghi", "findMeB":"keyword_jkl"
    }
    o.spy (o, "status", 409, "Post and document already exists");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    o.jio.stop();
});

test ("Put", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "iput",
        "application_name": "iput"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // put without id
    // error 20 -> document id required
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.doc = {"_id": "put1", "title": "myPut1", "author": "John Doe"};
    o.spy (o, "value", {"ok": true, "id": "put1"}, "Put-create document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndexA = {
      "indexing": ["author"],
      "free": [],
      "location": {
        "put1": 0
      },
      "database": [{"_id": "put1", "author": "John Doe"}]
    };
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB = {
      "indexing": ["year"],
      "free": [],
      "location": {},
      "database": []
    };
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // modify document - modify keyword on index!
    o.doc = {"_id": "put1", "title": "myPuttter1", "author": "Jane Doe"};
    o.spy (o, "value", {"ok": true, "id": "put1"}, "Modify existing document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndexA.database[0].author = "Jane Doe";
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // add new document with same keyword!
    o.doc = {"_id": "new_doc", "title": "myPut2", "author": "Jane Doe"};
    o.spy (o, "value", {"ok": true, "id": "new_doc"},
           "Add new document with same keyword");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndexA.location.new_doc = 1;
    o.fakeIndexA.database.push({"_id": "new_doc", "author": "Jane Doe"});
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // add second keyword to index file
    o.doc = {"_id": "put1", "title": "myPut2", "author": "Jane Doe",
             "year":"1912"};
    o.spy (o, "value", {"ok": true, "id": "put1"},
           "add second keyword to index file");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB.location.put1 = 0;
    o.fakeIndexB.database.push({"_id": "put1", "year": "1912"});
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // remove a keyword from an existing document
    o.doc = {"_id": "new_doc", "title": "myPut2"};
    o.spy (o, "value", {"ok": true, "id": "new_doc"},
           "Remove keyword from existing document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    delete o.fakeIndexA.location.new_doc;
    o.fakeIndexA.database[1] = null;
    o.fakeIndexA.free.push(1);
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.jio.stop();
});

test("Check & Repair", function () {
  var o = generateTools(this), i;

  o.jio = JIO.newJio({
    "type": "indexed",
    "indices": [
      {"id": "A", "index": ["director"]},
      {"id": "B", "index": ["year"]}
    ],
    "sub_storage": {
      "type": "local",
      "username": "indexstoragerepair"
    }
  });

  o.getAttachmentCallback = function (err, response) {
    if (response) {
      try {
        response = JSON.parse(response);
      } catch (e) {
        response = "PARSE ERROR " + response;
      }
      delete response.location;
      response.database.sort(function (a, b) {
        return a._id < b._id ? -1 : a._id > b._id ? 1 : 0;
      });
    }
    o.f(err, response);
  };

  o.fakeIndexA = {
    "indexing": ["director"],
    "free": [],
    "database": []
  };
  o.fakeIndexB = {
    "indexing": ["year"],
    "free": [],
    "database": []
  };

  for (i = 0; i < 10; i += 1) {
    o.jio.put({
      "_id": "id" + i,
      "director": "D" + i,
      "year": i,
      "title": "T" + i
    });

    o.tmp = o.fakeIndexA.free.pop() || o.fakeIndexA.database.length;
    o.fakeIndexA.database[o.tmp] = {"_id": "id" + i, "director": "D" + i};

    o.tmp = o.fakeIndexB.free.pop() || o.fakeIndexB.database.length;
    o.fakeIndexB.database[o.tmp] = {"_id": "id" + i, "year": i};
  }
  o.clock.tick(5000);

  o.spy(o, "status", 40, "Check database");
  o.jio.check({"_id": "A"}, o.f);
  o.tick(o);

  o.spy(o, "status", 40, "Check database");
  o.jio.check({"_id": "B"}, o.f);
  o.tick(o);

  o.spy(o, "value", {"id": "A", "ok": true}, "Repair database");
  o.jio.repair({"_id": "A"}, o.f);
  o.tick(o);

  o.spy(o, "value", {"id": "B", "ok": true}, "Repair database");
  o.jio.repair({"_id": "B"}, o.f);
  o.tick(o);

  o.spy(o, "value", {"id": "A", "ok": true}, "Check database again");
  o.jio.check({"_id": "A"}, o.f);
  o.tick(o);

  o.spy(o, "value", {"id": "B", "ok": true}, "Check database again");
  o.jio.check({"_id": "B"}, o.f);
  o.tick(o);

  // check index file
  o.spy(o, "value", o.fakeIndexA, "Manually check index file");
  o.jio.getAttachment({
    "_id": "A",
    "_attachment": "body"
  }, o.getAttachmentCallback);
  o.tick(o);

  o.spy(o, "value", o.fakeIndexB, "Manually check index file");
  o.jio.getAttachment({
    "_id": "B",
    "_attachment": "body"
  }, o.getAttachmentCallback);
  o.tick(o);

  o.jio2 = JIO.newJio({"type": "local", "username": "indexstoragerepair"});

  o.jio2.put({"_id": "blah", "title": "t", "year": "y", "director": "d"});
  o.clock.tick(1000);
  o.jio2.stop();

  o.fakeIndexA.database.unshift({"_id": "blah", "director": "d"});
  o.fakeIndexB.database.unshift({"_id": "blah", "year": "y"});

  o.spy(o, "status", 40, "Check Document");
  o.jio.check({"_id": "blah"}, o.f)
  o.tick(o);

  o.spy(o, "value", {"id": "blah", "ok": true}, "Repair Document");
  o.jio.repair({"_id": "blah"}, o.f)
  o.tick(o);

  o.spy(o, "value", {"id": "blah", "ok": true}, "Check Document again");
  o.jio.repair({"_id": "blah"}, o.f)
  o.tick(o);

  // check index file
  o.spy(o, "value", o.fakeIndexA, "Manually check index file");
  o.jio.getAttachment({
    "_id": "A",
    "_attachment": "body"
  }, o.getAttachmentCallback);
  o.tick(o);

  o.spy(o, "value", o.fakeIndexB, "Manually check index file");
  o.jio.getAttachment({
    "_id": "B",
    "_attachment": "body"
  }, o.getAttachmentCallback);
  o.tick(o);

  o.jio.stop();
});

test ("PutAttachment", function(){

    // not sure these need to be run, because the index does not change
    // and only small modifications have been made to handle putAttachment
    // tests are from localStorage putAttachment
    var o = generateTools(this);

    o.jio = JIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "iputatt",
        "application_name": "iputatt"
      }
    });

    // putAttachment without doc id
    // error 20 -> document id required
    o.spy(o, "status", 20, "PutAttachment without doc id");
    o.jio.putAttachment({}, o.f);
    o.tick(o);

    // putAttachment without attachment id
    // error 22 -> attachment id required
    o.spy(o, "status", 22, "PutAttachment without attachment id");
    o.jio.putAttachment({"_id": "putattmt1"}, o.f);
    o.tick(o);

    // putAttachment without document
    // error 404 -> not found
    o.spy(o, "status", 404, "PutAttachment without document");
    o.jio.putAttachment({"_id": "putattmt1", "_attachment": "putattmt2"}, o.f);
    o.tick(o);

    // putAttachment with document
    o.doc = {"_id": "putattmt1","title": "myPutAttmt1"};
    o.spy (o, "value", {"ok": true, "id": "putattmt1"},
           "Put underlying document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    o.spy(o, "value",
          {"ok": true, "id": "putattmt1", "attachment": "putattmt2"},
          "PutAttachment with document, without data");
    o.jio.putAttachment({"_id": "putattmt1", "_attachment": "putattmt2"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem("jio/localstorage/iputatt/iputatt/putattmt1"),
        {
            "_id": "putattmt1",
            "title": "myPutAttmt1",
            "_attachments": {
                "putattmt2": {
                    "length": 0,
                    // md5("")
                    "digest": "md5-d41d8cd98f00b204e9800998ecf8427e"
                }
            }
        },
        "Check document"
    );

    // check attachment
    deepEqual(
        localstorage.getItem(
            "jio/localstorage/iputatt/iputatt/putattmt1/putattmt2"),
        "", "Check attachment"
    );

    // update attachment
    o.spy(o, "value",
          {"ok": true, "id": "putattmt1", "attachment": "putattmt2"},
          "Update Attachment, with data");
    o.jio.putAttachment({
      "_id": "putattmt1",
      "_attachment": "putattmt2",
      "_data": "abc"
    }, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem("jio/localstorage/iputatt/iputatt/putattmt1"),
        {
            "_id": "putattmt1",
            "title": "myPutAttmt1",
            "_attachments": {
                "putattmt2": {
                    "length": 3,
                    // md5("abc")
                    "digest": "md5-900150983cd24fb0d6963f7d28e17f72"
                }
            }
        },
        "Check document"
    );

    // check attachment
    deepEqual(
        localstorage.getItem(
            "jio/localstorage/iputatt/iputatt/putattmt1/putattmt2"),
        "abc", "Check attachment"
    );

    o.jio.stop();
});

test ("Get", function(){

    // not sure these need to be run, because the index does not change
    // and only small modifications have been made to handle putAttachment
    // tests are from localStorage putAttachment
    var o = generateTools(this);

    o.jio = JIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "iget",
        "application_name": "iget"
      }
    });

    // get inexistent document
    o.spy(o, "status", 404, "Get inexistent document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment
    o.spy(o, "status", 404, "Get inexistent attachment");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // adding a document
    o.doc_get1 = {
        "_id": "get1",
        "title": "myGet1"
    };
    localstorage.setItem("jio/localstorage/iget/iget/get1", o.doc_get1);

    // get document
    o.spy(o, "value", o.doc_get1, "Get document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment (document exists)
    o.spy(o, "status", 404, "Get inexistent attachment (document exists)");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // adding an attachment
    o.doc_get1["_attachments"] = {
        "get2": {
            "length": 2,
            // md5("de")
            "digest": "md5-5f02f0889301fd7be1ac972c11bf3e7d"
        }
    };
    localstorage.setItem("jio/localstorage/iget/iget/get1", o.doc_get1);
    localstorage.setItem("jio/localstorage/iget/iget/get1/get2", "de");

    // get attachment
    o.spy(o, "value", "de", "Get attachment");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    o.jio.stop();
});

test ("Remove", function(){

    // not sure these need to be run, because the index does not change
    // and only small modifications have been made to handle putAttachment
    // tests are from localStorage putAttachment
    var o = generateTools(this);

    o.jio = JIO.newJio({
      "type": "indexed",
      "indices": [
        {"id": "A", "index": ["author"]},
        {"id": "B", "index": ["year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "irem",
        "application_name": "irem"
      }
    });

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // remove inexistent document
    o.spy(o, "status", 404, "Remove inexistent document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // remove inexistent document/attachment
    o.spy(o, "status", 404, "Remove inexistent attachment");
    o.jio.removeAttachment({"_id": "remove1", "_attachment": "remove2"}, o.f);
    o.tick(o);

    // adding a document
    o.jio.put({"_id": "remove1", "title": "myRemove1",
      "author": "Mr. President", "year": "2525"
    });
    o.tick(o);

    // adding a 2nd document with same keywords
    o.jio.put({"_id": "removeAlso", "title": "myRemove2",
      "author": "Martin Mustermann", "year": "2525"
    });
    o.tick(o);

    // remove document
    o.spy(o, "value", {"ok": true, "id": "remove1"}, "Remove document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // check index
    o.fakeIndexA = {
      "indexing": ["author"],
      "free": [0],
      "location": {
        "removeAlso": 1
      },
      "database": [null, {"_id": "removeAlso", "author": "Martin Mustermann"}]
    };
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB = {
      "indexing": ["year"],
      "free": [0],
      "location": {
        "removeAlso": 1
      },
      "database": [null, {"_id": "removeAlso", "year": "2525"}]
    };
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // check document
    o.spy(o, "status", 404, "Check if document has been removed");
    o.jio.get({"_id": "remove1"}, o.f);
    o.tick(o);

    // adding a new document
    o.jio.put({"_id": "remove3",
        "title": "myRemove1",
        "author": "Mrs Sunshine",
        "year": "1234"
    });
    o.tick(o);

    // adding an attachment
    o.jio.putAttachment({
      "_id": "remove3",
      "_attachment": "removeAtt",
      "_mimetype": "text/plain",
      "_data": "hello"});
    o.tick(o);

    // add another attachment
    o.jio.putAttachment({
      "_id": "remove3",
      "_attachment": "removeAtt2",
      "_mimetype": "text/plain",
      "_data": "hello2"});
    o.tick(o);

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "remove3", "attachment": "removeAtt2"},
          "Remove one of multiple attachment");
    o.jio.removeAttachment({"_id": "remove3", "_attachment": "removeAtt2"},
                           o.f);
    o.tick(o);

    // check index
    o.fakeIndexA.free = [];
    o.fakeIndexA.location.remove3 = 0;
    o.fakeIndexA.database[0] = {"_id": "remove3", "author": "Mrs Sunshine"};
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB.free = [];
    o.fakeIndexB.location.remove3 = 0;
    o.fakeIndexB.database[0] = {"_id": "remove3", "year": "1234"};
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // remove document and attachment together
    o.spy(o, "value", {"ok": true, "id": "remove3"},
          "Remove one document and attachment together");
    o.jio.remove({"_id": "remove3"}, o.f);
    o.tick(o);

    // check index
    o.fakeIndexA.free = [0];
    delete o.fakeIndexA.location.remove3;
    o.fakeIndexA.database[0] = null;
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.fakeIndexB.free = [0];
    delete o.fakeIndexB.location.remove3;
    o.fakeIndexB.database[0] = null;
    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // check attachment
    o.spy(o, "status", 404, "Check if attachment has been removed");
    o.jio.getAttachment({"_id": "remove3", "_attachment": "removeAtt"}, o.f);
    o.tick(o);

    // check document
    o.spy(o, "status", 404, "Check if document has been removed");
    o.jio.get({"_id": "remove3"}, o.f);
    o.tick(o);

    o.jio.stop();
});

test ("AllDocs", function () {

  var o = generateTools(this);

  o.jio = JIO.newJio({
    "type": "indexed",
    "indices": [
      {"id": "A", "index": ["author"]},
      {"id": "B", "index": ["year"]}
    ],
    "sub_storage": {
      "type": "local",
      "username": "iall",
      "application_name": "iall"
    }
  });

  o.getAttachmentCallback = function (err, response) {
    if (response) {
      try {
        response = JSON.parse(response);
      } catch (e) {
        response = "PARSE ERROR " + response;
      }
    }
    o.f(err, response);
  };

  // adding documents
  o.all1 = { "_id": "dragon.doc",
    "title": "some title", "author": "Dr. No", "year": "1968"
  };
  o.spy (o, "value", {"ok": true, "id": "dragon.doc"}, "Put 1");
  o.jio.put(o.all1, o.f);
  o.tick(o);
  o.all2 = {"_id": "timemachine",
    "title": "hello world", "author": "Dr. Who", "year": "1968"
  }
  o.spy (o, "value", {"ok": true, "id": "timemachine"}, "Put 2");
  o.jio.put(o.all2, o.f);
  o.tick(o);
  o.all3 = {"_id": "rocket.ppt",
    "title": "sunshine.", "author": "Dr. Snuggles", "year": "1985"
  }
  o.spy (o, "value", {"ok": true, "id": "rocket.ppt"}, "Put 3");
  o.jio.put(o.all3, o.f);
  o.tick(o);
  o.all4 = {"_id": "stick.jpg",
    "title": "clouds", "author": "Dr. House", "year": "2005"
  }
  o.spy (o, "value", {"ok": true, "id": "stick.jpg"}, "Put 4");
  o.jio.put(o.all4, o.f);
  o.tick(o);

  // check index
  o.fakeIndexA = {
    "indexing": ["author"],
    "free": [],
    "location": {
      "dragon.doc": 0,
      "timemachine": 1,
      "rocket.ppt": 2,
      "stick.jpg": 3
    },
    "database": [
      {"_id": "dragon.doc", "author": "Dr. No"},
      {"_id": "timemachine", "author": "Dr. Who"},
      {"_id": "rocket.ppt", "author": "Dr. Snuggles"},
      {"_id": "stick.jpg", "author": "Dr. House"}
    ]
  };
  o.spy(o, "value", o.fakeIndexA, "Check index file");
  o.jio.getAttachment({
    "_id": "A",
    "_attachment": "body"
  }, o.getAttachmentCallback);
  o.tick(o);

  o.thisShouldBeTheAnswer = {
    "rows": [
      {"id": "dragon.doc", "key": "dragon.doc", "value": {} },
      {"id": "timemachine", "key": "timemachine", "value": {} },
      {"id": "rocket.ppt", "key": "rocket.ppt", "value": {} },
      {"id": "stick.jpg", "key": "stick.jpg", "value": {} }
    ],
    "total_rows": 4
  }
  o.spy(o, "value", o.thisShouldBeTheAnswer, "allDocs (served by index)");
  o.jio.allDocs(o.f);
  o.tick(o);

  o.jio.stop();
});

test ("AllDocs Complex Queries", function () {

  var o = generateTools(this), i, m = 15;

    o.jio = JIO.newJio({
      "type": "indexed",
      "indices": [
        {"id":"A", "index": ["director"]},
        {"id":"B", "index": ["title", "year"]}
      ],
      "sub_storage": {
        "type": "local",
        "username": "icomplex",
        "application_name": "acomplex"
      }
    });
    o.localpath = "jio/localstorage/icomplex/acomplex";

    o.getAttachmentCallback = function (err, response) {
      if (response) {
        try {
          response = JSON.parse(response);
        } catch (e) {
          response = "PARSE ERROR " + response;
        }
      }
      o.f(err, response);
    };

    // sample data
    o.titles = ["Shawshank Redemption", "Godfather", "Godfather 2",
      "Pulp Fiction", "The Good, The Bad and The Ugly", "12 Angry Men",
      "The Dark Knight", "Schindlers List",
      "Lord of the Rings - Return of the King", "Fight Club",
      "Star Wars Episode V", "Lord Of the Rings - Fellowship of the Ring",
      "One flew over the Cuckoo's Nest", "Inception", "Godfellas"
    ];
    o.years = [1994,1972,1974,1994,1966,1957,2008,1993,2003,1999,1980,2001,
               1975,2010,1990];
    o.director = ["Frank Darabont", "Francis Ford Coppola",
      "Francis Ford Coppola", "Quentin Tarantino", "Sergio Leone",
      "Sidney Lumet", "Christopher Nolan", "Steven Spielberg",
      "Peter Jackson", "David Fincher", "Irvin Kershner", "Peter Jackson",
      "Milos Forman", "Christopher Nolan", " Martin Scorsese"
    ];

    o.fakeIndexA = {
      "indexing": ["director"],
      "free": [],
      "location": {},
      "database": []
    };

    o.fakeIndexB = {
      "indexing": ["title", "year"],
      "free": [],
      "location": {},
      "database": []
    };

    for (i = 0; i < m; i += 1) {
      o.jio.put({
        "_id": "" + i,
        "director": o.director[i],
        "year": o.years[i],
        "title": o.titles[i]
      });

      o.tmp = o.fakeIndexA.free.pop() || o.fakeIndexA.database.length;
      o.fakeIndexA.database[o.tmp] = {"_id": "" + i, "director": o.director[i]};
      o.fakeIndexA.location["" + i] = o.tmp;

      o.tmp = o.fakeIndexB.free.pop() || o.fakeIndexB.database.length;
      o.fakeIndexB.database[o.tmp] = {
        "_id": "" + i,
        "year": o.years[i],
        "title": o.titles[i]
      };
      o.fakeIndexB.location["" + i] = o.tmp;

      o.clock.tick(1000);
    }
    // o.clock.tick(1000);

    // check index file
    o.spy(o, "value", o.fakeIndexA, "Check index file");
    o.jio.getAttachment({
      "_id": "A",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    o.spy(o, "value", o.fakeIndexB, "Check index file");
    o.jio.getAttachment({
      "_id": "B",
      "_attachment": "body"
    }, o.getAttachmentCallback);
    o.tick(o);

    // response
    o.allDocsResponse = {};
    o.allDocsResponse.rows = [];
    o.allDocsResponse.total_rows = m;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse.rows.push({
        "id": ""+i,
        "key": ""+i,
        "value": {},
        "doc": {
          "_id": ""+i,
          "title": o.titles[i],
          "year": o.years[i],
          "director": o.director[i]
        }
      });
    }

    o.response = JSON.parse(JSON.stringify(o.allDocsResponse));
    for (i = 0; i < o.response.rows.length; i += 1) {
      delete o.response.rows[i].doc;
    }

    // alldocs
    o.spy(o, "value", o.response, "AllDocs response generated from index");
    o.jio.allDocs(o.f);
    o.tick(o, 1000);

    // complex queries
    o.response = JSON.parse(JSON.stringify(o.allDocsResponse));
    i = 0;
    while (i < o.response.rows.length) {
      if (o.response.rows[i].year < 1980) {
        o.response.rows.splice(i, 1);
      } else {
        o.response.rows[i].value = {
          "year": o.response.rows[i].doc.year,
          "title": o.response.rows[i].doc.title
        }
        delete o.response.rows[i].doc;
        i += 1;
      }
    }
    o.response.rows.sort(function (a, b) {
      return a.value.year > b.value.year ? -1 :
        a.value.year < b.value.year ? 1 : 0;
    });
    o.response.rows.length = 5;
    o.response.total_rows = 5;
    o.spy(o, "value", o.response,
      "allDocs (complex queries year >= 1980, index used to do query)");
    o.jio.allDocs({
      // "query":'(year: >= "1980" AND year: < "2000")',
      "query": '(year: >= "1980")',
      "limit": [0, 5],
      "sort_on": [['year', 'descending']],
      "select_list": ['title', 'year']
    }, o.f);
    o.tick(o);

    // complex queries
    o.spy(o, "value", {"total_rows": 0, "rows": []},
      "allDocs (complex queries year >= 1980, can't use index)");
    o.jio.allDocs({
      // "query":'(year: >= "1980" AND year: < "2000")',
      "query": '(year: >= "1980")',
      "limit": [0, 5],
      "sort_on": [['year','descending']],
      "select_list": ['director', 'year']
    }, o.f);
    o.tick(o);

    // empty query returns all
    o.response = JSON.parse(JSON.stringify(o.allDocsResponse));
    i = 0;
    while (i < o.response.rows.length) {
      o.response.rows[i].value.title =
        o.response.rows[i].doc.title;
      delete o.response.rows[i].doc;
      i += 1;
    }
    o.response.rows.sort(function (a, b) {
      return a.value.title > b.value.title ? -1 :
        a.value.title < b.value.title ? 1 : 0;
    });
    o.spy(o, "value", o.response,
      "allDocs (empty query in complex query)");
    o.jio.allDocs({
      "sort_on":[['title','descending']],
      "select_list":['title']
    }, o.f);
    o.tick(o);

    o.jio.stop();
});
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

;(function() {
module ('Jio XWikiStorage');
var setUp = function(that, liveTest) {
    var o = generateTools(that);
    o.server = sinon.fakeServer.create();
    o.jio = JIO.newJio({type:'xwiki',formTokenPath:'form_token'});
    o.addFakeServerResponse("xwiki", "GET", "form_token", 200,
                            '<meta name="form_token" content="OMGHAX"/>');
    o._addFakeServerResponse = o.addFakeServerResponse;
    o.expectedRequests = [];
    o.addFakeServerResponse = function(a,b,c,d,e) {
        o._addFakeServerResponse(a,b,c,d,e);
        o.expectedRequests.push([b,c]);
    };
    o.assertReqs = function(count, message) {
        o.requests = (o.requests || 0) + count;
        ok(o.server.requests.length === o.requests,
           message + "[expected [" + count + "] got [" +
              (o.server.requests.length - (o.requests - count)) + "]]");
        for (var i = 1; i <= count; i++) {
            var req = o.server.requests[o.server.requests.length - i];
            if (!req) {
                break;
            }
            for (var j = o.expectedRequests.length - 1; j >= 0; --j) {
                var expected = o.expectedRequests[j];
                if (req.method === expected[0] &&
                    req.url.indexOf(expected[1]) !== 0)
                {
                    o.expectedRequests.splice(j, 1);
                }
            }
        }
        var ex = o.expectedRequests.pop();
        if (ex) {
            ok(0, "expected [" +  ex[0] + "] request for [" + ex[1] + "]");
        }
    };
    return o;
};

test ("Post", function () {

    var o = setUp(this);

    // post without id
    o.spy (o, "status", 405, "Post without id");
    o.jio.post({}, o.f);
    o.clock.tick(5000);
    o.assertReqs(0, "no id -> no request");

    // post non empty document
    o.addFakeServerResponse("xwiki", "POST", "myFile", 201, "HTML RESPONSE");
    o.spy(o, "value", {"id": "myFile", "ok": true},
          "Create = POST non empty document");
    o.jio.post({"_id": "myFile", "title": "hello there"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(3, "put -> 1 request to get csrf token, 1 to get doc and 1 to post data");

    // post but document already exists (post = error!, put = ok)
    o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>hello there</title></page>';
    o.addFakeServerResponse("xwiki", "GET", "myFile2", 200, o.answer);
    o.spy (o, "status", 409, "Post but document already exists");
    o.jio.post({"_id": "myFile2", "title": "hello again"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(1, "post w/ existing doc -> 1 request to get doc then fail");

    o.jio.stop();
});

test ("Put", function(){

    var o = setUp(this);

    // put without id => id required
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.clock.tick(5000);
    o.assertReqs(0, "put w/o id -> 0 requests");

    // put non empty document
    o.addFakeServerResponse("xwiki", "POST", "put1", 201, "HTML RESPONSE");
    o.spy (o, "value", {"ok": true, "id": "put1"},
           "Create = PUT non empty document");
    o.jio.put({"_id": "put1", "title": "myPut1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(3, "put normal doc -> 1 req to get doc, 1 for csrf token, 1 to post");

    // put but document already exists = update
    o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>mtPut1</title></page>';
    o.addFakeServerResponse("xwiki", "GET", "put2", 200, o.answer);
    o.addFakeServerResponse("xwiki", "POST", "put2", 201, "HTML RESPONSE");
    o.spy (o, "value", {"ok": true, "id": "put2"}, "Updated the document");
    o.jio.put({"_id": "put2", "title": "myPut2abcdedg"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(3, "put update doc -> 1 req to get doc, 1 for csrf token, 1 to post");

    o.jio.stop();
});

test ("PutAttachment", function(){

    var o = setUp(this);

    // putAttachment without doc id => id required
    o.spy(o, "status", 20, "PutAttachment without doc id");
    o.jio.putAttachment({}, o.f);
    o.clock.tick(5000);
    o.assertReqs(0, "put attach w/o doc id -> 0 requests");

    // putAttachment without attachment id => attachment id required
    o.spy(o, "status", 22, "PutAttachment without attachment id");
    o.jio.putAttachment({"_id": "putattmt1"}, o.f);
    o.clock.tick(5000);
    o.assertReqs(0, "put attach w/o attach id -> 0 requests");

    // putAttachment without underlying document => not found
    o.addFakeServerResponse("xwiki", "GET", "putattmtx", 404, "HTML RESPONSE");
    o.spy(o, "status", 404, "PutAttachment without document");
    o.jio.putAttachment({"_id": "putattmtx", "_attachment": "putattmt2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(1, "put attach w/o existing document -> 1 request to get doc");

    // putAttachment with document without data
    o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>myPutAttm</title></page>';
    o.addFakeServerResponse("xwiki", "GET", "putattmt1", 200, o.answer);
    o.addFakeServerResponse("xwiki", "POST", "putattmt1/putattmt2", 201,"HTML"+
      + "RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "PutAttachment with document, without data");
    o.jio.putAttachment({"_id": "putattmt1", "_attachment": "putattmt2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(3, "put attach -> 1 request to get document, 1 to put " +
                    "attach, 1 to get csrf token");

    o.jio.stop();
});

test ("Get", function(){

    var o = setUp(this);

    // get inexistent document
    o.spy(o, "status", 404, "Get non existing document");
    o.jio.get("get1", o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(1, "try to get nonexistent doc -> 1 request");

    // get inexistent attachment
    o.spy(o, "status", 404, "Get non existing attachment");
    o.jio.get("get1/get2", o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(1, "try to get nonexistent attach -> 1 request");

    // get document
    o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<page xmlns="http://www.xwiki.org"><title>some title</title></page>';
    o.addFakeServerResponse("xwiki", "GET", "get3", 200, o.answer);
    o.spy(o, "value", {"_id": "get3", "title": "some title"}, "Get document");
    o.jio.get("get3", o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(1, "get document -> 1 request");

    // get inexistent attachment (document exists)
    o.spy(o, "status", 404, "Get non existing attachment (doc exists)");
    o.jio.get({"_id": "get3", "_attachment": "getx"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(1, "get nonexistant attachment -> 1 request");

    // get attachment
    o.answer = JSON.stringify({"_id": "get4", "title": "some attachment"});
    o.addFakeServerResponse("xwiki", "GET", "get3/get4", 200, o.answer);
    o.spy(o, "value", {"_id": "get4", "title": "some attachment"},
      "Get attachment");
    o.jio.get({"_id": "get3", "_attachment": "get4"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(1, "get attachment -> 1 request");

    o.jio.stop();
});

test ("Remove", function(){

    var o = setUp(this);

    // remove inexistent document
    o.addFakeServerResponse("xwiki", "GET", "remove1", 404, "HTML RESPONSE");
    o.spy(o, "status", 404, "Remove non existening document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(2, "remove nonexistent doc -> 1 request for csrf and 1 for doc");

    // remove inexistent document/attachment
    o.addFakeServerResponse("xwiki", "GET", "remove1/remove2", 404, "HTML" +
      "RESPONSE");
    o.spy(o, "status", 404, "Remove inexistent document/attachment");
    o.jio.removeAttachment({"_id": "remove1", "_attachment": "remove2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(2, "remove nonexistant attach -> 1 request for csrf and 1 for doc");

    // remove document
    //o.answer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    //    '<page xmlns="http://www.xwiki.org"><title>some doc</title></page>';
    //o.addFakeServerResponse("xwiki", "GET", "remove3", 200, o.answer);
    o.addFakeServerResponse("xwiki", "POST", "bin/delete/Main/remove3",
                            200, "HTML RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "remove3"}, "Remove document");
    o.jio.remove({"_id": "remove3"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(2, "remove document -> 1 request for csrf and 1 for deleting doc");

    o.answer = JSON.stringify({
      "_id": "remove4",
      "title": "some doc",
      "_attachments": {
            "remove5": {
                "length": 4,
                "digest": "md5-d41d8cd98f00b204e9800998ecf8427e"
            }
      }
    });
    // remove attachment
    o.addFakeServerResponse("xwiki", "POST", "delattachment/Main/remove4/remove5",
                            200, "HTML RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "remove4/remove5"},
          "Remove attachment");
    o.jio.removeAttachment({"_id": "remove4", "_attachment": "remove5"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    o.assertReqs(2, "remove attach -> 1 request for csrf and 1 for deletion");

    o.jio.stop();
});
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


var nThen = function(next) {
    var funcs = [];
    var calls = 0;
    var waitFor = function(func) {
        calls++;
        return function() {
            if (func) {
                func.apply(null, arguments);
            }
            calls = (calls || 1) - 1;
            while (!calls && funcs.length) {
                funcs.shift()(waitFor);
            }
        };
    };
    next(waitFor);
    var ret = {
        nThen: function(next) {
            funcs.push(next);
            return ret;
        },
        orTimeout: function(func, milliseconds) {
            var cto;
            var timeout = setTimeout(function() {
                while (funcs.shift() !== cto) ;
                func(waitFor);
                calls = (calls || 1) - 1;
                while (!calls && funcs.length) { console.log("call"); funcs.shift()(waitFor); }
            }, milliseconds);
            funcs.push(cto = function() { clearTimeout(timeout); });
            return ret;
        }
    };
    return ret;
};


if (window.location.href.match(/xwiki\/bin\/view/)) (function() {
// This test will only be run if we are inside of a live XWiki instance.
test ("XWiki Live Server setup", function () {

    var o = setUp(this);
    o.jio.stop();
    this.sandbox.restore();
    o.server.restore();
    o.jio.start();
    QUnit.stop();

    nThen(function(waitFor) {

        // Remove the document if it exists.
        o.jio.remove({"_id": "one.json"}, waitFor());

    }).nThen(function(waitFor) {

        // post a new document
        o.spy(o, "value", {"id": "one.json", "ok": true}, "Live post document");
        o.jio.post({"_id": "one.json", "title": "hello"}, waitFor(o.f));

    }).nThen(function(waitFor) {

        o.jio.get("one.json", waitFor(function(err, ret) {
            ok(!err);
            ok(ret._id == "one.json");
            ok(ret.title == "hello");
        }));

    }).nThen(function(waitFor) {

        // modify document
        o.spy(o, "value", {"id": "one.json", "ok": true}, "Live modify document");
        o.jio.put({"_id": "one.json", "title": "hello modified"}, waitFor(o.f));

    }).nThen(function(waitFor) {

        o.jio.get("one.json", waitFor(function(err, ret) {
            ok(!err);
            ok(ret.title == "hello modified");
        }));

    }).nThen(function(waitFor) {

        // add attachment
        o.spy(o, "value", {"id": "one.json/att.txt", "ok": true}, "Put attachment");
        o.jio.putAttachment({
          "_id": "one.json",
          "_attachment": "att.txt",
          "_mimetype": "text/plain",
          "_data": "there2"
        }, waitFor(o.f));

    }).nThen(function(waitFor) {

        // test allDocs
        /*o.jio.allDocs({"include_docs":true},
          function(s){console.log(s);},
          function ( e ) {console.log(e);
        }, o.f);*/

    }).nThen(function(waitFor) {

        // get Attachment
        o.jio.getAttachment({"_id":"one.json", "_attachment":"att.txt"}, waitFor(function(err, ret) {
            ok(!err);
            ok(ret == "there2");
        }));

    }).nThen(function(waitFor) {

        // remove Attachment
        o.spy(o, "value", {"id": "one.json/att.txt", "ok": true}, "Remove attachment");
        o.jio.removeAttachment({"_id":"one.json","_attachment":"att.txt"}, waitFor(o.f));

    }).nThen(function(waitFor) {

        // remove Document
        o.spy(o, "value", {"id": "one.json", "ok": true}, "Remove document");
        o.jio.remove("one.json", waitFor(o.f));

    }).nThen(function(waitFor) {

        //console.log("success");

    }).orTimeout(function() {

        //console.log("failed");
        ok(0);

    }, 15000).nThen(function() {

        //console.log("complete");
        o.jio.stop();
        QUnit.start();

    });

});
})(); // Live XWiki

})(); // xwiki


module("SplitStorage + LocalStorage");

test("Post", function () {
  var o = generateTools(this);
  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "post1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "post2"
    }]
  });

  // post without id
  o.spy(o, "jobstatus", "done", "Post document without id");
  o.jio.post({
    "_underscored_meta": "uvalue",
    "meta": "data"
  }, function (err, response) {
    o.f(err, response);
    o.uuid = (err || response).id;
    ok(isUuid(o.uuid), "Uuid should look like " +
       "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + o.uuid);
  });
  o.tick(o);

  // check uploaded documents
  deepEqual(
    localstorage.getItem('jio/localstorage/splitstorage/post1/' + o.uuid),
    {"_id": o.uuid, "_underscored_meta": "uvalue", "data": "{\"meta\""},
    "Check uploaded document in sub storage 1"
  );

  deepEqual(
    localstorage.getItem('jio/localstorage/splitstorage/post2/' + o.uuid),
    {"_id": o.uuid, "_underscored_meta": "uvalue", "data": ":\"data\"}"},
    "Check uploaded document in sub storage 2"
  );

  // post with id
  o.spy(o, "value", {"ok": true, "id": "one"}, "Post document with id");
  o.jio.post({
    "_id": "one",
    "_underscored_meta": "uvalue",
    "meta": "data",
    "hello": "world"
  }, o.f);
  o.tick(o);

  // check uploaded documents
  deepEqual(localstorage.getItem('jio/localstorage/splitstorage/post1/one'), {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "data": "{\"meta\":\"data\","
  }, "Check uploaded document in sub storage 1");

  deepEqual(localstorage.getItem('jio/localstorage/splitstorage/post2/one'), {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "data": "\"hello\":\"world\"}"
  }, "Check uploaded document in sub storage 2");

  // post with id
  o.spy(o, "status", 409, "Post document with same id");
  o.jio.post({
    "_id": "one",
    "_underscored_meta": "uvalue",
    "meta": "data",
    "hello": "world"
  }, o.f);
  o.tick(o);

  o.jio.stop();
});

test("PutAttachment", function () {
  var o = generateTools(this);
  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "putAttachment1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "putAttachment2"
    }]
  });

  o.spy(o, "status", 404, "Put attachment on a inexistent document");
  o.jio.putAttachment({
    "_id": "one",
    "_attachment": "my_attachment",
    "_data": "My Data",
    "_mimetype": "text/plain"
  }, o.f);
  o.tick(o);

  o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
  o.clock.tick(1000);

  o.spy(o, "value", {
    "ok": true,
    "id": "one",
    "attachment": "my_attachment"
  }, "Put attachment");
  o.jio.putAttachment({
    "_id": "one",
    "_attachment": "my_attachment",
    "_data": "My Data",
    "_mimetype": "text/plain"
  }, o.f);
  o.tick(o);

  // check uploaded documents
  deepEqual(localstorage.getItem(
    'jio/localstorage/splitstorage/putAttachment1/one'
  ), {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "data": "{\"meta\"",
    "_attachments": {
      "my_attachment": {
        "length": 3,
        "digest": "md5-1b4686bc8ca15befdccb1da1dcb8c271", // md5("My ")
        "content_type": "text/plain"
      }
    }
  }, "Check uploaded document in sub storage 1");

  deepEqual(localstorage.getItem(
    'jio/localstorage/splitstorage/putAttachment2/one'
  ), {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "data": ":\"data\"}",
    "_attachments": {
      "my_attachment": {
        "length": 4,
        "digest": "md5-f6068daa29dbb05a7ead1e3b5a48bbee", // md5("Data")
        "content_type": "text/plain"
      }
    }
  }, "Check uploaded document in sub storage 2");

  deepEqual(localstorage.getItem(
    'jio/localstorage/splitstorage/putAttachment1/one/my_attachment'
  ), "My ", "Check uploaded document in sub storage 1");

  deepEqual(localstorage.getItem(
    'jio/localstorage/splitstorage/putAttachment2/one/my_attachment'
  ), "Data", "Check uploaded document in sub storage 2");

  o.jio.stop();
});

test("Get", function () {
  var o = generateTools(this);
  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "get1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "get2"
    }]
  });

  o.spy(o, "status", 404, "Get missing document");
  o.jio.get({"_id": "one"}, o.f);
  o.tick(o);

  o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
  o.clock.tick(1000);

  o.spy(o, "value", {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "meta": "data"
  }, "Get posted document");
  o.jio.get({"_id": "one"}, o.f);
  o.tick(o);

  o.jio.putAttachment({
    "_id": "one",
    "_attachment": "my_attachment",
    "_data": "My Data",
    "_mimetype": "text/plain"
  });
  o.clock.tick(1000);

  o.spy(o, "value", {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "meta": "data",
    "_attachments": {
      "my_attachment": {
        "length": 7,
        "content_type": "text/plain"
      }
    }
  }, "Get document with attachment informations");
  o.jio.get({"_id": "one"}, o.f);
  o.tick(o);

  o.jio.stop();
});

test("GetAttachment", function () {
  var o = generateTools(this);
  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "getAttachment1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "getAttachment2"
    }]
  });

  o.spy(o, "status", 404, "Get attachment from missing document");
  o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
  o.clock.tick(1000);

  o.spy(o, "status", 404, "Get missing attachment from document");
  o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.jio.putAttachment({
    "_id": "one",
    "_attachment": "my_attachment",
    "_data": "My Data",
    "_mimetype": "text/plain"
  });
  o.clock.tick(1000);

  o.spy(o, "value", "My Data", "Get attachment");
  o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.jio.stop();
});

test("removeAttachment", function () {
  var o = generateTools(this);

  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "removeAttachment1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "removeAttachment2"
    }]
  });

  o.spy(o, "status", 404, "Remove attachment from inexistent document");
  o.jio.removeAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
  o.clock.tick(1000);

  o.spy(o, "status", 404, "Remove inexistent attachment");
  o.jio.removeAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.jio.putAttachment({
    "_id": "one",
    "_attachment": "my_attachment",
    "_data": "My Data",
    "_mimetype": "text/plain"
  });
  o.clock.tick(1000);

  o.spy(o, "value", {
    "ok": true,
    "id": "one",
    "attachment": "my_attachment"
  }, "Remove attachment");
  o.jio.removeAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.spy(o, "value", {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "meta": "data"
  }, "Get document for check");
  o.jio.get({"_id": "one"}, o.f);
  o.tick(o);

  o.spy(o, "status", 404, "Get attachment for check");
  o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.jio.stop();
});

test("remove", function () {
  var o = generateTools(this);
  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "remove1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "remove2"
    }]
  });

  o.spy(o, "status", 404, "Remove missing document");
  o.jio.remove({"_id": "one"}, o.f);
  o.tick(o);

  o.jio.post({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"});
  o.clock.tick(1000);

  o.jio.putAttachment({
    "_id": "one",
    "_attachment": "my_attachment",
    "_data": "My Data",
    "_mimetype": "text/plain"
  });
  o.clock.tick(1000);

  o.spy(o, "value", {"ok": true, "id": "one"}, "Remove document");
  o.jio.remove({"_id": "one"}, o.f);
  o.tick(o);

  o.spy(o, "status", 404, "Get attachment for check");
  o.jio.getAttachment({"_id": "one", "_attachment": "my_attachment"}, o.f);
  o.tick(o);

  o.spy(o, "status", 404, "Get document for check");
  o.jio.get({"_id": "one"}, o.f);
  o.tick(o);

  o.jio.stop();
});

test("Put", function () {
  var o = generateTools(this);
  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "put1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "put2"
    }]
  });

  o.spy(o, "value", {"ok": true, "id": "one"}, "Put document");
  o.jio.put({"_id": "one", "_underscored_meta": "uvalue", "meta": "data"}, o.f);
  o.tick(o)

  o.spy(o, "value", {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "meta": "data"
  }, "Get document for check");
  o.jio.get({"_id": "one"}, o.f);
  o.tick(o);

  o.spy(o, "value", {"ok": true, "id": "one"}, "Put document again");
  o.jio.put({"_id": "one", "_underscored_meta": "uvalue", "meow": "dog"}, o.f);
  o.tick(o)

  o.spy(o, "value", {
    "_id": "one",
    "_underscored_meta": "uvalue",
    "meow": "dog"
  }, "Get document for check");
  o.jio.get({"_id": "one"}, o.f);
  o.tick(o);

  o.jio.stop();
});

test("AllDocs", function () {
  var o = generateTools(this);
  o.jio = JIO.newJio({
    "type": "split",
    "storage_list": [{
      "type": "local",
      "username": "splitstorage",
      "application_name": "alldocs1"
    }, {
      "type": "local",
      "username": "splitstorage",
      "application_name": "alldocs2"
    }]
  });

  for (o.i = 0; o.i < 5; o.i += 1) {
    o.jio.post({
      "_id": "doc" + o.i,
      "_underscored_meta": "uvalue" + o.i,
      "meta": "data" + o.i
    });
    o.clock.tick(1000);
  }

  for (o.i = 0; o.i < 2; o.i += 1) {
    o.jio.putAttachment({
      "_id": "doc" + o.i,
      "_attachment": "my_attachment" + o.i,
      "_data": "My Data" + o.i,
      "_mimetype": "text/plain"
    });
    o.clock.tick(1000);
  }

  o.spy(o, "value", {
    "_id": "doc1",
    "_underscored_meta": "uvalue1",
    "meta": "data1",
    "_attachments": {
      "my_attachment1": {
        "length": 8,
        "content_type": "text/plain"
      }
    }
  }, "Get document for check");
  o.jio.get({"_id": "doc1"}, o.f);
  o.tick(o);

  o.spy(o, "value", {
    "total_rows": 5,
    "rows": [{
      "id": "doc0",
      "key": "doc0",
      "value": {}
    }, {
      "id": "doc1",
      "key": "doc1",
      "value": {}
    }, {
      "id": "doc2",
      "key": "doc2",
      "value": {}
    }, {
      "id": "doc3",
      "key": "doc3",
      "value": {}
    }, {
      "id": "doc4",
      "key": "doc4",
      "value": {}
    }]
  }, "AllDocs with document ids only");
  o.jio.allDocs(function (err, response) {
    if (response && Array.isArray(response.rows)) {
      response.rows.sort(function (a, b) {
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }
    o.f(err, response);
  });
  o.tick(o);

  o.jio.stop();
});

module("JIO GID Storage");

test("Post", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage post test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
  o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
  o.clock.tick(2000);

  o.local_jio.stop();

  // Fail to post a document because metadata doesn't respect constraints
  // XXX check reason
  o.spy(o, 'status', 400, 'Post document without respecting constraints ' +
        '-> bad request');
  o.jio.post({}, o.f);
  o.tick(o);

  // Fail to post a document but a document already exists
  o.spy(o, 'status', 409, 'Post existent document -> conflict');
  o.jio.post({"creator": "a", "title": "water"}, o.f);
  o.tick(o);

  // Succeed to post because no document with the same gid has been found
  o.spy(o, 'value', {
    "id": "{\"creator\":[\"a%\"]}",
    "ok": true
  }, 'Post respecting constraints');
  o.jio.post({"creator": "a%", "title": "fire"}, o.f);
  o.tick(o);

  // Fail to post because this document has been uploaded right before
  o.spy(o, 'status', 409, 'Post same document respecting constraints ' +
        '-> conflicts');
  o.jio.post({"creator": "a%", "title": "space"}, o.f);
  o.tick(o);

  o.jio.stop();
});

test("Get", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage get test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
  o.local_jio.put({"_id": "red", "creator": ["ac", "b"], "title": "wind"});
  o.clock.tick(2000);

  o.local_jio.stop();

  // Fail to get document because _id doesn't respect constraints
  o.spy(o, 'status', 400, 'Get document without respecting constraints ' +
        '-> bad request');
  o.jio.get({"_id": "a"}, o.f);
  o.tick(o);

  // Fail to get because no document with the same gid has been found
  o.spy(o, 'status', 404, 'Get inexistent document');
  o.jio.get({"_id": "{\"creator\":[\"c\"]}"}, o.f);
  o.tick(o);

  // Succeed to get, gid is good, document found
  o.spy(o, 'value', {
    "_id": "{\"creator\":[\"b\"]}",
    "creator": ["ac", "b"],
    "title": "wind"
  }, 'Get document');
  o.jio.get({"_id": "{\"creator\":[\"b\"]}"}, o.f);
  o.tick(o);

  o.jio.stop();
});

test("AllDocs", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage allDocs test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "green", "creator": ["a"], "title": "earth"});
  o.local_jio.put({"_id": "red", "creator": ["a", "b"], "title": "water"});
  o.local_jio.put({"_id": "yellow", "creator": ["c", "d"], "title": "wind"});
  o.local_jio.put({"_id": "purple", "creator": ["s", "d"], "title": "fire"});
  o.local_jio.put({"_id": "blue", "title": "space"})
  o.clock.tick(3000);

  o.local_jio.stop();

  // Get all document and sort to make comparison easier
  o.spy(o, 'value', {
    "rows": [{
      "id": "{\"creator\":[\"a\"]}",
      "value": {}
    }, {
      "id": "{\"creator\":[\"a\",\"b\"]}",
      "value": {}
    }, {
      "id": "{\"creator\":[\"c\",\"d\"]}",
      "value": {}
    }, {
      "id": "{\"creator\":[\"s\",\"d\"]}",
      "value": {}
    }],
    "total_rows": 4
  }, 'Get all docs');
  o.jio.allDocs({
    "sort_on": [["creator", "ascending"]]
  }, o.f);
  o.tick(o);

  // Get all document with complex queries
  o.spy(o, 'value', {
    "rows": [{
      "id": "{\"creator\":[\"s\",\"d\"]}",
      "value": {"creator": ["s", "d"]}
    }],
    "total_rows": 1
  }, 'Get all docs with complex query');
  o.jio.allDocs({
    "query": 'creator: "d"',
    "select_list": ["creator"],
    "limit": [1, 1],
    "sort_on": [["creator", "ascending"]]
  }, o.f);
  o.tick(o);

  o.jio.stop();
});

test("Put", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage put test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
  o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
  o.clock.tick(2000);

  // Fail to put document because id does not respect constraints
  o.spy(o, 'status', 400, 'Put document without respecting constraints ' +
        '-> bad request');
  o.jio.put({"_id": "a", "creator": "a", "title": "fire"}, o.f);
  o.tick(o);

  // Fail to put because gid given != gid generated by the constraints
  o.spy(o, 'status', 400, 'Put document without respecting constraints ' +
        '-> bad request');
  o.jio.put({
    "_id": "{\"creator\":[\"a\"]}",
    "creator": "b",
    "title": "water"
  }, o.f);
  o.tick(o);

  // Succeed to update a document with its gid
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"creator\":[\"a\"]}"
  }, 'Update document');
  o.jio.put({
    "_id": "{\"creator\":[\"a\"]}",
    "creator": "a",
    "title": "space"
  }, o.f);
  o.tick(o);

  // Succeed to create a document, the gid given is good
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"creator\":[\"c\"]}"
  }, 'Create document');
  o.jio.put({
    "_id": "{\"creator\":[\"c\"]}",
    "creator": "c",
    "title": "magma"
  }, o.f);
  o.tick(o);

  // Check if the local storage document is well updated to make sure the second
  // put did not update the wrong document.
  o.spy(o, 'value', {
    "_id": "blue",
    "creator": "a",
    "title": "space"
  }, "Check sub documents");
  o.local_jio.get({"_id": "blue"}, o.f);
  o.tick(o);

  o.local_jio.stop();
  o.jio.stop();
});

test("Remove", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage remove test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
  o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
  o.clock.tick(2000);

  o.local_jio.stop();

  // Fail to remove document because given gid does not respect constraints
  o.spy(o, 'status', 400, 'Remove document without respecting constraints ' +
        '-> bad request');
  o.jio.remove({"_id": "a"}, o.f);
  o.tick(o);

  // Succeed to remove
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"creator\":[\"b\"]}"
  }, 'Remove document');
  o.jio.remove({
    "_id": "{\"creator\":[\"b\"]}"
  }, o.f);
  o.tick(o);

  // Fail to remove the same document. This test checks also that only one
  // document matches the gid constraints
  o.spy(o, 'status', 404, 'Remove inexistent document');
  o.jio.remove({
    "_id": "{\"creator\":[\"b\"]}"
  }, o.f);
  o.tick(o);

  o.jio.stop();
});

test("putAttachment", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage put attachment test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
  o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
  o.clock.tick(2000);

  // Fail to put attachment because given gid doesn't respect constraints
  o.spy(o, 'status', 400, 'put attachment without respecting constraints ' +
        '-> bad request');
  o.jio.putAttachment({
    "_id": "a",
    "_attachment": "body",
    "_data": "abc",
    "_mimetype": "text/plain"
  }, o.f);
  o.tick(o);

  // Succeed to put an attachment to a document
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"creator\":[\"b\"]}",
    "attachment": "body"
  }, 'put attachment');
  o.jio.putAttachment({
    "_id": "{\"creator\":[\"b\"]}",
    "_attachment": "body",
    "_data": "abc",
    "_mimetype": "text/plain"
  }, o.f);
  o.tick(o);

  // Check if the local storage document really have the new attachment
  o.spy(o, 'value', "abc", "Check attachment");
  o.local_jio.getAttachment({"_id": "green", "_attachment": "body"}, o.f);
  o.tick(o);

  // Succeed to update an attachment
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"creator\":[\"b\"]}",
    "attachment": "body"
  }, 'put attachment');
  o.jio.putAttachment({
    "_id": "{\"creator\":[\"b\"]}",
    "_attachment": "body",
    "_data": "def",
    "_mimetype": "text/plain"
  }, o.f);
  o.tick(o);

  // Check if the local storage attachment really changed
  o.spy(o, 'value', "def", "Check attachment");
  o.local_jio.getAttachment({"_id": "green", "_attachment": "body"}, o.f);
  o.tick(o);

  o.local_jio.stop();
  o.jio.stop();
});

test("getAttachment", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage get attachment test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
  o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
  o.clock.tick(2000);

  // Fail to get attachment because given gid doesn't respect constraints
  o.spy(o, 'status', 400, 'get attachment without respecting constraints ' +
        '-> bad request');
  o.jio.getAttachment({
    "_id": "a",
    "_attachment": "body"
  }, o.f);
  o.tick(o);

  // Fail to get an inexistent attachment from a document
  o.spy(o, 'status', 404, 'Get inexistent attachment');
  o.jio.getAttachment({
    "_id": "{\"creator\":[\"a\"]}",
    "_attachment": "body"
  }, o.f);
  o.tick(o);

  // Add an attachment manually to the document 'blue'
  o.local_jio.putAttachment({
    "_id": "blue",
    "_attachment": "body",
    "_data": "lol",
    "_mimetype": "text/plain"
  });
  o.clock.tick(2000);
  o.local_jio.stop();

  // Succeed to get the previous attachment
  o.spy(o, 'value', "lol", 'Get attachment');
  o.jio.getAttachment({
    "_id": "{\"creator\":[\"a\"]}",
    "_attachment": "body"
  }, o.f);
  o.tick(o);

  o.jio.stop();
});

test("removeAttachment", function () {
  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage remove attachment test"
  };

  // local jio is going to help us to prepare localstorage for gid tests
  o.local_jio = JIO.newJio(o.localstorage_spec);

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "creator": "list"
      }
    }
  });

  // preparing localstorage with documents
  o.local_jio.put({"_id": "blue", "creator": "a", "title": "earth"});
  o.local_jio.put({"_id": "green", "creator": ["ac", "b"], "title": "wind"});
  o.clock.tick(2000);
  o.local_jio.putAttachment({
    "_id": "blue",
    "_attachment": "body",
    "_data": "lol",
    "_mimetype": "text/plain"
  });
  o.clock.tick(2000);

  // Fail to remove attachment because given gid doesn't respect constraints
  o.spy(o, 'status', 400, 'Remove attachment without respecting constraints ' +
        '-> bad request');
  o.jio.removeAttachment({
    "_id": "a",
    "_attachment": "body",
    "_data": "abc",
    "_mimetype": "text/plain"
  }, o.f);
  o.tick(o);

  // Succeed to remove an attachment from a document
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"creator\":[\"a\"]}",
    "attachment": "body"
  }, 'Remove attachment');
  o.jio.removeAttachment({
    "_id": "{\"creator\":[\"a\"]}",
    "_attachment": "body"
  }, o.f);
  o.tick(o);

  // Check if the local storage document doesn't have attachment anymore
  o.spy(o, 'status', 404, "Check attachment");
  o.local_jio.getAttachment({"_id": "green", "_attachment": "body"}, o.f);
  o.tick(o);

  // Fail to remove the same attachment because it's already removed
  o.spy(o, 'status', 404, 'Remove attachment');
  o.jio.removeAttachment({
    "_id": "{\"creator\":[\"b\"]}",
    "_attachment": "body",
    "_data": "def",
    "_mimetype": "text/plain"
  }, o.f);
  o.tick(o);

  o.local_jio.stop();
  o.jio.stop();
});

test("More Constraints", function () {
  // This test will use gid storage in a 'real case'

  var o = generateTools(this);

  o.localstorage_spec = {
    "type": "local",
    "username": "one",
    "application_name": "gid storage more constraints test"
  };

  o.jio = JIO.newJio({
    "type": "gid",
    "sub_storage": o.localstorage_spec,
    "constraints": {
      "default": {
        "type": "DCMIType",
        "title": "string"
      },
      "Text": {
        "date": "date",
        "language": "string"
      },
      "Image": {
        "format": "contentType"
      }
    }
  });

  // Post a text document. This test also checks if the gid is well
  // created. Indeed, the json string "id" of the response is a dict with keys
  // inserted in alphabetic order, so that a gid is universal. It also checks
  // document types list management. It checks 'string', 'DCMIType' and 'date'
  // metadata types.
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
      "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}"
  }, 'Post a text document');
  o.jio.post({
    "type": ["Text", "web page"],
    "title": {"lang": "fr", "content": "Texte pour ce test"},
    "date": "2012-12-12",
    "modified": "2012-12-12",
    "format": "text/html",
    "language": "fr"
  }, o.f);
  o.tick(o);

  // Put the associated attachment
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
      "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
    "attachment": "body"
  }, 'Put text content as body');
  o.jio.putAttachment({
    "_id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
      "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
    "_attachment": "body",
    "_data": "<h1>Mon document html.</h1>",
    "_mimetype": "text/html"
  }, o.f);
  o.tick(o);

  // Post an image. It checks 'string', 'DCMIType' and 'contentType' metadata
  // types.
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"format\":\"text/svg+xml\"," +
      "\"title\":\"My image title\",\"type\":\"Image\"}"
  }, 'Post an image document');
  o.jio.post({
    "type": "Image",
    "title": "My image title",
    "date": "2012-12-13",
    "modified": "2012-12-13",
    "format": "text/svg+xml"
  }, o.f);
  o.tick(o);

  // Put the associated attachment
  o.spy(o, 'value', {
    "ok": true,
    "id": "{\"format\":\"text/svg+xml\"," +
      "\"title\":\"My image title\",\"type\":\"Image\"}",
    "attachment": "body"
  }, 'Put text content as body');
  o.jio.putAttachment({
    "_id": "{\"format\":\"text/svg+xml\"," +
      "\"title\":\"My image title\",\"type\":\"Image\"}",
    "_attachment": "body",
    "_data": "<svg/>",
    "_mimetype": "text/svg+xml"
  }, o.f);
  o.tick(o);

  // Get the html document
  o.spy(o, 'value', {
    "_id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
      "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
    "type": ["Text", "web page"],
    "title": {"lang": "fr", "content": "Texte pour ce test"},
    "date": "2012-12-12",
    "modified": "2012-12-12",
    "format": "text/html",
    "language": "fr",
    "_attachments": {
      "body": {
        "length": 27,
        "digest": "md5-6f40c762ca7a8fac52567f12ce5441ef",
        "content_type": "text/html"
      }
    }
  }, "Get html metadata");
  o.jio.get({
    "_id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
      "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
  }, o.f);
  o.tick(o);

  // Get a list of documents
  o.spy(o, 'value', {
    "rows": [{
      "id": "{\"format\":\"text/svg+xml\"," +
        "\"title\":\"My image title\",\"type\":\"Image\"}",
      "value": {}
    }, {
      "id": "{\"date\":\"2012-12-12\",\"language\":\"fr\"," +
        "\"title\":\"Texte pour ce test\",\"type\":\"Text\"}",
      "value": {}
    }],
    "total_rows": 2
  }, 'Get a document list');
  o.jio.allDocs({"sort_on": [["title", "ascending"]]}, o.f);
  o.tick(o);

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
