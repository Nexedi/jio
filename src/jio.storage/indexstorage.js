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
 *     "storage": [
 *         <sub storage description>,
 *         ...
 *     ]
 * }
 * Index file will contain
 * {
 *   "_id": "ipost_indices.json",
 *   "indexA": {
 *       "keyword_abc": ["some_id","some_other_id",...]
 *   },
 *   "indexAB": {
 *       "keyword_abc": ["some_id"],
 *       "keyword_def": ["some_id"]
 *   }
 * }
 */
jIO.addStorageType('indexed', function (spec, my) {

  "use strict";
  var that, priv = {}, spec;

  spec = spec || {};
  that = my.basicStorage(spec, my);

  priv.indices = spec.indices;
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
    var obj, i, j = priv.indices.length,
      new_index_object = {}, new_index_name;

    if (indices === undefined) {
      for (i = 0; i < j; i += 1) {
        new_index_name = priv.indices[i]["name"];
        new_index_object[new_index_name] = {};
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
        obj = indexToSearch[key];
        for (prop in obj) {
          if (obj[prop] === docid) {
            return passback === "bool" ? true : key;
          }
        }
      }
    return false;
  }

  /**
   * Find id in indices
   * @method isDocidInIndex
   * @param  {object} indices The file containing the indeces
   * @param  {object} doc The document which should be added to the index
   * @return {boolean} true/false
   */
  priv.isDocidInIndex = function (indices, doc) {
    var index, i, l = priv.indices.length;

    // loop indices
    for (i = 0; i < l; i += 1) {
      index = {};
      index.reference = priv.indices[i];
      index.name = index.reference["name"];
      index.size = priv.getObjectSize(indices[index.name]);
      index.result_array;

      if (index.size > 0) {
        if (priv.searchIndexByValue(indices[index.name], doc._id, "bool")) {
          return true
        };
      }
    }
    return false;
  }
  priv.cleanIndices = function (indices, doc) {
    var i, j, k, index, key, obj, prop, l = priv.indices.length,
      docid = doc._id;

    // loop indices (indexA, indexAB...)
    for (i = 0; i < l; i += 1) {
      // index object (reference and current-iteration)
      index = {};
      index.reference = priv.indices[i];
      index.name = index.reference["name"];
      index.current = indices[index.name];
      index.current_size = priv.getObjectSize(index.current);

      for (j = 0; j < index.current_size; j++) {
        key = priv.searchIndexByValue(index.current, doc._id, "key");
        index.result_array = index.current[key];
        if (!!key) {
          // if there is more than one docid in the result array,
          // just remove this one and not the whole array
          if (index.result_array.length > 1) {
            index.result_array.splice(k,1);
          } else {
            delete index.current[key];
          }
        }
      }
    }
    return indices;
  }
  /**
   * Adds entries to indices
   * @method createEmptyIndexArray
   * @param  {object} indices The file containing the indeces
   * @param  {object} doc The document which should be added to the index
   */
  priv.updateIndices = function (indices, doc) {
    var i, j, k, m, index,value, label, key, l = priv.indices.length;

    // loop indices
    for (i = 0; i < l; i += 1) {
      // index object (reference and current iteration)
      index = {};
      index.reference = priv.indices[i];
      index.reference_size = index.reference.fields.length;
      index.name = index.reference["name"];
      index.field_array = [];
      index.current = indices[index.name];
      index.current_size = priv.getObjectSize(index.current);

      // build array of values to create entries in index
      for (j = 0; j < index.reference_size; j += 1) {
        label = index.reference.fields[j]
        value = doc[label];
        if (value !== undefined) {
          // add a new entry
          index.field_array.push(value);

          // remove existing entries with same docid
          // because items are stored as "keyword:id" pairs this is tricky
          if (index.current_size > 0) {
            key = priv.searchIndexByValue(indices[index.name], doc._id, "key");
            if (!!key) {
              delete index.current[key];
            }
          }
        }
      }
      // create keyword entries
      if (index.current !== undefined) {
        m = index.field_array.length;
        if (m) {
          for (k = 0; k < m; k += 1) {
            index.current_keyword = [index.field_array[k]];
            if (index.current[index.current_keyword] === undefined) {
              index.current[index.current_keyword] = [];
            }
            index.current[index.current_keyword].push(doc._id);
          }
        }
      }
    }
    return indices;
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
      index, key, obj, prop, found, file,
      unique_count = 0, unique_docids = [], all_doc_response = {};

    // loop indices
    for (i = 0; i < l; i += 1) {
      index = {};
      index.reference = priv.indices[i];
      index.name = index.reference["name"];
      index.current = indices[index.name];
      index.current_size = priv.getObjectSize(index.current);

      // a lot of loops, not sure this is the fastest way
      for (j = 0; j < index.current_size; j += 1) {
        for (key in index.current) {
          obj = index.current[key];
          for (prop in obj) {
            for ( k = 0; k < unique_docids.length; k++ ) {
              if ( obj[prop] === unique_docids[k] ) {
                found = true;
                break;
              }
            }
            if (!found) {
              unique_docids.push( obj[prop] );
              unique_count += 1;
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
          function (content) {
            file = { value: {} };
            file.id = unique_docids[n];
            file.key = unique_docids[n];
            file.doc = content;
            all_doc_response.rows.push(file);
            // async counter, must be in callback
            n += 1;
            if (n === (unique_count)) {
              that.success(all_doc_response);
            }
          },
          function (error) {
            that.error({
              "status": 404,
              "statusText": "Not Found",
              "error": "not_found",
              "message": "Cannot find the document",
              "reason": "Cannot get a document from substorage"
            });
          }
        );
      } else {
        file = { value: {} };
        file.id = unique_docids[m];
        file.key = unique_docids[m];
        all_doc_response.rows.push(file);
        if (m === (unique_count-1)) {
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
  priv.postOrput = function (command, source) {
    var f = {}, indices, doc, docid;
    doc = command.cloneDoc();
    docid = command.getDocId();
    if (typeof docid !== "string") {
      doc._id = priv.generateUuid();
      docid = doc._id;
    }
    f.getIndices = function () {
      var option = command.cloneOption();
      if (option.max_retry === 0) {
        option.max_retry = 3;
      }
      that.addJob(
        "get",
        priv.substorage,
        priv.index_suffix,
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
      } else {
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
              docid = docid + '/' + command.getAttachmentId();
              that.success({
                "ok": true,
                "id": docid
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
                  "id": docid
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
      }
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
            "id": docid
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
    priv.postOrput(command, 'POST');
  };

  /**
   * Update the document metadata and update the index
   * @method put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    priv.postOrput(command, 'PUT');
  };

  /**
   * Add an attachment to a document (no index modification)
   * @method putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    priv.postOrput(command, 'PUTATTACHMENT');
  };

  /**
   * Get the document metadata or attachment.
   * Options:
   * - {boolean} revs Add simple revision history (false by default).
   * - {boolean} revs_info Add revs info (false by default).
   * - {boolean} conflicts Add conflict object (false by default).
   * @method get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    var option, docid;
    option = command.cloneOption();
    if (option.max_retry === 0) {
      option.max_retry = 3;
    }
    if (command.getAttachmentId() !== undefined) {
      docid = command.getDocId() + '/' + command.getAttachmentId();
    } else {
      docid = command.getDocId();
    }
    that.addJob(
      "get",
      priv.substorage,
      docid,
      option,
      function (response) {
        that.success(response);
      },
      function (err) {
        that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Cannot find the attachment",
          "reason": "Document/Attachment not found"
        });
      }
    );
  };

  /**
   * Remove document or attachment - removing documents updates index!.
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    var f = {}, indices, doc, docid, option;

    doc = command.cloneDoc();
    option = command.cloneOption();
    if (option.max_retry === 0) {
      option.max_retry = 3;
    }

    f.removeDocument = function (type) {
      if (type === 'doc') {
        docid = command.getDocId();
      } else {
        docid = command.getDocId() + '/' + command.getAttachmentId();
      }
      that.addJob(
        "remove",
        priv.substorage,
        docid,
        option,
        function (response) {
          that.success(response);
        },
        function (err) {
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
        priv.index_suffix,
        option,
        function (response) {
          // if deleting an attachment
          if (typeof command.getAttachmentId() === 'string'){
            f.removeDocument('attachment')
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
    var f = {}, indices, option, include_docs, all_docs_response;
    option = command.cloneOption();
    if (option.max_retry === 0) {
      option.max_retry = 3;
    }

    f.getIndices = function () {
      that.addJob(
        "get",
        priv.substorage,
        priv.index_suffix,
        option,
        function (response) {
          if (command.getOption('include_docs')) {
            priv.allDocsResponseFromIndex(response, true, option);
          } else {
            all_docs_response =
              priv.allDocsResponseFromIndex(response, false, option);
              that.success(all_docs_response);
          }
        },
        function (err) {
          that.error({
            "status": 404,
            "statusText": "Not Found",
            "error": "not_found",
            "message": "Document index not found",
            "reason": "There are no documents in the storage"
          });
        return;
        }
      );
    };
    f.getIndices();
  };
  return that;
});
