/*jslint nomen: true*/
/*global Blob, atob, btoa, RSVP*/
(function (jIO, Blob, atob, btoa, RSVP) {
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
    this._repair_attachment = spec.repair_attachment || false;
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
    return this._sub_storage.getAttachment(
      this._document_id,
      getSubAttachmentIdFromParam(id),
      {format: "json"}
    );
  };

  DocumentStorage.prototype.allAttachments = function (id) {
    return this._sub_storage.allAttachments(this._document_id)
      .push(function (result) {
        var attachments = {},
          exec,
          key;
        for (key in result) {
          if (result.hasOwnProperty(key)) {
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
        return attachments;
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
    var context = this;
    return this.allAttachments(id)
      .push(function (result) {
        var key,
          promise_list = [];
        for (key in result) {
          if (result.hasOwnProperty(key)) {
            promise_list.push(context.removeAttachment(id, key));
          }
        }
        return RSVP.all(promise_list);
      })
      .push(function () {
        return context._sub_storage.removeAttachment(
          context._document_id,
          getSubAttachmentIdFromParam(id)
        );
      })
      .push(function () {
        return id;
      });
  };

  DocumentStorage.prototype.repair = function () {
    var context = this;
    return this._sub_storage.repair.apply(this._sub_storage, arguments)
      .push(function (result) {
        if (context._repair_attachment) {
          return context._sub_storage.allAttachments(context._document_id)
            .push(function (result_dict) {
              var promise_list = [],
                id_dict = {},
                attachment_dict = {},
                id,
                attachment,
                exec,
                key;
              for (key in result_dict) {
                if (result_dict.hasOwnProperty(key)) {
                  id = undefined;
                  attachment = undefined;
                  if (DOCUMENT_REGEXP.test(key)) {
                    try {
                      id = atob(DOCUMENT_REGEXP.exec(key)[1]);
                    } catch (error) {
                      // Check if unable to decode base64 data
                      if (!error instanceof ReferenceError) {
                        throw error;
                      }
                    }
                    if (id !== undefined) {
                      id_dict[id] = null;
                    }
                  } else if (ATTACHMENT_REGEXP.test(key)) {
                    exec = ATTACHMENT_REGEXP.exec(key);
                    try {
                      id = atob(exec[1]);
                      attachment = atob(exec[2]);
                    } catch (error) {
                      // Check if unable to decode base64 data
                      if (!error instanceof ReferenceError) {
                        throw error;
                      }
                    }
                    if (attachment !== undefined) {
                      if (!id_dict.hasOwnProperty(id)) {
                        if (!attachment_dict.hasOwnProperty(id)) {
                          attachment_dict[id] = {};
                        }
                        attachment_dict[id][attachment] = null;
                      }
                    }
                  }
                }
              }
              for (id in attachment_dict) {
                if (attachment_dict.hasOwnProperty(id)) {
                  if (!id_dict.hasOwnProperty(id)) {
                    for (attachment in attachment_dict[id]) {
                      if (attachment_dict[id].hasOwnProperty(attachment)) {
                        promise_list.push(context.removeAttachment(
                          id,
                          attachment
                        ));
                      }
                    }
                  }
                }
              }
              return RSVP.all(promise_list);
            });
        }
        return result;
      });
  };

  DocumentStorage.prototype.hasCapacity = function (capacity) {
    return (capacity === "list");
  };

  DocumentStorage.prototype.buildQuery = function () {
    return this._sub_storage.allAttachments(this._document_id)
      .push(function (attachment_dict) {
        var result = [],
          key;
        for (key in attachment_dict) {
          if (attachment_dict.hasOwnProperty(key)) {
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

}(jIO, Blob, atob, btoa, RSVP));
