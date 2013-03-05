/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true, hex_sha256: true, setTimeout: true */
/**
 * JIO Revision Storage.
 * It manages document version and can generate conflicts.
 * Description:
 * {
 *     "type": "revision",
 *     "sub_storage": <sub storage description>
 * }
 */
jIO.addStorageType("revision", function (spec, my) {
  "use strict";
  var that = {}, priv = {};
  spec = spec || {};
  that = my.basicStorage(spec, my);
  // ATTRIBUTES //
  priv.doc_tree_suffix = ".revision_tree.json";
  priv.sub_storage = spec.sub_storage;
  // METHODS //
  /**
   * Constructor
   */
  priv.RevisionStorage = function () {
    // no init
  };

  /**
   * Description to store in order to be restored later
   * @method specToStore
   * @return {object} Descriptions to store
   */
  that.specToStore = function () {
    return {
      "sub_storage": priv.sub_storage
    };
  };

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
    return hex_sha256(string);
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
        "status": 31,
        "statusText": "Wrong Revision Format",
        "error": "wrong_revision_format",
        "message": message,
        "reason": "Revision is wrong"
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
        return send_error("The document revision history is not well formated");
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
    var string, revision_history, revs_info, pseudo_revision;
    doc = priv.clone(doc) || {};
    revision_history = doc._revs;
    revs_info = doc._revs_info;
    delete doc._rev;
    delete doc._revs;
    delete doc._revs_info;
    string = JSON.stringify(doc) + JSON.stringify(revision_history) +
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
    var revs_info, updateDocumentTreeRec, next_rev;
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

  priv.send = function (method, doc, option, callback) {
    that.addJob(
      method,
      priv.sub_storage,
      doc,
      option,
      function (success) {
        callback(undefined, success);
      },
      function (err) {
        callback(err, undefined);
      }
    );
  };

  priv.getWinnerRevsInfo = function (doc_tree) {
    var revs_info = [], getWinnerRevsInfoRec;
    getWinnerRevsInfoRec = function (doc_tree, tmp_revs_info) {
      var i;
      if (doc_tree.rev) {
        tmp_revs_info.unshift({"rev": doc_tree.rev, "status": doc_tree.status});
      }
      if (doc_tree.children.length === 0) {
        if (revs_info.length < tmp_revs_info.length ||
            (revs_info.length > 0 && revs_info[0].status === "deleted")) {
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

  priv.get = function (doc, option, callback) {
    priv.send("get", doc, option, callback);
  };
  priv.put = function (doc, option, callback) {
    priv.send("put", doc, option, callback);
  };
  priv.remove = function (doc, option, callback) {
    priv.send("remove", doc, option, callback);
  };
  priv.putAttachment = function (attachment, option, callback) {
    priv.send("putAttachment", attachment, option, callback);
  };

  priv.getDocument = function (doc, option, callback) {
    doc = priv.clone(doc);
    doc._id = doc._id + "." + doc._rev;
    delete doc._attachment;
    delete doc._rev;
    delete doc._revs;
    delete doc._revs_info;
    priv.get(doc, option, callback);
  };
  priv.getAttachment = priv.get;
  priv.putDocument = function (doc, option, callback) {
    doc = priv.clone(doc);
    doc._id = doc._id + "." + doc._rev;
    delete doc._attachment;
    delete doc._data;
    delete doc._mimetype;
    delete doc._rev;
    delete doc._revs;
    delete doc._revs_info;
    priv.put(doc, option, callback);
  };

  priv.getRevisionTree = function (doc, option, callback) {
    doc = priv.clone(doc);
    doc._id = doc._id + priv.doc_tree_suffix;
    priv.get(doc, option, callback);
  };

  priv.getAttachmentList = function (doc, option, callback) {
    var attachment_id, dealResults, state = "ok", result_list = [], count = 0;
    dealResults = function (attachment_id, attachment_meta) {
      return function (err, attachment) {
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
          "_data": attachment,
          "_mimetype": attachment_meta.content_type
        });
        if (count === 0) {
          state = "finished";
          callback(undefined, result_list);
        }
      };
    };
    for (attachment_id in doc._attachments) {
      if (doc._attachments.hasOwnProperty(attachment_id)) {
        count += 1;
        priv.get(
          {"_id": doc._id + "/" + attachment_id},
          option,
          dealResults(attachment_id, doc._attachments[attachment_id])
        );
      }
    }
    if (count === 0) {
      callback(undefined, []);
    }
  };

  priv.putAttachmentList = function (doc, option, attachment_list, callback) {
    var i, dealResults, state = "ok", count = 0, attachment;
    attachment_list = attachment_list || [];
    dealResults = function (index) {
      return function (err, response) {
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
          callback(undefined, {"id": doc._id, "ok": true});
        }
      };
    };
    for (i = 0; i < attachment_list.length; i += 1) {
      attachment = attachment_list[i];
      if (attachment !== undefined) {
        count += 1;
        attachment._id = doc._id + "." + doc._rev + "/" +
          attachment._attachment;
        delete attachment._attachment;
        priv.putAttachment(attachment, option, dealResults(i));
      }
    }
    if (count === 0) {
      return callback(undefined, {"id": doc._id, "ok": true});
    }
  };

  priv.putDocumentTree = function (doc, option, doc_tree, callback) {
    doc_tree = priv.clone(doc_tree);
    doc_tree._id = doc._id + priv.doc_tree_suffix;
    priv.put(doc_tree, option, callback);
  };

  priv.notFoundError = function (message, reason) {
    return {
      "status": 404,
      "statusText": "Not Found",
      "error": "not_found",
      "message": message,
      "reason": reason
    };
  };

  priv.conflictError = function (message, reason) {
    return {
      "status": 409,
      "statusText": "Conflict",
      "error": "conflict",
      "message": message,
      "reason": reason
    };
  };

  priv.revisionGenericRequest = function (doc, option,
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
      doc._id = doc._id || priv.generateUuid();
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
      priv.getRevisionTree(doc, option, callback.getRevisionTree);
    };
    callback.getRevisionTree = function (err, response) {
      var winner_info, previous_revision = doc._rev,
        generate_new_revision = doc._revs || doc._revs_info ? false : true;
      if (err) {
        if (err.status !== 404) {
          err.message = "Cannot get document revision tree";
          return onEnd(err, undefined);
        }
      }
      doc_tree = response || priv.newDocTree();
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
        return priv.getDocument(doc, option, callback.getDocument);
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
      }
      // force revs_info status
      doc._revs_info[0].status = (specific_parameter.remove ?
                                  "deleted" : "available");
      priv.updateDocumentTree(doc, doc_tree);
      if (prev_doc) {
        return priv.getDocument(prev_doc, option, callback.getDocument);
      }
      if (specific_parameter.remove || specific_parameter.removeAttachment) {
        return onEnd(priv.notFoundError(
          "Unable to remove an inexistent document",
          "missing"
        ), undefined);
      }
      priv.putDocument(doc, option, callback.putDocument);
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
          res_doc = {};
        } else {
          err.message = "Cannot get document";
          return onEnd(err, undefined);
        }
      }
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
        return onEnd(undefined, res_doc);
      }
      if (specific_parameter.removeAttachment) {
        // copy metadata (not beginning by "_" to document
        for (k in res_doc) {
          if (res_doc.hasOwnProperty(k) && !k.match("^_")) {
            doc[k] = res_doc[k];
          }
        }
      }
      if (specific_parameter.remove) {
        priv.putDocumentTree(doc, option, doc_tree, callback.putDocumentTree);
      } else {
        priv.getAttachmentList(res_doc, option, callback.getAttachmentList);
      }
    };
    callback.getAttachmentList = function (err, res_list) {
      var i, attachment_found = false;
      if (err) {
        err.message = "Cannot get attachment";
        return onEnd(err, undefined);
      }
      attachment_list = res_list || [];
      if (specific_parameter.getAttachment) {
        // getting specific attachment
        for (i = 0; i < attachment_list.length; i += 1) {
          if (attachment_list[i] &&
              doc._attachment ===
              attachment_list[i]._attachment) {
            return onEnd(undefined, attachment_list[i]._data);
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
      priv.putDocument(doc, option, callback.putDocument);
    };
    callback.putDocument = function (err, response) {
      var i, attachment_found = false;
      if (err) {
        err.message = "Cannot post the document";
        return onEnd(err, undefined);
      }
      if (specific_parameter.add_to_attachment_list) {
        // adding specific attachment
        attachment_list = attachment_list || [];
        for (i = 0; i < attachment_list.length; i += 1) {
          if (specific_parameter.add_to_attachment_list._attachment ===
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
        doc,
        option,
        attachment_list,
        callback.putAttachmentList
      );
    };
    callback.putAttachmentList = function (err, response) {
      if (err) {
        err.message = "Cannot copy attacments to the document";
        return onEnd(err, undefined);
      }
      priv.putDocumentTree(doc, option, doc_tree, callback.putDocumentTree);
    };
    callback.putDocumentTree = function (err, response) {
      if (err) {
        err.message = "Cannot update the document history";
        return onEnd(err, undefined);
      }
      onEnd(undefined, {
        "ok": true,
        "id": doc._id + (specific_parameter.putAttachment ||
                         specific_parameter.removeAttachment ||
                         specific_parameter.getAttachment ?
                         "/" + doc._attachment : ""),
        "rev": doc._rev
      });
      // if (option.keep_revision_history !== true) {
      //   // priv.remove(prev_doc, option, function () {
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
  that.post = function (command) {
    priv.revisionGenericRequest(
      command.cloneDoc(),
      command.cloneOption(),
      {},
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
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
  that.put = function (command) {
    priv.revisionGenericRequest(
      command.cloneDoc(),
      command.cloneOption(),
      {},
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
      }
    );
  };


  that.putAttachment = function (command) {
    priv.revisionGenericRequest(
      command.cloneDoc(),
      command.cloneOption(),
      {
        "doc_id": command.getDocId(),
        "attachment_id": command.getAttachmentId(),
        "add_to_attachment_list": {
          "_attachment": command.getAttachmentId(),
          "_mimetype": command.getAttachmentMimeType(),
          "_data": command.getAttachmentData()
        },
        "putAttachment": true
      },
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
      }
    );
  };

  that.remove = function (command) {
    if (command.getAttachmentId()) {
      return that.removeAttachment(command);
    }
    priv.revisionGenericRequest(
      command.cloneDoc(),
      command.cloneOption(),
      {
        "revision_needed": true,
        "remove": true
      },
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
      }
    );
  };

  that.removeAttachment = function (command) {
    priv.revisionGenericRequest(
      command.cloneDoc(),
      command.cloneOption(),
      {
        "doc_id": command.getDocId(),
        "attachment_id": command.getAttachmentId(),
        "revision_needed": true,
        "removeAttachment": true,
        "remove_from_attachment_list": {
          "_attachment": command.getAttachmentId()
        }
      },
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
      }
    );
  };

  that.get = function (command) {
    if (command.getAttachmentId()) {
      return that.getAttachment(command);
    }
    priv.revisionGenericRequest(
      command.cloneDoc(),
      command.cloneOption(),
      {
        "get": true
      },
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
      }
    );
  };

  that.getAttachment = function (command) {
    priv.revisionGenericRequest(
      command.cloneDoc(),
      command.cloneOption(),
      {
        "doc_id": command.getDocId(),
        "attachment_id": command.getAttachmentId(),
        "getAttachment": true
      },
      function (err, response) {
        if (err) {
          return that.error(err);
        }
        that.success(response);
      }
    );
  };

  // END //
  priv.RevisionStorage();
  return that;
}); // end RevisionStorage
