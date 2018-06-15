/*
 * Copyright 2015, Nexedi SA
 * Released under the LGPL license.
 * hcrypto, Uint8Array, ArrayBuffer*/
/*jslint nomen: true*/
/*jslint maxlen: 160 */
/*global jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer, CryptoKey*/
(function (jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer,
  CryptoKey) {
  "use strict";

  /*
  The cryptography system used by this storage is AES-GCM.
  Here is an example of how to generate a strong user key :

  go to the website : https://randomkeygen.com/  pike a key and memorize it

  return new RSVP.Queue()
    .push(function () {
      var jio = jIO.createJIO({
        type: "crypt"
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


  function hexToBuffer(hex) {
    // Xxxx use Uint8Array or ArrayBuffer or DataView
    var i,
      byteLen = hex.length / 2,
      arr,
      j = 0;

    if (byteLen !== parseInt(byteLen, 10)) {
      throw new Error("Invalid hex length '" + hex.length + "'");
    }

    arr = new Uint8Array(byteLen);

    for (i = 0; i < byteLen; i += 1) {
      arr[i] = parseInt(hex[j] + hex[j + 1], 16);
      j += 2;
    }

    return arr;
  }

  function convertKey(that) {
    return new RSVP.Queue()
      .push(function () {
        return window.crypto.subtle.deriveKey({
          "name": "PBKDF2",
          "salt": hexToBuffer("6f0904840608c09ae18c131542fbd1bd"),
          "iterations": 1000,
          //we can add iteration number but slow CPU will freez
          "hash": "SHA-256"
        }, that.importedkey, {
          "name": "AES-GCM",
          "length": 256
        }, false, ["encrypt", "decrypt"]);
      })
      .push(function (res) {
        that.key = res;
        return;
      });
  }

  function addevent(that) {
    try {
      window.addEventListener('message', function (event) {
        if (event.origin !== window.origin) {return; }
        if (!(event.data instanceof CryptoKey)) {return; }
        if (event.data.algorithm.name !== "PBKDF2" &&
            event.data.usages[0] !== "deriveKey") {return; }
        that.importedkey = event.data;
        convertKey(that);
      }, false);
    } catch (error) {
      throw new jIO.util.jIOError(error + "failed to build event lisener please reload the page", 803);
    }
  }

  var MIME_TYPE = "application/x-jio-aes-gcm-encryption";

  function CryptStorage(spec) {
    addevent(this);
    this.importedkey = "";
    this.key = "";
    this._sub_storage = jIO.createJIO(spec.sub_storage);
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
          name: "AES-GCM",
          iv: initializaton_vector
        },
          that.key, buf);
      })
      .push(function (coded) {
        var blob = new Blob([initializaton_vector, coded], {
          type: MIME_TYPE
        });
        return that._sub_storage.putAttachment(id, name, blob);
      })
      .push(undefined, function (error) {
        if (error instanceof DOMException) {
          if (error.name === "OperationError") {
            throw new jIO.util.jIOError(error.name + " : failed to decrypt due to mismatching password", 801);
          }
          if (error.name === "InvalidAccessError") {
            throw new jIO.util.jIOError(error.name + " :  invalid encryption algorithm, or invalid key for specified encryption algorithm", 801);
          }
        } else if (error instanceof TypeError) {
          throw new jIO.util.jIOError(error + " : password is not type CRYPTOKEY ", 801);
        }
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
            return new RSVP.Queue()
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
                      name: "AES-GCM",
                      iv: initializaton_vector
                    },
                      that.key, coded.slice(12));
                  })
                  .push(function (arr) {
                    arr = String.fromCharCode.apply(null, new Uint8Array(arr));
                    return jIO.util.dataURItoBlob(arr);
                  })
                  .push(undefined, function (error) {
                    if (error instanceof DOMException) {
                      if (error.name === "OperationError") {
                        throw new jIO.util.jIOError(error.name + " : failed to decrypt due to mismatching password", 801);
                      }
                      if (error.name === "InvalidAccessError") {
                        throw new jIO.util.jIOError(error.name + " :  invalid encryption algorithm, or invalid key for specified encryption algorithm", 801);
                      }
                      return blob;
                    }
                    if (error instanceof TypeError) {
                      throw new jIO.util.jIOError(error + " : password is not type CRYPTOKEY ", 801);
                    }
                  });
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

}(jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer, CryptoKey));