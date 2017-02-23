## Javascript Input/Output

**jIO is a client-side JavaScript library to manage documents across multiple
  storages.**

### Getting Started

To set up jIO you should include jio.js, dependencies and the connectors for the storages
you want to use in the HTML page header (note that more dependencies may be required
depending on type of storages being used):

```html
<script src="RSVP.js"></script>
<script src="jio-latest.js"></script>
```

Then create your jIO instance like this:

```javascript
// create a new jio
var jio_instance = jIO.createJIO({
  type: "query",
  sub_storage: {
    type: "uuid",
    sub_storage: {
      "type": "indexeddb",
      "database": "test"
    }
  }
});
```

### Documents and Methods

Documents are JSON strings that contain *metadata* (properties, like a filename)
and *attachments* (optional content, for example *image.jpg*).

jIO exposes the following methods to *create*, *read*, *update* and *delete* documents
(for more information, including revision management and available options for
each method, please refer to the documentation):

```javascript
// create and store new document
jio_instance.post({"title": "some title"})
  .then(function (new_id) {
    ...
  });

// create or update an existing document
jio_instance.put(new_id, {"title": "New Title"})
  .then(function () 
    // console.log("Document stored");
  });

// add an attachement to a document
jio_instance.putAttachment(document_id, attachment_id, new Blob())
  .then(function () {
    // console.log("Blob stored");
  });

// read a document
jio_instance.get(document_id)
  .then(function (document) {
    // console.log(document);
    // {
    //   "title": "New Title",
    // }
  });

// read an attachement
jio_instance.getAttachment(document_id, attachment_id)
  .then(function (blob) {
    // console.log(blob);
  });

// delete a document and its attachment(s)
jio_instance.remove(document_id)
  .then(function () {
    // console.log("Document deleted");
  });

// delete an attachement
jio_instance.removeAttachment(document_id, attachment_id)
  .then(function () {
    // console.log("Attachment deleted");
  });

// get all documents
jio_instance.allDocs().then(function (response) {
  // console.log(response);
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
```


### Example

This is an example of how to store a video file with one attachment in local
storage. Note that attachments should be added after document creation.

```javascript
// create a new localStorage
var jio_instance = jIO.createJIO({
  "type": "local",
});

var my_video_blob = new Blob([my_video_binary_string], {
  "type": "video/ogg"
});

// post the document
jio_instance.put("myVideo", {
  "title"       : "My Video",
  "format"      : ["video/ogg", "vorbis", "HD"],
  "language"    : "en",
  "description" : "Images Compilation"
}).then(function (response) {

  // add video attachment
  return jio_instance.putAttachment(
    "myVideo",
    "video.ogv",
    my_video_blob
  });

}).then(function (response) {

  alert('Video Stored');

}, function (err) {

  alert('Error when attaching the video');

}, function (progression) {

  console.log(progression);

});
```

### Storage Locations

jIO allows to build "storage trees" consisting of connectors to multiple
storages (webDav, xWiki, S3, localStorage) and use type-storages to add features
like revision management or indices to a child storage (sub_storage).

The following storages are currently supported:

- LocalStorage (browser local storage)
- IndexedDB
- ERP5Storage
- DAVStorage (connect to webDAV, more information on the
  [documentation](https://www.j-io.org/documentation/jio-documentation/))

For more information on the specific storages including guidelines on how to
create your own connector, please also refer to the [documentation](https://www.j-io.org/documentation/jio-documentation).

### jIO Query

jIO can use queries, which can be run in the allDocs() method to query document
lists. A sample query would look like this (note that not all storages support
allDocs and jio queries, and that pre-querying of documents on distant storages
should best be done server-side):

```javascript
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
  // console.log(response);
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
```

To find out more about queries, please refer to the documentation.

### Authors

- Francois Billioud
- Tristan Cavelier
- Sven Franck
- Romain Courteaud

### Copyright and license

jIO is an open-source library and is licensed under the LGPL license. More
information on LGPL can be found
[here](http://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License).

### Contribute

Get development environment:


    git clone https://lab.nexedi.com/nexedi/jio.git jio.git
    cd jio.git
    npm install
    alias grunt="./node_modules/grunt-cli/bin/grunt"
    grunt


Run tests:


    grunt server


and open http://127.0.0.1:9000/test/tests.html

Submit merge requests on lab.nexedi.com.
