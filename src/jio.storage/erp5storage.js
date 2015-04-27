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

/*jslint nomen: true, unparam: true */
/*global jIO, UriTemplate, FormData, RSVP, URI, Blob*/

(function (jIO, UriTemplate, FormData, RSVP, URI, Blob) {
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

  function getDocumentAndHateoas(storage, id, options) {
    if (options === undefined) {
      options = {};
    }
    return getSiteDocument(storage)
      .push(function (site_hal) {
        // XXX need to get modified metadata
        return new RSVP.Queue()
          .push(function () {
            return jIO.util.ajax({
              "type": "GET",
              "url": UriTemplate.parse(site_hal._links.traverse.href)
                                .expand({
                  relative_url: id,
                  view: options._view
                }),
              "xhrFields": {
                withCredentials: true
              }
            });
          })
          .push(undefined, function (error) {
            if ((error.target !== undefined) &&
                (error.target.status === 404)) {
              throw new jIO.util.jIOError("Cannot find document: " + id, 404);
            }
            throw error;
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
    this._default_view_reference = spec.default_view_reference;
  }

  ERP5Storage.prototype.get = function (id) {
    return getDocumentAndHateoas(this, id)
      .push(function (response) {
        var result = JSON.parse(response.target.responseText),
          key;
          // action_type;
        result.portal_type = result._links.type.name;

        // Remove all ERP5 hateoas links / convert them into jIO ID
        for (key in result) {
          if (result.hasOwnProperty(key)) {
            if (key.indexOf("_") === 0) {
              delete result[key];
            }
          }
        }

        return result;
      });
  };

  ERP5Storage.prototype.allAttachments = function (id) {
    return getDocumentAndHateoas(this, id)
      .push(function () {
        return {
          view: {},
          links: {}
        };
      });
  };

  ERP5Storage.prototype.getAttachment = function (id, action) {

    if (action === "view") {
      return getDocumentAndHateoas(this, id,
                                   {"_view": this._default_view_reference})
        .push(function (response) {
          var result = JSON.parse(response.target.responseText);
          result._id = id;
          result.portal_type = result._links.type.name;
          // Remove all ERP5 hateoas links / convert them into jIO ID

          // XXX Change default action to an jio urn with attachment name inside
          // if Base_edit, do put URN
          // if others, do post URN (ie, unique new attachment name)
          // XXX Except this attachment name should be generated when
          return new Blob(
            [JSON.stringify(result)],
            {"type": 'application/hal+json'}
          );
        });
    }
    if (action === "links") {
      return getDocumentAndHateoas(this, id)
        .push(function (response) {
          return new Blob(
            [JSON.stringify(JSON.parse(response.target.responseText))],
            {"type": 'application/hal+json'}
          );
        });
    }
    if (action.indexOf(this._url) === 0) {
      return new RSVP.Queue()
        .push(function () {
          return jIO.util.ajax({
            "type": "GET",
            "url": action,
            "xhrFields": {
              withCredentials: true
            }
          });
        })
        .push(function (evt) {
          var result = JSON.parse(evt.target.responseText);
          result._id = id;
          return new Blob(
            [JSON.stringify(result)],
            {"type": evt.target.getResponseHeader("Content-Type")}
          );
        });
    }
    throw new jIO.util.jIOError("ERP5: not support get attachment: " + action,
                                400);
  };

  ERP5Storage.prototype.putAttachment = function (id, name, blob) {
    // Assert we use a callable on a document from the ERP5 site
    if (name.indexOf(this._url) !== 0) {
      throw new jIO.util.jIOError("Can not store outside ERP5: " +
                                  name, 400);
    }

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsText(blob);
      })
      .push(function (evt) {
        var form_data = JSON.parse(evt.target.result),
          data = new FormData(),
          key;
        for (key in form_data) {
          if (form_data.hasOwnProperty(key)) {
            data.append(key, form_data[key]);
          }
        }
        return jIO.util.ajax({
          "type": "POST",
          "url": name,
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
            value: item
          });
        }
        return result;
      });
  };

  jIO.addStorage("erp5", ERP5Storage);

}(jIO, UriTemplate, FormData, RSVP, URI, Blob));
