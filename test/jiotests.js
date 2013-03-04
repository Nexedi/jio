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
    o.server = o.t.sandbox.useFakeServer();
    o.clock = sinon.useFakeTimers();
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
          break;
        case "s3":
          return path;
          break;
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
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file/attmt",
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
    o.jio.get({"_id": "file/attmt"}, o.f);
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
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "status", 0,
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file/attmt",
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
    o.jio.get({"_id": "file/attmt"}, o.f);
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
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file/attmt",
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
        "_id": "file",
        "_data": "0123456789",
        "_mimetype": "text/plain"
    }, o.f);
    o.tick(o);

    // put an attachment
    o.spy(o, "value", {"ok": true, "id": "file/attmt"},
          "Put attachment");
    o.jio.putAttachment({
        "_id": "file/attmt",
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
    o.jio.get({"_id": "file/attmt"}, o.f);
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

test ("Similar Jobs at the same time (Update)", function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({"type":"dummyallok"});
    o.spy(o, "value", {"ok": true, "id": "file"}, "job1 ok", "f");
    o.spy(o, "value", {"ok": true, "id": "file"}, "job2 ok", "f2");
    o.spy(o, "value", {"ok": true, "id": "file"}, "job3 ok", "f3");
    o.jio.put({"_id": "file", "content": "content"}, o.f); // 1
    o.jio.put({"_id": "file", "content": "content"}, o.f2); // 2
    o.jio.put({"_id": "file", "content": "content"}, o.f3); // 3
    deepEqual(getLastJob(o.jio.getId()).id, 1, "Check job queue");
    o.tick(o, 1000, "f");
    o.tick(o, "f2");
    o.tick(o, "f3");

    o.spy(o, "value", {"ok": true, "id": "file"}, "job4 ok", "f");
    o.spy(o, "value", {"ok": true, "id": "file"}, "job5 ok", "f2");
    o.spy(o, "value", {"ok": true, "id": "file"}, "job6 ok", "f3");
    o.jio.put({"_id": "file", "content": "content"}, o.f); // 4
    o.jio.remove({"_id": "file", "content": "content"}, o.f2); // 5
    o.jio.put({"_id": "file", "content": "content"}, o.f3); // 6
    deepEqual(getLastJob(o.jio.getId()).id, 5, "Check job queue");
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
    o.spy(o, "value", {"ok": true, "id": "file"}, "job3", "f3");

    o.jio.put({"_id": "file", "content": "content"}, o.f);
    o.testLastJobWaitForJob(undefined, "job1 is not waiting for someone");

    o.jio.remove({"_id": "file", "content": "content"}, o.f2);
    o.testLastJobWaitForJob([1], "job2 is waiting");

    o.jio.put({"_id": "file"}, o.f3);
    o.testLastJobWaitForJob([1, 2], "job3 is waiting");

    o.tick(o, 1000, "f");
    o.tick(o, "f2");
    o.tick(o, "f3");
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
        "application_name": "jiotests"
    });

    o.jio_id = o.jio.getId();

    o.jio.put({"_id": "file", "title": "myFile"}, {"max_retry":3}, o.f);
    o.waitUntilLastJobIs("initial"); // "on going" or "wait" should work
    // xxx also test with o.waitUntilLastJobIs("on going") ?
    o.jio.close();

    o.jio = JIO.newJio({
        "type": "dummyallok",
        "application_name": "jiotests"
    });
    o.waitUntilAJobExists(30000); // timeout 30 sec

    o.testLastJobLabel("put", "Job restored");
    o.clock.tick(2000);
    ok(getLastJob(o.jio.getId()) === undefined, "Job executed");
    o.clock.tick(1000);

    o.jio.stop();

});

module ( "Jio LocalStorage" );

test ("Post", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "upost",
        "application_name": "apost"
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
        "application_name": "aput"
    });

    // put without id
    // error 20 -> document id required
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
        "application_name": "aputattmt"
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
    o.jio.putAttachment({"_id": "putattmt1/putattmt2"}, o.f);
    o.tick(o);

    // adding a document
    localstorage.setItem("jio/localstorage/uputattmt/aputattmt/putattmt1", {
        "_id": "putattmt1",
        "title": "myPutAttmt1"
    });

    // putAttachment with document
    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "PutAttachment with document, without data");
    o.jio.putAttachment({"_id": "putattmt1/putattmt2"}, o.f);
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
    o.jio.putAttachment({"_id": "putattmt1/putattmt2", "_data": "abc"}, o.f);
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
        "application_name": "aget"
    });

    // get inexistent document
    o.spy(o, "status", 404, "Get inexistent document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment
    o.spy(o, "status", 404, "Get inexistent attachment");
    o.jio.get({"_id": "get1/get2"}, o.f);
    o.tick(o);

    // adding a document
    o.doc_get1 = {
        "_id": "get1",
        "title": "myGet1"
    };
    localstorage.setItem("jio/localstorage/uget/aget/get1", o.doc_get1);

    // get document
    o.spy(o, "value", o.doc_get1, "Get document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment (document exists)
    o.spy(o, "status", 404, "Get inexistent attachment (document exists)");
    o.jio.get({"_id": "get1/get2"}, o.f);
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
    o.jio.get({"_id": "get1/get2"}, o.f);
    o.tick(o);

    o.jio.stop();

});

test ("Remove", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "local",
        "username": "uremove",
        "application_name": "aremove"
    });

    // remove inexistent document
    o.spy(o, "status", 404, "Remove inexistent document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // remove inexistent document/attachment
    o.spy(o, "status", 404, "Remove inexistent document/attachment");
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
       "Check document is removed");

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
    o.spy(o, "value", {"ok": true, "id": "remove1"}, "Remove document and attachment");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);
    ok(localstorage.getItem("jio/localstorage/uremove/aremove/remove1"
       )===null, "Check document is removed");
    ok(localstorage.getItem("jio/localstorage/uremove/aremove/remove1/remove2"
      )===null, "Check attachment is removed");

    o.jio.stop();

});


test ("AllDocs", function(){

    var o = generateTools(this), i, m = 15;

    o.jio = JIO.newJio({
        "type": "local",
        "username": "ualldocs",
        "application_name": "aalldocs"
    });
    o.localpath = "jio/localstorage/ualldocs/aalldocs";

    // sample data
    o.titles = ["Shawshank Redemption", "Godfather", "Godfather 2",
      "Pulp Fiction", "The Good, The Bad and The Ugly", "12 Angry Men",
      "The Dark Knight", "Schindlers List",
      "Lord of the Rings - Return of the King", "Fight Club",
      "Star Wars Episode V", "Lord Of the Rings - Fellowship of the Ring",
      "One flew over the Cuckoo's Nest", "Inception", "Godfellas"
    ];
    o.years = [1994,1972,1974,1994,1966,1957,2008,1993,2003,1999,1980,2001,
      1975,2010,1990
    ];
    o.director = ["Frank Darabont", "Francis Ford Coppola",
      "Francis Ford Coppola", "Quentin Tarantino", "Sergio Leone",
      "Sidney Lumet", "Christopher Nolan", "Steven Spielberg",
      "Peter Jackson", "David Fincher", "Irvin Kershner", "Peter Jackson",
      "Milos Forman", "Christopher Nolan", " Martin Scorsese"
    ]

    for (i = 0; i < m; i += 1) {
      o.fakeDoc = {};
      o.fakeDoc._id = "doc_"+(i < 10 ? "0"+i : i);
      o.fakeDoc.title = o.titles[i];
      o.fakeDoc.year = o.years[i];
      o.fakeDoc.author = o.director[i];
      localstorage.setItem(o.localpath+"/doc_"+(i < 10 ? "0"+i : i), o.fakeDoc);
    }

    // response
    o.allDocsResponse = {};
    o.allDocsResponse.rows = [];
    o.allDocsResponse.total_rows = 15;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse.rows.push({
        "id": "doc_"+(i < 10 ? "0"+i : i),
        "key": "doc_"+(i < 10 ? "0"+i : i),
        "value": {}
      });
    };
    // alldocs
    o.spy(o, "value", o.allDocsResponse, "All docs");
    o.jio.allDocs(o.f);
    o.clock.tick(1000);
    o.tick(o);

    // include docs
    o.allDocsResponse = {};
    o.allDocsResponse.rows = [];
    o.allDocsResponse.total_rows = 15;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse.rows.push({
        "id": "doc_"+(i < 10 ? "0"+i : i),
        "key": "doc_"+(i < 10 ? "0"+i : i),
        "value": {},
        "doc": localstorage.getItem(o.localpath+"/doc_"+(i < 10 ? "0"+i : i))
      });
    };

    // alldocs
    o.spy(o, "value", o.allDocsResponse, "All docs (include docs)");
    o.jio.allDocs({"include_docs":true}, o.f);
    o.tick(o);

    // complex queries
    o.thisShouldBeTheAnswer4 = [
        {"title": "Inception", "year": 2010},
        {"title": "The Dark Knight", "year": 2008},
        {"title": "Lord of the Rings - Return of the King", "year": 2003},
        {"title": "Lord Of the Rings - Fellowship of the Ring", "year": 2001},
        {"title": "Fight Club", "year": 1999}
    ];
    o.spy(o, "value", o.thisShouldBeTheAnswer4,
      "allDocs (complex queries year >= 1980, all query options)");
    o.jio.allDocs({
      "query":{
        "query":'(year: >= "1980")',
        "filter": {
            "limit":[0,5],
            "sort_on":[['year','descending']],
            "select_list":['title','year']
        },
        "wildcard_character":'%'
      }
    }, o.f);
    o.tick(o);

    o.jio.stop();

});

module ( "Jio Revision Storage + Local Storage" );

