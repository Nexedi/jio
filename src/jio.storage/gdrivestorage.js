/*
 * Copyright 2015, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Google Drive Storage. Type = "gdrive".
 * Google Drive "database" storage.
 */
/*global Blob, jIO, RSVP, UriTemplate, JSON*/
/*jslint nomen: true*/

(function (jIO, RSVP, Blob, UriTemplate) {
  "use strict";

  var UPLOAD_URL = "https://www.googleapis.com/upload/drive/v2/files{/id}" +
      "?uploadType=multipart{&access_token}",
    upload_template = UriTemplate.parse(UPLOAD_URL),
    REMOVE_URL = "https://www.googleapis.com/drive/v2/" +
      "files{/id,trash}{?access_token}",
    remove_template = UriTemplate.parse(REMOVE_URL),
    GET_URL = "https://www.googleapis.com/drive/v2/files{/id}?alt=media",
    get_template = UriTemplate.parse(GET_URL),
    LIST_URL = "https://www.googleapis.com/drive/v2/files" +
      "?prettyPrint=false{&pageToken}&q=trashed=false" +
      "&fields=nextPageToken,items(id,mimeType,title,parents(id,isRoot))" +
      "{&access_token}",
    list_template = UriTemplate.parse(LIST_URL),
    FOLDER = "application/vnd.google-apps.folder";

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

  function listPage(result, token) {
    var i,
      obj;
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "GET",
          "url": list_template.expand({
            pageToken : (result.nextPageToken || ""),
            access_token: token
          })
        });
      })
      .push(function (data) {
        obj = JSON.parse(data.target.response || data.target.responseText);
        for (i = 0; i < obj.items.length; i += 1) {
          result.push(obj.items[i]);
        }
        result.nextPageToken = obj.nextPageToken;
        return result;
      });
  }

  function listDirectory(result, token) {
    return new RSVP.Queue()
      .push(function () {
        return listPage(result, token);
      })
      .push(function () {
        if (result.nextPageToken) {
          return listDirectory(result, token);
        }
        return result;
      });
  }

  function splitpath(path) {
    var name = path.split("/"),
      i;

    for (i = 0; i < name.length; i += 1) {
      if (name[i] === "") {
        name.splice(i, 1);
        i -= 1;
      }
    }
    return name;
  }

  function getFileId(path, token, list) {
    var i,
      j,
      k,
      parent_id,
      found_item,
      result = {},
      name = splitpath(path);

    if (!name.length) {return result; }
    return new RSVP.Queue()
      .push(function () {
        return list || listDirectory([], token);
      })
      .push(function (file_list) {
        for (i = 0; i < name.length; i += 1) {
          found_item = false;
          for (j = 0; j < file_list.length; j += 1) {
            if (file_list[j].title  === name[i]) {
              for (k = 0; k < file_list[j].parents.length;
                   k += 1) {

                if ((!i && file_list[j].parents[k].isRoot) ||
                    (i && file_list[j].parents[k].id === parent_id)) {

                  if (found_item === true) {
                    //if 2 files with same name in same folder.
                    throw new jIO.util.jIOError("Method not implemented", 405);
                  }
                  found_item = true;
                  parent_id = file_list[j].id;

                  if (i === (name.length - 2) &&
                      file_list[j].mimeType === FOLDER) {
                    result.parent = parent_id;
                  }
                  if (i === (name.length - 1)) {
                    result.id = parent_id;
                    result.is_dir = (file_list[j].mimeType === FOLDER)
                      ? true : false;
                  }
                  break;
                }

              }
            }
          }
          if (!found_item) {break; }
        }
        return result;
      });
  }

  /**
   * The JIO Google Drive Storage extension
   *
   * @class GdriveStorage
   * @constructor
   */
  function GdriveStorage(spec) {
    if (spec === undefined || spec.access_token === undefined ||
        typeof spec.access_token !== 'string') {
      throw new TypeError("Access Token must be a string " +
                          "which contains more than one character.");
    }
    if (spec.trashing !== undefined &&
        (spec.trashing !== true && spec.trashing !== false)) {
      throw new TypeError("trashing parameter" +
                          " must be a boolean (true or false)");
    }
    this._trashing = spec.trashing || true;
    this._access_token = spec.access_token;
    return;
  }

  function createPostRequest(title, parent, data, datatype, boundary) {
    var str,
      parentlist = parent ? '{id: "' + parent + '"}' : "",
      type = data ? "" : '"mimeType" : "' + FOLDER + '",\n';

    if (title.indexOf(boundary) !== -1 ||
        (datatype && datatype.indexOf(boundary) !== -1)) {
      throw new TypeError("you can't put this string in any element of " +
                          "your request (title, datatype):\n" + boundary);
    }
    str = '--' + boundary + '\n' +
      'Content-Type: application/json; charset=UTF-8\n\n' +
      '{\n"title": "' + encodeURIComponent(title) + '",\n' +
      type +
      '"parents": [' + parentlist + ']\n}\n\n' +
      '--' + boundary;

    if (data) {
      str += '\nContent-Type: ' + datatype + '\n' +
        'Content-Transfer-Encoding: base64\n\n';
      data = data.split(",").pop();
      str += data;
      str += '\n--' + boundary;
    }
    str += '--';

    return str;
  }

  function putElement(id, data, token) {
    var title = splitpath(id),
      boundary = "-------314159265358979323846",
      file_list;

    return new RSVP.Queue()
      .push(function () {
        return getFileId(id, token);
      })
      .push(function (result) {
        file_list = result;
        if ((file_list.id && !data) ||
            (!file_list.parent && title.length > 1) ||
            file_list.is_dir) {
          throw new jIO.util.jIOError("Method Not Allowed", 405);
        }
      })
      .push(function () {
        if (data) { return jIO.util.readBlobAsDataURL(data); }
        return;
      })
      .push(function (blob) {
        var update = false;
        if (blob) {blob = blob.currentTarget.result; }
        if (blob && file_list.id) {update = true; }
        return jIO.util.ajax({
          "type": update ? "PUT" : "POST",
          "url": upload_template.expand({
            access_token: token,
            id: update ? file_list.id : []
          }),
          headers: {
            "Content-Type" : 'multipart/related; boundary="' + boundary + '"'
          },
          data : createPostRequest(title.pop(), file_list.parent,
                                   blob, data.type, boundary)
        });
      }, undefined);
  }

  GdriveStorage.prototype.put = function (id, param) {
    id = restrictDocumentId(id);
    if (Object.getOwnPropertyNames(param).length > 0) {
      throw new jIO.util.jIOError("Can not store properties: " +
                                  Object.getOwnPropertyNames(param), 400);
    }
    return putElement(id, false, this._access_token);
  };

  GdriveStorage.prototype.putAttachment = function (id, name, blob) {
    id = restrictDocumentId(id);
    restrictAttachmentId(name);
    return putElement(id + name, blob, this._access_token);
  };

  function removeElement(id, deleteDir, token, trashing) {
    var title = splitpath(id);

    return new RSVP.Queue()
      .push(function () {
        return getFileId(id, token);
      })
      .push(function (result) {
        if (title.length && !result.id) {
          throw new jIO.util.jIOError("Not Found", 404);
        }
        if (!title.length || result.is_dir !== deleteDir) {
          throw new jIO.util.jIOError("Method Not Allowed", 405);
        }
        return jIO.util.ajax({
          type: trashing ? "POST" : "DELETE",
          url: remove_template.expand({
            id : result.id,
            access_token : token,
            trash : trashing ? "trash" : []
          })
        });
      });
  }

  GdriveStorage.prototype.remove = function (id) {
    id = restrictDocumentId(id);
    return removeElement(id, true, this._access_token, this._trashing);
  };

  GdriveStorage.prototype.removeAttachment = function (id, name) {
    id = restrictDocumentId(id);
    restrictAttachmentId(name);
    return removeElement(id + name, false, this._access_token, this._trashing);
  };

  GdriveStorage.prototype.get = function (id) {
    var that = this;

    id = restrictDocumentId(id);
    if (!splitpath(id).length) {return {}; }

    return new RSVP.Queue()
      .push(function () {
        return getFileId(id, that._access_token);
      })
      .push(function (result) {
        if (!result.id) {
          throw new jIO.util.jIOError("Cannot find document: " + id, 404);
        }
        if (result.is_dir) { return {}; }
        throw new jIO.util.jIOError("Not a directory: " + id, 404);
      });
  };

  GdriveStorage.prototype.allAttachments = function (id) {

    var that = this,
      file_list,
      title = splitpath(id),
      i,
      j;

    id = restrictDocumentId(id);
    return new RSVP.Queue()
      .push(function () {
        file_list = listDirectory([], that._access_token);
        return file_list;
      })
      .push(function (list) {
        var result;
        result = title.length ? getFileId(id, that._access_token, list) : [];
        return result;
      })
      .push(function (obj) {
        var result = {};

        file_list = file_list.fulfillmentValue;
        if (title.length) {
          if (!obj.id) {
            throw new jIO.util.jIOError("Cannot find document: " + id, 404);
          }
          if (!obj.is_dir) {
            throw new jIO.util.jIOError("Not a directory: " + id, 404);
          }
        }
        for (i = 0; i < file_list.length; i += 1) {
          for (j = 0; j < file_list[i].parents.length; j += 1) {
            if (file_list[i].mimeType !== FOLDER &&
                ((!title.length && file_list[i].parents[j].isRoot) ||
                 (title.length && file_list[i].parents[j].id === obj.id))) {
              result[file_list[i].title] = {};
              break;
            }
          }
        }
        return result;
      }, undefined);
  };

  GdriveStorage.prototype.getAttachment = function (id, name) {
    var that = this;

    id = restrictDocumentId(id);
    restrictAttachmentId(name);

    return new RSVP.Queue()
      .push(function () {
        return getFileId(id + name, that._access_token);
      })
      .push(function (result) {
        if (!result.id) {
          throw new jIO.util.jIOError(
            "Cannot find attachment: " + id + " , " + name,
            404
          );
        }
        if (result.is_dir) {
          throw new jIO.util.jIOError("Method not implemented", 405);
        }
        return jIO.util.ajax({
          type: "GET",
          dataType: "blob",
          url: get_template.expand({
            id: result.id,
            access_token: that._access_token
          }),
          headers: {
            "Authorization" : "Bearer " + that._access_token
          }
        });
      })
      .push(function (evt) {
        return new Blob(
          [evt.target.response || evt.target.responseText],
          {"type": evt.target.getResponseHeader('Content-Type') ||
            "application/octet-stream"}
        );
      });
  };

  jIO.addStorage('gdrive', GdriveStorage);

}(jIO, RSVP, Blob, UriTemplate));
