/*jslint indent: 2, maxlen: 80, nomen : true */
/*global require */

(function () {
  "use strict";

  require.config({
    "paths": {
      "rsvp":       "../lib/rsvp/rsvp-custom.amd",
      "sha256":      "../src/sha256.amd",
      "jio":         "../jio",
      "jio_tests":   "jio/tests",

      "test_util":   "jio/util",
      "fakestorage": "jio/fakestorage",

      "jioquery_tests": "queries/tests",

      "localstorage":       "../src/jio.storage/localstorage",
      "localstorage_tests": "jio.storage/localstorage.tests",

      "davstorage":       "../src/jio.storage/davstorage",
      "davstorage_tests": "jio.storage/davstorage.tests",

      "indexstorage":       "../src/jio.storage/indexstorage",
      "indexstorage_tests": "jio.storage/indexstorage.tests",

      "gidstorage":       "../src/jio.storage/gidstorage",
      "gidstorage_tests": "jio.storage/gidstorage.tests",

      "revisionstorage":       "../src/jio.storage/revisionstorage",
      "revisionstorage_tests": "jio.storage/revisionstorage.tests",

      "replicaterevisionstorage":
        "../src/jio.storage/replicaterevisionstorage",
      "replicaterevisionstorage_tests":
        "jio.storage/replicaterevisionstorage.tests",

      "splitstorage":       "../src/jio.storage/splitstorage",
      "splitstorage_tests": "jio.storage/splitstorage.tests",

      "replicatestorage":       "../src/jio.storage/replicatestorage",
      "replicatestorage_tests": "jio.storage/replicatestorage.tests",

      "qunit":       "../lib/qunit/qunit",
      "sinon":       "../lib/sinon/sinon",
      "sinon_qunit": "../lib/sinon/sinon-qunit"
    },
    "shim": {
      "sinon":       ["qunit"],
      "sinon_qunit": ["sinon"]
    }
  });

  require([
    "sinon_qunit",
    "jio_tests",
    "jioquery_tests",
    "localstorage_tests",
    "davstorage_tests",
    "indexstorage_tests",
    "gidstorage_tests",
    "revisionstorage_tests",
    "replicaterevisionstorage_tests",
    "splitstorage_tests",
    "replicatestorage_tests"
  ]);
}());
