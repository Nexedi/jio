/*jslint nomen: true*/
/*global Blob, btoa*/
(function (jIO, QUnit, Blob, btoa) {
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
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('documentstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // documentStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("documentStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "documentstorage200");

  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.get
  /////////////////////////////////////////////////////////////////
  module("documentStorage.get");

  test("document without attachment", function () {
    stop();
    expect(3);

    function StorageGetNoAttachment() {
      return this;
    }
    StorageGetNoAttachment.prototype.getAttachment = function (options) {
      deepEqual(options, {"_id": "foo",
                          "_attachment": "jio_document/YmFy.json"},
                "getAttachment bar");
      return {data: new Blob([JSON.stringify({
        title: options._attachment,
        id: "ID " + options._attachment,
        "another": "property"
      })])};
    };
    StorageGetNoAttachment.prototype.get = function (options) {
      deepEqual(options, {"_id": "foo"}, "Get foo");
      return {
        title: options._id,
        id: "ID " + options._id,
        "another": "property"
      };
    };

    jIO.addStorage('documentstoragegetnoattachment', StorageGetNoAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragegetnoattachment"
      }
    });

    jio.get({"_id": "bar"})
      .then(function (result) {
        deepEqual(result, {
          "_id": "bar",
          title: "jio_document/YmFy.json",
          id: "ID jio_document/YmFy.json",
          "another": "property"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("document with attachment", function () {
    stop();
    expect(3);

    function StorageGetWithAttachment() {
      return this;
    }
    StorageGetWithAttachment.prototype.getAttachment = function (options) {
      deepEqual(options, {"_id": "foo",
                          "_attachment": "jio_document/YmFy.json"},
                "getAttachment bar");
      return {data: new Blob([JSON.stringify({
        title: options._attachment,
        id: "ID " + options._attachment,
        "another": "property"
      })])};
    };
    StorageGetWithAttachment.prototype.get = function (options) {
      deepEqual(options, {"_id": "foo"}, "Get foo");
      var result = {
        title: options._id,
        id: "ID " + options._id,
        "another": "property",
        "_attachments": {
          "foo1": {}
        }
      };
      // matching result
      result._attachments['jio_attachment/' + btoa("bar") + "/" +
                          btoa("bar1")] = {};
      // not matching result
      result._attachments['PREFIXjio_attachment/' + btoa("bar") + "/" +
                          btoa("bar2")] = {};
      result._attachments['jio_attachment/' + btoa("bar") + "/" + btoa("bar3")
                          + "/SUFFIX"] = {};
      result._attachments['jio_attachment/ERROR/' + btoa("bar4")] = {};
      result._attachments['jio_attachment/' + btoa("bar") + "/ERROR"] = {};
      result._attachments['jio_document/' + btoa("bar") + '.json'] = {};
      return result;
    };

    jIO.addStorage('documentstoragegetwithattachment',
                   StorageGetWithAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragegetwithattachment"
      }
    });

    jio.get({"_id": "bar"})
      .then(function (result) {
        deepEqual(result, {
          "_id": "bar",
          title: "jio_document/YmFy.json",
          id: "ID jio_document/YmFy.json",
          "another": "property",
          "_attachments": {
            bar1: {}
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

  /////////////////////////////////////////////////////////////////
  // documentStorage.put
  /////////////////////////////////////////////////////////////////
  module("documentStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });
    Storage200.prototype.putAttachment = function (param) {
      var blob = param._blob;
      delete param._blob;
      equal(blob.type, "application/json", "Blob type is OK");
      deepEqual(param, {
        "_id": "foo",
        "_attachment": "jio_document/YmFy.json"
      }, "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          deepEqual(JSON.parse(result.target.result),
                    {"_id": "bar", "title": "bartitle"},
                    "JSON is in blob");
          return param._id;
        });

    };

    jio.put({"_id": "bar", "title": "bartitle"})
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
  // documentStorage.remove
  /////////////////////////////////////////////////////////////////
  module("documentStorage.remove");
  test("remove called substorage removeAttachment", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });
    Storage200.prototype.removeAttachment = function (param) {
      deepEqual(param, {"_id": "foo",
                        "_attachment": "jio_document/YmFy.json"},
                "removeAttachment 200 called");
      return param._id;
    };

    jio.remove({"_id": "bar"})
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
  // documentStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (param) {
      deepEqual(param, {"_id": "foo",
                        "_attachment": "jio_attachment/YmFy/YmFyMg=="},
                "getAttachment 200 called");
      return {data: blob};
    };

    jio.getAttachment({"_id": "bar", "_attachment": "bar2"})
      .then(function (result) {
        equal(result.data, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (param) {
      deepEqual(param, {"_id": "foo",
                        "_attachment": "jio_attachment/YmFy/YmFyMg==",
                        "_blob": blob},
                "putAttachment 200 called");
      return "OK";
    };

    jio.putAttachment({"_id": "bar", "_attachment": "bar2", "_blob": blob})
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
  // documentStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    Storage200.prototype.removeAttachment = function (param) {
      deepEqual(param, {"_id": "foo",
                        "_attachment": "jio_attachment/YmFy/YmFyMg=="},
                "removeAttachment 200 called");
      return "Removed";
    };

    jio.removeAttachment({"_id": "bar", "_attachment": "bar2"})
      .then(function (result) {
        equal(result, "Removed");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("documentStorage.hasCapacity");
  test("can list documents", function () {
    var jio = jIO.createJIO({
      type: "document",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    ok(jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("documentStorage.buildQuery");

  test("document without attachment", function () {
    stop();
    expect(2);

    function StorageAllDocsNoAttachment() {
      return this;
    }
    StorageAllDocsNoAttachment.prototype.get = function (options) {
      equal(options._id, "foo", "Get foo");
      return {title: options._id, id: "ID " + options._id,
              "another": "property"};
    };

    jIO.addStorage('documentstoragealldocsnoattachment',
                   StorageAllDocsNoAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragealldocsnoattachment"
      }
    });

    jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("filter document's attachment on their name", function () {
    stop();
    expect(2);

    function StorageAllDocsWithAttachment() {
      return this;
    }
    StorageAllDocsWithAttachment.prototype.get = function (options) {
      equal(options._id, "foo", "Get foo");
      var result = {
        title: options._id,
        id: "ID " + options._id,
        "another": "property",
        "_attachments": {
          "foo1": {}
        }
      };
      // matching result
      result._attachments['jio_document/' + btoa("foo2") + '.json'] = {};
      // not matching result
      result._attachments['PREFIXjio_document/' + btoa("foo3") + '.json'] = {};
      result._attachments['jio_document/' + btoa("foo4") + '.jsonSUFFIX'] = {};
      result._attachments['jio_document/ERROR.json'] = {};
      result._attachments['jio_attachment/' + btoa("foo5") + "/" +
                          btoa("bar5")] = {};
      return result;
    };

    jIO.addStorage('documentstoragealldocswithattachment',
                   StorageAllDocsWithAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragealldocswithattachment"
      }
    });

    jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "foo2",
              value: {}
            }],
            total_rows: 1
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

}(jIO, QUnit, Blob, btoa));
