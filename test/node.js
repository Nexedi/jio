/*
 * Copyright 2018, Nexedi SA
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
/*global require, process, console, JSON */
(function (require, process, console, JSON) {
  "use strict";

  var testrunner = require('qunit'),
    report_data = process.env.CI ? {} : null,
    runner_options = process.env.CI ? {
      log: {}
    } : {
      log: {
        errors: true,
        summary: true,
        tests: true
      }
    };

  testrunner.setup(runner_options);

  if (report_data) {
    testrunner.log.add = function (type, obj) {
      if (!report_data.hasOwnProperty(type)) {
        report_data[type] = [];
      }
      report_data[type].push(obj);
      return report_data[type];
    };
  }

  testrunner.run({
    code: 'test/node/node-require.js',
    tests: [
      'test/jio/util.js',
      'test/queries/key.tests.js',
      'test/queries/key-schema.tests.js',
      /*
      'test/queries/tests.js',
      */
      'test/queries/key-typechecks.tests.js',
      'test/queries/jiodate.tests.js',
      'test/queries/key-jiodate.tests.js',
      'test/jio.storage/documentstorage.tests.js',
      'test/jio.storage/drivetojiomapping.tests.js',
      'test/jio.storage/dropboxstorage.tests.js',
      'test/jio.storage/erp5storage.tests.js',
      'test/jio.storage/fbstorage.tests.js',
      'test/jio.storage/gdrivestorage.tests.js',
      'test/jio.storage/liststorage.tests.js',
      'test/jio.storage/memorystorage.tests.js',
      'test/jio.storage/nocapacitystorage.tests.js',
      'test/jio.storage/querystorage.tests.js',
      'test/jio.storage/replicatestorage.tests.js',
      'test/jio.storage/replicatestorage_fastrepair.tests.js',
      'test/jio.storage/replicatestorage_fastrepairattachment.tests.js',
      'test/jio.storage/replicatestorage_repair.tests.js',
      'test/jio.storage/replicatestorage_repairattachment.tests.js',
      'test/jio.storage/shastorage.tests.js',
      'test/jio.storage/unionstorage.tests.js',
      'test/jio.storage/uuidstorage.tests.js'
    ]
  }, function (err) {
    if (err) {
      console.error('error', err);
    }
    if (report_data) {
      console.log(JSON.stringify(report_data));
    }
  });

}(require, process, console, JSON));
