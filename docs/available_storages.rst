
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

This storage has only one document, so **post**, **put**, **remove** and **get** method are useless on it.

===============   ==========  ==========  ============================================================
parameter         required?   type        description
===============   ==========  ==========  ============================================================
``type``          yes         string      name of the storage type (here: "local")
``sessiononly``   no          boolean     | false: create a storage with unlimited duration.
                                          | true: the storage duration is limited to the user session.
                                          | (default to false)
===============   ==========  ==========  ============================================================


Example:

.. code-block:: javascript

    var jio = jIO.createJIO({
      type:        "local",
      sessiononly: true
    });

MemoryStorage
^^^^^^^^^^^^^
| Stores the data in a Javascript object, in memory.
| The storage's data isn't saved when your web page is closed or reloaded.
| The storage doesn't take any argument at creation.

Example:

.. code-block:: javascript

    var jio = jIO.createJIO({type: "memory"});


IndexedDB
^^^^^^^^^^^^

=================   ==========  ==========  ==========================================================
parameter           required?   type        description
=================   ==========  ==========  ==========================================================
``type``            yes         string      name of the storage type (here: "indexeddb")
``database``        yes         string      name of the database.
=================   ==========  ==========  ==========================================================


Example:

.. code-block:: javascript

  {
    "type":     "indexeddb",
    "database": "mydb"
  }

WebSQL
^^^^^^^^^^^^

=================   ==========  ==========  ==========================================================
parameter           required?   type        description
=================   ==========  ==========  ==========================================================
``type``            yes         string      name of the storage type (here: "websql")
``database``        yes         string      name of the database.
=================   ==========  ==========  ==========================================================


Example:

.. code-block:: javascript

  {
    "type":     "websql",
    "database": "mydb"
  }


DavStorage
^^^^^^^^^^

=====================   ==========  ==========  ==========================================================
parameter               required?   type        description
=====================   ==========  ==========  ==========================================================
``type``                yes         string      name of the storage type (here: "dav")
``url``                 yes         string      url of your webdav server
``basic_login``         no          string      | login and password of your dav, base64 encoded like this:
                                                | ``btoa(username + ":" + password)``
``with_credentials``    no          boolean     | true: send domain cookie
                                                | false: do not send domain cookie
                                                | default to false.
=====================   ==========  ==========  ==========================================================


Example:

.. code-block:: javascript

  // No authentication
  {
    "type": "dav",
    "url":  url
  }

  // Basic authentication
  {
    "type":        "dav",
    "url":         url,
    "basic_login": btoa(username + ":" + password)
  }

  // Digest authentication is not implemented

**Be careful**: The generated description never contains a readable password, but
for basic authentication, the password is just base64 encoded.


Dropbox
^^^^^^^

=================   ==========  ==========  ==========================================================
parameter           required?   type        description
=================   ==========  ==========  ==========================================================
``type``            yes         string      name of the storage type (here: "dropbox")
``access_token``    yes         string      access token for your account.
                                            See specific documentation on how to retreive it.
``root``            no          string      | "dropbox" for full access to account files,
                                            | "sandbox" for app limited file access.
                                            | default to "dropbox".
=================   ==========  ==========  ==========================================================


Example:

.. code-block:: javascript

  {
    "type":         "dropbox",
    "access_token": "sample_token"
    "root":         "dropbox"
  }

Google Drive
^^^^^^^^^^^^

=================   ==========  ==========  ==========================================================
parameter           required?   type        description
=================   ==========  ==========  ==========================================================
``type``            yes         string      name of the storage type (here: "gdrive")
``access_token``    yes         string      access token for your account.
                                            See specific documentation on how to retreive it.
``trashing``        no          boolean     | true: sends files to the trash bin when doing a "remove"
                                            | false: deletes permanently files when doing a "remove"
                                            | default to true.
=================   ==========  ==========  ==========================================================


Example:

.. code-block:: javascript

  {
    "type":         "gdrive",
    "access_token": "sample_token"
    "trashing":     true
  }

ERP5Storage
^^^^^^^^^^^
===========================   ==========  ==========  ==========================================================
parameter                     required?   type        description
===========================   ==========  ==========  ==========================================================
``type``                      yes         string      name of the storage type (here: "erp5")
``url``                       yes         string      url of your erp5 account.
``default_view_reference``    no          string      | reference of the action used
                                                      | for the delivering of the document
===========================   ==========  ==========  ==========================================================

Example:

.. code-block:: javascript

  {
    "type": "erp5",
    "url":  erp5_url
  }

Handlers
--------

Zipstorage
^^^^^^^^^^

This handler compresses and decompresses files to reduce network and storage usage.

Usage:

