/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/
/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, localStorage: true, setTimeout: true */
/**
 * JIO Index Storage.
 * Manages indexes for specified storages.
 * Description:
 * {
 *     "type": "index",
 *     "indices": [
 *        {"indexA",["field_A"]},
 *        {"indexAB",["field_A","field_B"]}
 *     ],
 *     "field_types": {
 *        "field_A": "dateTime",
 *        "field_B": "string"
 *      },
 *     "storage": [
 *         <sub storage description>,
 *         ...
 *     ]
 * }
 * Index file will contain
 * {
 *   "_id": "app-name_indices.json",
 *   "indexA":
 *      "fieldA": {
 *        "keyword_abc": ["some_id","some_other_id",...]
 *      }
 *   },
 *   "indexAB": {
 *     "fieldA": {
 *       "keyword_abc": ["some_id"]
 *      },
 *     "fieldB": {
 *       "keyword_def": ["some_id"]
*      }
 *   }
 * }
 * NOTES:
 * It may be difficult to "un-sort" multi-field indices, like
 * indexAB, because all keywords will be listed regrardless
 * of underlying field, so an index on author and year would produce
 * two entries per record like:
 * 
 * "William Shakespeare":["id_Romeo_and_Juliet", "id_Othello"],
 * "1591":["id_Romeo_and_Juliet"],
 * "1603":["id_Othello"]
 * 
 * So for direct lookups, this should be convient, but for other types
 * of queries, it depends
 */
