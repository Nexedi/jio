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
          type: "union",
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
          ]
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
            if (error.status_code !== 404) {
              throw error;
            }
            equal(error.status_code, 404, "404 if inexistent");
        })
        .then(function () {
          //test that repair can be call multiple times
          return RSVP.all([
            jio.repair(),
            jio.repair(),
            jio.repair(),
            jio.repair()
          ]);
        })
        .fail(function (error) {
          console.error("---");
          console.error(error.stack);
          console.error(error);
          ok(false, error);
        })
        //call methods that are not implemented (fail expected)
        .then(function () {
          return jio.allAttachments("foo");
        })
        .fail(function (error) {
          if (error.status_code !== 501) {
            throw error;
          }
          equal(error.status_code, 501, "400 if no allAtachments method");
        })
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
        //check specific type of objects were created after repair
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
          var id_list = [], all_docs = all_doc_list[5].data.rows, i;
          ok(all_doc_list[0].data.total_rows > 0, 'Instance Tree object created after sync.');
          id_list.push(all_doc_list[0].data.rows[0].id); //save one id to check later in all docs
          ok(all_doc_list[1].data.total_rows > 0, 'Software Instance object created after sync.');
          id_list.push(all_doc_list[1].data.rows[0].id);
          ok(all_doc_list[2].data.total_rows > 0, 'Promise object created after sync.');
          id_list.push(all_doc_list[2].data.rows[0].id);
          ok(all_doc_list[3].data.total_rows > 0, 'Opml object created after sync.');
          id_list.push(all_doc_list[3].data.rows[0].id);
          ok(all_doc_list[4].data.total_rows > 0, 'Opml Outline object created after sync.');
          id_list.push(all_doc_list[4].data.rows[0].id);
          //check elements are present in plain allDocs
          for (i = 0; i < all_docs.length; i += 1) {
            if (id_list.includes(all_docs[i].id)) {
              const index = id_list.indexOf(all_docs[i].id);
              id_list.splice(index, 1);
            }
          }
          ok(id_list.length === 0, 'Different types created objects are returned by allDocs');
        })
        .always(function () {
          console.log("all tests run")
          start();
        });
      });
    });

}(window, QUnit, jIO, rJS));
