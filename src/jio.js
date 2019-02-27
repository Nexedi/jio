/*
 * Copyright 2014, Nexedi SA
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
/*global window, RSVP, Blob, XMLHttpRequest, QueryFactory, Query, atob,
  FileReader, ArrayBuffer, Uint8Array, navigator */
(function (window, RSVP, Blob, QueryFactory, Query, atob,
           FileReader, ArrayBuffer, Uint8Array, navigator) {
  "use strict";

  if (window.openDatabase === undefined) {
    window.openDatabase = function () {
      throw new Error('WebSQL is not supported by ' + navigator.userAgent);
    };
  }

  /* Safari does not define DOMError */
  if (window.DOMError === undefined) {
    window.DOMError = {};
  }

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
   * @param  {Number} param.timeout The request timeout value
   * @param  {Function} [param.beforeSend] A function called just before the
   *    send request. The first parameter of this function is the XHR object.
   * @return {Promise} The promise
   */
  function ajax(param) {
    var xhr = new XMLHttpRequest();
    return new RSVP.Promise(function (resolve, reject) {
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
      if (typeof param.xhrFields === 'object' && param.xhrFields !== null) {
        for (k in param.xhrFields) {
          if (param.xhrFields.hasOwnProperty(k)) {
            xhr[k] = param.xhrFields[k];
          }
        }
      }
      if (param.timeout !== undefined && param.timeout !== 0) {
        xhr.timeout = param.timeout;
        xhr.ontimeout = function () {
          return reject(new jIO.util.jIOError("Gateway Timeout", 504));
        };
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

  function readBlobAsText(blob, encoding) {
    var fr = new FileReader();
    return new RSVP.Promise(function (resolve, reject) {
      fr.addEventListener("load", resolve);
      fr.addEventListener("error", reject);
      fr.readAsText(blob, encoding);
    }, function () {
      fr.abort();
    });
  }
  util.readBlobAsText = readBlobAsText;

  function readBlobAsArrayBuffer(blob) {
    var fr = new FileReader();
    return new RSVP.Promise(function (resolve, reject) {
      fr.addEventListener("load", resolve);
      fr.addEventListener("error", reject);
      fr.readAsArrayBuffer(blob);
    }, function () {
      fr.abort();
    });
  }
  util.readBlobAsArrayBuffer = readBlobAsArrayBuffer;

  function readBlobAsDataURL(blob) {
    var fr = new FileReader();
    return new RSVP.Promise(function (resolve, reject) {
      fr.addEventListener("load", resolve);
      fr.addEventListener("error", reject);
      fr.readAsDataURL(blob);
    }, function () {
      fr.abort();
    });
  }
  util.readBlobAsDataURL = readBlobAsDataURL;

  function stringify(obj) {
    // Implement a stable JSON.stringify
    // Object's keys are alphabetically ordered
    var key,
      key_list,
      i,
      value,
      result_list;
    if (obj === undefined) {
      return undefined;
    }
    if (obj === null) {
      return 'null';
    }
    if (obj.constructor === Object) {
      key_list = Object.keys(obj).sort();
      result_list = [];
      for (i = 0; i < key_list.length; i += 1) {
        key = key_list[i];
        value = stringify(obj[key]);
        if (value !== undefined) {
          result_list.push(stringify(key) + ':' + value);
        }
      }
      return '{' + result_list.join(',') + '}';
    }
    if (obj.constructor === Array) {
      result_list = [];
      for (i = 0; i < obj.length; i += 1) {
        result_list.push(stringify(obj[i]));
      }
      return '[' + result_list.join(',') + ']';
    }
    return JSON.stringify(obj);
  }
  util.stringify = stringify;

  function base64toBlob(b64String, mimeString) {

    var byteString = atob(b64String),
    // write the bytes of the string to an ArrayBuffer
      arrayBuffer = new ArrayBuffer(byteString.length),
      _ia = new Uint8Array(arrayBuffer),
      i;
    for (i = 0; i < byteString.length; i += 1) {
      _ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], {type: mimeString});
  }

  util.base64toBlob = base64toBlob;

  // https://gist.github.com/davoclavo/4424731
  function dataURItoBlob(dataURI) {
    if (dataURI === 'data:') {
      return new Blob();
    }
    // convert base64 to raw binary data held in a string
    var mimeString = dataURI.split(',')[0].split(':')[1];
    mimeString = mimeString.slice(0, mimeString.length - ";base64".length);
    return base64toBlob(dataURI.split(',')[1], mimeString);
  }

  util.dataURItoBlob = dataURItoBlob;

  // tools
  function checkId(argument_list, storage, method_name) {
    if (typeof argument_list[0] !== 'string' || argument_list[0] === '') {
      throw new jIO.util.jIOError(
        "Document id must be a non empty string on '" + storage.__type +
          "." + method_name + "'.",
        400
      );
    }
  }

  function checkAttachmentId(argument_list, storage, method_name) {
    if (typeof argument_list[1] !== 'string' || argument_list[1] === '') {
      throw new jIO.util.jIOError(
        "Attachment id must be a non empty string on '" + storage.__type +
          "." + method_name + "'.",
        400
      );
    }
  }

  function ensurePushableQueue(callback, argument_list, context) {
    var result;
    try {
      result = callback.apply(context, argument_list);
    } catch (e) {
      return new RSVP.Queue()
        .push(function returnPushableError() {
          return RSVP.reject(e);
        });
    }
    if (result instanceof RSVP.Queue) {
      return result;
    }
    return new RSVP.Queue()
      .push(function returnPushableResult() {
        return result;
      });
  }

  function declareMethod(klass, name, precondition_function, post_function) {
    klass.prototype[name] = function () {
      var argument_list = arguments,
        context = this,
        precondition_result,
        storage_method,
        queue;

      // Precondition function are not asynchronous
      if (precondition_function !== undefined) {
        precondition_result = precondition_function.apply(
          context.__storage,
          [argument_list, context, name]
        );
      }

      storage_method = context.__storage[name];
      if (storage_method === undefined) {
        throw new jIO.util.jIOError(
          "Capacity '" + name + "' is not implemented on '" +
            context.__type + "'",
          501
        );
      }
      queue = ensurePushableQueue(storage_method, argument_list,
                                  context.__storage);

      if (post_function !== undefined) {
        queue
          .push(function (result) {
            return post_function.call(
              context,
              argument_list,
              result,
              precondition_result
            );
          });
      }
      return queue;
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
    return argument_list[0];
  });
  declareMethod(JioProxyStorage, "get", checkId);
  declareMethod(JioProxyStorage, "bulk");
  declareMethod(JioProxyStorage, "remove", checkId, function (argument_list) {
    return argument_list[0];
  });

  JioProxyStorage.prototype.post = function () {
    var context = this,
      argument_list = arguments;
    return ensurePushableQueue(function () {
      var storage_method = context.__storage.post;
      if (storage_method === undefined) {
        throw new jIO.util.jIOError(
          "Capacity 'post' is not implemented on '" + context.__type + "'",
          501
        );
      }
      return context.__storage.post.apply(context.__storage, argument_list);
    });
  };

  declareMethod(JioProxyStorage, 'putAttachment', function (argument_list,
                                                            storage,
                                                            method_name) {
    checkId(argument_list, storage, method_name);
    checkAttachmentId(argument_list, storage, method_name);

    var options = argument_list[3] || {};

    if (typeof argument_list[2] === 'string') {
      argument_list[2] = new Blob([argument_list[2]], {
        "type": options._content_type || options._mimetype ||
                "text/plain;charset=utf-8"
      });
    } else if (!(argument_list[2] instanceof Blob)) {
      throw new jIO.util.jIOError(
        'Attachment content is not a blob',
        400
      );
    }
  });

  declareMethod(JioProxyStorage, 'removeAttachment', function (argument_list,
                                                               storage,
                                                               method_name) {
    checkId(argument_list, storage, method_name);
    checkAttachmentId(argument_list, storage, method_name);
  });

  declareMethod(JioProxyStorage, 'getAttachment', function (argument_list,
                                                            storage,
                                                            method_name) {
    var result = "blob";
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
    checkId(argument_list, storage, method_name);
    checkAttachmentId(argument_list, storage, method_name);
    // Drop optional parameters, which are only used in postfunction
    if (argument_list[2] !== undefined) {
      result = argument_list[2].format || result;
      delete argument_list[2].format;
    }
    return result;
  }, function (argument_list, blob, convert) {
    var result;
    if (!(blob instanceof Blob)) {
      throw new jIO.util.jIOError(
        "'getAttachment' (" + argument_list[0] + " , " +
          argument_list[1] + ") on '" + this.__type +
          "' does not return a Blob.",
        501
      );
    }
    if (convert === "blob") {
      result = blob;
    } else if (convert === "data_url") {
      result = new RSVP.Queue()
        .push(function () {
          return jIO.util.readBlobAsDataURL(blob);
        })
        .push(function (evt) {
          return evt.target.result;
        });
    } else if (convert === "array_buffer") {
      result = new RSVP.Queue()
        .push(function () {
          return jIO.util.readBlobAsArrayBuffer(blob);
        })
        .push(function (evt) {
          return evt.target.result;
        });
    } else if (convert === "text") {
      result = new RSVP.Queue()
        .push(function () {
          return jIO.util.readBlobAsText(blob);
        })
        .push(function (evt) {
          return evt.target.result;
        });
    } else if (convert === "json") {
      result = new RSVP.Queue()
        .push(function () {
          return jIO.util.readBlobAsText(blob);
        })
        .push(function (evt) {
          return JSON.parse(evt.target.result);
        });
    } else {
      throw new jIO.util.jIOError(
        this.__type + ".getAttachment format: '" + convert +
          "' is not supported",
        400
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
    return ensurePushableQueue(storage_method, argument_list,
                               context.__storage);
  };

  JioProxyStorage.prototype.hasCapacity = function (name) {
    var storage_method = this.__storage.hasCapacity,
      capacity_method = this.__storage[name];
    if (capacity_method !== undefined) {
      return true;
    }
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
    return ensurePushableQueue(function () {
      if (context.hasCapacity("list") &&
          ((options.query === undefined) || context.hasCapacity("query")) &&
          ((options.sort_on === undefined) || context.hasCapacity("sort")) &&
          ((options.select_list === undefined) ||
           context.hasCapacity("select")) &&
          ((options.include_docs === undefined) ||
           context.hasCapacity("include")) &&
          ((options.limit === undefined) || context.hasCapacity("limit"))) {
        return context.buildQuery(options)
          .push(function (result) {
            return {
              data: {
                rows: result,
                total_rows: result.length
              }
            };
          });
      }
    });
  };

  declareMethod(JioProxyStorage, "allAttachments", checkId);
  declareMethod(JioProxyStorage, "repair");

  JioProxyStorage.prototype.repair = function () {
    var context = this,
      argument_list = arguments;
    return ensurePushableQueue(function () {
      var storage_method = context.__storage.repair;
      if (storage_method !== undefined) {
        return context.__storage.repair.apply(context.__storage,
                                              argument_list);
      }
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

}(window, RSVP, Blob, QueryFactory, Query, atob,
  FileReader, ArrayBuffer, Uint8Array, navigator));
