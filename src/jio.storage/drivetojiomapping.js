/*jslint nomen: true, maxlen: 200*/
/*global console, RSVP, Blob*/
(function (jIO) {
  "use strict";

  /**
   * The jIO FileSystemBridgeStorage extension
   *
   * @class FileSystemBridgeStorage
   * @constructor
   */
  function FileSystemBridgeStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._document_key = "/.jio_documents/";
    this._attachment_key = "/.jio_attachments/";
  }
  var DOCUMENT_EXTENSION = ".json",
    ROOT = "/";

  FileSystemBridgeStorage.prototype.get = function (param) {
    var context = this,
      json_document,
      explicit_document = false;
    return new RSVP.Queue()

      // First, try to get explicit reference to the document

      .push(function () {
        // First get the document itself if it exists
        return context._sub_storage.getAttachment({
          "_id": context._document_key,
          "_attachment": param._id + DOCUMENT_EXTENSION
        });
      })
      .push(function (blob) {
        return new RSVP.Queue()
          .push(function () {
            return jIO.util.readBlobAsText(blob);
          })
          .push(function (text) {
            explicit_document = true;
            return JSON.parse(text.target.result);
          });
      }, function (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 404)) {
          return {};
        }
        throw error;
      })

      // Second, try to get default attachment

      .push(function (result) {
        json_document = result;

        return context._sub_storage.get({
          "_id": ROOT
        });
      })

      .push(function (directory_document) {
        if (directory_document._attachments.hasOwnProperty(param._id)) {
          json_document._attachments = {
            enclosure: {}
          };
        } else {
          if (!explicit_document) {
            throw new jIO.util.jIOError("Cannot find document", 404);
          }
        }
        return json_document;
      });

  };

  FileSystemBridgeStorage.prototype.post = function (param) {
    var doc_id = param._id;

    if (doc_id === undefined) {
      doc_id = jIO.util.generateUuid();
    }

    param._id = doc_id;
    return this.put(param);
  };

  FileSystemBridgeStorage.prototype.put = function (param) {
    var context = this,
      doc_id = param._id;
    // XXX Handle conflict!
    // XXX Put empty enclosure directly if json is empty

    return context._sub_storage.putAttachment({
      "_id": context._document_key,
      "_attachment": doc_id + DOCUMENT_EXTENSION,
      "_blob": new Blob([JSON.stringify(param)], {type: "application/json"})
    })
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 404)) {
          return context._sub_storage.put({
            "_id": context._document_key
          })
            .push(function () {
              return context._sub_storage.putAttachment({
                "_id": context._document_key,
                "_attachment": doc_id + DOCUMENT_EXTENSION,
                "_blob": new Blob([JSON.stringify(param)], {type: "application/json"})
              });
            });
        }
        throw error;
      })
      .push(function () {
        return doc_id;
      });

  };

  FileSystemBridgeStorage.prototype.remove = function (param) {
    var context = this,
      got_error = false,
      doc_id = param._id;
    return new RSVP.Queue()

      // First, try to remove enclosure
      .push(function () {
        return context._sub_storage.removeAttachment({
          "_id": ROOT,
          "_attachment": doc_id
        });
      })

      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 404)) {
          got_error = true;
          return;
        }
        throw error;
      })

      // Second, try to remove explicit doc
      .push(function () {
        return context._sub_storage.removeAttachment({
          "_id": context._document_key,
          "_attachment": doc_id + DOCUMENT_EXTENSION
        });
      })

      .push(undefined, function (error) {
        if ((!got_error) && (error instanceof jIO.util.jIOError) && (error.status_code === 404)) {
          return;
        }
        throw error;
      });

  };

  FileSystemBridgeStorage.prototype.hasCapacity = function (capacity) {
    if (capacity === "list") {
      return true;
    }
    return false;
  };

  FileSystemBridgeStorage.prototype.buildQuery = function () {
    var result_dict = {},
      context = this;
    return new RSVP.Queue()

      // First, get list of explicit documents

      .push(function () {
        return context._sub_storage.get({
          "_id": context._document_key
        });
      })
      .push(function (result) {
        var key;
        for (key in result._attachments) {
          if (result._attachments.hasOwnProperty(key)) {
            result_dict[key.slice(0, key.length - DOCUMENT_EXTENSION.length)] = null;
          }
        }
      }, function (error) {
        if ((error instanceof jIO.util.jIOError) && (error.status_code === 404)) {
          return;
        }
        throw error;
      })

      // Second, get list of enclosure

      .push(function () {
        return context._sub_storage.get({
          "_id": ROOT
        });
      })
      .push(function (result) {
        var key;
        for (key in result._attachments) {
          if (result._attachments.hasOwnProperty(key)) {
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

  FileSystemBridgeStorage.prototype.getAttachment = function (param) {
    if (param._attachment !== "enclosure") {
      throw new Error("Only support 'enclosure' attachment");
    }

    return this._sub_storage.getAttachment({
      "_id": ROOT,
      "_attachment": param._id
    });
  };

  FileSystemBridgeStorage.prototype.putAttachment = function (param) {
    if (param._attachment !== "enclosure") {
      throw new Error("Only support 'enclosure' attachment");
    }

    return this._sub_storage.putAttachment({
      "_id": ROOT,
      "_attachment": param._id,
      "_blob": param._blob
    });
  };

  FileSystemBridgeStorage.prototype.removeAttachment = function (param) {
    if (param._attachment !== "enclosure") {
      throw new Error("Only support 'enclosure' attachment");
    }

    return this._sub_storage.removeAttachment({
      "_id": ROOT,
      "_attachment": param._id
    });
  };

  jIO.addStorage('drivetojiomapping', FileSystemBridgeStorage);

}(jIO));
