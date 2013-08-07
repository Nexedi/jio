/*jslint indent: 2, maxlen: 80 */
/*global require */

(function () {
  "use strict";

  require.config({
    "paths": {
      "md5": "../lib/md5/md5",
      "sha256": "../lib/jsSha2/sha256",
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

      "qunit": "../lib/qunit/qunit",
      "sinon": "../lib/sinon/sinon",
      "sinon_qunit": "../lib/sinon/sinon-qunit"
    },
    "shim": {
      "md5": {"exports": "hex_md5"},
      "sha256": {"exports": "hex_sha256"},
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
    "davstorage_tests",
  ]);
}());
