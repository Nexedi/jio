import RSVP from 'rsvp';

function jIOError(message, status_code) {
  if ((message !== undefined) && (typeof message !== "string")) {
    throw new TypeError('You must pass a string.');
  }
  this.message = message || "Default Message";
  this.status_code = status_code || 500;
}
jIOError.prototype = new Error();
jIOError.prototype.constructor = jIOError;

/**
 * Send request with XHR and return a promise. xhr.onload: The promise is
 * resolved when the status code is lower than 400 with the xhr object as
 * first parameter. xhr.onerror: reject with xhr object as first
 * parameter. xhr.onprogress: notifies the xhr object.
 *
 * @param  {Object} param The parameters
 * @param  {String} [param.type="GET"] The request method
 * @param  {String} [param.dataType=""] The data type to retrieve
 * @param  {String} param.url The url
 * @param  {Any} [param.data] The data to send
 * @param  {Number} param.timeout The request timeout value
 * @param  {Function} [param.beforeSend] A function called just before the
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
    xhr.addEventListener("progress", notify);
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
        return reject(new jIOError("Gateway Timeout", 504));
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

// https://gist.github.com/davoclavo/4424731
function dataURItoBlob(dataURI) {
  if (dataURI === 'data:') {
    return new Blob();
  }
  // convert base64 to raw binary data held in a string
  var byteString = atob(dataURI.split(',')[1]),
  // separate out the mime component
    mimeString = dataURI.split(',')[0].split(':')[1],
  // write the bytes of the string to an ArrayBuffer
    arrayBuffer = new ArrayBuffer(byteString.length),
    _ia = new Uint8Array(arrayBuffer),
    i;
  mimeString = mimeString.slice(0, mimeString.length - ";base64".length);
  for (i = 0; i < byteString.length; i += 1) {
    _ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], {type: mimeString});
}

function readBlobAsDataURL(blob) {
  var fr = new FileReader();
  return new RSVP.Promise(function(resolve, reject, notify) {
    fr.addEventListener("load", resolve);
    fr.addEventListener("error", reject);
    fr.addEventListener("progress", notify);
    fr.readAsDataURL(blob);
  }, function() {
    fr.abort();
  });
}

function readBlobAsText(blob, encoding) {
  var fr = new FileReader();
  return new RSVP.Promise(function (resolve, reject, notify) {
    fr.addEventListener("load", resolve);
    fr.addEventListener("error", reject);
    fr.addEventListener("progress", notify);
    fr.readAsText(blob, encoding);
  }, function () {
    fr.abort();
  });
}

function readBlobAsArrayBuffer(blob) {
  var fr = new FileReader();
  return new RSVP.Promise(function (resolve, reject, notify) {
    fr.addEventListener("load", resolve);
    fr.addEventListener("error", reject);
    fr.addEventListener("progress", notify);
    fr.readAsArrayBuffer(blob);
  }, function () {
    fr.abort();
  });
}

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

export {
  jIOError,
  ajax,
  dataURItoBlob,
  readBlobAsDataURL,
  readBlobAsText,
  readBlobAsArrayBuffer,
  stringify
};
