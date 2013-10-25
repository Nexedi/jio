/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, regexp: true */
/*global constants, dictUpdate, deepClone */

function restCommandRejecter(param, args) {
  // reject(status, reason, message, {"custom": "value"});
  // reject(status, reason, {..});
  // reject(status, {..});
  var arg, current_priority, priority = [
    // 0 - custom parameter values
    {},
    // 1 - default values
    {
      "status": constants.http_status.unknown,
      "statusText": constants.http_status_text.unknown,
      "message": "Command failed",
      "reason": "unknown"
    },
    // 2 - status, reason, message parameters
    {},
    // 3 - never change
    {"result": "error", "method": param.method}
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

  // priority 2 - status, reason, message parameters
  current_priority = priority[2];
  // parsing first parameter if is not an object
  if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) {
    // first parameter is mandatory
    current_priority.status = arg;
    arg = args.shift();
  }
  // parsing second parameter if is not an object
  if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) {
    if (arg !== undefined) {
      current_priority.reason = arg;
    }
    arg = args.shift();
  }
  // parsing third parameter if is not an object
  if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) {
    if (arg !== undefined) {
      current_priority.message = arg;
    }
    arg = args.shift();
  }

  // priority 0 - custom values
  current_priority = priority[0];
  // parsing fourth parameter if is an object
  if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
    dictUpdate(current_priority, arg);
    if (arg.hasOwnProperty('reason')) {
      current_priority.reason = arg.reason;
    }
    if (arg.hasOwnProperty('message')) {
      current_priority.message = arg.message;
    }
    if ((arg.statusText || arg.status >= 0)) {
      current_priority.status = arg.statusText || arg.status;
    }
    if (arg instanceof Error) {
      current_priority.reason = arg.message || "";
      current_priority.error = arg.name;
    }
  }

  // merge priority dicts
  for (current_priority = priority.length - 1;
       current_priority > 0;
       current_priority -= 1) {
    dictUpdate(priority[current_priority - 1], priority[current_priority]);
  }
  priority = priority[0];

  // check status
  priority.statusText = constants.http_status_text[priority.status];
  if (priority.statusText === undefined) {
    return restCommandRejecter(param, [
      // can create infernal loop if 'internal_storage_error' is not defined in
      // the constants
      'internal_storage_error',
      'invalid response',
      'Unknown status "' + priority.status + '"'
    ]);
  }
  priority.status = constants.http_status[priority.statusText];

  // set default priority error if not already set
  if (priority.error === undefined) {
    priority.error = priority.statusText.toLowerCase().replace(/ /g, '_').
      replace(/[^_a-z]/g, '');
  }
  return param.solver.reject(deepClone(priority));
}
