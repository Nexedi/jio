var jIO = window.jIO;

// Blob is not supported by xhr2, so convert to ArrayBuffer instead
var originalAjax = jIO.util.ajax;
jIO.util.ajax = function ajax(param) {
  if (param.data instanceof Blob) {
    return jIO.util.readBlobAsArrayBuffer(param.data).then(function (data) {
      param.data = data.target.result;
      return originalAjax(param);
    });
  }

  return originalAjax(param);
};
