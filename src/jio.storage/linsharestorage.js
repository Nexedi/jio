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
 * Can't set up id, implied can't put new document
 */
/*global Blob, jIO, RSVP, UriTemplate, FormData*/
/*jslint nomen: true*/

(function (jIO, RSVP, Blob, UriTemplate, FormData) {
  "use strict";
  var default_url = "https://softinst89769.host.vifib.net/erp5/portal_skins/" +
    "erp5_http_proxy/ERP5Site_getHTTPResource?url=https://demo.linshare.org/" +
    "linshare/webservice/rest/user/v2/documents/{uuid}",
    default_token = "dXNlcjFAbGluc2hhcmUub3JnOnBhc3N3b3JkMQ==";

  function makeRequest(storage, options) {
    var ajax_param = {
      type: options.type,
      url: storage._url_template.expand({uuid: options.uuid || ""}),
      headers : {
        "Authorization": "Basic " + storage._credential_token,
        "Accept": "application/json"
      }
    };
    if (options.type === 'PUT') {
      ajax_param.dataType = options.dataType;
      ajax_param.headers['Content-Type'] = "application/json";
    }
    if (options.data) {
      ajax_param.data = options.data;
    }
    if (options.download) {
      ajax_param.url += '/download';
    }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax(ajax_param);
      })
      .push(function (event) {
        if (options.type === "PUT") {
          return event.target.response.uuid;
        }
        if (options.download) {
          return event.target.response;
        }
        return JSON.parse(event.target.response);
      });
  }

  function checkDocumentMap(storage, id) {
    if (!storage._id_map.hasOwnProperty(id)) {
      throw new jIO.util.jIOError(
        "Can't find document with id : " + id,
        404
      );
    }
  }

  function checkAttachmentMap(storage, id, name) {
    checkDocumentMap(storage, id);
    if (!storage._id_map[id].attachment.hasOwnProperty(name)) {
      throw new jIO.util.jIOError(
        "Can't find attachment with name :" + name,
        404
      );
    }
  }

  /**
   * The JIO Linshare Storage extension
   *
   * @class LinshareStorage
   * @constructor
   */
  function LinshareStorage(spec) {
    this._url_template = UriTemplate.parse(spec.url_template || default_url);
    this._credential_token = spec.credential_token || default_token;
    this._id_map = {};
  }

  LinshareStorage.prototype.put = function (id, doc) {
    var storage = this,
      data = new FormData();
    data.append('file', new Blob());
    data.append('filename', doc.title);
    data.append('filesize', 0);
    data.append('description', 'jio/document');
    data.append('metadata', jIO.util.stringify({
      doc: doc,
      id: id
    }));

    return makeRequest(this, {
      data: data,
      type: "POST"
    })
      .push(function (result) {
        if (storage._id_map.hasOwnProperty(id)) {
          storage._id_map[id].uuid = result.uuid;
        } else {
          storage._id_map[id] = {'uuid': result.uuid, attachment: {}};
        }
        return id;
      });
  };

  LinshareStorage.prototype.remove = function (id) {
    var storage = this;
    if (storage._id_map.hasOwnProperty(id)) {
      return makeRequest(storage, {
        type: "DELETE",
        uuid: storage._id_map[id].uuid
      })
        .push(function () {
          var promise_list = [],
            name;
          for (name in storage._id_map[id].attachment) {
            if (storage._id_map[id].attachment.hasOwnProperty(name)) {
              promise_list.push(storage.removeAttachment(id, name));
            }
          }
          return RSVP.all(promise_list);
        })
        .push(function () {
          delete storage._id_map[id];
          return id;
        });
    }
  };

  LinshareStorage.prototype.get = function (id) {
    checkDocumentMap(this, id);
    return makeRequest(this, {
      type: "GET",
      uuid: this._id_map[id].uuid
    })
      .push(function (result) {
        return JSON.parse(result.metaData).doc;
      });
  };

  LinshareStorage.prototype.hasCapacity = function (name) {
    return name === "list";
  };

  LinshareStorage.prototype.buildQuery = function () {
    return makeRequest(this, {
      type: "GET"
    })
      .push(function (result) {
        var  rows = [],
          len = result.length,
          i;
        for (i = 0; i < len; i += 1) {
          if (result[i].hasOwnProperty('type')) {
            if (result[i].description === 'jio/document') {
              rows.push({id: JSON.parse(result[i].metaData).id, value: {}});
            }
          }
        }
        return rows;
      });
  };

  // Attachments link by field "description" - Dict
  LinshareStorage.prototype.putAttachment = function (id, name, blob) {
    var storage = this,
      data = new FormData();
    if (!storage._id_map.hasOwnProperty(id)) {
      throw new jIO.util.JIOError(
        "Can't find document with id :" + id,
        404
      );
    }
    data.append('file', blob);
    data.append('filename', blob.name);
    data.append('filesize', blob.size);
    data.append('metadata', jIO.util.stringify({
      'id': id,
      'name': name
    }));
    data.append('description', 'jio/attachment');
    return makeRequest(storage, {
      data: data,
      type: "POST"
    })
      .push(function (result) {
        storage._id_map[id].attachment[name] = result.uuid;
        return result.uuid;
      });
  };

  LinshareStorage.prototype.getAttachment = function (id, name) {
    checkAttachmentMap(this, id, name);
    return makeRequest(this, {
      type: "GET",
      uuid: this._id_map[id].attachment[name],
      download: true
    })
      .push(function (result) {
        return new Blob([result]);
      });
  };

  LinshareStorage.prototype.removeAttachment = function (id, name) {
    if (this._id_map.hasOwnProperty(id) &&
        this._id_map[id].attachment.hasOwnProperty(name)) {
      return makeRequest(this, {
        type: "DELETE",
        uuid: this._id_map[id].attachment[name]
      })
        .push(function () {
          delete this._id_map[id].attachment[name];
          return id;
        });
    }
  };


  LinshareStorage.prototype.repair = function () {
    var storage = this;
    return makeRequest(this, {
      type: "GET"
    })
      .push(function (result) {
        var len = result.length,
          i,
          metadata,
          row,
          id;
        for (i = 0; i < len; i += 1) {
          row = result[i];
          if (row.hasOwnProperty('description')) {
            if (row.description === 'jio/document') {
              id = JSON.parse(row.metaData).id;
              if (storage._id_map.hasOwnProperty(id)) {
                storage._id_map[id].uuid = row.uuid;
              } else {
                storage._id_map[id] = {'uuid': row.uuid, attachment: {}};
              }
            } else if (row.description === 'jio/attachment') {
              metadata = JSON.parse(row.metaData);
              id = metadata.id;
              if (!storage._id_map.hasOwnProperty(id)) {
                storage._id_map[id] = {'uuid': undefined, attachment: {}};
              }
              storage._id_map[id].attachment[metadata.name] = row.uuid;
            }
          }
        }
      });
  };

  jIO.addStorage('linshare', LinshareStorage);

}(jIO, RSVP, Blob, UriTemplate, FormData));