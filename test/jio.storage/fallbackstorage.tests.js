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
/*jslint nomen: true */
(function (jIO, QUnit) {
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

  function Storage400() {
    return this;
  }
  function generateError400() {
    ok(true, "Error generation 400 called");
    throw new jIO.util.jIOError("manually triggered error", 400);
  }
  Storage400.prototype.put = generateError400;
  jIO.addStorage('fallbackstorage400', Storage400);

  function Storage500() {
    return this;
  }
  function generateError500() {
    ok(true, "Error generation 500 called");
    throw new jIO.util.jIOError("manually triggered error");
  }
  Storage500.prototype.get = generateError500;
  Storage500.prototype.put = generateError500;
  jIO.addStorage('fallbackstorage500', Storage500);

  function StorageCapacity(spec) {
    this.hasCapacity = spec.hasCapacity;
    return this;
  }
  jIO.addStorage('fallbackcapacity', StorageCapacity);

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
        equal(jio.__storage._current_storage, sub_storage);
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
        equal(jio.__storage._current_storage, sub_storage);
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
        equal(jio.__storage._current_storage, fallback_storage);
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
        equal(jio.__storage._current_storage, sub_storage);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // fallbackStorage.put
  /////////////////////////////////////////////////////////////////
  module("fallbackStorage.put");
  test("first error handling", function () {
    stop();

    expect(6);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "fallbackstorage400"
      },
      fallback_storage: {
        type: "memory"
      }
    }),
      doc = {a: 1},
      sub_storage = jio.__storage._sub_storage;

    jio.put("bar", doc)
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "manually triggered error");
        equal(error.status_code, 400);
        equal(jio.__storage._checked, true);
        equal(jio.__storage._current_storage, sub_storage);
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

    expect(3);
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

    jio.put("bar", doc)
      .then(function (result) {
        deepEqual(result, "bar");
        equal(jio.__storage._checked, true);
        equal(jio.__storage._current_storage, sub_storage);
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

    expect(4);
    var jio = jIO.createJIO({
      type: "fallback",
      sub_storage: {
        type: "fallbackstorage500"
      },
      fallback_storage: {
        type: "memory"
      }
    }),
      doc = {a: 1},
      fallback_storage = jio.__storage._fallback_storage;

    jio.put("bar", doc)
      .then(function (result) {
        equal(result, "bar");
        equal(jio.__storage._checked, true);
        equal(jio.__storage._current_storage, fallback_storage);
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
      doc = {a: 1},
      sub_storage = jio.__storage._sub_storage;
    jio.__storage._checked = true;

    jio.put("bar", doc)
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "manually triggered error");
        equal(error.status_code, 500);
        equal(jio.__storage._checked, true);
        equal(jio.__storage._current_storage, sub_storage);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // fallbackStorage.other
  /////////////////////////////////////////////////////////////////
  // XXX test other methods which uses exactly the same code

  /////////////////////////////////////////////////////////////////
  // fallbackStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("fallbackStorage.hasCapacity");
  test("is a logic and", function () {

    expect(19);
    var capacity1,
      capacity2,
      jio = jIO.createJIO({
        type: "fallback",
        sub_storage: {
          type: "fallbackcapacity",
          hasCapacity: function (name) {
            ok(true, name + ' capacity1 called');
            return capacity1;
          }
        },
        fallback_storage: {
          type: "fallbackcapacity",
          hasCapacity: function (name) {
            ok(true, name + ' capacity2 called');
            return capacity2;
          }
        }
      });

    capacity1 = capacity2 = true;
    equal(jio.hasCapacity('1&&1'), true);

    capacity1 = capacity2 = false;
    throws(
      function () {
        jio.hasCapacity('0&&0');
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(
          error.message,
          "Capacity '0&&0' is not implemented on 'fallbackcapacity'"
        );
        equal(error.status_code, 501);
        return true;
      }
    );

    capacity1 = false;
    capacity2 = true;
    throws(
      function () {
        jio.hasCapacity('0&&1');
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(
          error.message,
          "Capacity '0&&1' is not implemented on 'fallbackcapacity'"
        );
        equal(error.status_code, 501);
        return true;
      }
    );

    capacity1 = true;
    capacity2 = false;
    throws(
      function () {
        jio.hasCapacity('1&&0');
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(
          error.message,
          "Capacity '1&&0' is not implemented on 'fallbackcapacity'"
        );
        equal(error.status_code, 501);
        return true;
      }
    );
  });

}(jIO, QUnit));