jIO.addStorageType('indexed', function (spec, my) {

  "use strict";
  var that, priv = {};

  spec = spec || {};
  that = my.basicStorage(spec, my);

  priv.indices = spec.indices;
  priv.field_types = spec.field_types;
  priv.substorage_key = "sub_storage";
  priv.substorage = spec[priv.substorage_key];
  priv.index_indicator = spec.sub_storage.application_name || "index";
  priv.index_suffix = priv.index_indicator + "_indices.json";

  my.env = my.env || spec.env || {};

  that.specToStore = function () {
    var o = {};
    o[priv.substorage_key] = priv.substorage;
    o.env = my.env;
    return o;
  };

  /**
   * Generate a new uuid
   * @method generateUuid
   * @return {string} The new uuid
   */
  priv.generateUuid = function () {
    var S4 = function () {
      var i, string = Math.floor(
        Math.random() * 0x10000 /* 65536 */
      ).toString(16);
      for (i = string.length; i < 4; i += 1) {
        string = "0" + string;
      }
      return string;
    };
    return S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();
  };

  /**
  * Get number of elements in object
  * @method getObjectSize
  * @param  {object} obj The object to check
  * @return {number} size The amount of elements in the object
  */
  priv.getObjectSize = function (obj) {
    var size = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        size += 1;
      }
    }
    return size;
  };

  /**
   * Creates an empty indices array
   * @method createEmptyIndexArray
   * @param  {array} indices An array of indices (optional)
   * @return {object} The new index array
   */
  priv.createEmptyIndexArray = function (indices) {
    var i, k, j = priv.indices.length, new_index,
      new_index_object = {}, new_index_name, new_index_fields;

    if (indices === undefined) {
      for (i = 0; i < j; i += 1) {
        new_index = priv.indices[i];
        new_index_name = new_index.name;
        new_index_fields = new_index.fields;
        new_index_object[new_index_name] = {};

        // loop index fields and add objects to hold value/id pairs
        for (k = 0; k < new_index_fields.length; k += 1) {
          new_index_object[new_index_name][new_index_fields[k]] = {};
        }
      }
    }
    return new_index_object;
  };

  /**
   * Determine if a key/value pair exists in an object by VALUE
   * @method searchObjectByValue
   * @param  {object} indexToSearch The index to search
   * @param  {string} docid The document id to find
   * @param  {string} passback The value that should be returned
   * @return {boolean} true/false
   */
  priv.searchIndexByValue = function (indexToSearch, docid, passback) {
    var key, obj, prop;

    for (key in indexToSearch) {
      if (indexToSearch.hasOwnProperty(key)) {
        obj = indexToSearch[key];
        for (prop in obj) {
          if (obj[prop] === docid) {
            return passback === "bool" ? true : key;
          }
        }
      }
    }
    return false;
  };

  /**
   * Get element position in array
   * @method getPositionInArray
   * @param  {object} indices The index file
   * @param  {object} indices The index file
   * @returns {number} i Position of element in array
   */
  priv.getPositionInArray = function (element, array) {
    var i, l = array.length;
    for (i = 0; i < l; i += 1) {
      if (array[i] === element) {
        return i;
      }
    }
    return null;
  };

  /**
   * Find id in indices
   * @method isDocidInIndex
   * @param  {object} indices The file containing the indeces
   * @param  {object} doc The document which should be added to the index
   * @return {boolean} true/false
   */
  priv.isDocidInIndex = function (indices, doc) {
    var index, i, j, label, l = priv.indices.length;

    // loop indices
    for (i = 0; i < l; i += 1) {
      index = {};
      index.reference = priv.indices[i];
      index.reference_size = index.reference.fields.length;
      index.current = indices[index.reference.name];

      for (j = 0; j < index.reference_size; j += 1) {
        label = index.reference.fields[j];
        index.current_size = priv.getObjectSize(index.current[label]);

        // check for existing entries to remove (put-update)
        if (index.current_size > 0) {
          if (priv.searchIndexByValue(index.current[label], doc._id, "bool")) {
            return true;
          }
        }
      }
    }
    return false;
  };

  /**
   * Clean up indexes when removing a file
   * @method cleanIndices
   * @param  {object} indices The file containing the indeces
   * @param  {object} doc The document which should be added to the index
   * @return {object} indices The cleaned up file
   */
  priv.cleanIndices = function (indices, doc) {
    var i, j, k, index, key, label, l = priv.indices.length;

    // loop indices (indexA, indexAB...)
    for (i = 0; i < l; i += 1) {
      index = {};
      index.reference = priv.indices[i];
      index.reference_size = index.reference.fields.length;
      index.current = indices[index.reference.name];

      // loop index fields
      for (j = 0; j < index.reference_size; j += 1) {
        label = index.reference.fields[j];
        index.current_size = priv.getObjectSize(index.current[label]);

        // loop field entries
        for (k = 0; k < index.current_size; k += 1) {
          key = priv.searchIndexByValue(index.current[label], doc._id, "key");
          index.result_array = index.current[label][key];
          if (!!key) {
            // if there is more than one docid in the result array,
            // just remove this one and not the whole array
            if (index.result_array.length > 1) {
              index.result_array.splice(k, 1);
            } else {
              delete index.current[label][key];
            }
          }
        }
      }
    }
    return indices;
  };
  /**
   * Adds entries to indices
   * @method createEmptyIndexArray
   * @param  {object} indices The file containing the indeces
   * @param  {object} doc The document which should be added to the index
   */
  priv.updateIndices = function (indices, doc) {
    var i, j, index, value, label, key, l = priv.indices.length;

    // loop indices
    for (i = 0; i < l; i += 1) {
      index = {};
      index.reference = priv.indices[i];
      index.reference_size = index.reference.fields.length;
      index.current = indices[index.reference.name];

      // build array of values to create entries in index
      for (j = 0; j < index.reference_size; j += 1) {
        label = index.reference.fields[j];
        value = doc[label];
        if (value !== undefined) {
          index.current_size = priv.getObjectSize(index.current[label]);

          // check for existing entries to remove (put-update)
          if (index.current_size > 0) {
            key = priv.searchIndexByValue(
              index.current[label],
              doc._id,
              "key"
            );
            if (!!key) {
              delete index.current[label][key];
            }
          }
          if (index.current[label][value] === undefined) {
            index.current[label][value] = [];
          }
          // add a new entry
          index.current[label][value].push(doc._id);
        }
      }
    }
    return indices;
  };

  /**
   * Check available indices to find the best one.
   * TODOS: NOT NICE, redo
   * @method findBestIndexForQuery
   * @param  {object} syntax of query
   * @returns {object} response The query object constructed from Index file
   */
  priv.findBestIndexForQuery = function (syntax) {
    var i, j, k, l, n, p, o, element, key, block,
      search_ids, use_index = [], select_ids = {}, index, query_param,
      current_query, current_query_size;

    // try to parse into object
    if (syntax.query !== undefined) {
      current_query = jIO.ComplexQueries.parse(syntax.query);
    } else {
      current_query = {};
      current_query_size = 0;
    }

    // loop indices
    for (i = 0; i < priv.indices.length; i += 1) {
      search_ids = [];
      block = false;
      index = {};
      index.reference = priv.indices[i];
      index.reference_size = index.reference.fields.length;

      if (current_query_size !== 0) {
        // rebuild search_ids for iteration
        if (current_query.query_list === undefined) {
          search_ids.push(current_query.id);
        } else {
          for (j = 0; j < current_query.query_list.length; j += 1) {
            if (priv.getPositionInArray(current_query.query_list[j].id,
                search_ids) === null) {
              search_ids.push(current_query.query_list[j].id);
            }
          }
        }

        // loop search ids and find matches in index
        for (k = 0; k < search_ids.length; k += 1) {
          query_param = search_ids[0];
          for (l = 0; l < index.reference_size; l += 1) {
            if (query_param === index.reference.fields[l]) {
              search_ids.splice(
                priv.getPositionInArray(query_param, search_ids),
                1
              );
            }
          }
        }
      }

      // rebuild select_ids
      for (o = 0; o < syntax.filter.select_list.length; o += 1) {
        element = syntax.filter.select_list[o];
        select_ids[element] = true;
      }

      // search_ids empty  = all needed search fields found on index
      if (search_ids.length === 0) {
        p = priv.getObjectSize(select_ids);
        if (p === 0) {
          use_index.push({
            "name": index.reference.name,
            "search": true,
            "results": false
          });
        } else {
          for (n = 0; n < index.reference_size; n += 1) {
            delete select_ids[index.reference.fields[n]];
          }
          for (key in select_ids) {
            if (select_ids.hasOwnProperty(key)) {
              use_index.push({
                "name": index.reference.name,
                "search": true,
                "results": false
              });
              block = true;
            }
          }
          if (block === false) {
            use_index.push({
              "name": index.reference.name,
              "search": true,
              "results": true
            });
          }
        }
      }
    }
    return use_index;
  };

  /**
   * Converts the indices file into an object usable by complex queries
   * @method constructQueryObject
   * @param  {object} indices The index file
   * @returns {object} response The query object constructed from Index file
   */
  priv.constructQueryObject = function (indices, query_syntax) {
    var j, k, l, m, n, use_index, index,
      index_name, field_names, field, key, element,
      query_index, query_object = [], field_name,
      entry;

    // returns index-to-use|can-do-query|can-do-query-and-results
    use_index = priv.findBestIndexForQuery(query_syntax);

    if (use_index.length > 0) {
      for (j = 0; j < use_index.length; j += 1) {
        index = use_index[j];

        // NOTED: the index could be used to:
        // (a) get all document ids matching query
        // (b) get all document ids and results (= run complex query on index)
        // right now, only (b) is supported, because the complex query is
        // a single step process. If it was possible to first get the 
        // relevant document ids, then get the results, the index could be
        // used to do the first step plus use GET on the returned documents
        if (index.search && index.results) {
          index_name = use_index[j].name;
          query_index = indices[index_name];

          // get fieldnames from this index
          for (k = 0; k < priv.indices.length; k += 1) {
            if (priv.indices[k].name === use_index[j].name) {
              field_names = priv.indices[k].fields;
            }
          }
          for (l = 0; l < field_names.length; l += 1) {
            field_name = field_names[l];
            // loop entries for this field name
            field = query_index[field_name];
            for (key in field) {
              if (field.hasOwnProperty(key)) {
                element = field[key];
                // key can be "string" or "number" right now
                if (priv.field_types[field_name] === "number") {
                  key = +key;
                }
                for (m = 0; m < element.length; m += 1) {
                  if (priv.searchIndexByValue(
                      query_object,
                      element[m],
                      "bool"
                    )) {
                    // loop object
                    for (n = 0; n < query_object.length; n += 1) {
                      entry = query_object[n];
                      if (entry.id === element[m]) {
                        entry[field_name] = key;
                      }
                    }
                  } else {
                    entry = {};
                    entry.id = element[m];
                    entry[field_name] = key;
                    query_object.push(entry);
                  }
                }
              }
            }
          }
        }
      }
    }
    return query_object;
  };
  /**
   * Build the alldocs response from the index file (overriding substorage)
   * @method allDocsResponseFromIndex
   * @param  {object} command The JIO command
   * @param  {boolean} include_docs Whether to also supply the document
   * @param  {object} option The options set for this method
   * @returns {object} response The allDocs response
   */
  priv.allDocsResponseFromIndex = function (indices, include_docs, option) {
    var i, j, k, m, n = 0, l = priv.indices.length,
      index, key, obj, prop, found, file, label,
      unique_count = 0, unique_docids = [], all_doc_response = {},
      success = function (content) {
        file = { value: {} };
        file.id = unique_docids[n];
        file.key = unique_docids[n];
        file.doc = content;
        all_doc_response.rows.push(file);
        // async counter, must be in callback
        n += 1;
        if (n === unique_count) {
          that.success(all_doc_response);
        }
      },
      error = function () {
        that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Cannot find the document",
          "reason": "Cannot get a document from substorage"
        });
        return;
      };

    // loop indices
    for (i = 0; i < l; i += 1) {
      index = {};
      index.reference = priv.indices[i];
      index.reference_size = index.reference.fields.length;
      index.current = indices[index.reference.name];

      // a lot of loops, not sure this is the fastest way
      // loop index fields
      for (j = 0; j < index.reference_size; j += 1) {
        label = index.reference.fields[j];
        index.current_field = index.current[label];
        index.current_size = priv.getObjectSize(index.current_field);

        // loop field id array
        for (j = 0; j < index.current_size; j += 1) {
          for (key in index.current_field) {
            if (index.current_field.hasOwnProperty(key)) {
              obj = index.current_field[key];
              for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                  for (k = 0; k < unique_docids.length; k += 1) {
                    if (obj[prop] === unique_docids[k]) {
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    unique_docids.push(obj[prop]);
                    unique_count += 1;
                  }
                }
              }
            }
          }
        }
      }
    }

    // construct allDocs response
    all_doc_response.total_rows = unique_count;
    all_doc_response.rows = [];
    for (m = 0; m < unique_count; m += 1) {
      // include_docs
      if (include_docs) {
        that.addJob(
          "get",
          priv.substorage,
          unique_docids[m],
          option,
          success,
          error
        );
      } else {
        file = { value: {} };
        file.id = unique_docids[m];
        file.key = unique_docids[m];
        all_doc_response.rows.push(file);
        if (m === (unique_count - 1)) {
          return all_doc_response;
        }
      }
    }
  };

  /**
   * Post document to substorage and create/update index file(s)
   * @method post
   * @param  {object} command The JIO command
   * @param  {string} source The source of the function call
   */
  priv.postOrPut = function (command, source) {
    var f = {}, indices, doc;
    doc = command.cloneDoc();
    if (typeof doc._id !== "string") {
      doc._id = priv.generateUuid();
    }
    f.getIndices = function () {
      var option = command.cloneOption();
      that.addJob(
        "get",
        priv.substorage,
        {"_id": priv.index_suffix},
        option,
        function (response) {
          indices = response;
          f.postDocument("put");
        },
        function (err) {
          switch (err.status) {
          case 404:
            if (source !== 'PUTATTACHMENT') {
              indices = priv.createEmptyIndexArray();
              f.postDocument("post");
            } else {
              that.error({
                "status": 404,
                "statusText": "Not Found",
                "error": "not found",
                "message": "Document not found",
                "reason": "Document not found"
              });
              return;
            }
            break;
          default:
            err.message = "Cannot retrieve index array";
            that.error(err);
            break;
          }
        }
      );
    };
    f.postDocument = function (index_update_method) {
      if (priv.isDocidInIndex(indices, doc) && source === 'POST') {
        // POST the document already exists
        that.error({
          "status": 409,
          "statusText": "Conflicts",
          "error": "conflicts",
          "message": "Cannot create a new document",
          "reason": "Document already exists"
        });
        return;
      }
      if (source !== 'PUTATTACHMENT') {
        indices = priv.updateIndices(indices, doc);
      }
      that.addJob(
        source === 'PUTATTACHMENT' ? "putAttachment" : "post",
        priv.substorage,
        doc,
        command.cloneOption(),
        function () {
          if (source !== 'PUTATTACHMENT') {
            f.sendIndices(index_update_method);
          } else {
            that.success({
              "ok": true,
              "id": doc._id,
              "attachment": doc._attachment
            });
          }
        },
        function (err) {
          switch (err.status) {
          case 409:
            // file already exists
            if (source !== 'PUTATTACHMENT') {
              f.sendIndices(index_update_method);
            } else {
              that.success({
                "ok": true,
                "id": doc._id
              });
            }
            break;
          default:
            err.message = "Cannot upload document";
            that.error(err);
            break;
          }
        }
      );
    };
    f.sendIndices = function (method) {
      indices._id = priv.index_suffix;
      that.addJob(
        method,
        priv.substorage,
        indices,
        command.cloneOption(),
        function () {
          that.success({
            "ok": true,
            "id": doc._id
          });
        },
        function (err) {
          // xxx do we try to delete the posted document ?
          err.message = "Cannot save index file";
          that.error(err);
        }
      );
    };
    f.getIndices();
  };

  /**
   * Update the document metadata and update the index
   * @method put
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    priv.postOrPut(command, 'POST');
  };

  /**
   * Update the document metadata and update the index
   * @method put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    priv.postOrPut(command, 'PUT');
  };

  /**
   * Add an attachment to a document (no index modification)
   * @method putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    priv.postOrPut(command, 'PUTATTACHMENT');
  };

  /**
   * Get the document metadata
   * @method get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    that.addJob(
      "get",
      priv.substorage,
      command.cloneDoc(),
      command.cloneOption(),
      function (response) {
        that.success(response);
      },
      function (err) {
        that.error(err);
      }
    );
  };

  /**
   * Get the attachment.
   * @method getAttachment
   * @param  {object} command The JIO command
   */
  that.getAttachment = function (command) {
    that.addJob(
      "getAttachment",
      priv.substorage,
      command.cloneDoc(),
      command.cloneOption(),
      function (response) {
        that.success(response);
      },
      function (err) {
        that.error(err);
      }
    );
  };

  /**
   * Remove document - removing documents updates index!.
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    var f = {}, indices, doc, docid, option;

    doc = command.cloneDoc();
    option = command.cloneOption();

    f.removeDocument = function (type) {
      that.addJob(
        "remove",
        priv.substorage,
        doc,
        option,
        function (response) {
          that.success(response);
        },
        function () {
          that.error({
            "status": 409,
            "statusText": "Conflict",
            "error": "conflict",
            "message": "Document Update Conflict",
            "reason": "Could not delete document or attachment"
          });
        }
      );
    };
    f.getIndices = function () {
      that.addJob(
        "get",
        priv.substorage,
        {"_id": priv.index_suffix},
        option,
        function (response) {
          // if deleting an attachment
          if (typeof command.getAttachmentId() === 'string') {
            f.removeDocument('attachment');
          } else {
            indices = priv.cleanIndices(response, doc);
            // store update index file
            that.addJob(
              "put",
              priv.substorage,
              indices,
              command.cloneOption(),
              function () {
                // remove actual document
                f.removeDocument('doc');
              },
              function (err) {
                err.message = "Cannot save index file";
                that.error(err);
              }
            );
          }
        },
        function () {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Document index not found, please check document ID",
            "reason": "Incorrect document ID"
          });
          return;
        }
      );
    };
    f.getIndices();
  };

  /**
   * Remove document - removing documents updates index!.
   * @method remove
   * @param  {object} command The JIO command
   */
  that.removeAttachment = function (command) {
    var f = {}, indices, doc, docid, option;
    doc = command.cloneDoc();
    option = command.cloneOption();
    f.removeDocument = function (type) {
      that.addJob(
        "removeAttachment",
        priv.substorage,
        doc,
        option,
        that.success,
        that.error
      );
    };
    f.getIndices = function () {
      that.addJob(
        "get",
        priv.substorage,
        {"_id": priv.index_suffix},
        option,
        function (response) {
          // if deleting an attachment
          if (typeof command.getAttachmentId() === 'string') {
            f.removeDocument('attachment');
          } else {
            indices = priv.cleanIndices(response, doc);
            // store update index file
            that.addJob(
              "put",
              priv.substorage,
              indices,
              command.cloneOption(),
              function () {
                // remove actual document
                f.removeDocument('doc');
              },
              function (err) {
                err.message = "Cannot save index file";
                that.error(err);
              }
            );
          }
        },
        function (err) {
          that.error(err);
        }
      );
    };
    f.getIndices();
  };

  /**
   * Gets a document list from the substorage
   * Options:
   * - {boolean} include_docs Also retrieve the actual document content.
   * @method allDocs
   * @param  {object} command The JIO command
   */
  //{
  // "total_rows": 4,
  // "rows": [
  //    {
  //    "id": "otherdoc",
  //    "key": "otherdoc",
  //    "value": {
  //      "rev": "1-3753476B70A49EA4D8C9039E7B04254C"
  //    }
  //  },{...}
  // ]
  //}
  that.allDocs = function (command) {
    var f = {}, option, all_docs_response, query_object, query_syntax,
      query_response;
    option = command.cloneOption();

    f.getIndices = function () {
      that.addJob(
        "get",
        priv.substorage,
        {"_id": priv.index_suffix},
        option,
        function (response) {
          query_syntax = command.getOption('query');
          if (query_syntax !== undefined) {
            // build complex query object
            query_object = priv.constructQueryObject(response, query_syntax);
            if (query_object.length === 0) {
              that.addJob(
                "allDocs",
                priv.substorage,
                undefined,
                option,
                that.success,
                that.error
              );
            } else {
              // we can use index, run query on index
              query_response =
                jIO.ComplexQueries.query(query_syntax, query_object);
              that.success(query_response);
            }
          } else if (command.getOption('include_docs')) {
            priv.allDocsResponseFromIndex(response, true, option);
          } else {
            all_docs_response =
              priv.allDocsResponseFromIndex(response, false, option);
            that.success(all_docs_response);
          }
        },
        that.error
      );
    };
    f.getIndices();
  };
  return that;
});
