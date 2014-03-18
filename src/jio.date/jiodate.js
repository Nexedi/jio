/*jslint indent: 2, nomen: true */
/*global module, define, exports, window, moment */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(exports, moment);
  }
  window.jiodate = {};
  module(window.jiodate, moment);
}(['exports', 'moment'], function (to_export, moment) {
  "use strict";

  /**
   * Add a secured (write permission denied) property to an object.
   *
   * @param  {Object} object The object to fill
   * @param  {String} key The object key where to store the property
   * @param  {Any} value The value to store
   */
  function _export(key, value) {
    Object.defineProperty(to_export, key, {
      "configurable": false,
      "enumerable": true,
      "writable": false,
      "value": value
    });
  }

  var YEAR = 'year',
    MONTH = 'month',
    DAY = 'day',
    HOUR = 'hour',
    MIN = 'minute',
    SEC = 'second',
    MSEC = 'millisecond',
    precision_grade = {
      'year': 0,
      'month': 1,
      'day': 2,
      'hour': 3,
      'minute': 4,
      'second': 5,
      'millisecond': 6
    },
    lesserPrecision = function (p1, p2) {
      return (precision_grade[p1] < precision_grade[p2]) ? p1 : p2;
    },
    JIODate = null;


  JIODate = function (str) {
    // in case of forgotten 'new'
    if (!(this instanceof JIODate)) {
      return new JIODate(str);
    }

    if (str instanceof JIODate) {
      this.mom = str.mom.clone();
      this._precision = str._precision;
      return;
    }

    if (str === undefined) {
      this.mom = moment();
      this.setPrecision(MSEC);
      return;
    }

    this.mom = null;
    this._str = str;

    // http://www.w3.org/TR/NOTE-datetime
    // http://dotat.at/tmp/ISO_8601-2004_E.pdf

    // XXX these regexps fail to detect many invalid dates.

    if (str.match(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+\-][0-2]\d:[0-5]\d|Z)/)
          || str.match(/\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d\.\d\d\d/)) {
      // ISO, milliseconds
      this.mom = moment(str);
      this.setPrecision(MSEC);
    } else if (str.match(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+\-][0-2]\d:[0-5]\d|Z)/)
          || str.match(/\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d/)) {
      // ISO, seconds
      this.mom = moment(str);
      this.setPrecision(SEC);
    } else if (str.match(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+\-][0-2]\d:[0-5]\d|Z)/)
          || str.match(/\d\d\d\d-\d\d-\d\d \d\d:\d\d/)) {
      // ISO, minutes
      this.mom = moment(str);
      this.setPrecision(MIN);
    } else if (str.match(/\d\d\d\d-\d\d-\d\d \d\d/)) {
      this.mom = moment(str);
      this.setPrecision(HOUR);
    } else if (str.match(/\d\d\d\d-\d\d-\d\d/)) {
      this.mom = moment(str);
      this.setPrecision(DAY);
    } else if (str.match(/\d\d\d\d-\d\d/)) {
      this.mom = moment(str);
      this.setPrecision(MONTH);
    } else if (str.match(/\d\d\d\d/)) {
      this.mom = moment(str);
      this.setPrecision(YEAR);
    }

    if (!this.mom) {
      throw new Error("Cannot parse: " + str);
    }

  };


  JIODate.prototype.setPrecision = function (prec) {
    this._precision = prec;
  };


  JIODate.prototype.getPrecision = function () {
    return this._precision;
  };


  JIODate.prototype.cmp = function (other) {
    var m1 = this.mom,
      m2 = other.mom,
      p = lesserPrecision(this._precision, other._precision);
    return m1.isBefore(m2, p) ? -1 : (m1.isSame(m2, p) ? 0 : +1);
  };


  JIODate.prototype.toPrecisionString = function (precision) {
    var fmt;

    precision = precision || this._precision;

    fmt = {
      'millisecond': 'YYYY-MM-DD HH:mm:ss.SSS',
      'second': 'YYYY-MM-DD HH:mm:ss',
      'minute': 'YYYY-MM-DD HH:mm',
      'hour': 'YYYY-MM-DD HH',
      'day': 'YYYY-MM-DD',
      'month': 'YYYY-MM',
      'year': 'YYYY'
    }[precision];

    if (!fmt) {
      throw new TypeError("Unsupported precision value '" + precision + "'");
    }

    return this.mom.format(fmt);
  };


  JIODate.prototype.toString = function () {
    return this._str;
  };


  _export('JIODate', JIODate);

  _export('YEAR', YEAR);
  _export('MONTH', MONTH);
  _export('DAY', DAY);
  _export('HOUR', HOUR);
  _export('MIN', MIN);
  _export('SEC', SEC);
  _export('MSEC', MSEC);

  return to_export;

}));

