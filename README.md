jIO - Javascript Input/Output
=======================
A client-side library to manage documents across local and cloud storages.
====================================================================

Getting Started  
-------------------------------------------------  
To set up jIO, include the source file, dependencies and connectors for the storages you plan to use in your page header (dependencies vary depending on the types of storages being used):    
```
<!-- jio core-->
<script src="jio.js"></script>
<!-- jio dependencies-->
<script src="md5.js"></script>
<!-- jio storage connectors -->
<script src="localstorage.js">
<script ...>
<!-- jio complex queries -->
<script src="jio.complex_queries.js"></script>
```
Then create your jIO instance like this:
```
var jio = jIO.newJio({
  "type": "local",
  "username": "your_username",
  "application_name": "your_application_name"
});
```

Documents and Methods
-------------------------------------------------
Documents are JSON strings that contain  <em><u>meta-data</u></em>
(properties, e.g. filename) and <em><u>attachments</u></em> (optional content, e.g. a base64-encoded image).

jIO exposes the following methods to <em><u>create</u></em>,
<em><u>read</u></em>, <em><u>update</u></em> and <em><u>delete</u></em> documents:

```
// create and store new document
jio.post({"title":"some title"}, function (err, response) {
  // console.log(response):
  // {"ok":"true", "id":"cabc9...826" }
});

// create or update an existing document
jio.put({"_id":"demoID", "title":"new title"}, function (err, response) {
  // console.log(response):
  // {"ok":"true", "id":"demoID" }
});

// add an attachement to a document (Note: no underscore on id!)
jio.putAttachment({"id":"demoID/myImg", "data":"abc"}, function(err, response){
  // console.log(response):
  // {"ok":"true", "id":"demoID/myImg"}
});

// read a document or an attachement
jio.get("demoID/myImg", function (err, response) {
  // console.log(response):
  // {"data":"abc"}
});

// delete a document or an attachment
jio.remove({"_id":"demoID"}, function (err, response) {
  // console.log(response):
  // {"ok":"true", "id":"demoID"}
});

// get all documents
jio.allDocs(function(err, response){
  // console.log(response):
  // {
  //   "total-rows":1,
  //   "rows":[{
  //     "_id":"demoID",
  //     "title";"new text",
  //     "_attachments":{
  //       "myImg": {
  //         "digest":"md5-nN...",
  //         "data":"abc",
  //         "length":6
  //       }
  //     }
  //   }]
  // }
});
```
For more information on the methods and additional options (e.g. revision management, please refer to the documentation).

Example
-------------------------------------------------
This is an example of how to store a video file with an attachment in
local storage. Note that attachments should best be added inside one of the available document callback methods (success & error or callback).
```
// create a new localStorage
var jio = JIO.newJio({
  "type":"local",
  "username":"user",
  "application_name":"app"
});
// post the document
jio.post(
  {
    "_id"         : "myVideo",
    "title"       : "My Video",
    "videoCodec"  : "vorbis",
    "language"    : "en",
    "description" : "Images Compilation"
  },
  function (err, response) {
    if (err) {
      alert('Error when posting the document description');
    } else {
      // if successful, add video attachment (base64 encoded)
      jio.putAttachment(
        {
          "id": "myVideo/video",
          "data": Base64(my_video),
          "mimetype":"video/ogg"
        },
        function (err, response) {
          if (err) {
            alert('Error when attaching the video');
          } else {
            alert('Video Stored');
          }
        }
      );
    }
  }
);
```
Storage Locations
-------------------------------------------------
jIO allows to build &quot;storage trees&quot; consisting of connectors to multiple storages (webDav, xWiki, S3, localStorage) and use storage handlers to add features like revision management or indices to a child storage (sub_storage).  

The following storages are currently supported:  

