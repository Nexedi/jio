/*
 * Copyright 2015, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer*/

(function (jIO, RSVP, DOMException, Blob, crypto, Uint8Array, ArrayBuffer) {
  "use strict";

  /*
  The cryptography system used by this storage is AES-GCM.
  Here is an example of how to generate a strong user key :
  
  go to the website : https://randomkeygen.com/  pike a key and memorize it
  
  let suppose the key choseen is "Hwm0jPAmQC" then :
  
  return new RSVP.Queue()
    .push(function (json_key) {
      var jio = jIO.createJIO({
        type: "crypt",
        key: "Hwm0jPAmQC",
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

  //used unibabel.js for converting function

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

  function utf8ToBinaryString(str) {
    var escstr = encodeURIComponent(str),
      // replaces any uri escape sequence, such as %0A,
      // with binary escape, such as 0x0A
      binstr = escstr.replace(/%([0-9A-F]{2})/g, function (p1) {
        return String.fromCharCode(parseInt(p1, 16));
      });

    return binstr;
  }

  function binaryStringToBuffer(binstr) {
    var buf;

    if ("undefined" !==  Uint8Array) {
      buf = new Uint8Array(binstr.length);
    } else {
      buf = [];
    }

    Array.prototype.forEach.call(binstr, function (ch, i) {
      buf[i] = ch.charCodeAt(0);
    });

    return buf;
  }


  function utf8ToBuffer(str) {
    var binstr = utf8ToBinaryString(str),
      buf = binaryStringToBuffer(binstr);
    return buf;
  }

  function hex(buffer) {
    var hexCodes = [],
      view = new DataView(buffer),
      i,
      value,
      stringValue,
      padding,
      paddedValue;
    for (i = 0; i < view.byteLength; i += 4) {
    // Using getUint32 reduces the number 
    //of iterations needed (we process 4 bytes each time)
      value = view.getUint32(i);
    // toString(16) will give the hex representation
    //of the number without padding
      stringValue = value.toString(16);
    // We use concatenation and slice for padding
      padding = '00000000';
      paddedValue = (padding + stringValue).slice(-padding.length);
      hexCodes.push(paddedValue);
    }
  }

  function sha256(str) {
  // We transform the string into an arraybuffer.
    return crypto.subtle.digest("SHA-256", utf8ToBuffer(str))
      .then(function (hash) {
        return hex(hash);
      });
  }

  //function for JIO.js substorage
  //API for using String Key form user

  function CryptStorage(spec) {
    if (spec.key !== undefined && spec.key !== null
        && typeof spec.key === 'string') {
      this._key = spec.key;
      this._userkey = true;
      //hash the value of spec.key so if some one try to get it back
      sha256(spec.key).then(function (digest) {spec.key =  digest; });
      this._sub_storage = jIO.createJIO(spec.sub_storage);
    } else {
      spec.key = null;
      this._userkey = false;
      this._key = null;
      this._sub_storage = jIO.createJIO(spec.sub_storage);
    }
  }

  function convertKey(that) {
    return new RSVP.Queue()
      .push(function () {
        var passphraseKey = utf8ToBuffer(that._key);
        return window.crypto.subtle.importKey(
          "raw",
          passphraseKey,
          {
            name: "PBKDF2"
          },
          false,
          ["deriveBits", "deriveKey"
            ]
        );
      })
      .push(function (key) {
        return window.crypto.subtle.deriveKey({
          "name": "PBKDF2",
          "salt": hexToBuffer("6f0904840608c09ae18c131542fbd1bd"),
          "iterations": 1000,
          //we can add iteration number but slow CPU will freez
          "hash": "SHA-256"
        }, key, {
          "name": "AES-GCM",
          "length": 256
        }, false, ["encrypt", "decrypt"]);
      })
      .push(function (res) {
        that._key = res;
        that._userkey = false;
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
    if (that._key !== null) {
      return new RSVP.Queue()
        .push(function () {
          if (that._userkey === true) {
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
        });
    } //if the password is not a string or null or undefined
      //we do not crypt data
    return that._sub_storage.putAttachment(id, name, blob);
  };

  CryptStorage.prototype.getAttachment = function (id, name) {
    var that = this;
    if (that._key !== null) {
      return that._sub_storage.getAttachment(id, name)
        .push(function (blob) {
          if (blob.type !== MIME_TYPE) {
            return blob;
          }
          return new RSVP.Queue()
            .push(function () {
              if (that._userkey === true) {
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
                    name: "AES-GCM",
                    iv: initializaton_vector
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
    }
      //if the password is not a string or null or undefined
      //we do not crypt data
    return that._sub_storage.getAttachment(id, name);
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