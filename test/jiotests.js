(function () { var thisfun = function(loader) {
    var JIO = loader.JIO,
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
            return;
        }
        deepEqual (val,value,message);
    };
},
basicSpyFunction = function(o,res,value,message,fun) {

    fun = fun || 'f';
    o[fun] = basicTestFunctionGenerator(o,res,value,message);
    o.t.spy(o,fun);
},
basicTickFunction = function (o) {
    var tick, fun, i = 1;
    tick = 10000;
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
myLog = function (html_string) {
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
        obj[array[k]._id] = array[k];
    }
    return obj;
},
getLastJob = function (id) {
    return (localstorage.getItem("jio/job_array/"+id) || [undefined]).pop();
},
generateTools = function (sinon) {
    var o = {};
    o.t = sinon;
    o.clock = o.t.sandbox.useFakeTimers();
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
    o.waitUntilAJobExists = function (timeout) {
        var cpt = 0
        while (true) {
            if (getLastJob(o.jio.getId()) !== undefined) {
                break;
            }
            if (timeout >= cpt) {
                ok(false, "No job were added to the queue");
                break;
            }
            o.clock.tick(25);
            cpt += 25;
        }
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
module ('Jio Global tests');

test ( "Jio simple methods", function () {
    // Test Jio simple methods
    // It checks if we can create several instance of jio at the same
    // time. Checks if they don't overlap informations, if they are
    // started and stopped correctly and if they are ready when they
    // have to be ready.

    var o = generateTools(this);

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
        "id": "file",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "id": "file/attmt",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "value", {"_id": "file", "title": "get_title"}, "Get document");
    o.jio.get("file", o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "value", "0123456789", "Get attachment");
    o.jio.get("file/attmt", o.f);
    o.tick(o);

    // remove document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"}, "Remove attachment");
    o.jio.remove({"_id": "file/attmt"}, o.f);
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
        "id": "file",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "status", 0,
          "Put attachment");
    o.jio.putAttachment({
        "id": "file/attmt",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "status", 0, "Get document");
    o.jio.get("file", o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "status", 0, "Get attachment");
    o.jio.get("file/attmt", o.f);
    o.tick(o);

    // remove document
    o.spy(o, "status", 0, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "status", 0, "Remove attachment");
    o.jio.remove({"_id": "file/attmt"}, o.f);
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
        "id": "file",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "id": "file/attmt",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "status", 404, "Get document");
    o.jio.get("file", o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "status", 404, "Get attachment");
    o.jio.get("file/attmt", o.f);
    o.tick(o);

    // remove document
    o.spy(o, "status", 404, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "status", 404, "Remove attachment");
    o.jio.remove({"_id": "file/attmt"}, o.f);
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
        "id": "file",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "id": "file/attmt",
        "data": "0123456789",
        "mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // get document
    o.spy(o, "value", {"_id": "file", "title": "get_title"}, "Get document");
    o.jio.get("file", o.f);
    o.tick(o);

    // get attachment
    o.spy(o, "value", "0123456789", "Get attachment");
    o.jio.get("file/attmt", o.f);
    o.tick(o);

    // remove document
    o.spy(o, "value", {"ok": true, "id": "file"}, "Remove document");
    o.jio.remove({"_id": "file"}, o.f);
    o.tick(o);

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"}, "Remove attachment");
    o.jio.remove({"_id": "file/attmt"}, o.f);
    o.tick(o);

    o.jio.stop();
});

module ( "Jio Job Managing" );

test ("Several Jobs at the same time", function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({"type":"dummyallok"});
    o.spy(o, "value", {"ok": true, "id": "file"}, "job1", "f");
    o.spy(o, "value", {"ok": true, "id": "file2"}, "job2", "f2");
    o.spy(o, "value", {"ok": true, "id": "file3"}, "job3", "f3");
    o.jio.put({"_id": "file",  "content": "content"}, o.f);
    o.jio.put({"_id": "file2", "content": "content2"}, o.f2);
    o.jio.put({"_id": "file3", "content": "content3"}, o.f3);
    o.tick(o, 1000, "f");
    o.tick(o, "f2");
    o.tick(o, "f3");
    o.jio.stop();

});

test ("Similar Jobs at the same time (Replace)", function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({"type":"dummyallok"});
    o.spy(o, "status", 12, "job1 replaced", "f");
    o.spy(o, "status", 12, "job2 replaced", "f2");
    o.spy(o, "value", {"ok": true, "id": "file"}, "job3 ok", "f3");
    o.jio.put({"_id": "file", "content": "content"}, o.f);
    o.jio.put({"_id": "file", "content": "content"}, o.f2);
    o.jio.put({"_id": "file", "content": "content"}, o.f3);
    o.tick(o, 1000, "f");
    o.tick(o, "f2");
    o.tick(o, "f3");
    o.jio.stop();

});

