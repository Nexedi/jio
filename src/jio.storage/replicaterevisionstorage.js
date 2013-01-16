/*jslint indent: 2, maxlen: 80, nomen: true */
/*global jIO: true */
/**
 * JIO Replicate Revision Storage.
 * It manages storages that manage revisions and conflicts.
 * Description:
 * {
 *     "type": "replicaterevision",
 *     "storage_list": [
 *         <sub storage description>,
 *         ...
 *     ]
 * }
 */
jIO.addStorageType('replicaterevision', function (spec, my) {
  "use strict";
  var that, priv = {};
  spec = spec || {};
  that = my.basicStorage(spec, my);

  priv.storage_list_key = "storage_list";
  priv.storage_list = spec[priv.storage_list_key];
  my.env = my.env || spec.env || {};

  that.specToStore = function () {
    var o = {};
    o[priv.storage_list_key] = priv.storage_list;
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
   * Generates a hash code of a string
   * @method hashCode
   * @return {string} The next revision
   */
  priv.getNextRevision = function (docid) {
    my.env[docid].id += 1;
    return my.env[docid].id.toString();
  };

  /**
   * Checks a revision format
   * @method checkRevisionFormat
   * @param  {string} revision The revision string
   * @return {boolean} True if ok, else false
   */
  priv.checkRevisionFormat = function (revision) {
    return (/^[0-9a-zA-Z_]+$/.test(revision));
  };

  /**
   * Initalize document environment object
   * @method initEnv
   * @param  {string} docid The document id
   * @return {object} The reference to the environment
   */
  priv.initEnv = function (docid) {
    my.env[docid] = {
      "id": 0,
      "distant_revisions": {},
      "my_revisions": {},
      "last_revisions": []
    };
    return my.env[docid];
  };

  /**
   * Post the document metadata to all sub storages
   * @method post
   * @param  {object} command The JIO command
   */
  that.post = function (command) {
    var functions = {}, doc_env, revs_info, doc, my_rev;
    functions.begin = function () {
      doc = command.cloneDoc();

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
      if (typeof doc._id !== "string") {
        doc._id = priv.generateUuid();
      }
      if (priv.update_doctree_allowed === undefined) {
        priv.update_doctree_allowed = true;
      }
      doc_env = my.env[doc._id];
      if (doc_env && doc_env.id) {
        if (!priv.update_doctree_allowed) {
          that.error({
            "status": 409,
            "statusText": "Conflict",
            "error": "conflict",
            "message": "Cannot update a document",
            "reason": "Document update conflict"
          });
          return;
        }
      } else {
        doc_env = priv.initEnv(doc._id);
      }
      my_rev = priv.getNextRevision(doc._id);
      functions.sendDocument();
    };
    functions.sendDocumentIndex = function (method, index, callback) {
      var wrapped_callback_success, wrapped_callback_error;
      wrapped_callback_success = function (response) {
        callback(method, index, undefined, response);
      };
      wrapped_callback_error = function (err) {
        callback(method, index, err, undefined);
      };
      if (typeof doc._rev === "string" &&
          doc_env.my_revisions[doc._rev] !== undefined) {
        doc._rev = doc_env.my_revisions[doc._rev][index];
      }
      that.addJob(
        method,
        priv.storage_list[index],
        doc,
        command.cloneOption(),
        wrapped_callback_success,
        wrapped_callback_error
      );
    };
    functions.sendDocument = function () {
      var i;
      doc_env.my_revisions[my_rev] = doc_env.my_revisions[my_rev] || [];
      doc_env.my_revisions[my_rev].length = priv.storage_list.length;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        functions.sendDocumentIndex(
          doc_env.last_revisions[i] === "unique_" + i ? "put" : "post",
          i,
          functions.checkSendResult
        );
      }
    };
    functions.checkSendResult = function (method, index, err, response) {
      if (err) {
        if (err.status === 409) {
          if (method !== "put") {
            functions.sendDocumentIndex(
              "put",
              index,
              functions.checkSendResult
            );
            return;
          }
        }
        functions.updateEnv(index, undefined);
        functions.error(err);
        return;
      }
      // success
      functions.updateEnv(index, response.rev || "unique_" + index);
      functions.success({"ok": true, "id": doc._id, "rev": my_rev});
    };
    functions.updateEnv = function (index, revision) {
      doc_env.last_revisions[index] = revision;
      doc_env.my_revisions[my_rev][index] = revision;
      doc_env.distant_revisions[revision] = my_rev;
    };
    functions.success = function (response) {
      if (!functions.success_called_once) {
        functions.success_called_once = true;
        that.success(response);
      }
    };
    functions.error_count = 0;
    functions.error = function (err) {
      functions.error_count += 1;
      if (functions.error_count === priv.storage_list.length) {
        that.error(err);
      }
    };
    functions.begin();
  };

  return that;
});
