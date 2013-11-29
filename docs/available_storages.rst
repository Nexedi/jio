
.. role:: js(code)
   :language: javascript

.. _list-of-available-storages:

List of Available Storages
==========================

jIO saves his job queue in a workspace which is localStorage by default.
Provided storage descriptions are also stored, and it can be dangerous to
store passwords.

The best way to create a storage description is to use the (often) provided
tool given by the storage library. The returned description is secured to avoid
cleartext, readable passwords (as opposed to encrypted passwords for instance).

When building storage trees, there is no limit on the number of storages you
can use. The only thing you have to be aware of is compatibility of simple and
revision based storages.


Connectors
----------

LocalStorage
^^^^^^^^^^^^

Three methods are provided:

* :js:`.createDescription(username, [application_name], [mode='localStorage'])`
* :js:`.createLocalDescription(username, [application_name])`
* :js:`.createMemoryDescription(username, [application_name])`

All parameters are strings.

Examples:

.. code-block:: javascript

    // to work on browser localStorage
    var jio = jIO.createJIO(local_storage.createDescription('me'));

    // to work on browser memory
    var jio = jIO.createJIO(local_storage.createMemoryDescription('me'));


DavStorage
^^^^^^^^^^

The method ``dav_storage.createDescription()`` generates a DAV storage description for
*none*, *basic* or *digest* authentication.

NB: digest **is not implemented yet**.

.. code-block:: javascript

   dav_storage.createDescription(url, auth_type,
                                 [realm], [username], [password]);

All parameters are strings.

=============   ========================
parameter       required?
=============   ========================
``url``         yes
``auth_type``   yes
``realm``       if auth_type == 'digest'
``username``    if auth_type != 'none'
``password``    if auth-type != 'none'
=============   ========================

If ``auth_type`` is the string ``"none"``, then ``realm``, ``username`` and ``password`` are never used.

**Be careful**: The generated description never contains a readable password, but
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
document) to increase the speed of ``.allDocs()`` requests. However, it is not able to
manage the ``include_docs`` option.

The sub storages have to manage ``query`` and ``include_docs`` options.

Here is the description:

.. code-block:: javascript

   {
     type: 'index',
     indices: [{
       // doc id where to store indices
       id: 'index_title_subject.json',
       // metadata to index
       index: ['title', 'subject'],
       attachment: 'db.json', // default 'body'
       // additional metadata to add to database, default undefined
       metadata: {
         type: 'Dataset',
         format: 'application/json',
         title: 'My index database',
         creator: 'Me'
       },
       // default equal to parent sub_storage field
       sub_storage: <sub storage where to store index>
     }, {
       id: 'index_year.json',
       index: 'year'
       ...
     }],
     sub_storage: <sub storage description>
   }


GIDStorage
^^^^^^^^^^

:ref:`Full description here <gid-storage>`.

Updating to v2.0

SplitStorage
^^^^^^^^^^^^

Updating to v2.0

Replicate Storage
^^^^^^^^^^^^^^^^^

Coming soon

Revision Based Handlers
-----------------------

A revision based handler is a storage which is able to do some document
versioning using simple storages listed above.

On jIO command parameter, ``_id`` is still used to identify a document, but
another id ``_rev`` must be defined to use a specific revision of that document.

On command responses, you will find another field ``rev`` which will represent the
new revision produced by your action. All the document history is kept unless
you decide to delete older revisions.

Other fields ``conflicts``, ``revisions`` and ``revs_info`` can be returned if the
options **conflicts: true**, **revs: true** or **revs_info: true** are set.

Revision Storage
^^^^^^^^^^^^^^^^

Updating to v2.0

Replicate Revision Storage
^^^^^^^^^^^^^^^^^^^^^^^^^^

Updating to v2.0