test ("One document aim jobs at the same time (Wait for job(s))" , function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({"type":"dummyallok"});
    o.spy(o, "value", {"ok": true, "id": "file"}, "job1", "f");
    o.spy(o, "value", {"ok": true, "id": "file"}, "job2", "f2");
    o.spy(o, "value", {"_id": "file", "title": "get_title"}, "job3", "f3");

    o.jio.post({"_id": "file", "content": "content"}, o.f);
    o.testLastJobWaitForJob(undefined, "job1 is not waiting for someone");

    o.jio.put({"_id": "file", "content": "content"}, o.f2);
    o.testLastJobWaitForJob([1], "job2 is waiting");

    o.jio.get("file", o.f3);
    o.testLastJobWaitForJob([1, 2], "job3 is waiting");

    o.tick(o, 1000, "f");
    o.tick(o, "f2");
    o.tick(o, "f3");
    o.jio.stop();

});

test ("One document aim jobs at the same time (Elimination)" , function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({"type":"dummyallok"});
    o.spy(o, "status", 10, "job1 stopped", "f");
    o.spy(o, "value", {"ok": true, "id": "file"}, "job2", "f2");

    o.jio.post({"_id": "file", "content": "content"}, o.f);
    o.testLastJobLabel("post", "job1 exists");

    o.jio.remove({"_id": "file"}, o.f2);
    o.testLastJobLabel("remove", "job1 does not exist anymore");

    o.tick(o, 1000, "f");
    o.tick(o, "f2");
    o.jio.stop();

});

test ("One document aim jobs at the same time (Not Acceptable)" , function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({"type":"dummyallok"});
    o.spy(o, "value", {"_id": "file", "title": "get_title"}, "job1", "f");
    o.spy(o, "status", 11, "job2 is not acceptable", "f2");

    o.jio.get("file", o.f);
    o.testLastJobId(1, "job1 added to queue");
    o.waitUntilLastJobIs("on going");

    o.jio.get("file", o.f2);
    o.testLastJobId(1, "job2 not added");

    o.tick(o, 1000, "f");
    o.tick(o, "f2");
    o.jio.stop();

});

test ("Server will be available soon (Wait for time)" , function () {

    var o = generateTools(this);
    o.max_retry = 3;

    o.jio = JIO.newJio({"type":"dummyall3tries"});
    o.spy(o, "value", {"ok": true, "id": "file"}, "job1", "f");

    o.jio.put({"_id": "file", "content": "content"},
              {"max_retry": o.max_retry}, o.f);
    for (o.i = 0; o.i < o.max_retry - 1; o.i += 1) {
        o.waitUntilLastJobIs("on going");
        o.waitUntilLastJobIs("wait");
        o.testLastJobWaitForTime("job1 is waiting for time");
    }

    o.tick(o, 1000, "f");
    o.jio.stop();

});

module ( "Jio Restore");

test ("Restore old Jio", function() {

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "dummyall3tries",
        "applicationname": "jiotests"
    });

    o.jio_id = o.jio.getId();

    o.jio.put({"_id": "file", "title": "myFile"}, {"max_retry":3}, o.f);
    o.waitUntilLastJobIs("initial"); // "on going" or "wait" should work
    // xxx also test with o.waitUntilLastJobIs("on going") ?
    o.jio.close();

    o.jio = JIO.newJio({
        "type": "dummyallok",
        "applicationname": "jiotests"
    });
    o.waitUntilAJobExists(30000); // timeout 30 sec
    o.testLastJobLabel("put", "Job restored");
    o.clock.tick(1000);
    ok(getLastJob(o.jio.getId()) === undefined,
       "Job executed");

    o.jio.stop();

});

module ( "Jio LocalStorage" );

test ("Post", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "upost",
        "applicationname": "apost"
    });

    // post without id
    o.spy (o, "status", 405, "Post without id");
    o.jio.post({}, o.f);
    o.tick(o);

    // post non empty document
    o.spy (o, "value", {"ok": true, "id": "post1"}, "Post");
    o.jio.post({"_id": "post1", "title": "myPost1"}, o.f);
    o.tick(o);

    deepEqual(
        localstorage.getItem("jio/localstorage/upost/apost/post1"),
        {
            "_id": "post1",
            "title": "myPost1"
        },
        "Check document"
    );

    // post but document already exists
    o.spy (o, "status", 409, "Post but document already exists");
    o.jio.post({"_id": "post1", "title": "myPost2"}, o.f);
    o.tick(o);

    o.jio.stop();
});


