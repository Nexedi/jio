/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
// JIO ERP5 Storage Description :
// {
//   type: "erp5"
//   url: {string}
//   default_view: {string} (optional)
// }

/*jslint indent: 2, nomen: true, unparam: true */
/*global jIO, UriTemplate, FormData, RSVP, URI, DOMParser, Blob,
  ProgressEvent, define */

(function (root, dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  var namespace = module(RSVP, jIO, URI, UriTemplate);
  if (namespace !== undefined) { root.ERP5Storage = namespace; }
}(this, [
  "rsvp",
  "jio",
  "uri",
  "uritemplate"
], function (RSVP, jIO, URI, UriTemplate) {
  "use strict";

  var hasOwnProperty = Function.prototype.call.bind(
    Object.prototype.hasOwnProperty
  ), constant = {};

  constant.method_notification_message_obj = {
    "get": "Getting document.",
    "post": "Posting document.",
    "put": "Putting document.",
    "remove": "Removing document.",
    "getAttachment": "Getting attachment.",
    "putAttachment": "Putting attachment.",
    "removeAttacment": "Removing attachment.",
    "allDocs": "Getting document list."
  };

  // XXX docstring
  function formatGetSuccessAnswer(answer) {
    if (answer === undefined || answer === null) { throw answer; }
    var result;
    if (typeof answer.data === "object" && answer.data) {
      return answer;
    }
    if (answer.target &&
        typeof answer.target.status === "number" &&
        typeof answer.target.statusText === "string") {
      result = {
        "status": answer.target.status
      };
      if (typeof answer.target.response === "object" &&
          answer.target.response !== null) {
        if (typeof answer.target.response.toJSON === "function") {
          result.data = answer.target.response.toJSON();
        } else {
          result.data = answer.target.response;
        }
      } else if (answer.target.response instanceof Blob) {
        return jIO.util.readBlobAsText(answer.target.response).
          then(function (text) {
            result.data = JSON.parse(text);
            return result;
          });
      }
      return result;
    }
    return answer;
  }

  // XXX docstring
  function formatUpdateSuccessAnswer(answer) {
    if (answer === undefined || answer === null) { throw answer; }
    var result;
    if (typeof answer.target === "object" && answer.target !== null &&
        typeof answer.target.status === "number") {
      result = {
        "status": answer.target.status
      };
      return result;
    }
    return answer;
  }

  // XXX docstring
  function formatErrorAnswer(answer) {
    if (answer === undefined || answer === null) { throw answer; }
    var result, dom;
    if (answer.target &&
        typeof answer.target.status === "number" &&
        typeof answer.target.statusText === "string") {
      // seams to be a ProgressEvent
      result = {
        "status": answer.target.status
      };
      if (typeof answer.target.response === "object" &&
          answer.target.response !== null) {
        if (typeof answer.target.response.toJSON === "function") {
          result.data = answer.target.response.toJSON();
        } else {
          result.data = answer.target.response;
        }
      } else if (typeof answer.target.responseText === "string") {
        dom = new DOMParser().parseFromString(
          answer.target.responseText,
          "text/html"
        );
        result.message = (dom.querySelector('#master') ||
                          dom.firstElementChild).textContent;
        if (!result.message) { delete result.message; }
      }
      throw result;
    }
    throw answer;
  }

  // XXX docstring
  function formatNotification(method, notif) {
    var result;
    if (notif) {
      if (typeof notif.loaded === "number" &&
          typeof notif.total === "number") {
        result = {};
        // can be a ProgressEvent or a jIO notification
        if (notif.method !== method) {
          result = {
            "method": method,
            "loaded": notif.loaded,
            "total": notif.total
          };
          if (typeof notif.percentage === "number") {
            result.percentage = notif.percentage;
          }
        }
        if (typeof notif.message === "string") {
          result.message = notif.message;
        } else {
          result.message = constant.method_notification_message_obj[method];
        }
        return result;
      }
    }
    throw null; // stop propagation
  }

  constant.formatSuccessAnswerFor = {
    "post": formatUpdateSuccessAnswer,
    "put": formatUpdateSuccessAnswer,
    "get": formatGetSuccessAnswer
  };

  //////////////////////////////////////////////////////////////////////

  // XXX docstring
  function ERP5Storage(spec) {
    if (typeof spec.url !== "string" || !spec.url) {
      throw new TypeError("ERP5 'url' must be a string " +
                          "which contains more than one character.");
    }
    this._url = spec.url;
    this._default_view = spec.default_view;
  }

  // XXX docstring
  function methodGenerator(method) {
    return function (command, param, options) {
      RSVP.resolve().
        then(function () {
          var view = ERP5Storage.onView[options._view || this._default_view] ||
            ERP5Storage.onView["default"];
          if (typeof view[method] !== "function") {
            view = ERP5Storage.onView["default"];
          }
          return view[method].call(this, param, options);
        }.bind(this)).
        then(constant.formatSuccessAnswerFor[method]).
        then(null, formatErrorAnswer, formatNotification.bind(null, method)).
        then(command.success, command.error, command.progress);
    };
  }

  // XXX docstring
  [
    "post",
    "put",
    "get",
    "remove",
    "putAttachment",
    "getAttachment",
    "removeAttachment",
    "allDocs",
    "check",
    "repair"
  ].forEach(function (method) {
    ERP5Storage.prototype[method] = methodGenerator(method);
  });
  // XXX docstring
  function getSiteDocument(url) {
    if (typeof url !== "string" &&
        typeof (this && this._url) !== "string") {
      throw new TypeError("ERP5Storage.getSiteDocument(): Argument 1 `url` " +
                          "or `this._url` are not of type string.");
    }
    return jIO.util.ajax({
      "type": "GET",
      "url": url || this._url,
      "xhrFields": {
        withCredentials: true
      }
    }).then(function (event) {
      return JSON.parse(event.target.responseText);
    });
  }
  ERP5Storage.getSiteDocument = getSiteDocument;

  // XXX docstring
  function getDocumentAndHatoas(param, options) {
    var this_ = this;
    return ERP5Storage.getSiteDocument(this._url).
      then(function (site_hal) {
        // XXX need to get modified metadata
        return jIO.util.ajax({
          "type": "GET",
          "url": UriTemplate.parse(site_hal._links.traverse.href)
                            .expand({
              relative_url: param._id,
              view: options._view || this_._default_view || "view"
            }),
          "xhrFields": {
            withCredentials: true
          }
        });
      });
  }

  ERP5Storage.onView = {};
  ERP5Storage.onView["default"] = {};

  // XXX docstring
  ERP5Storage.onView["default"].get = function (param, options) {
    return getDocumentAndHatoas.call(this, param, options).
      then(function (response) {
        var result = JSON.parse(response.target.responseText);
        result._id = param._id;
        result.portal_type = result._links.type.name;
        delete result._embedded;
        delete result._links;
        delete result._debug;
        new jIO.Metadata(result).format();
        return {"data": result};
      });
  };

  // XXX docstring
  ERP5Storage.onView["default"].post = function (metadata, options) {
    var final_response;
    return getSiteDocument(this._url)
      .then(function (site_hal) {
        /*jslint forin: true */
        var post_action = site_hal._actions.add,
          data = new FormData();

        data.append("portal_type", metadata.portal_type);

        return jIO.util.ajax({
          "type": post_action.method,
          "url": post_action.href,
          "data": data,
          "xhrFields": {
            withCredentials: true
          }
        });
      }).then(function (event) {
        final_response = {"status": event.target.status};
        if (!metadata._id) {
          // XXX Really depend on server response...
          var uri = new URI(event.target.getResponseHeader("X-Location"));
          final_response.id = uri.segment(2);
          metadata._id = final_response.id;
        }
      }).
      then(ERP5Storage.onView["default"].put.bind(this, metadata, options)).
      then(function () { return final_response; });
  };

  // XXX docstring
  ERP5Storage.onView["default"].put = function (metadata, options) {
    return getDocumentAndHatoas.call(this, metadata, options).
      then(function (result) {
        /*jslint forin: true */
        result = JSON.parse(result.target.responseText);
        var put_action = result._embedded._view._actions.put,
          renderer_form = result._embedded._view,
          data = new FormData(),
          key;
        data.append(renderer_form.form_id.key,
                    renderer_form.form_id['default']);
        for (key in metadata) {
          if (hasOwnProperty(metadata, key)) {
            if (key !== "_id") {
              // Hardcoded my_ ERP5 behaviour
              if (hasOwnProperty(renderer_form, "my_" + key)) {
                data.append(renderer_form["my_" + key].key, metadata[key]);
              }
            }
          }
        }
        return jIO.util.ajax({
          "type": put_action.method,
          "url": put_action.href,
          "data": data,
          "xhrFields": {
            withCredentials: true
          }
        });
      });
  };

  ERP5Storage.onView["default"].remove = function () {
    return;
  };

  ERP5Storage.onView["default"].allDocs = function (param, options) {
    if (typeof options.query !== "string") {
      options.query = (options.query ?
                       jIO.Query.objectToSearchText(options.query) :
                       undefined);
    }
    return getSiteDocument(this._url)
      .then(function (site_hal) {
        return jIO.util.ajax({
          "type": "GET",
          "url": UriTemplate.parse(site_hal._links.raw_search.href)
                            .expand({
              query: options.query,
              // XXX Force erp5 to return embedded document
              select_list: options.select_list || ["title", "reference"],
              limit: options.limit
            }),
          "xhrFields": {
            withCredentials: true
          }
        });
      })
      .then(function (response) {
        return JSON.parse(response.target.responseText);
      })
      .then(function (catalog_json) {
        var data = catalog_json._embedded.contents,
          count = data.length,
          i,
          uri,
          item,
          result = [],
          promise_list = [result];
        for (i = 0; i < count; i += 1) {
          item = data[i];
          uri = new URI(item._links.self.href);
          result.push({
            id: uri.segment(2),
            key: uri.segment(2),
            doc: {},
            value: item
          });
//           if (options.include_docs) {
//             promise_list.push(RSVP.Queue().push(function () {
//               return this._get({_id: item.name}, {_view: "View"});
//             }).push
//           }
        }
        return RSVP.all(promise_list);
      })
      .then(function (promise_list) {
        var result = promise_list[0];
        return {"data": {"rows": result, "total_rows": result.length}};
      });
  };

  ERP5Storage.onView["default"].check = function () {
    return;
  };

  ERP5Storage.onView["default"].repair = function () {
    return;
  };

  jIO.addStorage("erp5", ERP5Storage);

  return ERP5Storage;

}));
