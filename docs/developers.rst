For developers
==============

Quick start
-----------

The source repository includes ready-to-use files, so in case you do
not want to build jIO yourself, just use *sha256.amd.js*, *rsvp.js*, *jio.js*
plus the storages and dependencies you need and you will be good to go.

If you want to modify or build jIO yourself, you need to

* Clone from a repository

  ``$ git clone https://lab.nexedi.com/nexedi/jio.git``

* Install `NodeJS <http://nodejs.org/>`_ (including ``npm``)

* Install the Grunt command line with ``npm``.

  ``# npm -g install grunt-cli``

* Install the dependencies.

  ``$ npm install``

* Compile the JS/CC parser.

  ``$ make`` (until we find out how to compile it with grunt)

* Run build.

  ``$ grunt``


Naming Conventions
------------------

All the code follows this :ref:`JavaScript Style Guide <style-guide>`.

How to design your own jIO Storage Library
------------------------------------------

Create a constructor:

.. code-block:: javascript

    function MyStorage(storage_description) {
      this._value = storage_description.value;
      if (typeof this._value !== 'string') {
        throw new TypeError("'value' description property " +
                            "is not a string");
      }
    }

Create 9 methods: ``post``, ``put``, ``putAttachment``, ``get``, ``getAttachment``,
``remove``, ``removeAttachment``, ``allDocs``. ``repair`` method is optional.

.. code-block:: javascript

    MyStorage.prototype.post = function(command, metadata, option) {
      var document_id = metadata._id;
      // [...]
    };

    MyStorage.prototype.get = function(command, param, option) {
      var document_id = param._id;
      // [...]
    };

    MyStorage.prototype.putAttachment = function(command, param, option) {
      var document_id = param._id;
      var attachment_id = param._attachment;
      var attachment_data = param._blob;
      // [...]
    };

    // [...]



(To help you design your methods, some tools are provided by jIO.util.)

The second parameter ``metadata`` or ``param`` is the first parameter provided by the jIO user.

The third parameter ``option`` is the option parameter provided by the jIO user.

Methods should return:

* **post()**, **put()**, **remove()** --> id of the document affected (string)

* **putAttachment()** or **removeAttachment()** --> no specific value

* **get()** --> document_metadata (object)

* **getAttachment()** -->

  .. code-block:: javascript

    new Blob([data], {"type": content_type})

* **allDocs()** --> list of all documents (restricted by a query, if given). (object)


After creating all methods, your storage must be added to jIO. This is done
with the ``jIO.addStorage()`` method, which requires two parameters: the storage
type (string) and a constructor (function). It is called like this:

.. code-block:: javascript

    // add custom storage to jIO
    jIO.addStorage('mystoragetype', MyStorage);


Please refer to *localstorage.js* implementation for a good example on how to
setup a storage and what methods are required.
