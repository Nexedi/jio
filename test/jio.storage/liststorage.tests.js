/*
 * Copyright 2019, Nexedi SA
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
/*global Blob*/
(function (jIO, QUnit) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    ok = QUnit.ok,
    start = QUnit.start,
    equal = QUnit.equal,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function DummyStorage() {
    return this;
  }
  jIO.addStorage('dummystorage1', DummyStorage);

  /////////////////////////////////////////////////////////////////
  // ListStorage constructor
  /////////////////////////////////////////////////////////////////

  module("ListStorage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    });
    equal(jio.__type, "list");
    equal(jio.__storage._sub_storage.__type, "dummystorage1");
    equal(jio.__storage._sub_storage_index.constructor.name, "Set");
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.get
  /////////////////////////////////////////////////////////////////

  module("ListStorage.get");

  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    });

    DummyStorage.prototype.get = function (id) {
      equal(id, "1");
      return {"name": "test_name"};
    };

    jio.get("1")
      .then(function (result) {
        deepEqual(result, {
          "name": "test_name"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("ListStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    });

    DummyStorage.prototype.allAttachments = function (id) {
      equal(id, "1");
      return {attachmentname: {}};
    };

    jio.allAttachments("1")
      .then(function (result) {
        deepEqual(result, {
          attachmentname: {}
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.post
  /////////////////////////////////////////////////////////////////
  module("ListStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    });

    DummyStorage.prototype.post = function (param) {
      deepEqual(param, {"name": "test_name"});
      return "posted";
    };

    jio.post({"name": "test_name"})
      .then(function (result) {
        equal(result, "posted");
        equal(jio.__storage._sub_storage_index.has("posted"), true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.put
  /////////////////////////////////////////////////////////////////
  module("ListStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    });
    DummyStorage.prototype.put = function (id, param) {
      equal(id, "1");
      deepEqual(param, {"name": "test_name"});
      return id;
    };

    jio.put("1", {"name": "test_name"})
      .then(function (result) {
        equal(result, "1");
        equal(jio.__storage._sub_storage_index.has("1"), true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.remove
  /////////////////////////////////////////////////////////////////
  module("ListStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(5);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    });
    DummyStorage.prototype.remove = function (id) {
      deepEqual(id, "1");
      return id;
    };
    DummyStorage.prototype.put = function (id) {
      return id;
    };

    jio.put("1", {"name": "test_name"})
      .then(function (result) {
        equal(result, "1");
        equal(jio.__storage._sub_storage_index.has("1"), true);
        jio.remove("1")
          .then(function (result) {
            equal(result, "1");
            equal(jio.__storage._sub_storage_index.has("1"), false);
          })
          .fail(function (error) {
            ok(false, error);
          })
          .always(function () {
            start();
          });
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("ListStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    }),
      blob = new Blob([""]);

    DummyStorage.prototype.getAttachment = function (id, name) {
      equal(id, "1");
      equal(name, "test_name");
      return blob;
    };

    jio.getAttachment("1", "test_name")
      .then(function (result) {
        equal(result, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("ListStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    }),
      blob = new Blob([""]);

    DummyStorage.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "1");
      equal(name, "test_name");
      deepEqual(blob2, blob);
      return "OK";
    };

    jio.putAttachment("1", "test_name", blob)
      .then(function (result) {
        equal(result, "OK");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("ListStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "list",
      sub_storage: {
        type: "dummystorage1"
      }
    });

    DummyStorage.prototype.removeAttachment = function (id, name) {
      equal(id, "1");
      equal(name, "test_name");
      return "removed";
    };

    jio.removeAttachment("1", "test_name")
      .then(function (result) {
        equal(result, "removed");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ListStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("ListStorage.hasCapacity");
  test("list capacity is implemented", function () {

    var jio = jIO.createJIO({
        type: "list",
        sub_storage: {
          type: "dummystorage1"
        }
      });

    DummyStorage.prototype.hasCapacity = function () {
      return false;
    };

    ok(jio.hasCapacity("list"));
  });

}(jIO, QUnit));