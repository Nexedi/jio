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
  * Escape string before storing
  * @method sanitizeValue
  * @param  {string} s The string to be sanitized
  * @return {string} The sanitized string
  */
  priv.sanitizeValue = function (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
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
   * Find id in indices
   * @method docidInIndex
   * @param  {object} indices The file containing the indeces
   * @param  {object} doc The document which should be added to the index
   * @return {boolean} true/false
   */
  priv.docidInIndex = function (indices, doc) {
    var i, j, l = priv.indices.length, elements_to_check,
      index, index_name, index_length;

    // loop indices
    for (i = 0; i < l; i += 1) {
      index = priv.indices[i];
      index_name = index["name"];
      index_length = index.fields.length;
      elements_to_check = priv.getObjectSize(indices[index_name]);

      if (elements_to_check > 0) {
        for (var key in indices[index_name]) {
          var obj = indices[index_name][key];
          for (var prop in obj) {
            if (obj[prop] === doc._id) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  /**
   * Adds entries to indices
   * @method createEmptyIndexArray
   * @param  {object} indices The file containing the indeces
   * @param  {object} doc The document which should be added to the index
   */
  priv.updateIndeces = function (indices, doc) {
    var i, j, k, m, value,
      index, index_name, index_length, index_field_array,
      l = priv.indices.length,
      docid = doc._id;

    // loop indices
    for (i = 0; i < l; i += 1) {
      index = priv.indices[i];
      index_name = index["name"];
      index_length = index.fields.length;
      index_field_array = [];

      // loop index fields [keywords]
      for (j = 0; j < index_length; j += 1) {
        value = doc[index.fields[j]];
        if (value !== undefined) {
          index_field_array.push(value);
        }
      }

      m = index_field_array.length;
      if (m) {
        for (k = 0; k < m; k += 1) {
          if (indices[index_name] !== undefined) {
            if (indices[index_name][index_field_array[k]] === undefined) {
              indices[index_name][index_field_array[k]] = [];
            }
            indices[index_name][index_field_array[k]].push(docid);
          }
        }
      }
    }
    return indices;
  };

  /**
   * Post document to substorage and create/update index file(s)
   * @method post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
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
          console.log("index file found, we post(put)");
          console.log( indices );
          indices = response;
          f.postDocument("put");
        },
        function (err) {
          switch (err.status) {
          case 404:
            indices = priv.createEmptyIndexArray();
            f.postDocument("post");
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
      // if the index file already has an entry with this id,
      // the document already exists
      if (priv.docidInIndex(indices, doc) && index_update_method === 'POST') {
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
        indices = priv.updateIndeces(indices, doc);
        that.addJob(
          "post",
          priv.substorage,
          doc,
          command.cloneOption(),
          function () {
            f.sendIndices(index_update_method);
          },
          function (err) {
            switch (err.status) {
            case 409:
              // file already exists
              f.sendIndices(index_update_method);
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
  that.put = function (command) {
    that.post(command);
  };
/*
  /**
   * @method formatToFileObject
   * @param  {} row
   * @return {} obj
  *//*
  priv.formatToFileObject = function (row) {
    var k, obj = {
      _id: row.id
    };
    for (k in row.value) {
      if (row.value.hasOwnProperty(k)) {
        obj[k] = row.value[k];
      }
    }
    return obj;
  };
*/
  /**
   * @method allDocs
   * @param  {} files_object
   * @return {} obj
  *//*
  priv.allDocs = function (files_object) {
    var k, obj = {
      rows: []
    }, i = 0;
    for (k in files_object) {
      if (files_object.hasOwnProperty(k)) {
        obj.rows[i] = {};
        obj.rows[i].value = files_object[k];
        obj.rows[i].id = obj.rows[i].key = obj.rows[i].value._id;
        delete obj.rows[i].value._id;
        i += 1;
      }
    }
    obj.total_rows = obj.rows.length;
    return obj;
  };
*/
  /**
   * @method setFileArray
   * @param  {} file_array
  *//*
  priv.setFileArray = function (file_array) {
    var i, obj = {};
    for (i = 0; i < file_array.length; i += 1) {
      obj[file_array[i].id] = priv.formatToFileObject(file_array[i]);
    }
    localStorage.setItem(storage_file_object_name, obj);
  };
*/
  /**
   * @method getFileObject
   * @param  {} docid
   * @return {} obj
  *//*
  priv.getFileObject = function (docid) {
    var obj = localStorage.getItem(storage_file_object_name) || {};
    return obj[docid];
  };
*/
  /**
   * @method addFile
   * @param  {} file_obj
  *//*
  priv.addFile = function (file_obj) {
    var obj = localStorage.getItem(storage_file_object_name) || {};
    obj[file_obj._id] = file_obj;
    localStorage.setItem(storage_file_object_name, obj);
  };
*/
  /**
   * @method removeFile
   * @param  {} docid
  *//*
  priv.removeFile = function (docid) {
    var obj = localStorage.getItem(storage_file_object_name) || {};
    delete obj[docid];
    localStorage.setItem(storage_file_object_name, obj);
  };
*/
  /**
   * updates the storage.
   * It will retreive all files from a storage. It is an asynchronous task
   * so the update can be on going even if IndexedStorage has already
   * returned the result.
   * @method update
  *//*
  priv.update = function () {
    that.addJob(
      'allDocs',
      priv.sub_storage_spec,
      null,
      {max_retry: 3},
      function (response) {
        priv.setFileArray(response.rows);
      },
      function () {}
    );
  };
*/
  /**
   * Add put job to substorage and create/update index file(s)
   * @method put
   * @param  {object} command The JIO command
   *//*
  that.put = function (command) {
    var cloned_doc = command.cloneDoc(),
      cloned_option = command.cloneOption();
    // create/update indexStorage

    //  fwd job
    that.addJob('put', priv.sub_storage_spec, cloned_doc,
      cloned_option,
      function (response) {
        priv.update();
        that.success(response);
      },
      function (error) {
        that.error(error);
      }
    );
  };

  *//**
   * Loads a document.
   * @method get
  *//*
  that.get = function (command) {
    // jslint unused var file_array
    var success = function (val) {
        that.success(val);
      },
      error = function (err) {
        that.error(err);
      },
      get = function () {
        var cloned_option = command.cloneOption();
        that.addJob('get', priv.sub_storage_spec, command.cloneDoc(),
          cloned_option, success, error);
        that.end();
      };
    priv.indexStorage();
    priv.update();
    if (command.getOption('metadata_only')) {
      setTimeout(function () {
        var file_obj = priv.getFileObject(command.getDocId());
        if (file_obj && (file_obj._last_modified || file_obj._creation_date)) {
          that.success(file_obj);
        } else {
          get();
        }
      });
    } else {
      get();
    }
  }; // end get
 *//**
   * Removes a document.
   * @method remove
   *//*
  that.remove = function (command) {
    var success = function (val) {
      priv.removeFile(command.getDocId());
      priv.update();
      that.success(val);
    },
      error = function (err) {
        that.error(err);
      };
    that.addJob('remove', priv.sub_storage_spec, command.cloneDoc(),
      command.cloneOption(), success, error);
  };
  *//**
   * Gets a document list.
   * @method allDocs
   */
  /*
  that.allDocs = function (command) {
    var obj = localStorage.getItem(storage_file_object_name),
      success,
      error;

    if (obj) {
      priv.update();
      setTimeout(function () {
        that.success(priv.allDocs(obj));
      });
    } else {
      success = function (val) {
        priv.setFileArray(val.rows);
        that.success(val);
      };
      error = function (err) {
        that.error(err);
      };
      that.addJob('allDocs', priv.sub_storage_spec, null,
        command.cloneOption(), success, error);
    }
  }; // end allDocs
  */
  return that;
});
