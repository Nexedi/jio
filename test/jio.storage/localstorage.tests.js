/*jslint nomen: true */
/*global sessionStorage, localStorage, Blob, document*/
(function (jIO, sessionStorage, localStorage, QUnit, Blob, document) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // localStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("localStorage.constructor");
  test("local storage by default", function () {
    var jio = jIO.createJIO({
      type: "local"
    });

    equal(jio.__type, "local");
    equal(jio.__storage._storage, localStorage);
  });

  test("sessiononly", function () {
    var jio = jIO.createJIO({
      type: "local",
      sessiononly: true
    });

    equal(jio.__type, "local");
    equal(jio.__storage._storage, sessionStorage);
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.get
  /////////////////////////////////////////////////////////////////
  module("localStorage.get", {
    setup: function () {
      localStorage.clear();
      this.jio = jIO.createJIO({
        "type": "local"
      });
    }
  });

  test("get non valid document ID", function () {
    stop();
    expect(3);

    this.jio.get({"_id": "inexistent"})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id inexistent is forbidden (!== /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function () {
    var id = "/";
    stop();
    expect(1);

    this.jio.get({"_id": id})
      .then(function (result) {
        deepEqual(result, {
          "_id": "/"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document with attachment", function () {
    var id = "/",
      attachment = "foo";
    stop();
    expect(1);

    localStorage[attachment] = "bar";

    this.jio.get({"_id": id})
      .then(function (result) {
        deepEqual(result, {
          "_id": id,
          "_attachments": {
            "foo": {}
          }
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
  // localStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("localStorage.getAttachment", {
    setup: function () {
      localStorage.clear();
      this.jio = jIO.createJIO({
        "type": "local"
      });
    }
  });

  test("get attachment from inexistent document", function () {
    stop();
    expect(3);

    this.jio.getAttachment({
      "_id": "inexistent",
      "_attachment": "a"
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id inexistent is forbidden (!== /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent attachment from document", function () {
    var id = "/";
    stop();
    expect(3);

    this.jio.getAttachment({
      "_id": id,
      "_attachment": "inexistent"
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment inexistent");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get string attachment from document", function () {
    var id = "/",
      value = "azertyuio\npàç_è-('é&",
      attachment = "stringattachment";
    stop();
    expect(4);

    localStorage[attachment] = value;

    this.jio.getAttachment({
      "_id": id,
      "_attachment": attachment
    })
      .then(function (result) {
        ok(result.data instanceof Blob, "Data is Blob");
        deepEqual(result.data.type, "", "Check mimetype");
        deepEqual(result.data.size, 24, "Check size");
        return jIO.util.readBlobAsText(result.data);
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

  test("get binary string attachment from document", function () {
    var id = "/",
      context = this,
      imgCanvas = document.createElement("canvas"),
      imgContext = imgCanvas.getContext("2d"),
      data_url,
      value,
      attachment = "stringattachment";
    stop();
    expect(2);

    imgCanvas.width = 200;
    imgCanvas.height = 200;

    imgContext.fillStyle = "blue";
    imgContext.font = "bold 16px Arial";
    imgContext.fillText("Zibri", 100, 100);

    data_url = imgCanvas.toDataURL("image/png");

    return jIO.util.ajax({
      url: data_url
    })
      .then(function (result) {
        value = result.target.response;
        localStorage[attachment] = value;

        return context.jio.getAttachment({
          "_id": id,
          "_attachment": attachment
        });
      })
      .then(function (result) {
        ok(result.data instanceof Blob, "Data is Blob");
        return jIO.util.readBlobAsText(result.data);
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
  // localStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("localStorage.putAttachment", {
    setup: function () {
      localStorage.clear();
      this.jio = jIO.createJIO({
        "type": "local"
      });
    }
  });

  test("put an attachment to an inexistent document", function () {
    stop();
    expect(3);

    this.jio.putAttachment({
      "_id": "inexistent",
      "_attachment": "putattmt2",
      "_data": ""
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id inexistent is forbidden (!== /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put string attachment from document", function () {
    var id = "/",
      value = "azertyuio\npàç_è-('é&",
      attachment = "stringattachment";
    stop();
    expect(1);


    this.jio.putAttachment({
      "_id": id,
      "_attachment": attachment,
      "_data": value
    })
      .then(function () {
        equal(localStorage[attachment], value);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put binary string attachment from document", function () {
    var id = "/",
      context = this,
      imgCanvas = document.createElement("canvas"),
      imgContext = imgCanvas.getContext("2d"),
      data_url,
      original_blob,
      value,
      attachment = "stringattachment";
    stop();
    expect(1);

    imgCanvas.width = 200;
    imgCanvas.height = 200;

    imgContext.fillStyle = "blue";
    imgContext.font = "bold 16px Arial";
    imgContext.fillText("Zibri", 100, 100);

    data_url = imgCanvas.toDataURL("image/png");
    return jIO.util.ajax({
      url: data_url
    })
      .then(function (result) {
        value = result.target.response;
        original_blob =  new Blob([result.target.response],
                                  {type: "image/png"});
        return context.jio.putAttachment({
          "_id": id,
          "_attachment": attachment,
          "_blob": original_blob
        });
      })
      .then(function () {
        equal(localStorage[attachment], value);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("localStorage.removeAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "local"
      });
    }
  });

  test("remove an attachment to an inexistent document", function () {
    stop();
    expect(3);

    this.jio.removeAttachment({
      "_id": "inexistent",
      "_attachment": "removeattmt2"
    })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError, error);
        equal(error.message, "id inexistent is forbidden (!== /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove an attachment to a document", function () {
    var id = "/",
      attachment = "foo";

    localStorage[attachment] = "bar";

    stop();
    expect(1);

    this.jio.removeAttachment({
      "_id": id,
      "_attachment": attachment
    })
      .then(function () {
        ok(!localStorage.hasOwnProperty(attachment));
      })
      .fail(function (error) {
        ok(false, error);
      })

      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("localStorage.hasCapacity", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "local"
      });
    }
  });

  test("can list documents", function () {
    ok(this.jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("localStorage.buildQuery", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "local"
      });
    }
  });

  test("only return one document", function () {
    stop();
    expect(1);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          "data": {
            "rows": [
              {
                "id": "/",
                "value": {}
              }
            ],
            "total_rows": 1
          }
        });
      })
      .fail(function (error) {
        ok(false, error);
      })

      .always(function () {
        start();
      });
  });

}(jIO, sessionStorage, localStorage, QUnit, Blob, document));
