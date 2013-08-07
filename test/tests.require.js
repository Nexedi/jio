/*jslint indent: 2, maxlen: 80 */
/*global require */

(function () {
  "use strict";

  require.config({
    "paths": {
      "md5": "../lib/md5/md5.amd",
      "sha1": "../lib/jsSha1/sha1.amd",
      "sha256": "../lib/jsSha2/sha256.amd",
      "jquery": "../lib/jquery/jquery.min",
      "complex_queries": "../complex_queries",
      "complex_queries_tests": "queries/tests",
      "jio": "../jio",
      "jio_tests": "jio/tests",
      "localstorage": "../src/jio.storage/localstorage",
      "localstorage_tests": "jio.storage/localstorage.tests",
      "revisionstorage": "../src/jio.storage/revisionstorage",
      "revisionstorage_tests": "jio.storage/revisionstorage.tests",
      "replicaterevisionstorage": "../src/jio.storage/replicaterevisionstorage",
      "replicaterevisionstorage_tests": "jio.storage/" +
        "replicaterevisionstorage.tests",
      "davstorage": "../src/jio.storage/davstorage",
      "davstorage_tests": "jio.storage/davstorage.tests",
      "indexstorage": "../src/jio.storage/indexstorage",
      "indexstorage_tests": "jio.storage/indexstorage.tests",
      "splitstorage": "../src/jio.storage/splitstorage",
      "splitstorage_tests": "jio.storage/splitstorage.tests",
      "gidstorage": "../src/jio.storage/gidstorage",
      "gidstorage_tests": "jio.storage/gidstorage.tests",
      "xwikistorage": "../src/jio.storage/xwikistorage",
      "xwikistorage_tests": "jio.storage/xwikistorage.tests",
      "s3storage": "../src/jio.storage/s3storage",
      "s3storage_tests": "jio.storage/s3storage.tests",

      "qunit": "../lib/qunit/qunit",
      "sinon": "../lib/sinon/sinon",
      "sinon_qunit": "../lib/sinon/sinon-qunit"
    },
    "shim": {
      "jquery": {"exports": "jQuery"},

      "sinon": ["qunit"],
      "sinon_qunit": ["sinon"]
    }
  });

  require([
    "sinon_qunit",
    "complex_queries_tests",
    "jio_tests",
    "localstorage_tests",
    "revisionstorage_tests",
    "replicaterevisionstorage_tests",
    "indexstorage_tests",
    "splitstorage_tests",
    "gidstorage_tests",
    "davstorage_tests",
    "xwikistorage_tests",
    "s3storage_tests",
  ]);
}());
