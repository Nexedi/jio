/*jslint indent:2, maxlen: 80, nomen: true */
/*global jIO, RSVP, UriTemplate */
(function (jIO, RSVP) {
  "use strict";

  function MappingStorage(spec) {
    this._mapping_dict = spec.mapping_dict || {};
    this._default_dict = spec.default_dict || {};
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._map_all_property = spec.map_all_property || false;
    this._mapping_dict_attachment = spec.mapping_dict_attachment || undefined;
    this._query = spec.query || {};

    this._id_is_mapped = (this._mapping_dict.id !== undefined
            && this._mapping_dict.id.equal !== "id");
  }


  function getAttachmentId(storage, sub_id, attachment_id, method) {
    var mapping_dict = storage._mapping_dict_attachment;
    return new RSVP.Queue()
      .push(function () {
        if (mapping_dict !== undefined
            && mapping_dict[attachment_id] !== undefined
            && mapping_dict[attachment_id].uri_template !== undefined) {
          return UriTemplate.parse(
            mapping_dict[attachment_id][method].uri_template
          ).expand({id: sub_id});
        }
        return attachment_id;
      });
  }

  function getSubStorageId(storage, index) {
    var query;
    return new RSVP.Queue()
      .push(function () {
        var property;
        if (!storage._id_is_mapped) {
          return index;
        }
        if (storage._mapping_dict.id.equal !== undefined) {
          query = storage._mapping_dict.id.equal + ': "' + index + '"';
          if (storage._query.query !== undefined) {
            query += ' AND ' + storage._query.query;
          }
          for (property in storage._default_dict) {
            if (storage._default_dict.hasOwnProperty(property)) {
              query += ' AND ' + property + ': "'
                + storage._default_dict[property].equal + '"';
            }
          }
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
                throw new TypeError("id must be unique field");
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

  function unmapProperty(storage, property, doc, mapped_doc) {
    if (storage._mapping_dict[property].equal !== undefined) {
      doc[storage._mapping_dict[property].equal] = mapped_doc[property];
      return storage._mapping_dict[property].equal;
    }
    throw new jIO.util.jIOError(
      "Unsuported option(s): " + storage._mapping_dict[property],
      400
    );
  }

  function mapProperty(storage, property, doc, mapped_doc) {
    if (storage._mapping_dict[property].equal !== undefined) {
      if (doc.hasOwnProperty(storage._mapping_dict[property].equal)) {
        mapped_doc[property] = doc[storage._mapping_dict[property].equal];
        return storage._mapping_dict[property].equal;
      }
      return;
    }
    throw new jIO.util.jIOError(
      "Unsuported option(s): " + storage._mapping_dict[property],
      400
    );
  }

  function unmapDefaultProperty(storage, doc, property) {
    if (storage._default_dict[property].equal !== undefined) {
      doc[property] = storage._default_dict[property].equal;
      return property;
    }
    throw new jIO.util.jIOError(
      "Unsuported option(s): " + storage._mapping_dict[property],
      400
    );
  }

  function mapDocument(storage, doc, delete_id) {
    var mapped_doc = {},
      property,
      property_list = [];
    for (property in storage._mapping_dict) {
      if (storage._mapping_dict.hasOwnProperty(property)) {
        property_list.push(mapProperty(storage, property, doc, mapped_doc));
      }
    }
    if (storage._map_all_property) {
      for (property in doc) {
        if (doc.hasOwnProperty(property)) {
          if (property_list.indexOf(property) < 0) {
            mapped_doc[property] = doc[property];
          }
        }
      }
    }
    if (delete_id) {
      delete mapped_doc.id;
    }
    return mapped_doc;
  }

  function unmapDocument(storage, mapped_doc) {
    var doc = {}, property;
    for (property in storage._default_dict) {
      if (storage._default_dict.hasOwnProperty(property)) {
        unmapDefaultProperty(storage, doc, property);
      }
    }
    for (property in mapped_doc) {
      if (mapped_doc.hasOwnProperty(property)) {
        if (storage._mapping_dict[property] !== undefined) {
          unmapProperty(storage, property, doc, mapped_doc);
        } else {
          if (storage._map_all_property
              && !storage._default_dict.hasOwnProperty(property)) {
            doc[property] = mapped_doc[property];
          }
        }
      }
    }
    return doc;
  }

  MappingStorage.prototype.get = function (index) {
    var that = this;
    return getSubStorageId(this, index)
      .push(function (id) {
        if (id !== undefined) {
          return that._sub_storage.get(id);
        }
        throw new jIO.util.jIOError("Cannot find document " + id, 404);
      })
      .push(function (doc) {
        return mapDocument(that, doc, true);
      })
      .push(undefined, function (error) {
        throw error;
      });
  };

  MappingStorage.prototype.post = function () {
    if (!this._id_is_mapped) {
      return this._sub_storage.post.apply(this._sub_storage, arguments);
    }
    throw new jIO.util.jIOError("Can't use post with id mapped", 400);
  };

  MappingStorage.prototype.put = function (index, doc) {
    var that = this,
      mapped_doc = unmapDocument(this, doc);
    return getSubStorageId(this, index)
      .push(function (id) {
        if (that._mapping_dict.id && that._mapping_dict.id.equal !== "id") {
          mapped_doc[that._mapping_dict.id.equal] = index;
        }
        if (id !== undefined) {
          return that._sub_storage.put(id, mapped_doc);
        }
        return that._sub_storage.post(mapped_doc);
      })
      .push(function () {
        return index;
      });
  };

  MappingStorage.prototype.remove = function (index) {
    var that = this;
    return getSubStorageId(this, index)
      .push(function (id) {
        return that._sub_storage.remove(id);
      })
      .push(function () {
        return index;
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
      });
  };

  MappingStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  MappingStorage.prototype.bulk = function () {
    var i, that = this, mapped_result = [];
    return this._sub_storage.bulk.apply(arguments)
      .push(function (result) {
        for (i = 0; i < result.length; i += 1) {
          mapped_result.push(mapDocument(that, result[i]), false);
        }
        return mapped_result;
      });
  };

  MappingStorage.prototype.buildQuery = function (option) {
    var that = this,
      i,
      query,
      property,
      select_list = [],
      sort_on = [];

    function mapQuery(one_query) {
      var i, result = "(", key;
      if (one_query.type === "complex") {
        for (i = 0; i < one_query.query_list.length; i += 1) {
          result += "(" + mapQuery(one_query.query_list[i]) + ")";
          if (i < one_query.query_list.length - 1) {
            result += " " + one_query.operator + " ";
          }
        }
        result += ")";
        return result;
      }
      if (that._mapping_dict.hasOwnProperty(one_query.key)) {
        key = that._mapping_dict[one_query.key].equal;
      } else {
        if (that._map_all_property) {
          key = one_query.key;
        }
      }
      return (key ? key + ":" : "") +
        (one_query.operator ? " " + one_query.operator : "") +
        ' "' + one_query.value + '"';
    }

    if (option.sort_on !== undefined) {
      for (i = 0; i < option.sort_on.length; i += 1) {
        property = [this._mapping_dict[option.sort_on[i][0]].equal,
          option.sort_on[i][1]];
        if (sort_on.indexOf(property) < 0) {
          sort_on.push(property);
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
        property = false;
        if (this._mapping_dict.hasOwnProperty(option.select_list[i])) {
          property = this._mapping_dict[option.select_list[i]].equal;
        } else {
          if (this._map_all_property) {
            property = option.select_list[i];
          }
        }
        if (property && sort_on.indexOf(property) < 0) {
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
      query = mapQuery(jIO.QueryFactory.create(option.query));
    }

    if (this._query.query !== undefined) {
      if (query !== undefined) {
        query += ' AND ';
      } else {
        query = "";
      }
      query += this._query.query;
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
            mapDocument(that, result.data.rows[i].value, false);
          if (result.data.rows[i].id !== undefined) {
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