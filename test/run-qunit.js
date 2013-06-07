/*jslint indent: 2, maxlen: 80 */
/*global require: true, phantom: true, document: true */

"use strict";

var system = require('system');

/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @method waitFor
 * @param {Function} testFx Condition that evaluates to a boolean
 * @param {Function} onReady What to do when testFx condition is fulfilled
 * @param {Number} time_out_millis The max amount of time to wait.
 *                                 If not specified, 10 sec is used.
 */
function waitFor(testFx, onReady, time_out_millis) {
  var maxtime_out_millis, start, condition, interval;
  maxtime_out_millis = time_out_millis || 10001;
  start = new Date().getTime();
  condition = false;
  interval = setInterval(function () {
    if ((new Date().getTime() - start < maxtime_out_millis) && !condition) {
      // If not time-out yet and condition not yet fulfilled
      condition = testFx();
    } else {
      if (!condition) {
        // If condition still not fulfilled (timeout but condition is 'false')
        console.log("'waitFor()' timeout");
        phantom.exit(1);
      } else {
        // Condition fulfilled (timeout and/or condition is 'true')
        console.log("'waitFor()' finished in " +
                    (new Date().getTime() - start) + "ms.");
        onReady();
        clearInterval(interval); //< Stop this interval
      }
    }
  }, 100); //< repeat check every 100ms
}

if (system.args.length !== 2) {
  console.log('Usage: run-qunit.js URL');
  phantom.exit(1);
}

var page = require('webpage').create();

// Route "console.log()" calls from within the Page context to the main Phantom
// context (i.e. current "this")
page.onConsoleMessage = function (msg) {
  console.log(msg);
};

page.open(system.args[1], function (status) {
  if (status !== "success") {
    console.log("Unable to access network");
    phantom.exit(1);
  }
  waitFor(function () {
    return page.evaluate(function () {
      var el = document.getElementById('qunit-testresult');
      if (el && el.innerText.match('completed')) {
        return true;
      }
      return false;
    });
  }, function () {
    var failedNum = page.evaluate(function () {
      console.log("========================================================");
      console.log(document.documentElement.innerHTML);
      console.log("========================================================");
      var el = document.getElementById('qunit-testresult');
      console.log(el.innerText);
      try {
        return el.getElementsByClassName('failed')[0].innerHTML;
      } catch (e) { }
      return 10000;
    });
    phantom.exit((parseInt(failedNum, 10) > 0) ? 1 : 0);
  });
});
