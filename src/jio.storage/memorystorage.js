/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global jIO*/

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
    var doc,
      key,
      found = false,
      attachments = {};

    try {
      doc = JSON.parse(this._database[param._id].doc);
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError(
          "Cannot find document: " + param._id,
          404
        );
      }
      throw error;
    }

    // XXX NotImplemented: list all attachments
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
    try {
      return {data: this._database[param._id].attachments[param._attachment]};
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError(
          "Cannot find attachment: " + param._id + " , " + param._attachment,
          404
        );
      }
      throw error;
    }
  };

  MemoryStorage.prototype.putAttachment = function (param) {
    var attachment_dict;
    try {
      attachment_dict = this._database[param._id].attachments;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError("Cannot find document: " + param._id, 404);
      }
      throw error;
    }
    attachment_dict[param._attachment] = param._blob;
  };

  MemoryStorage.prototype.removeAttachment = function (param) {
    try {
      delete this._database[param._id].attachments[param._attachment];
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError(
          "Cannot find document: " + param._id,
          404
        );
      }
      throw error;
    }
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
