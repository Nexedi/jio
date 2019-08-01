/*
 * Copyright 2018, Nexedi SA
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

/*jslint sloppy: true, nomen: true */
/*global jIO, RSVP, Blob, Query, elasticlunr, localStorage */
(function (jIO, RSVP, Blob, Query, elasticlunr, localStorage) {
  'use strict';

  var elasticlunrStorageKey = 'jio_elasticlunr',
    notifyChangeKey = elasticlunrStorageKey + '_notify';

  function notifyIndexChanged() {
    localStorage.setItem(notifyChangeKey, JSON.stringify({
      type: 'update',
      date: new Date()
    }));
    // no need to keep the actual value
    localStorage.removeItem(notifyChangeKey);
  }

  function listenIndexChanged(context) {
    window.addEventListener('storage', function (event) {
      // since we remove the item after setting it, make sure we only run once
      if (event.newValue && event.key === notifyChangeKey) {
        context._onIndexChanged();
      }
    });
  }

  function findDuplicates(array) {
    var sorted = array.slice().sort(),
      results = [],
      i;

    for (i = 0; i < sorted.length - 1; i += 1) {
      if (sorted[i + 1] === sorted[i]) {
        if (results.indexOf(sorted[i]) === -1) {
          results.push(sorted[i]);
        }
      }
    }

    return results;
  }

  function initIndex(id, indexFields) {
    var index = elasticlunr();
    indexFields.forEach(function (field) {
      index.addField(field);
    });
    index.setRef(id);
    // do not store the documents in the index
    index.saveDocument(false);
    return index;
  }

  function loadIndex(attachmentKey, storage, id, indexFields) {
    var index = null;

    return storage
      .getAttachment(attachmentKey, attachmentKey, {
        format: 'text'
      })
      .push(function (data) {
        index = elasticlunr.Index.load(JSON.parse(data));
      }, function () {
        index = initIndex(id, indexFields);
      })
      .push(function () {
        return index;
      });
  }

  function searchQuery(index, indexedFields, key, value) {
    var config = {
      boolean: "OR",
      expand: true,
      fields: {}
    };

    if (indexedFields.indexOf(key) >= 0) {
      config.fields[key] = {
        boost: 1,
        bool: 'AND'
      };

      // we can only do a single-string search, so we can
      // stop on the first indexed field we find
      return index.search(value, config).map(function (result) {
        return result.ref;
      });
    }
    return null;
  }

  function recursiveIndexQuery(index, indexedFields, query) {
    var ids = null,
      subquery,
      i,
      subids;

    if (query.query_list) {
      for (i = query.query_list.length - 1; i >= 0; i -= 1) {
        subquery = query.query_list[i];

        subids = recursiveIndexQuery(index, indexedFields, subquery);
        if (subids !== null) {
          query.query_list.splice(i, 1);
          if (ids === null) {
            ids = subids;
          } else {
            ids = findDuplicates(ids.concat(subids));
          }
        }
      }
      return ids;
    }

    return searchQuery(index, indexedFields, query.key, query.value);
  }

  /**
   * The jIO Elasticlunr extension
   *
   * @class ElasticlunrStorage
   * @constructor
   */
  function ElasticlunrStorage(spec) {
    if (!spec.index_sub_storage) {
      throw new TypeError(
        "Elasticlunr 'index_sub_storage' must be provided."
      );
    }
    this._index_sub_storage = jIO.createJIO(spec.index_sub_storage);
    if (!this._index_sub_storage.hasCapacity('getAttachment')) {
      throw new TypeError(
        "Elasticlunr 'index_sub_storage' must have getAttachment capacity."
      );
    }

    if (!spec.sub_storage) {
      throw new TypeError(
        "Elasticlunr 'sub_storage' must be provided."
      );
    }
    this._sub_storage = jIO.createJIO(spec.sub_storage);

    this._index_sub_storage_key = elasticlunrStorageKey + '_' +
      this._sub_storage.__type;
    this._index_id = spec.id || 'id';
    this._index_fields = spec.index_fields || [];

    listenIndexChanged(this);
  }

  ElasticlunrStorage.prototype._onIndexChanged = function () {
    // force-reload index from storage
    this._index = null;
    this._getIndex();
  };

  ElasticlunrStorage.prototype._getIndex = function () {
    var context = this;

    if (this._index) {
      return new RSVP.Queue().push(function () {
        return context._index;
      });
    }

    return loadIndex(
      this._index_sub_storage_key,
      this._index_sub_storage,
      this._index_id,
      this._index_fields
    ).push(function (index) {
      context._index = index;
      return context._index;
    });
  };

  ElasticlunrStorage.prototype._resetIndex = function (indexFields) {
    if (indexFields) {
      this._index_fields = indexFields;
    }
    this._index = initIndex(this._index_id, this._index_fields);
  };

  ElasticlunrStorage.prototype._saveIndex = function () {
    var context = this;

    // notify other tabs that the index has changed
    notifyIndexChanged();

    return this._getIndex()
      .push(function (index) {
        var data = JSON.stringify(index);
        return context._index_sub_storage.putAttachment(
          context._index_sub_storage_key,
          context._index_sub_storage_key,
          new Blob([data])
        );
      });
  };

  ElasticlunrStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  ElasticlunrStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(
      this._sub_storage,
      arguments
    );
  };

  ElasticlunrStorage.prototype.post = function (doc) {
    var context = this;

    return this._sub_storage.post.apply(this._sub_storage, arguments)
      .push(function (id) {
        var data = JSON.parse(JSON.stringify(doc));
        data.id = id.toString();

        return context._getIndex().push(function (index) {
          index.addDoc(data);
          return context._saveIndex();
        });
      });
  };

  ElasticlunrStorage.prototype.put = function (id, doc) {
    var context = this;

    return this._sub_storage.put.apply(this._sub_storage, arguments)
      .push(function () {
        var data = JSON.parse(JSON.stringify(doc));
        data.id = id.toString();

        return context._getIndex().push(function (index) {
          index.updateDoc(data);
          return context._saveIndex();
        });
      });
  };

  ElasticlunrStorage.prototype.remove = function (id) {
    var context = this;

    // need to get the full document to remove every data from indexes
    return this._sub_storage.get(id)
      .push(function (doc) {
        return context._sub_storage.remove(id)
          .push(function () {
            return context._getIndex();
          })
          .push(function (index) {
            index.removeDoc(doc);
            return context._saveIndex();
          });
      });
  };

  ElasticlunrStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(
      this._sub_storage,
      arguments
    );
  };

  ElasticlunrStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(
      this._sub_storage,
      arguments
    );
  };

  ElasticlunrStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(
      this._sub_storage,
      arguments
    );
  };

  ElasticlunrStorage.prototype.repair = function () {
    // rebuild index?
    var idx,
      doc_ids = [],
      context = this,
      args = arguments;
    return this._getIndex()
      .push(function (index) {
        idx = index;
        return context._sub_storage.repair.apply(context._sub_storage, args);
      })
      .push(function () {
        return context._sub_storage.allDocs();
      })
      .push(function (all_docs) {
        var i,
          queue = new RSVP.Queue(),
          add_to_queue;
        add_to_queue = function (id) {
          queue.push(function () {
            return context._sub_storage.get(id.toString());
          })
            .push(function (doc) {
              var data = JSON.parse(JSON.stringify(doc));
              data.id = id.toString();
              idx.updateDoc(data);
            });
        };
        for (i = 0; i < all_docs.data.rows.length; i += 1) {
          add_to_queue(all_docs.data.rows[i].id);
          doc_ids.push(all_docs.data.rows[i].id);
        }
        return queue;
      })
      .push(undefined, function (my_error) {
        if (my_error.status_code !== 501) {
          throw my_error; //501 = sub_storage does not have allDocs capacity
        }
      });
  };

  ElasticlunrStorage.prototype.hasCapacity = function (name) {
    var capacityList = [
      'limit', 'sort', 'select', 'query'
    ];

    if (capacityList.indexOf(name) !== -1) {
      return true;
    }
    if (name === 'index') {
      return true;
    }
    return this._sub_storage.hasCapacity(name);
  };

  ElasticlunrStorage.prototype.buildQuery = function (options) {
    var context = this,
      indexedFields = this._index_fields,
      runSubstorageQuery = options.select_list || options.include_docs,
      parsedQuery;

    if (options.query && options.query.indexOf('OR') === -1) {
      parsedQuery = jIO.QueryFactory.create(options.query);
      return context._getIndex()
        .push(function (index) {
          return recursiveIndexQuery(index, indexedFields, parsedQuery);
        })
        .push(function (ids) {
          try {
            if (context._sub_storage.hasCapacity('query_filtered')) {
              // simple query with found matches, just exec a simple list
              if ((ids || []).length && parsedQuery.type === 'simple') {
                delete options.query;
              } else {
                options.query = Query.objectToSearchText(parsedQuery);
              }

              options.ids = ids;
              return context._sub_storage.buildQuery(options);
            }
          } catch (ignore) {}

          // run query with substorage if we want to retrieve the documents
          if (runSubstorageQuery) {
            return context._sub_storage.buildQuery(options);
          }
          return (ids || []).map(function (id) {
            return {
              id: id,
              value: {}
            };
          });
        });
    }

    return this._sub_storage.buildQuery(options);
  };

  jIO.addStorage('elasticlunr', ElasticlunrStorage);
}(jIO, RSVP, Blob, Query, elasticlunr, localStorage));
