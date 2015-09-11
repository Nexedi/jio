/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Dropbox Storage. Type = "dropbox".
 * Dropbox "database" storage.
 */
/*global Blob, jIO, RSVP, UriTemplate*/
/*jslint nomen: true*/

(function (jIO, RSVP, Blob, UriTemplate) {
  "use strict";
  var UPLOAD_URL = "https://content.dropboxapi.com/1/files_put/" +
      "{+root}{+id}{+name}{?access_token}",
    upload_template = UriTemplate.parse(UPLOAD_URL),
    CREATE_DIR_URL = "https://api.dropboxapi.com/1/fileops/create_folder" +
      "{?access_token,root,path}",
    create_dir_template = UriTemplate.parse(CREATE_DIR_URL),
    REMOVE_URL = "https://api.dropboxapi.com/1/fileops/delete/" +
      "{?access_token,root,path}",
    remote_template = UriTemplate.parse(REMOVE_URL),
    GET_URL = "https://content.dropboxapi.com/1/files" +
      "{/root,id}{+name}{?access_token}",
    get_template = UriTemplate.parse(GET_URL);
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
          type: "POST",
          url: create_dir_template.expand({
            access_token: that._access_token,
            root: that._root,
            path: id
          })
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
    id = restrictDocumentId(id);
    return jIO.util.ajax({
      type: "POST",
      url: remote_template.expand({
        access_token: this._access_token,
        root: this._root,
        path: id
      })
    });
  };

  DropboxStorage.prototype.get = function (id) {
    var that = this;

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
      .push(function (evt) {
        var obj = JSON.parse(evt.target.response ||
                             evt.target.responseText);
        if (obj.is_dir) {
          return {};
        }
        throw new jIO.util.jIOError("Not a directory: " + id, 404);
      }, function (error) {
        if (error.target !== undefined && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find document: " + id, 404);
        }
        throw error;
      });
  };

  DropboxStorage.prototype.allAttachments = function (id) {

    var that = this;
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
      .push(function (evt) {
        var obj = JSON.parse(evt.target.response || evt.target.responseText),
          i,
          result = {};
        if (!obj.is_dir) {
          throw new jIO.util.jIOError("Not a directory: " + id, 404);
        }
        for (i = 0; i < obj.contents.length; i += 1) {
          if (!obj.contents[i].is_dir) {
            result[obj.contents[i].path.split("/").pop()] = {};
          }
        }
        return result;
      }, function (error) {
        if (error.target !== undefined && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find document: " + id, 404);
        }
        throw error;
      });
  };

  //currently, putAttachment will fail with files larger than 150MB,
  //due to the Dropbox API. the API provides the "chunked_upload" method
  //to pass this limit, but upload process becomes more complex to implement.
  //
  //putAttachment will also create a folder if you try to put an attachment
  //to an inexisting foler.

  DropboxStorage.prototype.putAttachment = function (id, name, blob) {
    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return jIO.util.ajax({
      type: "PUT",
      url: upload_template.expand({
        root: this._root,
        id: id,
        name: name,
        access_token: this._access_token
      }),
      dataType: blob.type,
      data: blob
    });
  };

  DropboxStorage.prototype.getAttachment = function (id, name) {
    var that = this;

    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "GET",
          url: get_template.expand({
            root: that._root,
            id: id,
            name: name,
            access_token: that._access_token
          })
        });
      })
      .push(function (evt) {
        return new Blob(
          [evt.target.response || evt.target.responseText],
          {"type": evt.target.getResponseHeader('Content-Type') ||
            "application/octet-stream"}
        );
      }, function (error) {
        if (error.target !== undefined && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find attachment: " +
                                      id + ", " + name, 404);
        }
        throw error;
      });
  };

  //removeAttachment removes also directories.(due to Dropbox API)

  DropboxStorage.prototype.removeAttachment = function (id, name) {
    var that = this;
    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "POST",
          url: remote_template.expand({
            access_token: that._access_token,
            root: that._root,
            path: id + name
          })
        });
      }).push(undefined, function (error) {
        if (error.target !== undefined && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find attachment: " +
                                      id + ", " + name, 404);
        }
      });
  };

  jIO.addStorage('dropbox', DropboxStorage);

}(jIO, RSVP, Blob, UriTemplate));
