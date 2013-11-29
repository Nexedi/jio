How to manage documents?
========================

jIO is mapped after the CouchDB APIs and extends them to provide unified, scalable
and high performance access via JavaScript to a wide variety of storage backends.

If you are not familiar with `Apache CouchDB <http://couchdb.apache.org/>`_:
it is a scalable, fault-tolerant, and schema-free document-oriented database.
It is used in large and small organizations for a variety of applications where
traditional SQL databases are not the best solution for the problem at hand.
CouchDB provides a RESTful HTTP/JSON API accessible by many programming
libraries and tools (like `curl <http://curl.haxx.se/>`_ or `Pouchdb <http://pouchdb.com/>`_)
and has its own conflict management system.

What is a document?
-------------------

A document is an association of metadata and attachment(s). The metadata is the
set of properties of the document and the attachments are binary (or text) objects
that represent the content of the document.

In jIO, the metadata is a dictionary with keys and values (a JSON object), and
attachments are simple strings.

.. code-block:: javascript

    {
        // document metadata
        _id: 'Identifier',
        title: 'A Title!',
        creator: 'Mr.Author'
    }

You can also retrieve document attachment metadata in this object.

.. code-block:: javascript

    {
        // document metadata
        _id   : 'Identifier',
        title : 'A Title!',
        creator: 'Mr.Author',
        _attachments: {
            // attachment metadata
            'body.html': {
                length: 12893,
                digest: 'sha256-XXXX...',
                content_type: 'text/html'
            }
        }
    }


:ref:`Here <metadata-head>` is a draft about metadata to use with jIO.

Basic Methods
-------------

Below you can see examples of the main jIO methods. All examples are using
revisions (as in revision storage or replicated revision storage), so you can
see how method calls should be made with either of these storages.

.. code-block:: javascript

    // Create a new jIO instance
    var jio_instance = jIO.createJIO(storage tree description);

    // create and store new document
    jio_instance.post({title: 'some title'}).
      then(function (response) {
        // console.log(response);
      });

    // create or update an existing document
    jio_instance.put({_id: 'my_document', title: 'New Title'}).
      then(function (response) {
        // console.log(response);
      });

    // add an attachment to a document
    jio_instance.putAttachment({_id: 'my_document',
                                _attachment: 'its_attachment',
                                _data: 'abc',
                                _mimetype: 'text/plain'}).
      then(function (response) {
        // console.log(response);
      });

    // read a document
    jio_instance.get({_id: 'my_document'}).
      then(function (response) {
        // console.log(response);
      });

    // read an attachment
    jio_instance.getAttachment({_id: 'my_document',
                                _attachment: 'its_attachment'}).
      then(function (response) {
        // console.log(response);
      });

    // delete a document and its attachment(s)
    jio_instance.remove({_id: 'my_document'}).
      then(function (response) {
        // console.log(response);
      });

    // delete an attachment
    jio_instance.removeAttachment({_id: 'my_document',
                                   _attachment: 'its_attachment'}).
      then(function (response) {
        // console.log(response);
      });

    // get all documents
    jio_instance.allDocs().then(function (response) {
      // console.log(response);
    });


Promises
--------

Each jIO method returns a Promise object, which allows us to get responses into
callback parameters and to chain callbacks with other returned values.

jIO uses a custom version of `RSVP.js <https://github.com/tildeio/rsvp.js>`_, adding canceler and progression features.

You can read more about promises:

* `RSVP.js <https://github.com/tildeio/rsvp.js#rsvpjs-->`_ on GitHub
* `Promises/A+ <http://promisesaplus.com/>`_
* `CommonJS Promises <http://wiki.commonjs.org/wiki/Promises>`_


Method Options and Callback Responses
-------------------------------------

To retrieve jIO responses, you have to provide callbacks like this:

.. code-block:: javascript

  jio_instance.post(metadata, [options]).
      then([responseCallback], [errorCallback], [progressionCallback]);


* On command success, ``responseCallback`` is called with the jIO response as first parameter.
* On command error, ``errorCallback`` is called with the jIO error as first parameter.
* On command notification, ``progressionCallback`` is called with the storage notification.

Here is a list of responses returned by jIO according to methods and options:


==================   ==============================================   ===============================================
 Option              Available for                                    Response (Callback first parameter)
==================   ==============================================   ===============================================
No options           ``.post()``, ``.put()``, ``.remove()``           .. code-block:: javascript
 
                                                                       {
                                                                         result: 'success',
                                                                         method: 'post',
                                                                         // or put or remove
                                                                         id: 'my_doc_id',
                                                                         status: 204,
                                                                         statusText: 'No Content'
                                                                       }
