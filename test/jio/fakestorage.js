/*
 * Copyright 2013, Nexedi SA
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
/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, exports, window, require, jIO */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    module(exports, require('jio'));
  }
  if (typeof window === 'object') {
    window.fake_storage = {};
    module(window.fake_storage, jIO);
  }
}(['exports', 'jio'], function (exports, jIO) {
  "use strict";

  var fakestorage = {};

  function FakeStorage(spec) {
    this._id = spec.id;
    if (typeof this._id !== 'string' || this._id.length <= 0) {
      throw new TypeError(
        "Initialization error: wrong id"
      );
    }
  }

  FakeStorage.createNamespace = function (
    that,
    method,
    command,
    param,
    options
  ) {
    fakestorage[that._id + '/' + method] = {
      param: param,
      options: options,
      success: function () {
        var res = command.success.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
        return res;
      },
      error: function () {
        var res = command.error.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
        return res;
      },
      retry: function () {
        var res = command.retry.apply(command, arguments);
        delete fakestorage[that._id + '/' + method];
        return res;
      },
      notify: function () {
        return command.notify.apply(command, arguments);
      },
      storage: function () {
        return command.storage.apply(command, arguments);
      },
      end: function () {
        return command.end.apply(command, arguments);
      },
      commit: function () {
        return command.commit.apply(command, arguments);
      },
      free: function () {
        delete fakestorage[that._id + '/' + method];
      },
      setCanceller: function () {
        return command.setCanceller.apply(command, arguments);
      }
    };
  };

  FakeStorage.makeMethod = function (method) {
    return function (command, param, options) {
      FakeStorage.createNamespace(this, method, command, param, options);
    };
  };

  FakeStorage.prototype.post = FakeStorage.makeMethod('post');
  FakeStorage.prototype.put = FakeStorage.makeMethod('put');
  FakeStorage.prototype.get = FakeStorage.makeMethod('get');
  FakeStorage.prototype.remove = FakeStorage.makeMethod('remove');
  FakeStorage.prototype.putAttachment = FakeStorage.makeMethod('putAttachment');
  FakeStorage.prototype.getAttachment = FakeStorage.makeMethod('getAttachment');
  FakeStorage.prototype.removeAttachment =
    FakeStorage.makeMethod('removeAttachment');
  FakeStorage.prototype.check = FakeStorage.makeMethod('check');
  FakeStorage.prototype.repair = FakeStorage.makeMethod('repair');
  FakeStorage.prototype.allDocs = FakeStorage.makeMethod('allDocs');

  jIO.addStorage('fake', FakeStorage);

  exports.commands = fakestorage;

}));
