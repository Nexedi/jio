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
/*global jIO: true, localStorage: true, setTimeout: true,
         complex_queries: true */

/**
 * JIO GID Storage. Type = 'gid'.
 * Identifies document with their global identifier représentation
 *
 * Sub storages must support complex queries.
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

  var dcmi_types, metadata_actions, content_type_re
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
    json: function (value) {
      return value;
    },
    string: function (value) {
      if (typeof value === 'string') {
        return value;
      }
    },
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
    DCMIType: function (value) {
      return dcmi_types[value];
    },
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
    }
  };
  content_type_re =
    /^([a-z]+\/[a-zA-Z0-9\+\-\.]+)(?:\s*;\s*charset\s*=\s*([a-zA-Z0-9\-]+))?$/;


  function Metadata(metadata) {
    if (typeof metadata === 'object' && !Array.isArray(metadata)) {
      this.metadata = metadata;
    } else {
      this.metadata = {};
    }
    Metadata.prototype.update.call(this, metadata);
  }

  Metadata.prototype.update = function (metadata) {
    var k;
    for (k in metadata) {
      if (metadata.hasOwnProperty(k)) {
        if (metadata[k] !== undefined) {
          if (k[0] === '_') {
            this.metadata[k] = JSON.parse(JSON.stringify(metadata[k]));
          } else {
            this.metadata[k] = Metadata.normalizeValue(metadata[k]);
          }
        }
      }
    }
    return this;
  };

  Metadata.prototype.get = function (key) {
    return this.metadata[key];
  };

  Metadata.prototype.set = function (key, value) {
    if (value === undefined) {
      delete this.metadata[key];
      return this;
    }
    if (key[0] === '_') {
      this.metadata[key] = value;
    } else {
      this.metadata[key] = Metadata.normalizeValue(value);
    }
    return this;
  };

  Metadata.normalizeArray = function (value) {
    var i;
    if (value.length === 0) {
      return;
    }
    value = value.slice();
    i = 0;
    while (i < value.length) {
      if (typeof value[i] === 'object' && !Array.isArray(value[i])) {
        value[i] = Metadata.normalizeObject(value[i]);
        if (value[i] === undefined) {
          value.splice(i, 1);
        } else {
          i += 1;
        }
      } else if ((typeof value[i] === 'string') ||
                 (isNaN(value[i]) && typeof value[i] === 'number')) {
        i += 1;
      } else {
        value.splice(i, 1);
      }
    }
    if (value.length === 1) {
      return value[0];
    }
    return value;
  };

  Metadata.normalizeObject = function (value) {
    var i, count = 0, new_value = {};
    for (i in value) {
      if (value.hasOwnProperty(i)) {
        if ((typeof value[i] === 'string') ||
            (isNaN(value[i]) && typeof value[i] === 'number')) {
          new_value[i] = value[i];
          count += 1;
        }
      }
    }
    if (new_value.content === undefined) {
      return;
    }
    if (count === 1) {
      return new_value.content;
    }
    return new_value;
  };

  Metadata.normalizeValue = function (value) {
    if ((typeof value === 'string') ||
        (isNaN(value) && typeof value === 'number')) {
      return value;
    }
    if (Array.isArray(value)) {
      return Metadata.normalizeArray(value);
    }
    if (typeof value === 'object') {
      return Metadata.normalizeObject(value);
    }
  };

  function gidFormat(metadata, constraints) {
    var types, i, meta_key, result = {}, tmp;
    types = ['default', metadata.type];
    for (i = 0; i < types.length; i += 1) {
      for (meta_key in constraints[types[i]]) {
        if (constraints[types[i]].hasOwnProperty(meta_key)) {
          tmp = metadata_actions[
            constraints[types[i]][meta_key]
          ](metadata[meta_key]);
          if (tmp === undefined) {
            return;
          }
          result[meta_key] = tmp;
        }
      }
    }
    return JSON.stringify(result);
  }

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

  function gidStorage(spec, my) {
    var that = my.basicStorage(spec, my), priv = {};
    priv.sub_storage = spec.sub_storage;
    priv.constraints = spec.constraints || {
      "default": {
        "identifier": "list",
        "type": "DCMIType"
      }
    };

    that.specToStore = function () {
      return {
        "sub_storage": priv.sub_storage,
        "constraints": priv.constraints
      };
    };

    that.post = function (command) {
      setTimeout(function () {
        var gid, complex_query, doc = command.cloneDoc();
        gid = gidFormat(doc, priv.constraints);
        if (gid === undefined || (doc._id && gid !== doc._id)) {
          return that.error({
            "status": 409,
            "statusText": "Conflict",
            "error": "conflict",
            "message": "Cannot post document",
            "reason": "metadata should respect constraints"
          });
        }
        complex_query = gidToComplexQuery(gid);
        that.addJob('allDocs', priv.sub_storage, {}, {
          "query": complex_query,
          "wildcard_character": null
        }, function (response) {
          var doc;
          if (response.total_rows !== 0) {
            return that.error({
              "status": 409,
              "statusText": "Conflict",
              "error": "conflict",
              "message": "Cannot post document",
              "reason": "Document already exist"
            });
          }
          doc = command.cloneDoc();
          delete doc._id;
          that.addJob('post', priv.sub_storage, doc, {
          }, function (response) {
            response.id = gid;
            that.success(response);
          }, function (err) {
            err.message = "Cannot post document";
            that.error(err);
          });
        }, function (err) {
          err.message = "Cannot post document";
          that.error(err);
        });
      });
    };

    that.get = function (command) {
      setTimeout(function () {
        var gid_object, complex_query;
        gid_object = gidParse(command.cloneDoc()._id, priv.constraints);
        if (gid_object === undefined) {
          return that.error({
            "status": 409,
            "statusText": "Conflict",
            "error": "conflict",
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
          return that.success(response.rows[0].doc);
        }, function (err) {
          err.message = "Cannot get document";
          return that.error(err);
        });
      });
    };

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
