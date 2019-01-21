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
/*global jIO, RSVP, UriTemplate, FormData, Blob*/
/*jslint nomen: true*/

(function (jIO, RSVP, UriTemplate, FormData, Blob) {
  "use strict";

  function makeRequest(storage, uuid, options, download) {
    if (options === undefined) {
      options = {};
    }
    if (options.xhrFields === undefined) {
      options.xhrFields = {};
    }

    if (options.headers === undefined) {
      options.headers = {};
    }

    // Prefer JSON by default
    if (download === true) {
      options.url = storage._blob_template.expand({uuid: uuid});
      options.dataType = 'blob';
    } else {
      options.url = storage._url_template.expand({uuid: uuid || ""});
      if (!options.headers.hasOwnProperty('Accept')) {
        options.headers.Accept = 'application/json';
        options.dataType = 'json';
      }
    }

    // Use cookie based auth
      /*
      headers : {
        "Authorization": "Basic " + storage._access_token
      }
      */
    options.xhrFields.withCredentials = true;

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax(options);
      })
      .push(function (event) {
        return event.target.response;
      });
  }

  /**
   * The JIO Linshare Storage extension
   *
   * @class LinshareStorage
   * @constructor
   */
  function LinshareStorage(spec) {

    if (typeof spec.url !== "string" || !spec.url) {
      throw new TypeError("Linshare 'url' must be a string " +
                          "which contains more than one character.");
    }
    this._url_template = UriTemplate.parse(
      spec.url + '/linshare/webservice/rest/user/v2/documents/{uuid}'
    );
    this._blob_template = UriTemplate.parse(
      spec.url + '/linshare/webservice/rest/user/v2/documents/{uuid}/download'
    );

    if (spec.hasOwnProperty('access_token')) {
      this._access_token = spec.access_token;
    }
  }

  var capacity_list = ['list', 'include'];
  LinshareStorage.prototype.hasCapacity = function (name) {
    return (capacity_list.indexOf(name) !== -1);
  };

  function sortByModificationDate(entry1, entry2) {
    var date1 = entry1.modificationDate,
      date2 = entry2.modificationDate;
    return (date1 === date2) ? 0 : ((date1 < date2) ? 1 : -1);
  }

  function getDocumentList(storage, options) {
    return makeRequest(storage, "", {
      type: "GET"
    })
      .push(function (entry_list) {
        // Linshare only allow to get the full list of documents
        // First, sort the entries by modificationDate in order to
        // drop the 'old' entries with the same 'name'
        // (as linshare does not to update an existing doc)
        entry_list.sort(sortByModificationDate);

        // Only return one document per name
        // Keep the newer document
        var entry_dict = {},
          i,
          len = entry_list.length,
          entry_name,
          entry,
          result_list = [];

        for (i = 0; i < len; i += 1) {
          entry_name = entry_list[i].name;

          // If we only need one precise name, no need to check the others
          if (!options.hasOwnProperty('only_id') ||
              (options.only_id === entry_name)) {

            if (!entry_dict.hasOwnProperty(entry_name)) {
              entry = {
                id: entry_name,
                value: {},
                _linshare_uuid: entry_list[i].uuid
              };
              if (options.include_docs === true) {
                entry.doc = JSON.parse(entry_list[i].metaData) || {};
              }
              result_list.push(entry);

              if (options.all_revision !== true) {
                // If we only want to fetch 'one revision',
                // ie, the latest document matching this id
                entry_dict[entry_name] = null;

                if (options.only_id === entry_name) {
                  // Document has been found, no need to check all the others
                  break;
                }
              }
            }
          }
        }

        return result_list;
      });
  }

  LinshareStorage.prototype.buildQuery = function (options) {
    return getDocumentList(this, {
      include_docs: options.include_docs
    });
  };

  LinshareStorage.prototype.get = function (id) {
    // It is not possible to get a document by its name
    // The only way is to list all of them, and find it manually
    return getDocumentList(this, {
      include_docs: true,
      only_id: id
    })
      .push(function (result_list) {
        if (result_list.length === 1) {
          return result_list[0].doc;
        }

        throw new jIO.util.jIOError(
          "Can't find document with id : " + id,
          404
        );
      });
  };

  function createLinshareDocument(storage, id, doc, blob) {
    var data = new FormData();
    data.append('file', blob, id);
    data.append('filesize', blob.size);
    data.append('filename', id);
    data.append('description', doc.title || doc.description || '');
    data.append('metadata', jIO.util.stringify(doc));
    return makeRequest(storage, '', {
      type: 'POST',
      data: data
    });
  }

  LinshareStorage.prototype.put = function (id, doc) {
    var storage = this;
    return getDocumentList(storage, {
      include_docs: true,
      only_id: id
    })
      .push(function (result_list) {
        if (result_list.length === 1) {
          // Update existing document metadata
          var data = {
            uuid: result_list[0]._linshare_uuid,
            metaData: jIO.util.stringify(doc),
            name: id,
            description: doc.title || doc.description || ''
          };
          return makeRequest(storage, result_list[0]._linshare_uuid, {
            type: 'PUT',
            headers: {'Content-Type': 'application/json'},
            data: jIO.util.stringify(data)
          });
        }
        // Create a new one
        return createLinshareDocument(storage, id, doc, new Blob());
      });
  };

  LinshareStorage.prototype.remove = function (id) {
    var storage = this;
    // Delete all entries matching the id
    return getDocumentList(storage, {
      include_docs: true,
      only_id: id,
      all_revision: true
    })
      .push(function (result_list) {
        var promise_list = [],
          i,
          len = result_list.length;
        for (i = 0; i < len; i += 1) {
          promise_list.push(
            makeRequest(storage, result_list[i]._linshare_uuid, {
              type: "DELETE"
            })
          );
        }
        return RSVP.all(promise_list);
      });
  };

  LinshareStorage.prototype.allAttachments = function (id) {
    return this.get(id)
      .push(function () {
        return {enclosure: {}};
      });
  };

  function restrictAttachmentId(name) {
    if (name !== "enclosure") {
      throw new jIO.util.jIOError(
        "attachment name " + name + " is forbidden in linshare",
        400
      );
    }
  }

  LinshareStorage.prototype.putAttachment = function (id, name, blob) {
    restrictAttachmentId(name);
    var storage = this;
    return storage.get(id)
      .push(function (doc) {
        // Create a new document with the same id but a different blob content
        return createLinshareDocument(storage, id, doc, blob);
      });
  };

  LinshareStorage.prototype.getAttachment = function (id, name) {
    restrictAttachmentId(name);
    var storage = this;
    // It is not possible to get a document by its name
    // The only way is to list all of them, and find it manually
    return getDocumentList(storage, {
      include_docs: true,
      only_id: id
    })
      .push(function (result_list) {
        if (result_list.length === 1) {
          return makeRequest(storage, result_list[0]._linshare_uuid, {
          }, true);
        }

        throw new jIO.util.jIOError(
          "Can't find document with id : " + id,
          404
        );
      });


  };

  jIO.addStorage('linshare', LinshareStorage);

}(jIO, RSVP, UriTemplate, FormData, Blob));
