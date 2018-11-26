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
      url: BASE_URL.expand({uuid: options.uuid || ""}),
      headers : {
        "Authorization": "Basic dXNlcjFAbGluc2hhcmUub3JnOnBhc3N3b3JkMQ==",
        "Accept": "application/json"
      }
    };
    if (options.data) {
      ajax_param.data = options.data;
    }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax(ajax_param);
      })
      .push(function (event) {
        return JSON.parse(event.target.response);
      });
  } 

  /**
   * The JIO Linshare Storage extension
   *
   * @class LinshareStorage
   * @constructor
   */
  function LinshareStorage() {}
  
  function createFormData(doc) {
    var  data = new FormData();
    data.append('file', new Blob(), doc.title);
    data.append('filesize', 0);
    data.append('metadata', jIO.util.stringify(doc)); 
    return data;
  }
  
  LinshareStorage.prototype.put = function (id, doc) {
    return makeRequest({
      data: createFormData(doc),
      type: "PUT",
      uuid: id
    })
      .push(function (event) {
        return result.uuid;
      }, function (error) {
      // Can't set id.
        if (error.target.status === 415) {
          throw new jIO.util.jIOError(
            "Can't create document with id : " + id,
            400
          );
        }
        throw error;
      });
  };

  LinshareStorage.prototype.post = function (doc) {
    return makeRequest({
      data: createFormData(doc),
      type: "POST"
    })
      .push(function (result) {
        return result.uuid;
      });
  };

  LinshareStorage.prototype.remove = function (id) {
    return makeRequest({
      type: "REMOVE",
      uuid: id
    });
  };

  LinshareStorage.prototype.get = function (id) {
    return makeRequest({
      type: "GET",
      uuid: id
    })
      .push(function (result) {
        return JSON.parse(result.metadata);
      });
  };

  LinshareStorage.prototype.hasCapacity = function (name) {
    return name === "list";
  };

  LinshareStorage.prototype.buildQuery = function () {
    return makeRequest({
      type: "GET"
    })
      .push(function (result) {
        var  rows = [],
          len = result.length,
          i;
        for (i = 0 ; i < len ; i += 1) {
          rows.push({id: result[i].uuid, value: {}});
        }
        return rows;
      });
  };

  LinshareStorage.prototype.allAttachments = function (id) {
    return makeRequest({
      type: "GET",
      uuid: id
    })
      .push(function (result) {
        if (result.filesize === 0) {
          return [];
        }
        // Limit all storage to this attachment ( for now )
        return [{"data": {}}];
      });
  };

  LinshareStorage.prototype.putAttachment = function (id, name, blob) {
    var  data = new FormData();
    if (name !== 'data') {
      throw new jIO.util.jIOError(
        "Force to use only data as atachment name",
        401
      );
    }
    data.append('file', blob);
    data.append('filesize', blob.size);
    return new RSVP.Queue()
      .push(function () {
        return makeRequest({
          type: "PUT",
          data: data,
          uuid: id
        });
      });
  };

  LinshareStorage.prototype.getAttachment = function (id) {
     return new RSVP.Queue()
      .push(function () {
        return makeRequest({
          type: "GET",
          uuid: id
        });
      });
  };

  LinshareStorage.prototype.removeAttachment = function (id, name) {
    return this.putAttachment(id, name, new Blob());
  };

  jIO.addStorage('linshare', LinshareStorage);

}(jIO, RSVP, Blob, UriTemplate));
