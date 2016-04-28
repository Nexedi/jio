/*jslint nomen: true, newcap: true */
/*global jiodate, moment, console*/
(function (QUnit, jiodate, moment) {
  "use strict";
  var test = QUnit.test,
    ok = QUnit.ok,
    strictEqual = QUnit.strictEqual,
    notStrictEqual = QUnit.notStrictEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    JIODate = jiodate.JIODate,
    throws = QUnit.throws;

  module('JIODate');


  test("A JIODate can be instantiated without parameters (=now)", function () {
    ok((new JIODate()) instanceof JIODate);
    ok(JIODate() instanceof JIODate);
  });

  test("A JIODate can be in UTC or local time mode", function () {
    var d = JIODate('2012-03-04T08:52:13.746Z');
    ok(moment.isMoment(d.mom));

    d.localMode();
    equal(d.mom._isUTC, false);
    notStrictEqual(d.mom.toISOString(), '2012-03-04T08:52:13.746');

    d.utcMode();
    equal(d.mom._isUTC, true);
    strictEqual(d.mom.toISOString(), '2012-03-04T08:52:13.746Z');
  });

  // This test is to ensure there is a way to tell JIODate if the date is in
  // UTC or local time for date-only strings. The main purpose of this feature
  // is to make our tests timezone agnostic.
  test("Parsing only-date string can be in utc or local mode", function () {
    var d_local = JIODate('2016-02-01'),
      d_utc = JIODate('2016-02-01', 'utc');

    equal(d_local.mom._isUTC, false);
    notStrictEqual(d_local.mom.toISOString(), '2016-02-01T00:00:00.000Z');

    equal(d_utc.mom._isUTC, true);
    strictEqual(d_utc.mom.toISOString(), '2016-02-01T00:00:00.000Z');
  });

  test("Parsing from ISO string and exposing Moment/Date objects", function () {
    var d = JIODate('2012-03-04T08:52:13.746Z');
    ok(moment.isMoment(d.mom));

    // Putting JIODate into UTC time mode to ignore timezone differences
    d.utcMode();

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
    strictEqual(d.mom.hours(), 8);
    strictEqual(d.mom.minutes(), 52);
    strictEqual(d.mom.seconds(), 13);
    strictEqual(d.mom.milliseconds(), 746);
    // careful: changing the Date object changes the moment as well
    ok(d.mom.toDate() instanceof Date);
  });


  test("By default, maximum precision is kept, " +
       "but it can be changed later", function () {
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
    strictEqual(d.cmp(JIODate(d)), 0);
  });


  test("Comparison with .cmp() - any precision", function () {
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

      strictEqual(d1.cmp(d2), 0, s1 + ' cmp ' + s2 + mp);
      strictEqual(d1.cmp(d3), -1, s1 + ' cmp ' + s3 + mp);
      strictEqual(d2.cmp(d1), 0, s2 + ' cmp ' + s1 + mp);
      strictEqual(d2.cmp(d3), -1, s2 + ' cmp ' + s3 + mp);
      strictEqual(d3.cmp(d1), 1, s3 + ' cmp ' + s1 + mp);
      strictEqual(d3.cmp(d2), 1, s1 + ' cmp ' + s2 + mp);
    }

  });


  test("Display timestamp value trucated to precision", function () {
    var d = JIODate('2012-03-04T08:52:13.746Z');
    d.utcMode();

    strictEqual(
      d.toPrecisionString(jiodate.MSEC, true),
      '2012-03-04 08:52:13.746'
    );
    strictEqual(d.toPrecisionString(jiodate.SEC, true), '2012-03-04 08:52:13');
    strictEqual(d.toPrecisionString(jiodate.MIN, true), '2012-03-04 08:52');
    strictEqual(d.toPrecisionString(jiodate.HOUR, true), '2012-03-04 08');
    strictEqual(d.toPrecisionString(jiodate.DAY, true), '2012-03-04');
    strictEqual(d.toPrecisionString(jiodate.MONTH, true), '2012-03');
    strictEqual(d.toPrecisionString(jiodate.YEAR, true), '2012');

    throws(
      function () {
        d.toPrecisionString('something');
      },
      /Unsupported precision value 'something'/,
      "Precision parameter must be a valid value"
    );

    d.setPrecision(jiodate.HOUR);
    strictEqual(d.toPrecisionString(), '2012-03-04 08');
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


  test("The toString() method should retain the precision", function () {
    var d;

    d = JIODate('2012-05-08');
    strictEqual(d.toString(), '2012-05-08');
    d = JIODate('2012-05');
    strictEqual(d.toString(), '2012-05');
    d = JIODate('2012');
    strictEqual(d.toString(), '2012');
  });


  test("Parsing of partial timestamp values with any precision", function () {
    var d;

    d = JIODate('2012-05-02 06:07:08.989Z');
    d.utcMode();
    strictEqual(d.getPrecision(), 'millisecond');
    strictEqual(d.toPrecisionString(), '2012-05-02 06:07:08.989');
    strictEqual(d.mom.toISOString(), '2012-05-02T06:07:08.989Z');

    d = JIODate('2012-05-02 06:07:08Z');
    d.utcMode();
    strictEqual(d.getPrecision(), 'second');
    strictEqual(d.toPrecisionString(), '2012-05-02 06:07:08');
    strictEqual(d.mom.toISOString(), '2012-05-02T06:07:08.000Z');

    d = JIODate('2012-05-02 06:07Z');
    d.utcMode();
    strictEqual(d.getPrecision(), 'minute');
    strictEqual(d.toPrecisionString(), '2012-05-02 06:07');
    strictEqual(d.mom.toISOString(), '2012-05-02T06:07:00.000Z');

    d = JIODate('2012-05-02 06Z');
    d.utcMode();
    strictEqual(d.getPrecision(), 'hour');
    strictEqual(d.toPrecisionString(), '2012-05-02 06');
    strictEqual(d.mom.toISOString(), '2012-05-02T06:00:00.000Z');

    d = JIODate('2012-05-02', 'utc');
    strictEqual(d.getPrecision(), 'day');
    strictEqual(d.toPrecisionString(), '2012-05-02');
    strictEqual(d.mom.toISOString(), '2012-05-02T00:00:00.000Z');

    d = JIODate('2012-05', 'utc');
    strictEqual(d.getPrecision(), 'month');
    strictEqual(d.toPrecisionString(), '2012-05');
    strictEqual(d.mom.toISOString(), '2012-05-01T00:00:00.000Z');

    d = JIODate('2012', 'utc');
    strictEqual(d.getPrecision(), 'year');
    strictEqual(d.toPrecisionString(), '2012');
    strictEqual(d.mom.toISOString(), '2012-01-01T00:00:00.000Z');
  });


  test("Comparison between heterogeneous values is done with " +
       "the lesser precision", function () {
      var dmsec = JIODate('2012-05-02 06:07:08.989Z'),
        dsec = JIODate('2012-05-02 06:07:08Z'),
        dmin = JIODate('2012-05-02 06:07Z'),
        dhour = JIODate('2012-05-02 06Z'),
        dday = JIODate('2012-05-02', 'utc'),
        dmonth = JIODate('2012-05', 'utc'),
        dyear = JIODate('2012', 'utc');

      [dmsec, dsec, dmin, dhour, dday, dmonth, dyear].map(function (jiodate) {
        jiodate.utcMode();
      });

      strictEqual(dmsec.cmp(dsec), 0);
      strictEqual(dmsec.cmp(dmin), 0);
      strictEqual(dmsec.cmp(dhour), 0);
      strictEqual(dmsec.cmp(dday), 0);
      strictEqual(dmsec.cmp(dmonth), 0);
      strictEqual(dmsec.cmp(dyear), 0);

      strictEqual(dsec.cmp(dmsec), 0);
      strictEqual(dsec.cmp(dmin), 0);
      strictEqual(dsec.cmp(dhour), 0);
      strictEqual(dsec.cmp(dday), 0);
      strictEqual(dsec.cmp(dmonth), 0);
      strictEqual(dsec.cmp(dyear), 0);

      strictEqual(dmin.cmp(dmsec), 0);
      strictEqual(dmin.cmp(dsec), 0);
      strictEqual(dmin.cmp(dhour), 0);
      strictEqual(dmin.cmp(dday), 0);
      strictEqual(dmin.cmp(dmonth), 0);
      strictEqual(dmin.cmp(dyear), 0);

      strictEqual(dhour.cmp(dmsec), 0);
      strictEqual(dhour.cmp(dsec), 0);
      strictEqual(dhour.cmp(dmin), 0);
      strictEqual(dhour.cmp(dday), 0);
      strictEqual(dhour.cmp(dmonth), 0);
      strictEqual(dhour.cmp(dyear), 0);

      strictEqual(dday.cmp(dmsec), 0);
      strictEqual(dday.cmp(dsec), 0);
      strictEqual(dday.cmp(dmin), 0);
      strictEqual(dday.cmp(dhour), 0);
      strictEqual(dday.cmp(dmonth), 0);
      strictEqual(dday.cmp(dyear), 0);

      strictEqual(dmonth.cmp(dmsec), 0);
      strictEqual(dmonth.cmp(dsec), 0);
      strictEqual(dmonth.cmp(dmin), 0);
      strictEqual(dmonth.cmp(dhour), 0);
      strictEqual(dmonth.cmp(dday), 0);
      strictEqual(dmonth.cmp(dyear), 0);

      strictEqual(dyear.cmp(dmsec), 0);
      strictEqual(dyear.cmp(dsec), 0);
      strictEqual(dyear.cmp(dmin), 0);
      strictEqual(dyear.cmp(dhour), 0);
      strictEqual(dyear.cmp(dday), 0);
      strictEqual(dyear.cmp(dmonth), 0);

      strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:07Z')), +1);
      strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:08Z')), 0);
      strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:09Z')), -1);
    });

}(QUnit, jiodate, moment));
