/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global constants, methodType, dictUpdate, Blob, deepClone,
  restCommandRejecter */

function restCommandResolver(param, args) {
  // resolve('ok', {"custom": "value"});
  // resolve(200, {...});
  // resolve({...});
  var a = args[0], b = args[1], weak = {"result": "success"}, strong = {};
  if (param.method === 'post') {
    weak.status = constants.http_status.created;
    weak.statusText = constants.http_status_text.created;
  } else if (methodType(param.method) === "writer" ||
             param.method === "check") {
    weak.status = constants.http_status.no_content;
    weak.statusText = constants.http_status_text.no_content;
  } else {
    weak.status = constants.http_status.ok;
    weak.statusText = constants.http_status_text.ok;
  }
  if (param.kwargs._id) {
    weak.id = param.kwargs._id;
  }
  if (/Attachment$/.test(param.method)) {
    weak.attachment = param.kwargs._attachment;
  }
  weak.method = param.method;

  if (typeof a === 'string' || (typeof a === 'number' && isFinite(a))) {
    strong.status = constants.http_status[a];
    strong.statusText = constants.http_status_text[a];
    if (strong.status === undefined ||
        strong.statusText === undefined) {
      return restCommandRejecter(param, [
        'internal_storage_error',
        'invalid response',
        'Unknown status "' + a + '"'
      ]);
    }
    a = b;
  }
  if (typeof a === 'object' && !Array.isArray(a)) {
    dictUpdate(weak, a);
  }
  dictUpdate(weak, strong);
  strong = undefined; // free memory
  if (param.method === 'post' && (typeof weak.id !== 'string' || !weak.id)) {
    return restCommandRejecter(param, [
      'internal_storage_error',
      'invalid response',
      'New document id have to be specified'
    ]);
  }
  if (param.method === 'getAttachment') {
    if (typeof weak.data === 'string') {
      weak.data = new Blob([weak.data], {
        "type": weak.content_type || weak.mimetype || ""
      });
      delete weak.content_type;
      delete weak.mimetype;
    }
    if (!(weak.data instanceof Blob)) {
      return restCommandRejecter(param, [
        'internal_storage_error',
        'invalid response',
        'getAttachment method needs a Blob as returned "data".'
      ]);
    }
  } else if (methodType(param.method) === 'reader' &&
             param.method !== 'check' &&
             (typeof weak.data !== 'object' ||
              Object.getPrototypeOf(weak.data) !== Object.prototype)) {
    return restCommandRejecter(param, [
      'internal_storage_error',
      'invalid response',
      param.method + ' method needs a dict as returned "data".'
    ]);
  }
  return param.solver.resolve(deepClone(weak));
}
