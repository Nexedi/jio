/*jslint nomen: true*/
/*global Blob, crypto, Uint8Array, ArrayBuffer*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    throws = QUnit.throws,
    module = QUnit.module,
    userkey = "password",
    key_generated_by_password = {
      "alg": "A256GCM",
      "ext": true,
      "k": "wBHHU4Es8IqMCnH03Jxhc1ZTQN7hzo6GkCNnbA_0kjI",
      "key_ops": ["encrypt", "decrypt"],
      "kty": "oct"
    };


  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storagetest() {
    return this;
  }
  jIO.addStorage('fullcryptsto200', Storagetest);

  /////////////////////////////////////////////////////////////////
  // Fullcrypt.constructor
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.constructor");

  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "fullcrypt",
      key: userkey,
      sub_storage: {
        type: "fullcryptsto200"
      }
    });

    equal(jio.__type, "fullcrypt");
    equal(jio.__storage._sub_storage.__type, "fullcryptsto200");
  });

  /////////////////////////////////////////////////////////////////
  // Fullcrypt.get
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "fullcrypt",
        key: userkey,
        sub_storage: {
          type: "fullcryptsto200"
        }
      });
    }
  });

  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "fullcrypt",
      key: userkey,
      sub_storage: {
        type: "fullcryptsto200"
      }
    });

    Storagetest.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {
        title: "foo"
      };
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

  test("decrypt blob from aes-gcm", function () {
    var id = "/",
      value = {
        key: "lola"
      },
      tocheck = "data:application/x-jio-aes-gcm-encryption;" +
        "base64,f4ac295sDrCyltXmbfHbxN5bjPG6uHoDg8ggp0ofnzcKCT1bxJQUpsDi",



      blob = jIO.util.dataURItoBlob(tocheck);


    Storagetest.prototype.get = function (arg1) {
      equal(arg1, id, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(4);

    this.jio.get(id)
      .then(function (result) {
        ok(result !== blob, "Does not return substorage result");
        ok(result instanceof Object, "Data is Object");
        return result;
      })
      .then(function (result) {
        deepEqual(result, value, "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  /////////////////////////////////////////////////////////////////
  // Fullcrypt.post
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.post", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "fullcrypt",
        key: userkey,
        sub_storage: {
          type: "fullcryptsto200"
        }
      });
    }
  });


  function decodeAES_for_post(blob) {
    var decryptKey;

    return new RSVP.Queue()
      .push(function () {
        return crypto.subtle.importKey("jwk", key_generated_by_password,
          "AES-GCM", false, ["encrypt", "decrypt"]);
      })
      .push(function (res) {
        decryptKey = res;
        return;
      })
      .push(function () {
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (coded) {
        var iv;

        coded = coded.target.result;
        iv = new Uint8Array(coded.slice(0, 12));
        return crypto.subtle.decrypt({
          name: "AES-GCM",
          iv: iv
        },
          decryptKey, coded.slice(12));
      })
      .push(function (arr) {
        arr = String.fromCharCode.apply(null, new Uint8Array(arr));

        equal(
          arr,
          "{\"key\":\"lola\"}",
          "Attachment correctly crypted"
        );
        return;
      });
  }


  test("crypt blob to aes-gcm", function () {
    var value = {
      key: "lola"
    };

    Storagetest.prototype.post = function (arg3) {
      ok(true, arg3 !== value, "post 200 called");
      ok(arg3 instanceof Object, "Data is Object");
      equal(arg3.type, "application/x-jio-aes-gcm-encryption",
        "Check mimetype");
      return decodeAES_for_post(arg3);
    };

    stop();
    expect(4);

    this.jio.post(value)
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // Fullcrypt.put
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "fullcrypt",
        key: userkey,
        sub_storage: {
          type: "fullcryptsto200"
        }
      });
    }
  });


  function decodeAES_for_put(blob) {
    var decryptKey;

    return new RSVP.Queue()
      .push(function () {
        return crypto.subtle.importKey("jwk", key_generated_by_password,
          "AES-GCM", false, ["encrypt", "decrypt"]);
      })
      .push(function (res) {
        decryptKey = res;
        return;
      })
      .push(function () {
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (coded) {
        var iv;

        coded = coded.target.result;
        iv = new Uint8Array(coded.slice(0, 12));
        return crypto.subtle.decrypt({
          name: "AES-GCM",
          iv: iv
        },
          decryptKey, coded.slice(12));
      })
      .push(function (arr) {
        arr = String.fromCharCode.apply(null, new Uint8Array(arr));

        equal(
          arr,
          "{\"key\":\"lola\"}",
          "Attachment correctly crypted"
        );
        return;
      });
  }


  test("crypt blob to aes-gcm", function () {
    var id = "bar",
      value = {
        key: "lola"
      };

    Storagetest.prototype.put = function (arg1, arg3) {
      equal(arg1, id, "put 200 called");
      ok(true, arg3 !== value, "put 200 called");
      ok(arg3 instanceof Object, "Data is Object");
      equal(arg3.type, "application/x-jio-aes-gcm-encryption",
        "Check mimetype");
      return decodeAES_for_put(arg3);
    };

    stop();
    expect(6);

    this.jio.put(id, value)
      .then(function (result) {
        equal(result, "bar", "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // Fullcrypt.remove
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "fullcrypt",
      key: userkey,
      sub_storage: {
        type: "fullcryptsto200"
      }
    });

    Storagetest.prototype.remove = function (id) {
      equal(id, "bar", "remove 200 called");
      return {
        title: "foo"
      };
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
  // Fullcrypt.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "fullcrypt",
      key: userkey,
      sub_storage: {
        type: "fullcryptsto200"
      }
    });

    delete Storagetest.prototype.hasCapacity;

    throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
          "Capacity 'foo' is not implemented on 'fullcryptsto200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // Fullcrypt.buildQuery
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.buildQuery");
  test("buildQuery called substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "fullcrypt",
      key: userkey,
      sub_storage: {
        type: "fullcryptsto200"
      }
    });

    Storagetest.prototype.buildQuery = function (id) {
      equal(id, "bar", "buildQuery 200 called");
      return {
        title: "foo"
      };
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
  // Fullcrypt.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "fullcrypt",
      key: userkey,
      sub_storage: {
        type: "fullcryptsto200"
      }
    });

    Storagetest.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return {
        title: "foo"
      };
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
  // Fullcrypt.allAttachments
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "fullcrypt",
      key: userkey,
      sub_storage: {
        type: "fullcryptsto200"
      }
    });

    Storagetest.prototype.allAttachments = function (id) {
      equal(id, "bar", "allAttachments 200 called");
      return {
        title: "foo"
      };
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
  // Fullcrypt.getAttachment
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.getAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "fullcrypt",
        key: userkey,
        sub_storage: {
          type: "fullcryptsto200"
        }
      });
    }
  });

  test("return substorage getattachment", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo']);

    Storagetest.prototype.getAttachment = function (arg1, arg2) {
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

  test("return substorage getattachment if decrypt fails", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo'], {
        type: 'application/x-jio-aes-gcm-encryption'
      });

    Storagetest.prototype.getAttachment = function (arg1, arg2) {
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
      blob = new Blob(['foo'], {
        type: 'application/x-jio-aes-gcm-encryption'
      });

    Storagetest.prototype.getAttachment = function (arg1, arg2) {
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

  test("decrypt blob from aes-gcm", function () {
    var id = "/",
      attachment = "stringattachment",
      value = "azertyuio\npàç_è-('é&",
      tocheck = "data:application/x-jio-aes-gcm-encryption" +
        ";base64,2lHQ9xpJJ9qd81DxZEyd1LICtaV3XD+I2d5cp137L4NQC" +
        "vdkasBaFkPUE5XiY88g5z0oN9dcDASfChmvgqrkDExKS+zVglvVVs" +
        "CyECYorZ5fwgMCWAL5vUNCCaqhFVFyng==",



      blob = jIO.util.dataURItoBlob(tocheck);


    Storagetest.prototype.getAttachment = function (arg1, arg2) {
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
  // Fullcrypt.putAttachment
  /////////////////////////////////////////////////////////////////
  module("Fullcrypt.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "fullcrypt",
        key: userkey,
        sub_storage: {
          type: "fullcryptsto200"
        }
      });
    }
  });

  function decodeAES(blob) {
    var decryptKey;

    return new RSVP.Queue()
      .push(function () {
        return crypto.subtle.importKey("jwk", key_generated_by_password,
          "AES-GCM", false, ["encrypt", "decrypt"]);
      })
      .push(function (res) {
        decryptKey = res;
        return;
      })
      .push(function () {
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (coded) {
        var iv;

        coded = coded.target.result;
        iv = new Uint8Array(coded.slice(0, 12));
        return crypto.subtle.decrypt({
          name: "AES-GCM",
          iv: iv
        },
          decryptKey, coded.slice(12));
      })
      .push(function (arr) {
        arr = String.fromCharCode.apply(null, new Uint8Array(arr));
        equal(
          arr,
          "data:text/foo;base64,YXplcnR5dWlvCnDDoMOnX8OoLSgnw6km",
          "Attachment correctly crypted"
        );
        return "ok";
      });
  }

  test("crypt blob to aes-gcm", function () {
    var id = "/",
      attachment = "stringattachment",
      value = "azertyuio\npàç_è-('é&",
      blob = new Blob([value], {
        type: 'text/foo'
      });

    Storagetest.prototype.putAttachment = function (arg1, arg2, arg3) {
      equal(arg1, id, "putAttachment 200 called");
      equal(arg2, attachment, "putAttachment 200 called");
      ok(true, arg3 !== blob, "putAttachment 200 called");
      ok(arg3 instanceof Blob, "Data is Blob");
      equal(arg3.type, "application/x-jio-aes-gcm-encryption",
        "Check mimetype");
      return decodeAES(arg3);
    };


    stop();
    expect(7);

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
}(jIO, QUnit, Blob));