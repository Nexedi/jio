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
    deepEqual = QUnit.deepEqual,
    DB_NAME = "monitoring_local_test.db",
    slapos_master_url_list = ["https://panel.rapid.space/hateoas/", "https://softinst239021.host.vifib.net/erp5/web_site_module/slapos_hateoas/"];

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
              database: DB_NAME
            }
          }
        },
        remote_sub_storage: {
          type: "union",
          storage_list: [
            {
              type: "erp5monitor",
              limit: 20,
              sub_storage: {
                type: "erp5",
                url: slapos_master_url_list[0],
                default_view_reference: "jio_view"
              }
            }/*,
            {
              type: "erp5monitor",
              limit: 20,
              sub_storage: {
                type: "erp5",
                url: slapos_master_url_list[1],
                default_view_reference: "jio_view"
              }
            }*/
          ]
        }
      });

    })
    .declareMethod('run', function (jio_options) {

      test('Test "' + jio_options.type + '"scenario', function () {
        var jio, jio_definition = jio_options,
          first_master_total_docs, opml_foo_url = "https://foo-opml.bar";
        stop();

        //Ensure no previous test db is present
        return new RSVP.Queue()
        .push(function () {
          return indexedDB.deleteDatabase("jio:" + DB_NAME);
        })
        .then(function () {
          try {
            jio = jIO.createJIO(jio_options);
          } catch (error) {
            console.error(error.stack);
            console.error(error);
            throw error;
          }
          //first sync
          return jio.repair();
        })
        .fail(function (error) {
          console.error("---");
          console.error(error.stack);
          console.error(error);
          ok(false, error);
        })
        //check if repair minimally worked
        .then(function () {
          return jio.allDocs();
        })
        .then(function (all_docs) {
          console.log("all_docs", all_docs);
          ok(all_docs.data.total_rows > 0, 'Repair succeded. (if not, please be sure to be logged in masters)');
          return jio.allAttachments(all_docs.data.rows[0].id);
        })
        .fail(function (error) {
          console.error("---");
          console.error(error.stack);
          console.error(error);
          ok(false, error);
        })
        .always(function () {
          start();
        });
      });
    });

}(window, QUnit, jIO, rJS));