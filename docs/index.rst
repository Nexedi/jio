
Welcome to jIO
==============

jIO is a JavaScript library that allows to manage JSON documents on local or
remote storages in asynchronous fashion. jIO is an abstracted API mapped after
CouchDB, that offers connectors to multiple storages, special handlers to
enhance functionality (replication, revisions, indexing) and a query module to
retrieve documents and specific information across storage trees.

How does it work?
-----------------

jIO is composed of two parts - jIO core and storage libraries. The core
makes use of storage libraries (connectors) to interact with the associated remote
storage servers. Some queries can be used on top of the ``.allDocs()`` method to
query documents based on defined criteria.

jIO uses a job management system, so each method call adds a job into a
queue. The queue is copied in the browser's local storage (by default), so it
can be restored in case of browser crash. Jobs are invoked
asynchronously and ongoing jobs are not able to re-trigger to prevent
conflicts.


Copyright and license
---------------------

jIO is open source and is licensed under the `LGPL <http://en.wikipedia.org/wiki/GNU_Lesser_General_Public_License>`_ license.



jIO documentation
-----------------

.. toctree::
    :maxdepth: 2

    getting_started
    manage_documents
    revision_storages
    available_storages
    gid_storage
    complex_queries
    keys
    metadata
    developers
    style_guide
    authors

