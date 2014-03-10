/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, exports, require, module, jIO, window, test, ok,
  deepEqual, stop, start */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(require('jio'));
  }
  module(jIO);
}(['jio', 'qunit'], function (jIO) {
  "use strict";

  module('Query');

  // XXX test documentation
  test('Empty Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    stop();
    jIO.QueryFactory.create('').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a"},
          {"identifier": ["b", "c"]}
        ], 'Nothing done on the list');
      }).always(start);
  });

  test('Simple Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    stop();
    jIO.QueryFactory.create('identifier: "a"').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a"}
        ], 'Document with several identifier should be removed');

        doc_list = [
          {"identifier": "a"},
          {"identifier": ["a", "b"]}
        ];

        return jIO.QueryFactory.create('identifier: "a"').
          exec(doc_list);
      }).then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a"},
          {"identifier": ["a", "b"]}
        ], 'Document with several identifier should be kept');
      }).always(start);
  });

  test('Complex Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    stop();
    jIO.QueryFactory.create(
      'identifier: "b" AND identifier: "c"'
    ).exec(doc_list).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": ["b", "c"]}
      ], 'Document with only one identifier should be removed');

      doc_list = [
        {"identifier": "a"},
        {"identifier": ["b", "c"]}
      ];
      return jIO.QueryFactory.create(
        'identifier: "a" OR identifier: "c"'
      ).exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a"},
        {"identifier": ["b", "c"]}
      ], 'All document matches');

      doc_list = [
        {"identifier": "a", "title": "o"},
        {"identifier": ["b", "c"]}
      ];

      return jIO.QueryFactory.create(
        '(identifier: "a" OR identifier: "b") AND title: "o"'
      ).exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a", "title": "o"}
      ], 'Only first document should be kept');
    }).always(start);
  });

  test('Wildcard Character', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": "a%"},
      {"identifier": "a\\%"},
      {"identifier": ["ab", "b"]}
    ];
    stop();
    jIO.QueryFactory.create('identifier: "a%"').exec(
      doc_list
    ).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ], 'All documents should be kept');

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ];

      return jIO.QueryFactory.create('identifier: "a\\%"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a\\%"}
      ], 'Only third document should be kept');
      // yes.. it's weird but ERP5 acts like that.
      // `\` (or "\\") is taken literaly (= /\\/)

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ];

      return jIO.QueryFactory.create('identifier: "__"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
      ], 'Should keep nothing');

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ];

      return jIO.QueryFactory.create('identifier: "__%"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ], 'First should not be kept');
      // yes.. it's weird but ERP5 acts like that.
      // `_` is not considered as wildcard (= /./)
    }).always(start);
  });

  test("Additional Filters", function () {
    var doc_list = [
      {"identifier": "b", "title": "e"},
      {"identifier": "a", "title": "f"},
      {"identifier": "b", "title": "d"}
    ];
    stop();
    jIO.QueryFactory.create('').exec(doc_list, {
      "select_list": ["title"],
      "limit": [2, 1],
      "sort_on": [["identifier", "ascending"], ["title", "descending"]]
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"title": "d"}
      ], 'The first document should be kept');
    }).always(start);
  });

  test("JSON query", function () {
    var jsoned = jIO.QueryFactory.create(
      "NOT(a:=b OR c:% AND d:<2)"
    ).toJSON();
    deepEqual(
      jsoned,
      {
        "type": "complex",
        "operator": "NOT",
        "query_list": [{
          "type": "complex",
          "operator": "OR",
          "query_list": [{
            "key": "a",
            "operator": "=",
            "type": "simple",
            "value": "b"
          }, {
            "type": "complex",
            "operator": "AND",
            "query_list": [{
              "key": "c",
              "type": "simple",
              "value": "%"
            }, {
              "key": "d",
              "operator": "<",
              "type": "simple",
              "value": "2"
            }]
          }]
        }]
      },
      "\"NOT(a:=b OR c:% AND d:<2)\".toJSON()"
    );
    deepEqual(
      jIO.Query.parseStringToObject("NOT(a:=b OR c:% AND d:<2)"),
      jsoned,
      "parseStringToObject(\"NOT(a:=b OR c:% AND d:<2)\");"
    );

    deepEqual(
      jIO.QueryFactory.create(
        "NOT(a:=b OR c:% AND d:<2)"
      ),
      jIO.QueryFactory.create(
        jIO.QueryFactory.create(
          "NOT(a:=b OR c:% AND d:<2)"
        )
      ),
      "create(create(\"NOT(a:=b OR c:% AND d:<2)\"));"
    );

    deepEqual(
      jIO.QueryFactory.create(
        jIO.QueryFactory.create(
          "NOT(a:=b OR c:% AND d:<2)"
        )
      ).toString(),
      "NOT ( ( a: = \"b\" ) OR ( ( c: \"%\" ) AND ( d: < \"2\" ) ) )",
      "create(create(\"NOT(a:=b OR c:% AND d:<2)\")).toString();"
    );

  });

}));
