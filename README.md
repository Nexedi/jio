## Javascript Input/Output

**jIO is a client-side JavaScript library to manage documents across multiple
  storages.**

### Getting Started

To set up jIO include jio.js, dependencies and the connectors for the storages
you want to use in your page header (note that more dependencies may be required
depending on type of storages being used):

    <!-- jio + dependency -->
    <script src="sha256.amd.js"></script>
    <script src="rsvp-custom.js"></script>
    <script src="jio.js"></script>

    <!-- jio storage libraries -->
    <script src="complex-queries.js"></script>
    <script src="localstorage.js"></script>

    <script ...>

Then create your jIO instance like this:

    // create a new jio (type = localStorage)
    var jio_instance = jIO.createJIO({
      "type": "local",
      "username": "your_username",
      "application_name": "your_application_name"
    });

### Documents and Methods

Documents are JSON strings that contain *meta-data* (properties, like a filename)
and *attachments* (optional content, for example *image.jpg*).

jIO exposes the following methods to *create*, *read*, *update* and *delete* documents
(for more information, including revision management and available options for
each method, please refer to the documentation):

    // create and store new document
    jio_instance.post({"title": "some title"}).
      then(function (response) {
        // console.log(response):
        // {
        //   "result": "success",
        //   "id": "404aef5e-22cc-4a64-a292-37776c6464a3" // Generated id
        //   ...
        // }
      });

    // create or update an existing document
    jio_instance.put({"_id": "my_document", "title": "New Title"}).
      then(function (response) {
        // console.log(response):
        // {
        //   "result": "success",
        //   "id": "my_document",
        //   ...
        // }
      });

    // add an attachement to a document
    jio_instance.putAttachment({"_id": "my_document", "_attachment": "its_attachment",
                                "_data": "abc", "_mimetype": "text/plain"}).
      then(function (response) {
        // console.log(response):
        // {
        //   "result": "success",
        //   "id": "my_document",
        //   "attachment": "its_attachment"
        //   ...
        // }
      });

    // read a document
    jio_instance.get({"_id": "my_document"}).
      then(function (response) {
        // console.log(response);
        // {
        //   "data": {
        //     "_id": "my_document",
        //     "title": "New Title",
        //     "_attachments": {
        //       "its_attachment": {
        //         "length": 3,
        //         "digest": "sha256-ba7816bf8f1cfea414140de5dae2223b0361a396177a9cb410ff61f2015ad",
        //         "content_type": "text/plain"
        //       }
        //     }
        //   },
        //   ...
        // }
      });

    // read an attachement
    jio_instance.getAttachment({"_id": "my_document", "_attachment": "its_attachment"}).
      then(function (response) {
        // console.log(response);
        // {
        //   "data": Blob, // contains the attachment data + content type
        //   ...
        // }
      });

    // delete a document and its attachment(s)
    jio_instance.remove({"_id": "my_document"}).
      then(function (response) {
        // console.log(response):
        // {
        //   "result": "success",
        //   "id": "my_document"
        // }
      });

    // delete an attachement
    jio_instance.removeAttachment({"_id": "my_document", "_attachment": "its_attachment"}).
      then(function (response) {
        // console.log(response):
        // {
        //   "result": "success",
        //   "id": "my_document",
        //   "attachment": "its_attachment"
        // }
      });

    // get all documents
    jio_instance.allDocs().then(function (response) {
      // console.log(response):
      // {
      //   "data": {
      //     "total_rows": 1,
      //     "rows": [{
      //       "id": "my_document",
      //       "value": {}
      //     }]
      //   }
      // }
    });


### Example

This is an example of how to store a video file with one attachment in local
storage. Note that attachments should be added after document creation.

    // create a new localStorage
    var jio_instance = jIO.createJIO({
      "type": "local",
      "username": "user",
      "application_name": "app"
    });

    var my_video_blob = new Blob([my_video_binary_string], {
      "type": "video/ogg"
    });

    // post the document
    jio_instance.post({
      "_id"         : "myVideo",
      "title"       : "My Video",
      "format"      : ["video/ogg", "vorbis", "HD"],
      "language"    : "en",
      "description" : "Images Compilation"
    }).then(function (response) {

      // add video attachment
      return jio_instance.putAttachment({
        "_id": "myVideo",
        "_attachment": "video.ogv",
        "_data": my_video_blob,
      });

    }).then(function (response) {

      alert('Video Stored');

    }, function (err) {

      if (err.method === "post") {
        alert('Error when posting the document description');
      } else {
        alert('Error when attaching the video');
      }

    }, function (progression) {

      console.log(progression);

    });

