/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global jIO: true */
jIO.addStorageType('replicate', function (spec, my) {

  var that, cloned_option, priv = {},
    super_serialized = that.serialized;

  spec = spec || {};
  that = my.basicStorage(spec, my);

  priv.return_value_array = [];
  priv.storagelist = spec.storagelist || [];
  priv.nb_storage = priv.storagelist.length;

  that.serialized = function () {
    var o = super_serialized();
    o.storagelist = priv.storagelist;
    return o;
  };

  that.validateState = function () {
    if (priv.storagelist.length === 0) {
      return 'Need at least one parameter: "storagelist" ' +
        'containing at least one storage.';
    }
    return '';
  };

  priv.isTheLast = function (error_array) {
    return (error_array.length === priv.nb_storage);
  };

  priv.doJob = function (command, errormessage, nodocid) {
    var done = false,
      error_array = [],
      i,
      error = function (err) {
        if (!done) {
          error_array.push(err);
          if (priv.isTheLast(error_array)) {
            that.error({
              status: 207,
              statusText: 'Multi-Status',
              error: 'multi_status',
              message: 'All ' + errormessage + (!nodocid ? ' "' +
                command.getDocId() + '"' : ' ') + ' requests have failed.',
              reason: 'requests fail',
              array: error_array
            });
          }
        }
      },
      success = function (val) {
        if (!done) {
          done = true;
          that.success(val);
        }
      };
    for (i = 0; i < priv.nb_storage; i += 1) {
      cloned_option = command.cloneOption();
      that.addJob(command.getLabel(), priv.storagelist[i],
        command.cloneDoc(), cloned_option, success, error);
    }
  };

  that.post = function (command) {
    priv.doJob(command, 'post');
    that.end();
  };

  /**
   * Save a document in several storages.
   * @method put
   */
  that.put = function (command) {
    priv.doJob(command, 'put');
    that.end();
  };

  /**
   * Load a document from several storages, and send the first retreived
   * document.
   * @method get
   */
  that.get = function (command) {
    priv.doJob(command, 'get');
    that.end();
  };

  /**
   * Get a document list from several storages, and returns the first
   * retreived document list.
   * @method allDocs
   */
  that.allDocs = function (command) {
    priv.doJob(command, 'allDocs', true);
    that.end();
  };

  /**
   * Remove a document from several storages.
   * @method remove
   */
  that.remove = function (command) {
    priv.doJob(command, 'remove');
    that.end();
  };

  return that;
});
