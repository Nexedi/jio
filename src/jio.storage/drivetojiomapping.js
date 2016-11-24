/*jslint nomen: true*/
/*global RSVP, Blob*/
(function (jIO, RSVP, Blob) {
  "use strict";

  /**
   * The jIO FileSystemBridgeStorage extension
   *
   * @class FileSystemBridgeStorage
   * @constructor
   */
  function FileSystemBridgeStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }
  var DOCUMENT_EXTENSION = ".json",
    DOCUMENT_KEY = "/.jio_documents/",
    ROOT = "/";

  function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  }

  FileSystemBridgeStorage.prototype.get = function (id) {
    var context = this;
    return new RSVP.Queue()

      // First, try to get explicit reference to the document

      .push(function () {
        // First get the document itself if it exists
        return context._sub_storage.getAttachment(
          DOCUMENT_KEY,
          id + DOCUMENT_EXTENSION,
          {format: "json"}
        );
      })
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {

          // Second, try to get default attachment
          return context._sub_storage.allAttachments(ROOT)
            .push(function (attachment_dict) {
              if (attachment_dict.hasOwnProperty(id)) {
                return {};
              }
              throw new jIO.util.jIOError("Cannot find document " + id,
                                          404);
            });
        }
        throw error;
      });
  };

  FileSystemBridgeStorage.prototype.allAttachments = function (id) {
    var context = this;
    return context._sub_storage.allAttachments(ROOT)
      .push(function (attachment_dict) {
        if (attachment_dict.hasOwnProperty(id)) {
          return {
            enclosure: {}
          };
        }
        // Second get the document itself if it exists
        return context._sub_storage.getAttachment(
          DOCUMENT_KEY,
          id + DOCUMENT_EXTENSION
        )
          .push(function () {
            return {};
          }, function (error) {
            if ((error instanceof jIO.util.jIOError) &&
                (error.status_code === 404)) {
              throw new jIO.util.jIOError("Cannot find document " + id,
                                          404);
            }
            throw error;
          });
      });

  };

  FileSystemBridgeStorage.prototype.put = function (doc_id, param) {
    var context = this;
    // XXX Handle conflict!

    return context._sub_storage.putAttachment(
      DOCUMENT_KEY,
      doc_id + DOCUMENT_EXTENSION,
      new Blob([JSON.stringify(param)], {type: "application/json"})
    )
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return context._sub_storage.put(DOCUMENT_KEY, {})
            .push(function () {
              return context._sub_storage.putAttachment(
                DOCUMENT_KEY,
                doc_id + DOCUMENT_EXTENSION,
                new Blob([JSON.stringify(param)],
                         {type: "application/json"})
              );
            });
        }
        throw error;
      })
      .push(function () {
        return doc_id;
      });

  };

  FileSystemBridgeStorage.prototype.remove = function (doc_id) {
    var context = this,
      got_error = false;
    return new RSVP.Queue()

      // First, try to remove enclosure
      .push(function () {
        return context._sub_storage.removeAttachment(
          ROOT,
          doc_id
        );
      })

      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          got_error = true;
          return;
        }
        throw error;
      })

      // Second, try to remove explicit doc
      .push(function () {
        return context._sub_storage.removeAttachment(
          DOCUMENT_KEY,
          doc_id + DOCUMENT_EXTENSION
        );
      })

      .push(undefined, function (error) {
        if ((!got_error) && (error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return doc_id;
        }
        throw error;
      });

  };

  FileSystemBridgeStorage.prototype.hasCapacity = function (capacity) {
    return (capacity === "list");
  };

  FileSystemBridgeStorage.prototype.buildQuery = function () {
    var result_dict = {},
      context = this;
    return new RSVP.Queue()

      // First, get list of explicit documents

      .push(function () {
        return context._sub_storage.allAttachments(DOCUMENT_KEY);
      })
      .push(function (result) {
        var key;
        for (key in result) {
          if (result.hasOwnProperty(key)) {
            if (endsWith(key, DOCUMENT_EXTENSION)) {
              result_dict[key.substring(
                0,
                key.length - DOCUMENT_EXTENSION.length
              )] = null;
            }
          }
        }
      }, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return;
        }
        throw error;
      })

      // Second, get list of enclosure

      .push(function () {
        return context._sub_storage.allAttachments(ROOT);
      })
      .push(function (result) {
        var key;
        for (key in result) {
          if (result.hasOwnProperty(key)) {
            result_dict[key] = null;
          }
        }
      })

      // Finally, build the result

      .push(function () {
        var result = [],
          key;
        for (key in result_dict) {
          if (result_dict.hasOwnProperty(key)) {
            result.push({
              id: key,
              value: {}
            });
          }
        }
        return result;
      });

  };

  FileSystemBridgeStorage.prototype.getAttachment = function (id, name) {
    if (name !== "enclosure") {
      throw new jIO.util.jIOError("Only support 'enclosure' attachment",
                                  400);
    }

    return this._sub_storage.getAttachment(ROOT, id);
  };

  FileSystemBridgeStorage.prototype.putAttachment = function (id, name, blob) {
    if (name !== "enclosure") {
      throw new jIO.util.jIOError("Only support 'enclosure' attachment",
                                  400);
    }

    return this._sub_storage.putAttachment(
      ROOT,
      id,
      blob
    );
  };

  FileSystemBridgeStorage.prototype.removeAttachment = function (id, name) {
    if (name !== "enclosure") {
      throw new jIO.util.jIOError("Only support 'enclosure' attachment",
                                  400);
    }

    return this._sub_storage.removeAttachment(ROOT, id);
  };

  function cloneToDocumentExtension(context, options) {
    return context._sub_storage.getAttachment(ROOT,
                                                options.title)
      .push(function (result) {
        return jIO.util.readBlobAsText(result);
      })
      .push(function (text) {
        options.text_content = text.target.result;
        return context._sub_storage.putAttachment(
          DOCUMENT_KEY,
          options.title + DOCUMENT_EXTENSION,
          new Blob([JSON.stringify(options)],
                   {type: "application/json"})
        );
      });
  }

  FileSystemBridgeStorage.prototype.repair = function () {
    var context = this,
      attachment_dict = {},
      document_dict = {};
    return context._sub_storage.repair.apply(this._sub_storage, arguments)
      .push(function () {
        return context._sub_storage.allAttachments(ROOT);
      })
      .push(function (result_dict) {
        var key;
        for (key in result_dict) {
          if (result_dict.hasOwnProperty(key)) {
            if (key !== undefined) {
              attachment_dict[key] = null;
            }
          }
        }
        return context._sub_storage.allAttachments(DOCUMENT_KEY);
      })
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return context._sub_storage.put(DOCUMENT_KEY, {});
        }
        throw error;
      })
      .push(function (result_dict) {
        var key,
          attachment,
          extension,
          promise_list = [],
          options = {};
        for (key in result_dict) {
          if (result_dict.hasOwnProperty(key)) {
            if (key !== undefined) {
              document_dict[key] = null;
            }
          }
        }
        for (attachment in attachment_dict) {
          if (attachment_dict.hasOwnProperty(attachment)) {
            extension = attachment.slice((Math.max(0,
                            attachment.lastIndexOf(".")) || Infinity) + 1);
            options.type = extension;
            options.title = attachment;
            if (!document_dict.hasOwnProperty(attachment + '.json')) {
              promise_list.push(cloneToDocumentExtension(context, options));
            }
          }
        }
        return RSVP.all(promise_list);
      });
  };

  jIO.addStorage('drivetojiomapping', FileSystemBridgeStorage);

}(jIO, RSVP, Blob));
