/*global window, ArrayBuffer, Blob */
"use strict";

var jIO = window.jIO;

function convertToBlob(evt, convert) {
  if (convert && evt.target.response instanceof ArrayBuffer) {
    evt.target.response = new Blob([evt.target.response]);
  }
  return evt;
}

var originalAjax = jIO.util.ajax;
jIO.util.ajax = function ajax(param) {
  var convertToArrayBuffer = param.dataType === 'blob';
  if (convertToArrayBuffer) {
    param.dataType = 'arraybuffer';
  }

  // Blob is not supported by xhr2, so convert to ArrayBuffer instead
  if (param.data instanceof Blob) {
    return jIO.util.readBlobAsArrayBuffer(param.data).then(function (data) {
      param.data = data.target.result;
      return originalAjax(param).then(function (evt) {
        return convertToBlob(evt, convertToArrayBuffer);
      });
    });
  }

  return originalAjax(param).then(function (evt) {
    return convertToBlob(evt, convertToArrayBuffer);
  });
};
