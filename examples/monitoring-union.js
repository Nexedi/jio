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
          return RSVP.all([
            jio.allDocs({query: 'portal_type: "Instance Tree"'}),
            jio.allDocs({query: 'portal_type: "Software Instance"'}),
            jio.allDocs({query: 'portal_type: "Promise"'}),
            jio.allDocs({query: 'portal_type: "Opml"'}),
            jio.allDocs({query: 'portal_type: "Opml Outline"'}),
            jio.allDocs({include_docs: true})
          ]);
        })
        .then(function (all_doc_list) {
          console.log("all_doc_list", all_doc_list);
          ok(all_doc_list[5].data.total_rows > 0, 'Repair succeded. (if not, please be sure to be logged in masters)');
          ok(all_doc_list[0].data.total_rows > 0, 'Instance Tree object created after sync.');
          ok(all_doc_list[1].data.total_rows > 0, 'Software Instance object created after sync.');
          ok(all_doc_list[2].data.total_rows > 0, 'Promise object created after sync.');
          ok(all_doc_list[3].data.total_rows > 0, 'Opml object created after sync.');
          ok(all_doc_list[4].data.total_rows > 0, 'Opml Outline object created after sync.');
          //check all attachments
          var i, push_queue = new RSVP.Queue();
          function pushAll(id) {
            push_queue
              .push(function () {
                return jio.allAttachments(id);
              });
          }
          for (i = 0; i < all_doc_list[5].data.rows.length; i += 1) {
            pushAll(all_doc_list[5].data.rows[i].id);
          }
          return push_queue;
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
      });
    });

}(window, QUnit, jIO, rJS));