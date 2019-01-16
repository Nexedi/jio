/*
 * Copyright 2019, Nexedi SA
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
 * Can't set up id, implied can't put new document
 */
/*global jIO, RSVP, UriTemplate, FormData*/
/*jslint nomen: true*/

(function (jIO, RSVP, UriTemplate, FormData) {
  "use strict";

  function makeRequest(storage, options) {
    var ajax_param = {
      type: options.type,
      url: storage._url_template.expand({uuid: options.uuid || ""}),
      headers : {
        "Authorization": "Basic " + storage._credential_token,
      }
    };
    if (options.data) {
      ajax_param.data = options.data;
    }
    if (options.download) {
      ajax_param.url += '/download';
      ajax_param.dataType = 'blob';
    }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax(ajax_param);
      })
      .push(function (event) {
        if (options.download) {
          return event.target.response;
        }
        return JSON.parse(event.target.response);
      });
  }

  /**
   * The JIO Linshare Storage extension
   *
   * @class LinshareStorage
   * @constructor
   */
  function LinshareStorage(spec) {
    this._url_template = UriTemplate.parse(
      spec.url + '/linshare/webservice/rest/user/v2/documents/{uuid}'
    );
    this._credential_token = spec.credential_token;
  }

  function restrictDocumentId(id) {
    if (id !== "/") {
      throw new jIO.util.jIOError(
        "id " + id + " is forbidden (!== /) in linshare",
        400
      );
    }
  }

  LinshareStorage.prototype.get = function (id) {
    restrictDocumentId(id);
    return {};
  };

  LinshareStorage.prototype.hasCapacity = function (name) {
    return name === "list";
  };

  LinshareStorage.prototype.buildQuery = function () {
    return [{
      id: "/",
      value: {}
    }];
  };

  LinshareStorage.prototype.allAttachments = function (id) {
    restrictDocumentId(id);
    return makeRequest(this, {
      type: "GET"
    })
      .push(function (share_list) {
        var attachment_dict = {},
          len = share_list.length,
          i;
        for (i = 0; i < len; i += 1) {
          // Return the list of names, to reduce the number of queries
          attachment_dict[share_list[i].uuid] = {name: share_list[i].name};
        }
        return attachment_dict;
      });
  };

  LinshareStorage.prototype.putAttachment = function (id, name, blob) {
    // a new uuid is generated each time a new share is uploaded
    // allAttachment will return the list of uuid, while putAttachment uses
    // attribute. But as name can be identical over multiple uuid,
    // we will use this unusual behaviour for now
    restrictDocumentId(id);
    var data = new FormData();
    data.append('file', blob, name);
    data.append('filename', name);
    data.append('filesize', blob.size);
    return makeRequest(this, {
      data: data,
      type: "POST"
    });
  };

  LinshareStorage.prototype.getAttachment = function (id, name) {
    restrictDocumentId(id);
    return makeRequest(this, {
      type: "GET",
      uuid: name,
      download: true
    });
  };

  LinshareStorage.prototype.removeAttachment = function (id, name) {
    restrictDocumentId(id);
    return makeRequest(this, {
      type: "DELETE",
      uuid: name
    });
  };

  jIO.addStorage('linshare', LinshareStorage);

}(jIO, RSVP, UriTemplate, FormData));