/*jslint indent: 2, maxlen: 120, nomen: true, vars: true */
/*global define, exports, require, module, jIO, window, test, ok,
  equal, deepEqual, sinon, stop, start, RSVP */

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

  module('Custom Key Queries');

  var noop = function () {
    return; // use with RSVP.all
  };

  test('Simple Key with read_from', function () {
    var docList = function () {
      return [
        {'identifier': 'a'},
        {'identifier': 'A'},
        {'identifier': 'b'}
      ];
    }, keys = {
      title: {
        read_from: 'identifier'
      },
      case_insensitive_identifier: {
        read_from: 'identifier',
        equal_match: function (object_value, value) {
          return (object_value.toLowerCase() === value.toLowerCase());
        }
      }
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.title,
        value: 'a'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': 'a'}
          ], 'It should be possible to query with an alias key');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.case_insensitive_identifier,
        value: 'A'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': 'a'},
            {'identifier': 'A'}
          ], 'It should be possible to query with a case-insensitive alias key');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });


  var dateCast = function (obj) {
    if (Object.prototype.toString.call(obj) === '[object Date]') {
      // no need to clone
      return obj;
    }

    return new Date(obj);
  };


  test('Simple Key with date casting', function () {
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

    var sameDay = function (a, b) {
      return (
        (a.getUTCFullYear() === b.getUTCFullYear()) &&
          (a.getUTCMonth() === b.getUTCMonth()) &&
            (a.getUTCDate() === b.getUTCDate())
      );
    };

    var sameMonth = function (a, b) {
      return (
        (a.getUTCFullYear() === b.getUTCFullYear()) &&
          (a.getUTCMonth() === b.getUTCMonth())
      );
    };

    var sameYear = function (a, b) {
      return (a.getUTCFullYear() === b.getUTCFullYear());
    };

    var keys = {
      day: {
        read_from: 'date',
        cast_to: dateCast,
        equal_match: sameDay
      },
      month: {
        read_from: 'date',
        cast_to: dateCast,
        equal_match: sameMonth
      },
      year: {
        read_from: 'date',
        cast_to: dateCast,
        equal_match: sameYear
      },
      broken: {
        read_from: 'date',
        cast_to: function () { throw new Error('Broken!'); }
      }
    };

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.day,
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': 'bb', 'date': '2013-02-02'}
          ], 'It should be possible to compare dates with sameDay');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.month,
        value: '2013-02-10'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2013-02-01', 'identifier': 'b'},
            {'date': '2013-02-02', 'identifier': 'bb'},
            {'date': '2013-02-03', 'identifier': 'bbb'}
          ], 'It should be possible to compare dates with sameMonth');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.year,
        value: '2013-02-10'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl.length, 6,
                    'It should be possible to compare dates with sameYear');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.broken,
        value: '2013-02-10'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl.length, 0,
                    'Constructors that throw exceptions should not break a query, but silently fail comparisons');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });


  test('Simple Key with date casting and <=> operators', function () {
    var docList = function () {
      return [
        {'identifier': '1', 'date': '2013-01-01'},
        {'identifier': '2', 'date': '2013-02-02'},
        {'identifier': '3', 'date': '2013-03-03'}
      ];
    }, keys = {
      mydate: {
        read_from: 'date',
        cast_to: dateCast
      }
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '=',
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '2', 'date': '2013-02-02'}
          ], 'It should be possible to search for dates with operator =');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '!=',
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '1', 'date': '2013-01-01'},
            {'identifier': '3', 'date': '2013-03-03'}
          ], 'It should be possible to search for dates with operator !=');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '<=',
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '1', 'date': '2013-01-01'},
            {'identifier': '2', 'date': '2013-02-02'}
          ], 'It should be possible to search for dates with operator <=');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '<',
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '1', 'date': '2013-01-01'}
          ], 'It should be possible to search for dates with operator <');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '>',
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '3', 'date': '2013-03-03'}
          ], 'It should be possible to search for dates with operator >');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '>=',
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '2', 'date': '2013-02-02'},
            {'identifier': '3', 'date': '2013-03-03'}
          ], 'It should be possible to search for dates with operator >=');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });


  test('Simple Key with both equal_match and operator attributes', function () {
    var docList = function () {
      return [
        {'identifier': '1', 'date': '2013-01-01'},
        {'identifier': '2', 'date': '2013-02-02'},
        {'identifier': '3', 'date': '2013-03-03'}
      ];
    }, keys = {
      mydate: {
        read_from: 'date',
        cast_to: dateCast,
        equal_match: function alwaysTrue(o1) { /*, o2*/
          return o1.getUTCDate() === 2;
        }
      }
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '2', 'date': '2013-02-02'}
          ], "'equal_match' with no 'operator'");
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '=',
        value: '2013-01-01'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '2', 'date': '2013-02-02'}
          ], "'equal_match' overrides '=' operator");
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.mydate,
        operator: '>=',
        value: '2013-02-02'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '2', 'date': '2013-02-02'},
            {'identifier': '3', 'date': '2013-03-03'}
          ], "'equal_match' does not override '>' operator");
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });



  test('Test overriding operators and compound query', function () {
    var docList = function () {
      return [
        {'identifier': '10', 'number': '10'},
        {'identifier': '19', 'number': '19'},
        {'identifier': '100', 'number': '100'}
      ];
    }, intType = function (value) {
      if (typeof value === 'string') {
        return parseInt(value, 10);
      }
      return value;
    }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: {
          read_from: 'number',
          cast_to: intType
        },
        operator: '>',
        value: '19'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '100', 'number': '100'}
          ], 'Numbers are correctly compared (>) after casting');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: {
          read_from: 'number',
          cast_to: intType
        },
        operator: '<',
        value: '19'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '10', 'number': '10'}
          ], 'Numbers are correctly compared (<) after casting');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'complex',
        operator: 'OR',
        query_list: [{
          type: 'simple',
          key: {
            read_from: 'number',
            cast_to: intType
          },
          operator: '<',
          value: '19'
        }, {
          type: 'simple',
          key: {
            read_from: 'number',
            cast_to: intType
          },
          operator: '=',
          value: '19'
        }]
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '10', 'number': '10'},
            {'identifier': '19', 'number': '19'}
          ], 'Custom keys should also work within compound queries');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });


  var translationEqualityMatcher = function (data) {
    return function (object_value, value) {
      value = data[value];
      return (object_value === value);
    };
  };


  test('Simple Key with translation lookup', function () {
    var docList = function () {
      return [
        {'identifier': '1', 'state': 'open'},
        {'identifier': '2', 'state': 'closed'}
      ];
    },
      equalState = translationEqualityMatcher({'ouvert': 'open'}),
      keys = {
        translated_state: {
          read_from: 'state',
          equal_match: equalState
        }
      }, promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.translated_state,
        value: 'ouvert'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '1', 'state': 'open'}
          ], 'It should be possible to look for a translated string with a custom match function');
        })
    );


    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.translated_state,
        operator: '=',
        value: 'ouvert'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': '1', 'state': 'open'}
          ], 'It should be possible to look for a translated string with operator =');
        })
    );