**DummyStorage (custom storage prototype)**
```
// initialize a dummy storage
var jio = JIO.newJio({
  "type": <string>
});
```
**LocalStorage (browser local storage)**
```
// initialize a local storage
var jio = JIO.newJio({
  "type" : "local",
  "username" : <string>,
  "application_name" : <string>
});
```
**DAVStorage (connect to webDAV)**
```
// initialize a webDAV storage
var jio = JIO.newJio({
  "type" : "dav",
  "username" : <string>,
  "password" : <string>,
  "application_name" : <string>,
  "url" : <string>
});
```
**xWiki storage (connect to xWiki)**
```
// initialize a connection to xWiki storage
coming soon
```
**S3 storage (connect to S3)**
```
// initialize a connection to S3 storage
coming soon
```
**IndexStorage (maintains indices of documents in a substorage)**
```
// initialize an indexStorage (for a local storage)
var jio = JIO.newJio({
  "type": "indexed",
  "sub_storage": {
    "type": "local",
    "username": <string>,
    "application_name": <string>
  },
  // create two indices for the substorage with fields A and A,B
  "indices": [
        {"name":<string>, "fields":[<string A>]},
        {"name":<string>, "fields":[<string A>, <string B>]}
  ],
  // pass the field type into the index</span>
  "field_types": {
    <string A>: "string",
    <string B>: "number"
  }
});
```
**CryptStorage (encrypt/decrypt substorage files)**
```
// initialize a cryptStorage (to encrypt data on a storage)
coming soon
```
**Revision Storage (add revision management to a substorage)**
```
// initialize a revison storage on a local storage
// (revision-format 1-9ccd039de0674d935f3c6bae61afc9b7038d1df97d586507aa62336a02f9ee2a)
var jio = JIO.newJio({
  "type": "revision",
  "sub_storage": {
    "type": "local",
    "username": <string>,
    "application_name": <string>
  }
});
```
**Replicate Revision Storage (replicate documents across multiple storages)**
```
// initialize a replicate revision storage (with local, webDAV as substorages)
var jio = JIO.newJio({
  "type": "replicaterevision",
  "storage_list": [{
    "type": "revision",
    "sub_storage": {
      "type": "local",
      "username": <string>,
      "application_name": <string>
    }
  },{
    "type": "revision",
    "sub_storage": {
      "type" : "dav",
      "username" : <string>,
      "password" : <string>,
      "application_name" : <string>,
      "url" : <string>
    }
  }]
});
```
For more information on the specific storages including guidelines on how to create your own connector, please refer to the documentation.

Complex Queries
-------------------------------------------------
jIO includes a complex-queries manager, which can be run on top of the
<em>allDocs()</em> method to query documents in the storage tree. A
sample query would look like this (note, that <em>allDocs</em> and complex queries cannot be run on every storage and that pre-querying of documents on distant storages should best be done server-side):

```
// run allDocs with query option on an existing jIO
jio.allDocs({
  "query":{
      "query":'(fieldX: >= <string> AND fieldY: < <string>)',
      "filter": {
        // records to display ("from to")
        "limit":[0,5],
        // sort by
        "sort_on":[[<string A>,'descending']],
        // fields to return in response
        "select_list":[<string A>;,<string B>]
      },
      "wildcard_character":'%'
    }
  },function(err, response){
  // console.log(response):
  // [{
  //    "id": <string>,
  //    <string A>: <string>,
  //    <string B>: <string>
  //  }]
  }
});
```
Task Management
-------------------------------------------------
jIO is running a task queue manager in the background which processes
incoming tasks according to set of defined rules. To find out
more and including how to define your own execution rules, please refer to the documentation.

Conflict Management
-------------------------------------------------
As jIO allows to manage and share documents across multiple storage
locactions it is likely for conflicts to occur (= multiple versions of a single document existing in the storage tree). jIO manages conflicts by ensuring that every version of a document is available on every storage and that conflicts are accessible (and solvable) using the <em><u>conflicts:true</u></em> option when using the respective jIO methods. For more info on conflicts and available options, please refer to the documentation.

Crash-Proof
-------------------------------------------------
All tasks are managed inside the browser local storage so no data is lost, as the task manager queue will persist through browser crashes and continues to run when the page is reloaded after a browser crash.

Authors
-------------------------------------------------
+ Francois Billioud
+ Tristan Cavelier

Copyright and license
-------------------------------------------------
jIO is an open-source library and is licensed under the LGPL license. More information on LGPL can be found <a href="http://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License">here</a>.

Documentation
=============
You can find the full documentation here: [jIO Documentation](http://www.j-io.org/documentation).

For developers
==============
Quick start
-------------------------------------------------
To get started with jIO, clone one of the repositories on 
<a href="http://git.erp5.org/gitweb/jio.git">git.erp5.com</a>, 
<a href="https://github.com/nexedi/jio">Github</a> or 
<a href="https://gitorious.org/nexedi/jio">Gitorious</a>.

jIO uses a <a href="http://git.erp5.org/gitweb/jio.git/blob_plain/HEAD:/Makefile?js=1">makeFile</a> to build and compress the necessary files (jIO.js and complex-queries.js). To run the makeFile you will require the following:  

+ [NodeJS](http://nodejs.org/)(including NPM)
+ [JSLint](https://github.com/jslint/jslint)
+ [UglifyJS](https://github.com/mishoo/UglifyJS)
+ [Rhino](https://developer.mozilla.org/fr/docs/Rhino) (for compiling JSCC)  

The repository also includes the built ready-to-use files, so in case you do not want to build jIO yourself, just use <em>jio.min.js</em> as well as <em>complex-queries.min.js</em> plus the storages and dependencies you need and you will be good to go.

You can also check out the jIO QUnit tests (jiotests_withoutrequirejs.html) for an overview on how to create a page 
  [setup](http://git.erp5.org/gitweb/jio.git/blob/HEAD:/test/jiotests_withoutrequirejs.html?js=1) with required scripts as well as setting up jIO itself
  [setup](http://git.erp5.org/gitweb/jio.git/blob/HEAD:/test/jiotests.js?js=1). If you want to run the QUnit tests 
  locally after cloning the repo, please make sure you have the above minified files in your repository.
