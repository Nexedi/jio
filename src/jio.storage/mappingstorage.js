/*jslint indent:2, maxlen: 80, nomen: true */
/*global jIO, RSVP, UriTemplate, SimpleQuery, ComplexQuery, QueryFactory,
  Query*/
(function (jIO, RSVP) {
  "use strict";

  function MappingStorage(spec) {
    this._mapping_dict = spec.mapping_dict || {};
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._map_all_property = spec.map_all_property !== undefined ?
        spec.map_all_property : true;
    this._attachment_mapping_dict = spec.attachment_mapping_dict || {};
    this._query = spec.query || {};

    if (this._query.query !== undefined) {
      this._query.query = QueryFactory.create(this._query.query);
    }
    this._default_mapping = {};
    this._id_is_mapped = (this._mapping_dict.id !== undefined
            && this._mapping_dict.id.equal !== "id");
    var property, query_list = [];

    // handle default_value.
    for (property in this._mapping_dict) {
      if (this._mapping_dict.hasOwnProperty(property)) {
        if (this._mapping_dict[property].default_value !== undefined) {
          this._default_mapping[property] =
            this._mapping_dict[property].default_value;
          query_list.push(new SimpleQuery({
            key: property,
            value: this._mapping_dict[property].default_value,
            type: "simple"
          }));
        }
      }
    }

    if (this._query.query !== undefined) {
      query_list.push(QueryFactory.create(this._query.query));
    }

    if (query_list.length > 1) {
      this._query.query = new ComplexQuery({
        type: "complex",
        query_list: query_list,
        operator: "AND"
      });
    } else if (query_list.length === 1) {
      this._query.query = query_list[0];
    }
  }

  function getAttachmentId(storage, sub_id, attachment_id, method) {
    var mapping_dict = storage._attachment_mapping_dict;
    return new RSVP.Queue()
      .push(function () {
        if (mapping_dict !== undefined
            && mapping_dict[attachment_id] !== undefined
            && mapping_dict[attachment_id][method].uri_template !== undefined) {
          return UriTemplate.parse(
            mapping_dict[attachment_id][method].uri_template
          ).expand({id: sub_id});
        }
        return attachment_id;
      });
  }

  function getSubStorageId(storage, id) {
    var query;
    return new RSVP.Queue()
      .push(function () {
        if (!storage._id_is_mapped || id === undefined) {
          return id;
        }
        if (storage._mapping_dict.id.equal !== undefined) {
          query = new SimpleQuery({
            key: storage._mapping_dict.id.equal,
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
                return undefined;
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
    if (storage._mapping_dict[property] !== undefined) {
      if (storage._mapping_dict[property].equal !== undefined) {
        sub_doc[storage._mapping_dict[property].equal] = doc[property];
        return storage._mapping_dict[property].equal;
      }
      if (storage._mapping_dict[property].default_value !== undefined) {
        sub_doc[property] = storage._mapping_dict[property].default_value;
        return property;
      }
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
    if (storage._mapping_dict[property] !== undefined) {
      if (storage._mapping_dict[property].equal !== undefined) {
        if (sub_doc.hasOwnProperty(storage._mapping_dict[property].equal)) {
          doc[property] = sub_doc[storage._mapping_dict[property].equal];
        }
        return storage._mapping_dict[property].equal;
      }
      if (storage._mapping_dict[property].default_value !== undefined) {
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

  function mapToMainDocument(storage, sub_doc, delete_id_from_doc) {
    var doc = {},
      property,
      property_list = [];
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
    if (delete_id_from_doc) {
      delete doc.id;
    }
    return doc;
  }

  function mapToSubstorageDocument(storage, doc) {
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
    delete sub_doc.id;
    return sub_doc;
  }

  MappingStorage.prototype.get = function (id) {
    var context = this;
    return getSubStorageId(this, id)
      .push(function (sub_id) {
        return context._sub_storage.get(sub_id);
      })
      .push(function (sub_doc) {
        return mapToMainDocument(context, sub_doc, true);
      })
      .push(undefined, function (error) {
        throw new jIO.util.jIOError("Cannot find document " + id
          + ", cause: " + error.message, 404);
      });
  };

  MappingStorage.prototype.post = function (doc) {
    if (!this._id_is_mapped) {
      return this._sub_storage.post(mapToSubstorageDocument(this, doc));
    }
    throw new jIO.util.jIOError(
      "post is not supported with id mapped",
      400
    );
  };

  MappingStorage.prototype.put = function (id, doc) {
    var context = this,
      sub_doc = mapToSubstorageDocument(this, doc);
    return getSubStorageId(this, id)
      .push(function (sub_id) {
        if (context._id_is_mapped) {
          sub_doc[context._mapping_dict.id.equal] = id;
        }
        if (id === undefined) {
          throw new Error();
        }
        return context._sub_storage.put(sub_id, sub_doc);
      })
      .push(undefined, function () {
        return context._sub_storage.post(sub_doc);
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
    var context = this, argument_list = arguments;
    return getSubStorageId(context, id)
      .push(function (sub_id) {
        argument_list[0] = sub_id;
        return getAttachmentId(context, sub_id, attachment_id, "put");
      })
      .push(function (sub_attachment_id) {
        argument_list[1] = sub_attachment_id;
        return context._sub_storage.putAttachment.apply(context._sub_storage,
          argument_list);
      })
      .push(function () {
        return attachment_id;
      });
  };

  MappingStorage.prototype.getAttachment = function (id, attachment_id) {
    var context = this, argument_list = arguments;
    return getSubStorageId(context, id)
      .push(function (sub_id) {
        argument_list[0] = sub_id;
        return getAttachmentId(context, sub_id, attachment_id, "get");
      })
      .push(function (sub_attachment_id) {
        argument_list[1] = sub_attachment_id;
        return context._sub_storage.getAttachment.apply(context._sub_storage,
          argument_list);
      });
  };

  MappingStorage.prototype.removeAttachment = function (id, attachment_id) {
    var context = this, argument_list = arguments;
    return getSubStorageId(context, id)
      .push(function (sub_id) {
        argument_list[0] = sub_id;
        return getAttachmentId(context, sub_id, attachment_id, "remove");
      })
      .push(function (sub_attachment_id) {
        argument_list[1] = sub_attachment_id;
        return context._sub_storage.removeAttachment.apply(context._sub_storage,
          argument_list);
      })
      .push(function () {
        return attachment_id;
      });
  };

  MappingStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  MappingStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  MappingStorage.prototype.bulk = function (id_list) {
    var i,
      context = this,
      mapped_result = [],
      promise_list = id_list.map(function (parameter) {
        return getSubStorageId(context, parameter.parameter_list[0])
          .push(function (id) {
            return {"method": parameter.method, "parameter_list": [id]};
          });
      });

    return new RSVP.Queue()
      .push(function () {
        return RSVP.all(promise_list);
      })
      .push(function (id_list_mapped) {
        return context._sub_storage.bulk(id_list_mapped);
      })
      .push(function (result) {
        for (i = 0; i < result.length; i += 1) {
          mapped_result.push(mapToMainDocument(context, result[i], false));
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
      var i, query_list = [];
      if (one_query.type === "complex") {
        for (i = 0; i < one_query.query_list.length; i += 1) {
          query_list.push(mapQuery(one_query.query_list[i]));
        }
        one_query.query_list = query_list;
        return one_query;
      }
      one_query.key = mapToMainProperty(context, one_query.key, {}, {});
      return one_query;
    }

    if (option.sort_on !== undefined) {
      for (i = 0; i < option.sort_on.length; i += 1) {
        property = mapToMainProperty(this, option.sort_on[i][0], {}, {});
        if (property && sort_on.indexOf(property) < 0) {
          select_list.push([property, option.sort_on[i][1]]);
        }
      }
    }
    if (this._query.sort_on !== undefined) {
      for (i = 0; i < this._query.sort_on.length; i += 1) {
        property = this._query.sort_on[i];
        if (sort_on.indexOf(property) < 0) {
          sort_on.push(property);
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
    if (this._id_is_mapped) {
      select_list.push(this._mapping_dict.id.equal);
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
        for (i = 0; i < result.data.total_rows; i += 1) {
          result.data.rows[i].value =
            mapToMainDocument(context, result.data.rows[i].value, false);
          if (result.data.rows[i].id !== undefined && context._id_is_mapped) {
            result.data.rows[i].id =
                result.data.rows[i].value.id;
            delete result.data.rows[i].value.id;
          }
        }
        return result.data.rows;
      });
  };

  jIO.addStorage('mapping', MappingStorage);
}(jIO, RSVP));