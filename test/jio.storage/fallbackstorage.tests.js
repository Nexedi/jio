/*
 * Copyright 2021, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */
/*global Blob*/
/*jslint nomen: true */
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    throws = QUnit.throws;
    // frozen_blob = new Blob(["foobar"]);
  console.log(Blob);
/*
  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage404() {
    return this;
  }
  function generate404Error(id) {
    equal(id, "bar", "get 404 called");
    throw new jIO.util.jIOError("Cannot find document", 404);
  }
  Storage404.prototype.get = generate404Error;
  jIO.addStorage('unionstorage404', Storage404);

  function Storage200() {
    return this;
  }
  Storage200.prototype.get = function (id) {
    equal(id, "bar", "get 200 called");
    return {title: "foo"};
  };
  Storage200.prototype.allAttachments = function (id) {
    equal(id, "bar", "allAttachments 200 called");
    return {attachmentname: {}};
  };
  Storage200.prototype.getAttachment = function (id, name) {
    equal(id, "bar", "getAttachment 200 called");
    equal(name, "foo", "getAttachment 200 called");
    return frozen_blob;
  };
  Storage200.prototype.removeAttachment = function (id, name) {
    equal(id, "bar", "removeAttachment 200 called");
    equal(name, "foo", "removeAttachment 200 called");
    return "deleted";
  };
  Storage200.prototype.putAttachment = function (id, name, blob) {
    equal(id, "bar", "putAttachment 200 called");
    equal(name, "foo", "putAttachment 200 called");
    deepEqual(blob, frozen_blob, "putAttachment 200 called");
    return "stored";
  };
  Storage200.prototype.put = function (id, param) {
    equal(id, "bar", "put 200 called");
    deepEqual(param, {"title": "foo"}, "put 200 called");
    return id;
  };
  Storage200.prototype.remove = function (id) {
    equal(id, "bar", "remove 200 called");
    return id;
  };
  Storage200.prototype.post = function (param) {
    deepEqual(param, {"title": "foo"}, "post 200 called");
    return "bar";
  };
  Storage200.prototype.hasCapacity = function () {
    return true;
  };
  Storage200.prototype.buildQuery = function (options) {
    deepEqual(options, {query: 'title: "two"'},
              "buildQuery 200 called");
    return [{
      id: 200,
      value: {
        foo: "bar"
      }
    }];
  };
  Storage200.prototype.repair = function (options) {
    deepEqual(options, {foo: "bar"}, "repair 200 called");
    return "OK";
  };
  jIO.addStorage('unionstorage200', Storage200);

  function Storage200v2() {
    return this;
  }
  Storage200v2.prototype.hasCapacity = function () {
    return true;
  };
  Storage200v2.prototype.buildQuery = function (options) {
    deepEqual(options, {query: 'title: "two"'},
              "buildQuery 200v2 called");
    return [{
      id: "200v2",
      value: {
        bar: "foo"
      }
    }];
  };
  jIO.addStorage('unionstorage200v2', Storage200v2);
*/
  function Storage500() {
    return this;
  }
  function generateError() {
    ok(true, "Error generation called");
    throw new jIO.util.jIOError("manually triggered error");
  }
  Storage500.prototype.get = generateError;
  Storage500.prototype.post = generateError;
  Storage500.prototype.repair = generateError;
  jIO.addStorage('fallbackstorage500', Storage500);

  /////////////////////////////////////////////////////////////////
  // fallbackStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("fallbackStorage.constructor");
  test("initialize storage list", function () {
    expect(5);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "memory"
      },
      fallback_storage: {
        type: "memory"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "memory");
    ok(jio.__storage._fallback_storage instanceof jio.constructor);
    equal(jio.__storage._fallback_storage.__type, "memory");
    equal(jio.__storage._checked, false);
  });

  test("no fallback", function () {
    expect(4);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "memory"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "memory");
    equal(jio.__storage._fallback_storage, undefined);
    equal(jio.__storage._checked, true);
  });

  test("no sub storage", function () {
    throws(
      function () {
        jIO.createJIO({
          type: "fallback",
          fallback_storage: {
            type: "memory"
          }
        });
      },
      function (error) {
        console.warn(error);
        ok(error instanceof TypeError);
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // fallbackStorage.get
  /////////////////////////////////////////////////////////////////
  module("fallbackStorage.get");
  test("first error handling", function () {
    stop();

    expect(5);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "memory"
      },
      fallback_storage: {
        type: "memory"
      }
    }),
      sub_storage = jio.__storage._sub_storage;

    jio.get("bar")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: bar");
        equal(error.status_code, 404);
        equal(jio.__storage._checked, true);
        equal(jio.__storage._sub_storage, sub_storage);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("first success handling", function () {
    stop();

    expect(4);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "memory"
      },
      fallback_storage: {
        type: "memory"
      }
    }),
      sub_storage = jio.__storage._sub_storage,
      doc = {a: 1};

    sub_storage.put("bar", doc)
      .then(function () {
        equal(jio.__storage._checked, false);
        return jio.get("bar");
      })
      .then(function (result) {
        deepEqual(result, doc);
        equal(jio.__storage._checked, true);
        equal(jio.__storage._sub_storage, sub_storage);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("first 500 handling", function () {
    stop();

    expect(6);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "fallbackstorage500"
      },
      fallback_storage: {
        type: "memory"
      }
    }),
      fallback_storage = jio.__storage._fallback_storage;

    jio.get("bar")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: bar");
        equal(error.status_code, 404);
        equal(jio.__storage._checked, true);
        equal(jio.__storage._sub_storage, fallback_storage);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("second 500 handling", function () {
    stop();

    expect(6);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "fallbackstorage500"
      },
      fallback_storage: {
        type: "memory"
      }
    }),
      sub_storage = jio.__storage._sub_storage;
    jio.__storage._checked = true;

    jio.get("bar")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "manually triggered error");
        equal(error.status_code, 500);
        equal(jio.__storage._checked, true);
        equal(jio.__storage._sub_storage, sub_storage);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
