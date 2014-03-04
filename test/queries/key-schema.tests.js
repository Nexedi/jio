/*jslint indent: 2, maxlen: 100, nomen: true, vars: true */
/*global define, exports, require, module, jIO, window, test, ok,
  deepEqual, sinon, start, stop, RSVP */

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

  module('Custom Key Queries with Schema');

  var noop = function () {
    return; // use with RSVP.all
  };

  var translationEqualityMatcher = function (data) {
    return function (object_value, value) {
      value = data[value];
      return (object_value === value);
    };
  };

  /*jslint unparam: true*/
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

    match_lookup: {
      sameDay: function (a, b) {
        return (
          (a.getFullYear() === b.getFullYear()) &&
            (a.getMonth() === b.getMonth()) &&
              (a.getDate() === b.getDate())
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

    key_set: {
      case_insensitive_identifier: {
        read_from: 'identifier',
        equal_match: function (object_value, value, wildcard_character) {
          // XXX do this with a regexp and wildcard support
          return (object_value.toLowerCase() === value.toLowerCase());
        }
      },
      date_day: {
        read_from: 'date',
        cast_to: 'dateType',
        equal_match: 'sameDay'
      },
      date_month: {
        read_from: 'date',
        cast_to: 'dateType',
        equal_match: 'sameMonth'
      },
      date_year: {
        read_from: 'date',
        cast_to: 'dateType',
        equal_match: 'sameYear'
      },
      translated_state: {
        read_from: 'state',
        equal_match: 'equalState'
      }
    }
  };
  /*jslint unparam: false*/


  test('Keys defined in a Schema can be used like metadata', function () {
    var docList = function () {
      return [
        {'identifier': 'a'},
        {'identifier': 'A'},
        {'identifier': 'b'}
      ];
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'case_insensitive_identifier',
        value: 'A'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': 'a'},
            {'identifier': 'A'}
          ], 'Key Schema: case_insensitive_identifier');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });


  test('Standard date keys', function () {
    var docList = function () {
      return [
        {'identifier': 'a', 'date': '2013-01-01'},
        {'identifier': 'b', 'date': '2013-02-01'},
        {'identifier': 'bb', 'date': '2013-02-02'},
        {'identifier': 'bbb', 'date': '2013-02-03'},
        {'identifier': 'c', 'date': '2013-03-03'},
        {'identifier': 'd', 'date': '2013-04-04'}
      ];
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date_day',
        value: '2013-02-02'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': 'bb', 'date': '2013-02-02'}
          ], 'Key Schema: same_day');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date_month',
        value: '2013-02-10'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2013-02-01', 'identifier': 'b'},
            {'date': '2013-02-02', 'identifier': 'bb'},
            {'date': '2013-02-03', 'identifier': 'bbb'}
          ], 'Key Schema: date_month');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date_year',
        value: '2013-02-10'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl.length, 6, 'Key Schema: date_year');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });


  test('Test key schema + jio query', function () {
    var docList = function () {
      return [
        {'identifier': '10', 'number': '10'},
        {'identifier': '19', 'number': '19'},
        {'identifier': '100', 'number': '100'}
      ];
    }, test_key_schema = {
      cast_lookup: {
        intType: function (value) {
          if (typeof value === 'string') {
            return parseInt(value, 10);
          }
          return value;
        }
      },
      key_set: {
        number: {
          read_from: 'number',
          cast_to: 'intType'
        }
      }
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'complex',
        operator: 'OR',
        query_list: [{
          type: 'simple',
          key: 'number',
          operator: '<',
          value: '19'
        }, {
          type: 'simple',
          key: 'number',
          operator: '=',
          value: '19'
        }]
      }, test_key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '10', 'number': '10'},
            {'identifier': '19', 'number': '19'}
          ], 'Key schema should be propagated from complex to simple queries');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });


  test('Key Schema with translation lookup', function () {
    var docList = function () {
      return [
        {'identifier': '1', 'state': 'open'},
        {'identifier': '2', 'state': 'closed'}
      ];
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'translated_state',
        value: 'ouvert'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '1', 'state': 'open'}
          ], 'Key Schema: It should be possible to look for a translated string');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'translated_state',
        operator: '=',
        value: 'ouvert'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '1', 'state': 'open'}
          ], 'Key Schema: It should be possible to look for a translated string with operator =');
        })
    );


// XXX not implemented yet
//    doc_list = docList();
//    jIO.QueryFactory.create({
//      type: 'simple',
//      key: 'translated_state',
//      operator: '!=',
//      value: 'ouvert'
//    }).exec(doc_list);
//    deepEqual(doc_list, [
//      {'identifier': '2', 'state': 'closed'}
//    ], 'Key Schema: It should be possible to look for a translated string with operator !=');

    RSVP.all(promise).then(noop).always(start);
  });

}));
