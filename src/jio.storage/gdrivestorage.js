/*
 * Copyright 2015, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Google Drive Storage. Type = "gdrive".
 * Google Drive "database" storage.
 */
/*global jIO, Blob, RSVP, UriTemplate, JSON*/
/*jslint nomen: true*/

(function (jIO, Blob, RSVP, UriTemplate, JSON) {
  "use strict";

  var UPLOAD_URL = "https://www.googleapis.com{/upload}/drive/v2/files{/id}" +
      "{?uploadType,access_token}",
    upload_template = UriTemplate.parse(UPLOAD_URL),
    REMOVE_URL = "https://www.googleapis.com/drive/v2/" +
      "files{/id,trash}{?access_token}",
    remove_template = UriTemplate.parse(REMOVE_URL),
    LIST_URL = "https://www.googleapis.com/drive/v2/files" +
      "?prettyPrint=false{&pageToken}&q=trashed=false" +
      "&fields=nextPageToken,items(id){&access_token}",
    list_template = UriTemplate.parse(LIST_URL),
    GET_URL = "https://www.googleapis.com/drive/v2/files{/id}{?alt}",
    get_template = UriTemplate.parse(GET_URL);

  function handleError(error, id) {
    if (error.target.status === 404) {
      throw new jIO.util.jIOError(
        "Cannot find document: " + id,
        404
      );
    }
    throw error;
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
          obj.items[i].value = {};
          result.push(obj.items[i]);
        }
        result.nextPageToken = obj.nextPageToken;
        return result;
      }, handleError);
  }

  function checkName(name) {
    if (name !== "enclosure") {
      throw new jIO.util.jIOError("Only support 'enclosure' attachment", 400);
    }
  }

  /**
   * The JIO Google Drive Storage extension
   *
   * @class GdriveStorage
   * @constructor
   */
  function GdriveStorage(spec, utils) {
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
    this._utils = utils;
    this._trashing = spec.trashing || true;
    this._access_token = spec.access_token;
    return;
  }

  function recursiveAllDocs(result, accessToken) {
    return new RSVP.Queue()
      .push(function () {
        return listPage(result, accessToken);
      })
      .push(function () {
        if (result.nextPageToken) {
          return recursiveAllDocs(result, accessToken);
        }
        return result;
      });
  }

  GdriveStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };

  GdriveStorage.prototype.buildQuery = function () {
    return recursiveAllDocs([], this._access_token);
  };

  function sendMetaData(id, param, token) {
    var boundary = "-------314159265358979323846";

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": id ? "PUT" : "POST",
          "url": upload_template.expand({
            access_token: token,
            id: id || [],
            upload: id ? [] : "upload",
            uploadType: "multipart"
          }),
          headers: {
            "Content-Type" : 'multipart/related; boundary="' + boundary + '"'
          },
          data: '--' + boundary + '\n' +
            'Content-Type: application/json; charset=UTF-8\n\n' +
            JSON.stringify(param) + '\n\n--' + boundary + "--"
        });
      })
      .push(function (result) {
        var obj = JSON.parse(result.target.responseText);

        return obj.id;
      },
            function (error) {handleError(error, id); });
  }

  GdriveStorage.prototype.put = function (id, param) {
    return sendMetaData(id, param, this._access_token);
  };

  GdriveStorage.prototype.post = function (param) {
    return sendMetaData(undefined, param, this._access_token);
  };

  function sendData(id, blob, token) {
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "PUT",
          "url": upload_template.expand({
            access_token: token,
            upload: "upload",
            id: id,
            uploadType: "media"
          }),
          data: blob
        });
      })
      .push(function (data) {
        data = JSON.parse(data.target.responseText);
        if (data.mimeType === "application/vnd.google-apps.folder") {
          throw new jIO.util.jIOError("cannot put attachments to folder", 400);
        }
        return data;
      }, function (error) {handleError(error, id); });
  }

  GdriveStorage.prototype.putAttachment = function (id, name, blob) {
    checkName(name);
    return sendData(id, blob, this._access_token);
  };

  GdriveStorage.prototype.remove = function (id) {
    var that  = this;
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: that._trashing ? "POST" : "DELETE",
          url: remove_template.expand({
            id : id,
            access_token : that._access_token,
            trash : that._trashing ? "trash" : []
          })
        });
      })
      .push(undefined, function (error) {handleError(error, id); });
  };

  function getData(id, attach, token) {
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "GET",
          dataType: attach ? "blob" : "json",
          url: get_template.expand({
            id: id,
            alt: attach ? "media" : [],
            access_token: token
          }),
          headers: {
            "Authorization" : "Bearer " + token
          }
        });
      })
      .push(function (evt) {
        return evt.target.response ||
          (attach ? new Blob([evt.target.responseText],
                             {"type" :
                              evt.target.responseHeaders["Content-Type"]}) :
              JSON.parse(evt.target.responseText));
      }, function (error) {handleError(error, id); });
  }

  GdriveStorage.prototype.get = function (id) {
    return getData(id, false, this._access_token);
  };

  GdriveStorage.prototype.getAttachment = function (id, name) {
    checkName(name);
    return getData(id, true, this._access_token);
  };

  GdriveStorage.prototype.allAttachments = function (id) {
    var token = this._access_token;

    return new RSVP.Queue()
      .push(function () {
        return getData(id, false, token);
      })
      .push(function (data) {
        if (data.mimeType === "application/vnd.google-apps.folder") {
          return {};
        }
        return {"enclosure": {}};
      });
  };

  jIO.addStorage('gdrive', GdriveStorage);

}(jIO, Blob, RSVP, UriTemplate, JSON));
