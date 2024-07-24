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
    slapos_master_url_list = ["https://panel.rapid.space/hateoas/", "https://softinst224044.host.vifib.net/hateoas/"];

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
              url: slapos_master_url_list[0],
              default_view_reference: "jio_view"
            },
            {
              type: "erp5",
              url: slapos_master_url_list[1],
              default_view_reference: "jio_view"
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
        expect(17);

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
          return jio.repair();
        })
        .fail(function (error) {
          console.error("---");
          console.error(error.stack);
          console.error(error);
          ok(false, error);
        })
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
        .then(function (all_doc_list) {
          var id_list = [], all_docs = all_doc_list[5].data.rows, i;
          first_master_total_docs = all_doc_list[6].data.total_rows;
          ok(first_master_total_docs > 0, 'Objects created for master 1.');
          ok(all_doc_list[7].data.total_rows > 0, 'Objects created for master 2.');
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
          for (i = 0; i < all_docs.length; i += 1) {
            //check different elements are present in plain allDocs
            if (id_list.includes(all_docs[i].id)) {
              const index = id_list.indexOf(all_docs[i].id);
              id_list.splice(index, 1);
            }
          }
          ok(id_list.length === 0, 'Different types created objects are returned by allDocs');
          console.log("Total amount of docs after first repair:", all_docs.length);
        })
        .then(function () {
          //manually add an opml
          var opml_dict = {
            type: "Opml",
            title: "foo opml",
            portal_type: "Opml",
            url: opml_foo_url,
            basic_login: "basic_login",
            username: "username",
            password: "password",
            active: true,
            has_monitor: true,
            state: "Started",
            slapos_master_url: ""
          };
          return jio.put(opml_foo_url, opml_dict);
        })
        .then(function () {
          //update jio storage slapos master urls (drop one)
          jio_definition.remote_sub_storage.storage_list = [
            {
              type: "erp5",
              url: slapos_master_url_list[0],
              default_view_reference: "jio_view"
            }
          ];
          try {
            jio = jIO.createJIO(jio_options);
          } catch (error) {
            console.error(error.stack);
            console.error(error);
            throw error;
          }
          return jio.repair();
        })
        .then(function () {
          //check objects for each slapos master
          return RSVP.all([
            jio.allDocs({include_docs: true}),
            jio.allDocs({query: 'slapos_master_url: "' + slapos_master_url_list[0] + '"'}),
            jio.allDocs({query: 'slapos_master_url: "' + slapos_master_url_list[1] + '"'}),
            jio.get(opml_foo_url)
          ]);
        })
        .then(function (all_results) {
          console.log("Total amount of docs after second repair:", all_results[0].data.total_rows);
          ok(all_results[1].data.total_rows === first_master_total_docs, "Objects of kept master url must be kept");
          ok(all_results[2].data.total_rows === 0, "Removed master url objects must be removed");
          ok(all_results[3] !== undefined && all_results[3].url === opml_foo_url, "Manually added opml must be kept");
        })
        .then(function () {
          //remove opml
          return jio.remove(opml_foo_url);
        })
        .then(function () {
          return jio.repair();
        })
        .then(function () {
          return RSVP.all([
            jio.allDocs({include_docs: true}),
            jio.allDocs({query: 'slapos_master_url: "' + slapos_master_url_list[0] + '"'})
          ]);
        })
        .then(function (all_results) {
          //check opml objects were removed too
          console.log("Total amount of docs after third repair:", all_results[0].data.total_rows);
          ok(all_results[0].data.total_rows === first_master_total_docs && all_results[1].data.total_rows === first_master_total_docs, "Objects of kept master url must be kept");
          return jio.get(opml_foo_url);
        })
        .fail(function (error) {
          if (error.status_code !== 404) {
            throw error;
          }
          equal(error.status_code, 404, "Opml was removed.");
        })
        .always(function () {
          start();
        });
      });
    });

}(window, QUnit, jIO, rJS));
