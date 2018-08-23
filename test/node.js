const testrunner = require('qunit');
const reportData = process.env.CI ? {} : null;
const runnerOptions = process.env.CI ? {
  log: {}
} : {
  log: {
    errors: true,
    summary: true,
    tests: true
  }
};

testrunner.setup(runnerOptions);

if (reportData) {
  testrunner.log.add = (type, obj) => {
    if (!reportData.hasOwnProperty(type)) {
      reportData[type] = [];
    }
    reportData[type].push(obj);
    return reportData[type];
  };
}

testrunner.run({
  code: 'test/node-require.js',
  tests: [
    'test/jio.storage/erp5storage.tests.js',
    'test/jio.storage/mappingstorage.tests.js',
    'test/jio.storage/memorystorage.tests.js',
    'test/jio.storage/querystorage.tests.js',
    'test/jio.storage/replicatestorage.tests.js',
    'test/jio.storage/uuidstorage.tests.js'
  ]
}, (err, _report) => {
  if (err) {
    console.error('error', err);
  }
  if (reportData) {
    console.log(JSON.stringify(reportData));
  }
});
