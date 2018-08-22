const testrunner = require('qunit');

testrunner.setup({
  log: {
    errors: true,
    summary: true,
    tests: true
  }
});

testrunner.run({
  code: 'test/node-require.js',
  tests: [
    'test/jio.storage/erp5storage.tests.js',
    'test/jio.storage/memorystorage.tests.js',
    'test/jio.storage/querystorage.tests.js',
    'test/jio.storage/replicatestorage.tests.js',
    'test/jio.storage/uuidstorage.tests.js'
  ]
}, function(err, _report) {
  if (err) {
    console.error('error', err);
  }
});
