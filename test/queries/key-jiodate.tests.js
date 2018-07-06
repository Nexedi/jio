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
/*jslint indent: 2, maxlen: 120, nomen: true, vars: true */
/*global define, exports, require, module, jIO, jiodate, window, test,
  ok, equal, deepEqual, sinon, start, stop, RSVP */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(require('jio'), require('jiodate'));
  }
  module(jIO, jiodate);
}(['jio', 'jiodate', 'qunit'], function (jIO, jiodate) {
  "use strict";

  module('Custom Key Queries with JIODate');

  var noop = function () {
    return; // use with RSVP.all
  };

  test('Stock comparison operators with year precision', function () {
    var docList = function () {
      return [
        {'identifier': 'twenty ten', 'date': '2010-03-04 08:52:13.746'},
        {'identifier': 'twenty eleven', 'date': '2011-03-04 08:52:13.746'},
        {'identifier': 'twenty twelve', 'date': '2012-03-04 08:52:13.746'}
      ];
    }, key_schema = {
      key_set: {
        date: {
          read_from: 'date',
          cast_to: jiodate.JIODate
        }
      }
    }, query_list = [], promise = [];

    stop();

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date',
        value: '2011'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2011-03-04 08:52:13.746', 'identifier': 'twenty eleven'}
          ], 'Match with "date = 2011" (query tree form)');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date',
        operator: '!=',
        value: '2011'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2010-03-04 08:52:13.746', 'identifier': 'twenty ten'},
            {'date': '2012-03-04 08:52:13.746', 'identifier': 'twenty twelve'}
          ], 'Match with "date != 2011" (query tree form)');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date',
        operator: '<',
        value: '2011'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2010-03-04 08:52:13.746', 'identifier': 'twenty ten'}
          ], 'Match with "date < 2011" (query tree form)');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date',
        operator: '<=',
        value: '2011'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2010-03-04 08:52:13.746', 'identifier': 'twenty ten'},
            {'date': '2011-03-04 08:52:13.746', 'identifier': 'twenty eleven'}
          ], 'Match with "date <= 2011" (query tree form)');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date',
        operator: '>',
        value: '2011'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2012-03-04 08:52:13.746', 'identifier': 'twenty twelve'}
          ], 'Match with "date > 2011" (query tree form)');
        })
    );

    promise.push(
      jIO.QueryFactory.create({
        type: 'simple',
        key: 'date',
        operator: '>=',
        value: '2011'
      }, key_schema).
        exec(docList()).
        then(function (dl) {
          deepEqual(dl, [
            {'date': '2011-03-04 08:52:13.746', 'identifier': 'twenty eleven'},
            {'date': '2012-03-04 08:52:13.746', 'identifier': 'twenty twelve'}
          ], 'Match with "date >= 2011" (query tree form)');
        })
    );

    query_list = [
      [
        'date: < "2011" OR date: "2012-03"',
        [
          {'date': '2010-03-04 08:52:13.746', 'identifier': 'twenty ten'},
          {'date': '2012-03-04 08:52:13.746', 'identifier': 'twenty twelve'}
        ]
      ],
      [
        'date: >= "2011-01" AND date: != "2012-03-04 08:52:13.746"',
        [
          {'date': '2011-03-04 08:52:13.746', 'identifier': 'twenty eleven'}
        ]
      ]
    ];

    query_list.forEach(function (o) {
      var qs = o[0], expected = o[1];
      promise.push(
        jIO.QueryFactory.create(qs, key_schema).
          exec(docList()).
          then(function (dl) {
            deepEqual(dl, expected, "Match with '" + qs + "' (parsed query string)");
          })
      );
    });

    query_list = [
      'date < "2011"',
      'date <= "2011"',
      'date > "2011"',
      'date >= "2011"'
    ];

    query_list.forEach(function (qs) {
      promise.push(
        jIO.QueryFactory.create(qs, key_schema).
          exec(docList()).
          then(function (dl) {
            deepEqual(dl, [
            ], "Match with an invalid parsed string " + qs + " should return empty list but not raise errors");
          })
      );
    });

    RSVP.all(promise).then(noop).always(start);
  });

}));