test ("Post", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "revision",
        "sub_storage": {
            "type": "local",
            "username": "urevpost",
            "application_name": "arevpost"
        }
    });
    o.localpath = "jio/localstorage/urevpost/arevpost";

    // post without id
    o.revisions = {"start": 0, "ids": []};
    o.spy (o, "status", undefined, "Post without id");
    o.jio.post({}, function (err, response) {
        o.f.apply(arguments);
        o.uuid = (err || response).id;
        ok(isUuid(o.uuid), "Uuid should look like " +
           "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + o.uuid);
    });
    o.tick(o);
    o.rev = "1-"+generateRevisionHash({"_id": o.uuid}, o.revisions);

    // check document
    deepEqual(
        localstorage.getItem(o.localpath + "/" + o.uuid + "." + o.rev),
        {"_id": o.uuid + "." + o.rev},
        "Check document"
    );

    // check document tree
    o.doc_tree = {
        "_id": o.uuid + ".revision_tree.json",
        "children": [{
            "rev": o.rev, "status": "available", "children": []
        }]
    };
    deepEqual(
        localstorage.getItem(
            o.localpath + "/" + o.uuid + ".revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // post non empty document
    o.doc = {"_id": "post1", "title": "myPost1"};
    o.rev = "1-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"ok": true, "id": "post1", "rev": o.rev}, "Post");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc["_id"] = "post1."+o.rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/post1." + o.rev),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children[0] = {
        "rev": o.rev, "status": "available", "children": []
    };
    deepEqual(
        localstorage.getItem(
            o.localpath + "/post1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // post and document already exists
    o.doc = {"_id": "post1", "title": "myPost2"};
    o.rev = "1-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {
        "ok": true, "id": "post1", "rev": o.rev
    }, "Post and document already exists");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc["_id"] = "post1."+o.rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/post1." + o.rev),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children.unshift({
        "rev": o.rev, "status": "available", "children": []
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/post1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // post + revision
    o.doc = {"_id": "post1", "_rev": o.rev, "title": "myPost2"};
    o.revisions = {"start": 1, "ids": [o.rev.split('-')[1]]};
    o.rev = "2-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"ok": true, "id": "post1", "rev": o.rev},
           "Post + revision");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // // keep_revision_history
    // ok (false, "keep_revision_history Option Not Implemented");

    // check document
    o.doc["_id"] = "post1."+o.rev;
    delete o.doc._rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/post1." + o.rev),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children[0].children.unshift({
        "rev": o.rev, "status": "available", "children": []
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/post1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // add attachment
    o.doc._attachments = {
      "attachment_test": {
        "length": 35,
        "digest": "A",
        "content_type": "oh/yeah"
      }
    };
    localstorage.setItem(o.localpath + "/post1." + o.rev, o.doc);
    localstorage.setItem(o.localpath + "/post1." + o.rev + "/attachment_test",
                         "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    // post + attachment copy
    o.doc = {"_id": "post1", "_rev": o.rev, "title": "myPost2"};
    o.revisions = {
      "start": 2,
      "ids": [o.rev.split('-')[1], o.revisions.ids[0]]
    };
    o.rev = "3-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"ok": true, "id": "post1", "rev": o.rev},
           "Post + attachment copy");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check attachment
    deepEqual(
      localstorage.getItem(o.localpath + "/post1." + o.rev +
                           "/attachment_test"),
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "Check Attachment"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children[0].children[0].children.unshift({
      "rev": o.rev, "status": "available", "children": []
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/post1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // post + wrong revision
    o.doc = {"_id": "post1", "_rev": "3-wr3", "title": "myPost3"};
    o.revisions = {"start": 3, "ids": ["wr3"]};
    o.rev = "4-"+generateRevisionHash(o.doc, o.revisions);
    o.spy(o, "value", {"id": "post1", "ok": true, "rev": o.rev},
          "Postt + wrong revision");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem(o.localpath + "/post1.3-wr3"),
        null,
        "Check document"
    );

    // check document
    o.doc._id = "post1." + o.rev;
    delete o.doc._rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/post1." + o.rev),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree._id = "post1.revision_tree.json";
    o.doc_tree.children.unshift({
      "rev": "3-wr3", "status": "missing", "children": [{
        "rev": o.rev, "status": "available", "children": []
      }]
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/post1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    o.jio.stop();
});

test ("Put", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "revision",
        "sub_storage": {
            "type": "local",
            "username": "urevput",
            "application_name": "arevput"
        }
    });
    o.localpath = "jio/localstorage/urevput/arevput";

    // put without id
    // error 20 -> document id required
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.doc = {"_id": "put1", "title": "myPut1"};
    o.revisions = {"start": 0, "ids": []};
    o.rev = "1-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"ok": true, "id": "put1", "rev": o.rev},
           "Creates a document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/put1." + o.rev),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree = {
        "_id": "put1.revision_tree.json",
        "children": [{
            "rev": o.rev, "status": "available", "children": []
        }]
    };
    deepEqual(
        localstorage.getItem(
            o.localpath + "/put1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // put without rev and document already exists
    o.doc = {"_id": "put1", "title": "myPut2"};
    o.rev = "1-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"ok": true, "id": "put1", "rev": o.rev},
           "Put same document without revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    o.doc_tree.children.unshift({
        "rev": o.rev, "status": "available", "children": []
    });

    // put + revision
    o.doc = {"_id": "put1", "_rev": o.rev, "title": "myPut2"};
    o.revisions = {"start": 1, "ids": [o.rev.split('-')[1]]};
    o.rev = "2-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"id": "put1", "ok": true, "rev": o.rev},
           "Put + revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    delete o.doc._rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/put1." + o.rev),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree.children[0].children.unshift({
        "rev": o.rev, "status": "available", "children": []
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/put1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // put + wrong revision
    o.doc = {"_id": "put1", "_rev": "3-wr3", "title": "myPut3"};
    o.revisions = {"start": 3, "ids": ["wr3"]};
    o.rev = "4-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"id": "put1", "ok": true, "rev": o.rev},
           "Put + wrong revision");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    delete o.doc._rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/put1." + o.rev),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree.children.unshift({
      "rev": "3-wr3",
      "status": "missing",
      "children": [{
        "rev": o.rev,
        "status": "available",
        "children": []
      }]
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/put1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // put + revision history
    o.doc = {
      "_id": "put1",
      //"_revs": ["3-rh3", "2-rh2", "1-rh1"], // same as below
      "_revs": {"start": 3, "ids": ["rh3", "rh2", "rh1"]},
      "title": "myPut3"
    };
    o.spy (o, "value", {"id": "put1", "ok": true, "rev": "3-rh3"},
           "Put + revision history");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1.3-rh3";
    delete o.doc._revs;
    deepEqual(
        localstorage.getItem(o.localpath + "/put1.3-rh3"),
        o.doc,
        "Check document"
    );

    // check document tree
    o.doc_tree.children.unshift({
      "rev": "1-rh1",
      "status": "missing",
      "children": [{
        "rev": "2-rh2",
        "status": "missing",
        "children": [{
          "rev": "3-rh3",
          "status": "available",
          "children": []
        }]
      }]
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/put1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    // add attachment
    o.doc._attachments = {
      "att1": {
        "length": 1,
        "content_type": "text/plain",
        "digest": "md5-0cc175b9c0f1b6a831c399e269772661"
      },
      "att2": {
        "length": 2,
        "content_type": "dont/care",
        "digest": "md5-5360af35bde9ebd8f01f492dc059593c"
      }
    };
    localstorage.setItem(o.localpath + "/put1.3-rh3", o.doc);
    localstorage.setItem(o.localpath + "/put1.3-rh3/att1", "a");
    localstorage.setItem(o.localpath + "/put1.3-rh3/att2", "bc");

    // put + revision with attachment
    o.attachments = o.doc._attachments;
    o.doc = {"_id": "put1", "_rev": "3-rh3", "title": "myPut4"};
    o.revisions = {"start": 3, "ids": ["rh3","rh2","rh1"]};
    o.rev = "4-"+generateRevisionHash(o.doc, o.revisions);
    o.spy (o, "value", {"id": "put1", "ok": true, "rev": o.rev},
           "Put + revision (document contains attachments)");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check document
    o.doc._id = "put1." + o.rev;
    o.doc._attachments = o.attachments;
    delete o.doc._rev;
    deepEqual(
        localstorage.getItem(o.localpath + "/put1." + o.rev),
        o.doc,
        "Check document"
    );

    // check attachments
    deepEqual(
        localstorage.getItem(o.localpath + "/put1." + o.rev + "/att1"),
        "a",
        "Check Attachment"
    );
    deepEqual(
        localstorage.getItem(o.localpath + "/put1." + o.rev + "/att2"),
        "bc",
        "Check Attachment"
    );

    // check document tree
    o.doc_tree.children[0].children[0].children[0].children.unshift({
        "rev": o.rev, "status": "available", "children": []
    });
    deepEqual(
        localstorage.getItem(
            o.localpath + "/put1.revision_tree.json"
        ),
        o.doc_tree,
        "Check document tree"
    );

    o.jio.stop();

});

test("Put Attachment", function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({
      "type": "revision",
      "sub_storage": {
        "type": "local",
        "username": "urevputattmt",
        "application_name": "arevputattmt"
      }
    });

    // putAttachment without doc id
    // error 20 -> document id required
    o.spy(o, "status", 20, "PutAttachment without doc id");
    o.jio.putAttachment({}, o.f);
    o.tick(o);

    // putAttachment without attachment id
    // erorr 22 -> attachment id required
    o.spy(o, "status", 22, "PutAttachment without attachment id");
    o.jio.putAttachment({"_id": "putattmt1"}, o.f);
    o.tick(o);

    // putAttachment without document
    o.revisions = {"start": 0, "ids": []}
    o.rev_hash = generateRevisionHash({"_id": "doc1", "_attachment": "attmt1"},
                                      o.revisions);
    o.rev = "1-" + o.rev_hash;
    o.spy(o, "value", {"ok": true, "id": "doc1/attmt1", "rev": o.rev},
          "PutAttachment without document, without data");
    o.jio.putAttachment({"_id": "doc1/attmt1"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem(
          "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
        ),
        {
            "_id": "doc1." + o.rev,
            "_attachments": {
                "attmt1": {
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
            "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
            + "/attmt1"
        ),
        "", "Check attachment"
    );

    // update attachment
    o.prev_rev = o.rev;
    o.revisions = {"start": 1, "ids": [o.rev_hash]}
    o.rev_hash = generateRevisionHash({
      "_id": "doc1",
      "_data": "abc",
      "_attachment": "attmt1",
    }, o.revisions);
    o.rev = "2-" + o.rev_hash;
    o.spy(o, "value", {"ok": true, "id": "doc1/attmt1", "rev": o.rev},
          "Update Attachment, with data");
    o.jio.putAttachment({
      "_id": "doc1/attmt1",
      "_data": "abc",
      "_rev": o.prev_rev
    }, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem(
          "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
        ),
        {
            "_id": "doc1." + o.rev,
            "_attachments": {
                "attmt1": {
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
            "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev +
            "/attmt1"
        ),
        "abc", "Check attachment"
    );

    // putAttachment new attachment
    o.prev_rev = o.rev;
    o.revisions = {"start": 2, "ids": [o.rev_hash, o.revisions.ids[0]]}
    o.rev_hash = generateRevisionHash({
      "_id": "doc1",
      "_data": "def",
      "_attachment": "attmt2",
    }, o.revisions);
    o.rev = "3-" + o.rev_hash;
    o.spy(o, "value", {"ok": true, "id": "doc1/attmt2", "rev": o.rev},
          "PutAttachment without document, without data");
    o.jio.putAttachment({
      "_id": "doc1/attmt2",
      "_data": "def",
      "_rev": o.prev_rev
    }, o.f);
    o.tick(o);

    // check document
    deepEqual(
        localstorage.getItem(
          "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev
        ),
        {
            "_id": "doc1." + o.rev,
            "_attachments": {
                "attmt1": {
                    "length": 3,
                    "digest": "md5-900150983cd24fb0d6963f7d28e17f72"
                },
                "attmt2": {
                    "length": 3,
                    // md5("def")
                    "digest": "md5-4ed9407630eb1000c0f6b63842defa7d"
                }
            }
        },
        "Check document"
    );

    // check attachment
    deepEqual(
        localstorage.getItem(
            "jio/localstorage/urevputattmt/arevputattmt/doc1." + o.rev +
            "/attmt2"
        ),
        "def", "Check attachment"
    );

    o.jio.stop();

});

test ("Get", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "revision",
        "sub_storage": {
            "type": "local",
            "username": "urevget",
            "application_name": "arevget"
        }
    });
    o.localpath = "jio/localstorage/urevget/arevget";

    // get inexistent document
    o.spy(o, "status", 404, "Get inexistent document (winner)");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment
    o.spy(o, "status", 404, "Get inexistent attachment (winner)");
    o.jio.get({"_id": "get1/get2"}, o.f);
    o.tick(o);

    // adding a document
    o.doctree = {"children":[{
        "rev": "1-rev1", "status": "available", "children": []
    }]};
    o.doc_myget1 = {"_id": "get1.1-rev1", "title": "myGet1"};
    localstorage.setItem(o.localpath+"/get1.revision_tree.json", o.doctree);
    localstorage.setItem(o.localpath+"/get1.1-rev1", o.doc_myget1);

    // get document
    o.doc_myget1_cloned = clone(o.doc_myget1);
    o.doc_myget1_cloned._id = "get1";
    o.doc_myget1_cloned._rev = "1-rev1";
    o.doc_myget1_cloned._revisions = {"start": 1, "ids": ["rev1"]};
    o.doc_myget1_cloned._revs_info = [{
        "rev": "1-rev1", "status": "available"
    }];
    o.spy(o, "value", o.doc_myget1_cloned, "Get document (winner)");
    o.jio.get({"_id": "get1"},
              {"revs_info": true, "revs": true, "conflicts": true},
              o.f);
    o.tick(o);

    // adding two documents
    o.doctree = {"children":[{
        "rev": "1-rev1", "status": "available", "children": []
    },{
        "rev": "1-rev2", "status": "available", "children": [{
            "rev": "2-rev3", "status": "available", "children": []
        }]
    }]};
    o.doc_myget2 = {"_id": "get1.1-rev2", "title": "myGet2"};
    o.doc_myget3 = {"_id": "get1.2-rev3", "title": "myGet3"};
    localstorage.setItem(o.localpath+"/get1.revision_tree.json", o.doctree);
    localstorage.setItem(o.localpath+"/get1.1-rev2", o.doc_myget2);
    localstorage.setItem(o.localpath+"/get1.2-rev3", o.doc_myget3);

    // get document
    o.doc_myget3_cloned = clone(o.doc_myget3);
    o.doc_myget3_cloned._id = "get1";
    o.doc_myget3_cloned["_rev"] = "2-rev3";
    o.doc_myget3_cloned["_revisions"] = {"start": 2, "ids": ["rev3","rev2"]};
    o.doc_myget3_cloned["_revs_info"] = [{
        "rev": "2-rev3", "status": "available"
    },{
        "rev": "1-rev2", "status": "available"
    }];
    o.doc_myget3_cloned["_conflicts"] = ["1-rev1"];
    o.spy(o, "value", o.doc_myget3_cloned,
          "Get document (winner, after posting another one)");
    o.jio.get({"_id": "get1"},
              {"revs_info": true, "revs": true, "conflicts": true},
              o.f);
    o.tick(o);

    // get inexistent specific document
    o.spy(o, "status", 404, "Get document (inexistent specific revision)");
    o.jio.get({"_id": "get1", "_rev": "1-rev0"}, {
        "revs_info": true, "revs": true, "conflicts": true,
    }, o.f);
    o.tick(o);

    // get specific document
    o.doc_myget2_cloned = clone(o.doc_myget2);
    o.doc_myget2_cloned._id = "get1";
    o.doc_myget2_cloned["_rev"] = "1-rev2";
    o.doc_myget2_cloned["_revisions"] = {"start": 1, "ids": ["rev2"]};
    o.doc_myget2_cloned["_revs_info"] = [{
        "rev": "1-rev2", "status": "available"
    }];
    o.doc_myget2_cloned["_conflicts"] = ["1-rev1"];
    o.spy(o, "value", o.doc_myget2_cloned, "Get document (specific revision)");
    o.jio.get({"_id": "get1", "_rev": "1-rev2"}, {
        "revs_info": true, "revs": true, "conflicts": true,
    }, o.f);
    o.tick(o);

    // adding an attachment
    o.attmt_myget3 = {
        "get2": {
            "length": 3,
            "digest": "md5-dontcare",
            "content_type": "oh/yeah"
        }
    };
    o.doc_myget3._attachments = o.attmt_myget3;
    localstorage.setItem(o.localpath+"/get1.2-rev3", o.doc_myget3);
    localstorage.setItem(o.localpath+"/get1.2-rev3/get2", "abc");

    // get attachment winner
    o.spy(o, "value", "abc", "Get attachment (winner)");
    o.jio.get({"_id": "get1/get2"}, o.f);
    o.tick(o);

    // get inexistent attachment specific rev
    o.spy(o, "status", 404, "Get inexistent attachment (specific revision)");
    o.jio.get({"_id": "get1/get2", "_rev": "1-rev1"}, {
        "revs_info": true, "revs": true, "conflicts": true,
    }, o.f);
    o.tick(o);

    // get attachment specific rev
    o.spy(o, "value", "abc", "Get attachment (specific revision)");
    o.jio.get({"_id": "get1/get2", "_rev": "2-rev3"}, {
        "revs_info": true, "revs": true, "conflicts": true,
    }, o.f);
    o.tick(o);

    // get document with attachment (specific revision)
    delete o.doc_myget2_cloned._attachments;
    o.spy(o, "value", o.doc_myget2_cloned,
          "Get document which have an attachment (specific revision)");
    o.jio.get({"_id": "get1", "_rev": "1-rev2"}, {
        "revs_info": true, "revs": true, "conflicts": true,
    }, o.f);
    o.tick(o);

    // get document with attachment (winner)
    o.doc_myget3_cloned._attachments = o.attmt_myget3;
    o.spy(o, "value", o.doc_myget3_cloned,
          "Get document which have an attachment (winner)");
    o.jio.get({"_id": "get1"},
              {"revs_info": true, "revs": true, "conflicts": true},
              o.f);
    o.tick(o);

    o.jio.stop();

});

test ("Remove", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "revision",
        "sub_storage": {
            "type": "local",
            "username": "urevrem",
            "application_name": "arevrem"
        }
    });
    o.localpath = "jio/localstorage/urevrem/arevrem";

    // 1. remove document without revision
    o.spy(o, "status", 409, "Remove document without revision " +
          "-> 409 Conflict");
    o.jio.remove({"_id":"remove1"}, o.f);
    o.tick(o);

    // 2. remove attachment without revision
    o.spy(o, "status", 409, "Remove attachment without revision " +
          "-> 409 Conflict");
    o.jio.remove({"_id":"remove1/remove2"}, o.f);
    o.tick(o);

    // adding a document with attachments
    o.doc_myremove1 = {
      "_id": "remove1.1-veryoldrev",
      "title": "myRemove1"
    };

    localstorage.setItem(o.localpath + "/remove1.1-veryoldrev",
                         o.doc_myremove1);

    o.doc_myremove1._id = "remove1.2-oldrev";
    o.attachment_remove2 = {
        "length": 3,
        "digest": "md5-dontcare",
        "content_type": "oh/yeah"
    }
    o.attachment_remove3 = {
        "length": 5,
        "digest": "md5-865f5cc7fbd7854902eae9d8211f178a",
        "content_type": "he/ho"
    }
    o.doc_myremove1._attachments = {
      "remove2": o.attachment_remove2,
      "remove3": o.attachment_remove3
    };

    localstorage.setItem(o.localpath + "/remove1.2-oldrev",
                         o.doc_myremove1);
    localstorage.setItem(o.localpath + "/remove1.2-oldrev/remove2", "abc");
    localstorage.setItem(o.localpath + "/remove1.2-oldrev/remove3", "defgh");

    // add document tree
    o.doctree = {
      "children": [{
        "rev": "1-veryoldrev", "status": "available", "children": [{
          "rev": "2-oldrev", "status": "available", "children": []
        }]
      }]
    };
    localstorage.setItem(o.localpath + "/remove1.revision_tree.json",
                         o.doctree);

    // 3. remove inexistent attachment
    o.spy(o, "status", 404, "Remove inexistent attachment -> 404 Not Found");
    o.jio.remove({"_id": "remove1/remove0", "_rev": "2-oldrev"}, o.f);
    o.tick(o);

    // 4. remove existing attachment
    o.rev_hash = generateRevisionHash({
      "_id": "remove1",
      "_attachment": "remove2",
    }, {"start": 2, "ids": ["oldrev", "veryoldrev"]});
    o.spy (o, "value",
           {"ok": true, "id": "remove1/remove2", "rev": "3-" + o.rev_hash},
           "Remove existing attachment");
    o.jio.remove({"_id":"remove1/remove2", "_rev": "2-oldrev"}, o.f);
    o.tick(o);

    o.doctree = {
      "children":[{
        "rev": "1-veryoldrev", "status": "available", "children": [{
          "rev": "2-oldrev", "status": "available", "children": [{
            "rev": "3-" + o.rev_hash, "status": "available", "children": []
          }]
        }]
      }]
    };

    // 5. check if document tree has been updated correctly
    deepEqual(localstorage.getItem(
      o.localpath + "/remove1.revision_tree.json"
    ), o.doctree, "Check document tree");

    // 6. check if the attachment still exists
    deepEqual(localstorage.getItem(
      o.localpath + "/remove1.2-oldrev/remove2"
    ), "abc", "Check attachment -> still exists");

    // 7. check if document is updated
    deepEqual(localstorage.getItem(
        o.localpath + "/remove1.3-" + o.rev_hash
    ), {
      "_id": "remove1.3-" + o.rev_hash,
      "title":"myRemove1",
      "_attachments": {"remove3": o.attachment_remove3}
    }, "Check document");

    // 8. remove document with wrong revision
    o.spy(o, "status", 409, "Remove document with wrong revision " +
          "-> 409 Conflict");
    o.jio.remove({"_id":"remove1", "_rev": "1-a"}, o.f);
    o.tick(o);

    // 9. remove attachment wrong revision
    o.spy(o, "status", 409, "Remove attachment with wrong revision " +
          "-> 409 Conflict");
    o.jio.remove({"_id":"remove1/remove2", "_rev": "1-a"}, o.f);
    o.tick(o);

    // 10. remove document
    o.last_rev = "3-" + o.rev_hash;
    o.rev_hash = generateRevisionHash(
      {"_id": "remove1"},
      {"start": 3, "ids": [o.rev_hash, "oldrev", "veryoldrev"]},
      true
    );
    o.spy(o, "value", {"ok": true, "id": "remove1", "rev": "4-" + o.rev_hash},
          "Remove document");
    o.jio.remove({"_id":"remove1", "_rev": o.last_rev}, o.f);
    o.tick(o);

    // 11. check document tree
    o.doctree.children[0].children[0].children[0].children.unshift({
      "rev": "4-" + o.rev_hash,
      "status": "deleted",
      "children": []
    });
    deepEqual(localstorage.getItem(o.localpath + "/remove1.revision_tree.json"),
              o.doctree, "Check document tree");

    o.jio.stop();
});

