/*jslint nomen: true */
/*global jIO, QUnit, Blob, Uint8Array*/
(function (jIO, QUnit, Blob, Uint8Array) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    /*
      zip file created by
     (echo '[';(echo 'data:application/zip;base64,' ;
      cd zipfile ; zip -r - * | base64 -w 40)
      |sed 's#$#",#' | sed 's#^#"#' ; echo ']')
     zipfile contents:
      /getid/
      /id1/
      /id2/
      /id2/attachment1 -- "foo\nbaré\n"
      /id2/attachment2 -- "foo2\n"
     */
    zipfile = jIO.util.dataURItoBlob([
      "data:application/zip;base64,",
      "UEsDBAoAAAAAANOTc0kAAAAAAAAAAAAAAAAFABwA",
      "Z2V0MS9VVAkAAx5wMFhVcDBYdXgLAAEE6AMAAATo",
      "AwAAUEsDBAoAAAAAAJxxc0kAAAAAAAAAAAAAAAAE",
      "ABwAaWQxL1VUCQADuDMwWI5fMFh1eAsAAQToAwAA",
      "BOgDAABQSwMECgAAAAAAUJtzSQAAAAAAAAAAAAAA",
      "AAQAHABpZDIvVVQJAAM3fTBYN30wWHV4CwABBOgD",
      "AAAE6AMAAFBLAwQUAAgACABUm3NJAAAAAAAAAAAK",
      "AAAADwAcAGlkMi9hdHRhY2htZW50MVVUCQADQH0w",
      "WEV9MFh1eAsAAQToAwAABOgDAABLy8/nSkosOryS",
      "CwBQSwcIceGzPQwAAAAKAAAAUEsDBBQACAAIAOqT",
      "c0kAAAAAAAAAAAUAAAAPABwAaWQyL2F0dGFjaG1l",
      "bnQyVVQJAANHcDBYVXAwWHV4CwABBOgDAAAE6AMA",
      "AEvLzzfiAgBQSwcI16M7/QcAAAAFAAAAUEsBAh4D",
      "CgAAAAAA05NzSQAAAAAAAAAAAAAAAAUAGAAAAAAA",
      "AAAQAO1BAAAAAGdldDEvVVQFAAMecDBYdXgLAAEE",
      "6AMAAAToAwAAUEsBAh4DCgAAAAAAnHFzSQAAAAAA",
      "AAAAAAAAAAQAGAAAAAAAAAAQAO1BPwAAAGlkMS9V",
      "VAUAA7gzMFh1eAsAAQToAwAABOgDAABQSwECHgMK",
      "AAAAAABQm3NJAAAAAAAAAAAAAAAABAAYAAAAAAAA",
      "ABAA7UF9AAAAaWQyL1VUBQADN30wWHV4CwABBOgD",
      "AAAE6AMAAFBLAQIeAxQACAAIAFSbc0lx4bM9DAAA",
      "AAoAAAAPABgAAAAAAAEAAACkgbsAAABpZDIvYXR0",
      "YWNobWVudDFVVAUAA0B9MFh1eAsAAQToAwAABOgD",
      "AABQSwECHgMUAAgACADqk3NJ16M7/QcAAAAFAAAA",
      "DwAYAAAAAAABAAAApIEgAQAAaWQyL2F0dGFjaG1l",
      "bnQyVVQFAANHcDBYdXgLAAEE6AMAAAToAwAAUEsF",
      "BgAAAAAFAAUAiQEAAIABAAAAAA=="
    ].join(''));

  /////////////////////////////////////////////////////////////////
  // zipFileStorage constructor
  /////////////////////////////////////////////////////////////////
  module("zipFileStorage.constructor");

  test("Storage ", function () {
    var jio = jIO.createJIO({
      type: "zipfile"
    });

    equal(jio.__type, "zipfile");
  });

  /////////////////////////////////////////////////////////////////
  // zipFileStorage.put
  /////////////////////////////////////////////////////////////////
  module("zipFileStorage.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile"
      });
    }
  });

  test("put document", function () {
    var dir_name = 'put1/',
      jio = this.jio;
    stop();
    expect(2);

    jio.put('/put1/', {})
      .then(function () {
        ok(jio.__storage._zip.files.hasOwnProperty(dir_name));
        ok(jio.__storage._zip.files[dir_name].dir);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("don't throw error when putting existing directory", function () {
    stop();
    expect(1);
    this.jio.put("/put1/", {})
      .then(function () {
        ok(true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.put("put1/", {})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id put1/ is forbidden (no begin /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.put("/put1", {})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /put1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject to store any property", function () {
    stop();
    expect(3);

    this.jio.put("/put1/", {title: "foo"})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Can not store properties: title");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////////////////
  //// zipFileStorage.remove
  ///////////////////////////////////////////////////////////////////
  module("zipFileStorage.remove", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile"
      });
    }
  });

  test("remove document", function () {
    var dir_name = "id1/",
      jio = this.jio;
    stop();
    expect(1);

    jio.remove("/" + dir_name)
      .then(function () {
        ok(!jio.__storage._zip.files.hasOwnProperty(dir_name));
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.remove("remove1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id remove1/ is forbidden (no begin /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.remove("/remove1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /remove1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // zipFileStorage.get
  /////////////////////////////////////////////////////////////////
  module("zipFileStorage.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile",
        file: zipfile
      });
    }
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.get("get1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id get1/ is forbidden (no begin /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.get("/get1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /get1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    stop();
    expect(3);

    this.jio.get("/inexistent/")
      .then(function (data) {
        ok(false, data);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get document", function () {
    var id = "/id1/";
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

  ///////////////////////////////////////////////////////////////
  // zipFileStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("zipFileStorage.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile",
        file: zipfile
      });
    }
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.putAttachment(
      "putAttachment1/",
      "attachment1",
      new Blob([""])
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id putAttachment1/ is forbidden (no begin /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.putAttachment(
      "/putAttachment1",
      "attachment1",
      new Blob([""])
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /putAttachment1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function () {
    stop();
    expect(3);

    this.jio.putAttachment(
      "/putAttachment1/",
      "attach/ment1",
      new Blob([""])
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "attachment attach/ment1 is forbidden");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment to inexisting directory: expecting a 404", function () {
    var blob = new Blob(["foo"]);
    stop();
    expect(3);

    this.jio.putAttachment(
      "/inexistent_dir/",
      "attachment1",
      blob
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot access subdocument");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });


  test("putAttachment document", function () {
    var blob = new Blob(["foo"]),
      jio = this.jio,
      dir_name = 'id1/',
      att_name = 'attachment1';
    stop();
    expect(2);

    jio.putAttachment(
      "/" + dir_name,
      "attachment1",
      blob
    )
      .then(function () {
        var path_name = dir_name + att_name;
        ok(jio.__storage._zip.files.hasOwnProperty(path_name));
        ok(!jio.__storage._zip.files[path_name].dir);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////////////////
  //// zipFileStorage.allAttachments
  ///////////////////////////////////////////////////////////////////
  module("zipFileStorage.allAttachments", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile",
        file: zipfile
      });
    }
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.allAttachments("get1/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id get1/ is forbidden (no begin /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.allAttachments("/get1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /get1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent document", function () {
    stop();
    expect(3);

    this.jio.allAttachments("/inexistent/")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document without attachment", function () {
    var id = "/id1/";
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
    var id = "/id2/";
    stop();
    expect(1);

    this.jio.allAttachments(id)
      .then(function (result) {
        deepEqual(result, {
          attachment1: {},
          attachment2: {}
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
  // zipFileStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("zipFileStorage.getAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile",
        file: zipfile
      });
    }
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.getAttachment(
      "getAttachment1/",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id getAttachment1/ is forbidden (no begin /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.getAttachment(
      "/getAttachment1",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /getAttachment1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function () {
    stop();
    expect(3);

    this.jio.getAttachment(
      "/getAttachment1/",
      "attach/ment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "attachment attach/ment1 is forbidden");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment document", function () {
    stop();
    expect(3);

    this.jio.getAttachment(
      "/id2/",
      "attachment1"
    )
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, "foo\nbaré\n",
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent attachment", function () {
    stop();
    expect(3);

    this.jio.getAttachment(
      "/id2/",
      "attachment3"
    )
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment: /id2/ " +
                             ", attachment3");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////////////////
  //// zipFileStorage.removeAttachment
  ///////////////////////////////////////////////////////////////////
  module("zipFileStorage.removeAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile",
        file: zipfile
      });
    }
  });

  test("reject ID not starting with /", function () {
    stop();
    expect(3);

    this.jio.removeAttachment(
      "removeAttachment1/",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id removeAttachment1/ is forbidden (no begin /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject ID not ending with /", function () {
    stop();
    expect(3);

    this.jio.removeAttachment(
      "/removeAttachment1",
      "attachment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "id /removeAttachment1 is forbidden (no end /)");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("reject attachment with / character", function () {
    stop();
    expect(3);

    this.jio.removeAttachment(
      "/removeAttachment1/",
      "attach/ment1"
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "attachment attach/ment1 is forbidden");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("removeAttachment document", function () {
    var jio = this.jio,
      dir_name = 'id2/',
      att_name = 'attachment1',
      path_name = dir_name + att_name;
    stop();
    expect(1);
    //ok(jio.__storage._zip.files.hasOwnProperty(path_name));
    //ok(!jio.__storage._zip.files[path_name].dir);

    this.jio.removeAttachment(
      "/" + dir_name,
      att_name
    )
      .then(function () {
        ok(!jio.__storage._zip.files.hasOwnProperty(path_name));
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove inexistent attachment", function () {
    stop();
    expect(3);

    this.jio.removeAttachment(
      "/id2/",
      "attachment3"
    )
      .then(function () {
        ok(false);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment: /id2/ " +
                             ", attachment3");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////////////////
  //// zipFileStorage.createJIO from zipfile
  ///////////////////////////////////////////////////////////////////
  module("zipFileStorage.createJIO");

  test("read zip archive from Array Buffer", function () {
    var jio;
    stop();
    expect(3);
    jIO.util.readBlobAsArrayBuffer(zipfile)
      .then(function (result) {
        jio = jIO.createJIO({
          type: "zipfile",
          file: result.target.result
        });
        return jio.getAttachment('/id2/', 'attachment1');
      })
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, "foo\nbaré\n",
          "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("read zip archive from binary string", function () {
    var jio;
    stop();
    expect(3);
    jIO.util.readBlobAsArrayBuffer(zipfile)
      .then(function (result) {
        jio = jIO.createJIO({
          type: "zipfile",
          file: String.fromCharCode
            .apply(null, new Uint8Array(result.target.result))
        });
        return jio.getAttachment('/id2/', 'attachment1');
      })
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, "foo\nbaré\n",
          "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////////////////
  //// zipFileStorage.getAttachment make zip archive
  ///////////////////////////////////////////////////////////////////
  module("zipFileStorage.getAttachment('/','/')", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "zipfile",
        file: zipfile
      });
    }
  });

  test("make zip archive", function () {
    stop();
    expect(2);
    this.jio.getAttachment('/', '/')
      .then(function (result) {
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "application/zip", "Check mimetype");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, Uint8Array));
