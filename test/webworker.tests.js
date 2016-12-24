/*global self, QUnit, qunitTap, importScripts*/
var global = self,
  window = self;
(function (self) {
  "use strict";
  self.DOMParser = {};
  self.DOMError = {};
  self.sessionStorage = {};
  self.localStorage = {};
  self.openDatabase = {};

  importScripts(
    "../node_modules/rsvp/dist/rsvp-2.0.4.js",
    "../dist/jio-latest.js"
  );
  self.exports = self;
  importScripts("../node_modules/qunitjs/qunit/qunit.js");
  self.exports = undefined;
  //QUnit.config.autorun = false;
  //QUnit.config.testTimeout = 5000;
  importScripts("../node_modules/sinon/pkg/sinon.js");

  importScripts("../node_modules/qunit-tap/lib/qunit-tap.js");

  qunitTap(QUnit, function (data) {
    self.postMessage(JSON.stringify({
      method: 'tap',
      data: data
    }));
  });

  function createCallback(logType) {
    QUnit[logType](function (data) {
      self.postMessage(JSON.stringify({
        method: logType,
        data: data
      }));
    });
  }

  var i,
    logs = [
      "begin",
      "testStart",
      "testDone",
      "log",
      "moduleStart",
      "moduleDone",
      "done"
    ];
  for (i = 0; i < logs.length; i += 1) {
    createCallback(logs[i]);
  }

  // queries/key.tests.js needs it
  //self.module = QUnit.module;
  //self.test = QUnit.test;
  //self.stop = QUnit.stop;
  //self.start = QUnit.start;
  //self.ok = QUnit.ok;
  //self.expect = QUnit.expect;
  //self.deepEqual = QUnit.deepEqual;
  //self.equal = QUnit.equal;

  importScripts(
    //"jio/util.js",
    //"queries/key.tests.js",
    //"queries/key-schema.tests.js",
    //"queries/tests.js",
    //"queries/key-typechecks.tests.js",
    //"queries/jiodate.tests.js",
    //"queries/key-jiodate.tests.js",
    //"jio.storage/querystorage.tests.js",
    //"jio.storage/uuidstorage.tests.js",
    //"jio.storage/replicatestorage.tests.js",
    //"jio.storage/unionstorage.tests.js",
    //"jio.storage/shastorage.tests.js",
    //"jio.storage/cryptstorage.tests.js",
    //"jio.storage/zipstorage.tests.js",
    "jio.storage/indexeddbstorage.tests.js"
  );

  QUnit.load();
}(self));