/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global postCommand: true, putCommand: true, getCommand: true,
         removeCommand: true, allDocsCommand: true,
         putAttachmentCommand: true, failStatus: true, doneStatus: true,
         hex_md5: true */
var command = function (spec, my) {
  var that = {},
    priv = {};

  spec = spec || {};
  my = my || {};

  priv.commandlist = {
    'post': postCommand,
    'put': putCommand,
    'get': getCommand,
    'remove': removeCommand,
    'allDocs': allDocsCommand,
    'putAttachment': putAttachmentCommand
  };
  // creates the good command thanks to his label
  if (spec.label && priv.commandlist[spec.label]) {
    priv.label = spec.label;
    delete spec.label;
    return priv.commandlist[priv.label](spec, my);
  }

  priv.tried = 0;
  priv.doc = spec.doc || {};
  if (typeof priv.doc !== "object") {
    priv.doc = {
      "_id": priv.doc.toString()
    };
  }
  priv.docid = spec.docid || priv.doc._id;
  priv.option = spec.options || {};
  priv.callbacks = spec.callbacks || {};
  priv.success = priv.callbacks.success || function () {};
  priv.error = priv.callbacks.error || function () {};
  priv.retry = function () {
    that.error({
      status: 13,
      statusText: 'Fail Retry',
      error: 'fail_retry',
      message: 'Impossible to retry.',
      reason: 'Impossible to retry.'
    });
  };
  priv.end = function () {};
  priv.on_going = false;

  // Methods //
  /**
   * Returns a serialized version of this command.
   * @method serialized
   * @return {object} The serialized command.
   */
  that.serialized = function () {
    var o = {};
    o.label = that.getLabel();
    o.tried = priv.tried;
    o.doc = that.cloneDoc();
    o.option = that.cloneOption();
    return o;
  };

  /**
   * Returns the label of the command.
   * @method getLabel
   * @return {string} The label.
   */
  that.getLabel = function () {
    return 'command';
  };

  /**
   * Gets the document id
   * @method getDocId
   * @return {string} The document id
   */
  that.getDocId = function () {
    if (typeof priv.docid !== "string") {
      return undefined;
    }
    return priv.docid.split('/')[0];
  };

  /**
   * Gets the attachment id
   * @method getAttachmentId
   * @return {string} The attachment id
   */
  that.getAttachmentId = function () {
    if (typeof priv.docid !== "string") {
      return undefined;
    }
    return priv.docid.split('/')[1];
  };

  /**
   * Returns the label of the command.
   * @method getDoc
   * @return {object} The document.
   */
  that.getDoc = function () {
    return priv.doc;
  };

  /**
   * Returns the data of the attachment
   * @method getAttachmentData
   * @return {string} The data
   */
  that.getAttachmentData = function () {
    return priv.doc._data || "";
  };

  /**
   * Returns the data length of the attachment
   * @method getAttachmentLength
   * @return {number} The length
   */
  that.getAttachmentLength = function () {
    return (priv.doc._data || "").length;
  };

  /**
   * Returns the mimetype of the attachment
   * @method getAttachmentMimeType
   * @return {string} The mimetype
   */
  that.getAttachmentMimeType = function () {
    return priv.doc._mimetype;
  };

  /**
   * Generate the md5sum of the attachment data
   * @method md5SumAttachmentData
   * @return {string} The md5sum
   */
  that.md5SumAttachmentData = function () {
    return hex_md5(priv.doc._data || "");
  };

  /**
   * Returns an information about the document.
   * @method getDocInfo
   * @param  {string} infoname The info name.
   * @return The info value.
   */
  that.getDocInfo = function (infoname) {
    return priv.doc[infoname];
  };

  /**
   * Returns the value of an option.
   * @method getOption
   * @param  {string} optionname The option name.
   * @return The option value.
   */
  that.getOption = function (optionname) {
    return priv.option[optionname];
  };

  /**
   * Validates the storage.
   * @param  {object} storage The storage.
   */
  that.validate = function (storage) {
    if (typeof priv.docid === "string" &&
        !priv.docid.match("^[^\/]+([\/][^\/]+)?$")) {
      that.error({
        status: 21,
        statusText: 'Invalid Document Id',
        error: 'invalid_document_id',
        message: 'The document id must be like "abc" or "abc/def".',
        reason: 'The document id is no like "abc" or "abc/def"'
      });
      return false;
    }
    if (!that.validateState()) {
      return false;
    }
    return storage.validate();
  };

  /*
   * Extend this function
   */
  that.validateState = function () {
    return true;
  };

    /**
   * Check if the command can be retried.
   * @method canBeRetried
   * @return {boolean} The result
   */
  that.canBeRetried = function () {
    return (priv.option.max_retry === undefined ||
      priv.option.max_retry === 0 ||
        priv.tried < priv.option.max_retry);
  };

  /**
   * Gets the number time the command has been tried.
   * @method getTried
   * @return {number} The number of time the command has been tried
   */
  that.getTried = function () {
    return priv.tried;
  };

  /**
   * Delegate actual excecution the storage.
   * @param {object} storage The storage.
   */
  that.execute = function (storage) {
    if (!priv.on_going) {
      if (that.validate(storage)) {
        priv.tried += 1;
        priv.on_going = true;
        storage.execute(that);
      }
    }
  };
  /**
   * Execute the good method from the storage.
   * Override this function.
   * @method executeOn
   * @param  {object} storage The storage.
   */
  that.executeOn = function (storage) {};
  that.success = function (return_value) {
    priv.on_going = false;
    priv.success(return_value);
    priv.end(doneStatus());
  };
  that.retry = function (return_error) {
    priv.on_going = false;
    if (that.canBeRetried()) {
      priv.retry();
    } else {
      that.error(return_error);
    }
  };
  that.error = function (return_error) {
    priv.on_going = false;
    priv.error(return_error);
    priv.end(failStatus());
  };
  that.end = function () {
    priv.end(doneStatus());
  };
  that.onSuccessDo = function (fun) {
    if (fun) {
      priv.success = fun;
    } else {
      return priv.success;
    }
  };
  that.onErrorDo = function (fun) {
    if (fun) {
      priv.error = fun;
    } else {
      return priv.error;
    }
  };
  that.onEndDo = function (fun) {
    priv.end = fun;
  };
  that.onRetryDo = function (fun) {
    priv.retry = fun;
  };
  /**
   * Is the command can be restored by another JIO : yes.
   * @method canBeRestored
   * @return {boolean} true
   */
  that.canBeRestored = function () {
    return true;
  };
  /**
   * Clones the command and returns it.
   * @method clone
   * @return {object} The cloned command.
   */
  that.clone = function () {
    return command(that.serialized(), my);
  };
  /**
   * Clones the command options and returns the clone version.
   * @method cloneOption
   * @return {object} The clone of the command options.
   */
  that.cloneOption = function () {
    return JSON.parse(JSON.stringify(priv.option));
  };
  /**
   * Clones the document and returns the clone version.
   * @method cloneDoc
   * @return {object} The clone of the document.
   */
  that.cloneDoc = function () {
    return JSON.parse(JSON.stringify(priv.doc));
  };
  return that;
};
