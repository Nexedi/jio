/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global jIO, sessionStorage, localStorage, RSVP */

/**
 * JIO Local Storage. Type = 'local'.
 * Local browser "database" storage.
 *
 * Storage Description:
 *
 *     {
 *       "type": "local",
 *       "sessiononly": false
 *     }
 *
 * @class LocalStorage
 */

(function (jIO, sessionStorage, localStorage, RSVP) {
  "use strict";

  function LocalStorage(spec, utils) {
    this._utils = utils;
    if (spec.sessiononly === true) {
      this._storage = sessionStorage;
    } else {
      this._storage = localStorage;
    }
  }

  function restrictDocumentId(id) {
    if (id !== "/") {
      throw new jIO.util.jIOError("id " + id + " is forbidden (!== /)",
                                  400);
    }
  }

  LocalStorage.prototype.get = function (id) {
    restrictDocumentId(id);
    return {};
  };

  LocalStorage.prototype.allAttachments = function (id) {
    restrictDocumentId(id);

    var attachments = {},
      key;

    for (key in this._storage) {
      if (this._storage.hasOwnProperty(key)) {
        attachments[key] = {};
      }
    }
    return attachments;
  };

  LocalStorage.prototype.getAttachment = function (id, name) {
    restrictDocumentId(id);

    var textstring = this._storage.getItem(name);

    if (textstring === null) {
      throw new jIO.util.jIOError(
        "Cannot find attachment " + name,
        404
      );
    }
    return jIO.util.dataURItoBlob(textstring);
  };

  LocalStorage.prototype.putAttachment = function (id, name, blob) {
    var context = this;
    restrictDocumentId(id);

    // the document already exists
    // download data
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsDataURL(blob);
      })
      .push(function (e) {
        context._storage.setItem(name, e.target.result);
      });
  };

  LocalStorage.prototype.removeAttachment = function (id, name) {
    restrictDocumentId(id);
    return this._storage.removeItem(name);
  };


  LocalStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };

  LocalStorage.prototype.buildQuery = function () {
    return [{
      id: "/",
      value: {}
    }];
  };

  jIO.addStorage('local', LocalStorage);

}(jIO, sessionStorage, localStorage, RSVP));
