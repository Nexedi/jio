/*jslint indent:2, maxlen: 80, nomen: true */
/*global jIO */
(function (jIO) {
  "use strict";

  function MappingStorage(spec) {
    this._mapping_dict = spec.mapping_dict || {};
    this._default_dict = spec.default_dict || {};
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  MappingStorage.prototype._getSubStorageId = function (index) {
    var option = {};
    option.query = this._mapping_dict.id.equal + ': "' + index + '"';
    return this._sub_storage.allDocs(option)
      .push(function (data) {
        return data.data.rows[0].id;
      });
  };

  MappingStorage.prototype._mapDocFromStorage = function (object) {
    var result = {},
      that = this,
      prop;
    for (prop in that._mapping_dict) {
      if (that._mapping_dict.hasOwnProperty(prop)) {
        if (prop !== "id") {
          result[prop] = object[that._mapping_dict[prop].equal];
        }
      }
    }
    return result;
  };

  MappingStorage.prototype.get = function (index) {
    var that = this;
    if (this._mapping_dict.id === undefined ||
        this._mapping_dict.id.equal === "id") {
      return this._sub_storage.get(index)
        .push(function (result) {
          return that._mapDocFromStorage(result);
        });
    }
    return this._getSubStorageId(index)
      .push(function (id) {
        return that._sub_storage.get(id);
      })
      .push(function (result) {
        return that._mapDocFromStorage(result);
      });
  };

  MappingStorage.prototype.put = function (index, doc) {
    var prop,
      doc_mapped = JSON.parse(JSON.stringify(this._default_dict));
    for (prop in doc) {
      if (doc.hasOwnProperty(prop)) {
        doc_mapped[this._mapping_dict[prop].equal] = doc[prop];
      }
    }
    if (this._mapping_dict.id === undefined ||
         this._mapping_dict.id.equal === "id") {
      return this._sub_storage.put(index, doc_mapped);
    }
    doc_mapped[this._mapping_dict.id.equal] = index;
    return this._sub_storage.post(doc_mapped)
      .push(function () {
        return index;
      });
  };

  MappingStorage.prototype.remove = function (index) {
    var that = this;
    if (this._mapping_dict.id === undefined
        || this._mapping_dict.id.equal === "id") {
      return this._sub_storage.remove.apply(this._sub_storage,
        arguments);
    }
    return this._getSubStorageId(index)
      .push(function (id) {
        return that._sub_storage.remove(id);
      })
      .push(function () {
        return index;
      });
  };

  MappingStorage.prototype.putAttachment = function (doc_id) {
    var that = this;
    if (this._mapping_dict.id === undefined
        || this._mapping_dict.id.equal === "id") {
      return this._sub_storage.putAttachment.apply(this._sub_storage,
        arguments);
    }
    return this._getSubStorageId(doc_id)
      .push(function (id) {
        doc_id = id;
        return that._sub_storage.putAttachment.apply(that._sub_storage,
          arguments);
      });
  };

  MappingStorage.prototype.getAttachment = function (doc_id) {
    var that = this;
    if (this._mapping_dict.id === undefined
        || this._mapping_dict.id.equal === "id") {
      return this._sub_storage.getAttachment.apply(this._sub_storage,
        arguments);
    }
    return this._getSubStorageId(doc_id)
      .push(function (id) {
        doc_id = id;
        return that._sub_storage.getAttachment.apply(that._sub_storage,
          arguments);
      });
  };

  MappingStorage.prototype.removeAttachment = function (doc_id) {
    var that = this;
    if (this._mapping_dict.id === undefined
        || this._mapping_dict.id.equal === "id") {
      return this._sub_storage.removeAttachment.apply(this._sub_storage,
        arguments);
    }
    return this._getSubStorageId(doc_id)
      .push(function (id) {
        doc_id = id;
        return that._sub_storage.removeAttachment.apply(that._sub_storage,
          arguments);
      });
  };

  MappingStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  MappingStorage.prototype.buildQuery = function (option) {
    var that = this, i, select_list = [], sort_on = [], query;

    function mapQuery(one_query) {
      var i, query_list = [];
      if (one_query.type === "complex") {
        for (i = 0; i < one_query.query_list.length; i += 1) {
          query_list.push(mapQuery(one_query.query_list[i]));
        }
        return {
          operator: one_query.operator,
          query_list: query_list,
          type: "complex"
        };
      }
      return {
        key: that._mapping_dict[one_query.key].equal,
        type: "simple",
        value: one_query.value
      };
    }

    if (option.sort_on !== undefined) {
      for (i = 0; i < option.sort_on.length; i += 1) {
        sort_on.push([this._mapping_dict[option.sort_on[i][0]].equal,
          option.sort_on[i][1]]);
      }
    }
    if (option.select_list !== undefined) {
      for (i = 0; i < option.select_list.length; i += 1) {
        select_list.push(this._mapping_dict[option.select_list[i]].equal);
      }
    }
    if (this._mapping_dict.id !== undefined
        && this._mapping_dict.id.equal !== "id") {
      select_list.push(this._mapping_dict.id.equal);
    }
    query = jIO.Query.parseStringToObject(option.query);
    return this._sub_storage.allDocs(
      {
        query: mapQuery(query),
        select_list: select_list,
        sort_on: sort_on,
        limit: option.limit,
        include_docs: option.include_docs || false
      }
    )
      .push(function (result) {
        for (i = 0; i < result.data.total_rows; i += 1) {
          if (that._mapping_dict.id !== undefined
              && that._mapping_dict.id.equal !== "id") {
            result.data.rows[i].id =
              result.data.rows[i].value[that._mapping_dict.id.equal];
            delete result.data.rows[i].value[that._mapping_dict.id.equal];
          }
          result.data.rows[i].value =
            that._mapDocFromStorage(result.data.rows[i].value);
        }
        return result.data.rows;
      });
  };

  jIO.addStorage('mapping', MappingStorage);

}(jIO));