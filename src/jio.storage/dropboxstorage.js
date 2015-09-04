/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Dropbox Storage. Type = "dropbox".
 * Dropbox "database" storage.
 */
/*global FormData, btoa, Blob, DOMParser, define, jIO, RSVP, ProgressEvent */
/*js2lint nomen: true, unparam: true, bitwise: true */
/*jslint nomen: true, unparam: true*/

(function (jIO, RSVP, DOMParser, Blob) {
  "use strict";
  var UPLOAD_URL = "https://content.dropboxapi.com/1/files_put/",
    CREATE_DIR_URL = "https://api.dropboxapi.com/1/fileops/create_folder",
    REMOVE_URL = "https://api.dropboxapi.com/1/fileops/delete/",
    GET_URL = "https://content.dropboxapi.com/1/files";
    //LIST_URL = 'https://api.dropboxapi.com/1/metadata/sandbox/';

  function restrictDocumentId(id) {
    if (id.indexOf("/") !== 0) {
      throw new jIO.util.jIOError("id " + id + " is forbidden (no begin /)",
                                  400);
    }
    if (id.lastIndexOf("/") !== (id.length - 1)) {
      throw new jIO.util.jIOError("id " + id + " is forbidden (no end /)",
                                  400);
    }
    return id;
  }

  function restrictAttachmentId(id) {
    if (id.indexOf("/") !== -1) {
      throw new jIO.util.jIOError("attachment " + id + " is forbidden",
                                  400);
    }
  }

  /**
   * The JIO Dropbox Storage extension
   *
   * @class DropboxStorage
   * @constructor
   */
  function DropboxStorage(spec) {
    if (typeof spec.access_token !== 'string' || !spec.access_token) {
      throw new TypeError("Access Token' must be a string " +
                          "which contains more than one character.");
    }
    if (typeof spec.root !== 'string' || !spec.root ||
        (spec.root !== "dropbox" && spec.root !== "sandbox")) {
      throw new TypeError("root must be 'dropbox' or 'sandbox'");
    }
    this._access_token = spec.access_token;
    this._root = spec.root;
  }

  DropboxStorage.prototype.put = function (id, param) {
    var that = this;
    id = restrictDocumentId(id);
    if (Object.getOwnPropertyNames(param).length > 0) {
      // Reject if param has some properties
      throw new jIO.util.jIOError("Can not store properties: " +
                                  Object.getOwnPropertyNames(param), 400);
    }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "POST",
          "url": CREATE_DIR_URL +
            '?access_token=' + that._access_token +
            '&root=' + that._root + '&path=' + id
        });
      })
      .push(undefined, function (err) {
        if ((err.target !== undefined) &&
            (err.target.status === 405)) {
          return;
        }
        throw err;
      });
  };

  DropboxStorage.prototype.remove = function (id) {
    var that = this;
    id = restrictDocumentId(id);
    return new RSVP.Queue()
      .push(function () {
        return that.get(id);
      })
      .push(function () {
        return jIO.util.ajax({
          "type": "POST",
          "url": REMOVE_URL +
            '?access_token=' + that._access_token +
            '&root=' + that._root + '&path=' + id
        });
      });
  };

  DropboxStorage.prototype.get = function (id) {
    var that = this,
      obj;
    if (id === "/") {
      return {};
    }
    id = restrictDocumentId(id);

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "GET",
          "url": "https://api.dropboxapi.com/1/metadata/" +
            that._root + "/" + id +
            '?access_token=' + that._access_token
        });
      })
      .push(function (xml) {
        obj = JSON.parse(xml.target.response || xml.target.responseText);
        if (obj.is_dir === true) {
          return {};
        }
        throw new jIO.util.jIOError("cannot load" + id +
                                    ". Invalid HTTP", 404);
      }, function (error) {
        if (error !== undefined && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });
  };

  DropboxStorage.prototype.allAttachments = function (id) {

    var that = this,
      i,
      title,
      ret,
      obj;

    id = restrictDocumentId(id);

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "GET",
          "url": "https://api.dropboxapi.com/1/metadata/" +
            that._root + "/" + id +
            '?access_token=' + that._access_token
        });
      })
      .push(function (xml) {
        obj = JSON.parse(xml.target.response || xml.target.responseText);
        if (obj.is_dir === false) {
          throw new jIO.util.jIOError("cannot load" + id +
                                      ". Invalid HTTP", 404);
        }
        ret = {};
        for (i = 0; i < obj.contents.length; i += 1) {
          if (obj.contents[i].is_dir !== true) {
            title = obj.contents[i].path.split("/").pop();
            ret[title] = {};
          }
        }
        return ret;
      }, function (error) {
        if (error !== undefined && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });
  };

  //currently, putattachment will fail with files larger than 150MB,
  //due to the Dropbox API. the API provides the "chunked_upload" method
  //to pass this limit, but upload process becomes more complex to implement.

  DropboxStorage.prototype.putAttachment = function (id, name, blob) {
    var that = this;

    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return new RSVP.Queue()
      .push(function () {
        return that.get(id);
      })
      .push(undefined, function (error) {
        throw new jIO.util.jIOError("Cannot access subdocument", 404);
      })
      .push(function () {
        return that.get(id + name + '/');
      })
      .push(function () {
        throw new jIO.util.jIOError("Cannot overwrite directory", 404);
      }, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            ((error.message === "cannot load" + id + name + '/. Invalid HTTP')
             || (error.message === "Cannot find document"))) {
          return jIO.util.ajax({
            "type": "PUT",
            "url": UPLOAD_URL + that._root + id + name +
              '?access_token=' + that._access_token,
            dataType: blob.type,
            data: blob
          });
        }
        throw error;
      });
  };

  DropboxStorage.prototype.getAttachment = function (id, name) {
    var that = this;

    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "GET",
          "url": GET_URL + "/" + that._root + "/" + id + name +
            '?access_token=' + that._access_token
        });
      })
      .push(function (response) {
        return new Blob(
          [response.target.response || response.target.responseText],
          {"type": response.target.getResponseHeader('Content-Type') ||
            "application/octet-stream"}
        );
      }, function (error) {
        if (error !== undefined && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find attachment: " +
                                      id + ", " + name, 404);
        }
        throw error;
      });
  };

  DropboxStorage.prototype.removeAttachment = function (id, name) {
    var that = this;

    id = restrictDocumentId(id);
    restrictAttachmentId(name);
    return new RSVP.Queue()
      .push(function () {
        return that.get(id + name + '/');
      })
      .push(function () {
        throw new jIO.util.jIOError("Cannot remove directory", 404);
      }, function (error) {
        if (error instanceof jIO.util.jIOError &&
            error.message === "Cannot find document") {
          throw new jIO.util.jIOError("Cannot find attachment: " +
                                      id + ", " + name, 404);
        }
        if (error instanceof jIO.util.jIOError &&
            error.message === "cannot load" + id + name + '/. Invalid HTTP') {
          return jIO.util.ajax({
            "type": "POST",
            "url": REMOVE_URL +
              '?access_token=' + that._access_token +
              '&root=' + that._root + '&path=' + id + name
          });
        }
        throw error;
      });
  };

  jIO.addStorage('dropbox', DropboxStorage);

}(jIO, RSVP, DOMParser, Blob));