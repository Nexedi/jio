/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, regexp: true */
/*global constants, dictUpdate, deepClone */

function restCommandRejecter(param, args) {
  // reject(status, reason, message, {"custom": "value"});
  // reject(status, reason, {..});
  // reject(status, {..});
  var a = args[0], b = args[1], c = args[2], d = args[3], weak, strong;
  weak = {};
  strong = {"result": "error"};

  // parsing first parameter if is not an object
  if (typeof a !== 'object' || Array.isArray(a)) {
    strong.status = constants.http_status[a];
    strong.statusText = constants.http_status_text[a];
    if (strong.status === undefined || strong.statusText === undefined) {
      return restCommandRejecter(param, [
        // can create infernal loop if 'internal_storage_error' is not defined
        // in the constants
        'internal_storage_error',
        'invalid response',
        'Unknown status "' + a + '"'
      ]);
    }
    a = b;
    b = c;
    c = d;
  }

  // parsing second parameter if is not an object
  if (typeof a !== 'object' || Array.isArray(a)) {
    strong.reason = a;
    a = b;
    b = c;
  }

  // parsing third parameter if is not an object
  if (typeof a !== 'object' || Array.isArray(a)) {
    strong.message = a;
    a = b;
  }

  // parsing fourth parameter if is an object
  if (typeof a === 'object' && !Array.isArray(a)) {
    dictUpdate(weak, a);
    if (typeof a.reason === 'string' && !strong.reason) {
      strong.reason = a.reason;
    }
    if (typeof a.message === 'string' && !strong.message) {
      strong.message = a.message;
    }
    if ((a.statusText || a.status >= 0) && !strong.statusText) {
      strong.status = constants.http_status[a.statusText || a.status];
      strong.statusText = constants.http_status_text[a.statusText || a.status];
      if (strong.status === undefined || strong.statusText === undefined) {
        return restCommandRejecter(param, [
          'internal_storage_error',
          'invalid response',
          'Unknown status "' + (a.statusText || a.status) + '"'
        ]);
      }
    }
    if (a instanceof Error) {
      strong.reason = a.message;
      strong.error = a.name;
    }
  }

  // creating defaults
  weak.status = constants.http_status.unknown;
  weak.statusText = constants.http_status_text.unknown;
  weak.message = 'Command failed';
  weak.reason = 'fail';
  weak.method = param.method;
  if (param.kwargs._id) {
    weak.id = param.kwargs._id;
  }
  if (/Attachment$/.test(param.method)) {
    weak.attachment = param.kwargs._attachment;
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
  return param.solver.reject(deepClone(weak));
}
