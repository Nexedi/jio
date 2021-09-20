/*
 * JIO extension for resource replication.
 * Copyright (C) 2021  Nexedi SA
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

/*jslint nomen: true*/
/*global jIO*/

(function (jIO) {
  "use strict";

  function FallbackStorage(spec) {
    this._sub_storage = this._current_storage = jIO.createJIO(spec.sub_storage);
    if (spec.hasOwnProperty('fallback_storage')) {
      this._fallback_storage = jIO.createJIO(spec.fallback_storage);
      this._checked = false;
    } else {
      this._checked = true;
    }
  }

  var method_name_list = [
    'get',
    'put',
    'post',
    'remove',
    'buildQuery',
    'getAttachment',
    'putAttachment',
    'allAttachments',
    'repair'
  ],
    i;

  function methodFallback(method_name) {
    return function () {
      var storage = this,
        queue =  storage._current_storage[method_name].apply(
          storage._current_storage,
          arguments
        ),
        argument_list = arguments;
      if (!storage._checked) {
        queue
          .push(function (result) {
            storage._checked = true;
            return result;
          }, function (error) {
            storage._checked = true;
            if ((error instanceof jIO.util.jIOError) &&
                (error.status_code === 500)) {
              // If storage is not working, use fallback instead
              storage._current_storage = storage._fallback_storage;
              return storage._current_storage[method_name].apply(
                storage._current_storage,
                argument_list
              );
            }
            throw error;
          });
      }
      return queue;
    };
  }

  for (i = 0; i < method_name_list.length; i += 1) {
    FallbackStorage.prototype[method_name_list[i]] =
      methodFallback(method_name_list[i]);
  }

  FallbackStorage.prototype.hasCapacity = function hasCapacity(name) {
    return (this._sub_storage.hasCapacity(name) &&
      this._fallback_storage.hasCapacity(name));
  };

  jIO.addStorage('fallback', FallbackStorage);

}(jIO));
