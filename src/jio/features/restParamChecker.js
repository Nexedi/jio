/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true, unparam: true */
/*global Blob, IODeferred, Metadata */

function enableRestParamChecker(jio, shared) {

  // dependencies
  // - param.deferred
  // - param.kwargs

  // checks the kwargs and convert value if necessary

  // which is a dict of method to use to announce that
  // the command is finished


  // tools

  function checkId(param) {
    if (typeof param.kwargs._id !== 'string' || param.kwargs._id === '') {
      IODeferred.createFromParam(param).reject(
        'bad_request',
        'wrong document id',
        'Document id must be a non empty string.'
      );
      delete param.deferred;
      return false;
    }
    return true;
  }

  function checkAttachmentId(param) {
    if (typeof param.kwargs._attachment !== 'string' ||
        param.kwargs._attachment === '') {
      IODeferred.createFromParam(param).reject(
        'bad_request',
        'wrong attachment id',
        'Attachment id must be a non empty string.'
      );
      delete param.deferred;
      return false;
    }
    return true;
  }

  // listeners

  shared.on('post', function (param) {
    if (param.kwargs._id !== undefined) {
      if (!checkId(param)) {
        return;
      }
    }
    new Metadata(param.kwargs).format();
  });

  [
    "put",
    "get",
    "remove",
    "check",
    "repair"
  ].forEach(function (method) {
    shared.on(method, function (param) {
      if (!checkId(param)) {
        return;
      }
      new Metadata(param.kwargs).format();
    });
  });

  shared.on('putAttachment', function (param) {
    if (!checkId(param) || !checkAttachmentId(param)) {
      return;
    }
    if (!(param.kwargs._blob instanceof Blob) &&
        typeof param.kwargs._data === 'string') {
      param.kwargs._blob = new Blob([param.kwargs._data], {
        "type": param.kwargs._content_type || param.kwargs._mimetype || ""
      });
      delete param.kwargs._data;
      delete param.kwargs._mimetype;
      delete param.kwargs._content_type;
    } else if (param.kwargs._blob instanceof Blob) {
      delete param.kwargs._data;
      delete param.kwargs._mimetype;
      delete param.kwargs._content_type;
    } else if (param.kwargs._data instanceof Blob) {
      param.kwargs._blob = param.kwargs._data;
      delete param.kwargs._data;
      delete param.kwargs._mimetype;
      delete param.kwargs._content_type;
    } else {
      IODeferred.createFromParam(param).reject(
        'bad_request',
        'wrong attachment',
        'Attachment information must be like {"_id": document id, ' +
          '"_attachment": attachment name, "_data": string, ["_mimetype": ' +
          'content type]} or {"_id": document id, "_attachment": ' +
          'attachment name, "_blob": Blob}'
      );
      delete param.deferred;
    }
  });

  [
    "getAttachment",
    "removeAttachment"
  ].forEach(function (method) {
    shared.on(method, function (param) {
      if (!checkId(param)) {
        checkAttachmentId(param);
      }
    });
  });
}
