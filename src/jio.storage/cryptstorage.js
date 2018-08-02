/*
 * Copyright 2018, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */
/*jslint nomen: true*/
/*global jIO, RSVP, DOMParser, Blob, DOMException, crypto, Uint8Array,
  ArrayBuffer, CryptoKey*/
/*jslint maxlen: 160 */
(function (jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer, CryptoKey) {
  "use strict";

  /*
  The cryptography system used by this storage is AES-GCM.
  
  Here is an example of how to generate a strong user key :

  -go to the website : https://randomkeygen.com/  pike a key and memorize it
  after that you can Import your key like in exemple above  .
  
  -exemple of key generation :
  
  var your_key = mySuperHardKey2018,
    buffer = new TextEncoder("utf-8").encode(your_key);
  
  return new RSVP.Queue()
        .push(function () {
          return RSVP.all([window.crypto.subtle.digest("SHA-256", buffer),
            window.crypto.subtle.importKey(
              "raw",
              buffer,
              {name: "PBKDF2"
                },
              false,
              ["deriveKey"]
            )
            ]);
        })
        .push(function (my_array) {
          return {
            CryptoKey: my_array[1],
            Salt: my_array[0]
          };
        })
        .push(undefined, function (error) {
          throw error;
        });
  
  -once storage created you use the callback to call addkey function and add 
  the required CryptoKey you generated earlier .
  
  utils = {"crypto_getCryptoKey": function (callback) {
          return new RSVP.Queue()
          .push(function () {
            addkey = callback.addkey_crypto; 
            error = callback.error_crypto;
          })
          .push(undefined, function (error) {
            throw error; 
          });

  return new RSVP.Queue()
    .push(function () {
      var jio = jIO.createJIO({
        type: "crypt"
        sub_storage: {storage_definition}
      }, utils);
    });
  
  Find more informations about this cryptography system on
  https://github.com/diafygi/webcrypto-examples#aes-gcm
  https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey
  */

  /**
   * The JIO Cryptography Storage extension
   *
   * @class CryptStorage
   * @constructor
   */


  var MIME_TYPE = "application/x-jio-aes-gcm-encryption";

  function CryptStorage(spec, utils) {
    this._utils = utils;
    this._keyid = spec.keyid;
    this._key = "";
    this._sub_storage = jIO.createJIO(spec.sub_storage, utils);
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
          that._key, buf);
      })
      .push(function (coded) {
        var blob = new Blob([initializaton_vector, coded], {
          type: MIME_TYPE
        });
        return that._sub_storage.putAttachment(id, name, blob);
      })
      .push(undefined, function (error) {
        var cryptoerror = {keyid: that._keyid},
          callback_crypto = {
            addkey_crypto: that.addkey.bind(that),
            error_crypto: cryptoerror
          };
        if (that._utils === undefined) {
          throw new jIO.util.jIOError(that._keyid + ": no callback function declared");
        }
        if (!that._utils.hasOwnProperty("crypto_getCryptoKey")) {
          throw new jIO.util.jIOError(that._keyid + ":crypto_getCryptoKey function not declared in callback");
        }
        if (error instanceof DOMException) {
          if (error.name === "OperationError") {
            cryptoerror.error_type = error.name;
            cryptoerror.error_message = "Failed to decrypt due to incorrect password or data";
          } else if (error.name === "InvalidAccessError") {
            cryptoerror.error_type = error.name;
            cryptoerror.error_message = "invalid encryption algorithm, or invalid key for specified encryption algorithm";
          }
        } else if (error instanceof TypeError) {
          cryptoerror.error_type = error.name;
          cryptoerror.error_message = "password is not type CRYPTOKEY";
        }
        return new RSVP.Queue()
          .push(function () {
            return that._utils.crypto_getCryptoKey(callback_crypto);
          })
          .push(function () {
            throw new jIO.util.jIOError(that._keyid + " : " + cryptoerror.error_type +
              " : " + cryptoerror.error_message, 801);
          });
      });
  };

  CryptStorage.prototype.getAttachment = function (id, name) {
    var that = this;
    return that._sub_storage.getAttachment(id, name)
      .push(function (blob) {
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
                      that._key, coded.slice(12));
                  })
                  .push(function (arr) {
                    arr = String.fromCharCode.apply(null, new Uint8Array(arr));
                    return jIO.util.dataURItoBlob(arr);
                  })
                  .push(undefined, function (error) {
                    var cryptoerror = {keyid: that._keyid},
                      callback_crypto = {
                        addkey_crypto: that.addkey.bind(that),
                        error_crypto: cryptoerror
                      };
                    if (that._utils === undefined) {
                      throw new jIO.util.jIOError(that._keyid + ": no callback function declared");
                    }
                    if (!that._utils.hasOwnProperty("crypto_getCryptoKey")) {
                      throw new jIO.util.jIOError(that._keyid + ":crypto_getCryptoKey function not declared in callback");
                    }
                    if (error instanceof DOMException) {
                      if (error.name === "OperationError") {
                        cryptoerror.error_type = error.name;
                        cryptoerror.error_message = "Failed to decrypt due to incorrect password or data";
                      } else if (error.name === "InvalidAccessError") {
                        cryptoerror.error_type = error.name;
                        cryptoerror.error_message = "invalid encryption algorithm, or invalid key for specified encryption algorithm";
                      }
                    } else if (error instanceof TypeError) {
                      cryptoerror.error_type = error.name;
                      cryptoerror.error_message = "password is not type CRYPTOKEY";
                    }
                    return new RSVP.Queue()
                      .push(function () {
                        return that._utils.crypto_getCryptoKey(callback_crypto);
                      })
                      .push(function () {
                        throw new jIO.util.jIOError(that._keyid + " : " + cryptoerror.error_type
                          + " : " + cryptoerror.error_message, 801);
                      });
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

  CryptStorage.prototype.addkey = function (key) {
    var that = this;
    if (key === undefined || key === null) {return; }
    if (!(key.hasOwnProperty("CryptoKey") && key.hasOwnProperty("Salt"))) {return; }
    if (!(key.CryptoKey instanceof CryptoKey && key.Salt instanceof ArrayBuffer)) {return; }
    if (key.CryptoKey.algorithm.name !== "PBKDF2"
        &&  key.CryptoKey.usages[0] !== "deriveKey") {return; }
    return new RSVP.Queue()
      .push(function () {
        return window.crypto.subtle.deriveKey({
          "name": "PBKDF2",
          "salt":  key.Salt,
          "iterations": 1000,
          //we can add iteration number but slow CPU will freez
          "hash": "SHA-256"
        }, key.CryptoKey, {
          "name": "AES-GCM",
          "length": 256
        }, false, ["encrypt", "decrypt"]);
      })
      .push(function (res) {
        that._key = res;
      });
  };


  jIO.addStorage('crypt', CryptStorage);

}(jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer, CryptoKey));
