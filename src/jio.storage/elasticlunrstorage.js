/*jslint sloppy: true, nomen: true */
/*global jIO, RSVP, elasticlunr, localStorage */
(function (jIO, RSVP, elasticlunr, localStorage) {
  "use strict";

  var elasticlunrStorageKey = 'jio_elasticlunr';

  function resetIndex(id, indexFields) {
    var index = elasticlunr();
    indexFields.forEach(function (field) {
      index.addField(field);
    });
    index.setRef(id);
    // do not store the documents in the index
    index.saveDocument(false);
    return index;
  }

  function initIndex(id, indexFields) {
    var data = localStorage.getItem(elasticlunrStorageKey),
      indexDump = data ? JSON.parse(data) : null;

    if (indexDump) {
      return elasticlunr.Index.load(indexDump);
    }

    return resetIndex(id, indexFields);
  }

  function saveIndex(index) {
    var data = JSON.stringify(index);
    localStorage.setItem(elasticlunrStorageKey, data);
  }

  /**
   * The jIO Elasticlunr extension
   *
   * @class ElasticlunrStorage
   * @constructor
   */
  function ElasticlunrStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this.index = initIndex(spec.id || 'id', spec.indexFields || []);
  }

  ElasticlunrStorage.prototype.__resetIndex = function (id, indexFields) {
    this.index = resetIndex(id, indexFields);
  };

  ElasticlunrStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  ElasticlunrStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };

  ElasticlunrStorage.prototype.post = function (doc) {
    var index = this.index;
    return this._sub_storage.post.apply(this._sub_storage, arguments)
      .push(function (id) {
        var data = JSON.parse(JSON.stringify(doc));
        data.id = id.toString();
        index.addDoc(data);
        saveIndex(index);
      });
  };

  ElasticlunrStorage.prototype.put = function (id, doc) {
    var index = this.index;
    return this._sub_storage.put.apply(this._sub_storage, arguments)
      .push(function () {
        var data = JSON.parse(JSON.stringify(doc));
        data.id = id.toString();
        index.updateDoc(doc);
        saveIndex(index);
      });
  };

  ElasticlunrStorage.prototype.remove = function (id) {
    var context = this,
      index = this.index;

    // need to get the full document to remove every data from indexes
    return this._sub_storage.get(id)
      .push(function (doc) {
        return context._sub_storage.remove(id).push(function () {
          index.removeDoc(doc);
          saveIndex(index);
        });
      });
  };

  ElasticlunrStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };

  ElasticlunrStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };

  ElasticlunrStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };

  ElasticlunrStorage.prototype.repair = function () {
    // rebuild index?
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  ElasticlunrStorage.prototype.hasCapacity = function (name) {
    var this_storage_capacity_list = ["limit",
                                      "sort",
                                      "select",
                                      "query"];

    if (this_storage_capacity_list.indexOf(name) !== -1) {
      return true;
    }
    if (name === "list") {
      return this._sub_storage.hasCapacity(name);
    }
    return false;
  };

  ElasticlunrStorage.prototype.buildQuery = function (options) {
    if (!options.query) {
      return this._sub_storage.buildQuery(options);
    }

    var context = this,
      index = this.index,
      parsed_query = jIO.QueryFactory.create(options.query);

    return new RSVP.Queue()
      .push(function () {
        var fields = {};

        if (parsed_query.query_list) {
          parsed_query.query_list.forEach(function (query) {
            fields[query.key] = query.value;
          });
        } else {
          fields[parsed_query.key] = parsed_query.value;
        }

        window.console.log('search', fields);
        return index.search(fields, {
          expand: true
        });
      })
      .push(function (result) {
        return RSVP.all(result.map(function (result) {
          return context.get(result.ref).push(function (doc) {
            return {
              id: result.ref,
              value: doc
            };
          });
        }));
      });
  };

  jIO.addStorage('elasticlunr', ElasticlunrStorage);

}(jIO, RSVP, elasticlunr, localStorage));
