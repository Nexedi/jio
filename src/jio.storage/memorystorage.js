/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true, maxlen: 200*/
/*global jIO, window, Blob, Uint8Array, RSVP, console */

/**
 * JIO Memory Storage. Type = 'memory'.
 * Memory browser "database" storage.
 *
 * Storage Description:
 *
 *     {
 *       "type": "memory"
 *     }
 *
 * @class MemoryStorage
 */

(function (jIO) {
  "use strict";

  /**
   * The JIO MemoryStorage extension
   *
   * @class MemoryStorage
   * @constructor
   */
  function MemoryStorage() {
    this._database = {};
  }


  MemoryStorage.prototype.post = function (metadata) {
    var doc_id = metadata._id;
    if (doc_id === undefined) {
      doc_id = jIO.util.generateUuid();
    }
    if (this._database.hasOwnProperty(doc_id)) {
      // the document already exists
      throw new jIO.util.jIOError("Cannot create a new document", 409);
    }
    metadata._id = doc_id;
    return this.put(metadata);
  };

  MemoryStorage.prototype.put = function (metadata) {
    if (!this._database.hasOwnProperty(metadata._id)) {
      this._database[metadata._id] = {
        attachments: {}
      };
    }
    this._database[metadata._id].doc = JSON.stringify(metadata);
    return metadata._id;
  };

  MemoryStorage.prototype.get = function (param) {
    if (!this._database.hasOwnProperty(param._id)) {
      throw new jIO.util.jIOError("Cannot find document", 404);
    }
    var doc = JSON.parse(this._database[param._id].doc),
      key,
      found = false,
      attachments = {};

    for (key in this._database[param._id].attachments) {
      if (this._database[param._id].attachments.hasOwnProperty(key)) {
        found = true;
        attachments[key] = {};
      }
    }
    if (found) {
      doc._attachments = attachments;
    }
    return doc;
  };

  MemoryStorage.prototype.remove = function (param) {
    delete this._database[param._id];
    return param._id;
  };

  MemoryStorage.prototype.getAttachment = function (param) {
    if (!((this._database.hasOwnProperty(param._id)) &&
          (this._database[param._id].attachments.hasOwnProperty(param._attachments)))) {
      throw new jIO.util.jIOError("Cannot find attachment", 404);
    }
    return this._database[param._id].attachments[param._attachment];
  };

  MemoryStorage.prototype.putAttachment = function (param) {
    this._database[param._id].attachments[param._attachment] =
      param._blob;
  };

  MemoryStorage.prototype.removeAttachment = function (param) {
    delete this._database[param._id].attachments[param._attachment];
  };



  MemoryStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };

  MemoryStorage.prototype.buildQuery = function () {
    var rows = [],
      i;
    for (i in this._database) {
      if (this._database.hasOwnProperty(i)) {
        rows.push({
          id: i,
          value: {}
        });

      }
    }
    return rows;
  };

  jIO.addStorage('memory', MemoryStorage);

}(jIO));