### Storage Locations

jIO allows to build "storage trees" consisting of connectors to multiple
storages (webDav, xWiki, S3, localStorage) and use type-storages to add features
like revision management or indices to a child storage (sub_storage).

The following storages are currently supported:

- LocalStorage (browser local storage)

        // initialize a local storage
        var jio_instance = jIO.createJIO({
          "type" : "local",
          "username" : "me"
        });

- DAVStorage (connect to webDAV, more information on the
  [documentation](https://www.j-io.org/documentation/jio-documentation/))

        // initialize a webDAV storage (without authentication)
        var jio_instance = jIO.createJIO({
          "type": "dav",
          "url": "http://my.dav.srv/uploads"
        });

<!-- - xWiki storage (connect to xWiki) -->

<!--         // initialize a connection to xWiki -->
<!--         var jio_instance = jIO.createJIO({ -->
<!--           "type": "xwiki", -->
<!--           "xwikiurl": "http://my.site.com/xwiki", -->
<!--           "username": "me", -->
<!--           "password": "pwd" -->
<!--         }); -->

<!-- - S3 storage (connect to S3) -->

<!--         // initialize a connection to S3 storage -->
<!--         var jio_instance = jIO.createJIO({ -->
<!--           "type": "s3", -->
<!--           "AWSIdentifier": "AWS Identifier ID", -->
<!--           "password": "AWS Secret key", -->
<!--           "server": "Destination bucket" -->
<!--         }); -->

<!-- - IndexStorage (maintains indices of documents in a substorage) -->

<!--         // initialize an indexStorage (for a local storage) -->
<!--         var jio_instance = jIO.createJIO({ -->
<!--           "type": "indexed", -->
<!--           "sub_storage": { -->
<!--             "type": "local" // for instance -->
<!--             "username": "me" -->
<!--           }, -->
<!--           "indices": [{ -->
<!--             "id": "index_database.json", -->
<!--             "index": ["title", "author", "subject", "posted_date"] -->
<!--           }] -->
<!--         }); -->

<!-- - SplitStorage (simply split data into several parts): -->

<!--         // initialize a splitStorage -->
<!--         var jio_instance = jIO.createJIO({ -->
<!--           "type": "split", -->
<!--           "storage_list": [<storage description>, ...] -->
<!--         }); -->

<!-- - Revision Storage (add revision management to a substorage) -->

<!--         // initialize a revison storage on a local storage -->
<!--         // (revision-format 1-9ccd039de0674d935f3c6bae61afc9b7038d1df97d586507aa62336a02f9ee2a) -->
<!--         var jio_instance = jIO.createJIO({ -->
<!--           "type": "revision", -->
<!--           "sub_storage": { -->
<!--             "type": "local", -->
<!--             "username": "me" -->
<!--           } -->
<!--         }); -->

<!-- - Replicate Revision Storage (replicate documents across multiple storages) -->

<!--         // initialize a replicate revision storage (with local and webDAV as substorages) -->
<!--         var jio_instance = jIO.createJIO({ -->
<!--           "type": "replicaterevision", -->
<!--           "storage_list": [{ -->
<!--             "type": "revision", -->
<!--             "sub_storage": { -->
<!--               "type": "local", -->
<!--               "username": "me" -->
<!--             } -->
<!--            }, { -->
<!--             "type": "revision", -->
<!--             "sub_storage": { -->
<!--               "type" : "dav", -->
<!--               "auth_type": "basic", -->
<!--               "username" : "me", -->
<!--               "password" : "pwd", -->
<!--               "url" : "http://my.dav.srv/uploads" -->
<!--             } -->
<!--           }] -->
<!--         }); -->

- [And more!](https://www.j-io.org/documentation/jio-documentation#List of Available Storages)

For more information on the specific storages including guidelines on how to
create your own connector, please also refer to the [documentation](https://www.j-io.org/documentation/jio-documentation).

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
    }).then(function (response) {
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
information on LGPL can be found
[here](http://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License).
