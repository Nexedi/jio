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

import RSVP from 'rsvp';
import { jIO } from './jio';
import { declareMethod, ensurePushableQueue } from './utils';
import { Blob } from './utils-compat';

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

function JioProxyStorage(type, storage) {
  if (!(this instanceof JioProxyStorage)) {
    return new JioProxyStorage();
  }
  this.__type = type;
  this.__storage = storage;
}

declareMethod(JioProxyStorage, 'put', checkId, function (argument_list) {
  return argument_list[0];
});
declareMethod(JioProxyStorage, 'get', checkId);
declareMethod(JioProxyStorage, 'bulk');
declareMethod(JioProxyStorage, 'remove', checkId, function (argument_list) {
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
      throw new jIO.util.jIOError(
        "Capacity 'post' is not implemented on '" + context.__type + "'",
        501
      );
    }
    return context.__storage.post.apply(context.__storage, argument_list);
  });
};

declareMethod(JioProxyStorage, 'putAttachment', function (
  argument_list, storage, method_name
) {
  checkId(argument_list, storage, method_name);
  checkAttachmentId(argument_list, storage, method_name);

  var options = argument_list[3] || {};

  if (typeof argument_list[2] === 'string') {
    argument_list[2] = new Blob([argument_list[2]], {
      type: options._content_type || options._mimetype ||
        'text/plain;charset=utf-8'
    });
  } else if (!(argument_list[2] instanceof Blob)) {
    throw new jIO.util.jIOError(
      'Attachment content is not a blob',
      400
    );
  }
});

declareMethod(JioProxyStorage, 'removeAttachment', function (
  argument_list, storage, method_name
) {
  checkId(argument_list, storage, method_name);
  checkAttachmentId(argument_list, storage, method_name);
});

declareMethod(JioProxyStorage, 'getAttachment', function (
  argument_list, storage, method_name
) {
  var result = 'blob';
//     if (param.storage_spec.type !== 'indexeddb' &&
//         param.storage_spec.type !== 'dav' &&
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
  if (convert === 'blob') {
    result = blob;
  } else if (convert === 'data_url') {
    result = new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsDataURL(blob);
      })
      .push(function (evt) {
        return evt.target.result;
      });
  } else if (convert === 'array_buffer') {
    result = new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (evt) {
        return evt.target.result;
      });
  } else if (convert === 'text') {
    result = new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsText(blob);
      })
      .push(function (evt) {
        return evt.target.result;
      });
  } else if (convert === 'json') {
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
    if (context.hasCapacity('list') &&
        ((options.query === undefined) || context.hasCapacity('query')) &&
        ((options.sort_on === undefined) || context.hasCapacity('sort')) &&
        ((options.select_list === undefined) ||
          context.hasCapacity('select')) &&
        ((options.include_docs === undefined) ||
          context.hasCapacity('include')) &&
        ((options.limit === undefined) || context.hasCapacity('limit'))) {
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

declareMethod(JioProxyStorage, 'allAttachments', checkId);
declareMethod(JioProxyStorage, 'repair');

JioProxyStorage.prototype.repair = function () {
  var context = this,
    argument_list = arguments;

  return ensurePushableQueue(function () {
    var storage_method = context.__storage.repair;
    if (storage_method !== undefined) {
      return context.__storage.repair.apply(
        context.__storage, argument_list
      );
    }
  });
};

var storageTypes = {};

function createJIO(config, util) {
  if (typeof config.type !== 'string') {
    throw new TypeError("Invalid storage description");
  }
  if (!storageTypes[config.type]) {
    throw new TypeError("Unknown storage '" + config.type + "'");
  }

  return new JioProxyStorage(
    config.type,
    new storageTypes[config.type](config, util)
  );
}
jIO.createJIO = createJIO;

function addStorage(type, Constructor) {
  if (typeof type !== 'string') {
    throw new TypeError(
      "jIO.addStorage(): Argument 1 is not of type 'string'"
    );
  }
  if (typeof Constructor !== 'function') {
    throw new TypeError(
      "jIO.addStorage(): Argument 2 is not of type 'function'"
    );
  }
  if (storageTypes[type] !== undefined) {
    throw new TypeError(
      "jIO.addStorage(): Storage type already exists"
    );
  }
  storageTypes[type] = Constructor;
}
jIO.addStorage = addStorage;
