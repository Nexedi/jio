/*
 * Copyright 2012, Nexedi SA
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
/*jslint indent: 2, maxlen: 80, nomen: true */
/*global jIO, hex_sha256, define */

/**
 * JIO Revision Storage.
 * It manages document version and can generate conflicts.
 * Description:
 * {
 *     "type": "revision",
 *     "sub_storage": <sub storage description>
 * }
 */
// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, {hex_sha256: hex_sha256});
}(['jio', 'sha256'], function (jIO, sha256) {
  "use strict";

  var tool = {
    "readBlobAsBinaryString": jIO.util.readBlobAsBinaryString,
    "uniqueJSONStringify": jIO.util.uniqueJSONStringify
  };

  jIO.addStorage("revision", function (spec) {

    var that = this, priv = {};
    spec = spec || {};
    // ATTRIBUTES //
    priv.doc_tree_suffix = ".revision_tree.json";
    priv.sub_storage = spec.sub_storage;
    // METHODS //
    /**
     * Clones an object in deep (without functions)
     * @method clone
     * @param  {any} object The object to clone
     * @return {any} The cloned object
     */
    priv.clone = function (object) {
      var tmp = JSON.stringify(object);
      if (tmp === undefined) {
        return undefined;
      }
      return JSON.parse(tmp);
    };

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
          string = '0' + string;
        }
        return string;
      };
      return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() +
        S4() + S4();
    };

    /**
     * Generates a hash code of a string
     * @method hashCode
     * @param  {string} string The string to hash
     * @return {string} The string hash code
     */
    priv.hashCode = function (string) {
      return sha256.hex_sha256(string);
    };

    /**
     * Checks a revision format
     * @method checkDocumentRevisionFormat
     * @param  {object} doc The document object
     * @return {object} null if ok, else error object
     */
    priv.checkDocumentRevisionFormat = function (doc) {
      var send_error = function (message) {
        return {
          "status": 409,
          "message": message,
          "reason": "Wrong revision"
        };
      };
      if (typeof doc._rev === "string") {
        if (/^[0-9]+-[0-9a-zA-Z]+$/.test(doc._rev) === false) {
          return send_error("The document revision does not match " +
                            "^[0-9]+-[0-9a-zA-Z]+$");
        }
      }
      if (typeof doc._revs === "object") {
        if (typeof doc._revs.start !== "number" ||
            typeof doc._revs.ids !== "object" ||
            typeof doc._revs.ids.length !== "number") {
          return send_error(
            "The document revision history is not well formated"
          );
        }
      }
      if (typeof doc._revs_info === "object") {
        if (typeof doc._revs_info.length !== "number") {
          return send_error("The document revision information " +
                            "is not well formated");
        }
      }
    };

    /**
     * Creates a new document tree
     * @method newDocTree
     * @return {object} The new document tree
     */
    priv.newDocTree = function () {
      return {"children": []};
    };

    /**
     * Convert revs_info to a simple revisions history
     * @method revsInfoToHistory
     * @param  {array} revs_info The revs info
     * @return {object} The revisions history
     */
    priv.revsInfoToHistory = function (revs_info) {
      var i, revisions = {
        "start": 0,
        "ids": []
      };
      revs_info = revs_info || [];
      if (revs_info.length > 0) {
        revisions.start = parseInt(revs_info[0].rev.split('-')[0], 10);
      }
      for (i = 0; i < revs_info.length; i += 1) {
        revisions.ids.push(revs_info[i].rev.split('-')[1]);
      }
      return revisions;
    };

    /**
     * Convert the revision history object to an array of revisions.
     * @method revisionHistoryToList
     * @param  {object} revs The revision history
     * @return {array} The revision array
     */
    priv.revisionHistoryToList = function (revs) {
      var i, start = revs.start, new_list = [];
      for (i = 0; i < revs.ids.length; i += 1, start -= 1) {
        new_list.push(start + "-" + revs.ids[i]);
      }
      return new_list;
    };

    /**
     * Convert revision list to revs info.
     * @method revisionListToRevsInfo
     * @param  {array} revision_list The revision list
     * @param  {object} doc_tree The document tree
     * @return {array} The document revs info
     */
    priv.revisionListToRevsInfo = function (revision_list, doc_tree) {
      var revisionListToRevsInfoRec, revs_info = [], j;
      for (j = 0; j < revision_list.length; j += 1) {
        revs_info.push({"rev": revision_list[j], "status": "missing"});
      }
      revisionListToRevsInfoRec = function (index, doc_tree) {
        var child, i;
        if (index < 0) {
          return;
        }
        for (i = 0; i < doc_tree.children.length; i += 1) {
          child = doc_tree.children[i];
          if (child.rev === revision_list[index]) {
            revs_info[index].status = child.status;
            revisionListToRevsInfoRec(index - 1, child);
          }
        }
      };
      revisionListToRevsInfoRec(revision_list.length - 1, doc_tree);
      return revs_info;
    };

    /**
     * Update a document metadata revision properties
     * @method fillDocumentRevisionProperties
     * @param  {object} doc The document object
     * @param  {object} doc_tree The document tree
     */
    priv.fillDocumentRevisionProperties = function (doc, doc_tree) {
      if (doc._revs_info) {
        doc._revs = priv.revsInfoToHistory(doc._revs_info);
      } else if (doc._revs) {
        doc._revs_info = priv.revisionListToRevsInfo(
          priv.revisionHistoryToList(doc._revs),
          doc_tree
        );
      } else if (doc._rev) {
        doc._revs_info = priv.getRevisionInfo(doc._rev, doc_tree);
        doc._revs = priv.revsInfoToHistory(doc._revs_info);
      } else {
        doc._revs_info = [];
        doc._revs = {"start": 0, "ids": []};
      }
      if (doc._revs.start > 0) {
        doc._rev = doc._revs.start + "-" + doc._revs.ids[0];
      } else {
        delete doc._rev;
      }
    };

    /**
     * Generates the next revision of a document.
     * @methode generateNextRevision
     * @param  {object} doc The document metadata
     * @param  {boolean} deleted_flag The deleted flag
     * @return {array} 0:The next revision number and 1:the hash code
     */
    priv.generateNextRevision = function (doc, deleted_flag) {
      var string, revision_history, revs_info;
      doc = priv.clone(doc) || {};
      revision_history = doc._revs;
      revs_info = doc._revs_info;
      delete doc._rev;
      delete doc._revs;
      delete doc._revs_info;
      string = tool.uniqueJSONStringify(doc) +
        tool.uniqueJSONStringify(revision_history) +
        JSON.stringify(deleted_flag ? true : false);
      revision_history.start += 1;
      revision_history.ids.unshift(priv.hashCode(string));
      doc._revs = revision_history;
      doc._rev = revision_history.start + "-" + revision_history.ids[0];
      revs_info.unshift({
        "rev": doc._rev,
        "status": deleted_flag ? "deleted" : "available"
      });
      doc._revs_info = revs_info;
      return doc;
    };

    /**
     * Gets the revs info from the document tree
     * @method getRevisionInfo
     * @param  {string} revision The revision to search for
     * @param  {object} doc_tree The document tree
     * @return {array} The revs info
     */
    priv.getRevisionInfo = function (revision, doc_tree) {
      var getRevisionInfoRec;
      getRevisionInfoRec = function (doc_tree) {
        var i, child, revs_info;
        for (i = 0; i < doc_tree.children.length; i += 1) {
          child = doc_tree.children[i];
          if (child.rev === revision) {
            return [{"rev": child.rev, "status": child.status}];
          }
          revs_info = getRevisionInfoRec(child);
          if (revs_info.length > 0 || revision === undefined) {
            revs_info.push({"rev": child.rev, "status": child.status});
            return revs_info;
          }
        }
        return [];
      };
      return getRevisionInfoRec(doc_tree);
    };

    priv.updateDocumentTree = function (doc, doc_tree) {
      var revs_info, updateDocumentTreeRec;
      doc = priv.clone(doc);
      revs_info = doc._revs_info;
      updateDocumentTreeRec = function (doc_tree, revs_info) {
        var i, child, info;
        if (revs_info.length === 0) {
          return;
        }
        info = revs_info.pop();
        for (i = 0; i < doc_tree.children.length; i += 1) {
          child = doc_tree.children[i];
          if (child.rev === info.rev) {
            return updateDocumentTreeRec(child, revs_info);
          }
        }
        doc_tree.children.unshift({
          "rev": info.rev,
          "status": info.status,
          "children": []
        });
        updateDocumentTreeRec(doc_tree.children[0], revs_info);
      };
      updateDocumentTreeRec(doc_tree, priv.clone(revs_info));
    };

    priv.send = function (command, method, doc, option, callback) {
      var storage = command.storage(priv.sub_storage);
      function onSuccess(success) {
        callback(undefined, success);
      }
      function onError(err) {
        callback(err, undefined);
      }
      if (method === 'allDocs') {
        storage.allDocs(option).then(onSuccess, onError);
      } else {
        storage[method](doc, option).then(onSuccess, onError);
      }
    };

    priv.getWinnerRevsInfo = function (doc_tree) {
      var revs_info = [], getWinnerRevsInfoRec;
      getWinnerRevsInfoRec = function (doc_tree, tmp_revs_info) {
        var i;
        if (doc_tree.rev) {
          tmp_revs_info.unshift({
            "rev": doc_tree.rev,
            "status": doc_tree.status
          });
        }
        if (doc_tree.children.length === 0) {
          if (revs_info.length === 0 ||
              (revs_info[0].status !== "available" &&
               tmp_revs_info[0].status === "available") ||
              (tmp_revs_info[0].status === "available" &&
               revs_info.length < tmp_revs_info.length)) {
            revs_info = priv.clone(tmp_revs_info);
          }
        }
        for (i = 0; i < doc_tree.children.length; i += 1) {
          getWinnerRevsInfoRec(doc_tree.children[i], tmp_revs_info);
        }
        tmp_revs_info.shift();
      };
      getWinnerRevsInfoRec(doc_tree, []);
      return revs_info;
    };

    priv.getConflicts = function (revision, doc_tree) {
      var conflicts = [], getConflictsRec;
      getConflictsRec = function (doc_tree) {
        var i;
        if (doc_tree.rev === revision) {
          return;
        }
        if (doc_tree.children.length === 0) {
          if (doc_tree.status !== "deleted") {
            conflicts.push(doc_tree.rev);
          }
        }
        for (i = 0; i < doc_tree.children.length; i += 1) {
          getConflictsRec(doc_tree.children[i]);
        }
      };
      getConflictsRec(doc_tree);
      return conflicts.length === 0 ? undefined : conflicts;
    };

    priv.get = function (command, doc, option, callback) {
      priv.send(command, "get", doc, option, callback);
    };
    priv.put = function (command, doc, option, callback) {
      priv.send(command, "put", doc, option, callback);
    };
    priv.remove = function (command, doc, option, callback) {
      priv.send(command, "remove", doc, option, callback);
    };
    priv.getAttachment = function (command, attachment, option, callback) {
      priv.send(command, "getAttachment", attachment, option, callback);
    };
    priv.putAttachment = function (command, attachment, option, callback) {
      priv.send(command, "putAttachment", attachment, option, callback);
    };
    priv.removeAttachment = function (command, attachment, option, callback) {
      priv.send(command, "removeAttachment", attachment, option, callback);
    };

    priv.getDocument = function (command, doc, option, callback) {
      doc = priv.clone(doc);
      doc._id = doc._id + "." + doc._rev;
      delete doc._attachment;
      delete doc._rev;
      delete doc._revs;
      delete doc._revs_info;
      priv.get(command, doc, option, callback);
    };
    priv.putDocument = function (command, doc, option, callback) {
      doc = priv.clone(doc);
      doc._id = doc._id + "." + doc._rev;
      delete doc._attachment;
      delete doc._data;
      delete doc._mimetype;
      delete doc._content_type;
      delete doc._rev;
      delete doc._revs;
      delete doc._revs_info;
      priv.put(command, doc, option, callback);
    };

    priv.getRevisionTree = function (command, doc, option, callback) {
      doc = priv.clone(doc);
      doc._id = doc._id + priv.doc_tree_suffix;
      priv.get(command, doc, option, function (err, response) {
        if (err) {
          return callback(err, response);
        }
        if (response.data && response.data.children) {
          response.data.children = JSON.parse(response.data.children);
        }
        return callback(err, response);
      });
    };

    priv.getAttachmentList = function (command, doc, option, callback) {
      var attachment_id, dealResults, state = "ok", result_list = [], count = 0;
      dealResults = function (attachment_id, attachment_meta) {
        return function (err, response) {
          if (state !== "ok") {
            return;
          }
          count -= 1;
          if (err) {
            if (err.status === 404) {
              result_list.push(undefined);
            } else {
              state = "error";
              return callback(err, undefined);
            }
          }
          result_list.push({
            "_attachment": attachment_id,
            "_data": response.data,
            "_content_type": attachment_meta.content_type
          });
          if (count === 0) {
            state = "finished";
            callback(undefined, {"data": result_list});
          }
        };
      };
      for (attachment_id in doc._attachments) {
        if (doc._attachments.hasOwnProperty(attachment_id)) {
          count += 1;
          priv.getAttachment(
            command,
            {"_id": doc._id, "_attachment": attachment_id},
            option,
            dealResults(attachment_id, doc._attachments[attachment_id])
          );
        }
      }
      if (count === 0) {
        callback(undefined, {"data": []});
      }
    };

    priv.putAttachmentList = function (command, doc, option,
                                       attachment_list, callback) {
      var i, dealResults, state = "ok", count = 0, attachment;
      attachment_list = attachment_list || [];
      dealResults = function () {
        return function (err) {
          if (state !== "ok") {
            return;
          }
          count -= 1;
          if (err) {
            state = "error";
            return callback(err, undefined);
          }
          if (count === 0) {
            state = "finished";
            callback(undefined, {});
          }
        };
      };
      for (i = 0; i < attachment_list.length; i += 1) {
        attachment = attachment_list[i];
        if (attachment !== undefined) {
          count += 1;
          attachment._id = doc._id + "." + doc._rev;
          priv.putAttachment(command, attachment, option, dealResults(i));
        }
      }
      if (count === 0) {
        return callback(undefined, {});
      }
    };

    priv.putDocumentTree = function (command, doc, option, doc_tree, callback) {
      doc_tree = priv.clone(doc_tree);
      doc_tree._id = doc._id + priv.doc_tree_suffix;
      if (doc_tree.children) {
        doc_tree.children = JSON.stringify(doc_tree.children);
      }
      priv.put(command, doc_tree, option, callback);
    };

    priv.notFoundError = function (message, reason) {
      return {
        "status": 404,
        "message": message,
        "reason": reason
      };
    };

    priv.conflictError = function (message, reason) {
      return {
        "status": 409,
        "message": message,
        "reason": reason
      };
    };

    priv.revisionGenericRequest = function (command, doc, option,
                                            specific_parameter, onEnd) {
      var prev_doc, doc_tree, attachment_list, callback = {};
      if (specific_parameter.doc_id) {
        doc._id = specific_parameter.doc_id;
      }
      if (specific_parameter.attachment_id) {
        doc._attachment = specific_parameter.attachment_id;
      }
      callback.begin = function () {
        var check_error;
        doc._id = doc._id || priv.generateUuid(); // XXX should not generate id
        if (specific_parameter.revision_needed && !doc._rev) {
          return onEnd(priv.conflictError(
            "Document update conflict",
            "No document revision was provided"
          ), undefined);
        }
        // check revision format
        check_error = priv.checkDocumentRevisionFormat(doc);
        if (check_error !== undefined) {
          return onEnd(check_error, undefined);
        }
        priv.getRevisionTree(command, doc, option, callback.getRevisionTree);
      };
      callback.getRevisionTree = function (err, response) {
        var winner_info, previous_revision, generate_new_revision;
        previous_revision = doc._rev;
        generate_new_revision = doc._revs || doc._revs_info ? false : true;
        if (err) {
          if (err.status !== 404) {
            err.message = "Cannot get document revision tree";
            return onEnd(err, undefined);
          }
        }
        doc_tree = (response && response.data) || priv.newDocTree();
        if (specific_parameter.get || specific_parameter.getAttachment) {
          if (!doc._rev) {
            winner_info = priv.getWinnerRevsInfo(doc_tree);
            if (winner_info.length === 0) {
              return onEnd(priv.notFoundError(
                "Document not found",
                "missing"
              ), undefined);
            }
            if (winner_info[0].status === "deleted") {
              return onEnd(priv.notFoundError(
                "Document not found",
                "deleted"
              ), undefined);
            }
            doc._rev = winner_info[0].rev;
          }
          priv.fillDocumentRevisionProperties(doc, doc_tree);
          return priv.getDocument(command, doc, option, callback.getDocument);
        }
        priv.fillDocumentRevisionProperties(doc, doc_tree);
        if (generate_new_revision) {
          if (previous_revision && doc._revs_info.length === 0) {
            // the document history has changed, it means that the document
            // revision was wrong. Add a pseudo history to the document
            doc._rev = previous_revision;
            doc._revs = {
              "start": parseInt(previous_revision.split("-")[0], 10),
              "ids": [previous_revision.split("-")[1]]
            };
            doc._revs_info = [{"rev": previous_revision, "status": "missing"}];
          }
          doc = priv.generateNextRevision(
            doc,
            specific_parameter.remove
          );
        }
        if (doc._revs_info.length > 1) {
          prev_doc = {
            "_id": doc._id,
            "_rev": doc._revs_info[1].rev
          };
          if (!generate_new_revision && specific_parameter.putAttachment) {
            prev_doc._rev = doc._revs_info[0].rev;
          }
        }
        // force revs_info status
        doc._revs_info[0].status = (specific_parameter.remove ?
                                    "deleted" : "available");
        priv.updateDocumentTree(doc, doc_tree);
        if (prev_doc) {
          return priv.getDocument(command, prev_doc,
                                  option, callback.getDocument);
        }
        if (specific_parameter.remove || specific_parameter.removeAttachment) {
          return onEnd(priv.notFoundError(
            "Unable to remove an inexistent document",
            "missing"
          ), undefined);
        }
        priv.putDocument(command, doc, option, callback.putDocument);
      };
      callback.getDocument = function (err, res_doc) {
        var k, conflicts;
        if (err) {
          if (err.status === 404) {
            if (specific_parameter.remove ||
                specific_parameter.removeAttachment) {
              return onEnd(priv.conflictError(
                "Document update conflict",
                "Document is missing"
              ), undefined);
            }
            if (specific_parameter.get) {
              return onEnd(priv.notFoundError(
                "Unable to find the document",
                "missing"
              ), undefined);
            }
            res_doc = {"data": {}};
          } else {
            err.message = "Cannot get document";
            return onEnd(err, undefined);
          }
        }
        res_doc = res_doc.data;
        if (specific_parameter.get) {
          res_doc._id = doc._id;
          res_doc._rev = doc._rev;
          if (option.conflicts === true) {
            conflicts = priv.getConflicts(doc._rev, doc_tree);
            if (conflicts) {
              res_doc._conflicts = conflicts;
            }
          }
          if (option.revs === true) {
            res_doc._revisions = doc._revs;
          }
          if (option.revs_info === true) {
            res_doc._revs_info = doc._revs_info;
          }
          return onEnd(undefined, {"data": res_doc});
        }
        if (specific_parameter.putAttachment ||
            specific_parameter.removeAttachment) {
          // copy metadata (not beginning by "_" to document
          for (k in res_doc) {
            if (res_doc.hasOwnProperty(k) && !k.match("^_")) {
              doc[k] = res_doc[k];
            }
          }
        }
        if (specific_parameter.remove) {
          priv.putDocumentTree(command, doc, option,
                               doc_tree, callback.putDocumentTree);
        } else {
          priv.getAttachmentList(command, res_doc, option,
                                 callback.getAttachmentList);
        }
      };
      callback.getAttachmentList = function (err, res_list) {
        var i, attachment_found = false;
        if (err) {
          err.message = "Cannot get attachment";
          return onEnd(err, undefined);
        }
        res_list = res_list.data;
        attachment_list = res_list || [];
        if (specific_parameter.getAttachment) {
          // getting specific attachment
          for (i = 0; i < attachment_list.length; i += 1) {
            if (attachment_list[i] &&
                doc._attachment ===
                attachment_list[i]._attachment) {
              return onEnd(undefined, {"data": attachment_list[i]._data});
            }
          }
          return onEnd(priv.notFoundError(
            "Unable to get an inexistent attachment",
            "missing"
          ), undefined);
        }
        if (specific_parameter.remove_from_attachment_list) {
          // removing specific attachment
          for (i = 0; i < attachment_list.length; i += 1) {
            if (attachment_list[i] &&
                specific_parameter.remove_from_attachment_list._attachment ===
                attachment_list[i]._attachment) {
              attachment_found = true;
              attachment_list[i] = undefined;
              break;
            }
          }
          if (!attachment_found) {
            return onEnd(priv.notFoundError(
              "Unable to remove an inexistent attachment",
              "missing"
            ), undefined);
          }
        }
        priv.putDocument(command, doc, option, callback.putDocument);
      };
      callback.putDocument = function (err) {
        var i, attachment_found = false;
        if (err) {
          err.message = "Cannot post the document";
          return onEnd(err, undefined);
        }
        if (specific_parameter.add_to_attachment_list) {
          // adding specific attachment
          attachment_list = attachment_list || [];
          for (i = 0; i < attachment_list.length; i += 1) {
            if (attachment_list[i] &&
                specific_parameter.add_to_attachment_list._attachment ===
                attachment_list[i]._attachment) {
              attachment_found = true;
              attachment_list[i] = specific_parameter.add_to_attachment_list;
              break;
            }
          }
          if (!attachment_found) {
            attachment_list.unshift(specific_parameter.add_to_attachment_list);
          }
        }
        priv.putAttachmentList(
          command,
          doc,
          option,
          attachment_list,
          callback.putAttachmentList
        );
      };
      callback.putAttachmentList = function (err) {
        if (err) {
          err.message = "Cannot copy attacments to the document";
          return onEnd(err, undefined);
        }
        priv.putDocumentTree(command, doc, option,
                             doc_tree, callback.putDocumentTree);
      };
      callback.putDocumentTree = function (err) {
        var response_object;
        if (err) {
          err.message = "Cannot update the document history";
          return onEnd(err, undefined);
        }
        response_object = {
          "id": doc._id,
          "rev": doc._rev
        };
        if (specific_parameter.putAttachment ||
            specific_parameter.removeAttachment ||
            specific_parameter.getAttachment) {
          response_object.attachment = doc._attachment;
        }
        onEnd(undefined, response_object);
        // if (option.keep_revision_history !== true) {
        //   // priv.remove(command, prev_doc, option, function () {
        //   //   - change "available" status to "deleted"
        //   //   - remove attachments
        //   //   - done, no callback
        //   // });
        // }
      };
      callback.begin();
    };

    /**
     * Post the document metadata and create or update a document tree.
     * Options:
     * - {boolean} keep_revision_history To keep the previous revisions
     *                                   (false by default) (NYI).
     * @method post
     * @param  {object} command The JIO command
     */
    that.post = function (command, metadata, option) {
      priv.revisionGenericRequest(
        command,
        metadata,
        option,
        {},
        function (err, response) {
          if (err) {
            return command.error(err);
          }
          command.success({"id": response.id, "rev": response.rev});
        }
      );
    };

    /**
     * Put the document metadata and create or update a document tree.
     * Options:
     * - {boolean} keep_revision_history To keep the previous revisions
     *                                   (false by default) (NYI).
     * @method put
     * @param  {object} command The JIO command
     */
    that.put = function (command, metadata, option) {
      priv.revisionGenericRequest(
        command,
        metadata,
        option,
        {},
        function (err, response) {
          if (err) {
            return command.error(err);
          }
          command.success({"rev": response.rev});
        }
      );
    };


    that.putAttachment = function (command, param, option) {
      tool.readBlobAsBinaryString(param._blob).then(function (event) {
        param._content_type = param._blob.type;
        param._data = event.target.result;
        delete param._blob;
        priv.revisionGenericRequest(
          command,
          param,
          option,
          {
            "doc_id": param._id,
            "attachment_id": param._attachment,
            "add_to_attachment_list": {
              "_attachment": param._attachment,
              "_content_type": param._content_type,
              "_data": param._data
            },
            "putAttachment": true
          },
          function (err, response) {
            if (err) {
              return command.error(err);
            }
            command.success({"rev": response.rev});
          }
        );
      }, function () {
        command.error("conflict", "broken blob", "Cannot read data to put");
      });
    };

    that.remove = function (command, param, option) {
      priv.revisionGenericRequest(
        command,
        param,
        option,
        {
          "revision_needed": true,
          "remove": true
        },
        function (err, response) {
          if (err) {
            return command.error(err);
          }
          command.success({"rev": response.rev});
        }
      );
    };

    that.removeAttachment = function (command, param, option) {
      priv.revisionGenericRequest(
        command,
        param,
        option,
        {
          "doc_id": param._id,
          "attachment_id": param._attachment,
          "revision_needed": true,
          "removeAttachment": true,
          "remove_from_attachment_list": {
            "_attachment": param._attachment
          }
        },
        function (err, response) {
          if (err) {
            return command.error(err);
          }
          command.success({"rev": response.rev});
        }
      );
    };

    that.get = function (command, param, option) {
      priv.revisionGenericRequest(
        command,
        param,
        option,
        {
          "get": true
        },
        function (err, response) {
          if (err) {
            return command.error(err);
          }
          command.success({"data": response.data});
        }
      );
    };

    that.getAttachment = function (command, param, option) {
      priv.revisionGenericRequest(
        command,
        param,
        option,
        {
          "doc_id": param._id,
          "attachment_id": param._attachment,
          "getAttachment": true
        },
        function (err, response) {
          if (err) {
            return command.error(err);
          }
          command.success({"data": response.data});
        }
      );
    };

    that.allDocs = function (command, param, option) {
      /*jslint unparam: true */
      var rows, result = {"total_rows": 0, "rows": []}, functions = {};
      functions.finished = 0;
      functions.falseResponseGenerator = function (response, callback) {
        callback(undefined, response);
      };
      functions.fillResultGenerator = function (doc_id) {
        return function (err, doc_tree) {
          var document_revision, row, revs_info;
          if (err) {
            return command.error(err);
          }
          doc_tree = doc_tree.data;
          if (typeof doc_tree.children === 'string') {
            doc_tree.children = JSON.parse(doc_tree.children);
          }
          revs_info = priv.getWinnerRevsInfo(doc_tree);
          document_revision =
            rows.document_revisions[doc_id + "." + revs_info[0].rev];
          if (document_revision) {
            row = {
              "id": doc_id,
              "key": doc_id,
              "value": {
                "rev": revs_info[0].rev
              }
            };
            if (document_revision.doc && option.include_docs) {
              document_revision.doc._id = doc_id;
              document_revision.doc._rev = revs_info[0].rev;
              row.doc = document_revision.doc;
            }
            result.rows.push(row);
            result.total_rows += 1;
          }
          functions.success();
        };
      };
      functions.success = function () {
        functions.finished -= 1;
        if (functions.finished === 0) {
          command.success({"data": result});
        }
      };
      priv.send(command, "allDocs", null, option, function (err, response) {
        var i, row, selector, selected;
        if (err) {
          return command.error(err);
        }
        response = response.data;
        selector = /\.revision_tree\.json$/;
        rows = {
          "revision_trees": {
            // id.revision_tree.json: {
            //   id: blabla
            //   doc: {...}
            // }
          },
          "document_revisions": {
            // id.rev: {
            //   id: blabla
            //   rev: 1-1
            //   doc: {...}
            // }
          }
        };
        while (response.rows.length > 0) {
          // filling rows
          row = response.rows.shift();
          selected = selector.exec(row.id);
          if (selected) {
            selected = selected.input.substring(0, selected.index);
            // this is a revision tree
            rows.revision_trees[row.id] = {
              "id": selected
            };
            if (row.doc) {
              rows.revision_trees[row.id].doc = row.doc;
            }
          } else {
            // this is a simple revision
            rows.document_revisions[row.id] = {
              "id": row.id.split(".").slice(0, -1),
              "rev": row.id.split(".").slice(-1)
            };
            if (row.doc) {
              rows.document_revisions[row.id].doc = row.doc;
            }
          }
        }
        functions.finished += 1;
        for (i in rows.revision_trees) {
          if (rows.revision_trees.hasOwnProperty(i)) {
            functions.finished += 1;
            if (rows.revision_trees[i].doc) {
              functions.falseResponseGenerator(
                {"data": rows.revision_trees[i].doc},
                functions.fillResultGenerator(rows.revision_trees[i].id)
              );
            } else {
              priv.getRevisionTree(
                command,
                {"_id": rows.revision_trees[i].id},
                option,
                functions.fillResultGenerator(rows.revision_trees[i].id)
              );
            }
          }
        }
        functions.success();
      });
    };

    // XXX
    that.check = function (command) {
      command.success();
    };

    // XXX
    that.repair = function (command) {
      command.success();
    };

  }); // end RevisionStorage

}));
