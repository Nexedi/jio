/*global require*/
(function (require) {
  "use strict";

  var jIO = require('../dist/jio-node-latest.js').jIO,
    storage = jIO.createJIO({type: 'memory'});
  storage
    .put('1', {
      foo: 'bar'
    })
    .then(function (id) {
      console.log(id === '1');
      return storage.allDocs();
    })
    .then(function (results) {
      console.log(results.data.total_rows === 1);
      return storage.get('1');
    })
    .then(function (result) {
      console.log(result);
    });
}(require));
