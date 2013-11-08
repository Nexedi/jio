/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
// JIO Erp5 Storage Description :
// {
//   type: "erp5"
//   url: {string}
//   mode: {string} (optional)
//   - "generic" (default)
//   - "erp5_only"
//
// with
//
//   auth_type: {string} (optional)
//     - "none" (default)
//     - "basic" (not implemented)
//     - "digest" (not implemented)
//   username: {string}
//   password: {string} (optional)
//   - no password (default)
//
// or
//
//   encoded_login: {string} (not implemented)
//
// or
//
//   secured_login: {string} (not implemented)
// }

/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jQuery, complex_queries */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jQuery);
}(['jio', 'jquery'], function (jIO, $) {
  "use strict";

  function ERP5Storage(spec) {
    var priv = {}, that = this, erp5 = {};

    // ATTRIBUTES //
    priv.url = null;
    priv.mode = "generic";
    priv.auth_type = "none";
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
      if (description.mode === "erp5_only") {
        priv.mode = "erp5_only";
      }
      if (description.encoded_login) {
        priv.encoded_login = description.encoded_login;
      } else {
        if (description.username) {
          priv.encoded_login =
            "__ac_name=" + priv.convertToUrlParameter(description.username) +
            "&" + (typeof description.password === "string" ?
                   "__ac_password=" +
                   priv.convertToUrlParameter(description.password) + "&" : "");
        } else {
          priv.encoded_login = "";
        }
      }
    };

    // TOOLS //
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
     * Changes & to %26
     * @method convertToUrlParameter
     * @param  {string} parameter The parameter to convert
     * @return {string} The converted parameter
     */
    priv.convertToUrlParameter = function (parameter) {
      return priv.recursiveReplace(parameter, [[" ", "%20"], ["&", "%26"]]);
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
     * @param  {object} json The JSON object
     * @param  {object} option The option object
     * @param  {string} method The erp5 request method
     * @param  {object} ajax_object The ajax object to override
     * @return {object} A new ajax object with default values
     */
    priv.makeAjaxObject = function (json, option, method, ajax_object) {
      ajax_object.type = "POST";
      ajax_object.dataType = "json";
      ajax_object.data = [
        {"name": "doc", "value": JSON.stringify(json)},
        {"name": "option", "value": JSON.stringify(option)},
        {"name": "mode", "value": priv.mode}
      ];
      ajax_object.url = priv.url + "/JIO_" + method +
        "?" + priv.encoded_login + "_=" + Date.now();
      ajax_object.async = ajax_object.async === false ? false : true;
      ajax_object.crossdomain =
        ajax_object.crossdomain === false ? false : true;
      ajax_object.headers = ajax_object.headers || {};
      return ajax_object;
    };

    /**
     * Runs all ajax requests for erp5Storage
     * @method ajax
     * @param  {object} json The JSON object
     * @param  {object} option The option object
     * @param  {string} method The erp5 request method
     * @param  {object} ajax_object The request parameters (optional)
     */
    priv.ajax = function (json, option, method, ajax_object) {
      return $.ajax(
        priv.makeAjaxObject(json, option, method, ajax_object || {})
      );
      //.always(then || function () {});
    };

    /**
     * Creates error objects for this storage
     * @method createError
     * @param {string} url url to clean up
     * @return {object} error The error object
     */
    priv.createError = function (status, message, reason) {
      return {
        "status": status,
        "message": message,
        "reason": reason
      };
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
      var result = null, emptyFun = function () {
        return;
      }, jql = {
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

    /**
     * Use option object and converts a query to a compatible ERP5 Query.
     *
     * @param  {Object} option The command options
     */
    priv.convertToErp5Query = function (option) {
      option.query = complex_queries.QueryFactory.create(option.query || "");
      if (option.wildcard_character === undefined ||
          (option.wildcard_character !== null &&
           typeof option.wildcard_character !== 'string')) {
        option.wildcard_character = '%';
      } else {
        option.wildcard_character = option.wildcard_character || '';
      }
      option.query.onParseSimpleQuery = function (object) {
        if (option.wildcard_character.length === 1 &&
            object.parsed.operator === '=') {
          object.parsed.operator = 'like';
          if (option.wildcard_character === '%') {
            object.parsed.value =
              object.parsed.value.replace(/_/g, '\\_');
          } else if (option.wildcard_character === '_') {
            object.parsed.value =
              object.parsed.value.replace(/%/g, '\\%').replace(/_/g, '%');
          } else {
            object.parsed.value =
              object.parsed.value.replace(
                /([%_])/g,
                '\\$1'
              ).replace(
                new RegExp(complex_queries.stringEscapeRegexpCharacters(
                  option.wildcard_character
                ), 'g'),
                '%'
              );
          }
        }
      };
      option.query = option.query.parse();
    };

    // ERP5 REQUESTS //
    /**
     * Sends a request to ERP5
     * @method erp5.genericRequest
     * @param  {object} doc The document object
     * @param  {object} option The option object
     * @param  {string} method The ERP5 request method
     */
    erp5.genericRequest = function (method, json, option) {
      var jql = priv.makeJQLikeCallback(), error = null;
      priv.ajax(json, option, method).always(function (one, state) {
        if (state === "parsererror") {
          return jql.respond(priv.createError(
            24,
            "Cannot parse data",
            "Corrupted data"
          ), undefined);
        }
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
        if (one.err !== null) {
          return jql.respond(one.err, undefined);
        }
        if (one.response !== null) {
          return jql.respond(undefined, one.response);
        }
        return jql.respond(priv.createError(
          24,
          "Cannot parse data",
          "Corrupted data"
        ), undefined);
      });
      return jql.to_return;
    };

    // JIO COMMANDS //
    /**
     * The ERP5 storage generic command
     * @method genericCommand
     * @param  {object} command The JIO command object
     * @param  {string} method The ERP5 request method
     */
    priv.genericCommand = function (method, command, param, option) {
      if (complex_queries !== undefined &&
          method === 'allDocs' &&
          option.query) {
        priv.convertToErp5Query(option);
      }
      erp5.genericRequest(
        method,
        param,
        option
      ).always(function (err, response) {
        if (err) {
          return command.error(err);
        }
        if (['get', 'getAttachment', 'allDocs'].indexOf(method) === -1) {
          return command.success(response);
        }
        return command.success({"data": response});
      });
    };

    /**
     * Creates a new document
     * @method  post
     * @param  {object} command The JIO command
     */
    that.post = function (command, metadata, options) {
      priv.genericCommand("post", command, metadata, options);
    };

    /**
     * Creates or updates a document
     * @method  put
     * @param  {object} command The JIO command
     */
    that.put = function (command, metadata, options) {
      priv.genericCommand("put", command, metadata, options);
    };

    /**
     * Add an attachment to a document
     * @method  putAttachment
     * @param  {object} command The JIO command
     */
    that.putAttachment = function (command, param, options) {
      priv.genericCommand("putAttachment", command, param, options);
    };

    /**
     * Get a document
     * @method  get
     * @param  {object} command The JIO command
     */
    that.get = function (command, param, options) {
      priv.genericCommand("get", command, param, options);
    };

    /**
     * Get an attachment
     * @method  getAttachment
     * @param  {object} command The JIO command
     */
    that.getAttachment = function (command, param, options) {
      priv.genericCommand("getAttachment", command, param, options);
    };

    /**
     * Remove a document
     * @method remove
     * @param  {object} command The JIO command
     */
    that.remove = function (command, param, options) {
      priv.genericCommand("remove", command, param, options);
    };

    /**
     * Remove an attachment
     * @method removeAttachment
     * @param  {object} command The JIO command
     */
    that.removeAttachment = function (command, param, options) {
      priv.genericCommand("removeAttachment", command, param, options);
    };

    /**
     * Gets a document list from a distant erp5 storage
     * Options:
     * - {boolean} include_docs Also retrieve the actual document content.
     * @method allDocs
     * @param  {object} command The JIO command
     */
    that.allDocs = function (command, param, options) {
      priv.genericCommand("allDocs", command, param, options);
    };

    /**
     * Checks a document state
     * @method check
     * @param  {object} command The JIO command
     */
    that.check = function (command, param, options) {
      priv.genericCommand("check", command, param, options);
    };

    /**
     * Restore a document state to a coherent state
     * @method repair
     * @param  {object} command The JIO command
     */
    that.repair = function (command, param, options) {
      priv.genericCommand("repair", command, param, options);
    };

    priv.__init__(spec);

    if (typeof priv.url !== "string" || priv.url === "") {
      throw new TypeError("The erp5 server URL is not provided");
    }
    if (priv.encoded_login === null) {
      throw new TypeError("Impossible to create the authorization");
    }
  }

  jIO.addStorage("erp5", ERP5Storage);

}));
