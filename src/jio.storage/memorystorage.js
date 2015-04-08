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

  MemoryStorage.prototype.put = function (id, metadata) {
    if (!this._database.hasOwnProperty(id)) {
      this._database[id] = {
        attachments: {}
      };
    }
    this._database[id].doc = JSON.stringify(metadata);
    return id;
  };

  MemoryStorage.prototype.get = function (id) {
    try {
      return JSON.parse(this._database[id].doc);
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError(
          "Cannot find document: " + id,
          404
        );
      }
      throw error;
    }
  };

  MemoryStorage.prototype.allAttachments = function (id) {
    var key,
      attachments = {};
    try {
      for (key in this._database[id].attachments) {
        if (this._database[id].attachments.hasOwnProperty(key)) {
          attachments[key] = {};
        }
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError(
          "Cannot find document: " + id,
          404
        );
      }
      throw error;
    }
    return attachments;
  };

  MemoryStorage.prototype.remove = function (id) {
    delete this._database[id];
    return id;
  };

  MemoryStorage.prototype.getAttachment = function (id, name) {
    try {
      var result = this._database[id].attachments[name];
      if (result === undefined) {
        throw new jIO.util.jIOError(
          "Cannot find attachment: " + id + " , " + name,
          404
        );
      }
      return result;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError(
          "Cannot find attachment: " + id + " , " + name,
          404
        );
      }
      throw error;
    }
  };

  MemoryStorage.prototype.putAttachment = function (id, name, blob) {
    var attachment_dict;
    try {
      attachment_dict = this._database[id].attachments;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError("Cannot find document: " + id, 404);
      }
      throw error;
    }
    attachment_dict[name] = blob;
  };

  MemoryStorage.prototype.removeAttachment = function (id, name) {
    try {
      delete this._database[id].attachments[name];
    } catch (error) {
      if (error instanceof TypeError) {
        throw new jIO.util.jIOError(
          "Cannot find document: " + id,
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
