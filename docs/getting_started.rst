
.. role:: js(code)
   :language: javascript

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
      <script src="complex_queries.js"></script>
      <script src="localstorage.js"></script>
      <script src="davstorage.js"></script>

      <script ...>


    With `RequireJS <http://requirejs.org/>`_, the main.js will look like:

    .. code-block:: javascript

        require.config({
            "paths": {
                // jio core + dependency

                // the AMD compatible version of sha256.js, see Download and Fork
                "sha256": "sha256.amd",
                "rsvp": "rsvp-custom",
                "jio": "jio",
                // storages + dependencies
                "complex_queries": "complex_queries",
                "localstorage": "localstorage",
                "davstorage": "davstorage"
            }
        });


#.  jIO connects to a number of storages and allows adding handlers (or
    functions) to specifc storages.
    You can use both handlers and available storages to build a storage
    tree across which all documents will be maintained and managed by jIO.
    
    See :ref:`List of Available Storages <list-of-available-storages>`.

    .. code-block:: javascript

        // create your jio instance
        var my_jio = jIO.createJIO(storage_description);

#.  The jIO API provides ten main methods to manage documents across the storage(s) specified in your jIO storage tree.

    ======================  ========================================================
    Method                  Example
    ======================  ========================================================
    ``post()``              |  :js:`my_jio.post(document, [options]);`
                            |  Creates a new document
    ``put()``               |  :js:`my_jio.put(document, [options]);`
                            |  Creates/Updates a document
    ``putAttachment()``     |  :js:`my_jio.putAttachement(attachment, [options]);`
                            |  Updates/Adds an attachment to a document
    ``get()``               |  :js:`my_jio.get(document, [options]);`
                            |  Reads a document
    ``getAttachment()``     |  :js:`my_jio.getAttachment(attachment, [options]);`
                            |  Reads a document attachment
    ``remove()``            |  :js:`my_jio.remove(document, [options]);`
                            |  Deletes a document and its attachments
    ``removeAttachment()``  |  :js:`my_jio.removeAttachment(attachment, [options]);`
                            |  Deletes a document's attachment
    ``allDocs()``           |  :js:`my_jio.allDocs([options]);`
                            |  Retrieves a list of existing documents
    ``check()``             |  :js:`my_jio.check(document, [options]);`
                            |  Check the document state
    ``repair()``            |  :js:`my_jio.repair(document, [options]);`
                            |  Repair the document
    ======================  ========================================================



.. _download-fork:

Download & Fork
---------------

You can use one of the ZIP packages, which include all the dependencies and storages:

`Full download (172k) <_static/jio-2.0.0.zip>`_
`Minified download (87k) <_static/jio-2.0.0-min.zip>`_

or you can create your own set of files, which are are provided in the above packages and the source repository:


Core
^^^^

* sha256.amd.js
* rsvp-custom.js, AMD only version: rsvp-custom.amd.js
* jio.js
* complex_queries.js

Storage dependencies
^^^^^^^^^^^^^^^^^^^^

.. XXX this is a little confusing. Also, the link to sha1.js is broken (404)

* `jquery.js <http://code.jquery.com/jquery.js>`_
* `Stanford Javascript Crypto Library <http://bitwiseshiftleft.github.io/sjcl/>`_, [`sjcl.zip <https://crypto.stanford.edu/sjcl/sjcl.zip>`_]
* `sha1 <http://pajhome.org.uk/crypt/md5/sha1.html>`_, [`sha1.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/lib/jsSha1/sha1.js>`_], AMD compatible version: `sha1.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha1.amd.js>`_
* `sha2, sha256 <http://anmar.eu.org/projects/jssha2/>`_, `jssha2.zip <http://anmar.eu.org/projects/jssha2/files/jssha2-0.3.zip>`_, AMD compatible versions: `sha2.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha2.amd.js>`_, `sha256.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha256.amd.js>`_

Storage connectors
^^^^^^^^^^^^^^^^^^

* localstorage.js
* davstorage.js
* s3storage.js (depends on sha1, jQuery) (WIP)
* xwikistorage.js (depends on jQuery) (WIP)
* erp5storage.js (depends on jQuery) (WIP)
* restsqlstorage.js (depends on jQuery) (WIP)
* mioga2storage.js (depends on jQuery) (WIP)

Storage handlers
^^^^^^^^^^^^^^^^

* indexstorage.js (WIP)
* gidstorage.js (WIP)
* splitstorage.js (WIP)
* replicatestorage.js (WIP)

Revision based storage handlers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

* revisionstorage.js (depends on sha256) (WIP)
* replicaterevisionstorage.js (WIP)


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


