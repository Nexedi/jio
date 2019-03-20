/*
 * Copyright 2018, Nexedi SA
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

/*global window */
(function (window, jIO, Blob, RSVP) {
  "use strict";

  var FormData,
    originalAjax;

  // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/
  // Using_XMLHttpRequest#Submitting_forms_and_uploading_files
  FormData = function FormData() {
    this.boundary = "---------------------------" + Date.now().toString(16);
    this.body = '';
  };
  FormData.prototype.append = function (name, value, filename) {
    this.body += '--' + this.boundary +
                 '\r\nContent-Disposition: form-data; name="' + name;
    if (filename !== undefined) {
      this.body += '"; filename="' + filename;
    }
    this.body += '"\r\n\r\n' + value + '\r\n';
  };
  window.FormData = FormData;

  function convertToBlob(promise, convert) {
    if (!convert) {
      return promise;
    }
    var result;
    if (promise instanceof RSVP.Queue) {
      result = promise;
    } else {
      result = new RSVP.Queue()
        .push(function () {
          return promise;
        });
    }
    return result
      .push(function (evt) {
        evt.target.response = new Blob(
          [evt.target.response || evt.target.responseText],
          {type: evt.target.getResponseHeader('Content-Type')}
        );
        return evt;
      });
  }

  originalAjax = jIO.util.ajax;
  jIO.util.ajax = function ajax(param) {
    var result,
      need_convertion = (param.dataType === 'blob');
    // Copy the param dict document (no need for deep copy) to
    // allow tests to check them
    param = Object.assign({}, param);
    if (need_convertion) {
      param.dataType = 'arraybuffer';
    }
    if (param.data instanceof Blob) {
      // Blob is not supported by xhr2, so convert to ArrayBuffer instead
      result = new RSVP.Queue()
        .push(function () {
          return jIO.util.readBlobAsArrayBuffer(param.data);
        })
        .push(function (evt) {
          param.data = evt.target.result;
          return originalAjax(param);
        });
    } else if (param.data instanceof FormData) {
      // Implement minimal FormData for erp5storage
      if (!param.hasOwnProperty('headers')) {
        param.headers = {};
      } else {
        // Copy the param dict document (no need for deep copy) to
        // allow tests to check them
        param.headers = Object.assign({}, param.headers);
      }
      param.headers["Content-Type"] = "multipart\/form-data; boundary=" +
                                      param.data.boundary;
      param.data.body += '--' + param.data.boundary + '--\r\n';
      param.data = param.data.body;
      result = originalAjax(param);
    } else {
      result = originalAjax(param);
    }

    return convertToBlob(result, need_convertion);
  };

}(window, window.jIO, window.Blob, window.RSVP));

// Define a global variable to allow storages to access jIO
var jIO = window.jIO,
  FormData = window.FormData,
  jiodate = window.jiodate;
