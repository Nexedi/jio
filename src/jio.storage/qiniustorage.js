/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/**
 * JIO Qiniu Storage. Type = "qiniu".
 * Qiniu "database" storage.
 */
/*global FormData, btoa, Blob, CryptoJS */
/*jslint nomen: true, unparam: true, bitwise: true */
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
//   if (typeof exports === 'object') {
//     return module(exports, require('jio'), require('complex_queries'));
//   }
  module(jIO);
}([
  'jio'
], function (jIO) {
  "use strict";
  var b64_hmac_sha1 = function (secret_key, message) {
    // https://parse.com/questions/hmac-sha1-byte-order

    // Not sure why we have to do this, but we need to swap
    // the bytes inside each of the five
    // words that make up the encoded signature from b0, b1,
    // b2, b3 to b3, b2, b1, b0.
    var encodedArray = [],
      i,
      encoded = CryptoJS.HmacSHA1(message, secret_key),
      encodedString;
    for (i = 0; i < 5; i = i + 1) {
      encodedArray[(i * 4)] = ((encoded.words[i] & 0xff000000) >>> 24);
      encodedArray[(i * 4) + 1] = ((encoded.words[i] & 0x00ff0000) >>> 16);
      encodedArray[(i * 4) + 2] = ((encoded.words[i] & 0x0000ff00) >>> 8);
      encodedArray[(i * 4) + 3] = ((encoded.words[i] & 0x000000ff) >>> 0);
    }

    // Make string from our array of bytes that we just ordered.
    encodedString = String.fromCharCode.apply(null, encodedArray);

    return btoa(encodedString)
      .replace(/\+/g, '-') // Convert '+' to '-'
      .replace(/\//g, '_'); // Convert '/' to '_'
//       .replace(/=+$/, ''); // Remove ending '='
  },
    UPLOAD_URL = "http://up.qiniu.com/",
//     DEADLINE = 1451491200;
    DEADLINE = 2451491200;

  /**
   * The JIO QiniuStorage extension
   *
   * @class QiniuStorage
   * @constructor
   */
  function QiniuStorage(spec) {
    if (typeof spec.bucket !== 'string' && !spec.bucket) {
      throw new TypeError("Qiniu 'bucket' must be a string " +
                          "which contains more than one character.");
    }
    if (typeof spec.access_key !== 'string' && !spec.access_key) {
      throw new TypeError("Qiniu 'access_key' must be a string " +
                          "which contains more than one character.");
    }
    if (typeof spec.secret_key !== 'string' && !spec.secret_key) {
      throw new TypeError("Qiniu 'secret_key' must be a string " +
                          "which contains more than one character.");
    }

    this._bucket = spec.bucket;
    this._access_key = spec.access_key;
    this._secret_key = spec.secret_key;
  }

  QiniuStorage.prototype._put = function (key, blob, update) {
    var data,
      put_policy,
      encoded,
      encode_signed,
      upload_token;

    data = new FormData();
    if (update === true) {
      put_policy = JSON.stringify({
        "scope": this._bucket + ':' + key,
        "deadline": DEADLINE
      });
    } else {
      put_policy = JSON.stringify({
        "scope": this._bucket,
        "deadline": DEADLINE
      });
    }
    encoded = btoa(put_policy);
    encode_signed = b64_hmac_sha1(this._secret_key, encoded);
    upload_token = this._access_key + ":" + encode_signed + ":" + encoded;

    data.append("key", key);
    data.append("token", upload_token);
    data.append(
      "file",
      // new Blob([JSON.stringify(doc)], {type: "application/json"}),
      // new Blob([doc], {type: "application/json"}),
      blob,
//       new Blob([], {type: "application/octet-stream"}),
      key
    );

    return jIO.util.ajax({
      "type": "POST",
      "url": UPLOAD_URL,
      "data": data
//     }).then(function (doc) {
//       if (doc !== null) {
//         command.success({"data": doc});
//       } else {
//         command.error(
//           "not_found",
//           "missing",
//           "Cannot find document"
//         );
//       }
    });

  };

  /**
   * Create a document.
   *
   * @method post
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to store
   */
  QiniuStorage.prototype.post = function (command, metadata) {
    var doc = jIO.util.deepClone(metadata),
      doc_id = metadata._id;
    if (!doc_id) {
      doc_id = jIO.util.generateUuid();
      doc._id = doc_id;
    }
    return this._put(
      doc_id,
      new Blob([JSON.stringify(doc)], {type: "application/json"})
    ).then(function (doc) {
      if (doc !== null) {
        command.success({"id": doc_id});
      } else {
        command.error(
          "not_found",
          "missing",
          "Cannot find document"
        );
      }
    }, function (event) {
      command.error(
        event.target.status,
        event.target.statusText,
        "Unable to post doc"
      );
    });
  };

  /**
   * Update/create a document.
   *
   * @method put
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to store
   */
  QiniuStorage.prototype.put = function (command, metadata) {
    return this._put(
      metadata._id,
      new Blob([JSON.stringify(metadata)], {type: "application/json"}),
      true
    ).then(function (doc) {
      if (doc !== null) {
        command.success({"data": doc});
      } else {
        command.error(
          "not_found",
          "missing",
          "Cannot find document"
        );
      }
    }, function (event) {
      command.error(
        event.target.status,
        event.target.statusText,
        "Unable to put doc"
      );
    });
  };

  QiniuStorage.prototype._get = function (key) {
    var download_url = 'http://' + this._bucket + '.u.qiniudn.com/' + key
        + '?e=' + DEADLINE,
      token = b64_hmac_sha1(this._secret_key, download_url);

    return jIO.util.ajax({
      "type": "GET",
      "url": download_url + "&token=" + this._access_key + ':' + token
//       "dataType": "blob"
    });
  };

  /**
  * Get a document or attachment
  * @method get
  * @param  {object} command The JIO command
  **/
  QiniuStorage.prototype.get = function (command, param) {
    return this._get(param._id)
      .then(function (doc) {
        if (doc.target.responseText !== undefined) {
          command.success({"data": JSON.parse(doc.target.responseText)});
        } else {
          command.error(
            "not_found",
            "missing",
            "Cannot find document"
          );
        }
      }, function (event) {
        command.error(
          event.target.status,
          event.target.statusText,
          "Unable to get doc"
        );
      });
  };

  /**
   * Get an attachment
   *
   * @method getAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  QiniuStorage.prototype.getAttachment = function (command, param) {
    return this._get(param._id + "/" + param._attachment)
      .then(function (doc) {
        if (doc.target.response) {
          command.success({"data": doc.target.response});
        } else {
        // XXX Handle error
          command.error(
            "not_found",
            "missing",
            "Cannot find document"
          );
        }
      }, function (event) {
        command.error(
          event.target.status,
          event.target.statusText,
          "Unable to get attachment"
        );
      });
  };

  /**
   * Add an attachment to a document
   *
   * @method putAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  QiniuStorage.prototype.putAttachment = function (command, param) {
    return this._put(
      param._id + "/" + param._attachment,
      param._blob,
      true
    ).then(function (doc) {
      if (doc !== null) {
        command.success({"data": doc});
      } else {
        command.error(
          "not_found",
          "missing",
          "Cannot find document"
        );
      }
    }, function (event) {
      command.error(
        event.target.status,
        event.target.statusText,
        "Unable to put attachment"
      );
    });

  };

  jIO.addStorage('qiniu', QiniuStorage);
}));
