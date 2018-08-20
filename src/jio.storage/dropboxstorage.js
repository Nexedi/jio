/*
 * Copyright 2013, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
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
    return id.slice(0, -1);
  }

  function restrictAttachmentId(id) {
    if (id.indexOf("/") !== -1) {
      throw new jIO.util.jIOError("attachment " + id + " is forbidden",
                                  400);
    }
  }

  function recursiveAllAttachments(result, token, id, cursor) {
    var data,
      url;
    if (cursor === undefined) {
      data = {
        "path": id,
        "recursive": false,
        "include_media_info": false,
        "include_deleted": false,
        "include_has_explicit_shared_members": false,
        "include_mounted_folders": true
      };
      url = LIST_FOLDER_URL;
    } else {
      data = {"cursor": cursor};
      url = LIST_MORE_URL;
    }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "POST",
          url: url,
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
        for (i = 0; i < obj.entries.length; i += 1) {
          if (obj.entries[i][".tag"] === "file") {
            result[obj.entries[i].name] = {};
          }
        }
        if (obj.has_more) {
          return recursiveAllAttachments(result, token, id, obj.cursor);
        }
        return result;
      }, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
          var err_content = JSON.parse(error.target.response ||
                                       error.target.responseText);
          if ((err_content.error['.tag'] === 'path') &&
              (err_content.error.path['.tag'] === 'not_folder')) {
            throw new jIO.util.jIOError("Not a directory: " + id + "/",
                                        404);
          }
          if ((err_content.error['.tag'] === 'path') &&
              (err_content.error.path['.tag'] === 'not_found')) {
            throw new jIO.util.jIOError("Cannot find document: " + id + "/",
                                        404);
          }
        }
        throw error;
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
            (err.target.status === 409)) {
          var err_content = JSON.parse(err.target.response ||
                                       err.target.responseText);
          if ((err_content.error['.tag'] === 'path') &&
              (err_content.error.path['.tag'] === 'conflict')) {
            // Directory already exists, no need to fail
            return;
          }
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
        "Authorization": "Bearer " + this._access_token,
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
        throw new jIO.util.jIOError("Not a directory: " + id + "/", 404);
      }, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
          var err_content = JSON.parse(error.target.response ||
                                       error.target.responseText);
          if ((err_content.error['.tag'] === 'path') &&
              (err_content.error.path['.tag'] === 'not_found')) {
            throw new jIO.util.jIOError("Cannot find document: " + id + "/",
                                        404);
          }
        }
        throw error;
      });
  };

  DropboxStorage.prototype.allAttachments = function (id) {
    id = restrictDocumentId(id);
    return recursiveAllAttachments({}, this._access_token, id);
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
      type: "POST",
      url: UPLOAD_URL,
      headers: {
        "Authorization": "Bearer " + this._access_token,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          "path": id + "/" + name,
          "mode": "overwrite",
          "autorename": false,
          "mute": false
        })
      },
      data: blob
    });
  };

  DropboxStorage.prototype.getAttachment = function (id, name) {
    var context = this;

    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          url: GET_URL,
          type: "POST",
          dataType: "blob",
          headers: {
            "Authorization": "Bearer " + context._access_token,
            "Dropbox-API-Arg": JSON.stringify({"path": id + "/" + name})
          }
        });
      })
      .push(function (evt) {
        if (evt.target.response instanceof Blob) {
          return evt.target.response;
        }
        return new Blob(
          [evt.target.responseText],
          {"type": evt.target.getResponseHeader('Content-Type') ||
            "application/octet-stream"}
        );
      }, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
          if (!(error.target.response instanceof Blob)) {
            var err_content = JSON.parse(error.target.responseText);
            if ((err_content.error['.tag'] === 'path') &&
                (err_content.error.path['.tag'] === 'not_found')) {
              throw new jIO.util.jIOError("Cannot find attachment: " +
                                          id + "/, " + name, 404);
            }
            throw error;
          }
          return new RSVP.Queue()
            .push(function () {
              return jIO.util.readBlobAsText(error.target.response);
            })
            .push(function (evt) {
              var err_content2 = JSON.parse(evt.target.result);
              if ((err_content2.error['.tag'] === 'path') &&
                  (err_content2.error.path['.tag'] === 'not_found')) {
                throw new jIO.util.jIOError("Cannot find attachment: " +
                                            id + "/, " + name, 404);
              }
              throw error;
            });
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
          data: JSON.stringify({"path": id + "/" + name})
        });
      }).push(undefined, function (error) {
        if (error.target !== undefined && error.target.status === 409) {
          var err_content = JSON.parse(error.target.response ||
                                       error.target.responseText);
          if ((err_content.error['.tag'] === 'path_lookup') &&
              (err_content.error.path_lookup['.tag'] === 'not_found')) {
            throw new jIO.util.jIOError("Cannot find attachment: " +
                                        id + "/, " + name, 404);
          }
        }
        throw error;
      });
  };

  jIO.addStorage('dropbox', DropboxStorage);

}(jIO, RSVP, Blob, JSON));
