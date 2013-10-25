/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global constants, methodType, dictUpdate, Blob, deepClone,
  restCommandRejecter */

function restCommandResolver(param, args) {
  // resolve('ok', {"custom": "value"});
  // resolve(200, {...});
  // resolve({...});
  var arg, current_priority, priority = [
    // 0 - custom parameter values
    {},
    // 1 - default values
    {},
    // 2 - status parameter
    {},
    // 3 - never change
    {"result": "success", "method": param.method}
  ];
  args = Array.prototype.slice.call(args);
  arg = args.shift();

  // priority 3 - never change
  current_priority = priority[3];
  if (param.kwargs._id) {
    current_priority.id = param.kwargs._id;
  }
  if (/Attachment$/.test(param.method)) {
    current_priority.attachment = param.kwargs._attachment;
  }

  // priority 1 - default values
  current_priority = priority[1];
  if (param.method === 'post') {
    current_priority.status = constants.http_status.created;
    current_priority.statusText = constants.http_status_text.created;
  } else if (methodType(param.method) === "writer" ||
             param.method === "check") {
    current_priority.status = constants.http_status.no_content;
    current_priority.statusText = constants.http_status_text.no_content;
  } else {
    current_priority.status = constants.http_status.ok;
    current_priority.statusText = constants.http_status_text.ok;
  }

  // priority 2 - status parameter
  current_priority = priority[2];
  // parsing first parameter if is not an object
  if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) {
    if (arg !== undefined) {
      current_priority.status = arg;
    }
    arg = args.shift();
  }

  // priority 0 - custom values
  current_priority = priority[0];
  // parsing second parameter if is an object
  if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
    dictUpdate(current_priority, arg);
  }

  // merge priority dicts
  for (current_priority = priority.length - 1;
       current_priority > 0;
       current_priority -= 1) {
    dictUpdate(priority[current_priority - 1], priority[current_priority]);
  }
  priority = priority[0];

  // check document id if post method
  if (param.method === 'post' &&
      (typeof priority.id !== 'string' || !priority.id)) {
    return restCommandRejecter(param, [
      'internal_storage_error',
      'invalid response',
      'New document id have to be specified'
    ]);
  }

  // check status
  priority.statusText = constants.http_status_text[priority.status];
  if (priority.statusText === undefined) {
    return restCommandRejecter(param, [
      'internal_storage_error',
      'invalid response',
      'Unknown status "' + priority.status + '"'
    ]);
  }
  priority.status = constants.http_status[priority.statusText];

  // check data for get Attachment
  if (param.method === 'getAttachment') {
    if (typeof priority.data === 'string') {
      priority.data = new Blob([priority.data], {
        "type": priority.content_type || priority.mimetype || ""
      });
      delete priority.content_type;
      delete priority.mimetype;
    }
    if (!(priority.data instanceof Blob)) {
      return restCommandRejecter(param, [
        'internal_storage_error',
        'invalid response',
        'getAttachment method needs a Blob as returned "data".'
      ]);
    }
    // check data for readers (except check method)
  } else if (methodType(param.method) === 'reader' &&
             param.method !== 'check' &&
             (typeof priority.data !== 'object' ||
              priority.data === null ||
              Object.getPrototypeOf(priority.data) !== Object.prototype)) {
    return restCommandRejecter(param, [
      'internal_storage_error',
      'invalid response',
      param.method + ' method needs a dict as returned "data".'
    ]);
  }

  return param.solver.resolve(deepClone(priority));
}