No options           ``.putAttachment()``, ``.removeAttachment()``    .. code-block:: javascript

                                                                       {
                                                                         result: 'success',
                                                                         method: 'putAttachment',
                                                                         // or removeAttachment
                                                                         id: 'my_doc_id',
                                                                         attachment: 'my_attachment_id',
                                                                         status: 204,
                                                                         statusText: 'No Content'
                                                                       }
No options           ``.get()``                                       .. code-block:: javascript

                                                                       {
                                                                         result: 'success',
                                                                         method: 'get',
                                                                         id: 'my_doc_id',
                                                                         status: 200,
                                                                         statusText: 'Ok',
                                                                         data: {
                                                                           // Here, the document metadata
                                                                         }
                                                                       }
No options           ``.getAttachment()``                             .. code-block:: javascript

                                                                       {
                                                                         result: 'success',
                                                                         method: 'getAttachment',
                                                                         id: 'my_doc_id',
                                                                         attachment: 'my_attachment_id',
                                                                         status: 200,
                                                                         statusText: 'Ok',
                                                                         data: Blob // Here, the attachment content
                                                                       }
No option            ``.allDocs()``                                   .. code-block:: javascript

                                                                       {
                                                                         result: 'success',
                                                                         method: 'allDocs',
                                                                         id: 'my_doc_id',
                                                                         status: 200,
                                                                         statusText: 'Ok',
                                                                         data:  {
                                                                           total_rows: 1,
                                                                           rows: [{
                                                                             id: 'mydoc',
                                                                             key: 'mydoc', // optional
                                                                             value: {},
                                                                           }]
                                                                         }
                                                                       }
include_docs: true   ``.allDocs()``                                   .. code-block:: javascript

                                                                       {
                                                                         result: 'success',
                                                                         method: 'allDocs',
                                                                         id: 'my_doc_id',
                                                                         status: 200,
                                                                         statusText: 'Ok',
                                                                         data:  {
                                                                           total_rows: 1,
                                                                           rows: [{
                                                                             id: 'mydoc',
                                                                             key: 'mydoc', // optional
                                                                             value: {},
                                                                             doc: {
                                                                               // Here, 'mydoc' metadata
                                                                             }
                                                                           }]
                                                                         }
                                                                       }
==================   ==============================================   ===============================================




In case of error, the ``errorCallback`` first parameter will look like:

.. code-block:: javascript

    {
      result: 'error',
      method: 'get',
      status: 404,
      statusText: 'Not Found',
      error: 'not_found',
      reason: 'document missing',
      message: 'Unable to get the requested document'
    }



How to store a video on localStorage
------------------------------------

The following example creates a new jIO in localStorage and then posts a document with two attachments.

.. code-block:: javascript

    // create a new jIO
    var jio_instance = jIO.createJIO({
      type: 'local',
      username: 'usr',
      application_name: 'app'
    });

    // post the document 'metadata'
    jio_instance.post({
      title       : 'My Video',
      type        : 'MovingImage',
      format      : 'video/ogg',
      description : 'Images Compilation'
    }, function (err, response) {
      var id;
      if (err) {
        return alert('Error posting the document meta');
      }
      id = response.id;

      // post a thumbnail attachment
      jio_instance.putAttachment({
        _id: id,
        _attachment: 'thumbnail',
        _data: my_image,
        _mimetype: 'image/jpeg'
      }, function (err, response) {
        if (err) {
          return alert('Error attaching thumbnail');
        }

        // post video attachment
        jio_instance.putAttachment({
          _id: id,
          _attachment: 'video',
          _data: my_video,
          _mimetype: 'video/ogg'
        }, function (err, response) {
          if (err) {
            return alert('Error attaching the video');
          }
          alert('Video Stored');
        });
      });
    });


localStorage now contains:

.. code-block:: javascript

    {
      "jio/local/usr/app/12345678-1234-1234-1234-123456789012": {
        "_id": "12345678-1234-1234-1234-123456789012",
        "title": "My Video",
        "type": "MovingImage",
        "format": "video/ogg",
        "description": "Images Compilation",
        "_attachments":{
          "thumbnail":{
            "digest": "md5-3ue...",
            "content_type": "image/jpeg",
            "length": 17863
          },
          "video":{
            "digest": "md5-0oe...",
            "content_type": "video/ogg",
            "length": 2840824
          }
        }
      },
      "jio/local/usr/app/myVideo/thumbnail": "/9j/4AAQSkZ...",
      "jio/local/usr/app/myVideo/video": "..."
    }

