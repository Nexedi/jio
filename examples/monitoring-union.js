/*global console, btoa, Blob*/
/*jslint nomen: true, maxlen: 200*/
(function (window, QUnit, jIO, rJS) {
  "use strict";
  var test = QUnit.test,
    equal = QUnit.equal,
    expect = QUnit.expect,
    ok = QUnit.ok,
    stop = QUnit.stop,
    start = QUnit.start,
    deepEqual = QUnit.deepEqual;

  rJS(window)
    .ready(function (g) {

      ///////////////////////////
      // Monitoring storage
      ///////////////////////////

      return g.run({
        type: "replicatedopml",
        remote_storage_unreachable_status: "WARNING",
        remote_opml_check_time_interval: 86400000,
        request_timeout: 25000, // timeout is to 25 second
        local_sub_storage: {
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "indexeddb",
              database: "monitoring_local_roque.db"
            }
          }
        },
        remote_sub_storage: {
          /*type: "union",
          storage_list: [
            {
              type: "erp5",
              url: "https://panel.rapid.space/hateoas/",
              default_view_reference: "jio_view"
            },
            {
              type: "erp5",
              url: "https://softinst224044.host.vifib.net/hateoas/",
              default_view_reference: "jio_view"
            }
          ]*/
          type: "query",
          sub_storage: {
            type: "erp5",
            url: "https://panel.rapid.space/hateoas/",
            default_view_reference: "jio_view"
          }
        }
      });

    })
    .declareMethod('run', function (jio_options) {

      test('Test "' + jio_options.type + '"scenario', function () {
        var jio;
        stop();
        //expect(14);

        try {
          jio = jIO.createJIO(jio_options);
        } catch (error) {
          console.error(error.stack);
          console.error(error);
          throw error;
        }

        // Try to fetch inexistent document
        jio.get("inexistent")
          .fail(function (error) {
            console.error("inexisteng error:", error);
            if (error.status_code !== 404) {
              throw error;
            }
            equal(error.status_code, 404, "404 if inexistent");
        })
          .then(function () {
            return jio.repair();
          })

          .fail(function (error) {
            console.error("---");
            console.error(error.stack);
            console.error(error);
            ok(false, error);
          })

          .then(function () {
            //check instance tree
            return jio.allDocs({
              query: 'portal_type: "Instance Tree"'
            });
          })
          .then(function (result) {
            ok(result.data.total_rows > 0, 'Instance Tree object created after sync.');
            //check software instance
            return jio.allDocs({
              query: 'portal_type: "Software Instance"'
            });
          })
          .then(function (result) {
            ok(result.data.total_rows > 0, 'Software Instance object created after sync.');
            //check promise
            return jio.allDocs({
              query: 'portal_type: "Promise"'
            });
          })
          .then(function (result) {
            ok(result.data.total_rows > 0, 'Promise object created after sync.');
            //check Opml
            return jio.allDocs({
              query: 'portal_type: "Opml"'
            });
          })
          .then(function (result) {
            ok(result.data.total_rows > 0, 'Opml object created after sync.');
            //check Opml Outline
            return jio.allDocs({
              query: 'portal_type: "Opml Outline"'
            });
          })
          .then(function (result) {
            ok(result.data.total_rows > 0, 'Opml Outline object created after sync.');
            // portal_type : "webhttp" ???
            return jio.allDocs({include_docs: true});
          })
          .then(function (result) {
            console.log("alldocs result", result);
          })
          .always(function () {
            start();
          });
      });
    });

}(window, QUnit, jIO, rJS));
