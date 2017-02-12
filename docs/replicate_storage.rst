.. _replicate-storage-conflicts-and-resolution:

Replicate Storage: Conflicts and Resolution
===========================================


Why Conflicts can Occur
-----------------------

Using jIO you can store documents in multiple locations. With an
increasing number of users working on a document and some storages not being
available or responding too slow, conflicts are more likely to occur. jIO
defines a conflict as multiple versions of a document existing in a storage
tree and a user trying to save on a version that does not match the latest
version of the document.

To keep track of document versions a replicate storage must be used. When doing
so, jIO creates a document tree file for every document. This file contains all
existing versions and their status and is modified whenever a version is
added/updated/removed or when storages are being synchronized.

How conflicts are handled
-------------------------

The RemoteStorage takes in parameter two substorages, one "local" and one "remote".
The "local" storage can be remote, but it will be used for all the requests
like **get()**, **getAttachment()**, **allDocs()**...

Using the document tree, jIO tries to make every version of a document
available on the two storages. When multiple versions of a document exist,
Jio will follow the rule set by the conflict_handling option, given at storage creation.
This option can one of the following numbers:

* 0: no conflict resolution (throws an error when conflict is occuring)
* 1: keep the local state. (overwrites the remote document with local content)
* 2: keep the remote state. (overwrites the local document with remote content)
* 3: keep both copies (leave documents untouched, no signature update)



Simple Conflict Example
-----------------------

.. TODO this is a little confusing

You are keeping a namecard file on your PC updating from your smartphone. Your
smartphone ran out of battery and is offline when you update your namecard on
your PC with your new email adress. Someone else changes this email from your PC
and once your smartphone is recharged, you go back online and the previous
update is executed.

#. Set up the replicate storage:

  .. code-block:: javascript

    var jio_instance = jIO.createJIO({
      // replicate storage
      type: 'replicate',
      local_sub_storage : {
          type: 'local',
          ...
        }
        remote_sub_storage: {
          type: 'dav',
          ...
        }
        conflict_handling: ...
    });


  #. Create the namecard on your smartphone:

   .. code-block:: javascript

     jio_instance.put('myNameCard', {
       email: 'jb@td.com'
      }).then(function (response) {
       // response -> 'myNameCard'
     });

   This will create the document on your WebDAV and local storage

  #. Someone else updates your shared namecard on WebDAV:

   .. code-block:: javascript

     jio_instance.put('myNameCard', {
       email: 'kyle@td.com',
     }).then(function (response) {
       // response -> 'myNameCard'
     });

   Your smartphone is offline, so now you will have one version on
   your smartphone and another version on WebDAV on your PC.

  #. Later, your smartphone is online and you modify your email:

   .. code-block:: javascript

     jio_instance.get('myNameCard').then(function (response) {
       // response.email -> 'jb@td.com'
       // the get() method checks only on your local storage
       // and doesn't warn you about remote modifications.

       return jio_instance.put('myNameCard', {
         email: 'jack@td.com'
       })
      .then(function (response) {
       // response -> 'myNameCard'
     });

| Your latest modification of the email is: "jack@td.com"
| The modification from the other user is: "kyle@td.com"

If your conflict_handling option was:

* | 0: the email is:
  | -"kyle@td.com" on WebDAV
  | -"jack@td.com" on your local storage
  | The storage rejects your latest modification,
  | you get an error because local and remote documents are desynchronized.
  | The documents in local and remote state are left untouched.

* | 1: the email is: "jack@td.com" on both storages
  | The storage pushes the local modification, which is yours.

* | 2: the email is: "kyle@td.com" on both storages
  | The storage keeps the remote modification, which is from the other user.
  | Your local storage is modified to fit the state of the remote storage.

* | 3: the email is: "jack@td.com" on both storages
  | The storage doesn't do synchronization, and pushes your modification
  | without checking if the remote storage has been changed or not
