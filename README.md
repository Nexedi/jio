# Javascript Input/Output

**jIO is a client-side JavaScript library to manage documents across multiple
  storages.**

## Getting Started

To set up jIO include jio.js, dependencies and the connectors for the storages
you want to use in your page header (note that more dependencies may be required
depending on type of storages being used):

    <!-- jio + dependency -->
    <script src="md5.js"></script>
    <script src="jio.js"></script>
    <!-- jio storage libraries -->
    <script src="localstorage.js">
    <script src="revisionstorage.js">
    <script ...>

Then create your jIO instance like this:

    // create a new jio (type = localStorage)
    var jio = jIO.newJio({
      "type": "local",
      "username": "your_username",
      "application_name": "your_application_name"
    });

## Documents and Methods

Documents are JSON strings that contain _meta-data_ (properties, like a filename)
and _attachments_ (optional content, for example a base64 encoded image).

jIO exposes the following methods to _create_, _read_, _update_ and _delete_ documents
(for more information, including revision management and available options for
each method, please refer to the documentation):

    // create and store new document
    jio.post({"title": "some title"}, function (err, response) {
      // console.log(response):
      // {"ok": "true", "id": "cabc9...826" }
    });

    // create or update an existing document
    jio.put({"_id": "my_document", "title": "New Title"}, function (err, response) {
    // console.log(response):
    // {"ok": "true", "id": "my_document"}
    });

    // add an attachement to a document
    jio.putAttachment({"_id": "my_document", "_attachment": "its_attachment",
                       "_data":"abc", "_mimetype": "text/plain"}, function (err, response) {
      // console.log(response):
      // {"ok":"true", "id": "my_document", "attachment": "its_attachment"}
    });

    // read a document
    jio.get({"_id": "my_document"}, function (err, response) {
      // console.log(response);
      // {
      //   "_id": "my_document",
      //   "title": "New Title",
      //   "_attachments": {
      //     "its_attachment": {
      //       "length": 3,
      //       "digest": "md5-e7248fce8990089e402b00f89dc8d14d",
      //       "content_type": "text/plain"
      //     }
      //   }
      // }
    });

    // read an attachement
    jio.getAttachment({"_id": "my_document", "_attachment": "its_attachment"}, function (err, response) {
      // console.log(response);
      // "<Base64 Image>"
    });

    // delete a document and its attachment(s)
    jio.remove({"_id": "my_document"}, function (err, response) {
      // console.log(response):
      // {"ok": "true", "id": "my_document"}
    });

    // delete an attachement
    jio.removeAttachment({"_id": "my_document", "_attachment": "its_attachment"}, function (err, response) {
      // console.log(response):
      // {"ok": true, "id": "my_document", "attachment": "its_attachment"}
    });

    // get all documents
    jio.allDocs(function (err, response){
      // console.log(response):
      // {
      //   "total_rows": 1,
      //   "rows": [{
      //     "id": "my_document",
      //     "key": "my_document",
      //     "value": {}
      //   }]
      // }
    });

## Example

This is an example of how to store a video file with one attachment in local
storage . Note that attachments should best be added inside one of the available
document callback methods (success & error or callback)

    // create a new localStorage
    var jio = JIO.newJio({
    "type":"local",
      "username":"user",
      "application_name":"app"
    });
    // post the document
    jio.post({
      "_id"         : "myVideo",
      "title"       : "My Video",
      "videoCodec"  : "vorbis",
      "language"    : "en",
      "description" : "Images Compilation"
    }, function (err, response) {
      if (err) {
        alert('Error when posting the document description');
      } else {
        // if successful, add video attachment (base64 encoded)
        jio.putAttachment({
          "_id": "myVideo/video",
          "_data": Base64(my_video),
          "_mimetype":"video/ogg"
        }, function (err, response) {
          if (err) {
            alert('Error when attaching the video');
          } else {
            alert('Video Stored');
          }
        });
      }
    });

## Storage Locations

jIO allows to build "storage trees" consisting of connectors to multiple
storages (webDav, xWiki, S3, localStorage) and use type-storages to add features
like revision management or indices to a child storage (sub_storage).

The following storages are currently supported:

DummyStorage (custom storage prototype)

      // initialize a dummy storage
      var jio = JIO.newJio({
        "type": <string>
      });

LocalStorage (browser local storage)

    // initialize a local storage
    var jio = JIO.newJio({
      "type" : "local",
      "username" : <string>,
      "application_name" : <string>
    });

DAVStorage (connect to webDAV)

    // initialize a webDAV storage
    var jio = JIO.newJio({
      "type" : "dav",
      "username" : <string>,
      "password" : <string>,
      "url" : <string>
    });

xWiki storage (connect to xWiki)

    // initialize a connection to xWiki storage
    coming soon

S3 storage (connect to S3)

    // initialize a connection to S3 storage
    coming soon

IndexStorage (maintains indices of documents in a substorage)

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
      // pass the field type into the index
      "field_types": {
        <string A>: "string",
        <string B>: "number"
      }
    });

CryptStorage (encrypt/decrypt substorage files)

    // initialize a cryptStorage (to encrypt data on a storage)
    coming soon

Revision Storage (add revision management to a substorage)

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

Replicate Revision Storage (replicate documents across multiple storages)

    // initialize a replicate revision storage (with local and webDAV as substorages)
    var jio = JIO.newJio({
      "type": "replicaterevision",
      "storage_list": [{
        "type": "revision",
        "sub_storage": {
          "type": "local",
          "username": <string>,
          "application_name": <string>
        }
      }, {
        "type": "revision",
        "sub_storage": {
          "type" : "dav",
          "username" : <string>,
          "password" : <string>,
          "url" : <string>
        }
      }]
    });

For more information on the specific storages including guidelines on how to create your own connector, please also refer to the documentation.

## Complex Queries

jIO includes a complex-queries manager, which can be run on top of the allDocs()
method to query documents in the storage tree. A sample query would look like
this (note, that allDocs and complex queries cannot be run on every storage and
that pre-querying of documents on distant storages should best be done
server-side):

    // run allDocs with query option on an existing jIO
    jio.allDocs({
      "query":{
        "query": '(fieldX: >= <string> AND fieldY: < <string>)',
        "filter": {
          // records to display ("from to")
          "limit": [0, 5],
          // sort by
          "sort_on": [[<string A>, 'descending']],
          // fields to return in response
          "select_list": [<string A>, <string B>]
        },
        "wildcard_character": '%'
      }
    }, function (err, response) {
      // console.log(response):
      // [{
      //   "id": <string>,
      //   <string A>: <string>,
      //   <string B>: <string>
      // }]
    });

To find out more about complex queries, please refer to the documentation

### Task Management

jIO is running a task queue manager in the background which processes incoming
tasks according to set of defined rules. To find out more and including how to
define your own execution rules, please refer to the
[documentation](https://www.j-io.org/documentation).

### Conflict Management

As jIO allows to manage and share documents across multiple storage locactions
it is likely for conflicts to occur (= multiple versions of a single document
existing in the storage tree). jIO manages conflicts by ensuring that every
version of a document is available on every storage and that conflicts are
accessible (and solvable) using the `conflicts: true` option when using the
respective jIO methods. For more info on conflicts and available options, please
refer to the documentation.

### Crash-Proof

All tasks are managed inside the browser local storage so no data is lost, as
the task manager queue will persist through browser crashes and continues to run
when the page is reloaded after a browser crash.

### Authors

- Francois Billioud
- Tristan Cavelier
- Sven Franck

### Copyright and license

jIO is an open-source library and is licensed under the LGPL license. More
information on LGPL can be found
[here](http://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License).
