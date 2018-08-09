/*
 * Copyright 2015, Nexedi SA
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

/*global DOMException*/

import RSVP from 'rsvp';
import LZString from 'lz-string';
import { jIO } from '../jio';
import { Blob } from '../utils-compat';

(function (jIO, RSVP, Blob, LZString, DOMException) {
  "use strict";

  /**
   * The jIO ZipStorage extension
   *
   * @class ZipStorage
   * @constructor
   */

  var MIME_TYPE = "application/x-jio-utf16_lz_string";

  function ZipStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  ZipStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage,
                                        arguments);
  };

  ZipStorage.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage,
                                        arguments);
  };

  ZipStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage,
                                       arguments);
  };

  ZipStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage,
                                          arguments);
  };

  ZipStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage,
                                               arguments);
  };

  ZipStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage,
                                              arguments);
  };

  ZipStorage.prototype.getAttachment = function (id, name) {
    var that = this;
    return that._sub_storage.getAttachment(id, name)
      .push(function (blob) {
        if (blob.type !== MIME_TYPE) {
          return blob;
        }
        return new RSVP.Queue()
          .push(function () {
            return jIO.util.readBlobAsText(blob, 'utf16');
          })
          .push(function (evt) {
            var result =
              LZString.decompressFromUTF16(evt.target.result);
            if (result === '') {
              return blob;
            }
            try {
              return jIO.util.dataURItoBlob(
                result
              );
            } catch (error) {
              if (error instanceof DOMException) {
                return blob;
              }
              throw error;
            }
          });
      });
  };

  function myEndsWith(str, query) {
    return (str.indexOf(query) === str.length - query.length);
  }

  ZipStorage.prototype.putAttachment = function (id, name, blob) {
    var that = this;
    if ((blob.type.indexOf("text/") === 0) || myEndsWith(blob.type, "xml") ||
        myEndsWith(blob.type, "json")) {
      return new RSVP.Queue()
        .push(function () {
          return jIO.util.readBlobAsDataURL(blob);
        })
        .push(function (data) {
          var result = LZString.compressToUTF16(data.target.result);
          blob = new Blob([result],
                          {type: MIME_TYPE});
          return that._sub_storage.putAttachment(id, name, blob);
        });
    }
    return this._sub_storage.putAttachment.apply(this._sub_storage,
                                                 arguments);
  };

  ZipStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };

  ZipStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage,
                                                  arguments);
  };

  jIO.addStorage('zip', ZipStorage);
}(jIO, RSVP, Blob, LZString, DOMException));
