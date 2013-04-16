/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/

/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, $: true, btoa: true  */

// JIO Dav Storage Description :
// {
//   type: "dav",
//   url: {string}
// }

// {
//   type: "dav",
//   url: {string},
//   auth_type: {string}, (optional)
//     - "auto" (default) (not implemented)
//     - "basic"
//     - "digest" (not implemented)
//   realm: {string}, (optional)
//     - undefined (default) (not implemented)
//     - "<string>" realm name (not implemented)
//   username: {string},
//   password: {string}  (optional)
// }

// {
//   type: "dav",
//   url: {string},
//   encoded_login: {string}
// }

// {
//   type: "dav",
//   url: {string},
//   secured_login: {string} (not implemented)
// }

// NOTE: to get the authentication type ->
// curl --verbose  -X OPTION http://domain/
// In the headers: "WWW-Authenticate: Basic realm="DAV-upload"

// URL Characters convertion:
// If I want to retrieve the file which id is -> http://100%.json
// http://domain/collection/http://100%.json cannot be applied
// - '/' is col separator,
// - '%' is special char
// - '.' document and attachment separator
// http://100%.json will become
// - http:%2F%2F100%25.json to avoid bad request ('/', '%' -> '%2F', '%25')
// - http:%2F%2F100%25_.json to avoid ids conflicts ('.' -> '_.')
// - http:%252F%252F100%2525_.json to avoid request bad interpretation
//   ('%', '%25')
// The file will be saved as http:%2F%2F100%25_.json

