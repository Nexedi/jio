
.. _gid-storage:

jIO GIDStorage
==============

A storage to enable interoperability between all kind of storages.

A global ID (GID) is a document id which represents a unique document. This ID
is then used to find this unique document on all types of backends.

This storage uses sub storage allDocs and complex queries to find unique documents, and converts their ids to gids.

Where it can be used
--------------------

When you want to duplicate / synchronize / split / edit data in different kind of storages (ERP5 + XWiki + Dav + ...).

Storage Description
-------------------

* ``type`` - ``"gid"``
* ``sub_storage`` - the sub storage description.
* ``constraints`` - the constraints to use to generate a gid by defining metadata types for some kind of document.

Example:

.. code-block:: javascript

  {
    "type": "gid",
    "sub_storage": {<storage description>},
    "constraints": {
      "default": { // constraints for all kind of documents
        // "document metadata": "type of metadata"
        "type": "list"
        "title": "string"
      },
      "Text": { // document of type 'Text' additional constraints
        "language": "string"
      }
    }
  }


This description tells the *GIDStorage* to use 2 metadata attributes (``type``, ``title``) to define a
document as unique in the default case. If the document is of type ``Text``, then
the handler will use 3 metadata (``type``, ``title``, ``language``).
If these constraints are not respected, then the storage returns an error telling us to
review the document metadata. Here are samples of document respecting the above
constraints:

.. code-block:: javascript

  {
    "type": "Text",
    "title": "Hello World!",
    "language": "en"
  }

  {
    "type": ["Text", "Web Page"],
    "title": "My Web Page Title",
    "language": "en-US",
    "format": "text/html"
  }

  {
    "type": "Image",
    "title": "My Image Title"
  }


Available metadata types are:

* ``"json"`` - The json value of the metadata.
* ``"string"`` - The value as string if it is not a list.
* ``"list"`` - The value as list.
* ``"date"`` - The value if it can be converted to a date (as string).
* ``"DCMIType"`` - A value matching one of the DCMIType Vocabulary (as string).
* ``"contentType"`` - A value which is a content type (as string).
* ``["DCMIType", "list"]`` - The value which contains a DCMIType (as list).
* ``[...]`` - make your own combination.



Document Requirements
---------------------

A metadata value must be a string. This string can be placed in an attribute within
a ``"content"`` key. The object can contains custom keys with string values. A
metadata object can contain several values. Example:

.. code-block:: javascript

  {
    "key": "value",
    // or
    "key": ["value1", "value2"],
    // or
    "key": {
      "attribute name": "attribute value",
      "content": "value"
    },
    // or
    "key": [
      {"scheme": "DCTERMS.URI", "content": "http://foo.com/bar"},
      "value2",
      "value3",
      ...
    ],
    ...
  }


Metadata attributes which names begin with an underscore can contain anything.

.. code-block:: javascript

  {
    "_key": {"whatever": ["blue", []], "a": null}
  }

Storage Requirements
--------------------

* This storage is not compatible with *RevisionStorage* and *ReplicateRevisionStorage*.
* Sub storages have to support options for ``complex queries`` and ``include_docs``.


Dependencies
------------

No dependency.

Suggested storage tree
----------------------

Replication between storages::

  Replicate Storage
  +-- GID Storage
  |   `-- Local Storage
  +-- GID Storage
  |   `-- Remote Storage 1
  `-- GID Storage
     `-- Remote Storage 2

**CAUTION: All gid storage must have the same description!**

Offline application usage::

  Replicate Storage
  +-- Index Storage with DB in Local Storage
  |   `-- GID Storage
  |       `-- ERP5 Storage
  `-- GID Storage
      `-- Local Storage

**CAUTION: All gid storage must have the same description!**


