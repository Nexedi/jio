/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
// JIO ERP5 Storage Description :
// {
//   type: "erp5"
//   url: {string}
//   default_view: "taskmanager"
// }

/*jslint indent: 2, maxlen: 80, nomen: true */
/*global jIO, UriTemplate, FormData, RSVP, URI, DOMParser, Blob,
  ProgressEvent, define, ERP5Storage */

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(RSVP, jIO, URI, UriTemplate, ERP5Storage);
}([
  "rsvp",
  "jio",
  "uri",
  "uritemplate",
  "erp5storage"
], function (RSVP, jIO, URI, UriTemplate, ERP5Storage) {
  "use strict";

  var hasOwnProperty = Function.prototype.call.bind(
    Object.prototype.hasOwnProperty
  ), constant = {};


  constant.task_state_to_action = {
    // Auto Planned : ?
    "Cancelled": "cancel",
    "Confirmed": "confirm",
    // Draft : ?
    "Deleted": "delete",
    "Ordered": "order",
    "Planned": "plan"
  };

  constant.allDocsState = {"data": {
    "total_rows": 7,
    "rows": [{
      "id": "taskmanager:state_module/1",
      "doc": {
        "type": "State",
        "title": "Auto Planned"
        //"state": "Auto Planned"
      },
      "values": {}
    }, {
      "id": "taskmanager:state_module/2",
      "doc": {
        "type": "State",
        "title": "Cancelled",
        //"state": "Cancelled",
        "action": constant.task_state_to_action.Cancelled
      },
      "values": {}
    }, {
      "id": "taskmanager:state_module/3",
      "doc": {
        "type": "State",
        "title": "Confirmed",
        //"state": "Confirmed",
        "action": constant.task_state_to_action.Confirmed
      },
      "values": {}
    }, {
      "id": "taskmanager:state_module/4",
      "doc": {
        "type": "State",
        "title": "Deleted",
        //"state": "Deleted",
        "action": constant.task_state_to_action.Deleted
      },
      "values": {}
    }, {
      "id": "taskmanager:state_module/5",
      "doc": {
        "type": "State",
        "title": "Draft"
        //"state": "Draft"
      },
      "values": {}
    }, {
      "id": "taskmanager:state_module/6",
      "doc": {
        "type": "State",
        "title": "Ordered",
        //"state": "Ordered",
        "action": constant.task_state_to_action.Ordered
      },
      "values": {}
    }, {
      "id": "taskmanager:state_module/7",
      "doc": {
        "type": "State",
        "title": "Planned",
        //"state": "Planned",
        "action": constant.task_state_to_action.Planned
      },
      "values": {}
    }]
  }};

  constant.mapping_jio_to_erp5 = {};
  constant.mapping_erp5_to_jio = {};

  // XXX docstring
  function addMetadataMapping(jio_type, erp5_type) {
    if (typeof jio_type !== "string" || typeof erp5_type !== "string" ||
        !jio_type || !erp5_type) {
      throw new TypeError("addMetadataMapping(): The two arguments " +
                          "must be non empty strings");
    }
    if (constant.mapping_jio_to_erp5[jio_type]) {
      throw new TypeError("A mapping already exists for jIO metadata '" +
                          jio_type + "'");
    }
    if (constant.mapping_erp5_to_jio[erp5_type]) {
      throw new TypeError("A mapping already exists for ERP5 metadata '" +
                          erp5_type + "'");
    }
    constant.mapping_jio_to_erp5[jio_type] = erp5_type;
    constant.mapping_erp5_to_jio[erp5_type] = jio_type;
  }
  addMetadataMapping("type", "portal_type");
  addMetadataMapping("state", "translated_simulation_state_title_text");
  addMetadataMapping("project", "source_project_title_text");
  addMetadataMapping("start", "start_date");
  addMetadataMapping("stop", "stop_date");
  addMetadataMapping("modified", "modification_date");
  addMetadataMapping("date", "creation_date");

  // addMetadataMapping("location", "destination_title");
  // addMetadataMapping("source", "source_title");
  // addMetadataMapping("requester", "destination_decision_title");
  // addMetadataMapping("contributor", "contributor_list");
  // addMetadataMapping("category", "category_list");

  // XXX docstring
  function toERP5Metadata(jio_type) {
    /*jslint forin: true */
    if (typeof jio_type === "string") {
      return constant.mapping_jio_to_erp5[jio_type] || jio_type;
    }
    var result = {}, key;
    if (typeof jio_type === "object" && jio_type) {
      for (key in jio_type) {
        if (hasOwnProperty(jio_type, key)) {
          result[toERP5Metadata(key)] = jio_type[key];
        }
      }
    }
    return result;
  }

  // XXX docstring
  function toJIOMetadata(erp5_type) {
    /*jslint forin: true */
    if (typeof erp5_type === "string") {
      return constant.mapping_erp5_to_jio[erp5_type] || erp5_type;
    }
    var result = {}, key;
    if (typeof erp5_type === "object" && erp5_type) {
      for (key in erp5_type) {
        if (hasOwnProperty(erp5_type, key)) {
          result[toJIOMetadata(key)] = erp5_type[key];
        }
      }
    }
    return result;
  }

  ERP5Storage.onView.taskmanager = {};
  ERP5Storage.onView.taskmanager.get = function (param, options) {
    options._view = "taskmanrecord";
    return ERP5Storage.onView["default"].get.call(this, param, options).
      then(function (answer) {
        answer.data = toJIOMetadata(answer.data);
        return answer;
      });
  };

  ERP5Storage.onView.taskmanager.post = function (metadata, options) {
    metadata = toERP5Metadata(metadata);
    options._view = "taskmanrecord";
    return ERP5Storage.onView["default"].post.call(this, metadata, options);
  };

  ERP5Storage.onView.taskmanager.put = function (metadata, options) {
    metadata = toERP5Metadata(metadata);
    options._view = "taskmanrecord";
    return ERP5Storage.onView["default"].put.call(this, metadata, options);
  };

  ERP5Storage.onView.taskmanager.allDocs = function (param, options) {
    var that = this;
    /*jslint unparam: true */
    function changeQueryKeysToERP5Metadata() {
      if (Array.isArray(options.select_list)) {
        options.select_list = options.select_list.map(toERP5Metadata);
      }
      try {
        options.query = jIO.QueryFactory.create(options.query);
        options.query.onParseSimpleQuery = function (object) {
          object.parsed.key = toERP5Metadata(object.parsed.key);
        };
        return options.query.parse().then(function (query) {
          options.query = jIO.QueryFactory.create(query).toString();
        });
      } catch (e) {
        delete options.query;
        return RSVP.resolve();
      }
    }

    function requestERP5(site_hal) {
      return jIO.util.ajax({
        "type": "GET",
        "url": UriTemplate.parse(site_hal._links.raw_search.href)
          .expand({
            query: options.query,
            // XXX Force erp5 to return embedded document
            select_list: options.select_list || [
              "portal_type",
              "title",
              "reference",
              "translated_simulation_state_title_text",
              "start_date",
              "stop_date",
              "source_project_title_text",
              "description",
              "modification_date",
              "creation_date"
            ],
            limit: options.limit
          }),
        "xhrFields": {
          withCredentials: true
        }
      });
    }

    function formatAnswer(event) {
      var catalog_json = JSON.parse(event.target.responseText),
        data = catalog_json._embedded.contents,
        count = data.length,
        i,
        uri,
        item,
        result = [];
      for (i = 0; i < count; i += 1) {
        item = data[i];
        uri = new URI(item._links.self.href);
        delete item._links;
        item = toJIOMetadata(item);
        result.push({
          id: uri.segment(2),
          doc: item,
          value: item
        });
      }
      return {"data": {"rows": result, "total_rows": result.length}};
    }

    function continueAllDocs() {
      // Hard code for states
      if (options.query === "portal_type: \"State\"") {
        return constant.allDocsState;
      }

      return ERP5Storage.getSiteDocument(that._url).
        then(requestERP5).
        then(formatAnswer);
    }

    return changeQueryKeysToERP5Metadata().then(continueAllDocs);

  };

}));
