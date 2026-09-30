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
/*jslint nomen: true, newcap: true */
/*global jiodate, moment, console*/
(function (QUnit, jiodate, moment) {
  "use strict";
  var test = QUnit.test,
    module = QUnit.module,
    JIODate = jiodate.JIODate;

  module('JIODate');


  test("A JIODate can be instantiated without parameters (=now)",
       function (assert) {
      assert.ok((new JIODate()) instanceof JIODate);
      assert.ok(JIODate() instanceof JIODate);
    });


  test("Parsing from ISO string and exposing Moment/Date objects",
       function (assert) {
      var d = JIODate('2012-03-04T08:52:13.746Z');
      // Because the above JIODate is created in ISO string,
      // which uses UTC time,
      // it's necessary to set the moment to use the UTC mode.
      // Otherwise different
      // timezones may have different results for the getters below,
      // as they will  try to convert it to local time.
      //
      d.mom.utc();

      assert.ok(moment.isMoment(d.mom));
      assert.strictEqual(d.mom.toISOString(), '2012-03-04T08:52:13.746Z');
      assert.strictEqual(d.mom.year(), 2012);
      assert.strictEqual(d.mom.month(), 2);
      assert.strictEqual(d.mom.date(), 4);
      // and so on..
      assert.strictEqual(d.mom.isoWeekday(), 7);
      assert.strictEqual(d.mom.dayOfYear(), 64);
      assert.strictEqual(d.mom.week(), 10);
      assert.strictEqual(d.mom.isoWeek(), 9);
      assert.strictEqual(d.mom.day(), 0);
      assert.strictEqual(d.mom.hours(), 8);
      assert.strictEqual(d.mom.minutes(), 52);
      assert.strictEqual(d.mom.seconds(), 13);
      assert.strictEqual(d.mom.milliseconds(), 746);
      // careful: changing the Date object changes the moment as well
      assert.ok(d.mom.toDate() instanceof Date);
    });


  test("By default, maximum precision is kept, " +
       "but it can be changed later", function (assert) {
      var d = new JIODate();

      assert.equal(d.getPrecision(), jiodate.MSEC);
      d.setPrecision(jiodate.SEC);
      assert.equal(d.getPrecision(), jiodate.SEC);
      d.setPrecision(jiodate.DAY);
      assert.equal(d.getPrecision(), jiodate.DAY);
      d.setPrecision(jiodate.MONTH);
      assert.equal(d.getPrecision(), jiodate.MONTH);
    });


  test("Passing a JIODate object to the constructor clones it",
       function (assert) {
      var d = JIODate('2012-05-06');
      assert.strictEqual(d.cmp(JIODate(d)), 0);
    });


  test("Comparison with .cmp() - any precision", function (assert) {
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

      assert.strictEqual(d1.cmp(d2), 0, s1 + ' cmp ' + s2 + mp);
      assert.strictEqual(d1.cmp(d3), -1, s1 + ' cmp ' + s3 + mp);
      assert.strictEqual(d2.cmp(d1), 0, s2 + ' cmp ' + s1 + mp);
      assert.strictEqual(d2.cmp(d3), -1, s2 + ' cmp ' + s3 + mp);
      assert.strictEqual(d3.cmp(d1), 1, s3 + ' cmp ' + s1 + mp);
      assert.strictEqual(d3.cmp(d2), 1, s1 + ' cmp ' + s2 + mp);
    }

  });


  test("Display timestamp value trucated to precision", function (assert) {
    var d = JIODate('2012-03-04T08:52:13.746');

    assert.strictEqual(d.toPrecisionString(jiodate.MSEC),
                       '2012-03-04 08:52:13.746');
    assert.strictEqual(d.toPrecisionString(jiodate.SEC), '2012-03-04 08:52:13');
    assert.strictEqual(d.toPrecisionString(jiodate.MIN), '2012-03-04 08:52');
    assert.strictEqual(d.toPrecisionString(jiodate.HOUR), '2012-03-04 08');
    assert.strictEqual(d.toPrecisionString(jiodate.DAY), '2012-03-04');
    assert.strictEqual(d.toPrecisionString(jiodate.MONTH), '2012-03');
    assert.strictEqual(d.toPrecisionString(jiodate.YEAR), '2012');

    assert.throws(
      function () {
        d.toPrecisionString('something');
      },
      /Unsupported precision value 'something'/,
      "Precision parameter must be a valid value"
    );

    d.setPrecision(jiodate.HOUR);
    assert.strictEqual(d.toPrecisionString(), '2012-03-04 08');
  });


  test("Parsing of invalid input", function (assert) {
    assert.throws(
      function () {
        JIODate('foobar');
      },
      /Cannot parse: foobar/,
      "Invalid strings raise exceptions"
    );
  });


  test("The toString() method should retain the precision", function (assert) {
    var d;

    d = JIODate('2012-05-08');
    assert.strictEqual(d.toString(), '2012-05-08');
    d = JIODate('2012-05');
    assert.strictEqual(d.toString(), '2012-05');
    d = JIODate('2012');
    assert.strictEqual(d.toString(), '2012');
  });


  test("Parsing of partial timestamp values with any precision",
       function (assert) {
      var d;

      d = JIODate('2012-05-02 06:07:08.989');
      assert.strictEqual(d.getPrecision(), 'millisecond');
      assert.strictEqual(d.toPrecisionString(), '2012-05-02 06:07:08.989');
      assert.strictEqual(
        d.mom.toDate().valueOf(),
        // This Date constructor needs to be used because of older Firefox
        // versions that do not parse some date strings formats correctly. It
        // uses months from 0 to 11. So if we want to create  a date in May, we
        // need to use 4 instead of 5.
        //
        new Date(2012, 4, 2, 6, 7, 8, 989).valueOf()
      );

      d = JIODate('2012-05-02 06:07:08');
      assert.strictEqual(d.getPrecision(), 'second');
      assert.strictEqual(d.toPrecisionString(), '2012-05-02 06:07:08');
      assert.strictEqual(
        d.mom.toDate().valueOf(),
        new Date(2012, 4, 2, 6, 7, 8, 0).valueOf()
      );

      d = JIODate('2012-05-02 06:07');
      assert.strictEqual(d.getPrecision(), 'minute');
      assert.strictEqual(d.toPrecisionString(), '2012-05-02 06:07');
      assert.strictEqual(
        d.mom.toDate().valueOf(),
        new Date(2012, 4, 2, 6, 7, 0, 0).valueOf()
      );

      d = JIODate('2012-05-02 06');
      assert.strictEqual(d.getPrecision(), 'hour');
      assert.strictEqual(d.toPrecisionString(), '2012-05-02 06');
      assert.strictEqual(
        d.mom.toDate().valueOf(),
        new Date(2012, 4, 2, 6, 0, 0, 0).valueOf()
      );

      d = JIODate('2012-05-02');
      assert.strictEqual(d.getPrecision(), 'day');
      assert.strictEqual(d.toPrecisionString(), '2012-05-02');
      assert.strictEqual(
        d.mom.toDate().valueOf(),
        new Date(2012, 4, 2, 0, 0, 0, 0).valueOf()
      );

      d = JIODate('2012-05');
      assert.strictEqual(d.getPrecision(), 'month');
      assert.strictEqual(d.toPrecisionString(), '2012-05');
      assert.strictEqual(
        d.mom.toDate().valueOf(),
        new Date(2012, 4, 1, 0, 0, 0, 0).valueOf()
      );

      d = JIODate('2012');
      assert.strictEqual(d.getPrecision(), 'year');
      assert.strictEqual(d.toPrecisionString(), '2012');
      assert.strictEqual(
        d.mom.toDate().valueOf(),
        new Date(2012, 0, 1, 0, 0, 0, 0).valueOf()
      );
    });


  test("Comparison between heterogeneous values is done with " +
       "the lesser precision", function (assert) {
      var dmsec = JIODate('2012-05-02 06:07:08.989'),
        dsec = JIODate('2012-05-02 06:07:08'),
        dmin = JIODate('2012-05-02 06:07'),
        dhour = JIODate('2012-05-02 06'),
        dday = JIODate('2012-05-02'),
        dmonth = JIODate('2012-05'),
        dyear = JIODate('2012');

      assert.strictEqual(dmsec.cmp(dsec), 0);
      assert.strictEqual(dmsec.cmp(dmin), 0);
      assert.strictEqual(dmsec.cmp(dhour), 0);
      assert.strictEqual(dmsec.cmp(dday), 0);
      assert.strictEqual(dmsec.cmp(dmonth), 0);
      assert.strictEqual(dmsec.cmp(dyear), 0);

      assert.strictEqual(dsec.cmp(dmsec), 0);
      assert.strictEqual(dsec.cmp(dmin), 0);
      assert.strictEqual(dsec.cmp(dhour), 0);
      assert.strictEqual(dsec.cmp(dday), 0);
      assert.strictEqual(dsec.cmp(dmonth), 0);
      assert.strictEqual(dsec.cmp(dyear), 0);

      assert.strictEqual(dmin.cmp(dmsec), 0);
      assert.strictEqual(dmin.cmp(dsec), 0);
      assert.strictEqual(dmin.cmp(dhour), 0);
      assert.strictEqual(dmin.cmp(dday), 0);
      assert.strictEqual(dmin.cmp(dmonth), 0);
      assert.strictEqual(dmin.cmp(dyear), 0);

      assert.strictEqual(dhour.cmp(dmsec), 0);
      assert.strictEqual(dhour.cmp(dsec), 0);
      assert.strictEqual(dhour.cmp(dmin), 0);
      assert.strictEqual(dhour.cmp(dday), 0);
      assert.strictEqual(dhour.cmp(dmonth), 0);
      assert.strictEqual(dhour.cmp(dyear), 0);

      assert.strictEqual(dday.cmp(dmsec), 0);
      assert.strictEqual(dday.cmp(dsec), 0);
      assert.strictEqual(dday.cmp(dmin), 0);
      assert.strictEqual(dday.cmp(dhour), 0);
      assert.strictEqual(dday.cmp(dmonth), 0);
      assert.strictEqual(dday.cmp(dyear), 0);

      assert.strictEqual(dmonth.cmp(dmsec), 0);
      assert.strictEqual(dmonth.cmp(dsec), 0);
      assert.strictEqual(dmonth.cmp(dmin), 0);
      assert.strictEqual(dmonth.cmp(dhour), 0);
      assert.strictEqual(dmonth.cmp(dday), 0);
      assert.strictEqual(dmonth.cmp(dyear), 0);

      assert.strictEqual(dyear.cmp(dmsec), 0);
      assert.strictEqual(dyear.cmp(dsec), 0);
      assert.strictEqual(dyear.cmp(dmin), 0);
      assert.strictEqual(dyear.cmp(dhour), 0);
      assert.strictEqual(dyear.cmp(dday), 0);
      assert.strictEqual(dyear.cmp(dmonth), 0);

      assert.strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:07')), +1);
      assert.strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:08')), 0);
      assert.strictEqual(dmsec.cmp(JIODate('2012-05-02 06:07:09')), -1);
    });

}(QUnit, jiodate, moment));
