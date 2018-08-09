/*jslint nomen: true */
/*global jIO, QUnit, sinon */
(function (jIO, QUnit, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////

  function Storage200() {
    return this;
  }

  jIO.addStorage('elasticlunr200', Storage200);

  function Index200() {
    return this;
  }

  jIO.addStorage('index200', Index200);

  /////////////////////////////////////////////////////////////////
  // ElasticlunrStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("ElasticlunrStorage.buildQuery", {
    setup: function () {
      var context = this;

      Index200.prototype.putAttachment = function () {
        return true;
      };

      Index200.prototype.getAttachment = function () {
        return true;
      };

      this.jio = jIO.createJIO({
        type: "elasticlunr",
        index_fields: [
          "title"
        ],
        index_sub_storage: {
          type: "index200"
        },
        sub_storage: {
          type: "drivetojiomapping",
          sub_storage: {
            type: "dropbox",
            access_token: "sample_token"
          }
        }
      });
      this.jio.__storage._resetIndex("id", [
        "title"
      ]);
      this.documents = {};

      Storage200.prototype.hasCapacity = function () {
        return true;
      };

      Storage200.prototype.buildQuery = function (options) {
        return new RSVP.Queue()
          .push(function () {
            // capacity query
            return Object.keys(context.documents).map(function (id) {
              return {
                id: id,
                value: context.documents[id]
              };
            });
          })
          .push(function (docs) {
            // capacity filter
            if (options.ids) {
              return docs.filter(function (doc) {
                return options.ids.indexOf(doc.id) >= 0;
              });
            }

            return docs;
          });
      };

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  /////////////////////////////////////////////////////////////////
  // Dropbox tests
  /////////////////////////////////////////////////////////////////

  test("dropbox: search by title", function () {
    var context = this,
      server = this.server,
      doc = {
        title: "foo",
        subtitle: "bar",
        desc: "empty"
      };

    server.respondWith(
      "POST",
      "https://content.dropboxapi.com/2/files/upload",
      [204, {
        "Content-Type": "text/xml"
      }, ""]
    );
    server.respondWith(
      "POST",
      "https://content.dropboxapi.com/2/files/download",
      [200, {
        "Content-Type": "application/json"
      }, JSON.stringify(doc)]
    );

    stop();

    RSVP.all([
      context.jio.put("1", doc),
      context.jio.put("2", {
        title: "bar",
        subtitle: "bar",
        desc: "empty"
      })
    ])
      .then(function () {
        return context.jio.allDocs({
          query: 'title: "foo"'
        });
      })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "1",
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
}(jIO, QUnit, sinon));
