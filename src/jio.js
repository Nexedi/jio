/*global window, RSVP, Blob, XMLHttpRequest, QueryFactory, Query */
/*jslint maxlen: 200*/
(function (window, RSVP, Blob, QueryFactory, Query) {
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
   * resolved when the status code is lower than 400 with the xhr object as first
   * parameter. xhr.onerror: reject with xhr object as first
   * parameter. xhr.onprogress: notifies the xhr object.
   *
   * @param  {Object} param The parameters
   * @param  {String} [param.type="GET"] The request method
   * @param  {String} [param.dataType=""] The data type to retrieve
   * @param  {String} param.url The url
   * @param  {Any} [param.data] The data to send
   * @param  {Function} [param.beforeSend] A function called just before the send
   *   request. The first parameter of this function is the XHR object.
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
   * which returns a JSON representation of the object. The returned value is used
   * as first parameter of the object constructor.
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
        // browsers, giving `null` as parameter to `new Date()` doesn't return an
        // invalid date.

        // Cloning a date with `return new Date(object)` has problems on Firefox.
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

  /**
   * An Universal Unique ID generator
   *
   * @return {String} The new UUID.
   */
  function generateUuid() {
    function S4() {
      return ('0000' + Math.floor(
        Math.random() * 0x10000 /* 65536 */
      ).toString(16)).slice(-4);
    }
    return S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();
  }
  util.generateUuid = generateUuid;











//
// //   // XXX What is "jio"?
// //   var rest_method_names = [
// //     "remove",
// //     "allDocs",
// //     "removeAttachment",
// //     "check",
// //     "repair"
// //   ],
// //     i,
// //     len = rest_method_names.length;
// //
// //   for (i = 0; i < len; i += 1) {
// //     declareMethod(rest_method_names[i]);
// //   }

// //   ["removeAttachment"].forEach(function (method) {
// //     shared.on(method, function (param) {
// //       if (!checkId(param)) {
// //         checkAttachmentId(param);
// //       }
// //     });
// //   });
// //
// //
// //   ["check", "repair"].forEach(function (method) {
// //     shared.on(method, function (param) {
// //       if (param.kwargs._id !== undefined) {
// //         if (!checkId(param)) {
// //           return;
// //         }
// //       }
// //     });
// //   });







  // tools
  function checkId(param) {
    if (typeof param._id !== 'string' || param._id === '') {
      throw new jIO.util.jIOError("Document id must be a non empty string.",
                                  400);
    }
  }

  function checkAttachmentId(param) {
    if (typeof param._attachment !== 'string' || param._attachment === '') {
      throw new jIO.util.jIOError(
        "Attachment id must be a non empty string.",
        400
      );
    }
  }

  function declareMethod(klass, name, precondition_function) {
    klass.prototype[name] = function () {
      var argument_list = arguments,
        context = this;

      return new RSVP.Queue()
        .push(function () {
          if (precondition_function !== undefined) {
            return precondition_function.apply(
              context.__storage,
              argument_list
            );
          }
        })
        .push(function () {
          var storage_method = context.__storage[name];
          if (storage_method === undefined) {
            throw new jIO.util.jIOError(
              "Capacity '" + name + "' is not implemented",
              500
            );
          }
          return storage_method.apply(
            context.__storage,
            argument_list
          );
        });
    };
    // Allow chain
    return this;
  }




  /////////////////////////////////////////////////////////////////
  // jIO Storage Proxy
  /////////////////////////////////////////////////////////////////
  function JioProxyStorage(storage) {
    if (!(this instanceof JioProxyStorage)) {
      return new JioProxyStorage();
    }
    this.__storage = storage;
  }

  declareMethod(JioProxyStorage, "put", checkId);
  declareMethod(JioProxyStorage, "get", checkId);
  declareMethod(JioProxyStorage, "remove", checkId);

  // listeners
  declareMethod(JioProxyStorage, "post", function (param) {
    if (param._id !== undefined) {
      return checkId(param);
    }
  });

  declareMethod(JioProxyStorage, 'putAttachment', function (param) {
    checkId(param);
    checkAttachmentId(param);

    if (!(param._blob instanceof Blob) &&
        typeof param._data === 'string') {
      param._blob = new Blob([param._data], {
        "type": param._content_type || param._mimetype || ""
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

  declareMethod(JioProxyStorage, 'getAttachment', function (param) {
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
    checkId(param);
    checkAttachmentId(param);
  });

  declareMethod(JioProxyStorage, "allDocs");

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

}(window, RSVP, Blob, QueryFactory, Query));
