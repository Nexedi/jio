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
/*global jiodate*/
(function (jIO, jiodate) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module,
    noop = function () {
      return; // use with RSVP.all
    },
    translationEqualityMatcher = function (data) {
      return function (object_value, value) {
        value = data[value];
        return (object_value === value);
      };
    },
    key_schema;

  module('Custom Key Queries with Schema');

  /*jslint unparam: true*/
  key_schema = {
    cast_lookup: {
      dateType: function (obj) {
        return new jiodate.JIODate(obj);
      }
    },

    match_lookup: {
      sameDay: function (a, b) {
        return (
          (a.mom.year() === b.mom.year()) &&
            (a.mom.month() === b.mom.month()) &&
              (a.mom.date() === b.mom.date())
        );
      },
      sameMonth: function (a, b) {
        return (
          (a.mom.year() === b.mom.year()) &&
            (a.mom.month() === b.mom.month())
        );
      },
      sameYear: function (a, b) {
        return (a.mom.year() === b.mom.year());
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

  test('Test key schema + jio query with sort on', function () {
    var docList = function () {
      return [
        {'identifier': '10', 'number': '10'},
        {'identifier': '2', 'number': '2'},
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
        exec(
          docList(),
          {sort_on: [['number', 'ascending']]}
        ).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '2', 'number': '2'},
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
          ], 'Key Schema: It should be possible to look for a translated ' +
             'string');
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
          ], 'Key Schema: It should be possible to look for a translated ' +
             'string with operator =');
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
//    ], 'Key Schema: It should be possible to look for a translated ' +
//       'string with operator !=');

    RSVP.all(promise).then(noop).always(start);
  });

}(jIO, jiodate));
