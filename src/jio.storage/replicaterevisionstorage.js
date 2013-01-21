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

  priv.updateEnv = function (doc_env, doc_env_rev, index, doc_rev) {
    doc_env.last_revisions[index] = doc_rev;
    if (doc_rev !== undefined) {
      if (!doc_env.my_revisions[doc_env_rev]) {
        doc_env.my_revisions[doc_env_rev] = [];
        doc_env.my_revisions[doc_env_rev].length = priv.storage_list.length;
      }
      doc_env.my_revisions[doc_env_rev][index] = doc_rev;
      doc_env.distant_revisions[doc_rev] = doc_env_rev;
    }
  };

  /**
   * Clones an object
   * @method cloneObject
   * @param  {object} object The object to clone
   * @return {object} The cloned object
   */
  priv.clone = function (object) {
    var tmp = JSON.stringify(object);
    if (tmp === undefined) {
      return undefined;
    }
    return JSON.parse(tmp);
  };

  priv.send = function (method, index, doc, option, callback) {
    var wrapped_callback_success, wrapped_callback_error;
    wrapped_callback_success = function (response) {
      callback(method, index, undefined, response);
    };
    wrapped_callback_error = function (err) {
      callback(method, index, err, undefined);
    };
    that.addJob(
      method,
      priv.storage_list[index],
      doc,
      option,
      wrapped_callback_success,
      wrapped_callback_error
    );
  };

  priv.sendToAll = function (method, doc, option, callback) {
    var i;
    for (i = 0; i < priv.storage_list.length; i += 1) {
      priv.send(method, i, doc, option, callback);
    }
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
      if (priv.post_allowed === undefined) {
        priv.post_allowed = true;
      }
      doc_env = my.env[doc._id];
      if (doc_env && doc_env.id) {
      } else {
        doc_env = priv.initEnv(doc._id);
      }
      if (!priv.post_allowed && !doc_env.my_revisions[doc._rev]) {
        that.error({
          "status": 409,
          "statusText": "Conflict",
          "error": "conflict",
          "message": "Cannot update a document",
          "reason": "Document update conflict"
        });
        return;
      }
      my_rev = priv.getNextRevision(doc._id);
      functions.sendDocument();
    };
    functions.sendDocument = function () {
      var i;
      for (i = 0; i < priv.storage_list.length; i += 1) {
        var cloned_doc = priv.clone(doc);
        if (typeof cloned_doc._rev === "string" &&
            doc_env.my_revisions[cloned_doc._rev] !== undefined) {
          cloned_doc._rev = doc_env.my_revisions[cloned_doc._rev][i];
        }
        priv.send(
          doc_env.last_revisions[i] === "unique_" + i ||
            cloned_doc._rev !== undefined ? "put" : "post",
          i,
          cloned_doc,
          command.cloneOption(),
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
        priv.updateEnv(doc_env, my_rev, index, undefined);
        functions.error(err);
        return;
      }
      // success
      priv.updateEnv(
        doc_env,
        my_rev,
        index,
        response.rev || "unique_" + index
      );
      functions.success({"ok": true, "id": doc._id, "rev": my_rev});
    };
    functions.success = function (response) {
      // can be called once
      that.success(response);
      functions.success = function () {};
    };
    functions.error_count = 0;
    functions.error = function (err) {
      functions.error_count += 1;
      if (functions.error_count === priv.storage_list.length) {
        that.error(err);
        functions.error = function () {};
      }
    };
    functions.begin();
  };

  /**
   * Get the document metadata from all sub storages, get the fastest.
   * @method get
   * @param  {object} command The JIO command
   */
  that.get = function (command) {
    var functions = {}, doc_env, docid, my_rev, waiting_response;
    functions.begin = function () {
      docid = command.cloneDocId();

      doc_env = my.env[doc._id];
      if (!doc_env || !doc_env.id) {
        // document environment is not set
        doc_env = priv.initEnv(doc._id);
      }
      my_rev = priv.getNextRevision(doc._id);
      priv.sendToAll("get", docid, command.cloneOption(), functions.callback);
    };
    functions.callback = function (method, index, err, response) {
      if (err) {
        priv.updateEnv(doc_env, my_rev, index, undefined);
        functions.error(err);
        return;
      }
      priv.updateEnv(
        doc_env,
        my_rev,
        index,
        response._rev || "unique_" + index
      );
      response._rev = my_rev;
      functions.success(response);
    };
    functions.success = function (response) {
      that.success(response);
      functions.success = function () {};
    };
    functions.error_count = 0;
    functions.error = function (err) {
      functions.error_count += 1;
      if (functions.error_count === priv.storage_list.length) {
        that.error(err);
        functions.error = function () {};
      }
    };
    functions.begin();
  };

  return that;
});