module ( "Jio Revision Storage + Local Storage" );

test ("Scenario", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "revision",
        "sub_storage": {
            "type": "local",
            "username": "usam1",
            "application_name": "asam1"
        }
    });
    o.localpath = "jio/localstorage/usam1/asam1";

    // new application
    ok ( o.jio, "I open my application with revision and localstorage");

    // put non empty document A-1
    o.doc = {"_id": "sample1", "title": "mySample1"};
    o.revisions = {"start": 0, "ids": []};
    o.hex = generateRevisionHash(o.doc, o.revisions);
    o.rev = "1-"+o.hex;

    o.spy (o, "value", {"ok": true, "id": "sample1", "rev": o.rev},
           "Then, I create a new document (no attachment), my application "+
           "keep the revision in memory");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // open new tab (JIO)
    o.jio2 = JIO.newJio({
        "type": "revision",
        "sub_storage": {
            "type": "local",
            "username": "usam1",
            "application_name": "asam1"
        }
    });
    o.localpath = "jio/localstorage/usam1/asam1";

    // Create a new JIO in a new tab
    ok (o.jio2, "Now, I am opening a new tab, with the same application"+
        " and the same storage tree");

    // Get the document from the first storage
    o.doc._rev = o.rev;
    o.doc._revisions = {"ids":[o.hex], "start":1 };
    o.doc._revs_info = [{"rev": o.rev, "status": "available"}];
    o.spy(o, "value", o.doc, "And, on this new tab, I load the document,"+
        "and my application keep the revision in memory");
    o.jio2.get({"_id": "sample1", "_rev": o.rev}, {
        "revs_info": true, "revs": true, "conflicts": true,
    }, o.f);
    o.tick(o);

    // MODFIY the 2nd version
    o.doc_2 = {"_id": "sample1", "_rev": o.rev,
        "title":"mySample2_modified"};
    o.revisions_2 = {"start":1 , "ids":[o.hex]};
    o.hex_2 = generateRevisionHash(o.doc_2, o.revisions_2)
    o.rev_2 = "2-"+o.hex_2;
    o.spy (o, "value", {"id":"sample1", "ok":true, "rev": o.rev_2},
           "So, I can modify and update it");
    o.jio2.put(o.doc_2, o.f);
    o.tick(o);

    // MODFIY first version
    o.doc_1 = {
        "_id": "sample1", "_rev": o.rev, "title": "mySample1_modified"
    };
    o.revisions_1 = {"start": 1, "ids":[o.rev.split('-')[1]
    ]};
    o.hex_1 = generateRevisionHash(o.doc_1, o.revisions_1);
    o.rev_1 = "2-"+o.hex_1;
    o.spy (o, "value", {"id":"sample1", "ok":true, "rev": o.rev_1},
           "Back to the first tab, I update the document.");
    o.jio.put(o.doc_1, o.f);
    o.tick(o);

    // Close 1st tab
    o.jio.close();

    // Close 2nd tab
    o.jio2.close();
    ok ( o.jio2, "I close tab both tabs");

    // Reopen JIO
    o.jio = JIO.newJio({
        "type": "revision",
        "sub_storage": {
            "type": "local",
            "username": "usam1",
            "application_name": "asam1"
        }
    });
    o.localpath = "jio/localstorage/usam1/asam1";
    ok ( o.jio, "Later, I open my application again");

    // GET document without revision = winner & conflict!
    o.mydocSample3 = {"_id": "sample1", "title": "mySample1_modified",
                      "_rev": o.rev_1};
    o.mydocSample3._conflicts = [o.rev_2]
    o.mydocSample3._revs_info = [{"rev": o.rev_1, "status": "available"},{
        "rev":o.rev,"status":"available"
        }];
    o.mydocSample3._revisions = {"ids":[o.hex_1, o.hex], "start":2 };
    o.spy(o, "value", o.mydocSample3,
          "I load the same document as before, and a popup shows that "+
          "there is a conflict");
    o.jio.get({"_id": "sample1"},
              {"revs_info": true, "revs": true, "conflicts": true,
        }, o.f);
    o.tick(o);

    // REMOVE one of the two conflicting versions
    o.revisions = {"start": 2, "ids":[
        o.rev_1.split('-')[1],o.rev.split('-')[1]
    ]};
    o.doc_myremove3 = {"_id": "sample1", "_rev": o.rev_1};
    o.rev_3 = "3-"+generateRevisionHash(o.doc_myremove3, o.revisions,true);

    o.spy (o, "value", {"ok": true, "id": "sample1", "rev": o.rev_3},
           "I choose one of the document and close the application.");
    o.jio.remove({"_id":"sample1", "_rev":o.rev_1}, o.f);
    o.tick(o);

    // check to see if conflict still exists
    o.mydocSample4 = {"_id": "sample1", "title": "mySample2_modified",
                      "_rev": o.rev_2};
    o.mydocSample4._revs_info = [{"rev": o.rev_2, "status": "available"},{
        "rev":o.rev,"status":"available"
        }];
    o.mydocSample4._revisions = {"ids":[o.hex_2, o.hex], "start":2 };

    o.spy(o, "value", o.mydocSample4, "Test if conflict still exists");
    o.jio.get({"_id": "sample1"}, {"revs_info": true, "revs": true,
              "conflicts": true,}, o.f);
    o.tick(o);

    // END
    o.jio.stop();

});

