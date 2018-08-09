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
import { jIO } from '../jio';

/**
 * JIO Union Storage. Type = 'union'.
 * This provide a unified access other multiple storage.
 * New document are created in the first sub storage.
 * Document are searched in each sub storage until it is found.
 *
 *
 * Storage Description:
 *
 *     {
 *       "type": "union",
 *       "storage_list": [
 *         sub_storage_description_1,
 *         sub_storage_description_2,
 *
 *         sub_storage_description_X,
 *       ]
 *     }
 *
 * @class UnionStorage
 */

(function (jIO, RSVP) {
  "use strict";

  /**
   * The JIO UnionStorage extension
   *
   * @class UnionStorage
   * @constructor
   */
  function UnionStorage(spec) {
    if (!Array.isArray(spec.storage_list)) {
      throw new jIO.util.jIOError("storage_list is not an Array", 400);
    }
    var i;
    this._storage_list = [];
    for (i = 0; i < spec.storage_list.length; i += 1) {
      this._storage_list.push(jIO.createJIO(spec.storage_list[i]));
    }
  }

  UnionStorage.prototype._getWithStorageIndex = function () {
    var i,
      index = 0,
      context = this,
      arg = arguments,
      result = this._storage_list[0].get.apply(this._storage_list[0], arg);

    function handle404(j) {
      result
        .push(undefined, function (error) {
          if ((error instanceof jIO.util.jIOError) &&
              (error.status_code === 404)) {
            return context._storage_list[j].get.apply(context._storage_list[j],
                                                      arg)
              .push(function (doc) {
                index = j;
                return doc;
              });
          }
          throw error;
        });
    }

    for (i = 1; i < this._storage_list.length; i += 1) {
      handle404(i);
    }
    return result
      .push(function (doc) {
        return [index, doc];
      });
  };

  /*
   * Get a document
   * Try on each substorage on after the other
   */
  UnionStorage.prototype.get = function () {
    return this._getWithStorageIndex.apply(this, arguments)
      .push(function (result) {
        return result[1];
      });
  };

  /*
   * Get attachments list
   * Try on each substorage on after the other
   */
  UnionStorage.prototype.allAttachments = function () {
    var argument_list = arguments,
      context = this;
    return this._getWithStorageIndex.apply(this, arguments)
      .push(function (result) {
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.allAttachments.apply(sub_storage, argument_list);
      });
  };

  /*
   * Post a document
   * Simply store on the first substorage
   */
  UnionStorage.prototype.post = function () {
    return this._storage_list[0].post.apply(this._storage_list[0], arguments);
  };

  /*
   * Put a document
   * Search the document location, and modify it in its storage.
   */
  UnionStorage.prototype.put = function () {
    var arg = arguments,
      context = this;
    return this._getWithStorageIndex(arg[0])
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          // Document does not exist, create in first substorage
          return [0];
        }
        throw error;
      })
      .push(function (result) {
        // Storage found, modify in it directly
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.put.apply(sub_storage, arg);
      });
  };

  /*
   * Remove a document
   * Search the document location, and remove it from its storage.
   */
  UnionStorage.prototype.remove = function () {
    var arg = arguments,
      context = this;
    return this._getWithStorageIndex(arg[0])
      .push(function (result) {
        // Storage found, remove from it directly
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.remove.apply(sub_storage, arg);
      });
  };

  UnionStorage.prototype.buildQuery = function () {
    var promise_list = [],
      i,
      id_dict = {},
      len = this._storage_list.length,
      sub_storage;
    for (i = 0; i < len; i += 1) {
      sub_storage = this._storage_list[i];
      promise_list.push(sub_storage.buildQuery.apply(sub_storage, arguments));
    }
    return new RSVP.Queue()
      .push(function () {
        return RSVP.all(promise_list);
      })
      .push(function (result_list) {
        var result = [],
          sub_result,
          sub_result_len,
          j;
        len = result_list.length;
        for (i = 0; i < len; i += 1) {
          sub_result = result_list[i];
          sub_result_len = sub_result.length;
          for (j = 0; j < sub_result_len; j += 1) {
            if (!id_dict.hasOwnProperty(sub_result[j].id)) {
              id_dict[sub_result[j].id] = null;
              result.push(sub_result[j]);
            }
          }
        }
        return result;
      });
  };

  UnionStorage.prototype.hasCapacity = function (name) {
    var i,
      len,
      result,
      sub_storage;
    if ((name === "list") ||
            (name === "query") ||
            (name === "select")) {
      result = true;
      len = this._storage_list.length;
      for (i = 0; i < len; i += 1) {
        sub_storage = this._storage_list[i];
        result = result && sub_storage.hasCapacity(name);
      }
      return result;
    }
    return false;
  };

  UnionStorage.prototype.repair = function () {
    var i,
      promise_list = [];
    for (i = 0; i < this._storage_list.length; i += 1) {
      promise_list.push(this._storage_list[i].repair.apply(
        this._storage_list[i],
        arguments
      ));
    }
    return RSVP.all(promise_list);
  };

  UnionStorage.prototype.getAttachment = function () {
    var argument_list = arguments,
      context = this;
    return this._getWithStorageIndex.apply(this, arguments)
      .push(function (result) {
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.getAttachment.apply(sub_storage, argument_list);
      });
  };

  UnionStorage.prototype.putAttachment = function () {
    var argument_list = arguments,
      context = this;
    return this._getWithStorageIndex.apply(this, arguments)
      .push(function (result) {
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.putAttachment.apply(sub_storage, argument_list);
      });
  };

  UnionStorage.prototype.removeAttachment = function () {
    var argument_list = arguments,
      context = this;
    return this._getWithStorageIndex.apply(this, arguments)
      .push(function (result) {
        var sub_storage = context._storage_list[result[0]];
        return sub_storage.removeAttachment.apply(sub_storage, argument_list);
      });
  };

  jIO.addStorage('union', UnionStorage);

}(jIO, RSVP));
