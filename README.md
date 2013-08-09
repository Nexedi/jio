## Javascript Input/Output

**jIO is a client-side JavaScript library to manage documents across multiple
  storages.**

<!-- \index-and-table 3 -->

### Getting Started

To set up jIO include jio.js, dependencies and the connectors for the storages
you want to use in your page header (note that more dependencies may be required
depending on type of storages being used):

    <!-- jio + dependency -->
    <script src="md5.js"></script>
    <script src="complex-queries.js"></script>
    <script src="jio.js"></script>
    <!-- jio storage libraries -->
    <script src="localstorage.js">
    <script src="revisionstorage.js">
    <script ...>

Then create your jIO instance like this:

    // create a new jio (type = localStorage)
    var jio_instance = jIO.newJio({
      "type": "local",
      "username": "your_username",
      "application_name": "your_application_name"
    });

### Documents and Methods

Documents are JSON strings that contain *meta-data* (properties, like a filename)
and *attachments* (optional content, for example a base64 encoded image).

jIO exposes the following methods to *create*, *read*, *update* and *delete* documents
(for more information, including revision management and available options for
each method, please refer to the documentation):

    // create and store new document
    jio_instance.post({"title": "some title"}, function (err, response) {
      // console.log(response):
      // {"ok": "true", "id": "cabc9...826" } // Generated id
    });

    // create or update an existing document
    jio_instance.put({"_id": "my_document", "title": "New Title"}, function (err, response) {
      // console.log(response):
      // {"ok": "true", "id": "my_document"}
    });

    // add an attachement to a document
    jio_instance.putAttachment({"_id": "my_document", "_attachment": "its_attachment",
                                "_data":"abc", "_mimetype": "text/plain"}, function (err, response) {
      // console.log(response):
      // {"ok":"true", "id": "my_document", "attachment": "its_attachment"}
    });

    // read a document
    jio_instance.get({"_id": "my_document"}, function (err, response) {
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
    jio_instance.getAttachment({"_id": "my_document", "_attachment": "its_attachment"}, function (err, response) {
      // console.log(response);
      // "<Base64 Image>"
    });

    // delete a document and its attachment(s)
    jio_instance.remove({"_id": "my_document"}, function (err, response) {
      // console.log(response):
      // {"ok": "true", "id": "my_document"}
    });

    // delete an attachement
    jio_instance.removeAttachment({"_id": "my_document", "_attachment": "its_attachment"}, function (err, response) {
      // console.log(response):
      // {"ok": true, "id": "my_document", "attachment": "its_attachment"}
    });

    // get all documents
    jio_instance.allDocs(function (err, response){
      // console.log(response):
      // {
      //   "total_rows": 1,
      //   "rows": [{
      //     "id": "my_document",
      //     "value": {}
      //   }]
      // }
    });


### Example

This is an example of how to store a video file with one attachment in local
storage . Note that attachments should best be added inside one of the available
document callback methods (success & error or callback)

    // create a new localStorage
    var jio_instance = jIO.newJio({
      "type":"local",
      "username":"user",
      "application_name":"app"
    });
    // post the document
    jio_instance.post({
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
        jio_instance.putAttachment({
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

### Storage Locations

jIO allows to build "storage trees" consisting of connectors to multiple
storages (webDav, xWiki, S3, localStorage) and use type-storages to add features
like revision management or indices to a child storage (sub_storage).

The following storages are currently supported:

- LocalStorage (browser local storage)

        // initialize a local storage
        var jio_instance = jIO.newJio({
          "type" : "local",
          "username" : "me"
        });

- DAVStorage (connect to webDAV)

        // initialize a webDAV storage
        var jio_instance = jIO.newJio({
          "type" : "dav",
          "url" : "http://my.dav.srv/uploads",
          "auth_type": "basic",
          "username" : "me",
          "password" : "pwd"
        });

- xWiki storage (connect to xWiki)

        // initialize a connection to xWiki
        var jio_instance = jIO.newJio({
          "type": "xwiki",
          "xwikiurl": "http://my.site.com/xwiki",
          "username": "me",
          "password": "pwd"
        });

- S3 storage (connect to S3)

        // initialize a connection to S3 storage
        var jio_instance = jIO.newJio({
          "type": "s3",
          "AWSIdentifier": "AWS Identifier ID",
          "password": "AWS Secret key",
          "server": "Destination bucket"
        });

- IndexStorage (maintains indices of documents in a substorage)

        // initialize an indexStorage (for a local storage)
        var jio_instance = jIO.newJio({
          "type": "indexed",
          "sub_storage": {
            "type": "local" // for instance
            "username": "me"
          },
          "indices": [{
            "id": "index_database.json",
            "index": ["title", "author", "subject", "posted_date"]
          }, {
            ...
          }]
        });

- SplitStorage (simply split data into several parts):

        // initialize a splitStorage
        var jio_instance = jIO.newJio({
          "type": "split",
          "storage_list": [<storage description>, ...]
        });

- Revision Storage (add revision management to a substorage)

        // initialize a revison storage on a local storage
        // (revision-format 1-9ccd039de0674d935f3c6bae61afc9b7038d1df97d586507aa62336a02f9ee2a)
        var jio_instance = jIO.newJio({
          "type": "revision",
          "sub_storage": {
            "type": "local",
            "username": "me"
          }
        });

- Replicate Revision Storage (replicate documents across multiple storages)

        // initialize a replicate revision storage (with local and webDAV as substorages)
        var jio_instance = jIO.newJio({
          "type": "replicaterevision",
          "storage_list": [{
            "type": "revision",
            "sub_storage": {
              "type": "local",
              "username": "me"
            }
           }, {
            "type": "revision",
            "sub_storage": {
              "type" : "dav",
              "auth_type": "basic",
              "username" : "me",
              "password" : "pwd",
              "url" : "http://my.dav.srv/uploads"
            }
          }]
        });

- And more!

For more information on the specific storages including guidelines on how to
create your own connector, please also refer to the documentation.

### Complex Queries

jIO uses complex-queries manager, which can be run on top of the allDocs()
method to query documents in the storage tree. A sample query would look like
this (note, that allDocs and complex queries cannot be run on every storage and
that pre-querying of documents on distant storages should best be done
server-side):

    // run allDocs with query option on an existing jIO
    jio_instance.allDocs({
      "query": '(fieldX: >= "string" AND fieldY: < "string")',
      // records to display ("from to")
      "limit": [0, 5],
      // sort by
      "sort_on": [[<string A>, 'descending']],
      // fields to return in response
      "select_list": [<string A>, <string B>]
    }, function (err, response) {
      // console.log(response):
      // {
      //   "total_rows": 1,
      //   "rows": [{
      //     "id": <string>,
      //     "value": {
      //       <string A>: <string>,
      //       <string B>: <string>
      //     }
      //   }, { .. }]
      // }
    });

To find out more about complex queries, please refer to the documentation

### Task Management

jIO is running a task queue manager in the background which processes incoming
tasks according to set of defined rules. To find out more and including how to
define your own execution rules, please refer to the documentation.

### Conflict Management

As jIO allows to manage and share documents across multiple storage locactions
it is likely for conflicts to occur (= multiple versions of a single document
existing in the storage tree). jIO manages conflicts by ensuring that every
version of a document is available on every storage and that conflicts are
accessible (and solvable) using the *conflicts: true* option when using the
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
information on LGPL can be found [here](http://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License).
