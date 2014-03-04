/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
// JIO ERP5 Storage Description :
// {
//   type: "erp5"
//   url: {string}
// }

/*jslint indent: 2, nomen: true, unparam: true */
/*global jIO, console, UriTemplate, FormData, RSVP, URI,
  ProgressEvent, define */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(RSVP, jIO, URI);
}([
  'rsvp',
  'jio',
  'uri'
], function (RSVP, jIO, URI) {
  "use strict";

  function ERP5Storage(spec) {
    if (typeof spec.url !== 'string' && !spec.url) {
      throw new TypeError("ERP5 'url' must be a string " +
                          "which contains more than one character.");
    }
    this._url = spec.url;
  }

  ERP5Storage.prototype._getSiteDocument = function () {
    return jIO.util.ajax({
      "type": "GET",
      "url": this._url,
      "xhrFields": {
        withCredentials: true
      }
    }).then(function (response) {
      return JSON.parse(response.target.responseText);
    });
  };

  ERP5Storage.prototype._get = function (param, options) {
    return this._getSiteDocument()
      .then(function (site_hal) {
        return jIO.util.ajax({
          "type": "GET",
          "url": UriTemplate.parse(site_hal._links.traverse.href)
                            .expand({
              relative_url: param._id,
              view: options._view
            }),
          "xhrFields": {
            withCredentials: true
          }
        });
      })
      .then(function (response) {
        var result = JSON.parse(response.target.responseText);
        result._id = param._id;
        return result;
      });
  };

  ERP5Storage.prototype.get = function (command, param, options) {
    this._get(param, options)
      .then(function (response) {
        command.success({"data": response});
      })
      .fail(function (event) {
        console.error(event);
        if (event instanceof ProgressEvent) {
          command.error(
            event.target.status,
            event.target.statusText,
            "Cannot find document"
          );
        }
        // XXX How to propagate the error
        command.error(event);
      });
  };

  ERP5Storage.prototype.post = function (command, metadata, options) {
    return this._getSiteDocument()
      .then(function (site_hal) {
        var post_action = site_hal._actions.add,
          data = new FormData(),
          key;

        for (key in metadata) {
          if (metadata.hasOwnProperty(key)) {
            // XXX Not a form dialog in this case but distant script
            data.append(key, metadata[key]);
          }
        }
        return jIO.util.ajax({
          "type": post_action.method,
          "url": post_action.href,
          "data": data,
          "xhrFields": {
            withCredentials: true
          }
        });
      }).then(function (doc) {
        // XXX Really depend on server response...
        var uri = new URI(doc.target.getResponseHeader("X-Location"));
        command.success({"id": uri.segment(2)});
      }).fail(function (event) {
        console.error(event);
        if (event instanceof ProgressEvent) {
          return command.error(
            event.target.status,
            event.target.statusText,
            "Unable to post doc"
          );
        }
        command.error(event);
      });
  };

  ERP5Storage.prototype.put = function (command, metadata, options) {
    return this._get(metadata, options)
      .then(function (result) {
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
              } else {
                throw new Error("Can not save property " + key);
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
      })
      .then(function (result) {
        command.success(result);
      })
      .fail(function (event) {
        console.error(event);
        if (event instanceof ProgressEvent) {
          return command.error(
            event.target.status,
            event.target.statusText,
            "Unable to call put"
          );
        }
        command.error(event);
      });

  };

  ERP5Storage.prototype.allDocs = function (command, param, options) {
    if (typeof options.query !== "string") {
      options.query = (options.query ?
                       jIO.Query.objectToSearchText(options.query) :
                       undefined);
    }
    return this._getSiteDocument()
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
        var result = promise_list[0],
          count = result.length;
        command.success({"data": {"rows": result, "total_rows": count}});
      })
      .fail(function (event) {
        console.error(event);
        if (event instanceof ProgressEvent) {
          return command.error(
            event.target.status,
            event.target.statusText,
            "Cannot get list of document"
          );
        }
        command.error(event);
      });

  };

  jIO.addStorage("erp5", ERP5Storage);

}));
