/*jslint indent:2, maxlen: 80, nomen: true */
/*global jIO, RSVP, UriTemplate, SimpleQuery, ComplexQuery, QueryFactory,
  Query*/
(function (jIO, RSVP, UriTemplate, SimpleQuery, ComplexQuery, QueryFactory,
  Query) {
  "use strict";

  function initializeQueryAndDefaultMapping(storage) {
    var property, query_list = [];
    for (property in storage._mapping_dict) {
      if (storage._mapping_dict.hasOwnProperty(property)) {
        if (storage._mapping_dict[property][0] === "equalValue") {
          if (storage._mapping_dict[property][1] === undefined) {
            throw new jIO.util.jIOError("equalValue has not parameter", 400);
          }
          storage._default_mapping[property] =
            storage._mapping_dict[property][1];
          query_list.push(new SimpleQuery({
            key: property,
            value: storage._mapping_dict[property][1],
            type: "simple"
          }));
        }
        if (storage._mapping_dict[property][0] === "equalSubId") {
          if (storage._property_for_sub_id !== undefined) {
            throw new jIO.util.jIOError(
              "equalSubId can be defined one time",
              400
            );
          }
          storage._property_for_sub_id = property;
        }
      }
    }
    if (storage._query.query !== undefined) {
      query_list.push(QueryFactory.create(storage._query.query));
    }
    if (query_list.length > 1) {
      storage._query.query = new ComplexQuery({
        type: "complex",
        query_list: query_list,
        operator: "AND"
      });
    } else if (query_list.length === 1) {
      storage._query.query = query_list[0];
    }
  }

  function MappingStorage(spec) {
    this._mapping_dict = spec.mapping_dict || {};
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._map_all_property = spec.map_all_property !== undefined ?
        spec.map_all_property : true;
    this._attachment_mapping_dict = spec.attachment_mapping_dict || {};
    this._query = spec.query || {};
    this._map_id = spec.map_id;
    this._id_mapped = (spec.map_id !== undefined) ? spec.map_id[1] : false;

    if (this._query.query !== undefined) {
      this._query.query = QueryFactory.create(this._query.query);
    }
    this._default_mapping = {};

    initializeQueryAndDefaultMapping(this);
  }

  function getAttachmentId(storage, sub_id, attachment_id, method) {
    var mapping_dict = storage._attachment_mapping_dict;
    if (mapping_dict !== undefined
        && mapping_dict[attachment_id] !== undefined
        && mapping_dict[attachment_id][method] !== undefined
        && mapping_dict[attachment_id][method].uri_template !== undefined) {
      return UriTemplate.parse(
        mapping_dict[attachment_id][method].uri_template
      ).expand({id: sub_id});
    }
    return attachment_id;
  }

  function getSubStorageId(storage, id, doc) {
    var query;
    return new RSVP.Queue()
      .push(function () {
        if (storage._property_for_sub_id !== undefined &&
            doc !== undefined &&
            doc[storage._property_for_sub_id] !== undefined) {
          return doc[storage._property_for_sub_id];
        }
        if (!storage._id_mapped) {
          return id;
        }
        if (storage._map_id[0] === "equalSubProperty") {
          query = new SimpleQuery({
            key: storage._map_id[1],
            value: id,
            type: "simple"
          });
          if (storage._query.query !== undefined) {
            query = new ComplexQuery({
              operator: "AND",
              query_list: [query, storage._query.query],
              type: "complex"
            });
          }
          query = Query.objectToSearchText(query);
          return storage._sub_storage.allDocs({
            "query": query,
            "sort_on": storage._query.sort_on,
            "select_list": storage._query.select_list,
            "limit": storage._query.limit
          })
            .push(function (data) {
              if (data.data.rows.length === 0) {
                throw new jIO.util.jIOError(
                  "Can not find id",
                  404
                );
              }
              if (data.data.rows.length > 1) {
                throw new TypeError("id must be unique field: " + id
                  + ", result:" + data.data.rows.toString());
              }
              return data.data.rows[0].id;
            });
        }
        throw new jIO.util.jIOError(
          "Unsuported option: " + storage._mapping_dict.id,
          400
        );
      });
  }

  function mapToSubProperty(storage, property, sub_doc, doc) {
    var mapping_function, parameter;
    if (storage._mapping_dict[property] !== undefined) {
      mapping_function = storage._mapping_dict[property][0];
      parameter = storage._mapping_dict[property][1];
      if (mapping_function === "equalSubProperty") {
        sub_doc[parameter] = doc[property];
        return parameter;
      }
      if (mapping_function === "equalValue") {
        sub_doc[property] = parameter;
        return property;
      }
      if (mapping_function === "ignore" || mapping_function === "equalSubId") {
        return false;
      }
    }
    if (!storage._map_all_property) {
      return false;
    }
    if (storage._map_all_property) {
      sub_doc[property] = doc[property];
      return property;
    }
    throw new jIO.util.jIOError(
      "Unsuported option(s): " + storage._mapping_dict[property],
      400
    );
  }

  function mapToMainProperty(storage, property, sub_doc, doc) {
    var mapping_function, parameter;
    if (storage._mapping_dict[property] !== undefined) {
      mapping_function = storage._mapping_dict[property][0];
      parameter = storage._mapping_dict[property][1];
      if (mapping_function === "equalSubProperty") {
        if (sub_doc.hasOwnProperty(parameter)) {
          doc[property] = sub_doc[parameter];
        }
        return parameter;
      }
      if (mapping_function === "equalValue") {
        return property;
      }
      if (mapping_function === "ignore") {
        return property;
      }
    }
    if (storage._map_all_property) {
      if (sub_doc.hasOwnProperty(property)) {
        doc[property] = sub_doc[property];
      }
      return property;
    }
    return false;
  }

  function mapToMainDocument(storage, sub_doc, sub_id) {
    var doc = {},
      property,
      property_list = [storage._id_mapped];
    for (property in storage._mapping_dict) {
      if (storage._mapping_dict.hasOwnProperty(property)) {
        property_list.push(mapToMainProperty(storage, property, sub_doc, doc));
      }
    }
    if (storage._map_all_property) {
      for (property in sub_doc) {
        if (sub_doc.hasOwnProperty(property)) {
          if (property_list.indexOf(property) < 0) {
            doc[property] = sub_doc[property];
          }
        }
      }
    }
    if (storage._property_for_sub_id !== undefined &&
        sub_id !== undefined) {
      doc[storage._property_for_sub_id] = sub_id;
    }
    return doc;
  }

  function mapToSubstorageDocument(storage, doc, id) {
    var sub_doc = {}, property;

    for (property in doc) {
      if (doc.hasOwnProperty(property)) {
        mapToSubProperty(storage, property, sub_doc, doc);
      }
    }
    for (property in storage._default_mapping) {
      if (storage._default_mapping.hasOwnProperty(property)) {
        sub_doc[property] = storage._default_mapping[property];
      }
    }
    if (storage._id_mapped && id !== undefined) {
      sub_doc[storage._id_mapped] = id;
    }
    return sub_doc;
  }

  function handleAttachment(context, argument_list, method) {
    return getSubStorageId(context, argument_list[0])
      .push(function (sub_id) {
        argument_list[0] = sub_id;
        argument_list[1] = getAttachmentId(
          context,
          sub_id,
          argument_list[1],
          method
        );
        return context._sub_storage[method + "Attachment"].apply(
          context._sub_storage,
          argument_list
        );
      });
  }

  MappingStorage.prototype.get = function (id) {
    var context = this;
    return getSubStorageId(this, id)
      .push(function (sub_id) {
        return context._sub_storage.get(sub_id)
          .push(function (sub_doc) {
            return mapToMainDocument(context, sub_doc, sub_id);
          });
      });
  };

  MappingStorage.prototype.post = function (doc) {
    var sub_doc = mapToSubstorageDocument(
      this,
      doc
    ),
      id = doc[this._property_for_sub_id];
    if (this._property_for_sub_id && id !== undefined) {
      return this._sub_storage.put(id, sub_doc);
    }
    if (!this._id_mapped || doc[this._id_mapped] !== undefined) {
      return this._sub_storage.post(sub_doc);
    }
    throw new jIO.util.jIOError(
      "post is not supported with id mapped",
      400
    );
  };

  MappingStorage.prototype.put = function (id, doc) {
    var context = this,
      sub_doc = mapToSubstorageDocument(this, doc, id);
    return getSubStorageId(this, id, doc)
      .push(function (sub_id) {
        return context._sub_storage.put(sub_id, sub_doc);
      })
      .push(undefined, function (error) {
        if (error instanceof jIO.util.jIOError && error.status_code === 404) {
          return context._sub_storage.post(sub_doc);
        }
        throw error;
      })
      .push(function () {
        return id;
      });
  };

  MappingStorage.prototype.remove = function (id) {
    var context = this;
    return getSubStorageId(this, id)
      .push(function (sub_id) {
        return context._sub_storage.remove(sub_id);
      })
      .push(function () {
        return id;
      });
  };

  MappingStorage.prototype.putAttachment = function (id, attachment_id) {
    return handleAttachment(this, arguments, "put", id)
      .push(function () {
        return attachment_id;
      });
  };

  MappingStorage.prototype.getAttachment = function () {
    return handleAttachment(this, arguments, "get");
  };

  MappingStorage.prototype.removeAttachment = function (id, attachment_id) {
    return handleAttachment(this, arguments, "remove", id)
      .push(function () {
        return attachment_id;
      });
  };

  MappingStorage.prototype.allAttachments = function (id) {
    var context = this, sub_id;
    return getSubStorageId(context, id)
      .push(function (sub_id_result) {
        sub_id = sub_id_result;
        return context._sub_storage.allAttachments(sub_id);
      })
      .push(function (result) {
        var attachment_id,
          attachments = {},
          mapping_dict = {};
        for (attachment_id in context._attachment_mapping_dict) {
          if (context._attachment_mapping_dict.hasOwnProperty(attachment_id)) {
            mapping_dict[getAttachmentId(context, sub_id, attachment_id, "get")]
              = attachment_id;
          }
        }
        for (attachment_id in result) {
          if (result.hasOwnProperty(attachment_id)) {
            if (mapping_dict.hasOwnProperty(attachment_id)) {
              attachments[mapping_dict[attachment_id]] = {};
            } else {
              attachments[attachment_id] = {};
            }
          }
        }
        return attachments;
      });
  };

  MappingStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };

  MappingStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  MappingStorage.prototype.bulk = function (id_list) {
    var context = this;

    function mapId(parameter) {
      return getSubStorageId(context, parameter.parameter_list[0])
        .push(function (id) {
          return {"method": parameter.method, "parameter_list": [id]};
        });
    }

    return new RSVP.Queue()
      .push(function () {
        var promise_list = id_list.map(mapId);
        return RSVP.all(promise_list);
      })
      .push(function (id_list_mapped) {
        return context._sub_storage.bulk(id_list_mapped);
      })
      .push(function (result) {
        var mapped_result = [], i;
        for (i = 0; i < result.length; i += 1) {
          mapped_result.push(mapToMainDocument(
            context,
            result[i]
          ));
        }
        return mapped_result;
      });
  };

  MappingStorage.prototype.buildQuery = function (option) {
    var context = this,
      i,
      query,
      property,
      select_list = [],
      sort_on = [];

    function mapQuery(one_query) {
      var j, query_list = [], key, sub_query;
      if (one_query.type === "complex") {
        for (j = 0; j < one_query.query_list.length; j += 1) {
          sub_query = mapQuery(one_query.query_list[j]);
          if (sub_query) {
            query_list.push(sub_query);
          }
        }
        one_query.query_list = query_list;
        return one_query;
      }
      key = mapToMainProperty(context, one_query.key, {}, {});
      if (key) {
        one_query.key = key;
        return one_query;
      }
      return false;
    }

    if (option.sort_on !== undefined) {
      for (i = 0; i < option.sort_on.length; i += 1) {
        property = mapToMainProperty(this, option.sort_on[i][0], {}, {});
        if (property && sort_on.indexOf(property) < 0) {
          sort_on.push([property, option.sort_on[i][1]]);
        }
      }
    }
    if (this._query.sort_on !== undefined) {
      for (i = 0; i < this._query.sort_on.length; i += 1) {
        property = mapToMainProperty(this, this._query.sort_on[i], {}, {});
        if (sort_on.indexOf(property) < 0) {
          sort_on.push([property, option.sort_on[i][1]]);
        }
      }
    }
    if (option.select_list !== undefined) {
      for (i = 0; i < option.select_list.length; i += 1) {
        property = mapToMainProperty(this, option.select_list[i], {}, {});
        if (property && select_list.indexOf(property) < 0) {
          select_list.push(property);
        }
      }
    }
    if (this._query.select_list !== undefined) {
      for (i = 0; i < this._query.select_list; i += 1) {
        property = this._query.select_list[i];
        if (select_list.indexOf(property) < 0) {
          select_list.push(property);
        }
      }
    }
    if (this._id_mapped) {
      // modify here for future way to map id
      select_list.push(this._id_mapped);
    }
    if (option.query !== undefined) {
      query = mapQuery(QueryFactory.create(option.query));
    }

    if (this._query.query !== undefined) {
      if (query === undefined) {
        query = this._query.query;
      }
      query = new ComplexQuery({
        operator: "AND",
        query_list: [query, this._query.query],
        type: "complex"
      });
    }

    if (query !== undefined) {
      query = Query.objectToSearchText(query);
    }
    return this._sub_storage.allDocs(
      {
        query: query,
        select_list: select_list,
        sort_on: sort_on,
        limit: option.limit
      }
    )
      .push(function (result) {
        var doc;
        for (i = 0; i < result.data.total_rows; i += 1) {
          doc = result.data.rows[i].value;
          result.data.rows[i].value =
            mapToMainDocument(
              context,
              doc
            );
          if (context._id_mapped) {
            result.data.rows[i].id = doc[context._id_mapped];
          }
        }
        return result.data.rows;
      });
  };

  jIO.addStorage('mapping', MappingStorage);
}(jIO, RSVP, UriTemplate, SimpleQuery, ComplexQuery, QueryFactory, Query));