test ("Put", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "uput",
        "applicationname": "aput"
    });

    // put without id
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.spy (o, "value", {"ok": true, "id": "put1"}, "Creates a document");
    o.jio.put({"_id": "put1", "title": "myPut1"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem("jio/localstorage/uput/aput/put1"),
        {
            "_id": "put1",
            "title": "myPut1"
        },
        "Check document"
    );

    // put but document already exists
    o.spy (o, "value", {"ok": true, "id": "put1"}, "Update the document");
    o.jio.put({"_id": "put1", "title": "myPut2"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem("jio/localstorage/uput/aput/put1"),
        {
            "_id": "put1",
            "title": "myPut2"
        },
        "Check document"
    );

    o.jio.stop();

});

test ("PutAttachment", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "uputattmt",
        "applicationname": "aputattmt"
    });

    // putAttachment without doc id
    // error 20 -> document id required
    o.spy(o, "status", 20, "PutAttachment without doc id");
    o.jio.putAttachment({}, o.f);
    o.tick(o);

    // putAttachment without attmt id
    // error 22 -> attachment id required
    o.spy(o, "status", 22, "PutAttachment without attmt id");
    o.jio.putAttachment({"id": "putattmt1"}, o.f);
    o.tick(o);

    // putAttachment without document
    // error 404 -> not found
    o.spy(o, "status", 404, "PutAttachment without document");
    o.jio.putAttachment({"id": "putattmt1/putattmt2"}, o.f);
    o.tick(o);

    // adding a document
    localstorage.setItem("jio/localstorage/uputattmt/aputattmt/putattmt1", {
        "_id": "putattmt1",
        "title": "myPutAttmt1"
    });

    // putAttachment with document
    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "PutAttachment with document, without data");
    o.jio.putAttachment({"id": "putattmt1/putattmt2"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem("jio/localstorage/uputattmt/aputattmt/putattmt1"),
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
            "jio/localstorage/uputattmt/aputattmt/putattmt1/putattmt2"),
        "", "Check attachment"
    );

    // update attachment
    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "Update Attachment, with data");
    o.jio.putAttachment({"id": "putattmt1/putattmt2", "data": "abc"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem("jio/localstorage/uputattmt/aputattmt/putattmt1"),
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
            "jio/localstorage/uputattmt/aputattmt/putattmt1/putattmt2"),
        "abc", "Check attachment"
    );

    o.jio.stop();
});

test ("Get", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "uget",
        "applicationname": "aget"
    });

    // get unexistant document
    o.spy(o, "status", 404, "Get unexistant document");
    o.jio.get("get1", o.f);
    o.tick(o);

    // get unexistant attachment
    o.spy(o, "status", 404, "Get unexistant attachment");
    o.jio.get("get1/get2", o.f);
    o.tick(o);

    // adding a document
    o.doc_get1 = {
        "_id": "get1",
        "title": "myGet1"
    };
    localstorage.setItem("jio/localstorage/uget/aget/get1", o.doc_get1);

    // get document
    o.spy(o, "value", o.doc_get1, "Get document");
    o.jio.get("get1", o.f);
    o.tick(o);

    // get unexistant attachment (document exists)
    o.spy(o, "status", 404, "Get unexistant attachment (document exists)");
    o.jio.get("get1/get2", o.f);
    o.tick(o);

    // adding an attachment
    o.doc_get1["_attachments"] = {
        "get2": {
            "length": 2,
            // md5("de")
            "digest": "md5-5f02f0889301fd7be1ac972c11bf3e7d"
        }
    };
    localstorage.setItem("jio/localstorage/uget/aget/get1", o.doc_get1);
    localstorage.setItem("jio/localstorage/uget/aget/get1/get2", "de");

    // get attachment
    o.spy(o, "value", "de", "Get attachment");
    o.jio.get("get1/get2", o.f);
    o.tick(o);

    o.jio.stop();

});

test ("Remove", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "uremove",
        "applicationname": "aremove"
    });

    // remove unexistant document
    o.spy(o, "status", 404, "Remove unexistant document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // remove unexistant document/attachment
    o.spy(o, "status", 404, "Remove unexistant document/attachment");
    o.jio.remove({"_id": "remove1/remove2"}, o.f);
    o.tick(o);

    // adding a document
    localstorage.setItem("jio/localstorage/uremove/aremove/remove1", {
        "_id": "remove1",
        "title": "myRemove1"
    });

    // remove document
    o.spy(o, "value", {"ok": true, "id": "remove1"}, "Remove document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // check document
    ok(localstorage.getItem("jio/localstorage/uremove/aremove/remove1")===null,
       "Check documuent");

    // adding a document + attmt
    localstorage.setItem("jio/localstorage/uremove/aremove/remove1", {
        "_id": "remove1",
        "title": "myRemove1",
        "_attachments": {
            "remove2": {
                "length": 4,
                "digest": "md5-blahblah"
            }
        }
    });
    localstorage.setItem(
        "jio/localstorage/uremove/aremove/remove1/remove2", "fghi");

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "remove1"}, "Remove attachment");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    o.jio.stop();

});


