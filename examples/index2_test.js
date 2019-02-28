/*
 * Copyright 2019, Nexedi SA
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
    deepEqual = QUnit.deepEqual;


  rJS(window)

    .ready(function (g) {
      return g.run({
        type: "index2",
        database: "index2test3",
        index_keys: {"name": ["normal", "reverse"], "url": ["normal", "reverse"],
          "user": ["normal", "reverse"]},
        sub_storage: {
          type: "nocapacity",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "union",
              storage_list: [{
                type: "memory"
              }]
            }
          }
        }
      });
    })

    .declareMethod('run', function (jio_options) {

      test('Test "' + jio_options.type + '"scenario', function () {
        var jio;
        stop();
        expect(18);

        try {
          jio = jIO.createJIO(jio_options);
        } catch (error) {
          console.error(error.stack);
          console.error(error);
          throw error;
        }

        return RSVP.all([
          jio.put("1", {"name": "envision", "url": "jio.nexedi.com", "user": "Mann"}),
          jio.put("23", {"name": "obscure", "url": "jio.nexedi.com", "user": "Hesse"}),
          jio.put("5", {"name": "envelope", "url": "renderjs.nexedi.com", "user": "Mann"}),
          jio.put("34", {"name": "censure", "url": "nexedi.com", "user": "Brahms"}),
          jio.put("38", {"name": "observe", "url": "erp5.com", "user": "Hesse"}),
          jio.put("76", {"name": "linear", "url": "vifib.com", "user": "J Evol"}),
          jio.put("14", {"name": "obscure", "url": "re6st.nexedi.com", "user": "Lietz"}),
          jio.put("19", {"name": "razor", "url": "erp5.com", "user": "Karajan"}),
          jio.put("59", {"name": "envision", "url": "nexedi.com", "user": "Handel"}),
          jio.put("31", {"name": "obtuse", "url": "officejs.com", "user": "Johann"}),
          jio.put("45", {"name": "repeat", "url": "slapos.com", "user": "Specter"}),
          jio.put("48", {"name": "sever", "url": "neo.nexedi.com", "user": "Rienzi"}),
          jio.put("72", {"name": "organisers", "url": "vifib.net", "user": "Parzival"})
        ])
          .then(function () {
            return jio.allDocs({"query": "name:razor"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 1);
            deepEqual(result.data.rows, ["19"]);
          })
          .then(function () {
            return jio.allDocs({"query": "name:obscure"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 2);
            deepEqual(result.data.rows.sort(), ["23", "14"].sort());
          })
          .then(function () {
            return jio.allDocs({"query": "name:envision AND user:Mann"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 1);
            deepEqual(result.data.rows, ["1"]);
          })
          .then(function () {
            return jio.allDocs({"query": "name:repeat OR url:jio.nexedi.com"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 3);
            deepEqual(result.data.rows.sort(), ["1", "23", "45"].sort());
          })
          .then(function () {
            return jio.allDocs({"query": "(user:Mann OR user:Hesse) AND name:envelope"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 1);
            deepEqual(result.data.rows, ["5"]);
          })
          .then(function () {
            return jio.allDocs({"query": "name:env%"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 3);
            deepEqual(result.data.rows.sort(), ["1", "5", "59"].sort());
          })
          .then(function () {
            return jio.allDocs({"query": "name:%re"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 3);
            deepEqual(result.data.rows.sort(), ["23", "34", "14"].sort());
          })
          .then(function () {
            return jio.allDocs({"query": "name:li%ar"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 1);
            deepEqual(result.data.rows, ["76"]);
          })
          .then(function () {
            return jio.allDocs({"query": "name:o%ser%"});
          })
          .then(function (result) {
            equal(result.data.total_rows, 2);
            deepEqual(result.data.rows.sort(), ["5", "31"].sort());
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