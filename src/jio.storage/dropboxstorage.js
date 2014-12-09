/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/**
 * JIO Dropbox Storage. Type = "dropbox".
 * Dropbox "database" storage.
 */
/*global FormData, btoa, Blob, define, jIO, RSVP, ProgressEvent */
/*js2lint nomen: true, unparam: true, bitwise: true */
/*jslint nomen: true, unparam: true*/
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, RSVP);
}([
  'jio',
  'rsvp'
], function (jIO, RSVP) {
  "use strict";

  /**
   * Checks if an object has no enumerable keys
   *
   * @param  {Object} obj The object
   * @return {Boolean} true if empty, else false
   */
  function objectIsEmpty(obj) {
    var k;
    for (k in obj) {
      if (obj.hasOwnProperty(k)) {
        return false;
      }
    }
    return true;
  }

  var UPLOAD_URL = "https://api-content.dropbox.com/1/",
//     UPLOAD_OR_GET_URL = "https://api-content.dropbox.com/1/files/sandbox/",
//     REMOVE_URL = "https://api.dropbox.com/1/fileops/delete/",
//     LIST_URL = 'https://api.dropbox.com/1/metadata/sandbox/',
    METADATA_FOLDER = 'metadata';

  /**
   * The JIO DropboxStorage extension
   *
   * @class DropboxStorage
   * @constructor
   */
  function DropboxStorage(spec) {
    if (typeof spec.access_token !== 'string' || !spec.access_token) {
      throw new TypeError("Access Token' must be a string " +
                          "which contains more than one character.");
    }
    if (typeof spec.application_name !== 'string' && spec.application_name) {
      throw new TypeError("'Root Folder' must be a string ");
    }
    if (!spec.application_name) {
      spec.application_name = "default";
    }
    this._access_token = spec.access_token;
    this._application_name = spec.application_name;
  }

  // Storage specific put method
  DropboxStorage.prototype._put = function (key, blob, path) {
    var data = new FormData();
    if (path === undefined) {
      path = '';
    }
    data.append(
      "file",
      blob,
      key
    );
    return jIO.util.ajax({
      "type": "POST",
      "url": UPLOAD_URL + 'files/sandbox/' +
        this._application_name + '/' +
        path + '?access_token=' + this._access_token,
      "data": data
    });

  };

  /**
   * Create a document.
   *
   * @method post
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to store
   */
  DropboxStorage.prototype.post = function (command, metadata) {
    // A copy of the document is made
    var doc = jIO.util.deepClone(metadata), doc_id = metadata._id,
      that = this;

    // An id is generated if none is provided
    if (!doc_id) {
      doc_id = jIO.util.generateUuid();
      doc._id = doc_id;
    }
    // 1. get Document, if it exists abort
    function getDocument() {
      return that._get(METADATA_FOLDER + "/" + metadata._id)
        .then(function () {
          command.error(
            409,
            "document exists",
            "Cannot create a new document"
          );
          throw 1;
        })
        .fail(function (event) {
          if (event instanceof ProgressEvent) {
            // If the document do not exist no problem
            if (event.target.status === 404) {
              return 0;
            }
          }
          throw event;
        });
    }

    // 2. Update Document
    function updateDocument() {
      return that._put(
        doc._id,
        new Blob([JSON.stringify(doc)], {
          type: "application/json"
        }),
        METADATA_FOLDER
      );
    }

    // onError
    function onError(event) {
      if (event instanceof ProgressEvent) {
        command.error(
          event.target.status,
          event.target.statusText,
          "Unable to post doc"
        );
      } else {
        if (event !== 1) {
          throw event;
        }
      }
    }

    // The document is pushed
    return getDocument()
      .then(updateDocument)
      .then(function () {
        command.success({
          "id": doc_id
        });
      })
      .fail(onError);
  };

  /**
   * Update/create a document.
   *
   * @method put
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to store
   */
  DropboxStorage.prototype.put = function (command, metadata) {
    // We put the document
    var that = this,
      old_document = {};
    // 1. We first get the document
    function getDocument() {
      return that._get(METADATA_FOLDER + '/' + metadata._id)
        .then(function (answer) {
          old_document = JSON.parse(answer.target.responseText);
        })
        .fail(function (event) {
          if (event instanceof ProgressEvent) {
            // If the document do not exist no problem
            if (event.target.status === 404) {
              return 0;
            }
          }
          throw event;
        });
    }

    // 2. Update Document
    function updateDocument() {
      if (old_document.hasOwnProperty('_attachments')) {
        metadata._attachments = old_document._attachments;
      }
      return that._put(
        metadata._id,
        new Blob([JSON.stringify(metadata)], {
          type: "application/json"
        }),
        METADATA_FOLDER
      );
    }

    // onError
    function onError(event) {
      if (event instanceof ProgressEvent) {
        command.error(
          event.target.status,
          event.target.statusText,
          "Unable to put doc"
        );
      } else {
        if (event !== 1) {
          throw event;
        }
      }
    }

    return getDocument()
      .then(updateDocument)
      .then(function () {
        command.success();
      // XXX should use command.success("created") when the document is created
      })
      .fail(onError);

  };

  // Storage specific get method
  DropboxStorage.prototype._get = function (key) {
    var download_url = 'https://api-content.dropbox.com/1/files/sandbox/' +
      this._application_name + '/' +
      key + '?access_token=' + this._access_token;
    return jIO.util.ajax({
      "type": "GET",
      "url": download_url
    });
  };

  /**
   * Get a document or attachment
   * @method get
   * @param  {object} command The JIO command
   **/
  DropboxStorage.prototype.get = function (command, param) {
    return this._get(METADATA_FOLDER + '/' + param._id)
      .then(function (event) {
        if (event.target.responseText !== undefined) {
          command.success({
            "data": JSON.parse(event.target.responseText)
          });
        } else {
          command.error(
            event.target.status,
            event.target.statusText,
            "Cannot find document"
          );
        }
      }).fail(function (event) {
        if (event instanceof ProgressEvent) {
          command.error(
            event.target.status,
            event.target.statusText,
            "Cannot find document"
          );
        } else {
          command.error(event);
        }
      });
  };

  /**
   * Get an attachment
   *
   * @method getAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  DropboxStorage.prototype.getAttachment = function (command, param) {
    var that = this, document = {};

    // 1. We first get the document
    function getDocument() {
      return that._get(METADATA_FOLDER + '/' + param._id)
        .then(function (answer) {
          document = JSON.parse(answer.target.responseText);

          // We check the attachment is referenced
          if (document.hasOwnProperty('_attachments')) {
            if (document._attachments.hasOwnProperty(param._attachment)) {
              return;
            }
          }
          command.error(
            404,
            "Not Found",
            "Cannot find attachment"
          );
          throw 1;
        })
        .fail(function (event) {
          if (event instanceof ProgressEvent) {
            // If the document do not exist it fails
            if (event.target.status === 404) {
              command.error({
                'status': 404,
                'message': 'Unable to get attachment',
                'reason': 'Missing document'
              });
            } else {
              command.error(
                event.target.status,
                event.target.statusText,
                "Problem while retrieving document"
              );
            }
            throw 1;
          }
          throw event;
        });
    }

    // 2. We get the Attachment
    function getAttachment() {
      return that._get(param._id + "-" + param._attachment);
    }

    // 3. On success give attachment
    function onSuccess(event) {
      var attachment_blob = new Blob([event.target.response]);
      command.success(
        event.target.status,
        {
          "data": attachment_blob,
          // XXX make the hash during the putAttachment and store it into the
          // metadata file.
          "digest": document._attachments[param._attachment].digest
        }
      );
    }

    // 4. onError
    function onError(event) {
      if (event instanceof ProgressEvent) {
        command.error(
          event.target.status,
          event.target.statusText,
          "Cannot find attachment"
        );
      } else {
        if (event !== 1) {
          throw event;
        }
      }
    }

    return getDocument()
      .then(getAttachment)
      .then(onSuccess)
      .fail(onError);
  };

  /**
   * Add an attachment to a document
   *
   * @method putAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  DropboxStorage.prototype.putAttachment = function (command, param) {
    var that = this, document = {}, digest;
    // We calculate the digest string of the attachment
    digest = jIO.util.makeBinaryStringDigest(param._blob);

    // 1. We first get the document
    function getDocument() {
      return that._get(METADATA_FOLDER + '/' + param._id)
        .then(function (answer) {
          document = JSON.parse(answer.target.responseText);
        })
        .fail(function (event) {
          if (event instanceof ProgressEvent) {
            // If the document do not exist it fails
            if (event.target.status === 404) {
              command.error({
                'status': 404,
                'message': 'Impossible to add attachment',
                'reason': 'Missing document'
              });
            } else {
              command.error(
                event.target.status,
                event.target.statusText,
                "Problem while retrieving document"
              );
            }
            throw 1;
          }
          throw event;
        });
    }

    // 2. We push the attachment
    function pushAttachment() {
      return that._put(
        param._id + '-' + param._attachment,
        param._blob
      );
    }

    // 3. We update the document
    function updateDocument() {
      if (document._attachments === undefined) {
        document._attachments = {};
      }
      document._attachments[param._attachment] = {
        "content_type": param._blob.type,
        "digest": digest,
        "length": param._blob.size
      };
      return that._put(
        param._id,
        new Blob([JSON.stringify(document)], {
          type: "application/json"
        }),
        METADATA_FOLDER
      );
    }

    // 4. onSuccess
    function onSuccess() {
      command.success({
        'digest': digest,
        'status': 201,
        'statusText': 'Created'
        // XXX are you sure this the attachment is created?
      });
    }

    // 5. onError
    function onError(event) {
      if (event instanceof ProgressEvent) {
        command.error(
          event.target.status,
          event.target.statusText,
          "Unable to put attachment"
        );
      } else {
        if (event !== 1) {
          throw event;
        }
      }
    }

    return getDocument()
      .then(pushAttachment)
      .then(updateDocument)
      .then(onSuccess)
      .fail(onError);
  };

  /**
   * Get all filenames belonging to a user from the document index
   *
   * @method allDocs
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  DropboxStorage.prototype.allDocs = function (command, param, options) {
    var list_url = '', result = [], my_storage = this,
      stripping_length = 3 + my_storage._application_name.length +
      METADATA_FOLDER.length;

    // Too specific, should be less storage dependent
    list_url = 'https://api.dropbox.com/1/metadata/sandbox/' +
      this._application_name + '/' + METADATA_FOLDER + '/' +
      "?list=true" +
      '&access_token=' + this._access_token;

    // We get a list of all documents
    jIO.util.ajax({
      "type": "GET",
      "url": list_url
    }).then(function (response) {
      var i, item, item_id, data, count, promise_list = [];
      data = JSON.parse(response.target.responseText);
      count = data.contents.length;

      // We loop aver all documents
      for (i = 0; i < count; i += 1) {
        item = data.contents[i];

        // If the element is a folder it is not included (storage specific)
        if (!item.is_dir) {
          // NOTE: the '/' at the begining of the path is stripped
          item_id = item.path.substr(stripping_length);
          // item.path[0] === '/' ?  : item.path
          // Prepare promise_list to fetch document in case of include_docs
          if (options.include_docs === true) {
            promise_list.push(my_storage._get(METADATA_FOLDER + '/' + item_id));
          }

          // Document is added to the result list
          result.push({
            id: item_id,
            value: {}
          });
        }
      }

      // NOTE: if promise_list is empty, success is triggered directly
      // else it fetch all documents and add them to the result
      return RSVP.all(promise_list);
    }).then(function (response_list) {
      var i, response_length;

      response_length = response_list.length;
      for (i = 0; i < response_length; i += 1) {
        result[i].doc = JSON.parse(response_list[i].target.response);
      }
      command.success({
        "data": {
          "rows": result,
          "total_rows": result.length
        }
      });
    }).fail(function (error) {
      if (error instanceof ProgressEvent) {
        command.error(
          "error",
          "did not work as expected",
          "Unable to call allDocs"
        );
      }
    });
  };

  // Storage specific remove method
  DropboxStorage.prototype._remove = function (key, path) {
    var DELETE_HOST, DELETE_PREFIX, DELETE_PARAMETERS, delete_url;
    DELETE_HOST = "https://api.dropbox.com/1";
    DELETE_PREFIX = "/fileops/delete/";
    if (path === undefined) {
      path = '';
    }
    DELETE_PARAMETERS = "?root=sandbox&path=" +
      this._application_name + '/' +
      path + '/' + key + "&access_token=" + this._access_token;
    delete_url = DELETE_HOST + DELETE_PREFIX + DELETE_PARAMETERS;
    return jIO.util.ajax({
      "type": "POST",
      "url": delete_url
    });
  };

  /**
   * Remove a document
   *
   * @method remove
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   */
  DropboxStorage.prototype.remove = function (command, param) {
    var that = this, document = {};
    // 1. get document
    function getDocument() {
      return that._get(METADATA_FOLDER + '/' + param._id)
        .then(function (answer) {
          document = JSON.parse(answer.target.responseText);
        });
    }

    // 2 Remove Document
    function removeDocument() {
      return that._remove(METADATA_FOLDER + '/' + param._id);
    }

    // 3 Remove its attachments
    function removeAttachments() {
      var promise_list = [], attachment_list = [], attachment_count = 0, i = 0;
      if (document.hasOwnProperty('_attachments')) {
        attachment_list = Object.keys(document._attachments);
        attachment_count = attachment_list.length;
      }
      for (i = 0; i < attachment_count; i += 1) {
        promise_list.push(that._remove(param._id + '-' + attachment_list[i]));
      }
      return RSVP.all(promise_list)
      // Even if it fails it is ok (no attachments)
        .fail(function (event_list) {
          var event_length = event_list.length, j = 0;
          for (j = 0; j < event_length; j += 1) {
            // If not a ProgressEvent, there is something wrong with the code.
            if (!event_list[j] instanceof ProgressEvent) {
              throw event_list[j];
            }
          }
        });
    }

    // 4 Notify Success
    function onSuccess(event) {
      if (event instanceof ProgressEvent) {
        command.success(
          event.target.status,
          event.target.statusText
        );
      } else {
        command.success(200, "OK");
      }
    }
    // 5 Notify Error
    function onError(event) {
      if (event instanceof ProgressEvent) {
        if (event.target.status === 404) {
          command.error(
            event.target.status,
            event.target.statusText,
            "Document not found"
          );
        } else {
          command.error(
            event.target.status,
            event.target.statusText,
            "Unable to delete document"
          );
        }
      }
    }
    // Remove the document
    return getDocument()
      .then(removeDocument)
      .then(removeAttachments)
      .then(onSuccess)
      .fail(onError);
  };

  /**
   * Remove a document Attachment
   *
   * @method remove
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   */
  DropboxStorage.prototype.removeAttachment = function (command, param) {
    var that = this, document = {};
    // Remove an attachment
    //       Then it should be tested
    return this._get(METADATA_FOLDER + '/' +  param._id)
      .then(function (answer) {
        document = JSON.parse(answer.target.responseText);
      })
      .then(function () {
        return that._remove(param._id + '-' + param._attachment);
      })
      .then(function (event) {
        delete document._attachments[param._attachment];
        if (objectIsEmpty(document._attachments)) {
          delete document._attachments;
        }
        return that._put(
          param._id,
          new Blob([JSON.stringify(document)], {
            type: "application/json"
          }),
          METADATA_FOLDER
        );
      })
      .then(function (event) {
        command.success(
          event.target.status,
          event.target.statusText,
          "Removed attachment"
        );
      })
      .fail(function (error) {
        if (error.target.status === 404) {
          command.error(
            error.target.status,
            "missing attachment",
            "Attachment not found"
          );
        }
        command.error(
          "not_found",
          "missing",
          "Unable to delete document Attachment"
        );
      });
  };

  jIO.addStorage('dropbox', DropboxStorage);
}));
