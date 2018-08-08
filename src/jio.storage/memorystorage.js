/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

import RSVP from 'rsvp';
import { jIOError, dataURItoBlob, readBlobAsDataURL } from '../utils';

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
 * @constructor
 */
function MemoryStorage() {
  this._database = {};
}

MemoryStorage.prototype.put = function (id, metadata) {
  var database = this._database;
  return new RSVP.Queue().push(function() {
    if (!database.hasOwnProperty(id)) {
      database[id] = {
        attachments: {}
      };
    }
    console.log(id, metadata);
    database[id].doc = JSON.stringify(metadata);
    return id;
  });
};

MemoryStorage.prototype.get = function (id) {
  var database = this._database;
  try {
    return new RSVP.Queue().push(function() {
      return JSON.parse(database[id].doc);
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new jIOError(
        "Cannot find document: " + id,
        404
      );
    }
    throw error;
  }
};

MemoryStorage.prototype.allAttachments = function (id) {
  var database = this._database,
      key,
      attachments = {};

  try {
    return new RSVP.Queue().push(function() {
      for (key in database[id].attachments) {
        if (database[id].attachments.hasOwnProperty(key)) {
          attachments[key] = {};
        }
      }
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new jIOError(
        "Cannot find document: " + id,
        404
      );
    }
    throw error;
  }
  return attachments;
};

MemoryStorage.prototype.remove = function (id) {
  var database = this._database;

  return new RSVP.Queue().push(function() {
    delete database[id];
    return id;
  });
};

MemoryStorage.prototype.getAttachment = function (id, name) {
  try {
    var result = this._database[id].attachments[name];
    if (result === undefined) {
      throw new jIOError(
        "Cannot find attachment: " + id + " , " + name,
        404
      );
    }

    return new RSVP.Queue().push(function() {
      return dataURItoBlob(result);
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new jIOError(
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
      throw new jIOError("Cannot find document: " + id, 404);
    }
    throw error;
  }

  return new RSVP.Queue()
    .push(function () {
      return readBlobAsDataURL(blob);
    })
    .push(function (evt) {
      attachment_dict[name] = evt.target.result;
    });
};

MemoryStorage.prototype.removeAttachment = function (id, name) {
  var database = this._database;

  try {
    return new RSVP.Queue().push(function() {
      delete database[id].attachments[name];
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new jIOError(
        "Cannot find document: " + id,
        404
      );
    }
    throw error;
  }
};

MemoryStorage.prototype.hasCapacity = function (name) {
  return ((name === "list") || (name === "include"));
};

MemoryStorage.prototype.buildQuery = function (options) {
  var database = this._database;

  return new RSVP.Queue().push(function() {
    var rows = [];

    for (var i in database) {
      if (database.hasOwnProperty(i)) {
        if (options.include_docs === true) {
          rows.push({
            id: i,
            value: {},
            doc: JSON.parse(database[i].doc)
          });
        }
        else {
          rows.push({
            id: i,
            value: {}
          });
        }
      }
    }

    return rows;
  });
};

export {
  MemoryStorage
};
