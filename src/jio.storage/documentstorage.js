/*
 * Copyright 2015, Nexedi SA
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

/*eslint no-unsafe-negation: "off"*/
/*global unescape, escape*/

import RSVP from 'rsvp';
import { jIO } from '../jio';
import { Blob, btoa, atob } from '../utils-compat';

(function (jIO, Blob, RSVP, unescape, escape, atob, btoa) {
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
    ATTACHMENT_REGEXP = new RegExp("^jio_attachment/([\\w=]+)/([\\w=]+)$"),
    btoaU = function (str) {
      return btoa(unescape(encodeURIComponent(str)));
    },
    atobU = function (str) {
      return decodeURIComponent(escape(atob(str)));
    };

  function getSubAttachmentIdFromParam(id, name) {
    if (name === undefined) {
      return 'jio_document/' + btoaU(id) + DOCUMENT_EXTENSION;
    }
    return 'jio_attachment/' + btoaU(id) + "/" + btoaU(name);
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
                if (atobU(exec[1]) === id) {
                  attachments[atobU(exec[2])] = {};
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
                      id = atobU(DOCUMENT_REGEXP.exec(key)[1]);
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
                      id = atobU(exec[1]);
                      attachment = atobU(exec[2]);
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
                  id: atobU(DOCUMENT_REGEXP.exec(key)[1]),
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

}(jIO, Blob, RSVP, unescape, escape, atob, btoa));