.. code-block:: javascript

  {
    "type":        "zip",
    "sub_storage": <your storage>
  }

ShaStorage
^^^^^^^^^^

This handler provides a post method that creates a document that has for name the SHA-1 hash of his parameters.

.. code-block:: javascript

  {
    "type":        "sha",
    "sub_storage": <your storage>
  }

UUIDStorage
^^^^^^^^^^^

This handler provides a post method to create a document that has a unique ID for name.

.. code-block:: javascript

  {
    "type":        "uuid",
    "sub_storage": <your storage>
  }

QueryStorage
^^^^^^^^^^^^

This handler provides an allDocs method with queries support to the substorage.

.. code-block:: javascript

  {
    "type":        "query",
    "sub_storage": <your storage>
  }

CryptStorage
^^^^^^^^^^^^

| This handler encrypts and decrypts attachments before storing them.
| You need to generate a Crypto key at the JSON format to use the handler.
| (see https://developer.mozilla.org/fr/docs/Web/API/Window/crypto for more informations)

Usage:

.. code-block:: javascript

  var key,
    jsonKey,
    jio;

  //creation of an encryption/decryption key.

  crypto.subtle.generateKey({name: "AES-GCM",length: 256},
                            (true), ["encrypt", "decrypt"])
  .then(function(res){key = res;});
  window.crypto.subtle.exportKey("jwk", key)
  .then(function(res){jsonKey = res})

  //creation of the storage

  jio = jIO.createJIO({
  {
    "type":        "crypt",
    "key":         json_key
    "sub_storage": <your storage>
  }


UnionStorage
^^^^^^^^^^^^

This handler takes in argument an array of storages.
When using a method, UnionStorage tries it on the first storage of the array,
and, in case of failure, tries with the next storage,
and repeats the operation until success, or end of storage's array.

.. code-block:: javascript

  {
    "type":        "union",
    "storage_list": [
    sub_storage_description_1,
    sub_storage_description_2,
    sub_storage_description_X
   ]
  }

FileSystemBridgeStorage
^^^^^^^^^^^^^^^^^^^^^^^

This handler adds an abstraction level on top of the webDav Jio storage,
ensuring each document has only one attachment, and limiting the storage to one repertory.

.. code-block:: javascript

  {
    "type": "drivetojiomapping",
    "sub_storage": <your dav storage>
  }

Document Storage
^^^^^^^^^^^^^^^^

This handler creates a storage from a document in a storage,
by filling his attachments with a new jIO storage.

======================   ==========  ==========  ============================================================
parameter                required?   type        description
======================   ==========  ==========  ============================================================
``type``                 yes         string      name of the storage type (here: "document")
``document_id``          no          string      id of the document to use.
``repair_attachment``    no          boolean     verify if the document is in good state. (default to false)
======================   ==========  ==========  ============================================================

Replicate Storage
^^^^^^^^^^^^^^^^^

Replicate Storage synchronizes documents between a local and a remote storage.

===============================   ==========  ==========  ============================================================
parameter                         required?   type        description
===============================   ==========  ==========  ============================================================
``type``                          yes         string      name of the storage type (here: "replicate")
``local_sub_storage``             yes         object      local sub_storage description.
``remote_sub_storage``            yes         object      remote sub_storage description.
``query_options``                 no          object      query object to limit the synchronisation to specific files.
``use_remote_post``               no          boolean     | true: at file modification, modifies the local file id.
                                                          | false:  at file modification, modifies the remote file id.
                                                          | default to false.
``conflict_handling``             no          number      | 0: no conflict resolution (throws error)
                                                          | 1: keep the local state.
                                                          | 2: keep the remote state.
                                                          | 3: keep both states (no signature update)
                                                          | default to 0.
``check_local_modification``      no          boolean     synchronise when local files are modified.
``check_local_creation``          no          boolean     synchronise when local files are created.
``check_local_deletion``          no          boolean     synchronise when local files are deleted.
``check_remote_modification``     no          boolean     synchronise when remote files are modified.
``check_remote_creation``         no          boolean     synchronise when local files are created.
``check_remote_deletion``         no          boolean     synchronise when local files are deleted.
===============================   ==========  ==========  ============================================================

synchronisation parameters are set by default to true.

.. code-block:: javascript

   {
     type:                     'replicate',
     local_sub_storage:        { 'type': 'local'}
     remote_sub_storage:       {
                                  'type':        'dav',
                                  'url':         'http://mydav.com',
                                  'basic_login': 'aGFwcHkgZWFzdGVy'
                               }
     use_remote_post:          false,
     conflict_handling :       2,
     check_local_creation:     false,
     check_remote_deletion:    false
   }
