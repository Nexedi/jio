/*jslint indent: 2, maxlen: 80 */
/*global require */

(function () {
  "use strict";

  require.config({
    "paths": {
      "md5": "../lib/md5/md5",
      "complex_queries": "../complex_queries",
      "jio": "../jio",
      "jio_tests": "jio/tests",
      "localstorage": "../src/jio.storage/localstorage",
      "localstorage_tests": "jio.storage/localstorage.tests",

      "qunit": "../lib/qunit/qunit",
      "sinon": "../lib/sinon/sinon",
      "sinon_qunit": "../lib/sinon/sinon-qunit"
    },
    "shim": {
      "md5": {"exports": "hex_md5"},
      "localstorage": ["jio", "complex_queries"],

      "sinon": ["qunit"],
      "sinon_qunit": ["sinon"]
    }
  });

  require([
    "sinon_qunit",
    "jio_tests",
    "localstorage_tests"
  ]);
}());
