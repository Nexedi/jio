/*
 * Copyright 2013, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */
// JIO ERP5 Storage Description :
// {
//   type: "erp5"
//   url: {string}
// }

/*jslint nomen: true, unparam: true */
/*global jIO, UriTemplate, FormData, RSVP, URI, Blob,
         SimpleQuery, ComplexQuery*/

(function (jIO, UriTemplate, FormData, RSVP, URI, Blob,
           SimpleQuery, ComplexQuery) {
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

  function extractPropertyFromFormJSON(json) {
    var form = json._embedded._view,
      converted_json = {
        portal_type: json._links.type.name
      },
      form_data_json = {},
      field,
      key,
      prefix_length,
      result;

    if (json._links.hasOwnProperty('parent')) {
      converted_json.parent_relative_url =
        new URI(json._links.parent.href).segment(2);
    }

    form_data_json.form_id = {
      "key": [form.form_id.key],
      "default": form.form_id["default"]
    };
    // XXX How to store datetime
    for (key in form) {
      if (form.hasOwnProperty(key)) {
        field = form[key];
        prefix_length = 0;
        if (key.indexOf('my_') === 0 && field.editable) {
          prefix_length = 3;
        }
        if (key.indexOf('your_') === 0) {
          prefix_length = 5;
        }
        if ((prefix_length !== 0) &&
            (allowed_field_dict.hasOwnProperty(field.type))) {
          form_data_json[key.substring(prefix_length)] = {
            "default": field["default"],
            "key": field.key
          };
          converted_json[key.substring(prefix_length)] = field["default"];
        }
      }
    }

    result = {
      data: converted_json,
      form_data: form_data_json
    };
    if (form.hasOwnProperty('_actions') &&
        form._actions.hasOwnProperty('put')) {
      result.action_href = form._actions.put.href;
    }
    return result;
  }

  function extractPropertyFromForm(context, id) {
    return context.getAttachment(id, "view")
      .push(function (blob) {
        return jIO.util.readBlobAsText(blob);
      })
      .push(function (evt) {
        return JSON.parse(evt.target.result);
      })
      .push(function (json) {
        return extractPropertyFromFormJSON(json);
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

  function convertJSONToGet(json) {
    var key,
      result = json.data;
    // Remove all ERP5 hateoas links / convert them into jIO ID
    for (key in result) {
      if (result.hasOwnProperty(key)) {
        if (!result[key]) {
          delete result[key];
        }
      }
    }
    return result;
  }

  ERP5Storage.prototype.get = function (id) {
    return extractPropertyFromForm(this, id)
      .push(function (result) {
        return convertJSONToGet(result);
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
        if (!result.hasOwnProperty('action_href')) {
          throw new jIO.util.jIOError(
            "ERP5: can not modify document: " + id,
            403
          );
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

  ERP5Storage.prototype.getAttachment = function (id, action, options) {
    if (options === undefined) {
      options = {};
    }
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
          var start,
            end,
            range,
            request_options = {
              "type": "GET",
              "dataType": "blob",
              "url": action,
              "xhrFields": {
                withCredentials: true
              }
            };
          if (options.start !== undefined ||  options.end !== undefined) {
            start = options.start || 0;
            end = options.end;
            if (end !== undefined && end < 0) {
              throw new jIO.util.jIOError("end must be positive",
                                          400);
            }
            if (start < 0) {
              range = "bytes=" + start;
            } else if (end === undefined) {
              range = "bytes=" + start + "-";
            } else {
              if (start > end) {
                throw new jIO.util.jIOError("start is greater than end",
                                            400);
              }
              range = "bytes=" + start + "-" + end;
            }
            request_options.headers = {Range: range};
          }
          return jIO.util.ajax(request_options);
        })
        .push(function (evt) {
          if (evt.target.response === undefined) {
            return new Blob(
              [evt.target.responseText],
              {"type": evt.target.getResponseHeader("Content-Type")}
            );
          }
          return evt.target.response;
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
          array,
          i,
          key,
          value;
        for (key in form_data) {
          if (form_data.hasOwnProperty(key)) {
            if (Array.isArray(form_data[key])) {
              array = form_data[key];
            } else {
              array = [form_data[key]];
            }
            for (i = 0; i < array.length; i += 1) {
              value = array[i];
              if (typeof value === "object") {
                data.append(key, jIO.util.dataURItoBlob(value.url),
                            value.file_name);
              } else {
                data.append(key, value);
              }
            }
          }
        }
        return jIO.util.ajax({
          "type": "POST",
          "url": name,
          "data": data,
          "dataType": "blob",
          "xhrFields": {
            withCredentials: true
          }
        });
      });
  };

  ERP5Storage.prototype.hasCapacity = function (name) {
    return ((name === "list") || (name === "query") ||
            (name === "select") || (name === "limit") ||
            (name === "sort"));
  };

  function isSingleLocalRoles(parsed_query) {
    if ((parsed_query instanceof SimpleQuery) &&
        (parsed_query.operator === undefined) &&
        (parsed_query.key === 'local_roles')) {
      // local_roles:"Assignee"
      return parsed_query.value;
    }
  }

  function isSingleDomain(parsed_query) {
    if ((parsed_query instanceof SimpleQuery) &&
        (parsed_query.operator === undefined) &&
        (parsed_query.key !== undefined) &&
        (parsed_query.key.indexOf('selection_domain_') === 0)) {
      // domain_region:"europe/france"
      var result = {};
      result[parsed_query.key.slice('selection_domain_'.length)] =
        parsed_query.value;
      return result;
    }
  }

  function isMultipleLocalRoles(parsed_query) {
    var i,
      sub_query,
      is_multiple = true,
      local_role_list = [];
    if ((parsed_query instanceof ComplexQuery) &&
        (parsed_query.operator === 'OR')) {

      for (i = 0; i < parsed_query.query_list.length; i += 1) {
        sub_query = parsed_query.query_list[i];
        if ((sub_query instanceof SimpleQuery) &&
            (sub_query.key !== undefined) &&
            (sub_query.key === 'local_roles')) {
          local_role_list.push(sub_query.value);
        } else {
          is_multiple = false;
        }
      }
      if (is_multiple) {
        // local_roles:"Assignee" OR local_roles:"Assignor"
        return local_role_list;
      }
    }
  }

  ERP5Storage.prototype.buildQuery = function (options) {
//     if (typeof options.query !== "string") {
//       options.query = (options.query ?
//                        jIO.Query.objectToSearchText(options.query) :
//                        undefined);
//     }
    return getSiteDocument(this)
      .push(function (site_hal) {
        var query = options.query,
          i,
          key,
          parsed_query,
          sub_query,
          result_list,
          local_roles,
          local_role_found = false,
          selection_domain,
          sort_list = [];
        if (options.query) {
          parsed_query = jIO.QueryFactory.create(options.query);
          result_list = isSingleLocalRoles(parsed_query);
          if (result_list) {
            query = undefined;
            local_roles = result_list;
          } else {
            result_list = isSingleDomain(parsed_query);
            if (result_list) {
              query = undefined;
              selection_domain = result_list;
            } else {

              result_list = isMultipleLocalRoles(parsed_query);
              if (result_list) {
                query = undefined;
                local_roles = result_list;
              } else if ((parsed_query instanceof ComplexQuery) &&
                         (parsed_query.operator === 'AND')) {

                // portal_type:"Person" AND local_roles:"Assignee"
                // AND selection_domain_region:"europe/france"
                for (i = 0; i < parsed_query.query_list.length; i += 1) {
                  sub_query = parsed_query.query_list[i];

                  if (!local_role_found) {
                    result_list = isSingleLocalRoles(sub_query);
                    if (result_list) {
                      local_roles = result_list;
                      parsed_query.query_list.splice(i, 1);
                      query = jIO.Query.objectToSearchText(parsed_query);
                      local_role_found = true;
                    } else {
                      result_list = isMultipleLocalRoles(sub_query);
                      if (result_list) {
                        local_roles = result_list;
                        parsed_query.query_list.splice(i, 1);
                        query = jIO.Query.objectToSearchText(parsed_query);
                        local_role_found = true;
                      }
                    }
                  }

                  result_list = isSingleDomain(sub_query);
                  if (result_list) {
                    parsed_query.query_list.splice(i, 1);
                    query = jIO.Query.objectToSearchText(parsed_query);
                    if (selection_domain) {
                      for (key in result_list) {
                        if (result_list.hasOwnProperty(key)) {
                          selection_domain[key] = result_list[key];
                        }
                      }
                    } else {
                      selection_domain = result_list;
                    }
                    i -= 1;
                  }

                }
              }
            }
          }
        }

        if (options.sort_on) {
          for (i = 0; i < options.sort_on.length; i += 1) {
            sort_list.push(JSON.stringify(options.sort_on[i]));
          }
        }

        if (selection_domain) {
          selection_domain = JSON.stringify(selection_domain);
        }

        return jIO.util.ajax({
          "type": "GET",
          "url": UriTemplate.parse(site_hal._links.raw_search.href)
                            .expand({
              query: query,
              // XXX Force erp5 to return embedded document
              select_list: options.select_list || ["title", "reference"],
              limit: options.limit,
              sort_on: sort_list,
              local_roles: local_roles,
              selection_domain: selection_domain
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

}(jIO, UriTemplate, FormData, RSVP, URI, Blob,
  SimpleQuery, ComplexQuery));
