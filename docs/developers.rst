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

Your storage must be added to jIO. This is done
with the ``jIO.addStorage()`` method, which requires two parameters: the storage
type (string) and a constructor (function). It is called like this:

.. code-block:: javascript

    // add custom storage to jIO
    jIO.addStorage('mystoragetype', MyStorage);


Please refer to *localstorage.js* implementation for a good example on how to
setup a storage and what methods are required.