test ("AllDocs", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "ualldocs",
        "applicationname": "aalldocs"
    });

    // alldocs
    // error 405 -> method not allowed
    o.spy(o, "status", 405, "Method not allowed");
    o.jio.allDocs(o.f);
    o.tick(o);

    o.jio.stop();

});

module ( "Jio Revision Storage + Local Storage" );

test ("Post", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "revision",
        "secondstorage": {
            "type": "local",
            "username": "urevpost",
            "applicationname": "arevpost"
        }
    });

    // post without id
    o.spy (o, "status", undefined, "Post without id");
    o.jio.post({}, function (err, response) {
        o.f.apply(arguments);
        if (isUuid((err || response).id)) {
            ok(true, "Uuid format");
        } else {
            deepEqual((err || response).id,
                      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "Uuid format");
        }
    });
    o.tick(o);

    // post non empty document
    o.doc = {"_id": "post1", "title": "myPost1"};
    o.revs_info = [];
    o.rev = "1-"+hex_sha256(JSON.stringify(o.doc)+JSON.stringify(o.revs_info));
    o.spy (o, "value", {"ok": true, "id": "post1", "rev": o.rev}, "Post");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc["_id"] = "post1."+o.rev;
    deepEqual(
        localstorage.getItem("jio/localstorage/urevpost/arevpost/post1."+o.rev),
        o.doc, "Check document"
    );

    // post and document already exists
    o.doc = {"_id": "post1", "title": "myPost2"};
    o.revs_info = [];
    o.rev = "1-"+hex_sha256(JSON.stringify(o.doc)+JSON.stringify(o.revs_info));
    o.spy (o, "value", {
        "ok": true, "id": "post1", "rev": o.rev
    }, "Post and document already exists");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // post + revision
    o.doc = {"_id": "post1", "_rev": o.rev, "title": "myPost2"};
    o.revs_info = [{"rev": o.rev, "status": "available"}];
    o.rev = "2-"+hex_sha256(JSON.stringify(o.doc)+JSON.stringify(o.revs_info));
    o.spy (o, "status", undefined, "Post + revision");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // // keep_revision_history
    // ok (false, "keep_revision_history Option Not Implemented");

    // check document
    o.doc["_id"] = "post1."+o.rev;
    deepEqual(
        localstorage.getItem("jio/localstorage/urevpost/arevpost/post1."+o.rev),
        o.doc, "Check document"
    );

    o.jio.stop();

});

test ("Put", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "revision",
        "secondstorage": {
            "type": "local",
            "username": "urevput",
            "applicationname": "arevput"
        }
    });

    // put without id
    // error 20 -> document id required
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.doc = {"_id": "put1", "title": "myPut1"};
    o.revs_info = [];
    o.rev = "1-"+hex_sha256(JSON.stringify(o.doc)+JSON.stringify(o.revs_info));
    o.spy (o, "value", {"ok": true, "id": "put1", "rev": o.rev},
           "Creates a document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc["_id"] = "put1."+o.rev;
    deepEqual(
        localstorage.getItem("jio/localstorage/urevput/arevput/put1."+o.rev),
        o.doc, "Check document"
    );

    // put and document already exists
    o.spy (o, "status", 409, "Update the document");
    o.jio.put({"_id": "put1", "title": "myPut2"}, o.f);
    o.tick(o);

    // post + revision
    o.doc = {"_id": "put1", "_rev": o.rev, "title": "myPut2"};
    o.revs_info = [{"rev": o.rev, "status": "available"}];
    o.rev = "2-"+hex_sha256(JSON.stringify(o.doc)+JSON.stringify(o.revs_info));
    o.spy (o, "status", undefined, "Put + revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc["_id"] = "put1."+o.rev;
    deepEqual(
        localstorage.getItem("jio/localstorage/urevput/arevput/put1."+o.rev),
        o.doc, "Check document"
    );

    o.jio.stop();

});

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
    thisfun ({JIO:jIO,
              sjcl:sjcl,
              Base64:Base64,
              jQuery:jQuery});
}

}());
