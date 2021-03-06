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
/*jslint maxlen: 120, nomen: true */
/*global localStorage, test_util, console*/
(function (jIO, localStorage, QUnit) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
//     deepEqual = QUnit.deepEqual,
    module = QUnit.module,
    key_schema;

  key_schema = {
    cast_lookup: {
      dateType: function (obj) {
        if (Object.prototype.toString.call(obj) === '[object Date]') {
          // no need to clone
          return obj;
        }
        return new Date(obj);
      }
    },
    key_set: {
      mydate: {
        read_from: 'date',
        cast_to: 'dateType'
      }
    }
  };

  module("localStorage", {
    setup: function () {
      localStorage.clear();
      this.jio = jIO.createJIO({
        "type": "local"
      }, {
        "workspace": {}
      });
    }
  });


  test("AllDocs", function () {
    expect(3);
    var o = {}, jio = jIO.createJIO({
      "type": "local",
      "username": "ualldocs",
      "application_name": "aalldocs",
      "key_schema": key_schema
    }, {
      "workspace": {}
    });

    stop();

    o.date_a = new Date(0);
    o.date_b = new Date();

    // put some document before listing them
    RSVP.all([
      jio.put({
        "_id": "a",
        "title": "one",
        "date": o.date_a
      }).then(function () {
        return jio.putAttachment({
          "_id": "a",
          "_attachment": "aa",
          "_data": "aaa"
        });
      }),
      jio.put({"_id": "b", "title": "two", "date": o.date_a}),
      jio.put({"_id": "c", "title": "one", "date": o.date_b}),
      jio.put({"_id": "d", "title": "two", "date": o.date_b})
    ])
//       .then(function () {
// 
//         // get a list of documents
//         return jio.allDocs();
// 
//       })
//       .then(function (answer) {
// 
//         // sort answer rows for comparison
//         if (answer.data && answer.data.rows) {
//           answer.data.rows.sort(function (a, b) {
//             return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
//           });
//         }
// 
//         deepEqual(answer, {
//           "data": {
//             "rows": [{
//               "id": "a",
//               "key": "a",
//               "value": {}
//             }, {
//               "id": "b",
//               "key": "b",
//               "value": {}
//             }, {
//               "id": "c",
//               "key": "c",
//               "value": {}
//             }, {
//               "id": "d",
//               "key": "d",
//               "value": {}
//             }],
//             "total_rows": 4
//           },
//           "method": "allDocs",
//           "result": "success",
//           "status": 200,
//           "statusText": "Ok"
//         }, "AllDocs");
// 
//       })
//       .then(function () {
// 
//         // get a list of documents
//         return jio.allDocs({
//           "include_docs": true,
//           "sort_on": [['title', 'ascending'], ['date', 'descending']],
//           "select_list": ['title', 'date'],
//           "limit": [1] // ==> equal [1, 3] in this case
//         });
// 
//       })
//       .then(function (answer) {
// 
//         deepEqual(answer, {
//           "data": {
//             "rows": [{
//               "doc": {
//                 "_attachments": {
//                   "aa": {
//                     "content_type": "",
//                     "digest": "sha256-9834876dcfb05cb167a5c24953eba58c4" +
//                       "ac89b1adf57f28f2f9d09af107ee8f0",
//                     "length": 3
//                   }
//                 },
//                 "_id": "a",
//                 "date": o.date_a.toJSON(),
//                 "title": "one"
//               },
//               "id": "a",
//               "key": "a",
//               "value": {
//                 "date": o.date_a.toJSON(),
//                 "title": "one"
//               }
//             }, {
//               "doc": {
//                 "_id": "d",
//                 "date": o.date_b.toJSON(),
//                 "title": "two"
//               },
//               "id": "d",
//               "key": "d",
//               "value": {
//                 "date": o.date_b.toJSON(),
//                 "title": "two"
//               }
//             }, {
//               "doc": {
//                 "_id": "b",
//                 "date": o.date_a.toJSON(),
//                 "title": "two"
//               },
//               "id": "b",
//               "key": "b",
//               "value": {
//                 "date": o.date_a.toJSON(),
//                 "title": "two"
//               }
//             }],
//             "total_rows": 3
//           },
//           "method": "allDocs",
//           "result": "success",
//           "status": 200,
//           "statusText": "Ok"
//         }, "AllDocs include docs + sort on + limit + select_list");
// 
//       })
//       .then(function () {
// 
//         // use a query
//         return jio.allDocs({'query': {
//           type: 'simple',
//           key: 'mydate',
//           operator: '=',
//           value: o.date_a.toString()
//         }});
// 
//       })
//       .then(function (answer) {
// 
//         deepEqual(answer, {
//           "data": {
//             "rows": [{
//               "id": "a",
//               "key": "a",
//               "value": {}
//             }, {
//               "id": "b",
//               "key": "b",
//               "value": {}
//             }],
//             "total_rows": 2
//           },
//           "method": "allDocs",
//           "result": "success",
//           "status": 200,
//           "statusText": "Ok"
//         }, "AllDocs sort on + query");
// 
//       })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });

  });

}(jIO, localStorage, QUnit));
