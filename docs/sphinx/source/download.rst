
.. _download-fork:

Downloads
=========

Core:

* `[sha256.amd.js] <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha256.amd.js>`_
* `[rsvp-custom.js] <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/lib/rsvp/rsvp-custom.js>`_, AMD only version [`rsvp-custom.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/lib/rsvp/rsvp-custom.amd.js>`_]
* jIO, `[jio.js] <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/jio.js>`_
* complex_queries, `[complex_queries.js] <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/complex_queries.js>`_

Storage dependencies:

* `jQuery <http://jquery.com/>`_, `[jquery.js] <http://code.jquery.com/jquery.js>`_
* `sjcl <https://crypto.stanford.edu/sjcl/>`_, `[sjcl.zip] <https://crypto.stanford.edu/sjcl/sjcl.zip>`_
* `sha1 <http://pajhome.org.uk/crypt/md5/sha1.html>`_, `[sha1.js] <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/lib/jsSha1/sha1.js>`_, AMD compatible version [`sha1.amd.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha1.amd.js>`_]
* `sha2, sha256 <http://anmar.eu.org/projects/jssha2/>`_, `[jssha2.zip] <http://anmar.eu.org/projects/jssha2/files/jssha2-0.3.zip>`_, AMD compatible versions `[sha2.amd.js] <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha2.amd.js>`_ `[sha256.amd.js] <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/sha256.amd.js>`_

Storage connectors:

* `localstorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/localstorage.js>`_
* `davstorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/davstorage.js>`_
* `s3storage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/s3storage.js>`_ (depends on sha1, jQuery) (WIP)
* `xwikistorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/xwikistorage.js>`_ (depends on jQuery) (WIP)
* `erp5storage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/erp5storage.js>`_ (depends on jQuery) (WIP)
* restsqlstorage.js (depends on jQuery) (WIP)
* mioga2storage.js (depends on jQuery) (WIP)

Storage handlers:

* `indexstorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/indexstorage.js>`_ (WIP)
* `gidstorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/gidstorage.js>`_ (WIP)
* `splitstorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/splitstorage.js>`_ (WIP)
* replicatestorage.js (WIP)

Revision based storage handlers:

* `revisionstorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/revisionstorage.js>`_ (depends on sha256) (WIP)
* `replicaterevisionstorage.js <http://git.erp5.org/gitweb/jio.git/blob_plain/refs/heads/master:/src/jio.storage/replicatestorage.js>`_ (WIP)

Minified version
----------------

To get the minified version of the jIO library, you have to build it yourself. See documentation.

Fork
----

jIO source code

===============================================  =============================================  ==========================================  =======================================
Clone (read only)                                 Git Erp5                                      Gitorious                                   Github
``git clone http://git.erp5.org/repos/jio.git``   `View <http://git.erp5.org/gitweb/jio.git>`_  `View <https://gitorious.org/nexedi/jio>`_  `View <https://github.com/nexedi/jio>`_
===============================================  =============================================  ==========================================  =======================================


