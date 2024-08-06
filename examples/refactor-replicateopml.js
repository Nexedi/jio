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
    slapos_master_url_list = ["https://panel.rapid.space/hateoas/", "https://softinst223453.host.vifib.net/erp5/web_site_module/slapos_hateoas/"];

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
            },
            {
              type: "erp5monitor",
              limit: 20,
              sub_storage: {
                type: "erp5",
                url: slapos_master_url_list[1],
                default_view_reference: "jio_view"
              }
            }
          ]
        }
      });

    })
    .declareMethod('run', function (jio_options) {

      test('Test "' + jio_options.type + '"scenario', function () {
        var jio, jio_definition = jio_options,
          first_master_total_docs, opml_foo_url = "https://foo-opml.bar";
        stop();

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
            if (error.status_code !== 404) {
              throw error;
            }
            equal(error.status_code, 404, "404 if inexistent");
        })
        .then(function () {
          //first sync
          console.log("Sync for master 1 and 2");
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
          ok(all_docs.data.total_rows > 0, 'Repair succeded. (if not, please be sure to be logged in masters)');
        })



        
        //TODO test allAttachments
        //call methods that are not implemented (fail expected)
        .then(function () {
          return jio.getAttachment("foo", "bar");
        })
        .fail(function (error) {
          if (error.status_code !== 501) {
            throw error;
          }
          equal(error.status_code, 501, "400 if no getAttachment method");
        })
        .then(function () {
          return jio.putAttachment("foo",
          "bar",
          new Blob(["fooo"], {type: "text/plain"}));
        })
        .fail(function (error) {
          if (error.status_code !== 501) {
            throw error;
          }
          equal(error.status_code, 501, "501 if no putAttachment method");
        })
        .then(function () {
          return jio.post({});
        })
        .fail(function (error) {
          if (error.status_code !== 501) {
            throw error;
          }
          equal(error.status_code, 501, "501 if no post method");
        })
        //check limit and sort are implemented
        .then(function () {
          return jio.allDocs({limit: [0, 3], sort_on: [["creation_date", "descending"]]});
        })
        //check specific type of objects were created after repair
        .then(function (all_docs) {
          ok(all_docs.data.total_rows === 3, 'Limit capacity implemented.');
          return RSVP.all([
            jio.allDocs({query: 'portal_type: "Instance Tree"'}),
            jio.allDocs({query: 'portal_type: "Software Instance"'}),
            jio.allDocs({query: 'portal_type: "Promise"'}),
            jio.allDocs({query: 'portal_type: "Opml"'}),
            jio.allDocs({query: 'portal_type: "Opml Outline"'}),
            jio.allDocs({include_docs: true}),
            jio.allDocs({query: 'slapos_master_url: "' + slapos_master_url_list[0] + '"'}),
            jio.allDocs({query: 'slapos_master_url: "' + slapos_master_url_list[1] + '"'})
          ]);
        })


        .then(function () {
          return RSVP.all([
            jio.allDocs({include_docs: true}),
            jio.allDocs({query: 'slapos_master_url: "' + slapos_master_url_list[0] + '"'}),
            jio.allDocs({query: 'slapos_master_url: "' + slapos_master_url_list[1] + '"'})
          ]);
        })
        .then(function (all_results) {
          console.log("Total amount of docs:", all_results[0].data.total_rows);
          console.log("all_results", all_results);
        })
        .always(function () {
          start();
        });
      });
    });

}(window, QUnit, jIO, rJS));
