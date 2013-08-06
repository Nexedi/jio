/*jslint indent: 2, maxlen: 80 */
/*global require */

(function () {
  "use strict";

  require.config({
    "paths": {
      "md5": "../lib/md5/md5",
      "sha256": "../lib/jsSha2/sha256",
      "complex_queries": "../complex_queries",
      "complex_queries_tests": "queries/tests",
      "jio": "../jio",
      "jio_tests": "jio/tests",
      "localstorage": "../src/jio.storage/localstorage",
      "localstorage_tests": "jio.storage/localstorage.tests",
      "revisionstorage": "../src/jio.storage/revisionstorage",
      "revisionstorage_tests": "jio.storage/revisionstorage.tests",

      "qunit": "../lib/qunit/qunit",
      "sinon": "../lib/sinon/sinon",
      "sinon_qunit": "../lib/sinon/sinon-qunit"
    },
    "shim": {
      "md5": {"exports": "hex_md5"},
      "sha256": {"exports": "hex_sha256"},

      "sinon": ["qunit"],
      "sinon_qunit": ["sinon"]
    }
  });

  require([
    "sinon_qunit",
    "complex_queries_tests",
    "jio_tests",
    "localstorage_tests",
    "revisionstorage_tests"
  ]);
}());
