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

/*jslint nomen: true */
/*global jIO, UriTemplate, FormData, RSVP, URI,
  module */

(function (jIO, UriTemplate, FormData, RSVP, URI) {
  "use strict";

  function getSiteDocument(storage) {
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "GET",
          "url": storage._url,
          "xhrFields": {
            withCredentials: true
          }
        });
      })
      .push(function (event) {
        return JSON.parse(event.target.responseText);
      });
  }

  function getDocumentAndHateoas(storage, param, options) {
    if (options === undefined) {
      options = {};
    }
    return getSiteDocument(storage)
      .push(function (site_hal) {
        // XXX need to get modified metadata
        return jIO.util.ajax({
          "type": "GET",
          "url": UriTemplate.parse(site_hal._links.traverse.href)
                            .expand({
              relative_url: param._id,
              view: options._view || storage._default_view
            }),
          "xhrFields": {
            withCredentials: true
          }
        });
      });
  }

  // XXX docstring
  function ERP5Storage(spec) {
    if (typeof spec.url !== "string" || !spec.url) {
      throw new TypeError("ERP5 'url' must be a string " +
                          "which contains more than one character.");
    }
    this._url = spec.url;
    this._default_view = spec.default_view || "view";
  }

  ERP5Storage.prototype.get = function (param, options) {
    return getDocumentAndHateoas(this, param, options)
      .push(function (response) {
        var result = JSON.parse(response.target.responseText);
        result._id = param._id;
        result.portal_type = result._links.type.name;
//         delete result._embedded;
//         delete result._links;
//         delete result._debug;
        return result;
      });
  };

  ERP5Storage.prototype.post = function (metadata, options) {
    var final_response,
      context = this;
    return getSiteDocument(this)
      .push(function (site_hal) {
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
      })
      .push(function (event) {
        if (!metadata._id) {
          // XXX Really depend on server response...
          var uri = new URI(event.target.getResponseHeader("X-Location"));
          final_response = uri.segment(2);
          metadata._id = final_response;
        }
      })
      .push(function () {
        return context.put(metadata, options);
      })
      .push(function () {
        return final_response;
      });
  };

  ERP5Storage.prototype.put = function (metadata, options) {
    return getDocumentAndHateoas(this, metadata, options)
      .push(function (result) {
        result = JSON.parse(result.target.responseText);
        var put_action = result._embedded._view._actions.put,
          renderer_form = result._embedded._view,
          data = new FormData(),
          key;
        data.append(renderer_form.form_id.key,
                    renderer_form.form_id['default']);
        for (key in metadata) {
          if (metadata.hasOwnProperty(key)) {
            if (key !== "_id") {
              // Hardcoded my_ ERP5 behaviour
              if (renderer_form.hasOwnProperty("my_" + key)) {
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

  ERP5Storage.prototype.hasCapacity = function (name) {
    return ((name === "list") || (name === "query") ||
            (name === "select") || (name === "limit"));
  };

  ERP5Storage.prototype.buildQuery = function (options) {
//     if (typeof options.query !== "string") {
//       options.query = (options.query ?
//                        jIO.Query.objectToSearchText(options.query) :
//                        undefined);
//     }
    return getSiteDocument(this)
      .push(function (site_hal) {
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
      .push(function (response) {
        return JSON.parse(response.target.responseText);
      })
      .push(function (catalog_json) {
        var data = catalog_json._embedded.contents,
          count = data.length,
          i,
          uri,
          item,
          result = [];
        for (i = 0; i < count; i += 1) {
          item = data[i];
          uri = new URI(item._links.self.href);
          delete item._links;
          result.push({
            id: uri.segment(2),
            doc: {},
            value: item
          });
        }
        return result;
      });
  };

  jIO.addStorage("erp5", ERP5Storage);

}(jIO, UriTemplate, FormData, RSVP, URI));
