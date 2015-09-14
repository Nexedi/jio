/*jslint nomen: true*/
/*global Blob, LZString*/
(function (jIO, QUnit, Blob, LZString) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    throws = QUnit.throws,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('zipstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // ZipStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });
    equal(jio.__type, "zip");
    equal(jio.__storage._sub_storage.__type, "zipstorage200");
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.get
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.post
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    Storage200.prototype.post = function (id) {
      equal(id, "bar", "post 200 called");
      return {title: "foo"};
    };

    jio.post("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.put
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    Storage200.prototype.put = function (id) {
      equal(id, "bar", "put 200 called");
      return {title: "foo"};
    };

    jio.put("bar")
      .then(function (result) {
        equal(result, "bar");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.remove
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    Storage200.prototype.remove = function (id) {
      equal(id, "bar", "remove 200 called");
      return {title: "foo"};
    };

    jio.remove("bar")
      .then(function (result) {
        equal(result, "bar");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    delete Storage200.prototype.hasCapacity;

    throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'foo' is not implemented on 'zipstorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.buildQuery");
  test("buildQuery called substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    Storage200.prototype.buildQuery = function (id) {
      equal(id, "bar", "buildQuery 200 called");
      return {title: "foo"};
    };

    jio.buildQuery("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return {title: "foo"};
    };

    jio.removeAttachment("bar", "foo")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "zip",
      sub_storage: {type : "zipstorage200"}
    });

    Storage200.prototype.allAttachments = function (id) {
      equal(id, "bar", "allAttachments 200 called");
      return {title: "foo"};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.getAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zip",
        sub_storage: {type : "zipstorage200"}
      });
    }
  });

  test("return substorage getattachment", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo']);

    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(3);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        equal(result, blob, "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("return substorage getattachment if uncompress fails", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo'], {type: 'application/x-utf16_lz_string'});

    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(3);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        equal(result, blob, "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("return substorage getattachment if not data url", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob([LZString.compressToUTF16('foo')],
                       {type: 'application/x-utf16_lz_string'});

    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(3);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        equal(result, blob, "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("uncompress blob lz-string mime type", function () {
    var id = "/",
      attachment = "stringattachment",
      value = "azertyuio\npàç_è-('é&",
      tocheck = "data:text/plain;charset=utf-8;base64," +
            "YXplcnR5dWlvCnDDoMOnX8OoLSgnw6km",
      blob = new Blob([LZString.compressToUTF16(tocheck)],
                      {type: 'application/x-jio-utf16_lz_string'});

    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(6);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        ok(result !== blob, "Does not return substorage result");
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "text/plain;charset=utf-8",
                  "Check mimetype");

        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, value, "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ZipStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("ZipStorage.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zip",
        sub_storage: {type : "zipstorage200"}
      });
    }
  });

  test("store directly unhandled mime types", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo']);

    Storage200.prototype.putAttachment = function (arg1, arg2, arg3) {
      equal(arg1, id, "putAttachment 200 called");
      equal(arg2, attachment, "putAttachment 200 called");
      equal(arg3, blob, "putAttachment 200 called");
      return "ok";
    };

    stop();
    expect(4);

    this.jio.putAttachment(id, attachment, blob)
      .then(function (result) {
        equal(result, "ok", "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("compress text mime type", function () {
    var id = "/",
      attachment = "stringattachment",
      value = "azertyuio\npàç_è-('é&",
      blob = new Blob([value],
                      {type: 'text/foo'});

    Storage200.prototype.putAttachment = function (arg1, arg2, arg3) {
      equal(arg1, id, "putAttachment 200 called");
      equal(arg2, attachment, "putAttachment 200 called");
      ok(true, arg3 !== blob, "putAttachment 200 called");
      ok(arg3 instanceof Blob, "Data is Blob");
      equal(arg3.type, "application/x-jio-utf16_lz_string",
            "Check mimetype");
      return jIO.util.readBlobAsText(arg3, 'utf16')
        .then(function (result) {
          var dataurl = LZString.decompressFromUTF16(result.target.result);
          equal(
            dataurl,
            "data:text/foo;base64,YXplcnR5dWlvCnDDoMOnX8OoLSgnw6km"
          );
          return jIO.util.readBlobAsDataURL(arg3);
        })
        .then(function (result) {
          equal(
            result.target.result,
            "data:application/x-jio-utf16_lz_string;base64,06LgsKvkkKvkmK" +
              "rjgK/hoK/igLnkhJblkLvkgYPgoKznhqDjmKDisKDmoKTmoKHlgKHmgK3kgo" +
              "PClsK0y5M94o2g45yh5IisxLfnlaDgrYDgvYDmhaDOtOOUoOCyoOOKoOOmo8" +
              "KXxKDmrKDlrYAgIA=="
          );
          return "ok";
        });
    };

    stop();
    expect(8);

    this.jio.putAttachment(id, attachment, blob)
      .then(function (result) {
        equal(result, "ok", "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("compress json mime type", function () {
    var id = "/",
      attachment = "stringattachment",
      value = "azertyuio\npàç_è-('é&",
      blob = new Blob([value],
                      {type: 'application/foo+json'});

    Storage200.prototype.putAttachment = function (arg1, arg2, arg3) {
      equal(arg1, id, "putAttachment 200 called");
      equal(arg2, attachment, "putAttachment 200 called");
      ok(true, arg3 !== blob, "putAttachment 200 called");
      ok(arg3 instanceof Blob, "Data is Blob");
      equal(arg3.type, "application/x-jio-utf16_lz_string",
            "Check mimetype");
      return jIO.util.readBlobAsText(arg3, 'utf16')
        .then(function (result) {
          var dataurl = LZString.decompressFromUTF16(result.target.result);
          equal(
            dataurl,
            "data:application/foo+json;base64,YXplcnR5dWlvCnDDoMOnX8OoLSgnw6km"
          );
          return jIO.util.readBlobAsDataURL(arg3);
        })
        .then(function (result) {
          equal(
            result.target.result,
            "data:application/x-jio-utf16_lz_string;base64,06LgsKvkkKvkiKD" +
              "nhqHloLLmgoPjpLDjtqDnmKflgKzmvJTNsMuQ4LSF5IKOZuGFqOCqgOC2oOCs" +
              "oOGooeGooOOQtuKmoOKUoeKzoMe154Ch5bCj1ZDCqeKfgNaw3rTmhIDHoOW6o" +
              "Nmg4aWg4bOzW+SGoOOWoOK2sCAg"
          );
          return "ok";
        });
    };

    stop();
    expect(8);

    this.jio.putAttachment(id, attachment, blob)
      .then(function (result) {
        equal(result, "ok", "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, LZString));
