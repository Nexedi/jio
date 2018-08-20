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

/*jslint nomen: true*/
/*global jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer*/

(function (jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer) {
  "use strict";

  /*
  The cryptography system used by this storage is AES-GCM.
  Here is an example of how to generate a key to the json format:

  return new RSVP.Queue()
    .push(function () {
      return crypto.subtle.generateKey({name: "AES-GCM", length: 256},
                                       true, ["encrypt", "decrypt"]);
    })
    .push(function (key) {
      return crypto.subtle.exportKey("jwk", key);
    })
    .push(function (json_key) {
      var jio = jIO.createJIO({
        type: "crypt",
        key: json_key,
        sub_storage: {storage_definition}
      });
    });

  Find more informations about this cryptography system on
  https://github.com/diafygi/webcrypto-examples#aes-gcm
  */

  /**
   * The JIO Cryptography Storage extension
   *
   * @class CryptStorage
   * @constructor
   */

  var MIME_TYPE = "application/x-jio-aes-gcm-encryption";

  function CryptStorage(spec) {
    this._key = spec.key;
    this._jsonKey = true;
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  function convertKey(that) {
    return new RSVP.Queue()
      .push(function () {
        return crypto.subtle.importKey("jwk", that._key,
                                       "AES-GCM", false,
                                       ["encrypt", "decrypt"]);
      })
      .push(function (res) {
        that._key = res;
        that._jsonKey = false;
        return;
      });
  }

  CryptStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage,
                                       arguments);
  };

  CryptStorage.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage,
                                        arguments);
  };

  CryptStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage,
                                       arguments);
  };

  CryptStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage,
                                          arguments);
  };

  CryptStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage,
                                               arguments);
  };

  CryptStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage,
                                              arguments);
  };


  CryptStorage.prototype.putAttachment = function (id, name, blob) {
    var initializaton_vector = crypto.getRandomValues(new Uint8Array(12)),
      that = this;

    return new RSVP.Queue()
      .push(function () {
        if (that._jsonKey === true) {
          return convertKey(that);
        }
        return;
      })
      .push(function () {
        return jIO.util.readBlobAsDataURL(blob);
      })
      .push(function (dataURL) {
        //string->arraybuffer
        var strLen = dataURL.target.result.length,
          buf = new ArrayBuffer(strLen),
          bufView = new Uint8Array(buf),
          i;

        dataURL = dataURL.target.result;
        for (i = 0; i < strLen; i += 1) {
          bufView[i] = dataURL.charCodeAt(i);
        }
        return crypto.subtle.encrypt({
          name : "AES-GCM",
          iv : initializaton_vector
        },
                                     that._key, buf);
      })
      .push(function (coded) {
        var final_blob = new Blob([initializaton_vector, coded],
                                  {type: MIME_TYPE});
        return that._sub_storage.putAttachment(id, name, final_blob);
      });
  };

  CryptStorage.prototype.getAttachment = function (id, name) {
    var that = this;

    return that._sub_storage.getAttachment(id, name)
      .push(function (blob) {
        if (blob.type !== MIME_TYPE) {
          return blob;
        }
        return new RSVP.Queue()
          .push(function () {
            if (that._jsonKey === true) {
              return convertKey(that);
            }
            return;
          })
          .push(function () {
            return jIO.util.readBlobAsArrayBuffer(blob);
          })
          .push(function (coded) {
            var initializaton_vector;

            coded = coded.target.result;
            initializaton_vector = new Uint8Array(coded.slice(0, 12));
            return new RSVP.Queue()
              .push(function () {
                return crypto.subtle.decrypt({
                  name : "AES-GCM",
                  iv : initializaton_vector
                },
                                             that._key, coded.slice(12));
              })
              .push(function (arr) {
                //arraybuffer->string
                arr = String.fromCharCode.apply(null, new Uint8Array(arr));
                return jIO.util.dataURItoBlob(arr);
              })
              .push(undefined, function (error) {
                if (error instanceof DOMException) {
                  return blob;
                }
                throw error;
              });
          });
      });
  };

  CryptStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };

  CryptStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage,
                                                  arguments);
  };

  jIO.addStorage('crypt', CryptStorage);

}(jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer));
