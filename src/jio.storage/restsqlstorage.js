//     All Rights Reserved © Copyright 2013 - Morpho - Paris France
//
//     This module is free software: you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.

//     You should have received a copy of the GNU General Public License
//     along with this program.  If not, see <http://www.gnu.org/licenses/>.

/*jslint indent: 2, maxlen: 80, nomen: true */
/*global jIO: true, $: true */

// JIO SQL Storage Description :
// {
//   type: "restsql"
//   url: {String}
//   database: {String}
// }
jIO.addStorageType("restsql", function (spec, my) {
  "use strict";
  var priv = {}, that = my.basicStorage(spec, my), sql = {};

  // ATTRIBUTES //
  priv.url = null;
  priv.database = null;
  priv.metadata_table = "metadata";
  priv.attachment_table = "attachment";

  // CONSTRUCTOR //
  /**
   * Init the restsql storage connector thanks to the description
   * @method __init__
   * @param  {object} description The description object
   */
  priv.__init__ = function (description) {
    priv.url = description.url;
    priv.database = description.database;
  };

  // OVERRIDES //
  that.specToStore = function () {
    return {
      "url": priv.url,
      "database": priv.database
    };
  };

  that.validateState = function () {
    if (typeof priv.url !== "string" || priv.url === "") {
      return "The sql server URL is not provided";
    }
    return "";
  };

  // TOOLS //
  /**
   * Generate a new uuid
   * @method generateUuid
   * @return {string} The new uuid
   */
  priv.generateUuid = function () {
    var S4 = function () {
      /* 65536 */
      var i, string = Math.floor(
        Math.random() * 0x10000
      ).toString(16);
      for (i = string.length; i < 4; i += 1) {
        string = "0" + string;
      }
      return string;
    };
    return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() +
      S4() + S4();
  };

   /**
   * Sort tab thanks to sort_on
   * @method Sort_on
   * @param  {tab} tab The tab
   * @param  {tab} sort_on The list of attribute use to sort
   * @param  {tab} limit Number of element
   * @return {tab} The new tab
   */
  priv.Sort_on = function (tab, sort_on, limit) {
	var tmp_sort_att, tmp_sort_type, tmp_tab_att, tmp_metadata, i, j, k, l,
	  min, max, tmp_result, tmp_att, tmp_result_list, tmp_json;
	tmp_sort_att = sort_on[0][0];
	tmp_sort_type = sort_on[0][1];
	tmp_tab_att = [];
	for (i = 0; i < tab.metadatas.length; i++) {
	  tmp_metadata = JSON.parse(tab.metadatas[i].metadata_data);
	  tmp_tab_att[i] = tmp_metadata[tmp_sort_att];
	}
	tmp_tab_att.sort();
	if (tmp_sort_type === "descending") {
	  tmp_tab_att.reverse();
	}
	min = limit[0];
	max = limit[1];
	i = min;
	tmp_result = {"metadatas": []};
	while ((i < tmp_tab_att.length) && (i < max)) {
	  tmp_att = tmp_tab_att[i];
	  tmp_result_list = {"metadatas": []};
	  k = 0;
	  for (j = 0; j < tab.metadatas.length; j++) {
		tmp_json = JSON.parse(tab.metadatas[j].metadata_data);
		if (tmp_json[tmp_sort_att] === tmp_att) {
		  tmp_result_list.metadatas[k] = tab.metadatas[j];
		  k++;
		}
	  }
	  if (k > 1) {
		tmp_result_list.metadatas = priv.Sort_on(
		  tmp_result_list,
		  [sort_on[1]],
		  [0, k]
		).metadatas;
	  }
	  for (l = 0; (l < k); l++) {
		if (i < max) {
		  tmp_result.metadatas[i] = tmp_result_list.metadatas[l];
		  i++;
		}
	  }
	}
	return tmp_result;
  };

  /**
   * Limit the element number of a tab
   * @method limit
   * @return {tab} The new tab
   */
  // priv.Limit(limit){

  // }

  // SQL METHODS //
  /**
   * Get document
   * @method getDocumentMetadata
   * @param  {string} document_id The document id
   * @return {json} The response of restsql
   */
  sql.getDocumentMetadata = function (document_id) {
    var tmp_url = priv.url;
	tmp_url += "/res/MetadataAttachment?_output=application/json";
	if (document_id !== "") {
	  tmp_url += "&document_id=" + document_id;
	}
    return $.ajax({
      url: tmp_url,
      type: "GET",
      dataType: "json"
    });
  };

  /**
   * Get document with complex query
   * @method getDocumentMetadataComplexe
   * @param  {string} document_id The document id
   * @return {json} The response of restsql
   */
  sql.getDocumentMetadataComplexe = function (query,
    wildcard_character) {
    var tmp_url = priv.url, tmp_att, tmp_value, maRegex;
	//if wildcard_character != % => change it
	if (wildcard_character !== "%") {
	  //if wildcard_character is a particular character 
	  //=> add a double backslash
	  if (/[\[\]\(\)\{\}\-\.\*\+\?\|\^\$]/.test(wildcard_character)) {
	    maRegex = new RegExp("\\" + wildcard_character, 'gi');
		query = query.replace(maRegex, "%");
	  } else {
	    maRegex = new RegExp(wildcard_character, 'gi');
		query = query.replace(maRegex, "%");
	  }
	}
	tmp_url += "/res/MetadataAttachment?_output=application/json";
	if (query !== "") {
	  //where construction in query: 
	  //title: "xxxxx" in where: 
	  //metadata_data LIKE '%"title": "xxxxx"%'
	  tmp_url += "&metadata_data=%";
	  /^([^:]*):(.*)$/.exec(query);
	  tmp_att = RegExp.$1;
	  tmp_value = RegExp.$2;
	  tmp_url += "\"" + tmp_att + "\":" + tmp_value;
	  tmp_url += "%";
	}
    return $.ajax({
      url: tmp_url,
      type: "GET",
      dataType: "json"
    });
  };

  /**
   * Set document
   * @method setDocumentMetadata
   * @param  {string} document_id The document id
   * @return {json} The response of restsql
   */
  sql.setDocumentMetadata = function (document_id) {
    var id = document_id._id, items = document_id;
    delete document_id._id;
    return $.ajax({
      type: 'POST',
      url: priv.url + "/res/" + "metadata?_output=application/json",
      timeout: 3000,
      dataType  : "json",
      data: { "document_id": id,
        "data": JSON.stringify(items)
        }
    });
  };

  /**
   * Update document
   * @method updateDocumentMetadata
   * @param  {string} document_id The document id
   * @return {json} The response of restsql
   */
  sql.updateDocumentMetadata = function (document_id) {
    var id = document_id._id, items = document_id;
    delete document_id._id;
    return $.ajax({
      type: 'PUT',
      url: priv.url + "/res/" + "metadata?_output=application/json",
      timeout: 3000,
      dataType  : "json",
      data: { "document_id": id,
        "data": JSON.stringify(items)
	    }
    });
  };

  /**
   * Remove document
   * @method removeDocumentMetadata
   * @param  {string} document_id The document id
   * @return {json} The response of restsql
   */
  sql.removeDocumentMetadata = function (document_id) {
    var tmp_url = priv.url + "/res/";
    tmp_url += "MetadataAttachment?_output=application/json&document_id=";
    tmp_url += document_id;
    return $.ajax({
      url: tmp_url,
      type: "DELETE",
      dataType: "json"
    });
  };

  /**
   * Get document attachment
   * @method getDocumentAttachment
   * @param  {json} attachment The attachment
   * @return {json} The response of restsql
   */
  sql.getDocumentAttachment = function (attachment) {
	var tmp_url = priv.url + "/res/";
    tmp_url += "attachment?_output=application/json&document_id=";
    tmp_url += attachment._id + "&attachment_id=" + attachment._attachment;
	return $.ajax({
      url: tmp_url,
      type: "GET",
      dataType: "json"
    });
  };

  /**
   * Get all attachments of a document
   * @method getAllDocumentAttachment
   * @param  {string} document_id The document id
   * @return {json} The response of restsql
   */
  sql.getAllDocumentAttachment = function (document_id) {
    var tmp_url = priv.url + "/res/";
    tmp_url += "attachment?_output=application/json&document_id=";
	tmp_url += document_id;
	return $.ajax({
      url: tmp_url,
      type: "GET",
      dataType: "json"
    });
  };

  /**
   * Set document attachment
   * @method setDocumentAttachment
   * @param  {json} attachment The attachment
   * @return {json} The response of restsql
   */
  sql.setDocumentAttachment = function (attachment) {
    return $.ajax({
      type: 'POST',
      url: priv.url + "/res/" + "attachment?_output=application/json",
      timeout: 3000,
      dataType: "json",
      data: { "document_id": attachment._id,
              "attachment_id": attachment._attachment,
              "minetype": attachment._minetype,
              "data": attachment._data
        }
    });
  };

  /**
   * Update document attachment
   * @method updateDocumentAttachment
   * @param  {json} attachment The attachment
   * @return {json} The response of restsql
   */
  sql.updateDocumentAttachment = function (attachment) {
    return $.ajax({
      type: 'PUT',
      url: priv.url + "/res/" + "attachment?_output=application/json",
      timeout: 3000,
      dataType  : "json",
      data: { "document_id": attachment._id,
              "attachment_id": attachment._attachment,
              "minetype": attachment._minetype,
              "data": attachment._data
        }
    });
  };

  /**
   * Remove document attachment
   * @method removeDocumentAttachment
   * @param  {json} attachment The attachment
   * @return {json} The response of restsql
   */
  sql.removeDocumentAttachment = function (attachment) {
	var tmp_url = priv.url + "/res/";
    tmp_url += "attachment?_output=application/json&document_id=";
	tmp_url += attachment.document_id;
    tmp_url += "&attachment_id=" + attachment.attachment_id;
	return $.ajax({
      url: tmp_url,
      type: "DELETE",
      dataType: "json"
    });
  };


  // JIO COMMANDS //
  /**
   * Check document
   * @method check
   * @param  {object} command The JIO command
   */
  that.check = function (command) {
	var metadata, document_id, err;
	metadata = command.cloneDoc();
	document_id = metadata._id;
    sql.getDocumentMetadata(metadata._id).done(function (data) {
	  if (typeof data.data === "string") {
		that.success({
		  "ok": true,
		  "id": document_id
		});
	  } else {
		err = {
          "ok": false,
		  "id": document_id
		};
		that.error(err);
	  }
	}).fail(function (error) {
      err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Repair document
   * @method repair
   * @param  {object} command The JIO command
   */
  that.repair = function (command) {
	var metadata, document_id, tmp_data, err;
	metadata = command.cloneDoc();
	document_id = metadata._id;
    sql.getDocumentMetadata(metadata._id).done(function (data) {
	  if (typeof data.data === "string") {
		that.success({
		  "ok": true,
		  "id": document_id
		});
	  } else {
		tmp_data = data.data.toString();
		if (typeof tmp_data === "string") {
		  //update after repair
		  $.ajax({
			type: 'PUT',
			url: priv.url + "/res/" + "metadata?_output=application/json",
			timeout: 3000,
			dataType  : "json",
			data: { "document_id": document_id,
			  "data": tmp_data
			  }
		  });
		  that.success({
			"ok": true,
			"id": document_id
		  });
		} else {
		  err = {
			"ok": false,
			"id": document_id
		  };
		  that.error(err);
		}
	  }
	}).fail(function (error) {
      err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Create a document in local storage.
   * @method post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    var metadata, document_id;
    metadata = command.cloneDoc();
    document_id = metadata._id;
    if (!document_id) {
      metadata._id = priv.generateUuid();
      document_id = metadata._id;
    }
    sql.getDocumentMetadata(metadata._id).done(function (data) {
      if (data.metadatas.length > 0) {
        // the document already exists
        that.error({
          "status": 409,
          "statusText": "Conflicts",
          "error": "conflicts",
          "message": "Cannot create a new document",
          "reason": "Document already exists"
        });
      } else {
        //the document creation
        sql.setDocumentMetadata(metadata).done(function () {
          that.success({
            "ok": true,
            "id": document_id
          });
        }).fail(function (error) {
          var err = {
            "status": error.status,
            "statusText": error.statusText,
            "error": error.statusText.toLowerCase().replace(/ /g, "_"),
            "message": "Ah something is wrong!",
            "reason": error.status === 404 ? "missing" : "unknown"
          };
          if (error.status >= 500) {
            that.retry(err);
          } else {
            that.error(err);
          }
        });
      }
    }).fail(function (error) {
      var err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Creates or updates a document
   * @method  put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    var metadata, document_id;
    metadata = command.cloneDoc();
    document_id = metadata._id;
    sql.getDocumentMetadata(metadata._id).done(function (data) {
      if (data.metadatas.length > 0) {
        // the document already exists => update
        sql.updateDocumentMetadata(metadata).done(function () {
          that.success({
            "ok": true,
            "id": document_id
          });
        }).fail(function (error) {
          // {"status": 404, "statusText": "Not Found", "error": "not_found",
          //  "message": "Ah something is wrong!", 
		  //  "reason": "document is missing"}
          var err = {
            "status": error.status,
            "statusText": error.statusText,
            "error": error.statusText.toLowerCase().replace(/ /g, "_"),
            "message": "Ah something is wrong!",
            "reason": error.status === 404 ? "missing" : "unknown"
          };
          if (error.status >= 500) {
            that.retry(err);
          } else {
            that.error(err);
          }
        });
      } else {
        // the document doesn't exist => creation
        sql.setDocumentMetadata(metadata).done(function () {
          that.success({
            "ok": true,
            "id": document_id
          });
        }).fail(function (error) {
          // {"status": 404, "statusText": "Not Found", "error": "not_found",
          //  "message": "Ah something is wrong!", 
		  //  "reason": "document is missing"}
          var err = {
            "status": error.status,
            "statusText": error.statusText,
            "error": error.statusText.toLowerCase().replace(/ /g, "_"),
            "message": "Ah something is wrong!",
            "reason": error.status === 404 ? "missing" : "unknown"
          };
          if (error.status >= 500) {
            that.retry(err);
          } else {
            that.error(err);
          }
        });
      }
    }).fail(function (error) {
      var err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

   /**
   * Get a document
   * @method get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    // see command methods in src/jio/commands/command.js
    var document_id = command.getDocId(), sql_response =  {},
	  jio_response =  {}, sql_items = {}, i,
	  attachment_json = {}, tmp_jio_response;
    sql.getDocumentMetadata(document_id).done(function (data) {
      sql_response = data;
      if (sql_response.metadatas.length > 0) {
        sql_items = JSON.parse(sql_response.metadatas[0].metadata_data);
		tmp_jio_response = sql_items;
		tmp_jio_response._id = sql_response.metadatas[0].document_id;
		jio_response = tmp_jio_response;
		//attachments: content type, digest et length
        for (i = 0; i < sql_response.metadatas.length; i += 1) {
		  if (sql_response.metadatas[i].attachment_id) {
            attachment_json[sql_response.metadatas[i].attachment_id] = {
              "content_type": sql_response.metadatas[i].minetype,
              "digest": "md5-" + command.md5SumAttachmentData(),
              "length": sql_response.metadatas[i].attachment_data.length
            };
          }
        }
        jio_response._attachments = attachment_json;
        that.success(jio_response);
      } else {
        that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Cannot find the document",
          "reason": "Document does not exist"
        });
      }
    }).fail(function (error) {
      // {"status": 404, "statusText": "Not Found", "error": "not_found",
      //  "message": "Ah something is wrong!", "reason": "document is missing"}
      var err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong! 1234",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Remove a document
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    var document_id = command.getDocId(), i, tmp_att;
    sql.getDocumentMetadata(document_id).done(function (data) {
	  //if no metadata => erreur 404
	  if (data.metadatas.length === 0) {
		that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Cannot find the document",
          "reason": "Document does not exist"
		});
	  } else {
        //first remove all attachment
        sql.getAllDocumentAttachment(document_id).done(function (data2) {
		  for (i = 0; i < data2.attachments.length; i += 1) {
			tmp_att = data2.attachments[i];
			sql.removeDocumentAttachment(tmp_att);
          }
        }).fail(function (error) {
          var err = {
            "status": error.status,
            "statusText": error.statusText,
            "error": error.statusText.toLowerCase().replace(/ /g, "_"),
            "message": "Ah something is wrong!",
            "reason": error.status === 404 ? "missing" : "unknown"
          };
          if (error.status >= 500) {
            that.retry(err);
          } else {
            that.error(err);
          }
        });
        //then remove metadata
        sql.removeDocumentMetadata(document_id).done(function () {
          that.success({
            "ok": true,
            "id": document_id
          });
        }).fail(function (error) {
          var err = {
            "status": error.status,
            "statusText": error.statusText,
            "error": error.statusText.toLowerCase().replace(/ /g, "_"),
            "message": "Ah something is wrong!",
            "reason": error.status === 404 ? "missing" : "unknown"
          };
          if (error.status >= 500) {
            that.retry(err);
          } else {
            that.error(err);
          }
        });
	  }
    }).fail(function (error) {
      // {"status": 404, "statusText": "Not Found", "error": "not_found",
      //  "message": "Ah something is wrong!", "reason": "document is missing"}
      var err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Add an attachment to a document
   * @method  putAttachment
   * @param  {object} command The JIO command
   */
  that.putAttachment = function (command) {
    var attachment, document_id;
    attachment = command.cloneDoc();
    document_id = attachment._id;
    sql.getDocumentMetadata(attachment._id).done(function (data) {
	  // if ((data.metadatas.length !== 0) && (data.metadatas.length !== 0)) {
	  if ((data.metadatas.length !== 0)) {
		// the document already exists => put attachment
        sql.getDocumentAttachment(attachment).done(function (data) {
          if (data.attachments.length === 0) {
            //the attachment does not exists => create
            sql.setDocumentAttachment(attachment).done(function () {
              that.success({
                "ok": true,
                "id": document_id,
                "attachment": attachment._attachment
              });
            }).fail(function (error) {
              // {"status": 404, "statusText": "Not Found", 
			  //  "error": "not_found",
              //  "message": "Ah something is wrong!", 
			  //  "reason": "document is missing"}
              var err = {
                "status": error.status,
                "statusText": error.statusText,
                "error": error.statusText.toLowerCase().replace(/ /g, "_"),
                "message": "Ah something is wrong!",
                "reason": error.status === 404 ? "missing" : "unknown"
              };
              if (error.status >= 500) {
                that.retry(err);
              } else {
                that.error(err);
              }
            });
          } else {
            //the attachment already exists => update
            sql.updateDocumentAttachment(attachment).done(function () {
              that.success({
                "ok": true,
                "id": document_id,
                "attachment": attachment._attachment
              });
            }).fail(function (error) {
              var err = {
                "status": error.status,
                "statusText": error.statusText,
                "error": error.statusText.toLowerCase().replace(/ /g, "_"),
                "message": "Ah something is wrong!",
                "reason": error.status === 404 ? "missing" : "unknown"
              };
              if (error.status >= 500) {
                that.retry(err);
              } else {
                that.error(err);
              }
            });
          }
        }).fail(function (error) {
          var err = {
            "status": error.status,
            "statusText": error.statusText,
            "error": error.statusText.toLowerCase().replace(/ /g, "_"),
            "message": "Ah something is wrong!",
            "reason": error.status === 404 ? "missing" : "unknown"
          };
          if (error.status >= 500) {
            that.retry(err);
          } else {
            that.error(err);
          }
        });
	  } else {
		that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Cannot find the document",
          "reason": "Document does not exist"
		});
	  }
    }).fail(function (error) {
      var err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Get an attachment
   * @method  getAttachment
   * @param  {object} command The JIO command
   */
  that.getAttachment = function (command) {
    var attachment = command.cloneDoc();
    sql.getDocumentAttachment(attachment).done(function (data) {
      if (data.attachments.length > 0) {
        that.success(data.attachments[0].data);
      } else {
        that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Cannot find the attachment",
          "reason": "Attachment does not exist"
        });
      }
    }).fail(function (error) {
      // {"status": 404, "statusText": "Not Found", "error": "not_found",
      //  "message": "Ah something is wrong!", "reason": "document is missing"}
      var err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Remove an attachment
   * @method removeAttachment
   * @param  {object} command The JIO command
   */
  that.removeAttachment = function (command) {
    var document_id = command.getDocId(), attachment = command.cloneDoc(),
	  tmp_att, tmp_att_id = attachment._attachment, i;
	sql.getDocumentAttachment(attachment).done(function (data) {
	  if (data.attachments.length === 0) {
        // the attachment doesn't exists
        that.error({
          "status": 409,
          "statusText": "Conflicts",
          "error": "conflicts",
          "message": "Cannot remove the attachment",
          "reason": "Attachment does not exist"
        });
      } else {
		for (i = 0; i < data.attachments.length; i += 1) {
		  tmp_att = data.attachments[i];
		  if (tmp_att_id === tmp_att.attachment_id) {
			sql.removeDocumentAttachment(tmp_att);
			that.success({
			  "ok": true,
              "id": document_id,
              "attachment": attachment._attachment
			});
		  }
        }
      }
    }).fail(function (error) {
      // {"status": 404, "statusText": "Not Found", "error": "not_found",
      //  "message": "Ah something is wrong!", "reason": "document is missing"}
      var err = {
        "status": error.status,
        "statusText": error.statusText,
        "error": error.statusText.toLowerCase().replace(/ /g, "_"),
        "message": "Ah something is wrong!",
        "reason": error.status === 404 ? "missing" : "unknown"
      };
      if (error.status >= 500) {
        that.retry(err);
      } else {
        that.error(err);
      }
    });
  };

  /**
   * Get all filenames belonging to a user from the document index
   * @method allDocs
   * @param  {object} command The JIO command
   */
  that.allDocs = function (command) {
	var option, allDocResponse, resultTable,
	  query_tmp, tmp_rows, i, j, tmp_json, tmp_doc,
	  tmp_query1, tmp_query2, tmp_operator, tmp_indice,
	  tmp_find, tmp_data_lenght, err;
	option = command.cloneOption();
	query_tmp = option.query;
	if (/(.*) (AND|OR) (.*)/.test(query_tmp)) {
	  /^(.*) (AND\OR) (.*)$/.exec(query_tmp);
	  tmp_query1 = RegExp.$1;
	  tmp_query2 = RegExp.$3;
	  tmp_operator = RegExp.$2;
	  sql.getDocumentMetadataComplexe(tmp_query1,
		option.wildcard_character
		).done(function (data) {
		sql.getDocumentMetadataComplexe(tmp_query2,
		  option.wildcard_character
		  ).done(function (data2) {
		  resultTable = {};
		  resultTable.metadatas = [];
		  tmp_indice = 0;
		  if (tmp_operator === "AND") {
			for (i = 0; i < data.metadatas.length; i++) {
			  tmp_find = false;
			  j = 0;
			  while ((j < data2.metadatas.length) && (!tmp_find)) {
				if (data.metadatas[i].document_id ===
				    data2.metadatas[j].document_id) {
				  tmp_find = true;
				}
				j++;
			  }
			  if (tmp_find) {
				resultTable.metadatas[tmp_indice] = data.metadatas[i];
				tmp_indice++;
			  }
			}
		  } else {
			//OR operator
			tmp_data_lenght = data.metadatas.length;
			resultTable = data;
			tmp_indice = resultTable.metadatas.length;
			for (i = 0; i < data2.metadatas.length; i++) {
			  tmp_find = false;
			  j = 0;
			  while ((j < tmp_data_lenght) && (!tmp_find)) {
				if (data2.metadatas[i].document_id ===
					data.metadatas[j].document_id) {
				  tmp_find = true;
				}
				j++;
			  }
			  if (!tmp_find) {
				resultTable.metadatas[tmp_indice] = data2.metadatas[i];
				tmp_indice++;
			  }
			}
		  }
		  //sort rows thanks to option.sort_on and limit result number 
		  // and keep only option.select_list attributes
		  resultTable = priv.Sort_on(resultTable, option.sort_on, option.limit);
		  tmp_rows = [];
		  for (i = 0; i < resultTable.metadatas.length; i++) {
			if (option.include_docs) {
			  tmp_json = JSON.parse(resultTable.metadatas[i].metadata_data);
			  tmp_doc = {};
			  for (j = 0; j < option.select_list.length; j++) {
				tmp_doc[option.select_list[j]] =
				  tmp_json[option.select_list[j]];
			  }
			  tmp_rows[i] = {"id": resultTable.metadatas[i].document_id,
				"key": resultTable.metadatas[i].document_id,
				"value": {},
				"doc": tmp_doc};
			} else {
			  tmp_rows[i] = {"id": resultTable.metadatas[i].document_id,
				"key": resultTable.metadatas[i].document_id,
				"value": {}};
			}
		  }
		  allDocResponse = {
			// document content will be added to response
			"total_rows": resultTable.metadatas.length,
			"rows": tmp_rows
		  };
		  that.success(allDocResponse);
		}).fail(function (error) {
		  err = {
			"status": error.status,
			"statusText": error.statusText,
			"error": error.statusText.toLowerCase().replace(/ /g, "_"),
			"message": "Ah something is wrong!",
			"reason": error.status === 404 ? "missing" : "unknown"
		  };
		  if (error.status >= 500) {
			that.retry(err);
		  } else {
			that.error(err);
		  }
        });
	  }).fail(function (error) {
		var err = {
		  "status": error.status,
		  "statusText": error.statusText,
		  "error": error.statusText.toLowerCase().replace(/ /g, "_"),
		  "message": "Ah something is wrong!",
		  "reason": error.status === 404 ? "missing" : "unknown"
		};
		if (error.status >= 500) {
		  that.retry(err);
		} else {
		  that.error(err);
		}
      });
	} else {
	  sql.getDocumentMetadataComplexe(query_tmp,
		option.wildcard_character
		).done(function (data) {
		resultTable = data;
		//sort rows thanks to option.sort_on and limit result number 
		// and keep only option.select_list attributes
		resultTable = priv.Sort_on(resultTable, option.sort_on, option.limit);
		tmp_rows = [];
		for (i = 0; i < resultTable.metadatas.length; i++) {
		  if (option.include_docs) {
			tmp_json = JSON.parse(resultTable.metadatas[i].metadata_data);
			tmp_doc = {};
			for (j = 0; j < option.select_list.length; j++) {
			  tmp_doc[option.select_list[j]] = tmp_json[option.select_list[j]];
			}
			tmp_rows[i] = {"id": resultTable.metadatas[i].document_id,
			  "key": resultTable.metadatas[i].document_id,
			  "value": {},
			  "doc": tmp_doc};
		  } else {
			tmp_rows[i] = {"id": resultTable.metadatas[i].document_id,
			  "key": resultTable.metadatas[i].document_id,
			  "value": {}};
		  }
		}
		allDocResponse = {
		  // document content will be added to response
		  "total_rows": resultTable.metadatas.length,
		  "rows": tmp_rows
        };
		that.success(allDocResponse);
	  }).fail(function (error) {
		var err = {
		  "status": error.status,
		  "statusText": error.statusText,
		  "error": error.statusText.toLowerCase().replace(/ /g, "_"),
		  "message": "Ah something is wrong!",
		  "reason": error.status === 404 ? "missing" : "unknown"
		};
		if (error.status >= 500) {
		  that.retry(err);
		} else {
		  that.error(err);
		}
      });
	}
  };

  priv.__init__(spec);
  return that;
});
