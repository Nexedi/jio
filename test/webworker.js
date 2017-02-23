/*global QUnit, Worker, console*/
(function (QUnit) {
  "use strict";

  var worker = new Worker("webworker.tests.js");
    //queue = new RSVP.Queue();
  worker.onerror = function (event) {
    console.log(event);
  };

  worker.onmessage = function (event) {
    var parsed_data = JSON.parse(event.data),
      //callbacks = QUnit.config[parsed_data.method],
      callbacks = QUnit.config.callbacks[parsed_data.method],
      i,
      start;
    if (parsed_data.method) {
      if (parsed_data.method === 'tap') {
        start = parsed_data.data.slice(0, 6);
        if (start === "not ok") {
          console.log(parsed_data.data);
        }
      } else {
        for (i = 0; i < callbacks.length; i += 1) {
          callbacks[i](parsed_data.data);
        }
        if (parsed_data.method === 'done') {
          worker.terminate();
        }
      }
    }
  };
}(QUnit));

