
.. role:: js(code)
   :language: javascript

Introduction
============

What is jIO?
------------

jIO is a JavaScript library that allows to manage JSON documents on local or
remote storages in asynchronous fashion. jIO is an abstracted API mapped after
CouchDB, that offers connectors to multiple storages, special handlers to
enhance functionality (replication, revisions, indexing) and a query module to
retrieve documents and specific information across storage trees.

How does it work?
-----------------

.. XXX three parts?

jIO is separated into three parts - jIO core and storage library(ies). The core
is using storage libraries (connectors) to interact with the associated remote
storage servers. Some queries can be used on top of the jIO allDocs method to
query documents based on defined criteria.

jIO uses a job management system, so every method called adds a job into a
queue. The queue is copied in the browser's local storage (by default), so it
can be restored in case of a browser crash. Jobs are being invoked
asynchronously with ongoing jobs not being able to re-trigger to prevent
conflicts.

Getting started
---------------

This walkthrough is designed to get you started using a basic jIO instance.

#.  Download jIO core, the storages you want to use as well as the
    complex-queries scripts as well as the dependencies required for the storages
    you intend to use.  :ref:`[Download & Fork] <download-fork>`

#.  Add the scripts to your HTML page in the following order:

    .. code-block:: html

        <!-- jio core + dependency -->
        <script src="sha256.amd.js"></script>
        <script src="rsvp-custom.js"></script>
        <script src="jio.js"></script>

        <!-- storages + dependencies -->
        <script src="complex_queries.js"></script>
        <script src="localstorage.js"></script>
        <script src="davstorage.js"></script>

        <script ...>


    With require js, the main.js will be like this:

    .. code-block:: javascript
        :linenos:

        require.config({
            "paths": {
                // jio core + dependency

                // the AMD compatible version of sha256.js -> see Download and Fork
                "sha256": "sha256.amd",
                "rsvp": "rsvp-custom",
                "jio": "jio",
                // storages + dependencies
                "complex_queries": "complex_queries",
                "localstorage": "localstorage",
                "davstorage": "davstorage"
            }
        });


#.  jIO connects to a number of storages and allows to add handlers (or
    functions) to specifc storages.
    You can use both handlers and available storages to build a storage
    tree across which all documents will be maintained and managed by jIO.
    
    See :ref:`List of Available Storages <list-of-available-storages>`.

    .. code-block:: javascript

        // create your jio instance
        var my_jio = jIO.createJIO(storage_description);

.. XXX 6 methods or 10?

#.  The jIO API provides six main methods to manage documents across the storage(s) specified in your jIO storage tree.

    ==================   =====================================================  ========================================
    Method               Sample Call                                            Description
    ==================   =====================================================  ========================================
    `post`               :js:`my_jio.post(document, [options]);`                Creates a new document
    `put`                :js:`my_jio.put(document, [options]);`                 Creates/Updates a document
    `putAttachment`      :js:`my_jio.putAttachement(attachment, [options]);`    Updates/Adds an attachment to a document
    `get`                :js:`my_jio.get(document, [options]);`                 Reads a document
    `getAttachment`      :js:`my_jio.getAttachment(attachment, [options]);`     Reads a document attachment
    `remove`             :js:`my_jio.remove(document, [options]);`              Deletes a document and its attachments
    `removeAttachment`   :js:`my_jio.removeAttachment(attachment, [options]);`  Deletes a document attachment
    `allDocs`            :js:`my_jio.allDocs([options]);`                       Retrieves a list of existing documents
    `check`              :js:`my_jio.check(document, [options]);`               Check the document state
    `repair`             :js:`my_jio.repair(document, [options]);`              Repair the document
    ==================   =====================================================  ========================================


