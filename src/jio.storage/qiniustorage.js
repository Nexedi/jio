/*
 * Copyright 2015, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/**
 * JIO Qiniu Storage. Type = "qiniu".
 * Qiniu "database" storage.
 *
 * REMAINING WORK:
 * - removeAttachment should support CORS
 * - allAttachments should support CORS
 * - disable getAttachment HTTP cache
 */

/*global JSON, FormData, btoa, Blob, jIO, RSVP, UriTemplate, crypto,
         Uint8Array, TextEncoder*/
/*jslint nomen: true*/
(function (JSON, FormData, btoa, Blob, jIO, RSVP, UriTemplate, Crypto,
           Uint8Array, TextEncoder) {
  "use strict";
  var METADATA_URL = "http://{+bucket}/{+key}{?e,token}",
    metadata_template = UriTemplate.parse(METADATA_URL),
    UPLOAD_URL = "http://up.qiniu.com/",
    DEADLINE = 2451491200;

  function urlsafe_base64_encode(string) {
    return string
      .replace(/\+/g, '-') // Convert '+' to '-'
      .replace(/\//g, '_'); // Convert '/' to '_'
//     .replace(/=+$/, ''); // Remove ending '='
  }

  function bytesToASCIIString(bytes) {
    return String.fromCharCode.apply(null, new Uint8Array(bytes));
  }

  // http://blog.engelke.com/tag/webcrypto/
  function stringToArrayBuffer(string) {
    var encoder = new TextEncoder("utf-8");
    return encoder.encode(string);
  }

  function b64_hmac_sha1(secret_key, message) {
    return new RSVP.Queue()
      .push(function () {
        return Crypto.subtle.importKey(
          "raw",
          stringToArrayBuffer(secret_key),
          {name: "HMAC", hash: "SHA-1"},
          false,
          ["sign"]
        );
      })
      .push(function (key) {
        return Crypto.subtle.sign({
          name: "HMAC",
          hash: "SHA-1"
        }, key, stringToArrayBuffer(message));
      })
      .push(function (signature) {
        return urlsafe_base64_encode(btoa(bytesToASCIIString(signature)));
      });
  }


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

  function restrictDocumentId(id) {
    if (id !== "/") {
      throw new jIO.util.jIOError("id " + id + " is forbidden (!== /)",
                                  400);
    }
  }

  QiniuStorage.prototype.get = function (id) {
    restrictDocumentId(id);
    return {};
  };

  QiniuStorage.prototype.getAttachment = function (id, key) {
    restrictDocumentId(id);
    var context = this,
      download_url = metadata_template.expand({
        bucket: context._bucket,
        key: key,
        e: DEADLINE
      });

    return new RSVP.Queue()
      .push(function () {
        return b64_hmac_sha1(context._secret_key, download_url);
      })
      .push(function (token) {
        return jIO.util.ajax({
          type: "GET",
          url: metadata_template.expand({
            bucket: context._bucket,
            key: key,
            e: DEADLINE,
            token: context._access_key + ':' + token
          })
        });
      })
      .push(function (result) {
        return new Blob([result.target.response ||
                         result.target.responseText]);
      }, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find attachment: "
                                      + id + " , " + key,
                                      404);
        }
        throw error;
      });

  };

  QiniuStorage.prototype.putAttachment = function (id, key, blob) {
    restrictDocumentId(id);

    var data,
      context = this,
      put_policy,
      encoded,
      upload_token;

    data = new FormData();
    put_policy = JSON.stringify({
      "scope": "bucket" + ':' + key,
      "deadline": DEADLINE
    });

    encoded = btoa(put_policy);

    return new RSVP.Queue()
      .push(function () {
        return b64_hmac_sha1(context._secret_key, encoded);
      })
      .push(function (encode_signed) {
        upload_token = context._access_key + ":" + encode_signed + ":" +
          encoded;

        data.append("key", key);
        data.append("token", upload_token);
        data.append(
          "file",
          blob,
          key
        );

        return jIO.util.ajax({
          type: "POST",
          url: UPLOAD_URL,
          data: data
        });
      });
  };

  QiniuStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };

  QiniuStorage.prototype.buildQuery = function () {
    return [{
      id: "/",
      value: {}
    }];
  };

//   QiniuStorage.prototype.remove = function (command, param) {
//
//     var DELETE_HOST = "http://rs.qiniu.com",
//       DELETE_PREFIX = "/delete/",
//       encoded_entry_uri = urlsafe_base64_encode(btoa(
//         this._bucket + ':' + param._id
//       )),
//       delete_url = DELETE_HOST + DELETE_PREFIX + encoded_entry_uri,
//       data = DELETE_PREFIX + encoded_entry_uri + '\n',
//       token = b64_hmac_sha1(this._secret_key, data);
//
//     jIO.util.ajax({
//       "type": "POST",
//       "url": delete_url,
//       "headers": {
//         Authorization: "QBox " + this._access_key + ':' + token,
//         "Content-Type": 'application/x-www-form-urlencoded'
//       }
//     }).then(
//       command.success
//     ).fail(function (error) {
//       command.error(
//         "not_found",
//         "missing",
//         "Unable to delete doc"
//       );
//     });
//   };
//
//   QiniuStorage.prototype.allDocs = function (command, param, options) {
//     var LIST_HOST = "http://rsf.qiniu.com",
//       LIST_PREFIX = "/list?bucket=" + this._bucket,
//       list_url = LIST_HOST + LIST_PREFIX,
//       token = b64_hmac_sha1(this._secret_key, LIST_PREFIX + '\n');
//
//     jIO.util.ajax({
//       "type": "POST",
//       "url": list_url,
//       "headers": {
//         Authorization: "QBox " + this._access_key + ':' + token,
//         "Content-Type": 'application/x-www-form-urlencoded'
//       }
//     }).then(function (response) {
//       var data = JSON.parse(response.target.responseText),
//         count = data.items.length,
//         result = [],
//         item,
//         i;
//       for (i = 0; i < count; i += 1) {
//         item = data.items[i];
//         result.push({
//           id: item.key,
//           key: item.key,
//           doc: {},
//           value: {}
//         });
//       }
//       command.success({"data": {"rows": result, "total_rows": count}});
//     }).fail(function (error) {
//       command.error(
//         "error",
//         "did not work as expected",
//         "Unable to call allDocs"
//       );
//     });
//   };

  jIO.addStorage('qiniu', QiniuStorage);

}(JSON, FormData, btoa, Blob, jIO, RSVP, UriTemplate, crypto, Uint8Array,
  TextEncoder));
