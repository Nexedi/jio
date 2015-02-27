/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true */
/*global jIO, sessionStorage, localStorage, Blob, RSVP */

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

(function (jIO, sessionStorage, localStorage, Blob, RSVP) {
  "use strict";

  function LocalStorage(spec) {
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

  LocalStorage.prototype.get = function (param) {
    restrictDocumentId(param._id);

    var doc = {},
      attachments = {},
      found = false,
      key;

    for (key in this._storage) {
      if (this._storage.hasOwnProperty(key)) {
        attachments[key] = {};
        found = true;
      }
    }
    if (found) {
      doc._attachments = attachments;
    }
    return doc;
  };

  LocalStorage.prototype.getAttachment = function (param) {
    restrictDocumentId(param._id);

    var textstring = this._storage.getItem(param._attachment);

    if (textstring === null) {
      throw new jIO.util.jIOError(
        "Cannot find attachment " + param._attachment,
        404
      );
    }
    return {data: new Blob([textstring])};
  };

  LocalStorage.prototype.putAttachment = function (param) {
    var context = this;
    restrictDocumentId(param._id);

    // the document already exists
    // download data
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsText(param._blob);
      })
      .push(function (e) {
        context._storage.setItem(param._attachment, e.target.result);
      });
  };

  LocalStorage.prototype.removeAttachment = function (param) {
    restrictDocumentId(param._id);
    return this._storage.removeItem(param._attachment);
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

}(jIO, sessionStorage, localStorage, Blob, RSVP));
