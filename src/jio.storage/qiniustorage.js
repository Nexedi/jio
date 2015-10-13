/*
 * Copyright 2013, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/**
 * JIO Qiniu Storage. Type = "qiniu".
 * Qiniu "database" storage.
 */
/*global JSON, FormData, btoa, Blob, CryptoJS, define, jIO, RSVP, console */
/*jslint indent: 2, maxlen: 80, nomen: true, unparam: true, bitwise: true */
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
//   if (typeof exports === 'object') {
//     return module(exports, require('jio'));
//   }
  module(jIO);
}([
  'jio'
], function (jIO) {
  "use strict";

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

  var UPLOAD_URL = "http://up.qiniu.com/",
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
    });

  };

  QiniuStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };
  QiniuStorage.prototype.buildQuery = function () {
   // return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
    var gadget = this;
    return new RSVP.Queue()
      .push(function () {
        return gadget.allDocs();
      })
      .push(function (result) {
        console.log("result", result);
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
    }).fail(function (event) {
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
  QiniuStorage.prototype.put = function (id, param) {
    var gadget = this;
    return new RSVP.Queue()
      .push(function () {
        return gadget._put(
          id,
          new Blob([JSON.stringify(param)], {type: "application/json"}),
          true
        );
      })
      .push(function (doc) {
        return doc;
      });
  /* return this._put(
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
    }).fail(function (event) {
      command.error(
        event.target.status,
        event.target.statusText,
        "Unable to put doc"
      );
    }); */
  };

  QiniuStorage.prototype._get = function (key) {
    var download_url = 'http://' + this._bucket + '/' + key
    //     var download_url = 'http://' + this._bucket + '.dn.qbox.me/' + key
      + '?e=' + DEADLINE,
      downloadurl = '',
      token = b64_hmac_sha1(this._secret_key, download_url);
    downloadurl = download_url + "&token=" + this._access_key + ':' + token;
    return jIO.util.ajax({
      "type": "GET",
      "url": downloadurl
      //       "dataType": "blob"
    });
  };

  /**
  * Get a document or attachment
  * @method get
  * @param  {object} command The JIO command
  **/
  QiniuStorage.prototype.get = function (id) {
    var gadget = this;
    return new RSVP.Queue()
      .push(function () {
        return gadget._get(id);
      })
      .push(function (doc) {
        if (doc.target.response !== undefined) {
          return JSON.parse(doc.target.response);
        }
        if (doc.target.responseText !== undefined) {
          return JSON.parse(doc.target.responseText);
        }
      })
      .push(undefined, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });
  };

  /**
   * Get an attaURITemplatechment
   *
   * @method getAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  QiniuStorage.prototype.getAttachment = function (param, attachment) {
    var gadget = this;

    return new RSVP.Queue()
      .push(function () {
      //  return gadget._get(param._id + "/" + param._attachment);
        return gadget._get(param + "/" + attachment);
      })
      .push(function (doc) {
        if (doc.target.response !== undefined) {
          return new Blob([doc.target.response]);
        }
        if (doc.target !== undefined) {
          console.log("doc target", doc.target);
          doc.id = param;
          doc.target.attachment = attachment;
          return new Blob([JSON.stringify(doc)], {type: "application/json"});
        }

      }).fail(function (error) {
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
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   * @param  {Object} options The command options
   */
  QiniuStorage.prototype.putAttachment = function (id, param, blob) {
    var gadget = this;
/*    console.log("params id", id);
    console.log("params blob", param);
    console.log("param options", blob);
    console.log("param jio read blob", jIO.util.readBlobAsText(blob)); */
    return new RSVP.Queue()
      .push(function () {
        return gadget._put(
          id + "/" + param,
          blob,
          true
        );
      })
      .push(function (doc) {
        return doc;
      });
  };

  /**
   * Remove a document
   *
   * @method remove
   * @param  {Object} command The JIO command
   * @param  {Object} param The given parameters
   */
  QiniuStorage.prototype.removeAttachment = function (id, name) {
    var gadget = this,
      DELETE_HOST = "http://rs.qiniu.com",
      DELETE_PREFIX = "/delete/",
      encoded_entry_uri = urlsafe_base64_encode(btoa(
        this._bucket + ':' + id + "/" + name
      )),
      delete_url = DELETE_HOST + DELETE_PREFIX + encoded_entry_uri,
      data = DELETE_PREFIX + encoded_entry_uri + '\n',
      token = b64_hmac_sha1(gadget._secret_key, data);

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "POST",
          "url": delete_url,
          "headers": {
            "Authorization": "QBox " + gadget._access_key + ':' + token,
            "Content-Type": 'application/x-www-form-urlencoded'
          }
        });
      })
      .push(function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 401)) {
          throw new jIO.util.jIOError("Cannot find attachment: "
                                      + id, 401);
        }
        throw error;
      }).fail(function (error) {
        console.log("removeAttachment error", error);
      });
  };

  QiniuStorage.prototype.remove = function (id) {
    var gadget = this,
      DELETE_HOST = "http://rs.qiniu.com",
      DELETE_PREFIX = "/delete/",
      encoded_entry_uri = urlsafe_base64_encode(btoa(
        "bucket:" + id
      )),
      delete_url = DELETE_HOST + DELETE_PREFIX + encoded_entry_uri,
      data = DELETE_PREFIX + encoded_entry_uri + '\n{"id": id}',
      token = b64_hmac_sha1(gadget._secret_key, data);
    console.log(token);
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "POST",
          "url": delete_url,
          "headers": {
            "Authorization": 'QBox ' +  gadget._access_key + ':' + token,
            "Content-Type": 'application/x-www-form-urlencoded'
          }
        });
      })
      .push(function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 401)) {
          throw new jIO.util.jIOError("Cannot find attachment: "
                                      + id, 401);
        }
        throw error;
      });
  };

  QiniuStorage.prototype.allAttachments = function (param) {
    var LIST_HOST = "http://rsf.qbox.me",
      LIST_PREFIX = "/list?bucket=" + this._bucket + "/" + param,
      list_url = LIST_HOST + LIST_PREFIX,
      token = b64_hmac_sha1(this._secret_key, LIST_PREFIX + '\n'),
      that = this;

    return new RSVP.Queue()
      .push(function () {
        console.log("this AK", that);
        return jIO.util.ajax({
          "type": "POST",
          "url": list_url,
          "headers": {
            Authorization: "QBox " + that._access_key + ':' + token,
            "Content-Type": 'application/x-www-form-urlencoded'
          }
        });
      })
      .push(function (response) {
        console.log("response", response);
        /*var data = JSON.parse(response.target.responseText),
          count = data.items.length,
          result = [],
          item,
          i;
        for (i = 0; i < count; i += 1) {
          item = data.items[i];
          result.push({
            id: item.key,
            key: item.key,
            doc: {},
            value: {}
          });
        }*/
      }).fail(function (error) {
        console.log("allAttachment error", error);
      });
  };

  QiniuStorage.prototype.allDocs = function () {
    console.log("i am here");
    var gadget = this,
      // LIST_HOST = "http://rsf.qbox.me",
      LIST_PREFIX = "http://rsf.qbox.me/list?bucket=" +
         this._bucket + "&prefix="
         + encodeURIComponent("id"),
      // list_url = LIST_HOST + LIST_PREFIX,
      list_url = LIST_PREFIX,
      token = b64_hmac_sha1(this._secret_key, LIST_PREFIX + '\n');
    console.log("i am here");
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "POST",
          "url": list_url,
          "headers": {
            "Host": "rsf.qbox.me",
            "Authorization": "QBox " + gadget._access_key + ':' + token,
            "Content-Type": 'application/x-www-form-urlencoded'
          }
        });
      })
      .push(function (response) {
        console.log("response", response);
        var data = JSON.parse(response.target.responseText),
          count = data.items.length,
          result = [],
          item,
          i;
        for (i = 0; i < count; i += 1) {
          item = data.items[i];
          result.push({
            id: item.key,
            key: item.key,
            doc: {},
            value: {}
          });
        }
   //   command.success({"data": {"rows": result, "total_rows": count}});
      }).fail(function (error) {
        console.log("allDocs error", error);
      });

  };

  jIO.addStorage('qiniu', QiniuStorage);
}));
