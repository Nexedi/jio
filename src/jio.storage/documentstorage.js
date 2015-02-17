/*jslint nomen: true*/
/*global Blob, atob, btoa*/
(function (jIO, Blob, atob, btoa) {
  "use strict";

  /**
   * The jIO DocumentStorage extension
   *
   * @class DocumentStorage
   * @constructor
   */
  function DocumentStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._document_id = spec.document_id;
  }

  var DOCUMENT_EXTENSION = ".json",
    DOCUMENT_REGEXP = new RegExp("^jio_document/([\\w=]+)" +
                                 DOCUMENT_EXTENSION + "$"),
    ATTACHMENT_REGEXP = new RegExp("^jio_attachment/([\\w=]+)/([\\w=]+)$");

  function getSubAttachmentIdFromParam(param) {
    if (param._attachment === undefined) {
      return 'jio_document/' + btoa(param._id) + DOCUMENT_EXTENSION;
    }
    return 'jio_attachment/' + btoa(param._id) + "/" + btoa(param._attachment);
  }

  DocumentStorage.prototype.get = function (param) {

    var result,
      context = this;
    return this._sub_storage.getAttachment({
      "_id": this._document_id,
      "_attachment": getSubAttachmentIdFromParam(param)
    })
      .push(function (blob) {
        return jIO.util.readBlobAsText(blob.data);
      })
      .push(function (text) {
        return JSON.parse(text.target.result);
      })
      .push(function (json) {
        result = json;
        return context._sub_storage.get({
          "_id": context._document_id
        });
      })
      .push(function (document) {
        var attachments = {},
          exec,
          key;
        for (key in document._attachments) {
          if (document._attachments.hasOwnProperty(key)) {
            if (ATTACHMENT_REGEXP.test(key)) {
              exec = ATTACHMENT_REGEXP.exec(key);
              try {
                if (atob(exec[1]) === param._id) {
                  attachments[atob(exec[2])] = {};
                }
              } catch (error) {
                // Check if unable to decode base64 data
                if (!error instanceof ReferenceError) {
                  throw error;
                }
              }
            }
          }
        }
        if (Object.getOwnPropertyNames(attachments).length > 0) {
          result._attachments = attachments;
        }
        return result;
      });
  };

  DocumentStorage.prototype.put = function (param) {
    var doc_id = param._id;

    return this._sub_storage.putAttachment({
      "_id": this._document_id,
      "_attachment": getSubAttachmentIdFromParam(param),
      "_blob": new Blob([JSON.stringify(param)], {type: "application/json"})
    })
      .push(function () {
        return doc_id;
      });

  };

  DocumentStorage.prototype.remove = function (param) {
    return this._sub_storage.removeAttachment({
      "_id": this._document_id,
      "_attachment": getSubAttachmentIdFromParam(param)
    })
      .push(function () {
        return param._id;
      });
  };

  DocumentStorage.prototype.hasCapacity = function (capacity) {
    return (capacity === "list");
  };

  DocumentStorage.prototype.buildQuery = function () {
    return this._sub_storage.get({
      "_id": this._document_id
    })
      .push(function (document) {
        var result = [],
          key;
        for (key in document._attachments) {
          if (document._attachments.hasOwnProperty(key)) {
            if (DOCUMENT_REGEXP.test(key)) {
              try {
                result.push({
                  id: atob(DOCUMENT_REGEXP.exec(key)[1]),
                  value: {}
                });
              } catch (error) {
                // Check if unable to decode base64 data
                if (!error instanceof ReferenceError) {
                  throw error;
                }
              }
            }
          }
        }
        return result;
      });
  };

  DocumentStorage.prototype.getAttachment = function (param) {
    return this._sub_storage.getAttachment({
      "_id": this._document_id,
      "_attachment": getSubAttachmentIdFromParam(param)
    });
  };

  DocumentStorage.prototype.putAttachment = function (param) {
    return this._sub_storage.putAttachment({
      "_id": this._document_id,
      "_attachment": getSubAttachmentIdFromParam(param),
      "_blob": param._blob
    });
  };

  DocumentStorage.prototype.removeAttachment = function (param) {
    return this._sub_storage.removeAttachment({
      "_id": this._document_id,
      "_attachment": getSubAttachmentIdFromParam(param)
    });
  };

  jIO.addStorage('document', DocumentStorage);

}(jIO, Blob, atob, btoa));
