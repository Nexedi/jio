/*jslint nomen: true */
/*global jIO, QUnit, sinon, localStorage */
(function (jIO, QUnit, sinon, localStorage) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////

  function Storage200() {
    this.documents = {};
    return this;
  }

  Storage200.prototype.get = function (id) {
    var context = this;
    return new RSVP.Queue().push(function () {
      return context.documents[id];
    });
  };

  Storage200.prototype.post = function (data) {
    var context = this;
    return new RSVP.Queue().push(function () {
      var id = (Object.keys(context.documents).length + 1).toString();
      context.documents[id] = data;
      return id;
    });
  };

  Storage200.prototype.put = function (id, data) {
    var context = this;
    return new RSVP.Queue().push(function () {
      context.documents[id] = data;
      return context.documents[id];
    });
  };

  Storage200.prototype.remove = function (id) {
    delete this.documents[id];
    return new RSVP.Queue();
  };

  Storage200.prototype.hasCapacity = function () {
    return true;
  };

  Storage200.prototype.buildQuery = function () {
    var context = this;
    return new RSVP.Queue().push(function () {
      return Object.keys(context.documents).map(function (id) {
        return {
          id: id,
          value: context.documents[id]
        };
      });
    });
  };

  jIO.addStorage('elasticlunr200', Storage200);

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.constructor", {
    setup: function () {
      this.getItemSpy = sinon.spy(localStorage, "getItem");

      this.jio = jIO.createJIO({
        type: "elasticlunr",
        sub_storage: {
          type: "elasticlunr200"
        }
      });
    },
    teardown: function () {
      this.getItemSpy.restore();
      delete this.getItemSpy;
    }
  });

  test("set the type", function () {
    equal(this.jio.__type, "elasticlunr");
  });

  test("spy load from localStorage", function () {
    ok(
      this.getItemSpy.calledOnce,
      "getItem count " + this.getItemSpy.callCount
    );
  });

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.hasCapacity");
  test("can list documents", function () {
    var jio = jIO.createJIO({
      type: "elasticlunr",
      sub_storage: {
        type: "elasticlunr200"
      }
    });

    ok(jio.hasCapacity("list"));
  });

  test("can query documents", function () {
    var jio = jIO.createJIO({
      type: "elasticlunr",
      sub_storage: {
        type: "elasticlunr200"
      }
    });

    ok(jio.hasCapacity("query"));
  });

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.post
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.post", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "elasticlunr",
        sub_storage: {
          type: "elasticlunr200"
        }
      });
      this.index = this.jio.__storage.index;

      this.setItemSpy = sinon.spy(localStorage, "setItem");
      this.addDocSpy = sinon.spy(this.index, "addDoc");
    },
    teardown: function () {
      this.setItemSpy.restore();
      delete this.setItemSpy;
      this.addDocSpy.restore();
      delete this.addDocSpy;
    }
  });

  test("index document", function () {
    var context = this,
      doc = {
        title: "document 1"
      };
    stop();

    this.jio.post(doc)
      .then(function () {
        ok(
          context.setItemSpy.calledOnce,
          "setItem count " + context.setItemSpy.callCount
        );
        ok(
          context.addDocSpy.calledOnce,
          "addDoc count " + context.addDocSpy.callCount
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.put
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.put", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "elasticlunr",
        sub_storage: {
          type: "elasticlunr200"
        }
      });
      this.index = this.jio.__storage.index;

      this.setItemSpy = sinon.spy(localStorage, "setItem");
      this.updateDocSpy = sinon.spy(this.index, "updateDoc");
    },
    teardown: function () {
      this.setItemSpy.restore();
      delete this.setItemSpy;
      this.updateDocSpy.restore();
      delete this.updateDocSpy;
    }
  });

  test("index document", function () {
    var context = this,
      doc = {
        title: "document 1"
      };
    stop();

    this.jio.put("1", doc)
      .then(function () {
        ok(
          context.setItemSpy.calledOnce,
          "setItem count " + context.setItemSpy.callCount
        );
        ok(
          context.updateDocSpy.calledOnce,
          "updateDoc count " + context.updateDocSpy.callCount
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.remove
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.remove", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "elasticlunr",
        sub_storage: {
          type: "elasticlunr200"
        }
      });
      this.index = this.jio.__storage.index;

      this.setItemSpy = sinon.spy(localStorage, "setItem");
      this.removeDocSpy = sinon.spy(this.index, "removeDoc");
    },
    teardown: function () {
      this.setItemSpy.restore();
      delete this.setItemSpy;
      this.removeDocSpy.restore();
      delete this.removeDocSpy;
    }
  });

  test("remove index document", function () {
    var context = this;
    stop();

    this.jio.remove("1")
      .then(function () {
        ok(
          context.setItemSpy.calledOnce,
          "setItem count " + context.setItemSpy.callCount
        );
        ok(
          context.removeDocSpy.calledOnce,
          "removeDoc count " + context.removeDocSpy.callCount
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.buildQuery", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "elasticlunr",
        indexFields: [
          "title"
        ],
        sub_storage: {
          type: "elasticlunr200"
        }
      });
      this.jio.__storage.__resetIndex("id", [
        "title"
      ]);
    }
  });

  test("list all documents", function () {
    var context = this;
    stop();

    RSVP.all([
      context.jio.post({
        title: "document 1"
      }),
      context.jio.post({
        title: "document 2"
      })
    ])
      .then(function () {
        return context.jio.allDocs();
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {
                title: "document 1"
              }
            }, {
              id: "2",
              value: {
                title: "document 2"
              }
            }],
            total_rows: 2
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

  test("search single field", function () {
    var context = this;
    stop();

    RSVP.all([
      context.jio.post({
        title: "document 1"
      }),
      context.jio.post({
        title: "image 2"
      })
    ])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "doc"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
              value: {
                title: "document 1"
              }
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

}(jIO, QUnit, sinon, localStorage));
