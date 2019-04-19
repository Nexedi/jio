/*
 * Copyright 2014, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */

/*global console, btoa, Blob, indexedDB*/
/*jslint nomen: true, maxlen: 200*/
(function (window, QUnit, jIO, rJS) {
  "use strict";
  var test = QUnit.test,
    equal = QUnit.equal,
    expect = QUnit.expect,
    ok = QUnit.ok,
    stop = QUnit.stop,
    start = QUnit.start,
    // deepEqual = QUnit.deepEqual;
    local_idb_name = "local_test_performance",
    remote_idb_name = "remote_test_performance",
    signature_idb_name = "signature_test_performance";

  function dispatchQueue(context, function_used, argument_list,
                         number_queue) {
    var result_promise_list = [],
      i,
      defer;
    function pushAndExecute(global_defer) {
      if ((global_defer.promise.isFulfilled) ||
          (global_defer.promise.isRejected)) {
        return;
      }
      if (argument_list.length > 0) {
        function_used.apply(context, argument_list.shift())
          .then(function () {
            pushAndExecute(global_defer);
          })
          .fail(global_defer.reject);
        return;
      }
      global_defer.resolve();
    }
    for (i = 0; i < number_queue; i += 1) {
      defer = RSVP.defer();
      result_promise_list.push(defer.promise);
      pushAndExecute(defer);
    }
    if (number_queue > 1) {
      return RSVP.all(result_promise_list);
    }
    return result_promise_list[0];
  }

  function deleteIndexedDB(idb_name) {
    return new RSVP.Promise(function resolver(resolve, reject) {
      var request = indexedDB.deleteDatabase(
        idb_name
      );
      request.onerror = reject;
      request.onblocked = reject;
      request.onsuccess = resolve;
    });
  }

  rJS(window)

    .declareService(function () {
      return this.run();
    })

    .declareMethod('run', function () {
      var jio_options = {
        type: "replicate",
        query: {
          query: 'portal_type:"Jio Perf"'
        },
        parallel_operation_amount: 10,
        signature_hash_key: 'modification_date',
        check_local_deletion: false,
        check_local_modification: false,
        check_remote_creation: false,
        check_remote_deletion: false,
        check_remote_modification: false,
        local_sub_storage: {
          /*
          type: "erp5",
          url: 'https://softinst114089.host.vifib.net/erp5/web_site_module/renderjs_runner/hateoas/',
          default_view_reference: "jio_view"
          */
          type: "uuid",
          sub_storage: {
            type: "query",
            sub_storage: {
              // type: "memory",
              type: "indexeddb",
              database: local_idb_name
            }
            /*
            type: "drivetojiomapping",
            sub_storage: {
              type: "dropbox",
              access_token: ""
            }
            */
          }
        },
        use_remote_post: true,
        remote_sub_storage: {
          /*
          type: "uuid",
          sub_storage: {
            type: "query",
            sub_storage: {
              // type: "memory",
              type: "indexeddb",
              database: remote_idb_name
            }
          }
          */
          type: "erp5",
          url: '',
          default_view_reference: "jio_view"
        },
        signature_sub_storage: {
          type: "query",
          sub_storage: {
            type: "memory",
            // type: "indexeddb",
            database: signature_idb_name
          }
        }
      },
        document_count = 1000,
        parallel_operation = 10;

      test('Test "' + jio_options.type + '"scenario', function () {
        var jio,
          i,
          document_list = [];
        stop();
        expect(6);

        // Create the storage
        try {
          jio = jIO.createJIO(jio_options);
        } catch (error) {
          console.error(error.stack);
          console.error(error);
          throw error;
        }

        function postNewDocument(index) {
          // return RSVP.Queue();
          /*
          return RSVP.resolve(JSON.stringify({
            title: index, modification_date: index,
            parent_relative_url: 'jio_perf_module',
            portal_type: 'Jio Perf'
          }));
          */
          return jio.post({title: index, modification_date: index,
                           parent_relative_url: 'jio_perf_module',
                           portal_type: 'Jio Perf'});
        }

        // Put in the jio storage
        return new RSVP.Queue()
          .then(function () {
            return RSVP.all([
              deleteIndexedDB('jio:' + local_idb_name),
              deleteIndexedDB('jio:' + remote_idb_name),
              deleteIndexedDB('jio:' + signature_idb_name)
            ]);
          })
          .then(function () {
            ok(true, 'IDB deleted ' + new Date());
          })
          /*
          .then(function () {
            // Initialize all documents to create
            for (i = 0; i < document_count; i += 1) {
              document_list.push([{title: i, modification_date: i,
                                   parent_relative_url: 'jio_perf_module',
                                   portal_type: 'Jio Perf'}]);
            }
            equal(document_list.length, document_count,
                  'Documents created ' + new Date());

            return dispatchQueue(jio, jio.post, document_list,
                                 parallel_operation);
          })
          */
          .then(function () {
            // Initialize all documents to create
            for (i = 0; i < document_count; i += 1) {
              document_list.push([i]);
            }
            equal(document_list.length, document_count,
                  'Documents created ' + new Date());

            return dispatchQueue(this, postNewDocument, document_list,
                                 parallel_operation);
          })
          .then(function () {
            return jio.allDocs();
          })
          .then(function (result) {
            equal(result.data.total_rows, document_count,
                  'Local Storage filled ' + new Date());
          })
          /*
          .then(function () {
            return jio.repair();
          })
          .then(function () {
            ok(true, 'First sync finished ' + new Date());
          })
          .then(function () {
            return jio.repair();
          })
          .then(function () {
            ok(true, 'Second sync finished ' + new Date());
          })
          .then(function () {
            return jio.repair();
          })
          .then(function () {
            ok(true, 'Third sync finished ' + new Date());
          })
          */
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
