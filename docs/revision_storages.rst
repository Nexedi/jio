Revision Storages: Conflicts and Resolution
===========================================


Why Conflicts can Occur
-----------------------

Using jIO you can store documents in multiple locations. With an
increasing number of users working on a document and some storages not being
available or responding too slow, conflicts are more likely to occur. jIO
defines a conflict as multiple versions of a document existing in a storage
tree and a user trying to save on a version that does not match the latest
version of the document.

To keep track of document versions a revision storage must be used. When doing
so, jIO creates a document tree file for every document. This file contains all
existing versions and their status and is modified whenever a version is
added/updated/removed or when storages are being synchronized.

How to solve conflicts
----------------------

Using the document tree, jIO tries to make every version of a document
available on every storage. When multiple versions of a document exist, jIO
will select the **latest**, **left-most** version on the document tree, along with the
conflicting versions (when option **conflicts: true** is set in order for
developers to setup a routine to solve conflicts.

Technically, a conflict is solved by deleting alternative versions of a document
("cutting leaves off from the document tree"). When a user decides to keep a
version of a document and manually deletes all conflicting versions, the
storage tree is updated accordingly and the document is available in a single
version on all storages.

Simple Conflict Example
-----------------------

.. TODO this is a little confusing

You are keeping a namecard file on your PC updating from your smartphone. Your
smartphone ran out of battery and is offline when you update your namecard on
your PC with your new email adress. Someone else changes this email from your PC
and once your smartphone is recharged, you go back online and the previous
update is executed.

#. Set up the storage tree:

  .. code-block:: javascript

    var jio_instance = jIO.createJIO({
      // replicate revision storage
      type: 'replicaterevision',
      storagelist:[{
        type: 'revision',
        sub_storage: {
          type: 'dav',
          ...
        }
      }, {
        type: 'revision',
        sub_storage: {
          type: 'local',
          ...
        }
      }]
    });


#. Create the namecard on your smartphone:

   .. code-block:: javascript

     jio_instance.post({
       _id: 'myNameCard',
       email: 'me@web.com'
      }).then(function (response) {
       // response.id -> 'myNameCard'
       // response.rev -> '1-5782E71F1E4BF698FA3793D9D5A96393'
     });

   This will create the document on your WebDAV and local storage

#. Someone else updates your shared namecard on WebDAV:

   .. code-block:: javascript

     jio_instance.put({
       email: 'my_new_me@web.com',
       _id: 'myNameCard'
       _rev: '1-5782E71F1E4BF698FA3793D9D5A96393'
     }).then(function (response) {
       // response.id -> 'myNameCard'
       // response.rev -> '2-068E73F5B44FEC987B51354DFC772891'
     });

   Your smartphone is offline, so now you will have one version (1-578...) on
   your smartphone and another version on WebDAV (2-068...) on your PC.

#. You modify the namecard while being offline:

   .. code-block:: javascript

     jio_instance.get({_id: 'myNameCard'}).then(function (response) {
       // response.id -> 'myNameCard'
       // response.rev -> '1-5782E71F1E4BF698FA3793D9D5A96393'
       // response.data.email -> 'me@web.com'

       return jio_instance.put({
         _id: 'myNameCard',
         email: 'me_again@web.com'
       });

     }).then(function (response) {
       // response.id -> 'myNameCard'
       // response.rev -> '2-3753476B70A49EA4D8C9039E7B04254C'
     });


#. Later, your smartphone is online and you retrieve the other version of the namecard:

   .. code-block:: javascript

     jio_instance.get({_id: 'myNameCard'}).then(function (response) {
       // response.id -> 'myNameCard'
       // response.rev -> '2-3753476B70A49EA4D8C9039E7B04254C'
       // response.data.email -> 'me_again@web.com'
     });

   When multiple versions of a document are available, jIO returns the latest,
   left-most version on the document tree (2-375... and labels all other
   versions as conflicting 2-068...).

#. Retrieve conflicts by setting option:

   .. code-block:: javascript

     jio_instance.get({_id: 'myNameCard'}, {
       conflicts: true
     }).then(function (response) {
       // response.id -> 'myNameCard'
       // response.rev -> '2-3753476B70A49EA4D8C9039E7B04254C',
       // response.conflicts -> ['2-068E73F5B44FEC987B51354DFC772891']
     });

   The conflicting version (*2-068E...*) is displayed, because **{conflicts: true}** was
   specified in the GET call. Deleting either version will solve the conflict.

#. Delete the conflicting version:

   .. code-block:: javascript

     jio_instance.remove({
       _id: 'myNameCard',
       _rev: '2-068E73F5B44FEC987B51354DFC772891'
     }).then(function (response) {
       // response.id -> 'myNameCard'
       // response.rev -> '3-28910A4937537B5168E772896B70EC98'
     });

   When deleting the conflicting version of your namecard, jIO removed it
   from all storages and set the document tree leaf of that version to
   *deleted*. All storages now contain just a single version of the namecard
   (2-3753...). Note that, on the document tree, removing a revison will
   create a new revision with status set to *deleted*.