// XXX not implemented yet
//    doc_list = docList();
//    jIO.QueryFactory.create({
//      type: 'simple',
//      key: keys.translated_state,
//      operator: '!=',
//      value: 'ouvert'
//    }).exec(doc_list);
//    deepEqual(doc_list, [
//      {'identifier': '2', 'state': 'closed'}
//    ], 'It should be possible to look for a translated string with operator !=');

    RSVP.all(promise).then(noop).always(start);
  });


  // This method is provided as an example.
  // A more robust solution to manage diacritics is recommended for production
  // environments, with unicode normalization, like (untested):
  // https://github.com/walling/unorm/
  var accentFold = function (s) {
    var map = [
      [new RegExp('[àáâãäå]', 'gi'), 'a'],
      [new RegExp('æ', 'gi'), 'ae'],
      [new RegExp('ç', 'gi'), 'c'],
      [new RegExp('[èéêë]', 'gi'), 'e'],
      [new RegExp('[ìíîï]', 'gi'), 'i'],
      [new RegExp('ñ', 'gi'), 'n'],
      [new RegExp('[òóôõö]', 'gi'), 'o'],
      [new RegExp('œ', 'gi'), 'oe'],
      [new RegExp('[ùúûü]', 'gi'), 'u'],
      [new RegExp('[ýÿ]', 'gi'), 'y']
    ];

    map.forEach(function (o) {
      var rep = function (match) {
        if (match.toUpperCase() === match) {
          return o[1].toUpperCase();
        }
        return o[1];
      };
      s = s.replace(o[0], rep);
    });
    return s;
  };

  test('Accent folding', function () {
    equal(accentFold('àéîöùç'), 'aeiouc');
    equal(accentFold('ÀÉÎÖÙÇ'), 'AEIOUC');
    equal(accentFold('àéî öùç'), 'aei ouc');
  });


  test('Query with accent folding and wildcard', function () {
    /*jslint unparam: true*/
    var docList = function () {
      return [
        {'identifier': 'àéîöùç'},
        {'identifier': 'âèî ôùc'},
        {'identifier': 'ÀÉÎÖÙÇ'},
        {'identifier': 'b'}
      ];
    }, keys = {
      identifier: {
        read_from: 'identifier',
        cast_to: accentFold
      }
    }, promise = [];
    /*jslint unparam: false*/

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: keys.identifier,
        value: 'aei%'
      }).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'identifier': 'àéîöùç'},
            {'identifier': 'âèî ôùc'}
          ], 'It should be possible to query regardless of accents');
        })
    );

    RSVP.all(promise).then(noop).always(start);
  });

}));
