/*jslint indent: 2, maxlen: 120, nomen: true, vars: true */
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

  module('Custom Key Queries');

  test('Simple Key with readFrom', function () {
    /*jslint unparam: true*/
    var doc_list, docList = function () {
      return [
        {'identifier': 'a'},
        {'identifier': 'A'},
        {'identifier': 'b'}
      ];
    }, keys = {
      title: {
        readFrom: 'identifier'
      },
      case_insensitive_identifier: {
        readFrom: 'identifier',
        defaultMatch: function (object_value, value, wildcard_character) {
          return (object_value.toLowerCase() === value.toLowerCase());
        }
      }
    };
    /*jslint unparam: false*/

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.title,
      value: 'a'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': 'a'}
    ], 'It should be possible to query with an alias key');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.case_insensitive_identifier,
      value: 'A'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': 'a'},
      {'identifier': 'A'}
    ], 'It should be possible to query with a case-insensitive alias key');
  });


  var dateCast = function (obj) {
    if (Object.prototype.toString.call(obj) === '[object Date]') {
      // no need to clone
      return obj;
    }
    return new Date(obj);
  };


  test('Simple Key with date casting', function () {
    var doc_list, docList = function () {
      return [
        {'identifier': 'a', 'date': '2013-01-01'},
        {'identifier': 'b', 'date': '2013-02-01'},
        {'identifier': 'bb', 'date': '2013-02-02'},
        {'identifier': 'bbb', 'date': '2013-02-03'},
        {'identifier': 'c', 'date': '2013-03-03'},
        {'identifier': 'd', 'date': '2013-04-04'}
      ];
    };

    var sameDay = function (a, b) {
      return (
        (a.getFullYear() === b.getFullYear()) &&
          (a.getMonth() === b.getMonth()) &&
            (a.getDate() === b.getDate())
      );
    };

    var sameMonth = function (a, b) {
      return (
        (a.getFullYear() === b.getFullYear()) &&
          (a.getMonth() === b.getMonth())
      );
    };

    var sameYear = function (a, b) {
      return (a.getFullYear() === b.getFullYear());
    };

    var keys = {
      day: {
        readFrom: 'date',
        castTo: dateCast,
        defaultMatch: sameDay
      },
      month: {
        readFrom: 'date',
        castTo: dateCast,
        defaultMatch: sameMonth
      },
      year: {
        readFrom: 'date',
        castTo: dateCast,
        defaultMatch: sameYear
      }
    };

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.day,
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': 'bb', 'date': '2013-02-02'}
    ], 'It should be possible to compare dates with sameDay');


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.month,
      value: '2013-02-10'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {
        'date': '2013-02-01',
        'identifier': 'b'
      },
      {
        'date': '2013-02-02',
        'identifier': 'bb'
      },
      {
        'date': '2013-02-03',
        'identifier': 'bbb'
      }
    ], 'It should be possible to compare dates with sameMonth');


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.year,
      value: '2013-02-10'
    }).exec(doc_list);
    deepEqual(doc_list.length, 6,
              'It should be possible to compare dates with sameYear');

  });


  test('Simple Key with date casting and <=> operators', function () {
    var doc_list, docList = function () {
      return [
        {'identifier': '1', 'date': '2013-01-01'},
        {'identifier': '2', 'date': '2013-02-02'},
        {'identifier': '3', 'date': '2013-03-03'}
      ];
    }, keys = {
      mydate: {
        readFrom: 'date',
        castTo: dateCast
      }
    };

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      operator: '=',
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '2', 'date': '2013-02-02'}
    ], 'It should be possible to search for dates with operator =');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      operator: '!=',
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'date': '2013-01-01'},
      {'identifier': '3', 'date': '2013-03-03'}
    ], 'It should be possible to search for dates with operator !=');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      operator: '<=',
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'date': '2013-01-01'},
      {'identifier': '2', 'date': '2013-02-02'}
    ], 'It should be possible to search for dates with operator <=');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      operator: '<',
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'date': '2013-01-01'}
    ], 'It should be possible to search for dates with operator <');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      operator: '>',
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '3', 'date': '2013-03-03'}
    ], 'It should be possible to search for dates with operator >');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      operator: '>=',
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '2', 'date': '2013-02-02'},
      {'identifier': '3', 'date': '2013-03-03'}
    ], 'It should be possible to search for dates with operator >=');

  });


  test('Simple Key with both defaultMatch and operator attributes', function () {
    var doc_list, docList = function () {
      return [
        {'identifier': '1', 'date': '2013-01-01'},
        {'identifier': '2', 'date': '2013-02-02'},
        {'identifier': '3', 'date': '2013-03-03'}
      ];
    }, keys = {
      mydate: {
        readFrom: 'date',
        castTo: dateCast,
        defaultMatch: function alwaysTrue() { return true; }
      }
    };


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'date': '2013-01-01'},
      {'identifier': '2', 'date': '2013-02-02'},
      {'identifier': '3', 'date': '2013-03-03'}
    ], 'It should be possible to use a catch-all filter');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.mydate,
      operator: '>=',
      value: '2013-02-02'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'date': '2013-01-01'},
      {'identifier': '2', 'date': '2013-02-02'},
      {'identifier': '3', 'date': '2013-03-03'}
    ], 'An explicit operator should override the catch-all filter');

  });


  var intType = function (value) {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  };


  test('Test overriding operators and compound query', function () {
    var doc_list, docList = function () {
      return [
        {'identifier': '10', 'number': '10'},
        {'identifier': '19', 'number': '19'},
        {'identifier': '100', 'number': '100'}
      ];
    };

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: {
        readFrom: 'number',
        castTo: intType
      },
      operator: '>',
      value: '19'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '100', 'number': '100'}
    ], 'Numbers are correctly compared (>) after casting');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: {
        readFrom: 'number',
        castTo: intType
      },
      operator: '<',
      value: '19'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '10', 'number': '10'}
    ], 'Numbers are correctly compared (<) after casting');

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'complex',
      operator: 'OR',
      query_list: [{
        type: 'simple',
        key: {
          readFrom: 'number',
          castTo: intType
        },
        operator: '<',
        value: '19'
      }, {
        type: 'simple',
        key: {
          readFrom: 'number',
          castTo: intType
        },
        operator: '>',
        value: '19'
      }]
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '10', 'number': '10'},
      {'identifier': '100', 'number': '100'}
    ], 'Custom keys should also work within compound queries');

  });


  var translationEqualityMatcher = function (data) {
    return function (object_value, value) {
      value = data[value];
      return (object_value === value);
    };
  };


  test('Simple Key with translation lookup', function () {
    var doc_list, docList = function () {
      return [
        {'identifier': '1', 'state': 'open'},
        {'identifier': '2', 'state': 'closed'}
      ];
    },
      equalState = translationEqualityMatcher({'ouvert': 'open'}),
      keys = {
        translated_state: {
          readFrom: 'state',
          defaultMatch: equalState
        }
      };


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.translated_state,
      value: 'ouvert'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'state': 'open'}
    ], 'It should be possible to look for a translated string with a custom match function');


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: keys.translated_state,
      operator: '=',
      value: 'ouvert'
    }).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'state': 'open'}
    ], 'It should be possible to look for a translated string with operator =');


//    doc_list = docList();
//    complex_queries.QueryFactory.create({
//      type: 'simple',
//      key: keys.translated_state,
//      operator: '!=',
//      value: 'ouvert'
//    }).exec(doc_list);
//    deepEqual(doc_list, [
//      {'identifier': '2', 'state': 'closed'}
//    ], 'It should be possible to look for a translated string with operator !=');


  });


}));
