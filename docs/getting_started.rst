
Getting started
===============

#.  :ref:`Download <download-fork>` the core jIO, the storages you need and the
    dependencies required for them.

#.  Add the scripts to your HTML page in the following order:

    .. code-block:: html

      <!-- jio core + dependencies -->
      <script src="sha256.amd.js"></script>
      <script src="rsvp-custom.js"></script>
      <script src="jio.js"></script>

      <!-- storages + dependencies -->
      <script src="localstorage.js"></script>
      <script src="davstorage.js"></script>

      <script ...>


    With `RequireJS <http://requirejs.org/>`_, the main.js will look like:

    .. code-block:: javascript

        require.config({
            paths: {
                // jio core + dependency
                sha256: 'sha256.amd',   // AMD-compatible version of sha256.js
                rsvp: 'rsvp-custom',
                jio: 'jio',
                // storages + dependencies
                localstorage: 'localstorage',
                davstorage: 'davstorage'
            }
        });


#.  jIO connects to a number of storages and allows adding handlers (or
    functions) to specific storages.
    You can use both handlers and available storages to build a storage
    tree across which all documents will be maintained and managed by jIO.

    .. code-block:: javascript

        // create your jio instance
        var my_jio = jIO.createJIO(storage_description);

    You have to provide a ``storage_description`` object, providing location
    and credentials.

    Its format depends on the type of storage,
    see :ref:`List of Available Storages <list-of-available-storages>`.


#.  The jIO API provides ten main methods to manage documents across the storage(s) specified in your jIO storage tree.

    For details on the ``document`` and ``attachment`` objects, see :ref:`What is a document? <what-is-a-document>`


    =======================  ======================================================
    Method                   Example
    =======================  ======================================================
    ``.post()``              |  ``my_jio.post(document, [options]);``
                             |  Creates a new document
    ``.put()``               |  ``my_jio.put(document, [options]);``
                             |  Creates/Updates a document
    ``.putAttachment()``     |  ``my_jio.putAttachement(attachment, [options]);```
                             |  Updates/Adds an attachment to a document
    ``.get()``               |  ``my_jio.get(document, [options]);``
                             |  Reads a document
    ``.getAttachment()``     |  ``my_jio.getAttachment(attachment, [options]);``
                             |  Reads a document attachment
    ``.remove()``            |  ``my_jio.remove(document, [options]);``
                             |  Deletes a document and its attachments
    ``.removeAttachment()``  |  ``my_jio.removeAttachment(attachment, [options]);``
                             |  Deletes a document's attachment
    ``.allDocs()``           |  ``my_jio.allDocs([options]);``
                             |  Retrieves a list of existing documents
    ``.check()``             |  ``my_jio.check(document, [options]);``
                             |  Checks the document state
    ``.repair()``            |  ``my_jio.repair(document, [options]);``
                             |  Repairs the document
    =======================  ======================================================



.. _download-fork:

Download & Fork
---------------

Please note that the current (2.0.0-wip) version is not stable yet.

You can use one of the ZIP packages, which include all the dependencies and storages:

`Full download (172k) <_static/jio-2.0.0-wip.zip>`_
`Minified download (87k) <_static/jio-2.0.0-wip-min.zip>`_

or you can create your own set of files, which are are provided in the above packages and the source repository:


Core
^^^^

* sha256.amd.js
* rsvp-custom.js, AMD only version: rsvp-custom.amd.js
* jio.js

Storage dependencies
^^^^^^^^^^^^^^^^^^^^

.. XXX this is a little confusing.

* `jquery.js <http://code.jquery.com/jquery.js>`_
* `Stanford Javascript Crypto Library <http://bitwiseshiftleft.github.io/sjcl/>`_, `sjcl.zip <https://crypto.stanford.edu/sjcl/sjcl.zip>`_
* `pajhome.org.uk sha1 <http://pajhome.org.uk/crypt/md5/sha1.html>`_, AMD-compatible version: `sha1.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha1.amd.js>`_
* `anmar.eu.org jssha2 <http://anmar.eu.org/projects/jssha2/>`_, `jssha2.zip <http://anmar.eu.org/projects/jssha2/files/jssha2-0.3.zip>`_, AMD-compatible versions: `sha2.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha2.amd.js>`_, `sha256.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha256.amd.js>`_

Storage connectors
^^^^^^^^^^^^^^^^^^

* localstorage.js
* davstorage.js
* searchableencryptionstorage.js (depends on sjcl) (WIP)
* s3storage.js (depends on sha1, jQuery) (WIP)
* xwikistorage.js (depends on jQuery) (WIP)
* erp5storage.js (WIP)
* restsqlstorage.js (depends on jQuery) (WIP)
* mioga2storage.js (depends on jQuery) (WIP)

Storage handlers
^^^^^^^^^^^^^^^^

* indexstorage.js
* gidstorage.js
* splitstorage.js (WIP)
* replicatestorage.js (WIP)

Revision based storage handlers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

* revisionstorage.js (depends on sha256)
* replicaterevisionstorage.js


Unit tests
^^^^^^^^^^

We monitor code quality with a `test agent <http://www.j-io.org/quality/unit_test>`_ that runs
the test suite with each release.

Fork jIO
^^^^^^^^

The same source code is kept in three synchronized repositories.
Feel free to use any of them.

* `GitHub <https://github.com/nexedi/jio>`_: ``git clone https://github.com/nexedi/jio.git``
* `Gitorius <https://gitorious.org/nexedi/jio>`_: ``git clone https://git.gitorious.org/nexedi/jio.git``
* `Git Erp5 <http://git.erp5.org/gitweb/jio.git>`_ (read only): ``git clone http://git.erp5.org/repos/jio.git``
