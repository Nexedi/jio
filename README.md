Javascript Input/Output
=======================
Powerful, Intelligent, and Intuitive back-end to write over the internet
========================================================================

How easy is it to get, save or remove a document?
-------------------------------------------------

```
// get 'document.txt'
jio.get('document.txt',function (err, val) {
    console.log (err || val.content);
});

// update 'document.txt'
jio.put({_id:'document.txt',content:'newcontent'}, function (err, val) {
    console.log (err || val);
});

// get a list of documents
jio.allDocs(function (err, val) {
    console.log (err || val.total_rows);
});

// remove 'document.txt'
jio.remove ({_id:'document.txt'}, function (err, val) {
    console.log (err || val);
});
```

Documentation Index
===================

+ [What is jIO?](#what-is-jio)
+ [How does it work?](#how-does-it-work)
+ [Getting started](#getting-started)
+ [Where can I store documents?](#where-can-i-store-documents)

[**For developers**](#for-developers)
+ [Quick start](#quick-start)
+ [How to design your own jIO Storage Library](#how-to-design-your-own-jio-storage-library)
+ [Error status](#error-status)
+ [Job rules](#job-rules)
+ [Code sample](#code-sample)

[**Authors**](#authors)

[**Copyright and license**](#copyright-and-license)

What is jIO?
------------

jIO is a JavaScript Library that stores/manipulates documents on storage servers over the internet in an asynchronous fashion.

How does it work?
-----------------

jIO is separated in 2 parts, core library and storage library(ies). The core must use some javascript objects (storages) to interact with the associated remote storage servers. jIO uses job management, so every request adds jobs in a queue which is saved on browser local storage in order to be restored later if the browser crashed or else. jIO will invoke all these jobs at the same time. Of course, adding an already ongoing job won't work, so there will be no conflicts.

Getting started
---------------

This short tutorial is designed to help you get started using jIO. First, download the jIO core and the jIO storages scripts (git clone http://git.erp5.org/repos/jio.git) and their dependencies ([LocalOrCookieStorage](http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/localorcookiestorage.js), [jQuery](http://jquery.com), [base64](http://www.webtoolkit.info/javascript-base64.html), [sjcl](http://crypto.stanford.edu/sjcl/), [sha2](http://anmar.eu.org/projects/jssha2/)). Then, add the scripts in your HTML page as following:

```
<!-- jIO Core -->
<script src="localorcookiestorage.js"></script>
<script src="jio.js"></script>
<!-- Some storage dependencies -->
<script src="jquery.js"></script>
<script src="base64.js"></script>
<script src="sjcl.js"></script>
<script src="sha2.js"></script>
<!-- Some storage -->
<script src="jio.storage.js"></script>
```

+ jquery.js - see http://jquery.com
+ localorcookiestorage.js - is a small library that stores persistent data on local storage even if the browser does not support HTML 5.
+ base64.js - is a small library to encrypt data into base64.
+ sjcl.js - is a powerful library to encrypt/decrypt data.
+ sha2.js - is a small library to hash data.
+ jio.js - is the jIO core.
+ jio.storage.js - is a jIO Storage library that can interact with some remote storage servers.

The jIO API provides 5 main methods:
+ `post` - Creates a new file in the storage
+ `get` - Reads a file from the storage.
+ `put` -  Updates a file in the storage.
+ `remove` - Deletes a file from the storage.
+ `allDocs` - Gets a list of existant files.

```
var my_jio_instance = jIO.newJio(storagedescription);
my_jio_instance.post (doc[, options][, callback|, success, error]);
my_jio_instance.get (docid[, options][, callback|, success, error]);
my_jio_instance.put (doc[, options][, callback|, success, error]);
my_jio_instance.remove (doc[, options][, callback|, success, error]);
my_jio_instance.allDocs ([options][, callback|, success, error]);
my_jio_instance.stop(); // stops momentarily the job manager
my_jio_instance.start(); // restart the job manager
my_jio_instance.close(); // close this instance
```

Examples:
```
var jio = jIO.newJio({"type":"local","username":"myname","applicationname":"myappname"});
jio.get ('myfile',{max_retry:3},function (err,val) {
    if (err) {
        console.error (err);
    } else {
        console.log (val.content);
    }
});
jio.put ({_id:'myotherfile',content:'and his content'},function (val) {
    console.log ('success');
},function (err) {
    console.error (err);
});
```


Where can I store documents?
----------------------------

These are the available storage descriptions provided by jio.storage.js:
- LocalStorage, to manipulate files on browser local storage.
`{"type":"local","username":<string>,"applicationname":<string>}`
- DAVStorage, to manipulate files on a webDAV storage server.
`{"type":"dav","username":<string>,"password":<string>,"applicationname":<string>}`
- ReplicateStorage, to manipulate files on several storage.
`{"type":"replicate","storagelist":[<storagedescription>, ...]}`
- IndexStorage, to index sub storage files.
`{"type":"index","storage":<storagedescription>}`
- CryptStorage, to encrypt/decrypt sub storage files.
`{"type":"crypt","username":<string>,"password":<string>,"storage":<storagedescription>}`
- ConflictManagerStorage, to manage sub storage files revision and conflicts.
`{"type":"conflictmanager","storage":<storagedescription>}`


For developers
==============

Quick start
-----------

+ **Clone repository** `git clone http://git.erp5.org/repos/jio.git`. Sources are there: `${repo}/src/`.

+ **Build** - Go to `${repo}/grunt/`, and you can execute the script `gruntall` or build everycomponent manually with `make`.

+ **Dependencies** - [Grunt](https://github.com/cowboy/grunt) - [JSHint](https://github.com/jshint/jshint) - [UglifyJS](https://github.com/mishoo/UglifyJS) - [PhantomJS](http://phantomjs.org)

+ **Tests** - Go to `${repo}/tests/`, and you can open `jiotests_withoutrequirejs.html` from localhost. (Tests with requireJS are not available yet.)

How to design your own jIO Storage Library
-----------------------------------------

jIO basicStorage interface must be inherited by all the new storages. Seven methods must be redesigned: `post, get, put, remove, allDocs, serialized, validateState`

Except 'serialized' and 'validateState', the above methods must end with 'success','retry' or 'error' inherited methods, which can have only one parameter.
This parameter is the job return value, it is very important.
The return value must seams like PouchDB return values.
```
var val = {
    ok:         <often true>,                  // true
    id:         <the file path>                // 'file.js'
    // You can add your own return values
};
success(val);
var err = {
    status:     <often http error status>,     // 404
    statusText: <often http error statusText>, // 'Not Found'
    error:      <the error name>,              // 'not_found'
    reason:     <short description>,           // 'file not found'
    message:    <description>                  // 'Cannot retreive file.....'
    // You can add your own error values
};
error or retry(err);
```

The method 'serialized' is used by jIO to store a serialized version of the storage inside the localStorage in order to be restored by jIO later.

```
var super_serialized = that.serialized;
serialized = function () {
    var o = super_serialized();
    o.important_info1 = '...';
    o.important_info2 = '...';
    return o;
};
```
When jIO try to restore this storage, 'important_info1' and 2 will be given in the storage spec.
**CAUTION**: Don't store confidential informations like passwords!

The method 'validateState' is used by jIO to validate the storage state. For example, if the storage specifications are not correct, this method must return a non-empty string. If all is ok, it must return an empty string.

```
validate = function () {
    if (spec.important_info1) {
        return '';
    }
    return 'Where is my important information ??';
};
```

The storage created, you must add the storage type to jIO.
jIO.addStorageType() require two parameters: the storage type (string) add a constructor (function). `jIO.addStorageType('mystoragetype', myConstructor);`

To see what this can look like, see [Code sample](#code-sample).

Error status
------------

* 0: Unknown Error
* >9 & <20: Job Errors
* 10: Stopped, The Job has been stopped by adding another one
* 11: Not Accepted, The added Job cannot be accepted
* 12: Replaced, The Job has been replaced by another one
* >19 & <30: Command Errors
* 20: Id Required, The Command needs a document id
* 21: Content Required, The Command needs a document content
* >29: Storage Errors
* >99: HTTP Errors

Job rules
---------

jIO job manager will follow several rules set at the creation of a new jIO instance. When you try to do a command, jIO will create a job and will make sure the job is really necessary. Thanks to job rules, jIO knows what to do with the new job before adding it to the queue.

You can add your own rules like this:
```
var jio = jIO.newJio(<storagedescription>);
var jio_rules = jio.getJobRules();

// When a 'put' job is on going (true), and we add a 'get' job,
// then the 'get' job must wait for the end of the 'put' job.
jio_rules.addActionRule('put', true /* on going */, 'get', jio_rules.wait);
```

+ `wait` - wait until the end of the current job
+ `update` - replace the current job by this one
+ `eliminate` - eliminate the current job, and add the new one
+ `dontAccept` - the new job cannot be accepted
+ `none` - simply add the new job to the job queue

You can make special rules like this:
```
var putput = function(job1,job2){
    if (job1.getCommand().getDocInfo('content') ===
        job2.getCommand().getDocInfo('content')) {
        return jio_rules.dontAccept();
    } else {
        return jio_rules.wait();
    }
};
jio_rules.addActionRule('put', true, 'put', putput);
```

**Default rules**:
```
var putput = function(job1,job2){
    if (job1.getCommand().getDocInfo('content') ===
        job2.getCommand().getDocInfo('content')) {
        return jio_rules.dontAccept();
    } else {
        return jio_rules.wait();
    }
};
jio_rules.addActionRule('post',true ,'post',  putput);
jio_rules.addActionRule('post',true ,'put',   putput);
jio_rules.addActionRule('post',true ,'get',   jio_rules.wait);
jio_rules.addActionRule('post',true ,'remove',jio_rules.wait);
jio_rules.addActionRule('post',false,'post',  jio_rules.update);
jio_rules.addActionRule('post',false,'put',   jio_rules.update);
jio_rules.addActionRule('post',false,'get',   jio_rules.wait);
jio_rules.addActionRule('post',false,'remove',jio_rules.eliminate);

jio_rules.addActionRule('put',true ,'post',  putput);
jio_rules.addActionRule('put',true ,'put',   putput);
jio_rules.addActionRule('put',true ,'get',   jio_rules.wait);
jio_rules.addActionRule('put',true ,'remove',jio_rules.wait);
jio_rules.addActionRule('put',false,'post',  jio_rules.update);
jio_rules.addActionRule('put',false,'put',   jio_rules.update);
jio_rules.addActionRule('put',false,'get',   jio_rules.wait);
jio_rules.addActionRule('put',false,'remove',jio_rules.eliminate);

jio_rules.addActionRule('get',true ,'post',  jio_rules.wait);
jio_rules.addActionRule('get',true ,'put',   jio_rules.wait);
jio_rules.addActionRule('get',true ,'get',   jio_rules.dontAccept);
jio_rules.addActionRule('get',true ,'remove',jio_rules.wait);
jio_rules.addActionRule('get',false,'post',  jio_rules.wait);
jio_rules.addActionRule('get',false,'put',   jio_rules.wait);
jio_rules.addActionRule('get',false,'get',   jio_rules.update);
jio_rules.addActionRule('get',false,'remove',jio_rules.wait);

jio_rules.addActionRule('remove',true ,'get',   jio_rules.dontAccept);
jio_rules.addActionRule('remove',true ,'remove',jio_rules.dontAccept);
jio_rules.addActionRule('remove',false,'post',  jio_rules.eliminate);
jio_rules.addActionRule('remove',false,'put',   jio_rules.eliminate);
jio_rules.addActionRule('remove',false,'get',   jio_rules.dontAccept);
jio_rules.addActionRule('remove',false,'remove',jio_rules.update);

jio_rules.addActionRule('allDocs',true ,'allDocs',jio_rules.dontAccept);
jio_rules.addActionRule('allDocs',false,'allDocs',jio_rules.update);
```

Code sample
-----------

Storage example:
```
(function () {
    var newLittleStorage = function ( spec, my ) {
        var that = my.basicStorage ( spec, my );

        var super_serialized = that.serialized;
        that.serialized = function () {
            var o = super_serialized();
            o.firstname = spec.firstname;
            o.lastname = spec.lastname;
            return o;
        };

        that.validateState = function () {
            if (spec.firstname && spec.lastname) {
                return '';
            }
            return 'This storage needs your firstname and your lastname.';
        };

        that.post = function (command) {
            // [code]
            that.success({ok:true,id:command.getDocId()});
        };

        that.put = function (command) {
            // [code]
            that.success({ok:true,id:command.getDocId()});
        };

        that.get = function (command) {
            // example with jQuery
            jQuery.ajax ( {
                url: 'www.google.com',
                type: "GET",
                async: true,
                success: function (content) {
                    that.success({
                        _id:command.getDocId(),content:content,
                        _last_modified:123,_creation_date:12
                    });
                },
                error: function (type) {
                    type.reason = 'error occured';
                    type.message = type.reason + '.';
                    type.error = type.statusText;
                    that.error(type);
                }
            } );
        };

        that.allDocs = function (command) {
            // [code]
            if (!can_I_reach_the_internet) {
                // Oh, I can't reach the internet...
                that.retry({
                    status:0,error:'unknown_error',
                    statusText:'Unknown Error',
                    reason:'network_not_reachable',
                    message:'Impossible to reach the internet.'
                });
            } else {
                // Oh, I can't retreive any files..
                that.error({
                    status:403,error:'forbidden',
                    statusText:'Forbidden',
                    reason:'unable to get all docs',
                    message:'This storage is not able to retreive anything.'
                });
            }
        };

        that.remove = function (command) {
            // [code]
            that.success({ok:true,id:command.getDocId()});
        };

        return that;
    };

    jIO.addStorageType ('little', newLittleStorage);
}());
```

Authors
=======

+ Francois Billioud
+ Tristan Cavelier

Copyright and license
=====================
