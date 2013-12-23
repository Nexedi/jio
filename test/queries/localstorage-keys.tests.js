/*jslint indent: 2, maxlen: 100, nomen: true */
/*global window, define, module, test_util, RSVP, jIO, local_storage, test, ok,
  deepEqual, sinon, expect, stop, start, Blob, console */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(RSVP, jIO, local_storage);
}([
  'rsvp',
  'jio',
  'localstorage',
  'qunit'
], function (RSVP, jIO, local_storage) {
  "use strict";

  module("LocalStorage");

  local_storage.clear();

  /**
   * all(promises): Promise
   *
   * Produces a promise that is resolved when all the given promises are
   * fulfilled. The resolved value is an array of each of the answers of the
   * given promises.
   *
   * @param  {Array} promises The promises to use
   * @return {Promise} A new promise
   */
  function all(promises) {
    var results = [], i, count = 0;
    function cancel() {
      var j;
      for (j = 0; j < promises.length; j += 1) {
        if (typeof promises[j].cancel === 'function') {
          promises[j].cancel();
        }
      }
    }
    return new RSVP.Promise(function (resolve, reject, notify) {
      /*jslint unparam: true */
      function succeed(j) {
        return function (answer) {
          results[j] = answer;
          count += 1;
          if (count !== promises.length) {
            return;
          }
          resolve(results);
        };
      }
      function notified(j) {
        return function (answer) {
          notify({
            "promise": promises[j],
            "index": j,
            "notified": answer
          });
        };
      }
      for (i = 0; i < promises.length; i += 1) {
        promises[i].then(succeed(i), succeed(i), notified(i));
      }
    }, cancel);
  }


  var key_schema = {
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
    all([
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
    ]).then(function () {

      // get a list of documents
      return jio.allDocs();

    }).always(function (answer) {

      // sort answer rows for comparison
      if (answer.data && answer.data.rows) {
        answer.data.rows.sort(function (a, b) {
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
      }

      deepEqual(answer, {
        "data": {
          "rows": [{
            "id": "a",
            "key": "a",
            "value": {}
          }, {
            "id": "b",
            "key": "b",
            "value": {}
          }, {
            "id": "c",
            "key": "c",
            "value": {}
          }, {
            "id": "d",
            "key": "d",
            "value": {}
          }],
          "total_rows": 4
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "AllDocs");

    }).then(function () {

      // get a list of documents
      return jio.allDocs({
        "include_docs": true,
        "sort_on": [['title', 'ascending'], ['date', 'descending']],
        "select_list": ['title', 'date'],
        "limit": [1] // ==> equal [1, 3] in this case
      });

    }).always(function (answer) {

      deepEqual(answer, {
        "data": {
          "rows": [{
            "doc": {
              "_attachments": {
                "aa": {
                  "content_type": "",
                  "digest": "sha256-9834876dcfb05cb167a5c24953eba58c4" +
                    "ac89b1adf57f28f2f9d09af107ee8f0",
                  "length": 3
                }
              },
              "_id": "a",
              "date": o.date_a.toJSON(),
              "title": "one"
            },
            "id": "a",
            "key": "a",
            "value": {
              "date": o.date_a.toJSON(),
              "title": "one"
            }
          }, {
            "doc": {
              "_id": "d",
              "date": o.date_b.toJSON(),
              "title": "two"
            },
            "id": "d",
            "key": "d",
            "value": {
              "date": o.date_b.toJSON(),
              "title": "two"
            }
          }, {
            "doc": {
              "_id": "b",
              "date": o.date_a.toJSON(),
              "title": "two"
            },
            "id": "b",
            "key": "b",
            "value": {
              "date": o.date_a.toJSON(),
              "title": "two"
            }
          }],
          "total_rows": 3
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "AllDocs include docs + sort on + limit + select_list");

    }).then(function () {

      // use a query
      return jio.allDocs({'query': {
        type: 'simple',
        key: 'mydate',
        operator: '=',
        value: o.date_a.toString()
      }});

    }).always(function (answer) {

      deepEqual(answer, {
        "data": {
          "rows": [{
            "id": "a",
            "key": "a",
            "value": {}
          }, {
            "id": "b",
            "key": "b",
            "value": {}
          }],
          "total_rows": 2
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "AllDocs sort on + query");

    }).always(start);

  });

}));
