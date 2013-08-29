/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, exports, require, module, complex_queries, window, test, ok,
  deepEqual, sinon */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(require('complex_queries'));
  }
  module(complex_queries);
}(['complex_queries', 'qunit'], function (complex_queries) {
  "use strict";

  module('Complex Queries');

  // XXX test documentation
  test('Empty Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    complex_queries.QueryFactory.create('').exec(doc_list);
    deepEqual(doc_list, [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ], 'Nothing done on the list');
  });

  test('Simple Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    complex_queries.QueryFactory.create('identifier: "a"').exec(doc_list);
    deepEqual(doc_list, [
      {"identifier": "a"}
    ], 'Document with several identifier should be removed');

    doc_list = [
      {"identifier": "a"},
      {"identifier": ["a", "b"]}
    ];
    complex_queries.QueryFactory.create('identifier: "a"').exec(doc_list);
    deepEqual(doc_list, [
      {"identifier": "a"},
      {"identifier": ["a", "b"]}
    ], 'Document with several identifier should be kept');
  });

  test('Complex Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    complex_queries.QueryFactory.create(
      'identifier: "b" AND identifier: "c"'
    ).exec(doc_list);
    deepEqual(doc_list, [
      {"identifier": ["b", "c"]}
    ], 'Document with only one identifier should be removed');

    doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    complex_queries.QueryFactory.create(
      'identifier: "a" OR identifier: "c"'
    ).exec(doc_list);
    deepEqual(doc_list, [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ], 'All document matches');

    doc_list = [
      {"identifier": "a", "title": "o"},
      {"identifier": ["b", "c"]}
    ];
    complex_queries.QueryFactory.create(
      '(identifier: "a" OR identifier: "b") AND title: "o"'
    ).exec(doc_list);
    deepEqual(doc_list, [
      {"identifier": "a", "title": "o"}
    ], 'Only first document should be kept');
  });

  test('Wildcard Character', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": "a%"},
      {"identifier": ["ab", "b"]}
    ];
    complex_queries.QueryFactory.create('identifier: "a%"').exec(doc_list, {
      // "wildcard_character": "%" // default
    });
    deepEqual(doc_list, [
      {"identifier": "a"},
      {"identifier": "a%"},
      {"identifier": ["ab", "b"]}
    ], 'All documents should be kept');

    doc_list = [
      {"identifier": "a"},
      {"identifier": "a%"},
      {"identifier": ["ab", "b"]}
    ];
    complex_queries.QueryFactory.create('identifier: "a%"').exec(doc_list, {
      "wildcard_character": null
    });
    deepEqual(doc_list, [
      {"identifier": "a%"}
    ], 'Document "a%" should be kept');

    doc_list = [
      {"identifier": "a"},
      {"identifier": "a%"},
      {"identifier": ["ab", "b"]}
    ];
    complex_queries.QueryFactory.create('identifier: "b"').exec(doc_list, {
      "wildcard_character": "b"
    });
    deepEqual(doc_list, [
      {"identifier": "a"},
      {"identifier": "a%"},
      {"identifier": ["ab", "b"]}
    ], 'All documents should be kept');
  });

  test("Additional Filters", function () {
    var doc_list = [
      {"identifier": "b", "title": "e"},
      {"identifier": "a", "title": "f"},
      {"identifier": "b", "title": "d"}
    ];
    complex_queries.QueryFactory.create('').exec(doc_list, {
      "select_list": ["title"],
      "limit": [2, 1],
      "sort_on": [["identifier", "ascending"], ["title", "descending"]]
    });
    deepEqual(doc_list, [
      {"title": "d"}
    ], 'The first document should be kept');
  });

}));
