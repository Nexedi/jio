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
 * JIO Linshare Storage. Type = "linshare".
 * Linshare "database" storage.
 * http://download.linshare.org/components/linshare-core/2.2.2/
 */
/*global Blob, jIO, RSVP, UriTemplate*/
/*jslint nomen: true*/

(function (jIO, RSVP, Blob, UriTemplate) {
  "use strict";
  var BASE_URL = UriTemplate.parse("https://demo.linshare.org/linshare/webservice/rest/user/v2/documents/{uuid}");

  function makeRequest(options) {
    var ajax_param = {
      type: options.type,
      url: BASE_URL.expand({uuid: options.id || ""}),
      headers : {
        "Authorization": "Basic dXNlcjFAbGluc2hhcmUub3JnOnBhc3N3b3JkMQ==",
      }
    };
    if (options.data) {
      ajax_param.data = options.data;
    }
    return jIO.util.ajax(ajax_param);
  } 

  /**
   * The JIO Linshare Storage extension
   *
   * @class LinshareStorage
   * @constructor
   */
  function LinshareStorage() {}
  
  function createFormData(id, doc) {
    var  data = new FormData();
    data.append('file', new Blob(), doc.title);
    data.append('filesize', 0);
    data.append('metadata', jIO.util.stringify(doc)); 
    return data;
  }
  
  LinshareStorage.prototype.put = function (id, doc) {
    return new RSVP.Queue()
      .push(function () {
        return makeRequest({
          data: createFormData(id, doc),
          type: "PUT",
          uuid: id
        });
      });
  };

  LinshareStorage.prototype.post = function (doc) {
    return new RSVP.Queue()
      .push(function () {
        return makeRequest({
          data: createFormData(id, doc),
          type: "POST"
        });
      });
  };

  LinshareStorage.prototype.remove = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return makeRequest({
          type: "REMOVE",
          uuid: id
        });
      });
  };

  LinshareStorage.prototype.get = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return makeRequest({
          type: "GET",
          uuid: id
        });
      });
  };

  LinshareStorage.prototype.hasCapacity = function (name) {
    return name === "list";
  };

  LinshareStorage.prototype.buidQuery = function () {
    return new RSVP.Queue()
      .push(function () {
        return makeRequest({
          type: "GET"
        });
      });
  };

  LinshareStorage.prototype.allAttachments = function (id) {
    id = restrictDocumentId(id);
    return recursiveAllAttachments({}, this._access_token, id);
  };

  //currently, putAttachment will fail with files larger than 150MB,
  //due to the Linshare API. the API provides the "chunked_upload" method
  //to pass this limit, but upload process becomes more complex to implement.
  //
  //putAttachment will also create a folder if you try to put an attachment
  //to an inexisting foler.

  LinshareStorage.prototype.putAttachment = function (id, name, blob) {
  };

  LinshareStorage.prototype.getAttachment = function (id, name) {
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
            "Linshare-API-Arg": JSON.stringify({"path": id + "/" + name})
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

  //removeAttachment removes also directories.(due to Linshare API)

  LinshareStorage.prototype.removeAttachment = function (id, name) {
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

  jIO.addStorage('linshare', LinshareStorage);

}(jIO, RSVP, Blob, UriTemplate));
