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
/*global require, global, Object */
(function (require, global, Object) {
  "use strict";

  var sinon,
    nise,
    originalRespondWith,
    jIO = require('../../dist/jio-latest-node');
  global.jIO = jIO;
  Object.keys(jIO.node_env).forEach(function (key) {
    global[key] = jIO.node_env[key];
  });

  sinon = require('sinon');
  global.sinon = sinon;
  // Add compatibility
  nise = require('nise');
  sinon.fakeServer = nise.fakeServer;
  originalRespondWith = sinon.fakeServer.respondWith;
  sinon.fakeServer.respondWith = function (method, url, body) {
    if (arguments.length !== 3) {
      throw new Error('unexpected arguments');
    }
    if (typeof url === "string") {
      // nise uses path-to-regexp which consider ? character as regexp
      url = new RegExp(
        '^' + url.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&") + '$'
      );
    }
    return originalRespondWith.apply(this, [method, url, body]);
  };

}(require, global, Object));
