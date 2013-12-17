/*jslint indent: 2, maxlen: 100, nomen: true, vars: true */
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

  var translationEqualityMatcher = function (data) {
    return function (object_value, value) {
      value = data[value];
      return (object_value === value);
    };
  };


  /*jslint unparam: true*/
  var key_schema = {
    types: {
      dateType: function (obj) {
        if (Object.prototype.toString.call(obj) === '[object Date]') {
          // no need to clone
          return obj;
        }
        return new Date(obj);
      }
    },

    comparators: {
      sameDay: function (a, b) {
        return (
          (a.getFullYear() === b.getFullYear()) &&
            (a.getMonth() === b.getMonth()) &&
              (a.getDay() === b.getDay())
        );
      },
      sameMonth: function (a, b) {
        return (
          (a.getFullYear() === b.getFullYear()) &&
            (a.getMonth() === b.getMonth())
        );
      },
      sameYear: function (a, b) {
        return (a.getFullYear() === b.getFullYear());
      },
      equalState: translationEqualityMatcher({'ouvert': 'open'})
    },

    keys: {
      case_insensitive_identifier: {
        readFrom: 'identifier',
        defaultMatch: function (object_value, value, wildcard_character) {
          // XXX do this with a regexp and wildcard support
          return (object_value.toLowerCase() === value.toLowerCase());
        }
      },
      date_day: {
        readFrom: 'date',
        castTo: 'dateType',
        defaultMatch: 'sameDay'
      },
      date_month: {
        readFrom: 'date',
        castTo: 'dateType',
        defaultMatch: 'sameMonth'
      },
      date_year: {
        readFrom: 'date',
        castTo: 'dateType',
        defaultMatch: 'sameYear'
      },
      translated_state: {
        readFrom: 'state',
        defaultMatch: 'equalState'
      }
    }
  };
  /*jslint unparam: false*/



  module('Queries with Key Schema');

  test('Keys defined in a Schema can be used like metadata', function () {
    var doc_list, docList = function () {
      return [
        {'identifier': 'a'},
        {'identifier': 'A'},
        {'identifier': 'b'}
      ];
    };

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: 'case_insensitive_identifier',
      value: 'A'
    }, key_schema).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': 'a'},
      {'identifier': 'A'}
    ], 'Key Schema: case_insensitive_identifier');
  });


  test('Standard date keys', function () {
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

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: 'date_day',
      value: '2013-02-02'
    }, key_schema).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': 'bb', 'date': '2013-02-02'}
    ], 'Key Schema: same_day');


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: 'date_month',
      value: '2013-02-10'
    }, key_schema).exec(doc_list);
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
    ], 'Key Schema: date_month');


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: 'date_year',
      value: '2013-02-10'
    }, key_schema).exec(doc_list);
    deepEqual(doc_list.length, 6, 'Key Schema: date_year');

  });


  test('Key Schema with translation lookup', function () {
    var doc_list, docList = function () {
      return [
        {'identifier': '1', 'state': 'open'},
        {'identifier': '2', 'state': 'closed'}
      ];
    };

    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: 'translated_state',
      value: 'ouvert'
    }, key_schema).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'state': 'open'}
    ], 'Key Schema: It should be possible to look for a translated string');


    doc_list = docList();
    complex_queries.QueryFactory.create({
      type: 'simple',
      key: 'translated_state',
      operator: '=',
      value: 'ouvert'
    }, key_schema).exec(doc_list);
    deepEqual(doc_list, [
      {'identifier': '1', 'state': 'open'}
    ], 'Key Schema: It should be possible to look for a translated string with operator =');


//    doc_list = docList();
//    complex_queries.QueryFactory.create({
//      type: 'simple',
//      key: 'translated_state',
//      operator: '!=',
//      value: 'ouvert'
//    }).exec(doc_list);
//    deepEqual(doc_list, [
//      {'identifier': '2', 'state': 'closed'}
//    ], 'Key Schema: It should be possible to look for a translated string with operator !=');


  });


}));
