/*
 * Copyright 2016, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true */
/*global jIO, RSVP, Rusha, Blob, console */

(function (jIO, RSVP, Rusha, Blob, console) {
  "use strict";

  /**
   *
   * Sample OPML Tree Replicated Storage spec
   * 
   * {
   *  "type": "replicatedopml",
   *  "opml_storage_list": [
   *    {
   *      "type": "opml",
   *      "url": "http://some.url.com",
   *      "sub_storage_list": [
   *        {"type": "rss", "url_attribute": "xmlUrl"},
   *        {"type": "webdav": "url_path": "/"},
   *        {"type": "webdav", "url_path": "/data/"},
   *        {"type": "webhttp": "url_path": "/storage"}
   *      ],
   *      "basic_login": "XUSODISOIDOISUJDD=="
   *    }
   *  ],
   *  local_sub_storage: {
   *    type: "query",
   *      sub_storage: {
   *        type: "indexeddb",
   *        database: "monitoring_local.db"
   *    }
   *  }
   * }
   * 
   */

  var rusha = new Rusha(),
    KNOWN_SUB_STORAGE_LIST = ['rss', 'dav', 'webhttp'];

  function generateHash(str) {
    return rusha.digestFromString(str);
  }

  function createStorage(context, storage_spec, key) {
    if (!context._remote_storage_dict.hasOwnProperty(key)) {
      context._remote_storage_dict[key] = jIO.createJIO(storage_spec);
    }
    return context._remote_storage_dict[key];
  }

  /**
   * The JIO OPML Tree Replicated Storage extension for monitor
   *
   * @class ReplicatedOPMLStorage
   * @constructor
   */
  function ReplicatedOPMLStorage(spec) {
    var i,
      j;

    function checkSubStorage(sub_storage_spec) {
      if (typeof sub_storage_spec.url !== 'string' &&
          typeof sub_storage_spec.url_path !== 'string' &&
          typeof sub_storage_spec.url_attribute !== 'string') {
        throw new TypeError("one or more OPML sub storage(s) has no 'url' set");
      }
      if (typeof sub_storage_spec.type !== 'string') {
        throw new TypeError(
          "one or more OPML sub storage(s) has no attribute 'type' set"
        );
      }
    }

    if (typeof spec.opml_storage_list !== 'object') {
      throw new TypeError("ReplicatedOPMLStorage 'opml_storage_list' " +
        "is not of type object");
    }

    if (spec.local_sub_storage === undefined) {
      throw new TypeError("ReplicatedOPMLStorage 'local_sub_storage' " +
                          "is not defined");
    }
    this._local_sub_storage = jIO.createJIO(spec.local_sub_storage);

    this._remote_storage_dict = {};
    this._opml_storage_list = spec.opml_storage_list;
    for (i = 0; i < this._opml_storage_list.length; i += 1) {
      if (typeof this._opml_storage_list[i].url !== 'string') {
        throw new TypeError("opml storage 'url' is not of type string");
      }
      if (this._opml_storage_list[i].sub_storage_list !== undefined) {
        for (j = 0; j < this._opml_storage_list[i].sub_storage_list.length;
             j += 1) {
          checkSubStorage(this._opml_storage_list[i].sub_storage_list[j]);
        }
      }
      /*if (spec.opml_storage_list[i].type !== 'opml') {
        throw new TypeError("ReplicatedOPMLStorage 'type' should be 'opml'");
      }*/
    }
  }

  ReplicatedOPMLStorage.prototype.get = function () {
    return this._local_sub_storage.get.apply(this._local_sub_storage,
                                         arguments);
  };

  ReplicatedOPMLStorage.prototype.buildQuery = function () {
    return this._local_sub_storage.buildQuery.apply(this._local_sub_storage,
                                                arguments);
  };

  /*ReplicatedOPMLStorage.prototype.put = function () {
    return this._local_sub_storage.put.apply(this._local_sub_storage,
                                         arguments);
  };*/

  ReplicatedOPMLStorage.prototype.hasCapacity = function (capacity) {
    return (capacity === "list") || (capacity === "include");
  };

  ReplicatedOPMLStorage.prototype.getAttachment = function () {
    return this._local_sub_storage.getAttachment.apply(this._local_sub_storage,
                                                   arguments);
  };

  ReplicatedOPMLStorage.prototype.allAttachments = function () {
    return this._local_sub_storage.allAttachments.apply(this._local_sub_storage,
                                                    arguments);
  };

  function getSubOpmlStorageDescription(spec, opml_doc, basic_login) {
    var storage_spec;

    storage_spec = JSON.parse(JSON.stringify(spec));
    if (storage_spec.basic_login === undefined && basic_login !== undefined) {
      storage_spec.basic_login = basic_login;
    }
    if (KNOWN_SUB_STORAGE_LIST.indexOf(storage_spec.type) !== -1) {
      if (storage_spec.url_attribute !== undefined &&
          opml_doc.hasOwnProperty(storage_spec.url_attribute)) {
        storage_spec.url = opml_doc[storage_spec.url_attribute];
        delete storage_spec.url_attribute;
      } else if (storage_spec.url_path !== undefined) {
        storage_spec.url_path = storage_spec.url_path.replace(
          new RegExp("^[/]+"),
          ""
        );
        storage_spec.url = opml_doc.url.replace(
          new RegExp("[/]+$"),
          ""
        ) + "/" + storage_spec.url_path;
        delete storage_spec.url_path;
      }
      // XXX - for compatibility, remove url with jio_private path
      storage_spec.url = storage_spec.url.replace("jio_private", "private");
      if (storage_spec.type === "dav") {
        storage_spec = {
          type: "query",
          sub_storage: {
            type: "drivetojiomapping",
            sub_storage: storage_spec
          }
        };
      }
    }
    return storage_spec;
  }

  function getStorageUrl(storage_spec) {
    var spec = storage_spec;
    while (spec !== undefined) {
      if (spec.url !== undefined) {
        return spec.url;
      }
      spec = spec.sub_storage;
    }
    throw new Error("No url found on sub storage: " +
                    JSON.stringify(storage_spec));
  }

  function loadSubStorage(context, spec, parent_id, opml_doc, basic_login) {
    var sub_storage,
      storage_spec,
      options = {},
      result_dict,
      storage_key,
      url;

    if (spec.has_include_docs === true) {
      options = {include_docs: true};
    }
    try {
      storage_spec = getSubOpmlStorageDescription(
        spec,
        opml_doc,
        basic_login
      );
      url = getStorageUrl(storage_spec);
      storage_key = generateHash(parent_id + url);
      sub_storage = createStorage(context, storage_spec, storage_key);
    } catch (error) {
      console.log(error);
      throw error;
    }

    result_dict = {
      parent_id: parent_id,
      parent_title: opml_doc.title,
      opml_title: opml_doc.opml_title,
      type: storage_spec.type,
      result: {
        data: {
          total_rows: 0
        }
      },
      url: url
    };
    return sub_storage.allDocs(options)
      .push(function (result) {
        result_dict.result = result;
        return result_dict;
      }, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          console.log(error);
          return result_dict;
        }
        throw error;
      });
  }

  function getOpmlTree(context, opml_url, opml_spec) {
    var opml_storage,
      opml_document_list = [],
      document_attachment_dict = {},
      id;

    id = generateHash(opml_url);
    opml_storage = createStorage(context, opml_spec, id);
    return opml_storage.allDocs({include_docs: true})
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return [[], {}];
        }
        throw error;
      })
      .push(function (opml_result_list) {
        var j,
          i,
          item,
          id_hash,
          result_list = [];

        for (i = 0; i < opml_result_list.data.total_rows; i += 1) {
          item = opml_result_list.data.rows[i];
          id_hash = generateHash(id + item.id);

          opml_document_list.push({
            id: id_hash,
            doc: {
              type: "opml-item",
              name: item.id,
              reference: id_hash,
              parent_id: id,
              creation_date: item.doc.created_date,
              url: opml_url,
              title: item.doc.title,
              parent_title: undefined,
              opml_title: item.doc.opml_title,
              status: undefined
            }
          });
          document_attachment_dict[id_hash] = {
            name: item.id,
            doc: item.doc
          };
          for (j = 0; j < opml_spec.sub_storage_list.length; j += 1) {
            result_list.push(loadSubStorage(
              context,
              opml_spec.sub_storage_list[j],
              id_hash,
              item.doc,
              opml_spec.basic_login
            ));
          }
        }
        return RSVP.all(result_list);
      })
      .push(function (result_list) {
        var i,
          j;

        function applyItemToTree(item, item_result) {
          var id_hash,
            element;

          id_hash = generateHash(item_result.parent_id +
                                 item_result.url + item.id);
          if (item.doc !== undefined) {
            element = item.doc;
          } else {
            element = item.value;
          }
          opml_document_list.push({
            id: id_hash,
            doc: {
              parent_id: item_result.parent_id,
              name: item.id,
              type: (element.type || item_result.type + "-item"),
              reference: id_hash,
              creation_date: element.date || element["start-date"],
              url: item_result.url,
              status: (element.status || element.category),
              title: (element.source || element.title),
              parent_title: item_result.parent_title,
              opml_title: item_result.opml_title
            }
          });
          document_attachment_dict[id_hash] = {
            name: item.id,
            doc: element
          };
        }

        for (i = 0; i < result_list.length; i += 1) {
          for (j = 0; j < result_list[i].result.data.total_rows; j += 1) {
            applyItemToTree(
              result_list[i].result.data.rows[j],
              result_list[i]
            );
          }
        }
        return [opml_document_list, document_attachment_dict];
      });
  }

  function syncOpmlStorage(context) {
    var i,
      promise_list = [];
    for (i = 0; i < context._opml_storage_list.length; i += 1) {
      promise_list.push(
        getOpmlTree(context,
                    context._opml_storage_list[i].url,
                    context._opml_storage_list[i])
      );
    }
    return RSVP.all(promise_list);
  }

  function repairLocalStorage(context, new_document_list, document_key_list) {
    var j,
      promise_list = [];

    function pushDocumentToStorage(document_list, attachment_dict) {
      var document_queue = new RSVP.Queue(),
        doc_index,
        i;

      function pushDocument(id, element, attachment) {
        document_queue
          .push(function () {
            return context._local_sub_storage.put(id, element);
          })
          .push(function () {
            return context._local_sub_storage.putAttachment(
              id,
              attachment.name,
              new Blob([JSON.stringify(attachment.doc)])
            );
          });
      }

      for (i = 0; i < document_list.length; i += 1) {
        doc_index = document_key_list.indexOf(document_list[i].id);
        if (doc_index !== -1) {
          delete document_key_list[doc_index];
        }
        pushDocument(
          document_list[i].id,
          document_list[i].doc,
          attachment_dict[document_list[i].id]
        );
      }
      return document_queue
        .push(function () {
          var k,
            remove_queue = new RSVP.Queue();

          // remove all document which were not updated
          function removeDocument(key) {
            remove_queue
              .push(function () {
                return context._local_sub_storage.get(key);
              })
              .push(undefined, function (error) {
                throw error;
              })
              .push(function (element) {
                return context._local_sub_storage.removeAttachment(
                  key,
                  element.name
                );
              })
              .push(function () {
                return context._local_sub_storage.remove(key);
              })
              .push(undefined, function (error) {
                if ((error instanceof jIO.util.jIOError) &&
                    (error.status_code === 404)) {
                  return {};
                }
                throw error;
              });
          }

          for (k = 0; k < document_key_list.length; k += 1) {
            if (document_key_list[k] !== undefined) {
              removeDocument(document_key_list[k]);
            }
          }
          return remove_queue;
        });
    }

    for (j = 0; j < new_document_list.length; j += 1) {
      promise_list.push(pushDocumentToStorage(
        new_document_list[j][0],
        new_document_list[j][1]
      ));
    }
    return RSVP.all(promise_list);
  }

  ReplicatedOPMLStorage.prototype.repair = function () {
    var context = this,
      argument_list = arguments,
      local_storage_index_list = [];

    return new RSVP.Queue()
      .push(function () {
        return context._local_sub_storage.repair.apply(
          context._local_sub_storage,
          argument_list
        );
      })
      .push(function () {
        return context._local_sub_storage.allDocs();
      })
      .push(function (document_index) {
        var i;
        for (i = 0; i < document_index.data.total_rows; i += 1) {
          local_storage_index_list.push(document_index.data.rows[i].id);
        }
        return syncOpmlStorage(context);
      })
      .push(function (result_list) {
        return repairLocalStorage(context,
                                  result_list,
                                  local_storage_index_list);
      });

  };

  jIO.addStorage('replicatedopml', ReplicatedOPMLStorage);

}(jIO, RSVP, Rusha, Blob, console));
