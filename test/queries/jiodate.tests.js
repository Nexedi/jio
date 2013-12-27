/*jslint indent: 2, newcap: true */
/*global define, exports, require, test, ok, strictEqual, equal, throws, jiodate, moment, module */


// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(require('jiodate'), require('moment'));
  }
  module(jiodate, moment);
}(['jiodate', 'moment', 'qunit'], function (jiodate, moment) {
  "use strict";

  module('JIODate');

  var JIODate = jiodate.JIODate;

  test("A JIODate can be instantiated without parameters (=now)", function () {
    ok((new JIODate()) instanceof JIODate);
    ok(JIODate() instanceof JIODate);
  });


  test("Parsing from ISO string and exposing Moment/Date objects", function () {
    var d = JIODate('2012-03-04T08:52:13.746Z');
    ok(moment.isMoment(d.mom));
    strictEqual(d.mom.toISOString(), '2012-03-04T08:52:13.746Z');
    strictEqual(d.mom.year(), 2012);
    strictEqual(d.mom.month(), 2);
    strictEqual(d.mom.date(), 4);
    // and so on..
    strictEqual(d.mom.isoWeekday(), 7);
    strictEqual(d.mom.dayOfYear(), 64);
    strictEqual(d.mom.week(), 10);
    strictEqual(d.mom.isoWeek(), 9);
    strictEqual(d.mom.day(), 0);
    strictEqual(d.mom.hours(), 9);
    strictEqual(d.mom.minutes(), 52);
    strictEqual(d.mom.seconds(), 13);
    strictEqual(d.mom.milliseconds(), 746);
    // careful: changing the Date object changes the moment as well
    ok(d.mom.toDate() instanceof Date);
  });


  test("By default, maximum precision is kept, but it can be changed later", function () {
    var d = new JIODate();

    equal(d.getPrecision(), jiodate.MSEC);
    d.setPrecision(jiodate.SEC);
    equal(d.getPrecision(), jiodate.SEC);
    d.setPrecision(jiodate.DAY);
    equal(d.getPrecision(), jiodate.DAY);
    d.setPrecision(jiodate.MONTH);
    equal(d.getPrecision(), jiodate.MONTH);
  });


  test("Passing a JIODate object to the constructor clones it", function () {
    var d = JIODate('2012-05-06');
    ok(d.eq(JIODate(d)));
  });


  test("Comparison with eq/ne/gt/lt/ge/le/cmp - any precision", function () {
    var data = [
      [
        jiodate.MSEC,
        '2012-03-04T08:52:13.746Z',
        '2012-03-04T08:52:13.746Z',
        '2012-03-04T08:52:13.747Z'
      ], [
        jiodate.SEC,
        '2012-03-04T08:52:13.746Z',
        '2012-03-04T08:52:13.999Z',
        '2012-03-04T08:52:14.746Z'
      ], [
        jiodate.MIN,
        '2012-03-04T08:52:13.746Z',
        '2012-03-04T08:52:59.999Z',
        '2012-03-04T08:53:13.746Z'
      ], [
        jiodate.HOUR,
        '2012-03-04T08:52:13.746Z',
        '2012-03-04T08:59:59.999Z',
        '2012-03-04T09:52:13.746Z'
      ], [
        jiodate.DAY,
        '2012-03-04T08:52:13.746Z',
        '2012-03-04T20:59:59.999Z',
        '2012-03-05T08:52:13.746Z'
      ], [
        jiodate.MONTH,
        '2012-03-04T08:52:13.746Z',
        '2012-03-31T20:59:59.999Z',
        '2012-04-04T08:53:13.746Z'
      ], [
        jiodate.YEAR,
        '2012-03-04T08:52:13.746Z',
        '2012-12-31T20:59:59.999Z',
        '2013-03-04T08:53:13.746Z'
      ]
    ], i = 0, precision, d1, d2, d3, s1, s2, s3, mp;

    for (i = 0; i < data.length; i += 1) {
      precision = data[i][0];
      d1 = JIODate(data[i][1]);
      d2 = JIODate(data[i][2]);
      d3 = JIODate(data[i][3]);

      d1.setPrecision(precision);
      d2.setPrecision(precision);
      d3.setPrecision(precision);

      s1 = d1.mom.format();
      s2 = d2.mom.format();
      s3 = d3.mom.format();

      mp = ' - ' + precision;

      // 1 vs 2
      ok(d1.eq(d2),  s1 + ' == ' + s2 + mp);
      ok(!d1.ne(d2), 'not (' + s1 + ' != ' + s2 + ')' + mp);
      ok(!d1.gt(d2), 'not (' + s1 + ' > ' + s2 + ')' + mp);
      ok(d1.ge(d2), s1 + ' >= ' + s2 + mp);
      ok(!d1.lt(d2), 'not (' + s1 + ' < ' + s2 + ')' + mp);
      ok(d1.le(d2), s1 + ' <= ' + s2 + mp);
      strictEqual(d1.cmp(d2), 0, s1 + ' cmp ' + s2 + mp);

      // 1 vs 3
      ok(!d1.eq(d3), 'not (' + s1 + ' == ' + s3 + ')' + mp);
      ok(d1.ne(d3),  s1 + ' != ' + s3 + mp);
      ok(!d1.gt(d3), 'not (' + s1 + ' > ' + s3 + ')' + mp);
      ok(!d1.ge(d3), 'not (' + s1 + ' >= ' + s3 + ')' + mp);
      ok(d1.lt(d3), s1 + ' < ' + s3 + mp);
      ok(d1.le(d3), s1 + ' <= ' + s3 + mp);
      strictEqual(d1.cmp(d3), -1, s1 + ' cmp ' + s3 + mp);

      // 2 vs 1
      ok(d2.eq(d1),  s2 + ' == ' + s1 + mp);
      ok(!d2.ne(d1), 'not (' + s2 + ' != ' + s1 + ')' + mp);
      ok(!d2.gt(d1), 'not (' + s2 + ' > ' + s1 + ')' + mp);
      ok(d2.ge(d1), s2 + ' >= ' + s1 + mp);
      ok(!d2.lt(d1), 'not (' + s2 + ' < ' + s1 + ')' + mp);
      ok(d2.le(d1), s2 + ' <= ' + s1 + mp);
      strictEqual(d2.cmp(d1), 0, s2 + ' cmp ' + s1 + mp);

      // 2 vs 3
      ok(!d2.eq(d3), 'not (' + s2 + ' == ' + s3 + ')' + mp);
      ok(d2.ne(d3),  s2 + ' != ' + s3 + mp);
      ok(!d2.gt(d3), 'not (' + s2 + ' > ' + s3 + ')' + mp);
      ok(!d2.ge(d3), 'not (' + s2 + ' >= ' + s3 + ')' + mp);
      ok(d2.lt(d3), s2 + ' < ' + s3 + mp);
      ok(d2.le(d3), s2 + ' <= ' + s3 + mp);
      strictEqual(d2.cmp(d3), -1, s2 + ' cmp ' + s3 + mp);

      // 3 vs 1
      ok(!d3.eq(d1), 'not (' + s3 + ' == ' + s1 + ')' + mp);
      ok(d3.ne(d1), s3 + ' != ' + s1 + mp);
      ok(d3.gt(d1), s3 + ' > ' + s1 + mp);
      ok(d3.ge(d1), s3 + ' >= ' + s1 + mp);
      ok(!d3.lt(d1), 'not (' + s3 + ' < ' + s1 + ')' + mp);
      ok(!d3.le(d1), 'not (' + s3 + ' <= ' + s1 + ')' + mp);
      strictEqual(d3.cmp(d1), 1, s3 + ' cmp ' + s1 + mp);

      // 3 vs 2
      ok(!d3.eq(d2), 'not (' + s3 + ' == ' + s2 + ')' + mp);
      ok(d3.ne(d2), s3 + ' != ' + s2 + mp);
      ok(d3.gt(d2), s3 + ' > ' + s2 + mp);
      ok(d3.ge(d2), s3 + ' >= ' + s2 + mp);
      ok(!d3.lt(d2), 'not (' + s3 + ' < ' + s2 + ')' + mp);
      ok(!d3.le(d2), 'not (' + s3 + ' <= ' + s2 + ')' + mp);
      strictEqual(d3.cmp(d2), 1, s1 + ' cmp ' + s2 + mp);
    }

  });


  test("Display timestamp value trucated to precision", function () {
    var d = JIODate('2012-03-04T08:52:13.746Z');

    // XXX No timezone

    strictEqual(d.toPrecisionString(jiodate.MSEC), '2012-03-04 09:52:13.746');
    strictEqual(d.toPrecisionString(jiodate.SEC), '2012-03-04 09:52:13');
    strictEqual(d.toPrecisionString(jiodate.MIN), '2012-03-04 09:52');
    strictEqual(d.toPrecisionString(jiodate.HOUR), '2012-03-04 09');
    strictEqual(d.toPrecisionString(jiodate.DAY), '2012-03-04');
    strictEqual(d.toPrecisionString(jiodate.MONTH), '2012-03');
    strictEqual(d.toPrecisionString(jiodate.YEAR), '2012');

    throws(
      function () {
        d.toPrecisionString('something');
      },
      /Unsupported precision value 'something'/,
      "Precision parameter must be a valid value"
    );

    d.setPrecision(jiodate.HOUR);
    strictEqual(d.toPrecisionString(), '2012-03-04 09');
  });


  test("Parsing of invalid input", function () {
    throws(
      function () {
        JIODate('foobar');
      },
      /Cannot parse: foobar/,
      "Invalid strings raise exceptions"
    );
  });


  test("Parsing of partial timestamp values with any precision", function () {
    var d;

    d = JIODate('2012-05-02 06:07:08.989');
    strictEqual(d.getPrecision(), 'millisecond');
    strictEqual(d.toPrecisionString(), '2012-05-02 06:07:08.989');
    strictEqual(d.mom.toISOString(), '2012-05-02T04:07:08.989Z');

    d = JIODate('2012-05-02 06:07:08');
    strictEqual(d.getPrecision(), 'second');
    strictEqual(d.toPrecisionString(), '2012-05-02 06:07:08');
    strictEqual(d.mom.toISOString(), '2012-05-02T04:07:08.000Z');

    d = JIODate('2012-05-02 06:07');
    strictEqual(d.getPrecision(), 'minute');
    strictEqual(d.toPrecisionString(), '2012-05-02 06:07');
    strictEqual(d.mom.toISOString(), '2012-05-02T04:07:00.000Z');

    d = JIODate('2012-05-02 06');
    strictEqual(d.getPrecision(), 'hour');
    strictEqual(d.toPrecisionString(), '2012-05-02 06');
    strictEqual(d.mom.toISOString(), '2012-05-02T04:00:00.000Z');

    d = JIODate('2012-05-02');
    strictEqual(d.getPrecision(), 'day');
    strictEqual(d.toPrecisionString(), '2012-05-02');
    strictEqual(d.mom.toISOString(), '2012-05-01T22:00:00.000Z');

    d = JIODate('2012-05');
    strictEqual(d.getPrecision(), 'month');
    strictEqual(d.toPrecisionString(), '2012-05');
    strictEqual(d.mom.toISOString(), '2012-05-01T00:00:00.000Z');

    d = JIODate('2012');
    strictEqual(d.getPrecision(), 'year');
    strictEqual(d.toPrecisionString(), '2012');
    strictEqual(d.mom.toISOString(), '2012-01-01T00:00:00.000Z');

  });


  test("Comparison between heterogeneous values is done with the lesser precision", function () {
    var dmsec = JIODate('2012-05-02 06:07:08.989'),
      dsec = JIODate('2012-05-02 06:07:08'),
      dmin = JIODate('2012-05-02 06:07'),
      dhour = JIODate('2012-05-02 06'),
      dday = JIODate('2012-05-02'),
      dmonth = JIODate('2012-05'),
      dyear = JIODate('2012');

    ok(dmsec.eq(dsec));
    ok(dmsec.eq(dmin));
    ok(dmsec.eq(dhour));
    ok(dmsec.eq(dday));
    ok(dmsec.eq(dmonth));
    ok(dmsec.eq(dyear));

    ok(dsec.eq(dmsec));
    ok(dsec.eq(dmin));
    ok(dsec.eq(dhour));
    ok(dsec.eq(dday));
    ok(dsec.eq(dmonth));
    ok(dsec.eq(dyear));

    ok(dmin.eq(dmsec));
    ok(dmin.eq(dsec));
    ok(dmin.eq(dhour));
    ok(dmin.eq(dday));
    ok(dmin.eq(dmonth));
    ok(dmin.eq(dyear));

    ok(dhour.eq(dmsec));
    ok(dhour.eq(dsec));
    ok(dhour.eq(dmin));
    ok(dhour.eq(dday));
    ok(dhour.eq(dmonth));
    ok(dhour.eq(dyear));

    ok(dday.eq(dmsec));
    ok(dday.eq(dsec));
    ok(dday.eq(dmin));
    ok(dday.eq(dhour));
    ok(dday.eq(dmonth));
    ok(dday.eq(dyear));

    ok(dmonth.eq(dmsec));
    ok(dmonth.eq(dsec));
    ok(dmonth.eq(dmin));
    ok(dmonth.eq(dhour));
    ok(dmonth.eq(dday));
    ok(dmonth.eq(dyear));

    ok(dyear.eq(dmsec));
    ok(dyear.eq(dsec));
    ok(dyear.eq(dmin));
    ok(dyear.eq(dhour));
    ok(dyear.eq(dday));
    ok(dyear.eq(dmonth));

    ok(!dmsec.lt(JIODate('2012-05-02 06:07:08')));
    ok(dmsec.lt(JIODate('2012-05-02 06:07:09')));
    ok(dmsec.le(JIODate('2012-05-02 06:07:08')));
    ok(!dmsec.gt(JIODate('2012-05-02 06:07:08')));
    ok(dmsec.ge(JIODate('2012-05-02 06:07:08')));
    ok(!dmsec.ne(JIODate('2012-05-02 06:07:08')));
    ok(dmsec.eq(JIODate('2012-05-02 06:07:08')));
    strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:07')), +1);
    strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:08')), 0);
    strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:09')), -1);

  });


}));

