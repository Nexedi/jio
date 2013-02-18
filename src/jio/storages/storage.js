/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global command: true, jobManager: true, job: true */
var storage = function (spec, my) {
  var that = {}, priv = {};
  spec = spec || {};
  my = my || {};
  // Attributes //
  priv.type = spec.type || '';

  // Methods //
  Object.defineProperty(that, "getType", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function () {
      return priv.type;
    }
  });

  /**
   * Execute the command on this storage.
   * @method execute
   * @param  {object} command The command
   */
  that.execute = function (command) {
    that.success = command.success;
    that.error   = command.error;
    that.retry   = command.retry;
    that.end     = command.end;
    if (that.validate(command)) {
      command.executeOn(that);
    }
  };

  /**
   * Override this function to validate specifications.
   * @method isValid
   * @return {boolean} true if ok, else false.
   */
  that.isValid = function () {
    return true;
  };

  that.validate = function () {
    var mess = that.validateState();
    if (mess) {
      that.error({
        "status": 0,
        "statusText": "Invalid Storage",
        "error": "invalid_storage",
        "message": mess,
        "reason": mess
      });
      return false;
    }
    return true;
  };

  /**
   * Returns a serialized version of this storage.
   * @method serialized
   * @return {object} The serialized storage.
   */
  that.serialized = function () {
    var o = that.specToStore() || {};
    o.type = that.getType();
    return o;
  };

  /**
   * Returns an object containing spec to store on localStorage, in order to
   * be restored later if something wrong happen.
   * Override this method!
   * @method specToStore
   * @return {object} The spec to store
   */
  that.specToStore = function () {
    return {};
  };

  /**
   * Validate the storage state. It returns a empty string all is ok.
   * @method validateState
   * @return {string} empty: ok, else error message.
   */
  that.validateState = function () {
    return '';
  };

  that.post = function () {
    setTimeout(function () {
      that.error({
        "status": 0,
        "statusText": "Not Implemented",
        "error": "not_implemented",
        "message": "\"Post\" command is not implemented",
        "reason": "Command not implemented"
      });
    });
  };

  that.put = function () {
    setTimeout(function () {
      that.error({
        "status": 0,
        "statusText": "Not Implemented",
        "error": "not_implemented",
        "message": "\"Put\" command is not implemented",
        "reason": "Command not implemented"
      });
    });
  };

  that.putAttachment = function () {
    setTimeout(function () {
      that.error({
        "status": 0,
        "statusText": "Not Implemented",
        "error": "not_implemented",
        "message": "\"PutAttachment\" command is not implemented",
        "reason": "Command not implemented"
      });
    });
  };

  that.get = function () {
    setTimeout(function () {
      that.error({
        "status": 0,
        "statusText": "Not Implemented",
        "error": "not_implemented",
        "message": "\"Get\" command is not implemented",
        "reason": "Command not implemented"
      });
    });
  };

  that.allDocs = function () {
    setTimeout(function () {
      that.error({
        "status": 0,
        "statusText": "Not Implemented",
        "error": "not_implemented",
        "message": "\"AllDocs\" command is not implemented",
        "reason": "Command not implemented"
      });
    });
  };

  that.remove = function () {
    setTimeout(function () {
      that.error({
        "status": 0,
        "statusText": "Not Implemented",
        "error": "not_implemented",
        "message": "\"Remove\" command is not implemented",
        "reason": "Command not implemented"
      });
    });
  };

  that.success = function () {};
  that.retry   = function () {};
  that.error   = function () {};
  that.end     = function () {};  // terminate the current job.

  priv.newCommand = function (method, spec) {
    var o = spec || {};
    o.label = method;
    return command(o, my);
  };

  priv.storage = my.storage;
  delete my.storage;

  that.addJob = function (method, storage_spec, doc, option, success, error) {
    var command_opt = {
      doc: doc,
      options: option,
      callbacks: {success: success, error: error}
    };
    jobManager.addJob(job({
      storage: priv.storage(storage_spec || {}),
      command: priv.newCommand(method, command_opt)
    }, my));
  };

  return that;
};
