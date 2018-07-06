/*
 * Copyright 2013, Nexedi SA
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
/*global sessionStorage, localStorage, Blob, document, btoa, atob, Uint8Array,
         unescape, HTMLCanvasElement, XMLHttpRequest*/
(function (jIO, sessionStorage, localStorage, QUnit, Blob, document,
           btoa, unescape, HTMLCanvasElement) {
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

    this.jio.get("inexistent")
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

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {}, "Check document");
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

    localStorage.setItem(attachment, "bar");

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {}, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // localStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("localStorage.allAttachments", {
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

    this.jio.allAttachments("inexistent")
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

    this.jio.allAttachments(id)
      .then(function (result) {
        deepEqual(result, {}, "Check document");
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

    localStorage.setItem(attachment, "bar");

    this.jio.allAttachments(id)
      .then(function (result) {
        deepEqual(result, {
          "foo": {}
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

    this.jio.getAttachment("inexistent", "a")
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

    this.jio.getAttachment(id, "inexistent")
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
      value = "azertyuio\npàç_è-('é&こんいちは",
      attachment = "stringattachment";
    stop();
    expect(3);

    localStorage.setItem(attachment, "data:text/plain;charset=utf-8;base64," +
      btoa(unescape(encodeURIComponent(value))));

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
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

  test("get binary string attachment from document", function () {
    var id = "/",
      context = this,
      imgCanvas = document.createElement("canvas"),
      imgContext = imgCanvas.getContext("2d"),
      data_url,
      attachment = "stringattachment";
    stop();
    expect(2);

    imgCanvas.width = 200;
    imgCanvas.height = 200;

    imgContext.fillStyle = "blue";
    imgContext.font = "bold 16px Arial";
    imgContext.fillText("Zibri", 100, 100);

    data_url = imgCanvas.toDataURL("image/png");
    localStorage.setItem(attachment, data_url);

    return context.jio.getAttachment(id, attachment)
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        return jIO.util.readBlobAsDataURL(result);
      })
      .then(function (result) {
        equal(result.target.result, data_url, "Attachment correctly fetched");
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

    this.jio.putAttachment("inexistent", "putattmt2", "")
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


    this.jio.putAttachment(id, attachment, value)
      .then(function () {
        equal(
          localStorage.getItem(attachment),
          "data:text/plain;charset=utf-8;base64," +
            "YXplcnR5dWlvCnDDoMOnX8OoLSgnw6km"
        );
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
      attachment = "stringattachment";
    stop();
    expect(1);

    imgCanvas.width = 200;
    imgCanvas.height = 200;

    imgContext.fillStyle = "blue";
    imgContext.font = "bold 16px Arial";
    imgContext.fillText("Zibri", 100, 100);

    data_url = imgCanvas.toDataURL("image/png");

    if (HTMLCanvasElement.prototype.toBlob === undefined) {
      Object.defineProperty(
        HTMLCanvasElement.prototype,
        'toBlob',
        {
          value: function (callback, type, quality) {
            var byte_string, ia, i,
              data_uri = this.toDataURL(type, quality);

            if (data_uri.split(',')[0].indexOf('base64') >= 0) {
              byte_string = atob(data_uri.split(',')[1]);
            } else {
              byte_string = unescape(data_uri.split(',')[1]);
            }

            // write the bytes of the string to a typed array
            ia = new Uint8Array(byte_string.length);
            for (i = 0; i < byte_string.length; i += 1) {
              ia[i] = byte_string.charCodeAt(i);
            }

            return callback(new Blob([ia], {type: type || 'image/png'}));
          }
        }
      );
    }

    imgCanvas.toBlob(function (blob) {
      return context.jio.putAttachment(id, attachment, blob)
        .then(function () {
          equal(localStorage.getItem(attachment), data_url);
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

    this.jio.removeAttachment("inexistent", "removeattmt2")
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

    localStorage.setItem(attachment, "bar");

    stop();
    expect(1);

    this.jio.removeAttachment(id, attachment)
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

}(jIO, sessionStorage, localStorage, QUnit, Blob, document,
  btoa, unescape, HTMLCanvasElement));
