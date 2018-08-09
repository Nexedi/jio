/*
 * Copyright 2017, Nexedi SA
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
import { Blob } from '../utils-compat';

(function (jIO, RSVP, Blob) {
  "use strict";

  function HttpStorage(spec) {
    if (spec.hasOwnProperty('catch_error')) {
      this._catch_error = spec.catch_error;
    } else {
      this._catch_error = false;
    }
    // If timeout not set, use 0 for no timeout value
    this._timeout = spec.timeout || 0;
  }

  HttpStorage.prototype.get = function (id) {
    var context = this;
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: 'HEAD',
          url: id,
          timeout: context._timeout
        });
      })
      .push(undefined, function (error) {
        if (context._catch_error) {
          return error;
        }
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find url " + id, 404);
        }
        throw error;
      })
      .push(function (response) {

        var key_list = ["Content-Disposition", "Content-Type", "Date",
                        "Last-Modified", "Vary", "Cache-Control", "Etag",
                        "Accept-Ranges", "Content-Range"],
          i,
          key,
          value,
          result = {};
        result.Status = response.target.status;
        for (i = 0; i < key_list.length; i += 1) {
          key = key_list[i];
          value = response.target.getResponseHeader(key);
          if (value !== null) {
            result[key] = value;
          }
        }
        return result;
      });
  };

  HttpStorage.prototype.allAttachments = function () {
    return {enclosure: {}};
  };

  HttpStorage.prototype.getAttachment = function (id, name) {
    var context = this;
    if (name !== 'enclosure') {
      throw new jIO.util.jIOError("Forbidden attachment: "
                                  + id + " , " + name,
                                  400);
    }
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: 'GET',
          url: id,
          dataType: "blob",
          timeout: context._timeout
        });
      })
      .push(undefined, function (error) {
        if (context._catch_error) {
          return error;
        }
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find url " + id, 404);
        }
        throw error;
      })
      .push(function (response) {
        return new Blob(
          [response.target.response || response.target.responseText],
          {"type": response.target.getResponseHeader('Content-Type') ||
                   "application/octet-stream"}
        );
      });
  };

  jIO.addStorage('http', HttpStorage);

}(jIO, RSVP, Blob));
