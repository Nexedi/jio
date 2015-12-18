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


.. _what-is-a-document:

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
        title: 'A Title!',
        creator: 'Mr.Author'
    }

:ref:`Here <metadata-head>` is a draft about metadata to use with jIO.

Basic Methods
-------------

Below you can see examples of the main jIO methods.

.. code-block:: javascript

    // Create a new jIO instance
    var jio_instance = jIO.createJIO(storage_description);

    // create and store new document
    jio_instance.post({title: 'my document'}).
      then(function (response) {
        // console.log(response);
      });

    // create or update an existing document
    jio_instance.put('document_name', {title: 'another document'}).
      then(function (response) {
        // console.log(response);
      });

    // add an attachment to a document
    jio_instance.putAttachment('document_name',
                               'attachment_name',
                               new Blob([data], {'type' : data_mimetype});
      ).
      then(function (response) {
        // console.log(response);
      });

    // read a document
    jio_instance.get('document_name').
      then(function (response) {
        // console.log(response);
      });

    // read an attachment
    jio_instance.getAttachment('document_name',
                               'attachment_name').
      then(function (response) {
        // console.log(response);
      });

    // delete a document and its attachment(s)
    jio_instance.remove('document_name').
      then(function (response) {
        // console.log(response);
      });

    // delete an attachment
    jio_instance.removeAttachment('document_name',
                                  'attachment_name').
      then(function (response) {
        // console.log(response);
      });

    // get all documents
    jio_instance.allDocs().then(function (response) {
      // console.log(response);
    });


Promises
--------

Each jIO method (with the exception of ``.createJIO()``) returns a Promise object, which allows us to get responses into
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


==============================================   ==================   ===============================================
Available for                                    Option               Response (Callback first parameter)
==============================================   ==================   ===============================================
``.post()``, ``.put()``, ``.remove()``           Any                  id of the document affected (string)

``.putAttachment()``, ``.removeAttachment()``    Any                  no specific value

``.get()``                                       Any                  document_metadata (object)
``.getAttachment()``                             Any                  .. code-block:: javascript

                                                                        new Blob([data], {"type": content_type})

``.allDocs()``                                   No option            .. code-block:: javascript

                                                                       {
                                                                           total_rows: 1,
                                                                           rows: [{
                                                                             id: 'mydoc',
                                                                             value: {},
                                                                           }]
                                                                         }

``.allDocs()``                                   include_docs: true   .. code-block:: javascript

                                                                       {
                                                                           total_rows: 1,
                                                                           rows: [{
                                                                             id: 'mydoc',
                                                                             value: {
                                                                               // Here, 'mydoc' metadata
                                                                             }
                                                                           }]
                                                                         }

==============================================   ==================   ===============================================




In case of error, the ``errorCallback`` first parameter looks like:

.. code-block:: javascript

    {
      status_code: 404,
      message: 'Unable to get the requested document'
    }



How to store binary data
------------------------

The following example creates a new jIO in localStorage and then posts a document with two attachments.

.. code-block:: javascript

    // create a new jIO
    var jio_instance = jIO.createJIO({type: 'indexeddb'});

    // post the document 'myVideo'
    jio_instance.put( 'metadata', {
      title       : 'My Video',
      type        : 'MovingImage',
      format      : 'video/ogg',
      description : 'Images Compilation'
    })
    .push(undefined, function(err) {
        return alert('Error posting the document metadata');
      });

      // post a thumbnail attachment
    jio_instance.putAttachment('metadatda',
      'thumbnail',
      new Blob([my_image], {type: 'image/jpeg'})
      ).push(undefined, function(err) {
      return alert('Error attaching thumbnail');
      });

      // post video attachment
      jio_instance.putAttachment('metadatda',
        'video',
        new Blob([my_video], {type: 'video/ogg'})
      ).push(undefined, function(err) {
                return alert('Error attaching video');
        });
        alert('Video Stored');

indexedDB Storage now contains:

.. code-block:: javascript

    {
      "/myVideo/": {
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
      "/myVideo/thumbnail": "...",
      "/myVideo/video": "..."
    }

