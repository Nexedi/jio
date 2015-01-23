/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true */
/*global jIO, localStorage, window, Blob, Uint8Array, RSVP */

/**
 * JIO Local Storage. Type = 'local'.
 * Local browser "database" storage.
 *
 * Storage Description:
 *
 *     {
 *       "type": "local"
 *     }
 *
 * @class LocalStorage
 */

(function (jIO) {
  "use strict";

  function LocalStorage() {
    return;
  }

  function restrictDocumentId(id) {
    if (id !== "/") {
      throw new jIO.util.jIOError("id " + id + " is forbidden (!== /)",
                                  400);
    }
  }

  /**
   * Get a document
   *
   * @method get
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  LocalStorage.prototype.get = function (param) {
    restrictDocumentId(param._id);

    var doc = {},
      attachments = {},
      key;

    for (key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        attachments[key] = {};
      }
    }
    if (attachments.length !== 0) {
      doc._attachments = attachments;
    }
    return doc;
  };

  /**
   * Get an attachment
   *
   * @method getAttachment
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  LocalStorage.prototype.getAttachment = function (param) {
    restrictDocumentId(param._id);

    var textstring = localStorage.getItem(param._attachment);

    if (textstring === null) {
      throw new jIO.util.jIOError("Cannot find attachment", 404);
    }
    return new Blob([textstring]);
  };

  LocalStorage.prototype.putAttachment = function (param) {
    restrictDocumentId(param._id);

    // the document already exists
    // download data
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsText(param._blob);
      })
      .push(function (e) {
        localStorage.setItem(param._attachment, e.target.result);
      });
  };

  LocalStorage.prototype.removeAttachment = function (param) {
    restrictDocumentId(param._id);
    return localStorage.removeItem(param._attachment);
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

}(jIO));
