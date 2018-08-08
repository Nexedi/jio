import RSVP from 'rsvp';
import { jIOError, readBlobAsText, readBlobAsDataURL, readBlobAsArrayBuffer } from './utils';
import { Query, QueryFactory } from './queries/query';

// tools
function checkId(argument_list, storage, method_name) {
  if (typeof argument_list[0] !== 'string' || argument_list[0] === '') {
    throw new jIOError(
      "Document id must be a non empty string on '" + storage.__type +
        "." + method_name + "'.",
      400
    );
  }
}

function checkAttachmentId(argument_list, storage, method_name) {
  if (typeof argument_list[1] !== 'string' || argument_list[1] === '') {
    throw new jIOError(
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
      throw new jIOError(
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

/**
 * @returns RSVP.Queue
 */
JioProxyStorage.prototype.post = function () {
  var context = this,
    argument_list = arguments;
  return ensurePushableQueue(function () {
    var storage_method = context.__storage.post;
    if (storage_method === undefined) {
      throw new jIOError(
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
    throw new jIOError(
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
    throw new jIOError(
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
        return readBlobAsDataURL(blob);
      })
      .push(function (evt) {
        return evt.target.result;
      });
  } else if (convert === "array_buffer") {
    result = new RSVP.Queue()
      .push(function () {
        return readBlobAsArrayBuffer(blob);
      })
      .push(function (evt) {
        return evt.target.result;
      });
  } else if (convert === "text") {
    result = new RSVP.Queue()
      .push(function () {
        return readBlobAsText(blob);
      })
      .push(function (evt) {
        return evt.target.result;
      });
  } else if (convert === "json") {
    result = new RSVP.Queue()
      .push(function () {
        return readBlobAsText(blob);
      })
      .push(function (evt) {
        return JSON.parse(evt.target.result);
      });
  } else {
    throw new jIOError(
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
    throw new jIOError(
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
    throw new jIOError(
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

JioBuilder.prototype.QueryFactory = QueryFactory;
JioBuilder.prototype.Query = Query;

var jIO = new JioBuilder();

export {
  jIO
};
