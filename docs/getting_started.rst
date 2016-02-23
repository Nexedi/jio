
Getting started
===============

#.  :ref:`Download <download-fork>` the core jIO, the storages you need and the
    dependencies required for them.

#.  Add the scripts to your HTML page in the following order:

    .. code-block:: html

      <!-- jio core + dependencies -->
      <script src="rsvp.js"></script>
      <script src="jio.js"></script>

      <script ...>


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
    ``.repair()``            |  ``my_jio.repair(document, [options]);``
                             |  Repairs the document
    =======================  ======================================================



.. _download-fork:

Download & Fork
---------------

You can get latest jIO release by using on of those links:

`Full download <https://lab.nexedi.com/nexedi/jio/raw/master/dist/jio-latest.js>`_
`Minified download <https://lab.nexedi.com/nexedi/jio/raw/master/dist/jio-latest.min.js>`_

You can get latest RSVP release by using on of those links:

`Full download <https://lab.nexedi.com/nexedi/rsvp.js/raw/master/dist/rsvp-2.0.4.js>`_
`Minified download <https://lab.nexedi.com/nexedi/rsvp.js/raw/master/dist/rsvp-2.0.4.min.js>`_

Fork jIO
^^^^^^^^

| Feel free to use the Gitlab repository:
| `GitLab <https://lab.nexedi.com/nexedi/jio.git>`_: ``git clone https://lab.nexedi.com/nexedi/jio.git``