jIO.addStorageType("dav", function (spec, my) {
  var priv = {}, that = my.basicStorage(spec, my), dav = {};

  // ATTRIBUTES //
  priv.url = null;
  priv.username = null;
  priv.password = null;
  priv.encoded_login = null;

  // CONSTRUCTOR //
  /**
   * Init the dav storage connector thanks to the description
   * @method __init__
   * @param  {object} description The description object
   */
  priv.__init__ = function (description) {
    priv.url = description.url || "";
    priv.url = priv.removeSlashIfLast(priv.url);
    // if (description.secured_login) {
    //    not implemented
    // } else
    if (description.encoded_login) {
      priv.encoded_login = description.encoded_login;
    } else if (description.auth_type) {
      if (description.auth_type === "basic") {
        priv.encoded_login = "Basic " +
          btoa((description.username || "") + ":" +
               (description.password || ""));
      }
    } else {
      priv.encoded_login = "";
    }
  };

  // OVERRIDES //
  that.specToStore = function () {
    // TODO: secured password
    // The encoded_login can be seen by anyone, we must find a way to secure it!
    // secured_login = encrypt(encoded_login)
    // encoded_login = decrypt(secured_login)
    return {
      "url": priv.url,
      "encoded_login": priv.encoded_login
    };
  };

  that.validateState = function () {
    if (typeof priv.url !== "string" || priv.url === "") {
      return "The webDav server URL is not provided";
    }
    if (priv.encoded_login === null) {
      return "Impossible to create the authorization";
    }
    return "";
  };

  // TOOLS //
  /**
   * Generate a new uuid
   * @method generateUuid
   * @return {string} The new uuid
   */
  priv.generateUuid = function () {
    var S4 = function () {
      /* 65536 */
      var i, string = Math.floor(
        Math.random() * 0x10000
      ).toString(16);
      for (i = string.length; i < 4; i += 1) {
        string = "0" + string;
      }
      return string;
    };
    return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() +
      S4() + S4();
  };

  // /**
  //  * Clones an object in deep
  //  * @method clone
  //  * @param  {object} object The object to clone
  //  * @return {object} The cloned object
  //  */
  // priv.clone = function (object) {
  //   var tmp = JSON.stringify(object);
  //   if (tmp === undefined) {
  //     return undefined;
  //   }
  //   return JSON.parse(tmp);
  // };

  /**
   * Replace substrings to another strings
   * @method recursiveReplace
   * @param  {string} string The string to do replacement
   * @param  {array} list_of_replacement An array of couple
   * ["substring to select", "selected substring replaced by this string"].
   * @return {string} The replaced string
   */
  priv.recursiveReplace = function (string, list_of_replacement) {
    var i, split_string = string.split(list_of_replacement[0][0]);
    if (list_of_replacement[1]) {
      for (i = 0; i < split_string.length; i += 1) {
        split_string[i] = priv.recursiveReplace(
          split_string[i],
          list_of_replacement.slice(1)
        );
      }
    }
    return split_string.join(list_of_replacement[0][1]);
  };

  /**
   * Changes / to %2F, % to %25 and . to _.
   * @method secureName
   * @param  {string} name The name to secure
   * @return {string} The secured name
   */
  priv.secureName = function (name) {
    return priv.recursiveReplace(name, [["/", "%2F"], ["%", "%25"]]);
  };

  /**
   * Restores the original name from a secured name
   * @method restoreName
   * @param  {string} secured_name The secured name to restore
   * @return {string} The original name
   */
  priv.restoreName = function (secured_name) {
    return priv.recursiveReplace(secured_name, [["%2F", "/"], ["%25", "%"]]);
  };

  /**
   * Convert document id and attachment id to a file name
   * @method idsToFileName
   * @param  {string} doc_id The document id
   * @param  {string} attachment_id The attachment id (optional)
   * @return {string} The file name
   */
  priv.idsToFileName = function (doc_id, attachment_id) {
    doc_id = priv.secureName(doc_id).split(".").join("_.");
    if (typeof attachment_id === "string") {
      attachment_id = priv.secureName(attachment_id).split(".").join("_.");
      return doc_id + "." + attachment_id;
    }
    return doc_id;
  };

  /**
   * Convert a file name to a document id (and attachment id if there)
   * @method fileNameToIds
   * @param  {string} file_name The file name to convert
   * @return {array} ["document id", "attachment id"] or ["document id"]
   */
  priv.fileNameToIds = function (file_name) {
    var separator_index = -1, split = file_name.split(".");
    split.slice(0, -1).forEach(function (file_name_part, index) {
      if (file_name_part.slice(-1) !== "_") {
        if (separator_index !== -1) {
          separator_index = new TypeError("Corrupted file name");
          separator_index.status = 24;
          throw separator_index;
        }
        separator_index = index;
      }
    });
    if (separator_index === -1) {
      return [priv.restoreName(priv.restoreName(
        file_name
      ).split("_.").join("."))];
    }
    return [
      priv.restoreName(priv.restoreName(
        split.slice(0, separator_index + 1).join(".")
      ).split("_.").join(".")),
      priv.restoreName(priv.restoreName(
        split.slice(separator_index + 1).join(".")
      ).split("_.").join("."))
    ];
  };

  /**
   * Removes the last character if it is a "/". "/a/b/c/" become "/a/b/c"
   * @method removeSlashIfLast
   * @param  {string} string The string to modify
   * @return {string} The modified string
   */
  priv.removeSlashIfLast = function (string) {
    if (string[string.length - 1] === "/") {
      return string.slice(0, -1);
    }
    return string;
  };

  /**
   * Modify an ajax object to add default values
   * @method makeAjaxObject
   * @param  {string} file_name The file name to add to the url
   * @param  {object} ajax_object The ajax object to override
   * @return {object} A new ajax object with default values
   */
  priv.makeAjaxObject = function (file_name, method, ajax_object) {
    ajax_object.type = method || ajax_object.type || "GET";
    ajax_object.url = priv.url + "/" + priv.secureName(file_name) +
      "?_=" + Date.now();
    ajax_object.async = ajax_object.async === false ? false : true;
    ajax_object.crossdomain = ajax_object.crossdomain === false ? false : true;
    ajax_object.headers = ajax_object.headers || {};
    ajax_object.headers.Authorization = ajax_object.headers.Authorization ||
      priv.encoded_login;
    return ajax_object;
  };

  /**
   * Runs all ajax requests for davStorage
   * @method ajax
   * @param  {string} doc_id The document id
   * @param  {string} attachment_id The attachment id, can be undefined
   * @param  {string} method The request method
   * @param  {object} ajax_object The request parameters (optional)
   */
  priv.ajax = function (doc_id, attachment_id, method, ajax_object) {
    var new_ajax_object = JSON.parse(JSON.stringify(ajax_object) || "{}");
    return $.ajax(priv.makeAjaxObject(
      priv.idsToFileName(doc_id || '', attachment_id),
      method,
      new_ajax_object
    ));//.always(then || function () {});
  };

  /**
   * Creates error objects for this storage
   * @method createError
   * @param {string} url url to clean up
   * @return {object} error The error object
   */
  priv.createError = function (status, message, reason) {
    var error = {
      "status": status,
      "message": message,
      "reason": reason
    };
    switch (status) {
    case 404:
      error.statusText = "Not found";
      break;
    case 405:
      error.statusText = "Method Not Allowed";
      break;
    case 409:
      error.statusText = "Conflicts";
      break;
    case 24:
      error.statusText = "Corrupted Document";
      break;
    }
    error.error = error.statusText.toLowerCase().split(" ").join("_");
    return error;
  };

  /**
   * Converts ajax error object to a JIO error object
   * @method ajaxErrorToJioError
   * @param  {object} ajax_error_object The ajax error object
   * @param  {string} message The error message
   * @param  {string} reason The error reason
   * @return {object} The JIO error object
   */
  priv.ajaxErrorToJioError = function (ajax_error_object, message, reason) {
    var jio_error_object = {};
    jio_error_object.status = ajax_error_object.status;
    jio_error_object.statusText = ajax_error_object.statusText;
    jio_error_object.error =
      ajax_error_object.statusText.toLowerCase().split(" ").join("_");
    jio_error_object.message = message;
    jio_error_object.reason = reason;
    return jio_error_object;
  };

  /**
   * Function that create an object containing jQuery like callbacks
   * @method makeJQLikeCallback
   * @return {object} jQuery like callback methods
   */
  priv.makeJQLikeCallback = function () {
    var result = null, emptyFun = function () {}, jql = {
      "respond": function () {
        result = arguments;
      },
      "to_return": {
        "always": function (func) {
          if (result) {
            func.apply(func, result);
            jql.to_return.always = emptyFun;
          } else {
            jql.respond = func;
          }
          return jql.to_return;
        },
        "then": function (func) {
          if (result) {
            func(result[1]);
            jql.to_return.then = emptyFun;
          } else {
            jql.respond = function (err, response) {
              func(response);
            };
          }
          return jql.to_return;
        }
      }
    };
    return jql;
  };

  // DAV REQUESTS //
  /**
   * Retrieve a document file
   * @method dav.getDocument
   * @param  {string} doc_id The document id
   */
  dav.getDocument = function (doc_id) {
    var doc, jql = priv.makeJQLikeCallback(), error = null;
    priv.ajax(doc_id, undefined, "GET").always(function (one, state, three) {
      if (state !== "success") {
        error = priv.ajaxErrorToJioError(
          one,
          "Cannot retrieve document",
          "Unknown"
        );
        if (one.status === 404) {
          error.reason = "Not Found";
        }
        return jql.respond(error, undefined);
      }
      try {
        doc = JSON.parse(one);
      } catch (e) {
        return jql.respond(priv.createError(
          24,
          "Cannot parse document",
          "Document is corrupted"
        ), undefined);
      }
      // document health is good
      return jql.respond(undefined, doc);
    });
    return jql.to_return;
  };

  /**
   * Retrieve an attachment file
   * @method dav.getAttachment
   * @param  {string} doc_id The document id
   * @param  {string} attachment_id The attachment id
   */
  dav.getAttachment = function (doc_id, attachment_id) {
    var jql = priv.makeJQLikeCallback(), error = null;
    priv.ajax(
      doc_id,
      attachment_id,
      "GET"
    ).always(function (one, state, three) {
      if (state !== "success") {
        error = priv.ajaxErrorToJioError(
          one,
          "Cannot retrieve attachment",
          "Unknown"
        );
        if (one.status === 404) {
          error.reason = "Not Found";
        }
        return jql.respond(error, undefined);
      }
      return jql.respond(undefined, one);
    });
    return jql.to_return;
  };

  /**
   * Uploads a document file
   * @method dav.putDocument
   * @param  {object} doc The document object
   */
  dav.putDocument = function (doc) {
    var jql = priv.makeJQLikeCallback();
    priv.ajax(doc._id, undefined, "PUT", {
      "dataType": "text",
      "data": JSON.stringify(doc)
    }).always(function (one, state, three) {
      if (state !== "success") {
        return jql.respond(priv.ajaxErrorToJioError(
          one,
          "Cannot upload document",
          "Unknown"
        ), undefined);
      }
      jql.respond(undefined, {"ok": true, "id": doc._id});
    });
    return jql.to_return;
  };

  /**
   * Uploads an attachment file
   * @method dav.putAttachment
   * @param  {string} doc_id The document id
   * @param  {string} attachment_id The attachment id
   * @param  {string} data The attachment data
   */
  dav.putAttachment = function (doc_id, attachment_id, data) {
    var jql = priv.makeJQLikeCallback();
    priv.ajax(doc_id, attachment_id, "PUT", {
      "dataType": "text",
      "data": data
    }).always(function (one, state, three) {
      if (state !== "success") {
        return jql.respond(priv.ajaxErrorToJioError(
          one,
          "Cannot upload attachment",
          "Unknown"
        ), undefined);
      }
      return jql.respond(undefined, {
        "ok": true,
        "id": doc_id,
        "attachment": attachment_id
      });
    });
    return jql.to_return;
  };

  /**
   * Deletes a document file
   * @method dav.removeDocument
   * @param  {string} doc_id The document id
   */
  dav.removeDocument = function (doc_id) {
    var jql = priv.makeJQLikeCallback(), error = null;
    priv.ajax(
      doc_id,
      undefined,
      "DELETE"
    ).always(function (one, state, three) {
      if (state !== "success") {
        error = priv.ajaxErrorToJioError(
          one,
          "Cannot delete document",
          "Unknown"
        );
        if (one.status === 404) {
          error.reason = "Not Found";
        }
        return jql.respond(error, undefined);
      }
      jql.respond(undefined, {"ok": true, "id": doc_id});
    });
    return jql.to_return;
  };

  /**
   * Deletes an attachment file
   * @method dav.removeAttachment
   * @param  {string} doc_id The document id
   * @param  {string} attachment_id The attachment id
   */
  dav.removeAttachment = function (doc_id, attachment_id) {
    var jql = priv.makeJQLikeCallback(), error = null;
    priv.ajax(
      doc_id,
      attachment_id,
      "DELETE"
    ).always(function (one, state, three) {
      if (state !== "success") {
        error = priv.ajaxErrorToJioError(
          one,
          "Cannot delete attachment",
          "Unknown"
        );
        if (one.status === 404) {
          error.reason = "Not Found";
        }
        return jql.respond(error, undefined);
      }
      jql.respond(undefined, {"ok": true, "id": doc_id});
    });
    return jql.to_return;
  };

  /**
   * Get a list of document file
   * @method dav.allDocs
   */
  dav.allDocs = function () {
    var jql = priv.makeJQLikeCallback(), rows = [];
    priv.ajax(undefined, undefined, "PROPFIND", {
      "dataType": "xml",
      "headers": {"Depth": 1}
    }).always(function (one, state, three) {
      var response, len;
      if (state !== "success") {
        return jql.respond(priv.ajaxErrorToJioError(
          one,
          "Cannot get the document list",
          "Unknown"
        ), undefined);
      }
      response = $(one).find("D\\:response, response");
      len = response.length;
      if (len === 1) {
        return jql.respond({"total_rows": 0, "rows": []});
      }
      response.each(function (i, data) {
        var row;
        if (i > 0) { // exclude parent folder
          row = {
            "id": "",
            "key": "",
            "value": {}
          };
          $(data).find("D\\:href, href").each(function () {
            row.id = $(this).text().split('/').slice(-1)[0];
            try {
              row.id = priv.fileNameToIds(row.id);
            } catch (e) {
              if (e.name === "TypeError" && e.status === 24) {
                return;
              } else {
                throw e;
              }
            }
            if (row.id.length !== 1) {
              row = undefined;
            } else {
              row.id = row.id[0];
              row.key = row.id;
            }
          });
          if (row !== undefined) {
            rows.push(row);
          }
        }
      });
      jql.respond(undefined, {
        "total_rows": rows.length,
        "rows": rows
      });
    });
    return jql.to_return;
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

  /**
   * Creates a new document
   * @method  post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    var doc_id = command.getDocId() || priv.generateUuid();
    dav.getDocument(doc_id).always(function (err, response) {
      if (err) {
        if (err.status === 404) {
          // the document does not already exist
          // updating document
          var doc = command.cloneDoc();
          doc._id = doc_id;
          return dav.putDocument(doc).always(function (err, response) {
            if (err) {
              return that.retry(err);
            }
            return that.success(response);
          });
        }
        if (err.status === 24) {
          return that.error(err);
        }
        // an error occured
        return that.retry(err);
      }
      // the document already exists
      return that.error(priv.createError(
        405,
        "Cannot create document",
        "Document already exists"
      ));
    });
  };

  /**
   * Creates or updates a document
   * @method  put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    dav.putDocument(command.cloneDoc()).always(function (err, response) {
      if (err) {
        // an error occured
        return that.retry(err);
      }
      // document updated
      return that.success(response);
    });
  };

  /**
   * Add an attachment to a document
   * @method  putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    var doc = null, doc_id = command.getDocId(), attachment_id, tmp;
    attachment_id = command.getAttachmentId();
    dav.getDocument(doc_id).always(function (err, response) {
      if (err) {
        // document not found or error
        tmp = that.retry;
        if (err.status === 404 ||
            err.status === 24) {
          tmp = that.error;
        }
        return tmp(err);
      }
      doc = response;
      doc._attachments = doc._attachments || {};
      doc._attachments[attachment_id] = {
        "length": command.getAttachmentLength(),
        "digest": "md5-" + command.md5SumAttachmentData(),
        "content_type": command.getAttachmentMimeType()
      };
      // put the attachment
      dav.putAttachment(
        doc_id,
        attachment_id,
        command.getAttachmentData()
      ).always(function (err, response) {
        if (err) {
          // an error occured
          return that.retry(err);
        }
        // update the document
        dav.putDocument(doc).always(function (err, response) {
          if (err) {
            return that.retry(err);
          }
          response.attachment = attachment_id;
          return that.success(response);
        });
      });
    });
  };

  /**
   * Get a document
   * @method  get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    dav.getDocument(command.getDocId()).always(function (err, response) {
      if (err) {
        if (err.status === 404 ||
            err.status === 24) {
          return that.error(err);
        }
        return that.retry(err);
      }
      return that.success(response);
    });
  };

  /**
   * Get an attachment
   * @method  getAttachment
   * @param  {object} command The JIO command
   */
  that.getAttachment = function (command) {
    dav.getAttachment(
      command.getDocId(),
      command.getAttachmentId()
    ).always(function (err, response) {
      if (err) {
        if (err.status === 404) {
          return that.error(err);
        }
        return that.retry(err);
      }
      return that.success(response);
    });
  };

  /**
   * Remove a document
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    var doc_id = command.getDocId(), count = 0, end;
    end = function () {
      count -= 1;
      if (count === 0) {
        that.success({"ok": true, "id": doc_id});
      }
    };
    dav.getDocument(doc_id).always(function (err, response) {
      var attachment_id = null;
      if (err) {
        if (err.status === 404) {
          return that.error(err);
        }
        if (err.status !== 24) { // 24 -> corrupted document
          return that.retry(err);
        }
        response = {};
      }
      count += 2;
      dav.removeDocument(doc_id).always(function (err, response) {
        if (err) {
          if (err.status === 404) {
            return that.error(err);
          }
          return that.retry(err);
        }
        return end();
      });
      for (attachment_id in response._attachments) {
        if (response._attachments.hasOwnProperty(attachment_id)) {
          count += 1;
          dav.removeAttachment(
            doc_id,
            attachment_id
          ).always(end);
        }
      }
      end();
    });
  };

  /**
   * Remove an attachment
   * @method removeAttachment
   * @param  {object} command The JIO command
   */
  that.removeAttachment = function (command) {
    var doc_id = command.getDocId(), doc, attachment_id;
    attachment_id = command.getAttachmentId();
    dav.getDocument(doc_id).always(function (err, response) {
      var still_has_attachments;
      if (err) {
        if (err.status === 404 ||
            err.status === 24) {
          return that.error(err);
        }
        return that.retry(err);
      }
      doc = response;
      if (typeof (doc._attachments || {})[attachment_id] !== "object") {
        return that.error(priv.createError(
          404,
          "Cannot remove attachment",
          "Not Found"
        ));
      }
      delete doc._attachments[attachment_id];
      // check if there is still attachments
      for (still_has_attachments in doc._attachments) {
        if (doc._attachments.hasOwnProperty(still_has_attachments)) {
          break;
        }
      }
      if (still_has_attachments === undefined) {
        delete doc._attachments;
      }
      doc._id = doc_id;
      dav.putDocument(doc).always(function (err, response) {
        if (err) {
          return that.retry(err);
        }
        dav.removeAttachment(
          doc_id,
          attachment_id
        ).always(function (err, response) {
          that.success({"ok": true, "id": doc_id, "attachment": attachment_id});
        });
      });
    });
  };

  /**
   * Gets a document list from a distant dav storage
   * Options:
   * - {boolean} include_docs Also retrieve the actual document content.
   * @method allDocs
   * @param  {object} command The JIO command
   */
  that.allDocs = function (command) {
    var count = 0, end, rows;
    end = function () {
      count -= 1;
      if (count === 0) {
        that.success(rows);
      }
    };
    dav.allDocs().always(function (err, response) {
      if (err) {
        return that.retry(err);
      }
      if (command.getOption("include_docs") === true) {
        count += 1;
        rows = response;
        rows.rows.forEach(function (row) {
          count += 1;
          dav.getDocument(
            row.id
          ).always(function (err, response) {
            if (err) {
              if (err.status === 404 || err.status === 24) {
                return that.error(err);
              }
              return that.retry(err);
            }
            row.doc = response;
            end();
          });
        });
        end();
      } else {
        that.success(response);
      }
    });
  };

  priv.__init__(spec);
  return that;
});
