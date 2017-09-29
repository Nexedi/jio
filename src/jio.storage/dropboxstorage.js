/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Dropbox Storage. Type = "dropbox".
 * Dropbox "database" storage.
 */
/*global Blob, jIO, RSVP*/
/*jslint nomen: true*/

(function (jIO, RSVP, Blob, JSON) {
  "use strict";
  var GET_URL = "https://content.dropboxapi.com/2/files/download",
    UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload",
    REMOVE_URL = "https://api.dropboxapi.com/2/files/delete_v2",
    CREATE_DIR_URL = "https://api.dropboxapi.com/2/files/create_folder_v2",
    METADATA_URL = "https://api.dropboxapi.com/2/files/get_metadata",
    LIST_FOLDER_URL = "https://api.dropboxapi.com/2/files/list_folder",
    LIST_MORE_URL = "https://api.dropboxapi.com/2/files/list_folder/continue";

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

  // list_folder root must be "" in api-v2
  function restrictRoot(id) {
    if (id === "/") {
      return "";
    }
    return id;
  }

  function listPage(result, token, id, cursor) {
    var data = {
      "path": id,
      "recursive": false,
      "include_media_info": false,
      "include_deleted": false,
      "include_has_explicit_shared_members": false,
      "include_mounted_folders": true
    };
    if (cursor) {
      data = {"cursor": cursor};
    }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "POST",
          url: cursor ? LIST_MORE_URL : LIST_FOLDER_URL,
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          },
          data: JSON.stringify(data)
        });
      })
      .push(function (evt) {
        var obj = JSON.parse(evt.target.response || evt.target.responseText),
          i;
        if (obj.has_more) {
          result.has_more = obj.has_more;
        }
        if (obj.entries.length === 1 && obj.entries[0][".tag"] !== "folder") {
          throw new jIO.util.jIOError("Not a directory: " + id, 404);
        }
        for (i = 0; i < obj.entries.length; i += 1) {
          if (obj.entries[i][".tag"] === "file") {
            result[obj.entries[i].path_display.split("/").pop()] = {};
          }
        }
        return result;
      }, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
          throw new jIO.util.jIOError("Cannot find document: " + id, 404);
        }
        throw error;
      });
  }

  function recursiveAllAttachments(result, accessToken, id) {
    var cursor = result.cursor;
    return new RSVP.Queue()
      .push(function () {
        return listPage(result, accessToken, id);
      })
      .push(function () {
        if (result.has_more) {
          return recursiveAllAttachments(result, accessToken, id, cursor);
        }
        return result;
      });
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
    this._access_token = spec.access_token;
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
          url: CREATE_DIR_URL,
          headers: {
            "Authorization": "Bearer " + that._access_token,
            "Content-Type": "application/json"
          },
          data: JSON.stringify({"path": id, "autorename": false})
        });
      })
      .push(undefined, function (err) {
        if ((err.target !== undefined) &&
            (err.target.status === 405)) {
          // Directory already exists, no need to fail
          return;
        }
        throw err;
      });
  };

  DropboxStorage.prototype.remove = function (id) {
    id = restrictDocumentId(id);
    return jIO.util.ajax({
      type: "POST",
      url: REMOVE_URL,
      headers: {
        "Authorization": "Bearer " + that._access_token,
        "Content-Type": "application/json"
      },
      data: JSON.stringify({"path": id})
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
          type: "POST",
          url: METADATA_URL,
          headers: {
            "Authorization": "Bearer " + that._access_token,
            "Content-Type": "application/json"
          },
          data: JSON.stringify({"path": id})
        });
      })
      .push(function (evt) {
        var obj = JSON.parse(evt.target.response ||
                             evt.target.responseText);
        if (obj[".tag"] === "folder") {
          return {};
        }
        throw new jIO.util.jIOError("Not a directory: " + id, 404);
      }, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
          throw new jIO.util.jIOError("Cannot find document: " + id, 404);
        }
        throw error;
      });
  };

  DropboxStorage.prototype.allAttachments = function (id) {
    return recursiveAllAttachments({}, this._access_token, restrictRoot(id));
  };

  //currently, putAttachment will fail with files larger than 150MB,
  //due to the Dropbox API. the API provides the "chunked_upload" method
  //to pass this limit, but upload process becomes more complex to implement.
  //
  //putAttachment will also create a folder if you try to put an attachment
  //to an inexisting foler.

  DropboxStorage.prototype.putAttachment = function (id, name, blob) {
    var that = this;
    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return jIO.util.ajax({
      type: "POST",
      url: UPLOAD_URL,
      headers: {
        "Authorization": "Bearer " + that._access_token,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          "path": id + name,
          "mode": "overwrite",
          "autorename": true,
          "mute": false})
      },
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
          url: GET_URL,
          type: "POST",
          dataType: "blob",
          headers: {
            "Authorization": "Bearer " + that._access_token,
            "Dropbox-API-Arg": JSON.stringify({"path": id + name})
          }
        });
      })
      .push(function (evt) {
        return new Blob(
          [evt.target.response || evt.target.responseText],
          {"type": evt.target.getResponseHeader('Content-Type') ||
            "application/octet-stream"}
        );
      }, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
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
          url: REMOVE_URL,
          headers: {
            "Authorization": "Bearer " + that._access_token,
            "Content-Type": "application/json"
          },
          data: JSON.stringify({"path": id + name})
        });
      }).push(undefined, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
          throw new jIO.util.jIOError("Cannot find attachment: " +
                                      id + ", " + name, 404);
        }
        throw error;
      });
  };

  jIO.addStorage('dropbox', DropboxStorage);

}(jIO, RSVP, Blob, JSON));
