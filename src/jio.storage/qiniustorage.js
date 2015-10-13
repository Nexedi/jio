/*
 * Copyright 2015, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/**
 * JIO Qiniu Storage. Type = "qiniu".
 * Qiniu "database" storage.
 * Qiniu storage not support resource manage operation,
 * so remove,removeAttachment,allDocs,allAttachment isn't working
 */

/*global JSON, FormData, btoa, Blob, CryptoJS, define,
jIO, RSVP, console, UriTemplate */
/*jslint indent: 2, maxlen: 80, nomen: true, bitwise: true */
(function (jIO, RSVP, Blob, UriTemplate) {
  "use strict";
  var METADATA_URL = "http://{+bucket}/{+key}?e=" +
    "{+DEADLINE}&token={+access_key}:{+token}",
    metadata_template = UriTemplate.parse(METADATA_URL),
    UPLOAD_URL = "http://up.qiniu.com/",
    DEADLINE = 2451491200;

  function urlsafe_base64_encode(string) {
    return string
      .replace(/\+/g, '-') // Convert '+' to '-'
      .replace(/\//g, '_'); // Convert '/' to '_'
//     .replace(/=+$/, ''); // Remove ending '='
  }

  function b64_hmac_sha1(secret_key, message) {
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

    return urlsafe_base64_encode(btoa(encodedString));
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

  QiniuStorage.prototype._put = function (key, blob, update) {
    var data,
      put_policy,
      encoded,
      encode_signed,
      upload_token;

    data = new FormData();
    if (update === true) {
      put_policy = JSON.stringify({
        "scope": "bucket" + ':' + key,
        "deadline": DEADLINE
      });
    } else {
      put_policy = JSON.stringify({
        "scope": "bucket",
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
      blob,
      key
    );

    return jIO.util.ajax({
      "type": "POST",
      "url": UPLOAD_URL,
      "data": data
    });

  };

  /**
   * Add an attachment to a document
   *
   * @method putAttachment
   * @id  {Object} Document id
   * @param  {Object} param The given parameters
   * @blob  {Object} attachment packaged into a blob
   */
  QiniuStorage.prototype.putAttachment = function (id, param, blob) {
    var gadget = this;
    return new RSVP.Queue()
      .push(function () {
        return gadget._put(
          id + "/" + param,
          blob,
          true
        );
      });
  };

  QiniuStorage.prototype._get = function (key) {
    var download_url = 'http://' + this._bucket + '/' + key
      + '?e=' + DEADLINE,
      token = b64_hmac_sha1(this._secret_key, download_url),
      gadget = this;

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "GET",
          url: metadata_template.expand({
            bucket: gadget._bucket,
            key: key,
            DEADLINE: DEADLINE,
            access_key: gadget._access_key,
            token: token
          })
        });
      });
  };

  /**
   * Get an attaURITemplatechment
   *
   * @method getAttachment
   * @param  {Object} param The given parameters
   * @param  {Object} attachment attachment name
   */
  QiniuStorage.prototype.getAttachment = function (param, attachment) {
    var gadget = this;

    return new RSVP.Queue()
      .push(function () {
        return gadget._get(param + "/" + attachment);
      })
      .push(function (doc) {
        if (doc.target.response !== undefined) {
          return new Blob([doc.target.response]);
        }
        if (doc.target !== undefined) {
          doc.id = param;
          doc.target.attachment = attachment;
          return new Blob([JSON.stringify(doc)], {type: "application/json"});
        }

      }).push(undefined, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find attachment: "
                                      + param._id + " , " + param._attachment,
                                      404);
        }
        throw error;
      });

  };

  /**
   * Add an attachment to a document
   *
   * @method putAttachment
   * @id  {Object} Document id
   * @param  {Object} param The given parameters
   * @blob  {Object} attachment packaged into a blob
   */
  QiniuStorage.prototype.putAttachment = function (id, param, blob) {
    var gadget = this;
    return new RSVP.Queue()
      .push(function () {
        return gadget._put(
          id + "/" + param,
          blob,
          true
        );
      });
  };

  jIO.addStorage('qiniu', QiniuStorage);
}(jIO, RSVP, Blob, UriTemplate));
