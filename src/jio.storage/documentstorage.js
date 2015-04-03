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

  function getSubAttachmentIdFromParam(id, name) {
    if (name === undefined) {
      return 'jio_document/' + btoa(id) + DOCUMENT_EXTENSION;
    }
    return 'jio_attachment/' + btoa(id) + "/" + btoa(name);
  }

  DocumentStorage.prototype.get = function (id) {

    var result,
      context = this;
    return this._sub_storage.getAttachment(
      this._document_id,
      getSubAttachmentIdFromParam(id)
    )
      .push(function (blob) {
        return jIO.util.readBlobAsText(blob);
      })
      .push(function (text) {
        return JSON.parse(text.target.result);
      })
      .push(function (json) {
        result = json;
        return context._sub_storage.get(context._document_id);
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
                if (atob(exec[1]) === id) {
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

  DocumentStorage.prototype.put = function (doc_id, param) {
    return this._sub_storage.putAttachment(
      this._document_id,
      getSubAttachmentIdFromParam(doc_id),
      new Blob([JSON.stringify(param)], {type: "application/json"})
    )
      .push(function () {
        return doc_id;
      });

  };

  DocumentStorage.prototype.remove = function (id) {
    return this._sub_storage.removeAttachment(
      this._document_id,
      getSubAttachmentIdFromParam(id)
    )
      .push(function () {
        return id;
      });
  };

  DocumentStorage.prototype.hasCapacity = function (capacity) {
    return (capacity === "list");
  };

  DocumentStorage.prototype.buildQuery = function () {
    return this._sub_storage.get(this._document_id)
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

  DocumentStorage.prototype.getAttachment = function (id, name) {
    return this._sub_storage.getAttachment(
      this._document_id,
      getSubAttachmentIdFromParam(id, name)
    );
  };

  DocumentStorage.prototype.putAttachment = function (id, name, blob) {
    return this._sub_storage.putAttachment(
      this._document_id,
      getSubAttachmentIdFromParam(id, name),
      blob
    );
  };

  DocumentStorage.prototype.removeAttachment = function (id, name) {
    return this._sub_storage.removeAttachment(
      this._document_id,
      getSubAttachmentIdFromParam(id, name)
    );
  };

  jIO.addStorage('document', DocumentStorage);

}(jIO, Blob, atob, btoa));
