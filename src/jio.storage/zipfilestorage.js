/*global jIO, RSVP, DOMParser, Blob, JSZip */
/*jslint nomen: true*/

/*
 * Copyright 2016, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

// JIO ZipFile Storage Description :
// {
//   type: "zipfile",
//   file: {string, blob, array},
// }
// You can get archived file by getAttachment("", "")

(function (jIO, RSVP, JSZip) {
  "use strict";

  //if (JSZip.external.Promise !== RSVP.Promise) {
  //  JSZip.external.Promise = RSVP.Promise;
  //}

  function loadZip(storage) {
    var queue;
    if (!storage._error) {
      if (storage._zip) {
        queue = new RSVP.Queue()
          .push(function () {
            return storage._zip;
          });
      } else {
        queue = storage._unzip_queue;
      }
    } else {
      throw storage._error;
    }
    return queue;
  }


  function restrictDocumentId(id) {
    if (id.indexOf("/") !== 0) {
      throw new jIO.util.jIOError("id " + id + " is forbidden (no begin /)",
                                  400);
    }
    if (id.lastIndexOf("/") !== (id.length - 1) && id !== "") {
      throw new jIO.util.jIOError("id " + id + " is forbidden (no end /)",
                                  400);
    }
    // remove started '/'
    return id.slice(1);
  }

  function restrictAttachmentId(id, name) {
    if (name.indexOf("/") !== -1) {
      throw new jIO.util.jIOError("attachment " + name + " is forbidden",
                                  400);
    }
    return id + name;
  }

  /**
   * The JIO WebDAV Storage extension
   *
   * @class ZipFileStorage
   * @constructor
   */
  function ZipFileStorage(spec) {
    if (spec.file) {
      //if (spec.file instanceof Blob) {
      //  throw new TypeError("ZipFileStorage 'url' is not of type string");
      //}
      var storage = this;
      this._unzip_queue = new RSVP.Queue()
        .push(function () {
          var zip = new JSZip();
          return zip.loadAsync(spec.file, {
            createFolders: true,
            checkCRC32: true
          })
            .then(function () {
              storage._zip = zip;
            }, function (error) {
              storage._error = error;
            });
        });
    } else {
      this._zip = new JSZip();
    }
  }

  ZipFileStorage.prototype.put = function (id, param) {
    id = restrictDocumentId(id);
    if (Object.getOwnPropertyNames(param).length > 0) {
      // Reject if param has some properties
      throw new jIO.util.jIOError("Can not store properties: " +
                                  Object.getOwnPropertyNames(param), 400);
    }
    return loadZip(this)
      .push(function (zip) {
        zip.folder(id);
        return {};
      });
  };

  ZipFileStorage.prototype.remove = function (id) {
    id = restrictDocumentId(id);
    return loadZip(this)
      .push(function (zip) {
        zip.remove(id);
        return {};
      });
  };

  ZipFileStorage.prototype.get = function (id) {
    id = restrictDocumentId(id);
    return loadZip(this)
      .push(function (zip) {
        var filename,
          file;
        if (id === "") {
          return {};
        }
        for (filename in zip.files) {
          if (zip.files.hasOwnProperty(filename)) {
            if (filename + '/' === id) {
              file = zip.files[filename];
              if (!file.dir) {
                throw new jIO.util.jIOError("Cannot find document", 404);
              }
              return {};
            }
          }
        }
        throw new jIO.util.jIOError("Cannot find document", 404);
      });
  };

  ZipFileStorage.prototype.allAttachments = function (id) {
    id = restrictDocumentId(id);
    return loadZip(this)
      .push(function (zip) {
        var filename,
          file,
          attachments = {},
          relativePath;
        if (id !== "" && !(zip.files.hasOwnProperty(id) && zip.files[id].dir)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        for (filename in zip.files) {
          if (zip.files.hasOwnProperty(filename)) {
            if (filename.slice(0, id.length) === id) {
              file = zip.files[filename];
              if (!file.dir) {
                relativePath = filename.slice(
                  id.length,
                  filename.length
                );
                if (relativePath.indexOf('/') === -1) {
                  attachments[relativePath] = {};
                }
              }
            }
          }
        }
        return attachments;
      });
  };


  ZipFileStorage.prototype.putAttachment = function (id, name, blob) {
    id = restrictDocumentId(id);
    var attachId = restrictAttachmentId(id, name);

    return loadZip(this)
      .push(function (zip) {
        if (id !== "" && !(zip.files.hasOwnProperty(id) && zip.files[id].dir)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        zip.file(attachId, blob);
        return {};
      });
  };

  ZipFileStorage.prototype.getAttachment = function (id, name) {
    var archive_request = false,
      attachId;
    if (id === "/" && name === "/") {
      archive_request = true;
    } else {
      id = restrictDocumentId(id);
      attachId = restrictAttachmentId(id, name);
    }

    return loadZip(this)
      .push(function (zip) {
        if (archive_request) {
          return zip.generateAsync({type: "blob"});
        }
        if (id !== "" && !(zip.files.hasOwnProperty(id) && zip.files[id].dir)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        if (!(zip.files.hasOwnProperty(attachId) && !zip.files[attachId].dir)) {
          throw new jIO.util.jIOError("Cannot find attachment: "
            + id + " , " + name,
            404);
        }
        return zip.file(attachId).async('blob');
      });
  };

  ZipFileStorage.prototype.removeAttachment = function (id, name) {
    id = restrictDocumentId(id);
    var attachId = restrictAttachmentId(id, name);

    return loadZip(this)
      .push(function (zip) {
        if (id !== "" && !(zip.files.hasOwnProperty(id) && zip.files[id].dir)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        if (!(zip.files.hasOwnProperty(attachId) && !zip.files[attachId].dir)) {
          throw new jIO.util.jIOError("Cannot find attachment: "
            + id + " , " + name,
            404);
        }
        zip.remove(attachId);
        return {};
      });
  };

  jIO.addStorage('zipfile', ZipFileStorage);

}(jIO, RSVP, JSZip));
