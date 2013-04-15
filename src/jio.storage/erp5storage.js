/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/
/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, $: true, btoa: true  */

// JIO Erp5 Storage Description :
// {
//   type: "erp5",
//   url: {string}
// }

// {
//   type: "erp5",
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
//   type: "erp5",
//   url: {string},
//   encoded_login: {string}
// }

// {
//   type: "erp5",
//   url: {string},
//   secured_login: {string} (not implemented)
// }

jIO.addStorageType("erp5", function (spec, my) {
  var priv = {}, that = my.basicStorage(spec, my), erp5 = {};

  // ATTRIBUTES //
  priv.url = null;
  priv.encoded_login = null;

  // CONSTRUCTOR //
  /**
   * Init the erp5 storage connector thanks to the description
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
      return "The erp5 server URL is not provided";
    }
    if (priv.encoded_login === null) {
      return "Impossible to create the authorization";
    }
    return "";
  };

  // TOOLS //
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
   * @param  {object} json The JSON object
   * @param  {string} method The erp5 request method
   * @param  {object} ajax_object The ajax object to override
   * @return {object} A new ajax object with default values
   */
  priv.makeAjaxObject = function (json, method, ajax_object) {
    ajax_object.type = "POST";
    ajax_object.dataType = "text";
    ajax_object.data = JSON.stringify(json);
    ajax_object.url = priv.url + "/JIO_" + method +
      "?_=" + Date.now();
    ajax_object.async = ajax_object.async === false ? false : true;
    ajax_object.crossdomain = ajax_object.crossdomain === false ? false : true;
    ajax_object.headers = ajax_object.headers || {};
    if (ajax_object.headers.Authorization || priv.encoded_login) {
      ajax_object.headers.Authorization = ajax_object.headers.Authorization ||
        priv.encoded_login;
    }
    return ajax_object;
  };

  /**
   * Runs all ajax requests for erp5Storage
   * @method ajax
   * @param  {object} json The JSON object
   * @param  {string} method The erp5 request method
   * @param  {object} ajax_object The request parameters (optional)
   */
  priv.ajax = function (json, method, ajax_object) {
    return $.ajax(priv.makeAjaxObject(json, method, ajax_object || {}));
    //.always(then || function () {});
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
        }
      }
    };
    return jql;
  };

  // ERP5 REQUESTS //
  /**
   * Sends a request to ERP5
   * @method erp5.genericRequest
   * @param  {object} doc The document object
   * @param  {string} method The ERP5 request method
   * @param  {boolean} parse Parse the data received if true
   */
  erp5.genericRequest = function (json, method, parse) {
    var jql = priv.makeJQLikeCallback(), error = null;
    priv.ajax(json, method).always(function (one, state, three) {
      if (state !== "success") {
        error = priv.ajaxErrorToJioError(
          one,
          "An error occured on " + method,
          "Unknown"
        );
        if (one.status === 404) {
          error.reason = "Not Found";
        }
        return jql.respond(error, undefined);
      }
      if (parse) {
        try {
          one = JSON.parse(one);
        } catch (e) {
          return jql.respond(priv.createError(
            24,
            "Cannot parse data",
            "Corrupted data"
          ), undefined);
        }
      }
      if (typeof one.status === "number" && typeof one.error === "string") {
        return jql.respond(one, undefined);
      }
      return jql.respond(undefined, one);
    });
    return jql.to_return;
  };

  // JIO COMMANDS //
  /**
   * The ERP5 storage generic command
   * @method genericCommand
   * @param  {object} json The json to send
   * @param  {string} method The ERP5 request method
   */
  priv.genericCommand = function (json, method) {
    erp5.genericRequest(
      json,
      method,
      method !== "getAttachment" // parse received data if not getAttachment
    ).always(function (err, response) {
      if (err) {
        return that.error(err);
      }
      return that.success(response);
    });
  };

  /**
   * Creates a new document
   * @method  post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    priv.genericCommand(command.cloneDoc(), "post");
  };

  /**
   * Creates or updates a document
   * @method  put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    priv.genericCommand(command.cloneDoc(), "put");
  };

  /**
   * Add an attachment to a document
   * @method  putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    priv.genericCommand(command.cloneDoc(), "putAttachment");
  };

  /**
   * Get a document
   * @method  get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    priv.genericCommand(command.cloneDoc(), "get");
  };

  /**
   * Get an attachment
   * @method  getAttachment
   * @param  {object} command The JIO command
   */
  that.getAttachment = function (command) {
    priv.genericCommand(command.cloneDoc(), "getAttachment");
  };

  /**
   * Remove a document
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    priv.genericCommand(command.cloneDoc(), "remove");
  };

  /**
   * Remove an attachment
   * @method removeAttachment
   * @param  {object} command The JIO command
   */
  that.removeAttachment = function (command) {
    priv.genericCommand(command.cloneDoc(), "removeAttachment");
  };

  /**
   * Gets a document list from a distant erp5 storage
   * Options:
   * - {boolean} include_docs Also retrieve the actual document content.
   * @method allDocs
   * @param  {object} command The JIO command
   */
  that.allDocs = function (command) {
    priv.genericCommand({
      "query": command.getOption("query"),
      "include_docs": command.getOption("include_docs")
    }, "allDocs");
  };

  /**
   * Checks a document state
   * @method check
   * @param  {object} command The JIO command
   */
  that.check = function (command) {
    priv.genericCommand(command.cloneDoc(), "check");
  };

  /**
   * Restore a document state to a coherent state
   * @method repair
   * @param  {object} command The JIO command
   */
  that.repair = function (command) {
    priv.genericCommand(command.cloneDoc(), "repair");
  };

  priv.__init__(spec);
  return that;
});
