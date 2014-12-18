/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global window, jIO, RSVP, btoa, DOMParser, Blob, console*/

// JIO Dav Storage Description :
// {
//   type: "dav",
//   url: {string}
//   // No Authentication Here
// }

// {
//   type: "dav",
//   url: {string},
//   basic_login: {string} // Basic authentication
// }

// NOTE: to get the authentication type ->
// curl --verbose  -X OPTION http://domain/
// In the headers: "WWW-Authenticate: Basic realm="DAV-upload"

(function (jIO) {
  "use strict";

  function ajax(storage, options) {
    if (options === undefined) {
      options = {};
    }
    if (storage._authorization !== undefined) {
      if (options.headers === undefined) {
        options.headers = {};
      }
      options.headers.Authorization = storage._authorization;
    }
//       if (start !== undefined) {
//         if (end !== undefined) {
//           headers.Range = "bytes=" + start + "-" + end;
//         } else {
//           headers.Range = "bytes=" + start + "-";
//         }
//       }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax(options);
      });
  }

  function restrictDocumentId(id) {
    if (id.indexOf("/") !== 0) {
      throw new jIO.util.jIOError("id " + id + " is forbidden (no begin /)",
                                  400);
    }
    if (id.lastIndexOf("/") !== (id.length - 1)) {
      throw new jIO.util.jIOError("id " + id + " is forbidden (no end /)",
                                  400);
    }
    return id;
  }

  function restrictAttachmentId(id) {
    if (id.indexOf("/") !== -1) {
      throw new jIO.util.jIOError("attachment " + id + " is forbidden",
                                  400);
    }
  }

  /**
   * The JIO WebDAV Storage extension
   *
   * @class DavStorage
   * @constructor
   */
  function DavStorage(spec) {
    if (typeof spec.url !== 'string') {
      throw new TypeError("DavStorage 'url' is not of type string");
    }
    // Remove last slash
    this._url = spec.url.replace(/\/$/, '');
    // XXX digest login
    if (typeof spec.basic_login === 'string') {
//       this._auth_type = 'basic';
      this._authorization = "Basic " + spec.basic_login;
//     } else {
//       this._auth_type = 'none';
    }

  }

  DavStorage.prototype.put = function (param) {
    // XXX Reject if param has other properties than _id
    return ajax(this, {
      type: "MKCOL",
      url: this._url + param._id
    });
  };

  DavStorage.prototype.get = function (param) {

    var id = restrictDocumentId(param._id),
      context = this;

    return new RSVP.Queue()
      .push(function () {
        return ajax(context, {
          type: "PROPFIND",
          url: context._url + id,
          dataType: "text",
          headers: {
            Depth: "1"
          }
        });
      })


      .push(function (response) {
        // Extract all meta informations and return them to JSON

        var i,
          result = {
            "title": param._id
          },
          attachment = {},
          id,
          attachment_list = new DOMParser().parseFromString(
            response.target.responseText,
            "text/xml"
          ).querySelectorAll(
            "D\\:response, response"
          );

        // exclude parent folder and browse
        for (i = 1; i < attachment_list.length; i += 1) {
          // XXX Only get files for now
          id = attachment_list[i].querySelector("D\\:href, href").
            textContent.split('/').slice(-1)[0];
          // XXX Ugly
          if ((id !== undefined) && (id !== "")) {
            attachment[id] = {};
          }
        }
        if (attachment.length !== 0) {
          result._attachments = attachment;
        }
        return result;

      }, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });

  };


  DavStorage.prototype.putAttachment = function (param) {
    var id = restrictDocumentId(param._id);
    restrictAttachmentId(param._attachment);

    return ajax(this, {
      type: "PUT",
      url: this._url + id + param._attachment,
      data: param._blob
    })
      .push(undefined, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 403)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });

  };

  DavStorage.prototype.getAttachment = function (param) {
    var id = restrictDocumentId(param._id),
      context = this;
    restrictAttachmentId(param._attachment);

    return new RSVP.Queue()
      .push(function () {
        return ajax(context, {
          type: "GET",
          url: context._url + id + param._attachment,
          dataType: "blob"
        });
      })
      .push(function (response) {
        return new Blob(
          [response.target.response],
          {"type": response.target.getResponseHeader('Content-Type') ||
                   "application/octet-stream"}
        );
      }, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });

  };

  DavStorage.prototype.removeAttachment = function (param) {
    var id = restrictDocumentId(param._id),
      context = this;
    restrictAttachmentId(param._attachment);

    return new RSVP.Queue()
      .push(function () {
        return ajax(context, {
          type: "DELETE",
          url: context._url + id + param._attachment
        });
      })
      .push(undefined, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });
  };

  // JIO COMMANDS //

  // wedDav methods rfc4918 (short summary)
  // COPY     Reproduces single resources (files) and collections (directory
  //          trees). Will overwrite files (if specified by request) but will
  //          respond 209 (Conflict) if it would overwrite a tree
  // DELETE   deletes files and directory trees
  // GET      just the vanilla HTTP/1.1 behaviour
  // HEAD     ditto
  // LOCK     locks a resources
  // MKCOL    creates a directory
  // MOVE     Moves (rename or copy) a file or a directory tree. Will
  //          'overwrite' files (if specified by the request) but will respond
  //          209 (Conflict) if it would overwrite a tree.
  // OPTIONS  If WebDAV is enabled and available for the path this reports the
  //          WebDAV extension methods
  // PROPFIND Retrieves the requested file characteristics, DAV lock status
  //          and 'dead' properties for individual files, a directory and its
  //          child files, or a directory tree
  // PROPPATCHset and remove 'dead' meta-data properties
  // PUT      Update or create resource or collections
  // UNLOCK   unlocks a resource

  // Notes: all Ajax requests should be CORS (cross-domain)
  // adding custom headers triggers preflight OPTIONS request!
  // http://remysharp.com/2011/04/21/getting-cors-working/

  jIO.addStorage('dav', DavStorage);

}(jIO));
