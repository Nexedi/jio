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
jIO.addStorageType('revision', function (spec, my) {
  "use strict";
  var that, priv = {};
  spec = spec || {};
  that = my.basicStorage(spec, my);

  priv.substorage_key = "sub_storage";
  priv.doctree_suffix = ".revision_tree.json";
  priv.substorage = spec[priv.substorage_key];

  that.specToStore = function () {
    var o = {};
    o[priv.substorage_key] = priv.substorage;
    return o;
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
   * Returns an array version of a revision string
   * @method revisionToArray
   * @param  {string} revision The revision string
   * @return {array} Array containing a revision number and a hash
   */
  priv.revisionToArray = function (revision) {
    if (typeof revision === "string") {
      return [parseInt(revision.split('-')[0], 10),
        revision.split('-')[1]];
    }
    return revision;
  };

  /**
   * Convert the revision history object to an array of revisions.
   * @method revisionHistoryToArray
   * @param  {object} revs The revision history
   * @return {array} The revision array
   */
  priv.revisionHistoryToArray = function (revs) {
    var i, start = revs.start, newlist = [];
    for (i = 0; i < revs.ids.length; i += 1, start -= 1) {
      newlist.push(start + "-" + revs.ids[i]);
    }
    return newlist;
  };

  /**
   * Generates the next revision of [previous_revision]. [string] helps us
   * to generate a hash code.
   * @methode generateNextRev
   * @param  {string} previous_revision The previous revision
   * @param  {object} doc The document metadata
   * @param  {object} revisions The revision history
   * @param  {boolean} deleted_flag The deleted flag
   * @return {array} 0:The next revision number and 1:the hash code
   */
  priv.generateNextRevision = function (previous_revision,
    doc, revisions, deleted_flag) {
    var string = JSON.stringify(doc) + JSON.stringify(revisions) +
      JSON.stringify(deleted_flag ? true : false);
    if (typeof previous_revision === "number") {
      return [previous_revision + 1, priv.hashCode(string)];
    }
    previous_revision = priv.revisionToArray(previous_revision);
    return [previous_revision[0] + 1, priv.hashCode(string)];
  };

  /**
   * Checks a revision format
   * @method checkRevisionFormat
   * @param  {string} revision The revision string
   * @return {boolean} True if ok, else false
   */
  priv.checkRevisionFormat = function (revision) {
    return (/^[0-9]+-[0-9a-zA-Z]+$/.test(revision));
  };

  /**
   * Creates an empty document tree
   * @method createDocumentTree
   * @param  {array} children An array of children (optional)
   * @return {object} The new document tree
   */
  priv.createDocumentTree = function (children) {
    return {
      "children": children || []
    };
  };

  /**
   * Creates a new document tree node
   * @method createDocumentTreeNode
   * @param  {string} revision The node revision
   * @param  {string} status The node status
   * @param  {array} children An array of children (optional)
   * @return {object} The new document tree node
   */
  priv.createDocumentTreeNode = function (revision, status, children) {
    return {
      "rev": revision,
      "status": status,
      "children": children || []
    };
  };

  /**
   * Gets the specific revision from a document tree.
   * @method getRevisionFromDocumentTree
   * @param  {object} document_tree The document tree
   * @param  {string} revision The specific revision
   * @return {array} The good revs info array
   */
  priv.getRevisionFromDocumentTree = function (document_tree, revision) {
    var result, search, revs_info = [];
    result = [];
    // search method fills "result" with the good revs info
    search = function (document_tree) {
      var i;
      if (document_tree.rev !== undefined) {
        // node is not root
        revs_info.unshift({
          "rev": document_tree.rev,
          "status": document_tree.status
        });
        if (document_tree.rev === revision) {
          result = revs_info;
          return;
        }
      }
      // This node has children
      for (i = 0; i < document_tree.children.length; i += 1) {
        // searching deeper to find the good rev
        search(document_tree.children[i]);
        if (result.length > 0) {
          // The result is already found
          return;
        }
        revs_info.shift();
      }
    };
    search(document_tree);
    return result;
  };

  /**
   * Gets the winner revision from a document tree.
   * The winner is the deeper revision on the left.
   * @method getWinnerRevisionFromDocumentTree
   * @param  {object} document_tree The document tree
   * @return {array} The winner revs info array
   */
  priv.getWinnerRevisionFromDocumentTree = function (document_tree) {
    var result, search, revs_info = [];
    result = [];
    // search method fills "result" with the winner revs info
    search = function (document_tree, deep) {
      var i;
      if (document_tree.rev !== undefined) {
        // node is not root
        revs_info.unshift({
          "rev": document_tree.rev,
          "status": document_tree.status
        });
      }
      if (document_tree.children.length === 0 && document_tree.status !==
          "deleted") {
        // This node is a leaf
        if (result.length < deep) {
          // The leaf is deeper than result
          result = [];
          for (i = 0; i < revs_info.length; i += 1) {
            result.push(revs_info[i]);
          }
        }
        return;
      }
      // This node has children
      for (i = 0; i < document_tree.children.length; i += 1) {
        // searching deeper to find the deeper leaf
        search(document_tree.children[i], deep + 1);
        revs_info.shift();
      }
    };
    search(document_tree, 0);
    return result;
  };

  /**
   * Add a document revision branch to the document tree
   * @method updateDocumentTree
   * @param  {object} doctree The document tree object
   * @param  {object|array} revs The revision history object or a revision array
   * @param  {boolean} deleted The deleted flag
   * @param  {array} The document revs_info
   */
  priv.updateDocumentTree = function (doctree, revs, deleted) {
    var revs_info, doctree_iterator, flag, i, rev;
    revs_info = [];
    if (revs.ids) {
      // revs is a revision history object
      revs = priv.revisionHistoryToArray(revs);
    } else {
      // revs is an array of revisions
      revs = priv.clone(revs);
    }
    doctree_iterator = doctree;
    while (revs.length > 0) {
      rev = revs.pop(0);
      revs_info.unshift({
        "rev": rev,
        "status": "missing"
      });
      for (i = 0; i < doctree_iterator.children.length; i += 1) {
        if (doctree_iterator.children[i].rev === rev) {
          doctree_iterator = doctree_iterator.children[i];
          revs_info[0].status = doctree_iterator.status;
          rev = undefined;
          break;
        }
      }
      if (rev) {
        doctree_iterator.children.unshift({
          "rev": rev,
          "status": "missing",
          "children": []
        });
        doctree_iterator = doctree_iterator.children[0];
      }
    }
    flag = deleted === true ? "deleted" : "available";
    revs_info[0].status = flag;
    doctree_iterator.status = flag;
    return revs_info;
  };

  /**
   * Add a document revision to the document tree
   * @method postToDocumentTree
   * @param  {object} doctree The document tree object
   * @param  {object} doc The document object
   * @param  {boolean} set_node_to_deleted Set the revision to deleted
   * @return {array} The added document revs_info
   */
  priv.postToDocumentTree = function (doctree, doc, set_node_to_deleted) {
    var i, revs_info, next_rev, next_rev_str, selectNode, selected_node,
      flag;
    flag = set_node_to_deleted === true ? "deleted" : "available";
    revs_info = [];
    selected_node = doctree;
    selectNode = function (node) {
      var i;
      if (node.rev !== undefined) {
        // node is not root
        revs_info.unshift({
          "rev": node.rev,
          "status": node.status
        });
      }
      if (node.rev === doc._rev) {
        selected_node = node;
        return "node_selected";
      }
      for (i = 0; i < node.children.length; i += 1) {
        if (selectNode(node.children[i]) === "node_selected") {
          return "node_selected";
        }
        revs_info.shift();
      }
    };
    if (typeof doc._rev === "string") {
      // document has a previous revision
      if (selectNode(selected_node) !== "node_selected") {
        // no node was selected, so add a node with a specific rev
        revs_info.unshift({
          "rev": doc._rev,
          "status": "missing"
        });
        selected_node.children.unshift(priv.createDocumentTreeNode(
          doc._rev,
          "missing"
        ));
        selected_node = selected_node.children[0];
      }
    }
    next_rev = priv.generateNextRevision(
      doc._rev || 0,
      doc,
      priv.revsInfoToHistory(revs_info),
      set_node_to_deleted
    );
    next_rev_str = next_rev.join("-");
    // don't add if the next rev already exists
    for (i = 0; i < selected_node.children.length; i += 1) {
      if (selected_node.children[i].rev === next_rev_str) {
        revs_info.unshift({
          "rev": next_rev_str,
          "status": flag
        });
        if (selected_node.children[i].status !== flag) {
          selected_node.children[i].status = flag;
        }
        return revs_info;
      }
    }
    revs_info.unshift({
      "rev": next_rev.join('-'),
      "status": flag
    });

    selected_node.children.unshift(priv.createDocumentTreeNode(
      next_rev.join('-'),
      flag
    ));

    return revs_info;
  };

  /**
   * Gets an array of leaves revisions from document tree
   * @method getLeavesFromDocumentTree
   * @param  {object} document_tree The document tree
   * @param  {string} except The revision to except
   * @return {array} The array of leaves revisions
   */
  priv.getLeavesFromDocumentTree = function (document_tree, except) {
    var result, search;
    result = [];
    // search method fills [result] with the winner revision
    search = function (document_tree) {
      var i;
      if (except !== undefined && except === document_tree.rev) {
        return;
      }
      if (document_tree.children.length === 0 && document_tree.status !==
          "deleted") {
        // This node is a leaf
        result.push(document_tree.rev);
        return;
      }
      // This node has children
      for (i = 0; i < document_tree.children.length; i += 1) {
        // searching deeper to find the deeper leaf
        search(document_tree.children[i]);
      }
    };
    search(document_tree);
    return result;
  };

  /**
   * Check if revision is a leaf
   * @method isRevisionALeaf
   * @param  {string} revision revision to check
   * @param  {array} leaves all leaves on tree
   * @return {boolean} true/false
   */
  priv.isRevisionALeaf = function (document_tree, revision) {
    var result, search;
    result = undefined;
    // search method fills "result" with the good revs info
    search = function (document_tree) {
      var i;
      if (document_tree.rev !== undefined) {
        // node is not root
        if (document_tree.rev === revision) {
          if (document_tree.children.length === 0) {
            // This node is a leaf
            result = true;
            return;
          }
          result = false;
          return;
        }
      }
      // This node has children
      for (i = 0; i < document_tree.children.length; i += 1) {
        // searching deeper to find the good rev
        search(document_tree.children[i]);
        if (result !== undefined) {
          // The result is already found
          return;
        }
      }
    };
    search(document_tree);
    return result || false;
  };

  /**
   * Convert revs_info to a simple revisions history
   * @method revsInfoToHistory
   * @param  {array} revs_info The revs info
   * @return {object} The revisions history
   */
  priv.revsInfoToHistory = function (revs_info) {
    var revisions = {
      "start": 0,
      "ids": []
    }, i;
    if (revs_info.length > 0) {
      revisions.start = parseInt(revs_info[0].rev.split('-')[0], 10);
    }
    for (i = 0; i < revs_info.length; i += 1) {
      revisions.ids.push(revs_info[i].rev.split('-')[1]);
    }
    return revisions;
  };

  /**
   * Returns the revision of the revision position from a revs_info array.
   * @method getRevisionFromPosition
   * @param  {array} revs_info The revs_info array
   * @param  {number} rev_pos The revision position number
   * @return {string} The revision of the good position (empty string if fail)
   */
  priv.getRevisionFromPosition = function (revs_info, rev_pos) {
    var i;
    for (i = revs_info.length - 1; i >= 0; i -= 1) {
      if (priv.revisionToArray(revs_info[i].rev)[0] === rev_pos) {
        return revs_info[i].rev;
      }
    }
    return '';
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
    var f = {}, doctree, revs_info, doc, docid;
    doc = command.cloneDoc();
    docid = command.getDocId();

    if (typeof doc._rev === "string" && !priv.checkRevisionFormat(doc._rev)) {
      that.error({
        "status": 31,
        "statusText": "Wrong Revision Format",
        "error": "wrong_revision_format",
        "message": "The document previous revision does not match " +
          "^[0-9]+-[0-9a-zA-Z]+$",
        "reason": "Previous revision is wrong"
      });
      return;
    }
    if (typeof docid !== "string") {
      doc._id = priv.generateUuid();
      docid = doc._id;
    }
    f.getDocumentTree = function () {
      var option = command.cloneOption();
      if (option.max_retry === 0) {
        option.max_retry = 3;
      }
      that.addJob(
        "get",
        priv.substorage,
        docid + priv.doctree_suffix,
        option,

        function (response) {

          doctree = response;
          f.postDocument("put");
        },
        function (err) {
          switch (err.status) {
          case 404:
            doctree = priv.createDocumentTree();
            f.postDocument("post");
            break;
          default:
            err.message = "Cannot get document revision tree";
            that.error(err);
            break;
          }
        }
      );
    };
    f.postDocument = function (doctree_update_method) {
      if (doc._revs) {
        revs_info = priv.updateDocumentTree(doctree, doc._revs);
      } else {
        revs_info = priv.postToDocumentTree(doctree, doc);
      }
      doc._id = docid + "." + revs_info[0].rev;
      delete doc._rev;
      delete doc._revs;
      that.addJob(
        "post",
        priv.substorage,
        doc,
        command.cloneOption(),
        function () {
          f.sendDocumentTree(doctree_update_method);
        },
        function (err) {
          switch (err.status) {
          case 409:
            // file already exists
            f.sendDocumentTree(doctree_update_method);
            break;
          default:
            err.message = "Cannot upload document";
            that.error(err);
            break;
          }
        }
      );
    };
    f.sendDocumentTree = function (method) {
      doctree._id = docid + priv.doctree_suffix;
      that.addJob(
        method,
        priv.substorage,
        doctree,
        command.cloneOption(),
        function () {
          that.success({
            "ok": true,
            "id": docid,
            "rev": revs_info[0].rev
          });
        },
        function (err) {
          // xxx do we try to delete the posted document ?
          err.message = "Cannot save document revision tree";
          that.error(err);
        }
      );
    };
    f.getDocumentTree();
  };

  /**
   * Update the document metadata and update a document tree.
   * Options:
   * - {boolean} keep_revision_history To keep the previous revisions
   *                                   (false by default) (NYI).
   * @method put
   * @param  {object} command The JIO command
   */
  that.put = function (command) {
    that.post(command);
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
    var f = {}, doctree, revs_info, prev_rev, option;
    option = command.cloneOption();
    if (option.max_retry === 0) {
      option.max_retry = 3;
    }
    prev_rev = command.getOption("rev");
    if (typeof prev_rev === "string") {
      if (!priv.checkRevisionFormat(prev_rev)) {
        that.error({
          "status": 31,
          "statusText": "Wrong Revision Format",
          "error": "wrong_revision_format",
          "message": "The document previous revision does not match " +
            "[0-9]+-[0-9a-zA-Z]+",
          "reason": "Previous revision is wrong"
        });
        return;
      }
    }
    f.getDocumentTree = function () {
      that.addJob(
        "get",
        priv.substorage,
        command.getDocId() + priv.doctree_suffix,
        option,
        function (response) {
          doctree = response;
          if (prev_rev === undefined) {
            revs_info = priv.getWinnerRevisionFromDocumentTree(doctree);
            if (revs_info.length > 0) {
              prev_rev = revs_info[0].rev;
            } else {
              that.error({
                "status": 404,
                "statusText": "Not Found",
                "error": "not_found",
                "message": "Cannot find the document",
                "reason": "Document is deleted"
              });
              return;
            }
          } else {
            revs_info = priv.getRevisionFromDocumentTree(doctree, prev_rev);
          }
          f.getDocument(command.getDocId() + "." + prev_rev,
            command.getAttachmentId());
        },
        function (err) {
          switch (err.status) {
          case 404:
            that.error(err);
            break;
          default:
            err.message = "Cannot get document revision tree";
            that.error(err);
            break;
          }
        }
      );
    };
    f.getDocument = function (docid, attmtid) {
      that.addJob(
        "get",
        priv.substorage,
        docid,
        option,
        function (response) {
          var attmt;
          if (typeof response !== "string") {
            if (attmtid !== undefined) {
              if (response._attachments !== undefined) {
                attmt = response._attachments[attmtid];
                if (attmt !== undefined) {
                  prev_rev = priv.getRevisionFromPosition(
                    revs_info,
                    attmt.revpos
                  );
                  f.getDocument(command.getDocId() + "." + prev_rev + "/" +
                    attmtid);
                  return;
                }
              }
              that.error({
                "status": 404,
                "statusText": "Not Found",
                "error": "not_found",
                "message": "Cannot find the attachment",
                "reason": "Attachment is missing"
              });
              return;
            }
            response._id = command.getDocId();
            response._rev = prev_rev;
            if (command.getOption("revs") === true) {
              response._revisions = priv.revsInfoToHistory(revs_info);
            }
            if (command.getOption("revs_info") === true) {
              response._revs_info = revs_info;
            }
            if (command.getOption("conflicts") === true) {
              response._conflicts = priv.getLeavesFromDocumentTree(
                doctree,
                prev_rev
              );
              if (response._conflicts.length === 0) {
                delete response._conflicts;
              }
            }
          }
          that.success(response);
        },
        function (err) {
          that.error(err);
        }
      );
    };
    if (command.getAttachmentId() && prev_rev !== undefined) {
      f.getDocument(command.getDocId() + "." + prev_rev +
        "/" + command.getAttachmentId());
    } else {
      f.getDocumentTree();
    }
  };

  /**
   * Remove document or attachment.
   * Options:
   * - {boolean} keep_revision_history To keep the previous revisions
   * @method remove
   * @param  {object} command The JIO command
   */
  that.remove = function (command) {
    var f = {}, del_rev, option, new_doc, revs_info;
    option = command.cloneOption();
    if (option.max_retry === 0) {
      option.max_retry = 3;
    }
    del_rev = command.getDoc()._rev;

    f.removeDocument = function (docid, doctree) {
      if (command.getOption("keep_revision_history") !== true) {
        if (command.getAttachmentId() === undefined) {
          // update tree
          revs_info = priv.postToDocumentTree(
            doctree,
            command.getDoc(),
            true
          );
          // remove revision
          that.addJob(
            "remove",
            priv.substorage,
            docid,
            option,
            function () {
              // put tree
              doctree._id = command.getDocId() + priv.doctree_suffix;
              that.addJob(
                "put",
                priv.substorage,
                doctree,
                command.cloneOption(),
                function () {
                  that.success({
                    "ok": true,
                    "id": command.getDocId(),
                    "rev": revs_info[0].rev
                  });
                },
                function () {
                  that.error({
                    "status": 409,
                    "statusText": "Conflict",
                    "error": "conflict",
                    "message": "Document update conflict.",
                    "reason": "Cannot update document tree"
                  });
                  return;
                }
              );
            },
            function () {
              that.error({
                "status": 404,
                "statusText": "Not Found",
                "error": "not_found",
                "message": "File not found",
                "reason": "Document was not found"
              });
              return;
            }
          );
        } else {
          // get previsous document
          that.addJob(
            "get",
            priv.substorage,
            command.getDocId() + "." + del_rev,
            option,
            function (response) {
              // update tree
              revs_info = priv.postToDocumentTree(doctree, command.getDoc());
              new_doc = response;
              delete new_doc._attachments;
              new_doc._id = new_doc._id + "." + revs_info[0].rev;

              // post new document version
              that.addJob(
                "post",
                priv.substorage,
                new_doc,
                command.cloneOption(),
                function () {
                  // put tree
                  doctree._id = command.getDocId() + priv.doctree_suffix;
                  that.addJob(
                    "put",
                    priv.substorage,
                    doctree,
                    command.cloneOption(),
                    function () {
                      that.success({
                        "ok": true,
                        "id": new_doc._id,
                        "rev": revs_info[0].rev
                      });
                    },
                    function (err) {
                      err.message =
                        "Cannot save document revision tree";
                      that.error(err);
                    }
                  );
                },
                function () {
                  that.error({
                    "status": 409,
                    "statusText": "Conflict",
                    "error": "conflict",
                    "message": "Document update conflict.",
                    "reason": "Cannot update document"
                  });
                  return;
                }
              );
            },
            function () {
              that.error({
                "status": 404,
                "statusText": "Not Found",
                "error": "not_found",
                "message": "File not found",
                "reason": "Document was not found"
              });
              return;
            }
          );
        }
      }
    };
    if (typeof del_rev === "string") {
      if (!priv.checkRevisionFormat(del_rev)) {
        that.error({
          "status": 31,
          "statusText": "Wrong Revision Format",
          "error": "wrong_revision_format",
          "message": "The document previous revision does not match " +
            "[0-9]+-[0-9a-zA-Z]+",
          "reason": "Previous revision is wrong"
        });
        return;
      }
    }

    // get doctree
    that.addJob(
      "get",
      priv.substorage,
      command.getDocId() + priv.doctree_suffix,
      option,
      function (response) {
        response._conflicts = priv.getLeavesFromDocumentTree(response);

        if (del_rev === undefined) {
          // no revision provided
          that.error({
            "status": 409,
            "statusText": "Conflict",
            "error": "conflict",
            "message": "Document update conflict.",
            "reason": "Cannot delete a document without revision"
          });
          return;
        }
        // revision provided
        if (priv.isRevisionALeaf(response, del_rev) === true) {
          if (typeof command.getAttachmentId() === "string") {
            f.removeDocument(command.getDocId() + "." + del_rev +
              "/" + command.getAttachmentId(), response);
          } else {
            f.removeDocument(command.getDocId() + "." + del_rev,
              response);
          }
        } else {
          that.error({
            "status": 409,
            "statusText": "Conflict",
            "error": "conflict",
            "message": "Document update conflict.",
            "reason": "Trying to remove non-latest revision"
          });
          return;
        }
      },
      function () {
        that.error({
          "status": 404,
          "statusText": "Not Found",
          "error": "not_found",
          "message": "Document tree not found, please checkdocument ID",
          "reason": "Incorrect document ID"
        });
        return;
      }
    );
  };

  /**
   * Get all documents
   * @method allDocs
   * @param  {object} command The JIO command
   */
  that.allDocs = function () {
    setTimeout(function () {
      that.error({
        "status": 405,
        "statusText": "Method Not Allowed",
        "error": "method_not_allowed",
        "message": "Your are not allowed to use this command",
        "reason": "LocalStorage forbids AllDocs command executions"
      });
    });
  };

  return that;
});
