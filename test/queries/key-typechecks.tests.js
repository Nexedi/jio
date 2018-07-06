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
/*jslint indent: 2, maxlen: 90, nomen: true */
/*global define, exports, require, module, jIO, window, test,
  raises, ok, equal, deepEqual, sinon */

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

  module('Key and key_schema objects validation');

  test('Check the parameters passed to exec() and create()', function () {
    try {
      jIO.QueryFactory.create('').exec('gnegne');
      ok(false, 'argument 1 not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "Query().exec(): Argument 1 is not of type 'array'",
         'wrong exception message');
    }

    try {
      jIO.QueryFactory.create({});
      ok(false, 'argument 1 not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "QueryFactory.create(): Argument 1 is not a search text or a parsable object",
         'wrong exception message');
    }

    try {
      jIO.QueryFactory.create('').exec([], 1);
      ok(false, 'argument 2 not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "Query().exec(): Optional argument 2 is not of type 'object'",
         'wrong exception message');
    }

    try {
      jIO.QueryFactory.create({type: 'simple'}, '');
      ok(false, 'key_schema type is not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "Query().create(): key_schema is not of type 'object'",
         'wrong exception message');
    }

    try {
      jIO.QueryFactory.create({type: 'simple'}, {});
      ok(false, 'key_schema.key_set is not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "Query().create(): key_schema has no 'key_set' property",
         'wrong exception message');
    }

    try {
      jIO.QueryFactory.create({
        type: 'simple'
      }, {key_set: {}, foobar: {}});
      ok(false, 'unknown key_schema properties are not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "Query().create(): key_schema has unknown property 'foobar'",
         'wrong exception message');
    }

  });


  test('Check the key options', function () {
    var doc_list = [
      {'identifier': 'a'}
    ];

    try {
      jIO.QueryFactory.create({
        type: 'simple',
        key: {},
        value: 'a'
      }).exec(doc_list);
      ok(false, 'key.read_from is not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "Custom key is missing the read_from property",
         'wrong exception message');
    }

    try {
      jIO.QueryFactory.create({
        type: 'simple',
        key: {
          read_from: 'identifier',
          foobar: ''
        },
        value: 'a'
      }).exec(doc_list);
      ok(false, 'unknown key properties are not checked');
    } catch (e) {
      equal(e.name, 'TypeError', 'wrong exception type');
      equal(e.message,
         "Custom key has unknown property 'foobar'",
         'wrong exception message');
    }
  });

}));
