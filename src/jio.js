/*global window, RSVP, Blob, XMLHttpRequest, QueryFactory, Query, FileReader */
(function (window, RSVP, Blob, QueryFactory, Query,
           FileReader) {
  "use strict";

  var util = {},
    jIO;

  function jIOError(message, status_code) {
    if ((message !== undefined) && (typeof message !== "string")) {
      throw new TypeError('You must pass a string.');
    }
    this.message = message || "Default Message";
    this.status_code = status_code || 500;
  }
  jIOError.prototype = new Error();
  jIOError.prototype.constructor = jIOError;
  util.jIOError = jIOError;

  /**
   * Send request with XHR and return a promise. xhr.onload: The promise is
   * resolved when the status code is lower than 400 with the xhr object as
   * first parameter. xhr.onerror: reject with xhr object as first
   * parameter. xhr.onprogress: notifies the xhr object.
   *
   * @param  {Object} param The parameters
   * @param  {String} [param.type="GET"] The request method
   * @param  {String} [param.dataType=""] The data type to retrieve
   * @param  {String} param.url The url
   * @param  {Any} [param.data] The data to send
   * @param  {Function} [param.beforeSend] A function called just before the
   *    send request. The first parameter of this function is the XHR object.
   * @return {Promise} The promise
   */
  function ajax(param) {
    var xhr = new XMLHttpRequest();
    return new RSVP.Promise(function (resolve, reject, notify) {
      var k;
      xhr.open(param.type || "GET", param.url, true);
      xhr.responseType = param.dataType || "";
      if (typeof param.headers === 'object' && param.headers !== null) {
        for (k in param.headers) {
          if (param.headers.hasOwnProperty(k)) {
            xhr.setRequestHeader(k, param.headers[k]);
          }
        }
      }
      xhr.addEventListener("load", function (e) {
        if (e.target.status >= 400) {
          return reject(e);
        }
        resolve(e);
      });
      xhr.addEventListener("error", reject);
      xhr.addEventListener("progress", notify);
      if (typeof param.xhrFields === 'object' && param.xhrFields !== null) {
        for (k in param.xhrFields) {
          if (param.xhrFields.hasOwnProperty(k)) {
            xhr[k] = param.xhrFields[k];
          }
        }
      }
      if (typeof param.beforeSend === 'function') {
        param.beforeSend(xhr);
      }
      xhr.send(param.data);
    }, function () {
      xhr.abort();
    });
  }
  util.ajax = ajax;

  /**
   * Clones all native object in deep. Managed types: Object, Array, String,
   * Number, Boolean, Function, null.
   *
   * It can also clone object which are serializable, like Date.
   *
   * To make a class serializable, you need to implement the `toJSON` function
   * which returns a JSON representation of the object. The returned value is
   * used as first parameter of the object constructor.
   *
   * @param  {A} object The object to clone
   * @return {A} The cloned object
   */
  function deepClone(object) {
    var i, cloned;
    if (Array.isArray(object)) {
      cloned = [];
      for (i = 0; i < object.length; i += 1) {
        cloned[i] = deepClone(object[i]);
      }
      return cloned;
    }
    if (object === null) {
      return null;
    }
    if (typeof object === 'object') {
      if (Object.getPrototypeOf(object) === Object.prototype) {
        cloned = {};
        for (i in object) {
          if (object.hasOwnProperty(i)) {
            cloned[i] = deepClone(object[i]);
          }
        }
        return cloned;
      }
      if (object instanceof Date) {
        // XXX this block is to enable phantomjs and browsers compatibility with
        // Date.prototype.toJSON when it is an invalid date. In phantomjs, it
        // returns `"Invalid Date"` but in browsers it returns `null`. In
        // browsers, giving `null` as parameter to `new Date()` doesn't return
        // an invalid date.

        // Cloning a date with `return new Date(object)` has problems on
        // Firefox.
        // I don't know why...  (Tested on Firefox 23)

        if (isFinite(object.getTime())) {
          return new Date(object.toJSON());
        }
        return new Date("Invalid Date");
      }
      // clone serializable objects
      if (typeof object.toJSON === 'function') {
        return new (Object.getPrototypeOf(object).constructor)(object.toJSON());
      }
      // cannot clone
      return object;
    }
    return object;
  }
  util.deepClone = deepClone;



  function readBlobAsText(blob, encoding) {
    var fr = new FileReader();
    return new RSVP.Promise(function (resolve, reject, notify) {
      fr.addEventListener("load", resolve);
      fr.addEventListener("error", reject);
      fr.addEventListener("progress", notify);
      fr.readAsText(blob, encoding);
    }, function () {
      fr.abort();
    });
  }
  util.readBlobAsText = readBlobAsText;

  function readBlobAsArrayBuffer(blob) {
    var fr = new FileReader();
    return new RSVP.Promise(function (resolve, reject, notify) {
      fr.addEventListener("load", resolve);
      fr.addEventListener("error", reject);
      fr.addEventListener("progress", notify);
      fr.readAsArrayBuffer(blob);
    }, function () {
      fr.abort();
    });
  }
  util.readBlobAsArrayBuffer = readBlobAsArrayBuffer;

  function readBlobAsDataURL(blob) {
    var fr = new FileReader();
    return new RSVP.Promise(function (resolve, reject, notify) {
      fr.addEventListener("load", resolve);
      fr.addEventListener("error", reject);
      fr.addEventListener("progress", notify);
      fr.readAsDataURL(blob);
    }, function () {
      fr.abort();
    });
  }
  util.readBlobAsDataURL = readBlobAsDataURL;

  // tools
  function checkId(param, storage, method_name) {
    if (typeof param._id !== 'string' || param._id === '') {
      throw new jIO.util.jIOError(
        "Document id must be a non empty string on '" + storage.__type +
          "." + method_name + "'.",
        400
      );
    }
  }

  function checkAttachmentId(param, storage, method_name) {
    if (typeof param._attachment !== 'string' || param._attachment === '') {
      throw new jIO.util.jIOError(
        "Attachment id must be a non empty string on '" + storage.__type +
          "." + method_name + "'.",
        400
      );
    }
  }

  function declareMethod(klass, name, precondition_function, post_function) {
    klass.prototype[name] = function () {
      var argument_list = arguments,
        context = this;

      return new RSVP.Queue()
        .push(function () {
          if (precondition_function !== undefined) {
            return precondition_function.apply(
              context.__storage,
              [argument_list[0], context, name]
            );
          }
        })
        .push(function () {
          var storage_method = context.__storage[name];
          if (storage_method === undefined) {
            throw new jIO.util.jIOError(
              "Capacity '" + name + "' is not implemented on '" +
                context.__type + "'",
              501
            );
          }
          return storage_method.apply(
            context.__storage,
            argument_list
          );
        })
        .push(function (result) {
          if (post_function !== undefined) {
            return post_function.call(
              context,
              argument_list,
              result
            );
          }
          return result;
        });
    };
    // Allow chain
    return this;
  }




  /////////////////////////////////////////////////////////////////
  // jIO Storage Proxy
  /////////////////////////////////////////////////////////////////
  function JioProxyStorage(type, storage) {
    if (!(this instanceof JioProxyStorage)) {
      return new JioProxyStorage();
    }
    this.__type = type;
    this.__storage = storage;
  }

  declareMethod(JioProxyStorage, "put", checkId, function (argument_list) {
    return argument_list[0]._id;
  });
  declareMethod(JioProxyStorage, "get", checkId,
                function (argument_list, result) {
      // XXX Drop all _ properties
      // Put _id properties to the result
      result._id = argument_list[0]._id;
      return result;
    });
  declareMethod(JioProxyStorage, "remove", checkId, function (argument_list) {
    return argument_list[0]._id;
  });

  JioProxyStorage.prototype.post = function (param) {
    var context = this;
    return new RSVP.Queue()
      .push(function () {
        if (param._id === undefined) {
          var storage_method = context.__storage.post;
          if (storage_method === undefined) {
            throw new jIO.util.jIOError(
              "Capacity 'post' is not implemented on '" + context.__type + "'",
              501
            );
          }
          return context.__storage.post(param);
        }
        return context.put(param);
      });
  };

  declareMethod(JioProxyStorage, 'putAttachment', function (param, storage,
                                                            method_name) {
    checkId(param, storage, method_name);
    checkAttachmentId(param, storage, method_name);

    if (!(param._blob instanceof Blob) &&
        typeof param._data === 'string') {
      param._blob = new Blob([param._data], {
        "type": param._content_type || param._mimetype ||
                "text/plain;charset=utf-8"
      });
      delete param._data;
      delete param._mimetype;
      delete param._content_type;
    } else if (param._blob instanceof Blob) {
      delete param._data;
      delete param._mimetype;
      delete param._content_type;
    } else if (param._data instanceof Blob) {
      param._blob = param._data;
      delete param._data;
      delete param._mimetype;
      delete param._content_type;
    } else {
      throw new jIO.util.jIOError(
        'Attachment information must be like {"_id": document id, ' +
          '"_attachment": attachment name, "_data": string, ["_mimetype": ' +
          'content type]} or {"_id": document id, "_attachment": ' +
          'attachment name, "_blob": Blob}',
        400
      );
    }
  });

  declareMethod(JioProxyStorage, 'removeAttachment', function (param, storage,
                                                               method_name) {
    checkId(param, storage, method_name);
    checkAttachmentId(param, storage, method_name);
  });

  declareMethod(JioProxyStorage, 'getAttachment', function (param, storage,
                                                            method_name) {
//     if (param.storage_spec.type !== "indexeddb" &&
//         param.storage_spec.type !== "dav" &&
//         (param.kwargs._start !== undefined
//          || param.kwargs._end !== undefined)) {
//       restCommandRejecter(param, [
//         'bad_request',
//         'unsupport',
//         '_start, _end not support'
//       ]);
//       return false;
//     }
    checkId(param, storage, method_name);
    checkAttachmentId(param, storage, method_name);
  }, function (argument_list, result) {
    if (!(result instanceof Blob)) {
      throw new jIO.util.jIOError(
        "'getAttachment' (" + argument_list[0]._id + " , " +
          argument_list[0]._attachment + ") on '" + this.__type +
          "' does not return a Blob.",
        501
      );
    }
    return result;
  });

  JioProxyStorage.prototype.buildQuery = function () {
    var storage_method = this.__storage.buildQuery,
      context = this,
      argument_list = arguments;
    if (storage_method === undefined) {
      throw new jIO.util.jIOError(
        "Capacity 'buildQuery' is not implemented on '" + this.__type + "'",
        501
      );
    }
    return new RSVP.Queue()
      .push(function () {
        return storage_method.apply(
          context.__storage,
          argument_list
        );
      });
  };

  JioProxyStorage.prototype.hasCapacity = function (name) {
    var storage_method = this.__storage.hasCapacity;
    if ((storage_method === undefined) ||
        !storage_method.apply(this.__storage, arguments)) {
      throw new jIO.util.jIOError(
        "Capacity '" + name + "' is not implemented on '" + this.__type + "'",
        501
      );
    }
    return true;
  };

  JioProxyStorage.prototype.allDocs = function (options) {
    var context = this;
    if (options === undefined) {
      options = {};
    }
    return new RSVP.Queue()
      .push(function () {
        if (context.hasCapacity("list") &&
            ((options.query === undefined) || context.hasCapacity("query")) &&
            ((options.sort_on === undefined) || context.hasCapacity("sort")) &&
            ((options.select_list === undefined) ||
             context.hasCapacity("select")) &&
            ((options.include_docs === undefined) ||
             context.hasCapacity("include")) &&
            ((options.limit === undefined) || context.hasCapacity("limit"))) {
          return context.buildQuery(options);
        }
      })
      .push(function (result) {
        return {
          data: {
            rows: result,
            total_rows: result.length
          }
        };
      });
  };

  /////////////////////////////////////////////////////////////////
  // Storage builder
  /////////////////////////////////////////////////////////////////
  function JioBuilder() {
    if (!(this instanceof JioBuilder)) {
      return new JioBuilder();
    }
    this.__storage_types = {};
  }

  JioBuilder.prototype.createJIO = function (storage_spec, util) {

    if (typeof storage_spec.type !== 'string') {
      throw new TypeError("Invalid storage description");
    }
    if (!this.__storage_types[storage_spec.type]) {
      throw new TypeError("Unknown storage '" + storage_spec.type + "'");
    }

    return new JioProxyStorage(
      storage_spec.type,
      new this.__storage_types[storage_spec.type](storage_spec, util)
    );

  };

  JioBuilder.prototype.addStorage = function (type, Constructor) {
    if (typeof type !== 'string') {
      throw new TypeError(
        "jIO.addStorage(): Argument 1 is not of type 'string'"
      );
    }
    if (typeof Constructor !== 'function') {
      throw new TypeError("jIO.addStorage(): " +
                          "Argument 2 is not of type 'function'");
    }
    if (this.__storage_types[type] !== undefined) {
      throw new TypeError("jIO.addStorage(): Storage type already exists");
    }
    this.__storage_types[type] = Constructor;
  };

  JioBuilder.prototype.util = util;
  JioBuilder.prototype.QueryFactory = QueryFactory;
  JioBuilder.prototype.Query = Query;

  /////////////////////////////////////////////////////////////////
  // global
  /////////////////////////////////////////////////////////////////
  jIO = new JioBuilder();
  window.jIO = jIO;

}(window, RSVP, Blob, QueryFactory, Query, FileReader));
