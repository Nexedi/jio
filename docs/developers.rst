For developers
==============

Quick start
-----------

The source repository includes ready-to-use files, so in case you do
not want to build jIO yourself, just use *jio.js* as well as *complex_queries.js*
plus the storages and dependencies you need and you will be good to go.

If you want to modify or build jIO yourself, you need to

* Clone from a repository

  ``$ git clone https://github.com/nexedi/jio.git``

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

Create 10 methods: ``post``, ``put``, ``putAttachment``, ``get``, ``getAttachment``,
``remove``, ``removeAttachment``, ``allDocs``, ``check`` and ``repair``.

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

The first parameter command provides some methods to act on the jIO job:

* ``success``, to tell jIO that the job is successfully terminated

  ``command.success(status[Text], [{custom key to add to the response}]);``

* ``resolve``, is equal to success

* ``error``, to tell jIO that the job cannot be done

  ``command.error(status[Text], [reason], [message], [{custom key to add to the response}])``

* ``retry``, to tell jIO that the job cannot be done now, but can be retried later. (same API than error)

* ``reject``, to tell jIO that the job cannot be done, let jIO to decide whether to retry or not. (same API than error)


The second parameter ``metadata`` or ``param`` is the first parameter provided by the jIO user.

The third parameter ``option`` is the option parameter provided by the jIO user.

Methods should return the following objects:

* **post()** --> ``success("created", {"id": new_generated_id})``

* **put()**, **remove()**, **putAttachment()** or **removeAttachment()** --> ``success(204)``

* **get()** --> ``success("ok", {"data": document_metadata})``

* **getAttachment()** -->

  .. code-block:: javascript

    success("ok", {"data": binary_string, "content_type": content_type})
    // or
    success("ok", {"data": new Blob([data], {"type": content_type})})

* **allDocs()** --> ``success("ok", {"data": row_object})``

* **check()** -->

  .. code-block:: javascript

    // if metadata provides "_id" -> check document state
    // if metadata doesn't promides "_id" -> check storage state
    success("no_content")
    // or
    error("conflict", "corrupted", "incoherent document or storage")

* **repair()** -->

  .. code-block:: javascript

    // if metadata provides "_id" -> repair document state
    // if metadata doesn't promides "_id" -> repair storage state
    success("no_content")
    // or
    error("conflict", "corrupted", "impossible to repair document or storage")
    // DON'T DESIGN STORAGES IF THERE IS NO WAY
    // TO REPAIR INCOHERENT STATES

After creating all methods, your storage must be added to jIO. This is done
with the ``jIO.addStorage()`` method, which requires two parameters: the storage
type (string) and a constructor (function). It is called like this:

.. code-block:: javascript

    // add custom storage to jIO
    jIO.addStorage('mystoragetype', MyStorage);


Please refer to *localstorage.js* implementation for a good example on how to
setup a storage and what methods are required.

Also keep in mind that jIO is a job-based library: whenever you trigger a method,
a job is created, which will later return a response, after being processed.

Job rules
---------

The jIO job manager follows several rules set at the creation of a new jIO
instance. When you try to call a method, jIO will create a job and will make
sure the job is really necessary and will be executed. Thanks to these job
rules, jIO knows what to do with the new job before adding it to the queue. You
can also add your own rules, as we're going to see now.

These are the jIO **default rules**:

.. code-block:: javascript

    var jio_instance = jIO.createJIO(storage_description, {
      "job_rules": [{
        "code_name": "readers update",
        "conditions": [
          "sameStorageDescription",
          "areReaders",
          "sameMethod",
          "sameParameters",
          "sameOptions"
        ],
        "action": "update"
      }, {
        "code_name": "metadata writers update",
        "conditions": [
          "sameStorageDescription",
          "areWriters",
          "useMetadataOnly",
          "sameMethod",
          "haveDocumentIds",
          "sameParameters"
        ],
        "action": "update"
      }, {
        "code_name": "writers wait",
        "conditions": [
          "sameStorageDescription",
          "areWriters",
          "haveDocumentIds",
          "sameDocumentId"
        ],
        "action": "wait"
      }]
    });


The following actions can be used:

* ``ok`` - accept the job
* ``wait`` - wait until the end of the selected job
* ``update`` - bind the selected job to this one
* ``deny`` - reject the job

The following condition functions can be used:

* ``sameStorageDescription`` - check if the storage descriptions are different.
* ``areWriters`` - check if the commands are ``post``, ``put``, ``putAttachment``, ``remove``, ``removeAttachment``, or ``repair``.
* ``areReaders`` - check if the commands are ``get``, ``getAttachment``, ``allDocs`` or ``check``.
* ``useMetadataOnly`` - check if the commands are ``post``, ``put``, ``get``, ``remove`` or ``allDocs``.
* ``sameMethod`` - check if the commands are equal.
* ``sameDocumentId`` - check if the document ids are equal.
* ``sameParameters`` - check if the metadata or param are equal (deep comparison).
* ``sameOptions`` - check if the command options are equal.
* ``haveDocumentIds`` - test if the two commands contain document ids.

Create Job Condition
--------------------

You can create two types of function: job condition, and job comparison.

.. code-block:: javascript

    // Job Condition
    // Check if the job is a get command

    jIO.addJobRuleCondition("isGetMethod", function (job) {
      return job.method === 'get';
    });


    // Job Comparison
    // Check if the jobs have the same 'title' property
    // only if they are strings

    jIO.addJobRuleCondition("sameTitleIfString",
        function (job, selected_job) {
          if (typeof job.kwargs.title === 'string' &&
              typeof selected_job.kwargs.title === 'string') {
            return job.kwargs.title === selected_job.kwargs.title;
          }
          return false;
        });


Add job rules
-------------

You just have to define job rules in the jIO options:

.. code-block:: javascript

    // Do not accept to post or put a document which title is equal
    // to another already running post or put document title

    var jio_instance = jIO.createJIO(storage_description, {
      "job_rules": [{
        "code_name": "avoid similar title",
        "conditions": [
          "sameStorageDescription",
          "areWriters",
          "sameTitleIfString"
        ],
        "action": "deny",
        "before": "writers update" // optional
        // "after": also exists
      }]
    });


Clear/Replace default job rules
-------------------------------

If a job's ``code_name`` is equal to ``readers update``, then adding this rule will replace it:

.. code-block:: javascript

    var jio_instance = jIO.createJIO(storage_description, {
      "job_rules": [{
        "code_name": "readers update",
        "conditions": [
          "sameStorageDescription",
          "areReaders",
          "sameMethod",
          "haveDocumentIds"
          "sameParameters"
          // sameOptions is removed
        ],
        "action": "update"
      }]
    });

Or you can just clear all rules before adding new ones:

.. code-block:: javascript

    var jio_instance = jIO.createJIO(storage_description, {
      "clear_job_rules": true,
      "job_rules": [{
        // ...
      }]
    });

