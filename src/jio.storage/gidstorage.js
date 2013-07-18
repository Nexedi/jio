/*
 * JIO extension for resource global identifier management.
 * Copyright (C) 2013  Nexedi SA
 *
 *   This library is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This library is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, setTimeout: true, complex_queries: true */

/**
 * JIO GID Storage. Type = 'gid'.
 * Identifies document with their global identifier representation
 *
 * Sub storages must support complex queries and include_docs options.
 *
 * Storage Description:
 *
 *     {
 *       "type": "gid",
 *       "sub_storage": {<storage description>},
 *       "constraints": {
 *         "default": {
 *           "identifier": "list",    // ['a', 1]
 *           "type": "DCMIType",      // 'Text'
 *           "title": "string"        // 'something blue'
 *         },
 *         "Text": {
 *           "format": "contentType"  // contains 'text/plain;charset=utf-8'
 *         },
 *         "Image": {
 *           "version": "json"        // value as is
 *         }
 *       }
 *     }
 */
(function () {

  var dcmi_types, metadata_actions, content_type_re;
  dcmi_types = {
    'Collection': 'Collection',
    'Dataset': 'Dataset',
    'Event': 'Event',
    'Image': 'Image',
    'InteractiveResource': 'InteractiveResource',
    'MovingImage': 'MovingImage',
    'PhysicalObject': 'PhysicalObject',
    'Service': 'Service',
    'Software': 'Software',
    'Sound': 'Sound',
    'StillImage': 'StillImage',
    'Text': 'Text'
  };
  metadata_actions = {
    /**
     * Returns the metadata value
     */
    json: function (value) {
      return value;
    },
    /**
     * Returns the metadata if there is a string
     */
    string: function (value) {
      if (!Array.isArray(value)) {
        if (typeof value === 'object') {
          return value.content;
        }
        return value;
      }
    },
    /**
     * Returns the metadata in a array format
     */
    list: function (value) {
      var i, new_value = [];
      if (Array.isArray(value)) {
        for (i = 0; i < value.length; i += 1) {
          if (typeof value[i] === 'object') {
            new_value[new_value.length] = value[i].content;
          } else {
            new_value[new_value.length] = value[i];
          }
        }
      } else if (value !== undefined) {
        value = [value];
      }
      return value;
    },
    /**
     * Returns the metadata if there is a string equal to a DCMIType
     */
    DCMIType: function (value) {
      var i;
      if (!Array.isArray(value)) {
        value = [value];
      }
      for (i = 0; i < value.length; i += 1) {
        if (typeof value[i] === 'object' && dcmi_types[value[i].content]) {
          return value[i].content;
        } else if (dcmi_types[value[i]]) {
          return value[i];
        }
      }
    },
    /**
     * Returns the metadata content type if exist
     */
    contentType: function (value) {
      var i;
      if (!Array.isArray(value)) {
        value = [value];
      }
      for (i = 0; i < value.length; i += 1) {
        if (value[i] === 'object') {
          if (content_type_re.test(value[i].content)) {
            return value[i].content;
          }
        } else {
          if (content_type_re.test(value[i])) {
            return value[i];
          }
        }
      }
    },
    /**
     * Returns the metadata if it is a date
     */
    date: function (value) {
      var d;
      if (!Array.isArray(value)) {
        if (typeof value === 'object') {
          d = new Date(value.content);
          value = value.content;
        } else {
          d = new Date(value);
        }
      }
      if (Object.prototype.toString.call(d) === "[object Date]") {
        if (!isNaN(d.getTime())) {
          return value;
        }
      }
    }
  };
  content_type_re =
    /^([a-z]+\/[a-zA-Z0-9\+\-\.]+)(?:\s*;\s*charset\s*=\s*([a-zA-Z0-9\-]+))?$/;

  /**
   * Creates a gid from metadata and constraints.
   *
   * @param  {Object} metadata The metadata to use
   * @param  {Object} constraints The constraints
   * @return {String} The gid or undefined if metadata doesn't respect the
   *   constraints
   */
  function gidFormat(metadata, constraints) {
    var types, i, j, meta_key, result = [], tmp, constraint, actions;
    types = (metadata_actions.list(metadata.type) || []).slice();
    types.unshift('default');
    for (i = 0; i < types.length; i += 1) {
      constraint = constraints[types[i]];
      for (meta_key in constraint) {
        if (constraint.hasOwnProperty(meta_key)) {
          actions = constraint[meta_key];
          if (!Array.isArray(actions)) {
            actions = [actions];
          }
          for (j = 0; j < actions.length; j += 1) {
            tmp = metadata_actions[
              actions[j]
            ](metadata[meta_key]);
            if (tmp === undefined) {
              return;
            }
          }
          result[result.length] = [meta_key, tmp];
        }
      }
    }
    // sort dict keys to make gid universal
    result.sort(function (a, b) {
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    });
    tmp = {};
    for (i = 0; i < result.length; i += 1) {
      tmp[result[i][0]] = result[i][1];
    }
    return JSON.stringify(tmp);
  }

  /**
   * Convert a gid to a complex query.
   *
   * @param  {Object,String} gid The gid
   * @param  {Object} constraints The constraints
   * @return {Object} A complex serialized object
   */
  function gidToComplexQuery(gid, contraints) {
    var k, i, result = [], meta, content;
    if (typeof gid === 'string') {
      gid = JSON.parse(gid);
    }
    for (k in gid) {
      if (gid.hasOwnProperty(k)) {
        meta = gid[k];
        if (!Array.isArray(meta)) {
          meta = [meta];
        }
        for (i = 0; i < meta.length; i += 1) {
          content = meta[i];
          if (typeof content === 'object') {
            content = content.content;
          }
          result[result.length] = {
            "type": "simple",
            "operator": "=",
            "key": k,
            "value": content
          };
        }
      }
    }
    return {
      "type": "complex",
      "operator": "AND",
      "query_list": result
    };
  }

  /**
   * Parse the gid and returns a metadata object containing gid keys and values.
   *
   * @param  {String} gid The gid to convert
   * @param  {Object} constraints The constraints
   * @return {Object} The gid metadata
   */
  function gidParse(gid, constraints) {
    var object;
    try {
      object = JSON.parse(gid);
    } catch (e) {
      return;
    }
    if (gid !== gidFormat(object, constraints)) {
      return;
    }
    return object;
  }

  /**
   * The gid storage used by JIO.
   *
   * This storage change the id of a document with its global id. A global id
   * is representation of a document metadata used to define it as uniq. The way
   * to generate global ids can be define in the storage description. It allows
   * us use duplicating storage with different sub storage kind.
   *
   * @class gidStorage
   */
  function gidStorage(spec, my) {
    var that = my.basicStorage(spec, my), priv = {};

    priv.sub_storage = spec.sub_storage;
    priv.constraints = spec.constraints || {
      "default": {
        "identifier": "list",
        "type": "DCMIType"
      }
    };

    // Overrides

    that.specToStore = function () {
      return {
        "sub_storage": priv.sub_storage,
        "constraints": priv.constraints
      };
    };

    // JIO Commands

    /**
     * Generic command for post or put one.
     *
     * This command will check if the document already exist with an allDocs
     * and a complex query. If exist, then post will fail. Put will update the
     * retrieved document thanks to its real id. If no documents are found, post
     * and put will create a new document with the sub storage id generator.
     *
     * @method putOrPost
     * @private
     * @param  {Command} command The JIO command
     * @param  {String} method The command method
     */
    priv.putOrPost = function (command, method) {
      setTimeout(function () {
        var gid, complex_query, doc = command.cloneDoc();
        gid = gidFormat(doc, priv.constraints);
        if (gid === undefined || (doc._id && gid !== doc._id)) {
          return that.error({
            "status": 400,
            "statusText": "Bad Request",
            "error": "bad_request",
            "message": "Cannot " + method + " document",
            "reason": "metadata should respect constraints"
          });
        }
        complex_query = gidToComplexQuery(gid);
        that.addJob('allDocs', priv.sub_storage, {}, {
          "query": complex_query,
          "wildcard_character": null
        }, function (response) {
          var update_method = method;
          if (response.total_rows !== 0) {
            if (method === 'post') {
              return that.error({
                "status": 409,
                "statusText": "Conflict",
                "error": "conflict",
                "message": "Cannot " + method + " document",
                "reason": "Document already exist"
              });
            }
            doc = command.cloneDoc();
            doc._id = response.rows[0].id;
          } else {
            doc = command.cloneDoc();
            delete doc._id;
            update_method = 'post';
          }
          that.addJob(update_method, priv.sub_storage, doc, {
          }, function (response) {
            response.id = gid;
            that.success(response);
          }, function (err) {
            err.message = "Cannot " + method + " document";
            that.error(err);
          });
        }, function (err) {
          err.message = "Cannot " + method + " document";
          that.error(err);
        });
      });
    };

    /**
     * Generic command for putAttachment, getAttachment or removeAttachment.
     *
     * This command will check if the document exist with an allDocs and a
     * complex query. If not exist, then it returns 404. Otherwise the
     * action will be done on the attachment of the found document.
     *
     * @method putGetOrRemoveAttachment
     * @private
     * @param  {Command} command The JIO command
     * @param  {String} method The command method
     */
    priv.putGetOrRemoveAttachment = function (command, method) {
      setTimeout(function () {
        var gid_object, complex_query, doc = command.cloneDoc();
        gid_object = gidParse(doc._id, priv.constraints);
        if (gid_object === undefined) {
          return that.error({
            "status": 400,
            "statusText": "Bad Request",
            "error": "bad_request",
            "message": "Cannot " + method + " attachment",
            "reason": "metadata should respect constraints"
          });
        }
        complex_query = gidToComplexQuery(gid_object);
        that.addJob('allDocs', priv.sub_storage, {}, {
          "query": complex_query,
          "wildcard_character": null
        }, function (response) {
          if (response.total_rows === 0) {
            return that.error({
              "status": 404,
              "statusText": "Not Found",
              "error": "not_found",
              "message": "Cannot " + method + " attachment",
              "reason": "Document already exist"
            });
          }
          gid_object = doc._id;
          doc._id = response.rows[0].id;
          that.addJob(method + "Attachment", priv.sub_storage, doc, {
          }, function (response) {
            if (method !== 'get') {
              response.id = gid_object;
            }
            that.success(response);
          }, function (err) {
            err.message = "Cannot " + method + " attachment";
            that.error(err);
          });
        }, function (err) {
          err.message = "Cannot " + method + " attachment";
          that.error(err);
        });
      });
    };

    /**
     * See {{#crossLink "gidStorage/putOrPost:method"}}{{/#crossLink}}.
     *
     * @method post
     * @param  {Command} command The JIO command
     */
    that.post = function (command) {
      priv.putOrPost(command, 'post');
    };

    /**
     * See {{#crossLink "gidStorage/putOrPost:method"}}{{/#crossLink}}.
     *
     * @method put
     * @param  {Command} command The JIO command
     */
    that.put = function (command) {
      priv.putOrPost(command, 'put');
    };

    /**
     * Puts an attachment to a document thank to its gid, a sub allDocs and a
     * complex query.
     *
     * @method putAttachment
     * @param  {Command} command The JIO command
     */
    that.putAttachment = function (command) {
      priv.putGetOrRemoveAttachment(command, 'put');
    };

    /**
     * Gets a document thank to its gid, a sub allDocs and a complex query.
     *
     * @method get
     * @param  {Command} command The JIO command
     */
    that.get = function (command) {
      setTimeout(function () {
        var gid_object, complex_query;
        gid_object = gidParse(command.getDocId(), priv.constraints);
        if (gid_object === undefined) {
          return that.error({
            "status": 400,
            "statusText": "Bad Request",
            "error": "bad_request",
            "message": "Cannot get document",
            "reason": "metadata should respect constraints"
          });
        }
        complex_query = gidToComplexQuery(gid_object);
        that.addJob('allDocs', priv.sub_storage, {}, {
          "query": complex_query,
          "wildcard_character": null,
          "include_docs": true
        }, function (response) {
          if (response.total_rows === 0) {
            return that.error({
              "status": 404,
              "statusText": "Not Found",
              "error": "not_found",
              "message": "Cannot get document",
              "reason": "missing"
            });
          }
          response.rows[0].doc._id = command.getDocId();
          return that.success(response.rows[0].doc);
        }, function (err) {
          err.message = "Cannot get document";
          return that.error(err);
        });
      });
    };

    /**
     * Gets an attachment from a document thank to its gid, a sub allDocs and a
     * complex query.
     *
     * @method getAttachment
     * @param  {Command} command The JIO command
     */
    that.getAttachment = function (command) {
      priv.putGetOrRemoveAttachment(command, 'get');
    };

    /**
     * Remove a document thank to its gid, sub allDocs and a complex query.
     *
     * @method remove
     * @param  {Command} command The JIO command.
     */
    that.remove = function (command) {
      setTimeout(function () {
        var gid_object, complex_query, doc = command.cloneDoc();
        gid_object = gidParse(doc._id, priv.constraints);
        if (gid_object === undefined) {
          return that.error({
            "status": 400,
            "statusText": "Bad Request",
            "error": "bad_request",
            "message": "Cannot remove document",
            "reason": "metadata should respect constraints"
          });
        }
        complex_query = gidToComplexQuery(gid_object);
        that.addJob('allDocs', priv.sub_storage, {}, {
          "query": complex_query,
          "wildcard_character": null
        }, function (response) {
          if (response.total_rows === 0) {
            return that.error({
              "status": 404,
              "statusText": "Not found",
              "error": "not_found",
              "message": "Cannot remove document",
              "reason": "missing"
            });
          }
          gid_object = doc._id;
          doc = {"_id": response.rows[0].id};
          that.addJob('remove', priv.sub_storage, doc, {
          }, function (response) {
            response.id = gid_object;
            that.success(response);
          }, function (err) {
            err.message = "Cannot remove document";
            that.error(err);
          });
        }, function (err) {
          err.message = "Cannot remove document";
          that.error(err);
        });
      });
    };

    /**
     * Removes an attachment to a document thank to its gid, a sub allDocs and a
     * complex query.
     *
     * @method removeAttachment
     * @param  {Command} command The JIO command
     */
    that.removeAttachment = function (command) {
      priv.putGetOrRemoveAttachment(command, 'remove');
    };

    /**
     * Retrieve a list of document which respect gid constraints.
     *
     * @method allDocs
     * @param  {Command} command The JIO command
     */
    that.allDocs = function (command) {
      setTimeout(function () {
        var options = command.cloneOption(), include_docs;
        include_docs = options.include_docs;
        options.include_docs = true;
        that.addJob('allDocs', priv.sub_storage, {
        }, options, function (response) {
          var result = [], doc_gids = {}, i, row, gid;
          while ((row = response.rows.shift()) !== undefined) {
            if ((gid = gidFormat(row.doc, priv.constraints)) !== undefined) {
              if (!doc_gids[gid]) {
                doc_gids[gid] = true;
                row.id = gid;
                delete row.key;
                result[result.length] = row;
                if (include_docs === true) {
                  row.doc._id = gid;
                } else {
                  delete row.doc;
                }
              }
            }
          }
          doc_gids = undefined; // free memory
          row = undefined;
          that.success({"total_rows": result.length, "rows": result});
        }, function (err) {
          err.message = "Cannot get all documents";
          return that.error(err);
        });
      });
    };

    return that;
  }

  jIO.addStorageType('gid', gidStorage);

}());
