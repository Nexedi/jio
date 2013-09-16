/*jslint indent: 2, maxlen: 80, nomen: true, sloppy: true, regexp: true */
/*global Deferred, inherits, constants, dictUpdate, deepClone, Blob,
  methodType */

function IODeferred(method, info) {
  IODeferred.super_.call(this);
  this._info = info || {};
  this._method = method;
  // this._options = options;
}
inherits(IODeferred, Deferred);

IODeferred.prototype.resolve = function (a, b) {
  // resolve('ok', {"custom": "value"});
  // resolve(200, {...});
  // resolve({...});
  var weak = {"result": "success"}, strong = {};
  if (this._method === 'post') {
    weak.status = constants.http_status.created;
    weak.statusText = constants.http_status_text.created;
  } else if (methodType(this._method) === "writer" ||
             this._method === "check") {
    weak.status = constants.http_status.no_content;
    weak.statusText = constants.http_status_text.no_content;
  } else {
    weak.status = constants.http_status.ok;
    weak.statusText = constants.http_status_text.ok;
  }
  if (this._info._id) {
    weak.id = this._info._id;
  }
  if (/Attachment$/.test(this._method)) {
    weak.attachment = this._info._attachment;
  }
  weak.method = this._method;

  if (typeof a === 'string' || (typeof a === 'number' && isFinite(a))) {
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
  if (this._method === 'post' && (typeof weak.id !== 'string' || !weak.id)) {
    return this.reject(
      'internal_storage_error',
      'invalid response',
      'New document id have to be specified'
    );
  }
  if (this._method === 'getAttachment') {
    if (typeof weak.data === 'string') {
      weak.data = new Blob([weak.data], {
        "type": weak.content_type || weak.mimetype || ""
      });
      delete weak.content_type;
      delete weak.mimetype;
    }
    if (!(weak.data instanceof Blob)) {
      return this.reject(
        'internal_storage_error',
        'invalid response',
        'getAttachment method needs a Blob as returned "data".'
      );
    }
  } else if (methodType(this._method) === 'reader' &&
             this._method !== 'check' &&
             (typeof weak.data !== 'object' ||
              Object.getPrototypeOf(weak.data) !== Object.prototype)) {
    return this.reject(
      'internal_storage_error',
      'invalid response',
      this._method + ' method needs a dict as returned "data".'
    );
  }
  //return super_resolve(deepClone(weak));
  return IODeferred.super_.prototype.resolve.call(this, deepClone(weak));
};

IODeferred.prototype.reject = function (a, b, c, d) {
  // reject(status, reason, message, {"custom": "value"});
  // reject(status, reason, {..});
  // reject(status, {..});
  var weak = {"result": "error"}, strong = {};
  weak.status = constants.http_status.unknown;
  weak.statusText = constants.http_status_text.unknown;
  weak.message = 'Command failed';
  weak.reason = 'fail';
  weak.method = this._method;
  if (this._info._id) {
    weak.id = this._info._id;
  }
  if (/Attachment$/.test(this._method)) {
    weak.attachment = this._info._attachment;
  }

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
  iodeferred.promise.then(
    deferred.resolve.bind(deferred),
    deferred.reject.bind(deferred),
    deferred.notify.bind(deferred)
  );
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
