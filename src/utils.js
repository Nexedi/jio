/*
 * Copyright 2014, Nexedi SA
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

/* global ArrayBuffer, Uint8Array */

import RSVP from 'rsvp';
import XMLHttpRequest from 'xhr2';
import { jIO } from './jio';
import { Blob, FileReader, atob } from './utils-compat';

/**
 * @returns RSVP.Queue
 */
function ensurePushableQueue(callback, argument_list, context) {
  var result;
  try {
    result = callback.apply(context, argument_list);
  } catch (e) {
    return new RSVP.Queue()
      .push(function returnPushableError() {
        return RSVP.reject(e);
      });
  }
  if (result instanceof RSVP.Queue) {
    return result;
  }
  return new RSVP.Queue().push(function () {
    return result;
  });
}

function declareMethod(klass, name, precondition_function, post_function) {
  klass.prototype[name] = function () {
    var argument_list = arguments,
      context = this,
      precondition_result,
      storage_method,
      queue;

    // Precondition function are not asynchronous
    if (precondition_function !== undefined) {
      precondition_result = precondition_function.apply(
        context.__storage,
        [argument_list, context, name]
      );
    }

    storage_method = context.__storage[name];
    if (storage_method === undefined) {
      throw new jIO.util.jIOError(
        "Capacity '" + name + "' is not implemented on '" +
          context.__type + "'",
        501
      );
    }
    queue = ensurePushableQueue(
      storage_method, argument_list, context.__storage
    );

    if (post_function !== undefined) {
      queue
        .push(function (result) {
          return post_function.call(
            context,
            argument_list,
            result,
            precondition_result
          );
        });
    }
    return queue;
  };
  // Allow chain
  return this;
}

function jIOError(message, status_code) {
  if ((message !== undefined) && (typeof message !== 'string')) {
    throw new TypeError('You must pass a string.');
  }
  this.message = message || 'Default Message';
  this.status_code = status_code || 500;
}
jIOError.prototype = new Error();
jIOError.prototype.constructor = jIOError;
jIO.util.jIOError = jIOError;

/**
 * Send request with XHR and return a promise. xhr.onload: The promise is
 * resolved when the status code is lower than 400 with the xhr object as
 * first parameter. xhr.onerror: reject with xhr object as first
 * parameter. xhr.onprogress: notifies the xhr object.
 *
 * @param param The parameters
 * @param {string} param.type The request method
 * @param {string} param.dataType The data type to retrieve
 * @param {string} param.url The url
 * @param {any} param.data The data to send
 * @param {any} param.headers The HTTP headers sent with the request
 * @param {number} param.timeout The request timeout value
 * @param {Function} param.beforeSend A function called just before the
 *    send request. The first parameter of this function is the XHR object.
 * @return {Promise} The promise
 */
function ajax(param) {
  var xhr = new XMLHttpRequest();
  return new RSVP.Promise(function (resolve, reject, notify) {
    var k;
    xhr.open(param.type || "GET", param.url, true);
    xhr.responseType = param.dataType || "";
    if (typeof param.headers === 'object' && param.headers !== null) {
      for (k in param.headers) {
        if (param.headers.hasOwnProperty(k)) {
          xhr.setRequestHeader(k, param.headers[k]);
        }
      }
    }
    xhr.addEventListener("load", function (e) {
      if (e.target.status >= 400) {
        return reject(e);
      }
      resolve(e);
    });
    xhr.addEventListener("error", reject);
    xhr.addEventListener("progress", function (e) {
      if (notify) {
        notify(e);
      }
    });
    if (typeof param.xhrFields === 'object' && param.xhrFields !== null) {
      for (k in param.xhrFields) {
        if (param.xhrFields.hasOwnProperty(k)) {
          xhr[k] = param.xhrFields[k];
        }
      }
    }
    if (param.timeout !== undefined && param.timeout !== 0) {
      xhr.timeout = param.timeout;
      xhr.ontimeout = function () {
        return reject(new jIO.util.jIOError("Gateway Timeout", 504));
      };
    }
    if (typeof param.beforeSend === 'function') {
      param.beforeSend(xhr);
    }
    xhr.send(param.data);
  }, function () {
    xhr.abort();
  });
}
jIO.util.ajax = ajax;

function base64toBlob(b64String, mimeString) {
  var byteString = atob(b64String),
  // write the bytes of the string to an ArrayBuffer
    arrayBuffer = new ArrayBuffer(byteString.length),
    _ia = new Uint8Array(arrayBuffer),
    i;
  for (i = 0; i < byteString.length; i += 1) {
    _ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], {type: mimeString});
}
jIO.util.base64toBlob = base64toBlob;

// https://gist.github.com/davoclavo/4424731
function dataURItoBlob(dataURI) {
  if (dataURI === 'data:') {
    return new Blob();
  }
  // convert base64 to raw binary data held in a string
  var mimeString = dataURI.split(',')[0].split(':')[1];
  mimeString = mimeString.slice(0, mimeString.length - ';base64'.length);
  return base64toBlob(dataURI.split(',')[1], mimeString);
}
jIO.util.dataURItoBlob = dataURItoBlob;

function readBlobAsDataURL(blob) {
  var fr = new FileReader();
  return new RSVP.Promise(function (resolve, reject, notify) {
    fr.addEventListener('load', resolve);
    fr.addEventListener('error', reject);
    fr.addEventListener('progress', notify);
    fr.readAsDataURL(blob);
  }, function () {
    fr.abort();
  });
}
jIO.util.readBlobAsDataURL = readBlobAsDataURL;

function readBlobAsText(blob, encoding) {
  var fr = new FileReader();
  return new RSVP.Promise(function (resolve, reject, notify) {
    fr.addEventListener('load', resolve);
    fr.addEventListener('error', reject);
    fr.addEventListener('progress', notify);
    fr.readAsText(blob, encoding);
  }, function () {
    fr.abort();
  });
}
jIO.util.readBlobAsText = readBlobAsText;

function readBlobAsArrayBuffer(blob) {
  var fr = new FileReader();
  return new RSVP.Promise(function (resolve, reject, notify) {
    fr.addEventListener('load', resolve);
    fr.addEventListener('error', reject);
    fr.addEventListener('progress', notify);
    fr.readAsArrayBuffer(blob);
  }, function () {
    fr.abort();
  });
}
jIO.util.readBlobAsArrayBuffer = readBlobAsArrayBuffer;

function stringify(obj) {
  // Implement a stable JSON.stringify
  // Object's keys are alphabetically ordered
  var key,
    key_list,
    i,
    value,
    result_list;
  if (obj === undefined) {
    return undefined;
  }
  if (obj === null) {
    return 'null';
  }
  if (obj.constructor === Object) {
    key_list = Object.keys(obj).sort();
    result_list = [];
    for (i = 0; i < key_list.length; i += 1) {
      key = key_list[i];
      value = stringify(obj[key]);
      if (value !== undefined) {
        result_list.push(stringify(key) + ':' + value);
      }
    }
    return '{' + result_list.join(',') + '}';
  }
  if (obj.constructor === Array) {
    result_list = [];
    for (i = 0; i < obj.length; i += 1) {
      result_list.push(stringify(obj[i]));
    }
    return '[' + result_list.join(',') + ']';
  }
  return JSON.stringify(obj);
}
jIO.util.stringify = stringify;

export {
  declareMethod,
  ensurePushableQueue,
  jIOError,
  ajax,
  base64toBlob,
  dataURItoBlob,
  readBlobAsDataURL,
  readBlobAsText,
  readBlobAsArrayBuffer,
  stringify
};
