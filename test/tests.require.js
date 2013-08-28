/*jslint indent: 2, maxlen: 80, nomen : true */
/*global require */

(function () {
  "use strict";

  require.config({
    "paths": {
      "sha256":      "../src/sha256.amd",
      "jio":         "../jio",
      "jio_tests":   "jio/tests",

      "test_util":   "jio/util",
      "fakestorage": "jio/fakestorage",

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
    "jio_tests"
  ]);
}());
