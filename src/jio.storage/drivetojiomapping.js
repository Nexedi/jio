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
    DOCUMENT_REGEXP = new RegExp("^([\\w=]+)" +
                                 DOCUMENT_EXTENSION + "$"),
    DOCUMENT_KEY = "/.jio_documents/",
    ROOT = "/";

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
            if (DOCUMENT_REGEXP.test(key)) {
              result_dict[DOCUMENT_REGEXP.exec(key)[1]] = null;
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

  FileSystemBridgeStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  jIO.addStorage('drivetojiomapping', FileSystemBridgeStorage);

}(jIO, RSVP, Blob));