module ("JIO Replicate Revision Storage");

  var testReplicateRevisionStorage = function (sinon, jio_description) {

    var o = generateTools(sinon), leavesAction, generateLocalPath;

    o.jio = JIO.newJio(jio_description);

    generateLocalPath = function (storage_description) {
      return "jio/localstorage/" + storage_description.username + "/" +
        storage_description.application_name;
    };

    leavesAction = function (action, storage_description, param) {
      var i;
      if (param === undefined) {
        param = {};
      } else {
        param = clone(param);
      }
      if (storage_description.storage_list !== undefined) {
        // it is the replicate revision storage tree
        for (i = 0; i < storage_description.storage_list.length; i += 1) {
          leavesAction(action, storage_description.storage_list[i], param);
        }
      } else if (storage_description.sub_storage !== undefined) {
        // it is the revision storage tree
        param.revision = true;
        leavesAction(action, storage_description.sub_storage, param);
      } else {
        // it is the storage tree leaf
        param[storage_description.type] = true;
        action(storage_description, param);
      }
    };
    o.leavesAction = function (action) {
      leavesAction(action, jio_description);
    };

    // post a new document without id
    o.doc = {"title": "post document without id"};
    o.spy(o, "status", undefined, "Post document (without id)");
    o.jio.post(o.doc, function (err, response) {
      o.f.apply(arguments);
      o.response_rev = (err || response).rev;
      if (isUuid((err || response).id)) {
        ok(true, "Uuid format");
        o.uuid = (err || response).id;
      } else {
        deepEqual((err || response).id,
                  "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "Uuid format");
      }
    });
    o.tick(o);

    // check document
    o.doc._id = o.uuid;
    o.revision = {"start": 0, "ids": []};
    o.rev = "1-1";
    o.local_rev = "1-" + generateRevisionHash(o.doc, o.revision);
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = clone(o.doc);
      if (param.revision) {
        deepEqual(o.response_rev, o.rev, "Check revision");
        doc._id += "." + o.local_rev;
        suffix = "." + o.local_rev;
      }
      deepEqual(
        localstorage.getItem(generateLocalPath(storage_description) +
                             "/" + o.uuid + suffix),
        doc, "Check document"
      );
    });

    // get the post document without revision
    o.spy(o, "value", {
      "_id": o.uuid,
      "title": "post document without id",
      "_rev": "1-1",
      "_revisions": {"start": 1, "ids": ["1"]},
      "_revs_info": [{"rev": "1-1", "status": "available"}]
    }, "Get the previous document (without revision)");
    o.jio.get({"_id": o.uuid}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // post a new document with id
    o.doc = {"_id": "doc1", "title": "post new doc with id"};
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev},
          "Post document (with id)");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // //  /
    // //  |
    // // 1-1

    // check document
    o.local_rev_hash = generateRevisionHash(o.doc, o.revision);
    o.local_rev = "1-" + o.local_rev_hash;
    o.specific_rev_hash = o.local_rev_hash;
    o.specific_rev = o.local_rev;
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = clone(o.doc);
      if (param.revision) {
        doc._id += "." + o.local_rev;
        suffix = "." + o.local_rev;
      }
      deepEqual(
        localstorage.getItem(generateLocalPath(storage_description) +
                             "/doc1" + suffix),
        doc, "Check document"
      );
    });

    // get the post document without revision
    o.spy(o, "value", {
      "_id": "doc1",
      "title": "post new doc with id",
      "_rev": "1-1",
      "_revisions": {"start": 1, "ids": ["1"]},
      "_revs_info": [{"rev": "1-1", "status": "available"}]
    }, "Get the previous document (without revision)");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // post same document without revision
    o.doc = {"_id": "doc1", "title": "post same document without revision"};
    o.rev = "1-2";
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev},
          "Post same document (without revision)");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    //    /
    //   / \
    // 1-1 1-2

    // check document
    o.local_rev = "1-" + generateRevisionHash(o.doc, o.revision);
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = clone(o.doc);
      if (param.revision) {
        doc._id += "." + o.local_rev;
        suffix = "." + o.local_rev;
      }
      deepEqual(
        localstorage.getItem(generateLocalPath(storage_description) +
                             "/doc1" + suffix),
        doc, "Check document"
      );
    });

    // post a new revision
    o.doc = {"_id": "doc1", "title": "post new revision", "_rev": o.rev};
    o.rev = "2-3";
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev},
          "Post document (with revision)");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    //    /
    //   / \
    // 1-1 1-2
    //      |
    //     2-3

    // check document
    o.revision.start += 1;
    o.revision.ids.unshift(o.local_rev.split("-").slice(1).join("-"));
    o.doc._rev = o.local_rev;
    o.local_rev = "2-" + generateRevisionHash(o.doc, o.revision);
    o.specific_rev_conflict = o.local_rev;
    o.leavesAction(function (storage_description, param) {
      var suffix = "", doc = clone(o.doc);
      delete doc._rev;
      if (param.revision) {
        doc._id += "." + o.local_rev;
        suffix = "." + o.local_rev;
      }
      deepEqual(
        localstorage.getItem(generateLocalPath(storage_description) +
                             "/doc1" + suffix),
        doc, "Check document"
      );
    });

    // get the post document with revision
    o.spy(o, "value", {
      "_id": "doc1",
      "title": "post same document without revision",
      "_rev": "1-2",
      "_revisions": {"start": 1, "ids": ["2"]},
      "_revs_info": [{"rev": "1-2", "status": "available"}],
      "_conflicts": ["1-1"]
    }, "Get the previous document (with revision)");
    o.jio.get({"_id": "doc1", "_rev": "1-2"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // get the post document with specific revision
    o.spy(o, "value", {
      "_id": "doc1",
      "title": "post new doc with id",
      "_rev": o.specific_rev,
      "_revisions": {"start": 1, "ids": [o.specific_rev_hash]},
      "_revs_info": [{"rev": o.specific_rev, "status": "available"}],
      "_conflicts": [o.specific_rev_conflict]
    }, "Get a previous document (with local storage revision)");
    o.jio.get({"_id": "doc1", "_rev": o.specific_rev}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    // put document without id
    o.spy(o, "status", 20, "Put document without id")
    o.jio.put({}, o.f);
    o.tick(o);

    // put document without rev
    o.doc = {"_id": "doc1", "title": "put new document"};
    o.rev = "1-4";
    o.spy(o, "value", {"id": "doc1", "ok": true, "rev": o.rev},
          "Put document without rev")
    o.jio.put(o.doc, o.f);
    o.tick(o);

    //    __/__
    //   /  |  \
    // 1-1 1-2 1-4
    //      |
    //     2-3

    // put new revision
    o.doc = {"_id": "doc1", "title": "put new revision", "_rev": "1-4"};
    o.rev = "2-5";
    o.spy(o, "value", {"id": "doc1", "ok": true, "rev": o.rev},
          "Put document without rev")
    o.jio.put(o.doc, o.f);
    o.tick(o);

    //    __/__
    //   /  |  \
    // 1-1 1-2 1-4
    //      |   |
    //     2-3 2-5

    // putAttachment to inexistent document
    // putAttachment
    // get document
    // get attachment
    // put document
    // get document
    // get attachment
    // remove attachment
    // get document
    // get inexistent attachment

    // remove document and conflict
    o.rev = "3-6";
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev},
          "Remove document");
    o.jio.remove({"_id": "doc1", "_rev": "2-5"}, o.f);
    o.tick(o);

    // remove document and conflict
    o.rev = "3-7";
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev},
          "Remove document");
    o.jio.remove({"_id": "doc1", "_rev": "2-3"}, o.f);
    o.tick(o);

    // remove document
    o.rev = "2-8";
    o.spy(o, "value", {"ok": true, "id": "doc1", "rev": o.rev},
          "Remove document");
    o.jio.remove({"_id": "doc1", "_rev": "1-1"}, o.f);
    o.tick(o);

    // get inexistent document
    o.spy(o, "status", 404, "Get inexistent document");
    o.jio.get({"_id": "doc1"}, {
      "conflicts": true,
      "revs": true,
      "revs_info": true
    }, o.f);
    o.tick(o);

    o.jio.stop();

  };

  test ("[Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevloc",
          "application_name": "areprevloc"
        }
      }]
    });
  });
  test("[Replicate Revision + Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc",
            "application_name": "arepreprevloc"
          }
        }]
      }]
    });
  });
  test ("2x [Revision + Local Storage] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevlocloc1",
          "application_name": "areprevlocloc1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "ureprevlocloc2",
          "application_name": "areprevlocloc2"
        }
      }]
    });
  });
  test("2x [Replicate Rev + 2x [Rev + Local]] Scenario", function () {
    testReplicateRevisionStorage(this, {
      "type": "replicaterevision",
      "storage_list": [{
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc1",
            "application_name": "arepreprevloc1"
          }
        }, {
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc2",
            "application_name": "arepreprevloc2"
          }
        }]
      }, {
        "type": "replicaterevision",
        "storage_list": [{
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc3",
            "application_name": "arepreprevloc3"
          }
        }, {
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "urepreprevloc4",
            "application_name": "arepreprevloc4"
          }
        }]
      }]
    });
  });

  test("Storage Synchronisation (Replicate Revision Repair)", function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc1",
          "application_name": "1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc2",
          "application_name": "1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc3",
          "application_name": "1"
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": "usyncreprevlocloc4",
          "application_name": "1"
        }
      }]
    });
    o.localpath1 = "jio/localstorage/usyncreprevlocloc1/1";
    o.localpath2 = "jio/localstorage/usyncreprevlocloc2/1";
    o.localpath3 = "jio/localstorage/usyncreprevlocloc3/1";
    o.localpath4 = "jio/localstorage/usyncreprevlocloc4/1";

    // add documents to localstorage
    o.doctree1_1 = {
      "children": [{
        "rev": "1-111",
        "status": "available",
        "children": [],
      }]
    };
    o.doc1_1 = {"_id": "doc1.1-111", "title": "A"};
    localstorage.setItem(o.localpath1 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    localstorage.setItem(o.localpath2 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    localstorage.setItem(o.localpath3 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    localstorage.setItem(o.localpath4 + "/doc1.revision_tree.json",
                         o.doctree1_1);
    localstorage.setItem(o.localpath1 + "/" + o.doc1_1._id, o.doc1_1);
    localstorage.setItem(o.localpath2 + "/" + o.doc1_1._id, o.doc1_1);
    localstorage.setItem(o.localpath3 + "/" + o.doc1_1._id, o.doc1_1);
    localstorage.setItem(o.localpath4 + "/" + o.doc1_1._id, o.doc1_1);

    // no synchronisation
    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Check document");
    o.jio.check({"_id": "doc1"}, o.f);
    o.tick(o);

    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Repair document");
    o.jio.repair({"_id": "doc1"}, o.f);
    o.tick(o);

    // check documents from localstorage
    deepEqual(
      localstorage.getItem(o.localpath1 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 1, no synchro done"
    );
    deepEqual(
      localstorage.getItem(o.localpath2 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 2, no synchro done"
    );
    deepEqual(
      localstorage.getItem(o.localpath3 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 3, no synchro done"
    );
    deepEqual(
      localstorage.getItem(o.localpath4 + "/doc1.revision_tree.json"),
      o.doctree1_1,
      "Check revision tree 4, no synchro done"
    );

    // add documents to localstorage
    o.doctree2_2 = clone(o.doctree1_1);
    o.doctree2_2.children[0].children.push({
      "rev": "2-222",
      "status": "available",
      "children": []
    });
    o.doc2_2 = {"_id": "doc1.2-222", "title": "B"};
    localstorage.setItem(o.localpath1 + "/doc1.revision_tree.json",
                         o.doctree2_2);
    localstorage.setItem(o.localpath1 + "/" + o.doc2_2._id, o.doc2_2);

    // document synchronisation without conflict
    o.spy(o, "status", 41, "Check document");
    o.jio.check({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Repair document");
    o.jio.repair({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    // check documents from localstorage
    deepEqual(
      localstorage.getItem(o.localpath1 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 1, no synchro done"
    );
    deepEqual(
      localstorage.getItem(o.localpath2 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 2, revision synchro done"
    );
    deepEqual(
      localstorage.getItem(o.localpath3 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 3, revision synchro done"
    );
    deepEqual(
      localstorage.getItem(o.localpath4 + "/doc1.revision_tree.json"),
      o.doctree2_2,
      "Check revision tree 4, revision synchro done"
    );

    // add documents to localstorage
    o.doctree2_2.children[0].children.unshift({
      "rev": "2-223",
      "status": "available",
      "children": []
    });
    o.doc2_2 = {"_id": "doc1.2-223", "title": "B"};
    localstorage.setItem(o.localpath1 + "/doc1.revision_tree.json",
                         o.doctree2_2);
    localstorage.setItem(o.localpath1 + "/" + o.doc2_2._id, o.doc2_2);

    // document synchronisation with conflict
    o.spy(o, "status", 41, "Check document");
    o.jio.check({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    o.spy(o, "value", {"ok": true, "id": "doc1"},
          "Repair document");
    o.jio.repair({"_id": "doc1"}, o.f);
    o.tick(o, 50000);

    // check documents from localstorage
    deepEqual([
      localstorage.getItem(o.localpath1 + "/doc1.revision_tree.json"),
      localstorage.getItem(o.localpath2 + "/doc1.revision_tree.json"),
    ], [o.doctree2_2, o.doctree2_2], "Check revision trees, rev synchro");

    o.jio.stop();

  });
/*
module ("Jio DAVStorage");

test ("Post", function () {

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "dav",
        "username": "davpost",
        "password": "checkpwd",
        "url": "https://ca-davstorage:8080"
    });

    // post without id
    o.spy (o, "status", 405, "Post without id");
    o.jio.post({}, o.f);
    o.clock.tick(5000);

    // post non empty document
    o.addFakeServerResponse("dav", "PUT", "myFile", 201, "HTML RESPONSE");
    o.spy(o, "value", {"id": "myFile", "ok": true},
          "Create = POST non empty document");
    o.jio.post({"_id": "myFile", "title": "hello there"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    // post but document already exists (post = error!, put = ok)
    o.answer = JSON.stringify({"_id": "myFile", "title": "hello there"});
    o.addFakeServerResponse("dav", "GET", "myFile", 200, o.answer);
    o.spy (o, "status", 409, "Post but document already exists");
    o.jio.post({"_id": "myFile", "title": "hello again"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    o.jio.stop();
});

test ("Put", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "dav",
        "username": "davput",
        "password": "checkpwd",
        "url": "https://ca-davstorage:8080"
    });

    // put without id => id required
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.clock.tick(5000);

    // put non empty document
    o.addFakeServerResponse("dav", "PUT", "put1", 201, "HTML RESPONSE");
    o.spy (o, "value", {"ok": true, "id": "put1"},
           "Create = PUT non empty document");
    o.jio.put({"_id": "put1", "title": "myPut1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();
    //console.log( o.server );
    //console.log( o.server.requests[0].requestHeaders );
    //console.log( o.server.requests[0].responseHeaders );

    // put but document already exists = update
    o.answer = JSON.stringify({"_id": "put1", "title": "myPut1"});
    o.addFakeServerResponse("dav", "GET", "put1", 200, o.answer);
    o.addFakeServerResponse("dav", "PUT", "put1", 201, "HTML RESPONSE");
    o.spy (o, "value", {"ok": true, "id": "put1"}, "Updated the document");
    o.jio.put({"_id": "put1", "title": "myPut2abcdedg"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    o.jio.stop();
});

test ("PutAttachment", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "dav",
        "username": "davputattm",
        "password": "checkpwd",
        "url": "https://ca-davstorage:8080"
    });

    // putAttachment without doc id => id required
    o.spy(o, "status", 20, "PutAttachment without doc id");
    o.jio.putAttachment({}, o.f);
    o.clock.tick(5000);

    // putAttachment without attachment id => attachment id required
    o.spy(o, "status", 22, "PutAttachment without attachment id");
    o.jio.putAttachment({"id": "putattmt1"}, o.f);
    o.clock.tick(5000);

    // putAttachment without underlying document => not found
    o.addFakeServerResponse("dav", "GET", "putattmtx", 22, "HTML RESPONSE");
    o.spy(o, "status", 22, "PutAttachment without document");
    o.jio.putAttachment({"id": "putattmtx.putattmt2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    // putAttachment with document without data
    o.answer = JSON.stringify({"_id": "putattmt1", "title": "myPutAttm1"});
    o.addFakeServerResponse("dav", "GET", "putattmt1", 200, o.answer);
    o.addFakeServerResponse("dav", "PUT", "putattmt1", 201, "HTML RESPONSE");
    o.addFakeServerResponse("dav", "PUT", "putattmt1.putattmt2", 201,"HTML"+
      + "RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "PutAttachment with document, without data");
    o.jio.putAttachment({"id": "putattmt1/putattmt2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    // update attachment
    o.answer = JSON.stringify({"_id": "putattmt1", "title": "myPutAttm1"});
    o.addFakeServerResponse("dav", "GET", "putattmt1", 200, o.answer);
    o.addFakeServerResponse("dav", "PUT", "putattmt1", 201, "HTML RESPONSE");
    o.addFakeServerResponse("dav", "PUT", "putattmt1.putattmt2", 201,"HTML"+
      "RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "Update Attachment, with data");
    o.jio.putAttachment({"id": "putattmt1/putattmt2", "data": "abc"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    o.jio.stop();
});

test ("Get", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "dav",
        "username": "davget",
        "password": "checkpwd",
        "url": "https://ca-davstorage:8080"
    });

    // get inexistent document
    o.addFakeServerResponse("dav", "GET", "get1", 404, "HTML RESPONSE");
    o.spy(o, "status", 404, "Get non existing document");
    o.jio.get("get1", o.f);
    o.clock.tick(5000);
    o.server.respond();

    // get inexistent attachment
    o.addFakeServerResponse("dav", "GET", "get1.get2", 404, "HTML RESPONSE");
    o.spy(o, "status", 404, "Get non existing attachment");
    o.jio.get("get1/get2", o.f);
    o.clock.tick(5000);
    o.server.respond();

    // get document
    o.answer = JSON.stringify({"_id": "get3", "title": "some title"});
    o.addFakeServerResponse("dav", "GET", "get3", 200, o.answer);
    o.spy(o, "value", {"_id": "get3", "title": "some title"}, "Get document");
    o.jio.get("get3", o.f);
    o.clock.tick(5000);
    o.server.respond();

    // get inexistent attachment (document exists)
    o.addFakeServerResponse("dav", "GET", "get3.getx", 404, "HTML RESPONSE");
    o.spy(o, "status", 404, "Get non existing attachment (doc exists)");
    o.jio.get("get3/getx", o.f);
    o.clock.tick(5000);
    o.server.respond();

    // get attachment
    o.answer = JSON.stringify({"_id": "get4", "title": "some attachment"});
    o.addFakeServerResponse("dav", "GET", "get3.get4", 200, o.answer);
    o.spy(o, "value", {"_id": "get4", "title": "some attachment"},
      "Get attachment");
    o.jio.get("get3/get4", o.f);
    o.clock.tick(5000);
    o.server.respond();

    o.jio.stop();
});

test ("Remove", function(){

    var o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "dav",
        "username": "davremove",
        "password": "checkpwd",
        "url": "https://ca-davstorage:8080"
    });

    // remove inexistent document
    o.addFakeServerResponse("dav", "GET", "remove1", 404, "HTML RESPONSE");
    o.spy(o, "status", 404, "Remove non existening document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    // remove inexistent document/attachment
    o.addFakeServerResponse("dav", "GET", "remove1.remove2", 404, "HTML" +
      "RESPONSE");
    o.spy(o, "status", 404, "Remove inexistent document/attachment");
    o.jio.remove({"_id": "remove1/remove2"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    // remove document
    o.answer = JSON.stringify({"_id": "remove3", "title": "some doc"});
    o.addFakeServerResponse("dav", "GET", "remove3", 200, o.answer);
    o.addFakeServerResponse("dav", "DELETE", "remove3", 200, "HTML RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "remove3"}, "Remove document");
    o.jio.remove({"_id": "remove3"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

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
    o.addFakeServerResponse("dav", "GET", "remove4", 200, o.answer);
    o.addFakeServerResponse("dav", "PUT", "remove4", 201, "HTML RESPONSE");
    o.addFakeServerResponse("dav", "DELETE", "remove4.remove5", 200, "HTML"+
      "RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "remove4/remove5"},
          "Remove attachment");
    o.jio.remove({"_id": "remove4/remove5"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    o.answer = JSON.stringify({
      "_id": "remove6",
      "title": "some other doc",
      "_attachments": {
            "remove7": {
                "length": 4,
                "digest": "md5-d41d8cd98f00b204e9800998ecf8427e"
            },
            "remove8": {
                "length": 4,
                "digest": "md5-e41d8cd98f00b204e9800998ecf8427e"
            },
            "remove9": {
                "length": 4,
                "digest": "md5-f41d8cd98f00b204e9800998ecf8427e"
            }
      }
    });
    // remove document with multiple attachments
    o.addFakeServerResponse("dav", "GET", "remove6", 200, o.answer);
    o.addFakeServerResponse("dav", "DELETE", "remove6.remove7", 200, "HTML"+
      "RESPONSE");
    o.addFakeServerResponse("dav", "DELETE", "remove6.remove8", 200, "HTML"+
      "RESPONSE");
    o.addFakeServerResponse("dav", "DELETE", "remove6.remove9", 200, "HTML"+
      "RESPONSE");
    o.addFakeServerResponse("dav", "DELETE", "remove6", 200, "HTML RESPONSE");
    o.spy(o, "value", {"ok": true, "id": "remove6"},
          "Remove document with multiple attachments");
    o.jio.remove({"_id": "remove6"}, o.f);
    o.clock.tick(5000);
    o.server.respond();

    o.jio.stop();
});

test ("AllDocs", function () {

  // need to make server requests before activating fakeServer
  var davlist = getXML('responsexml/davlist'),
    o = generateTools(this);

    o.jio = JIO.newJio({
        "type": "dav",
        "username": "davall",
        "password": "checkpwd",
        "url": "https://ca-davstorage:8080"
    });

  // get allDocs, no content
  o.addFakeServerResponse("dav", "PROPFIND", "", 200, davlist);
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
  o.server.respond();

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
  o.addFakeServerResponse("dav", "GET", "alldocs1", 200,
    JSON.stringify(o.all1));
  o.addFakeServerResponse("dav", "GET", "alldocs2", 200,
    JSON.stringify(o.all2));
  o.spy(o, "value", o.thisShouldBeTheAnswer, "allDocs (include_docs)");
  o.jio.allDocs({"include_docs":true}, o.f);
  o.clock.tick(5000);
  o.server.respond();

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
            {"name":"indexA", "fields":["findMeA"]},
            {"name":"indexAB", "fields":["findMeA","findMeB"]}
        ],
        "field_types": {
          "findMeA": "string",
          "findMeB": "string"
        },
        "sub_storage": {
          "type": "local",
          "username": "ipost",
          "application_name": "ipost"
        }
    });

    // post without id
    o.spy (o, "status", undefined, "Post without id");
    o.jio.post({}, o.f);
    o.tick(o);

    // post non empty document
    o.doc = {"_id": "some_id", "title": "myPost1",
      "findMeA":"keyword_abc", "findMeB":"keyword_def"
    };
    o.spy (o, "value", {"ok": true, "id": "some_id"}, "Post document");
    o.jio.post(o.doc, o.f);
    o.tick(o);

    // check document
    o.fakeIndex = {
      "_id": "ipost_indices.json",
      "indexAB": {
        "findMeA": {
          "keyword_abc":["some_id"]
        },
        "findMeB": {
          "keyword_def":["some_id"]
        }
      },
      "indexA": {
        "findMeA": {
          "keyword_abc":["some_id"]
        }
      }
    };
    o.jio.get({"_id": "ipost_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
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
              {"name":"indexA", "fields":["author"]},
              {"name":"indexAB", "fields":["author","year"]}
          ],
          "field_types": {
            "author": "string",
            "year": "number"
          },
          "sub_storage": {
            "type": "local",
            "username": "iput",
            "application_name": "iput"
          }
      });

    // put without id
    // error 20 -> document id required
    o.spy (o, "status", 20, "Put without id");
    o.jio.put({}, o.f);
    o.tick(o);

    // put non empty document
    o.doc = {"_id": "put1", "title": "myPut1", "author":"John Doe"};
    o.spy (o, "value", {"ok": true, "id": "put1"}, "Put-create document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndex = {
      "indexA": {
        "author": {
          "John Doe": ["put1"]
        }
      },
      "indexAB": {
        "author": {
          "John Doe": ["put1"]
        },
        "year": {}
      },
      "_id": "iput_indices.json"
    };
    o.jio.get({"_id": "iput_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
    o.tick(o);

    // modify document - modify keyword on index!
    o.doc = {"_id": "put1", "title": "myPuttter1", "author":"Jane Doe"};
    o.spy (o, "value", {"ok": true, "id": "put1"}, "Modify existing document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndex = {
      "indexA": {
        "author": {
          "Jane Doe": ["put1"]
          }
      },
      "indexAB": {
        "author": {
          "Jane Doe": ["put1"]
          },
        "year": {}
      },
      "_id": "iput_indices.json"
    };
    o.jio.get({"_id": "iput_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
    o.tick(o);

    // add new document with same keyword!
    o.doc = {"_id": "new_doc", "title": "myPut2", "author":"Jane Doe"};
    o.spy (o, "value", {"ok": true, "id": "new_doc"},
      "Add new document with same keyword");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndex = {
      "indexA": {
        "author": {
          "Jane Doe": ["put1", "new_doc"]
          }
        },
      "indexAB": {
        "author": {
          "Jane Doe": ["put1", "new_doc"]
          },
        "year": {}
        },
      "_id": "iput_indices.json"
    };
    o.jio.get({"_id": "iput_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
    o.tick(o);

    // add second keyword to index file
    o.doc = {"_id": "put1", "title": "myPut2", "author":"Jane Doe",
      "year":"1912"};
    o.spy (o, "value", {"ok": true, "id": "put1"},
      "add second keyword to index file");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndex = {
      "indexA": {
        "author": {
          "Jane Doe": ["put1"]
          }
        },
      "indexAB": {
        "author": {
          "Jane Doe": ["put1"]
          },
        "year": {
          "1912": ["put1"]
          }
        },
      "_id": "iput_indices.json"
    };
    o.jio.get({"_id": "iput_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
    o.tick(o);

    // remove a keyword from an existing document
    o.doc = {"_id": "new_doc", "title": "myPut2"};
    o.spy (o, "value", {"ok": true, "id": "new_doc"},
      "Remove keyword from existing document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    // check index file
    o.fakeIndex = {
      "indexA": {
        "author": {
          "Jane Doe": ["put1"]
        }
      },
      "indexAB": {
        "author": {
          "Jane Doe": ["put1"]
        },
        "year": {
          "1912": ["put1"]
        }
      },
      "_id": "iput_indices.json"
    };
    o.jio.get({"_id": "iput_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
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
              {"name":"indexA", "fields":["author"]},
              {"name":"indexAB", "fields":["author","year"]}
          ],
          "field_types": {
            "author": "string",
            "year": "number"
          },
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
    o.jio.putAttachment({"_id": "putattmt1/putattmt2"}, o.f);
    o.tick(o);

    // putAttachment with document
    o.doc = {"_id": "putattmt1","title": "myPutAttmt1"};
    o.spy (o, "value", {"ok": true, "id": "putattmt1"},
      "Put underlying document");
    o.jio.put(o.doc, o.f);
    o.tick(o);

    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "PutAttachment with document, without data");
    o.jio.putAttachment({"_id": "putattmt1/putattmt2"}, o.f);
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
    o.spy(o, "value", {"ok": true, "id": "putattmt1/putattmt2"},
          "Update Attachment, with data");
    o.jio.putAttachment({"_id": "putattmt1/putattmt2", "_data": "abc"}, o.f);
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
              {"name":"indexA", "fields":["author"]},
              {"name":"indexAB", "fields":["author","year"]}
          ],
          "field_types": {
            "author": "string",
            "year": "number"
          },
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
    o.jio.get({"_id": "get1/get2"}, o.f);
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
    o.jio.get({"_id": "get1/get2"}, o.f);
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
    o.jio.get({"_id": "get1/get2"}, o.f);
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
          {"name":"indexA", "fields":["author"]},
          {"name":"indexAB", "fields":["author","year"]}
      ],
      "field_types": {
            "author": "string",
            "year": "number"
      },
      "sub_storage": {
        "type": "local",
        "username": "irem",
        "application_name": "irem"
      }
    });

    // remove inexistent document
    o.spy(o, "status", 404, "Remove inexistent document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // remove inexistent document/attachment
    o.spy(o, "status", 404, "Remove inexistent document/attachment");
    o.jio.remove({"_id": "remove1/remove2"}, o.f);
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
    o.fakeIndex = {
      "_id": "irem_indices.json",
      "indexA": {
         "author": {
           "Martin Mustermann": ["removeAlso"]
          }
        },
      "indexAB": {
        "year": {
          "2525": ["removeAlso"]
        },
        "author": {
          "Martin Mustermann": ["removeAlso"]
          }
        }
    };
    o.jio.get({"_id": "irem_indices.json"},function(err, response){
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
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
    o.jio.putAttachment({"_id":"remove3/removeAtt", "_mimetype":"text/plain",
      "_data":"hello"});
    o.tick(o);

    // add another attachment
    o.jio.putAttachment({"_id":"remove3/removeAtt2", "_mimetype":"text/plain",
      "_data":"hello2"});
    o.tick(o);

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "remove3/removeAtt2"},
          "Remove one of multiple attachment");
    o.jio.remove({"_id": "remove3/removeAtt2"}, o.f);
    o.tick(o);

    // check index
    o.fakeIndex = {
      "_id": "irem_indices.json",
      "indexA": {
        "author":{
          "Martin Mustermann": ["removeAlso"],
          "Mrs Sunshine": ["remove3"]
        }
      },
      "indexAB": {
        "year": {
          "1234": ["remove3"],
          "2525": ["removeAlso"]
        },
        "author": {
          "Martin Mustermann": ["removeAlso"],
          "Mrs Sunshine": ["remove3"]
        }
      }
    };
    o.jio.get({"_id": "irem_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
    o.tick(o);

    // remove document and attachment together
    o.spy(o, "value", {"ok": true, "id": "remove3"},
          "Remove one document and attachment together");
    o.jio.remove({"_id": "remove3"}, o.f);
    o.tick(o);

    // check index
    o.fakeIndex = {
      "_id": "irem_indices.json",
      "indexA": {
        "author": {
          "Martin Mustermann": ["removeAlso"]
        }
      },
      "indexAB": {
        "year": {
          "2525": ["removeAlso"]
        },
        "author": {
          "Martin Mustermann": ["removeAlso"]
        }
      }
    };
    o.jio.get({"_id": "irem_indices.json"}, function (err, response) {
       o.actualIndex = response;
       deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
    });
    o.tick(o);

    // check attachment
    o.spy(o, "status", 404, "Check if attachment has been removed");
    o.jio.get({"_id": "remove3/removeAtt"}, o.f);
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
          {"name":"indexA", "fields":["author"]},
          {"name":"indexAB", "fields":["author","year"]}
      ],
      "field_types": {
        "author": "string",
        "year": "number"
      },
      "sub_storage": {
        "type": "local",
        "username": "iall",
        "application_name": "iall"
      }
    });

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
  o.fakeIndex = {
    "_id": "iall_indices.json",
    "indexA": {
      "author": {
        "Dr. No": ["dragon.doc"],
        "Dr. Who": ["timemachine"],
        "Dr. Snuggles": ["rocket.ppt"],
        "Dr. House":["stick.jpg"]
      }
    },
    "indexAB": {
      "author": {
        "Dr. No": ["dragon.doc"],
        "Dr. Who": ["timemachine"],
        "Dr. Snuggles": ["rocket.ppt"],
        "Dr. House":["stick.jpg"]
      },
      "year": {
        "1968": ["dragon.doc", "timemachine"],
        "1985": ["rocket.ppt"],
        "2005":["stick.jpg"]
      }
    }
  };
  o.jio.get({"_id": "iall_indices.json"}, function (err, response) {
      o.actualIndex = response;
      deepEqual(o.actualIndex, o.fakeIndex, "Check index file");
  });
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

  o.thisShouldBeTheAnswer2 = {
    "rows": [
      {"id": "dragon.doc", "key": "dragon.doc", "value": {}, "doc": o.all1 },
      {"id": "timemachine", "key": "timemachine", "value": {}, "doc": o.all2 },
      {"id": "rocket.ppt", "key": "rocket.ppt", "value": {}, "doc": o.all3 },
      {"id": "stick.jpg", "key": "stick.jpg", "value": {}, "doc": o.all4 }
    ],
    "total_rows": 4
  }
  o.spy(o, "value", o.thisShouldBeTheAnswer2, "allDocs (include_docs)");
  o.jio.allDocs({"include_docs":true}, o.f);
  o.tick(o);

  o.jio.stop();
});

test ("AllDocs Complex Queries", function () {

  var o = generateTools(this), i, m = 15;

    o.jio = JIO.newJio({
      "type": "indexed",
      "indices": [
          {"name":"indexA", "fields":["director"]},
          {"name":"indexAB", "fields":["title","year"]}
          //,
          //{"name":"indexABC", "fields":["title","year","director"]}
      ],
      "field_types": {
        "director": "string",
        "title": "string",
        "year": "number"
      },
      "sub_storage": {
        "type": "local",
        "username": "icomplex",
        "application_name": "acomplex"
      }
    });
    o.localpath = "jio/localstorage/icomplex/acomplex";

    // sample data
    o.titles = ["Shawshank Redemption", "Godfather", "Godfather 2",
      "Pulp Fiction", "The Good, The Bad and The Ugly", "12 Angry Men",
      "The Dark Knight", "Schindlers List",
      "Lord of the Rings - Return of the King", "Fight Club",
      "Star Wars Episode V", "Lord Of the Rings - Fellowship of the Ring",
      "One flew over the Cuckoo's Nest", "Inception", "Godfellas"
    ];
    o.years = [1994,1972,1974,1994,1966,1957,2008,1993,2003,1999,1980,2001,
      1975,2010,1990
    ];
    o.director = ["Frank Darabont", "Francis Ford Coppola",
      "Francis Ford Coppola", "Quentin Tarantino", "Sergio Leone",
      "Sidney Lumet", "Christopher Nolan", "Steven Spielberg",
      "Peter Jackson", "David Fincher", "Irvin Kershner", "Peter Jackson",
      "Milos Forman", "Christopher Nolan", " Martin Scorsese"
    ]

    for (i = 0; i < m; i += 1) {
      o.fakeDoc = {};
      o.fakeDoc._id = ""+i;
      o.fakeDoc.title = o.titles[i];
      o.fakeDoc.year = o.years[i];
      o.fakeDoc.director = o.director[i];
      o.jio.put(o.fakeDoc);
      o.clock.tick(1000);
    }

    // response
    o.allDocsResponse = {};
    o.allDocsResponse.rows = [];
    o.allDocsResponse.total_rows = 15;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse.rows.push({
        "id": ""+i,
        "key": ""+i,
        "value": {}
      });
    };

    // alldocs
    o.jio.allDocs(function (e, r) {
      var x = r.rows.sort(o.sortArrayById('id', true, parseInt));
      deepEqual(
        {"total_rows":r.total_rows,"rows":x}, o.allDocsResponse,
          "AllDocs response generated from index"
      );
    });
    o.clock.tick(1000);

    // include docs
    o.allDocsResponse2 = {};
    o.allDocsResponse2.rows = [];
    o.allDocsResponse2.total_rows = 15;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse2.rows.push({
        "id": ""+i,
        "key": ""+i,
        "value": {},
        "doc": localstorage.getItem(o.localpath+"/"+i)
      });
    };

    // alldocs
    o.jio.allDocs({"include_docs":true}, function(e,r) {
      var x = r.rows.sort(o.sortArrayById('id', true, parseInt));
      deepEqual(
        {"total_rows":r.total_rows,"rows":x}, o.allDocsResponse2,
          "AllDocs response generated from index (include docs)"
      );
    });
    o.clock.tick(1000);

    // complex queries
    o.thisShouldBeTheAnswer4 = [
        {"title": "Inception", "year": 2010},
        {"title": "The Dark Knight", "year": 2008},
        {"title": "Lord of the Rings - Return of the King", "year": 2003},
        {"title": "Lord Of the Rings - Fellowship of the Ring", "year": 2001},
        {"title": "Fight Club", "year": 1999}
    ];
    o.spy(o, "value", o.thisShouldBeTheAnswer4,
      "allDocs (complex queries year >= 1980, index used to do query)");
    o.jio.allDocs({
      "query":{
        // "query":'(year: >= "1980" AND year: < "2000")',
        "query":'(year: >= "1980")',
        "filter": {
            "limit":[0,5],
            "sort_on":[['year','descending']],
            "select_list":['title','year']
        },
        "wildcard_character":'%'
      }
    }, o.f);
    o.tick(o);

    // complex queries
    o.thisShouldBeTheAnswer5 = [
        {"director": "Christopher Nolan", "year": 2010},
        {"director": "Christopher Nolan", "year": 2008},
        {"director": "Peter Jackson", "year": 2003},
        {"director": "Peter Jackson", "year": 2001},
        {"director": "David Fincher", "year": 1999}
    ];

    o.spy(o, "value", o.thisShouldBeTheAnswer5,
      "allDocs (complex queries year >= 1980, can't use index)");
    o.jio.allDocs({
      "query":{
        // "query":'(year: >= "1980" AND year: < "2000")',
        "query":'(year: >= "1980")',
        "filter": {
            "limit":[0,5],
            "sort_on":[['year','descending']],
            "select_list":['director','year']
        },
        "wildcard_character":'%'
      }
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
