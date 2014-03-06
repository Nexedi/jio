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
