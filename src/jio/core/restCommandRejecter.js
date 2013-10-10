/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, regexp: true */
/*global constants, dictUpdate, deepClone */

function restCommandRejecter(param, args) {
  // reject(status, reason, message, {"custom": "value"});
  // reject(status, reason, {..});
  // reject(status, {..});
  var a = args[0], b = args[1], c = args[2], d = args[3], weak, strong;
  weak = {"result": "error"};
  strong = {};
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

  if (typeof a !== 'object' || Array.isArray(a)) {
    strong.status = constants.http_status[a];
    strong.statusText = constants.http_status_text[a];
    if (strong.status === undefined ||
        strong.statusText === undefined) {
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
    if (a instanceof Error) {
      weak.reason = a.message;
      weak.error = a.name;
    }
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
