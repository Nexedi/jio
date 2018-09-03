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
(function (window, jIO, Blob) {
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

  originalAjax = jIO.util.ajax;
  jIO.util.ajax = function ajax(param) {
    if (param.data instanceof Blob) {
      // Blob is not supported by xhr2, so convert to ArrayBuffer instead
      return jIO.util.readBlobAsArrayBuffer(param.data).then(function (data) {
        param.data = data.target.result;
        return originalAjax(param);
      });
    }

    if (param.data instanceof FormData) {
      // Implement minimal FormData for erp5storage
      if (!param.hasOwnProperty('headers')) {
        param.headers = {};
      }
      param.headers["Content-Type"] = "multipart\/form-data; boundary=" +
                                      param.data.boundary;
      param.data.body += '--' + param.data.boundary + '--\r\n';
      param.data = param.data.body;
      return originalAjax(param);
    }

    return originalAjax(param);
  };

}(window, window.jIO, window.Blob));

// Define a global variable to allow storages to access jIO
var jIO = window.jIO,
  FormData = window.FormData,
  jiodate = window.jiodate;
