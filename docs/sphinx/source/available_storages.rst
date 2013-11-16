

.. role:: js(code)
   :language: javascript


.. _list-of-available-storages:
List of Available Storages
==========================

JIO save his job queue in a workspace which is localStorage by default.
Provided storage descirption are also stored, and it can be dangerous if we
store passwords.

The best way to create a storage description is to use the (often) provided
tool given by the storage library. The returned description is secured to avoid
clear readable password. (enciphered password for instance)

When building storage trees, there is no limit on the number of storages you
can use. The only thing you have to be aware of is compatability of simple and
revision based storages.


Connectors
----------

LocalStorage
^^^^^^^^^^^^


Three methods are provided:

 * :js:`createDescription(username, [application_name], [mode="localStorage"])`
 * :js:`createLocalDescription(username, [application_name])`
 * :js:`createMemoryDescription(username, [application_name])`

All parameters are strings.

Examples:

.. code-block:: javascript

    // to work on browser localStorage
    var jio = jIO.createJIO(local_storage.createDescription("me"));

    // to work on browser memory
    var jio = jIO.createJIO(local_storage.createMemoryDescription("me"));


DavStorage
^^^^^^^^^^

The tool dav_storage.createDescription generates a dav storage description for
*no*, *basic* or *digest* authentication (*digest* is not implemented yet).

.. code-block:: javascript

   dav_storage.createDescription(url, auth_type, [realm], [username], [password]);

All parameters are strings.

Only ``url`` and ``auth_type`` are required. If ``auth_type`` is equal to "none",
then ``realm``, ``username`` and ``password`` are useless. ``username`` and ``password`` become
required if ``auth_type`` is equal to "basic". And ``realm`` also becomes required if
``auth_type`` is equal to "digest".

digest **is not implemented yet**

**Be careful**: The generated description never contains readable password, but
for basic authentication, the password will just be base64 encoded.

S3Storage
^^^^^^^^^

Updating to v2.0

XWikiStorage
^^^^^^^^^^^^

Updating to v2.0

Handlers
--------

IndexStorage
^^^^^^^^^^^^

This handler indexes documents metadata into a database (which is a simple
document) to increase the speed of allDocs requests. However, it is not able to
manage the ``include_docs`` option.

The sub storages have to manage ``query`` and ``include_docs`` options.

Here is the description:

.. code-block:: javascript

   {
     "type": "index",
     "indices": [{
       "id": "index_title_subject.json", // doc id where to store indices
       "index": ["title", "subject"], // metadata to index
       "attachment": "db.json", // default "body"
       "metadata": { // additional metadata to add to database, default undefined
         "type": "Dataset",
         "format": "application/json",
         "title": "My index database",
         "creator": "Me"
       },
       "sub_storage": <sub storage where to store index>
                      // default equal to parent sub_storage field
     }, {
       "id": "index_year.json",
       "index": "year"
       ...
     }],
     "sub_storage": <sub storage description>
   }


GIDStorage
^^^^^^^^^^

`Full description here <http://www.j-io.org/P-JIO-GIDStorage>`_.

Updating to v2.0

SplitStorage
^^^^^^^^^^^^

Updating to v2.0

Replicate Storage
^^^^^^^^^^^^^^^^^

Comming soon

Revision Based Handlers
-----------------------

A revision based handler is a storage which is able to do some document
versionning using simple storages listed above.

On JIO command parameter, ``_id`` is still used to identify a document, but
another id ``_rev`` must be defined to use a specific revision of this document.

On command responses, you will find another field ``rev`` which will represent the
new revision produced by your action. All the document history is kept unless
you decide to delete older revisions.

Another fields ``conflicts``, ``revisions`` and ``revs_info`` can be returned if the
options **conflicts: true**, **revs: true** and **revs_info: true** are set.

Revision Storage
^^^^^^^^^^^^^^^^

Updating to v2.0

Replicate Revision Storage
^^^^^^^^^^^^^^^^^^^^^^^^^^

Updating to v2.0



