/*jslint indent: 2, maxlen: 80, nomen: true, sloppy: true, regexp: true */
/*global Deferred, inherits, constants, dictUpdate, deepClone, Blob */

function IODeferred(method, info) {
  IODeferred.super_.call(this);
  this._info = info || {};
  this._method = method;
  // this._options = options;
}
inherits(IODeferred, Deferred);

IODeferred.prototype.resolve = function (a, b) {
  if (this._method === 'getAttachment') {
    if (typeof a === 'string') {
      return IODeferred.super_.prototype.resolve.call(this, new Blob([a]));
    }
    if (a instanceof Blob) {
      return IODeferred.super_.prototype.resolve.call(this, a);
    }
  }
  // resolve('ok', {"custom": "value"});
  // resolve(200, {...});
  // resolve({...});
  var weak = {"ok": true}, strong = {};
  if (this._method === 'post') {
    weak.status = constants.http_status.created;
    weak.statusText = constants.http_status_text.created;
  } else {
    weak.status = constants.http_status.ok;
    weak.statusText = constants.http_status_text.ok;
    weak.id = this._info._id;
    if (/Attachment$/.test(this._method)) {
      weak.attachment = this._info._attachment;
    }
  }

  if (a !== undefined && (typeof a !== 'object' || Array.isArray(a))) {
    strong.status = constants.http_status[a];
    strong.statusText = constants.http_status_text[a];
    if (strong.status === undefined ||
        strong.statusText === undefined) {
      return this.reject(
        'internal_storage_error',
        'invalid response',
        'Unknown status "' + a + '"'
      );
    }
    a = b;
  }
  if (typeof a === 'object' && !Array.isArray(a)) {
    dictUpdate(weak, a);
  }
  dictUpdate(weak, strong);
  strong = undefined; // free memory
  if (typeof weak.id !== 'string' || !weak.id) {
    return this.reject(
      'internal_storage_error',
      'invalid response',
      'New document id have to be specified'
    );
  }
  //return super_resolve(deepClone(weak));
  return IODeferred.super_.prototype.resolve.call(this, deepClone(weak));
};

IODeferred.prototype.reject = function (a, b, c, d) {
  // reject(status, reason, message, {"custom": "value"});
  // reject(status, reason, {..});
  // reject(status, {..});
  var weak = {}, strong = {};
  weak.status = constants.http_status.unknown;
  weak.statusText = constants.http_status_text.unknown;
  weak.message = 'Command failed';
  weak.reason = 'fail';

  if (typeof a !== 'object' || Array.isArray(a)) {
    strong.status = constants.http_status[a];
    strong.statusText = constants.http_status_text[a];
    if (strong.status === undefined ||
        strong.statusText === undefined) {
      return this.reject(
        // can create infernal loop if 'internal_storage_error' is not defined
        // in the constants
        'internal_storage_error',
        'invalid response',
        'Unknown status "' + a + '"'
      );
    }
    a = b;
    b = c;
    c = d;
  }

  if (typeof a !== 'object' || Array.isArray(a)) {
    strong.reason = a;
    a = b;
    b = c;
  }

  if (typeof a !== 'object' || Array.isArray(a)) {
    strong.message = a;
    a = b;
  }

  if (typeof a === 'object' && !Array.isArray(a)) {
    dictUpdate(weak, a);
  }

  dictUpdate(weak, strong);
  strong = undefined;
  if (weak.error === undefined) {
    weak.error = weak.statusText.toLowerCase().replace(/ /g, '_').
      replace(/[^_a-z]/g, '');
  }
  if (typeof weak.message !== 'string') {
    weak.message = "";
  }
  if (typeof weak.reason !== 'string') {
    weak.reason = "unknown";
  }
  //return super_reject(deepClone(weak));
  return IODeferred.super_.prototype.reject.call(this, deepClone(weak));
};

IODeferred.createFromDeferred = function (method, info, options, deferred) {
  var iodeferred = new IODeferred(method, info, options);
  // iodeferred.promise().done(deferred.resolve.bind(deferred)).
  //   fail(deferred.reject.bind(deferred)).
  //   progress(deferred.notify.bind(deferred));
  // // phantomjs doesn't like 'bind'...
  iodeferred.promise().done(function () {
    deferred.resolve.apply(deferred, arguments);
  }).fail(function () {
    deferred.reject.apply(deferred, arguments);
  }).progress(function () {
    deferred.notify.apply(deferred, arguments);
  });
  return iodeferred;
};

IODeferred.createFromParam = function (param) {
  return IODeferred.createFromDeferred(
    param.method,
    param.kwargs,
    param.options,
    param.deferred
  );
};
