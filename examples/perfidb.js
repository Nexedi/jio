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
    document_idb_name = "index_document_test_performance",
    index_idb_name = "index_test_performance";

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

  rJS(window)

    .declareService(function () {
      return this.run();
    })

    .declareMethod('run', function () {
      console.info(index_idb_name);
      var jio_options = {
        type: "uuid",
        sub_storage: {
          type: "indexeddb",
          database: document_idb_name,
          index_key_list: ["title", "portal_type"],
          version: 3
        }
      },
        document_count = 10000,
        parallel_operation = 10;

      test('Test index storage speed', function () {
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
          return jio.post({title: index, modification_date: index,
                           parent_relative_url: 'jio_perf_module',
                           portal_type: 'Jio Perf'});
        }

        function generateCheckQuerySpeed(query) {
          return function () {
            var now = Date.now();
            return jio.allDocs(query)
              .push(function (result) {
                equal(result.data.total_rows, query.limit || document_count, query.index);
                console.log(query.index, result.data.total_rows, Date.now() - now, 'ms');
              });
          };
        }
        function checkQueryListSpeed() {
          var queue = new RSVP.Queue(),
            query_list = arguments,
            j;
          for (j = 0; j < query_list.length; j += 1) {
            queue.push(generateCheckQuerySpeed(query_list[j]));
          }
          return queue;
        }

        // Put in the jio storage
        return new RSVP.Queue()
          .then(function () {
            ok(true, 'Index repair... ' + new Date());
            // Ensure the index is correct
            // return jio.repair();
          })
          .then(function () {
            ok(true, 'Index repaired ' + new Date());
            // Check if all documents have been created
            return jio.allDocs();
          })
          .then(function (result) {
            // Initialize all documents to create
            for (i = result.data.total_rows; i < document_count; i += 1) {
              document_list.push([i]);
            }
            ok(true, 'Documents created ' + new Date());
            console.info('creating ' + document_list.length + ' documents');

            return dispatchQueue(this, postNewDocument, document_list,
                                 parallel_operation);
          })
          .then(function () {
            return checkQueryListSpeed(
              {},
              // {limit: [0, 1]},
              // Monovalued index
              {index: {key: "portal_type", value: "Jio Perf"}},
              // {query: 'portal_type:"Jio Perf"', limit: [0, 1]},
              {index: {key: "portal_type", value: "NOTMATCHING"}},
              // Multi valued index
              {index: {key: "title", value: 1234}},
              // {query: 'title:"12345"', limit: [0, 1]},
              {index: {key: "title", value: "NOTMATCHING"}}
            );
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