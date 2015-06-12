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

  var allowed_field_dict = {
    "StringField": null,
    "EmailField": null,
    "IntegerField": null,
    "FloatField": null,
    "TextAreaField": null
  };

  function extractPropertyFromForm(context, id) {
    return context.getAttachment(id, "view")
      .push(function (blob) {
        return jIO.util.readBlobAsText(blob);
      })
      .push(function (evt) {
        return JSON.parse(evt.target.result);
      })
      .push(function (json) {
        var form = json._embedded._view,
          converted_json = {
            portal_type: json.portal_type
          },
          form_data_json = {},
          field,
          key;

        form_data_json.form_id = {
          "key": [form.form_id.key],
          "default": form.form_id["default"]
        };
        // XXX How to store datetime
        for (key in form) {
          if (form.hasOwnProperty(key)) {
            field = form[key];
            if ((key.indexOf('my_') === 0) &&
                (field.editable) &&
                (allowed_field_dict.hasOwnProperty(field.type))) {

              form_data_json[key.substring(3)] = {
                "default": field["default"],
                "key": field.key
              };
              converted_json[key.substring(3)] = field["default"];
            }
          }
        }

        return {
          action_href: form._actions.put.href,
          data: converted_json,
          form_data: form_data_json
        };
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
    return extractPropertyFromForm(this, id)
      .push(function (result) {
        var key;
        result = result.data;
        // Remove all ERP5 hateoas links / convert them into jIO ID
        for (key in result) {
          if (result.hasOwnProperty(key)) {
            if (!result[key]) {
              delete result[key];
            }
          }
        }
        return result;
      });
  };

  ERP5Storage.prototype.post = function (data) {
    var context = this,
      new_id;

    return getSiteDocument(this)
      .push(function (site_hal) {
        var form_data = new FormData();
        form_data.append("portal_type", data.portal_type);
        form_data.append("parent_relative_url", data.parent_relative_url);
        return jIO.util.ajax({
          type: "POST",
          url: site_hal._actions.add.href,
          data: form_data,
          xhrFields: {
            withCredentials: true
          }
        });
      })
      .push(function (evt) {
        var location = evt.target.getResponseHeader("X-Location"),
          uri = new URI(location);
        new_id = uri.segment(2);
        return context.put(new_id, data);
      })
      .push(function () {
        return new_id;
      });
  };

  ERP5Storage.prototype.put = function (id, data) {
    var context = this;

    return extractPropertyFromForm(context, id)
      .push(function (result) {
        var key,
          json = result.form_data,
          form_data = {};
        form_data[json.form_id.key] = json.form_id["default"];

        // XXX How to store datetime:!!!!!
        for (key in data) {
          if (data.hasOwnProperty(key)) {
            if (key === "form_id") {
              throw new jIO.util.jIOError(
                "ERP5: forbidden property: " + key,
                400
              );
            }
            if ((key !== "portal_type") && (key !== "parent_relative_url")) {
              if (!json.hasOwnProperty(key)) {
                throw new jIO.util.jIOError(
                  "ERP5: can not store property: " + key,
                  400
                );
              }
              form_data[json[key].key] = data[key];
            }
          }
        }
        return context.putAttachment(
          id,
          result.action_href,
          new Blob([JSON.stringify(form_data)], {type: "application/json"})
        );
      });
  };

  ERP5Storage.prototype.allAttachments = function (id) {
    var context = this;
    return getDocumentAndHateoas(this, id)
      .push(function () {
        if (context._default_view_reference === undefined) {
          return {
            links: {}
          };
        }
        return {
          view: {},
          links: {}
        };
      });
  };

  ERP5Storage.prototype.getAttachment = function (id, action) {

    if (action === "view") {
      if (this._default_view_reference === undefined) {
        throw new jIO.util.jIOError(
          "Cannot find attachment view for: " + id,
          404
        );
      }
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
          i,
          key;
        for (key in form_data) {
          if (form_data.hasOwnProperty(key)) {
            if (Array.isArray(form_data[key])) {
              for (i = 0; i < form_data[key].length; i += 1) {
                data.append(key, form_data[key][i]);
              }
            } else {
              data.append(key, form_data[key]);
            }
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
