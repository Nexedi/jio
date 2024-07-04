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
          console.log("CREATE JIO");
          jio = jIO.createJIO(jio_options);
        } catch (error) {
          console.error(error.stack);
          console.error(error);
          throw error;
        }

        // Try to fetch inexistent document
        console.log("jio get...");
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
            return jio.allDocs();
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
