/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, btoa, b64_hmac_sha1, jQuery, XMLHttpRequest, XHRwrapper,
  FormData*/
/**
 * JIO S3 Storage. Type = "s3".
 * Amazon S3 "database" storage.
 */
// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jQuery, {b64_hmac_sha1: b64_hmac_sha1});
}(['jio', 'jquery', 'sha1'], function (jIO, $, sha1) {
  "use strict";
  var b64_hmac_sha1 = sha1.b64_hmac_sha1;

  jIO.addStorageType("s3", function (spec, my) {
    var evt, that, priv = {};
    spec = spec || {};
    that = my.basicStorage(spec, my);

    // attributes
    priv.username = spec.username || '';
    priv.AWSIdentifier = spec.AWSIdentifier || '';
    priv.password = spec.password || '';
    priv.server = spec.server || ''; /*|| jiobucket ||*/
    priv.acl = spec.acl || '';

    /*||> "private,
          public-read,
          public-read-write,
          authenticated-read,
          bucket-owner-read,
          bucket-owner-full-control" <||*/

    priv.actionStatus = spec.actionStatus || '';

    priv.contenTType = spec.contenTType || '';

    /**
     * Update [doc] the document object and remove [doc] keys
     * which are not in [new_doc]. It only changes [doc] keys not starting
     * with an underscore.
     * ex: doc:     {key:value1,_key:value2} with
     *     new_doc: {key:value3,_key:value4} updates
     *     doc:     {key:value3,_key:value2}.
     * @param  {object} doc The original document object.
     * @param  {object} new_doc The new document object
    **/

    priv.secureDocId = function (string) {
      var split = string.split('/'), i;
      if (split[0] === '') {
        split = split.slice(1);
      }
      for (i = 0; i < split.length; i += 1) {
        if (split[i] === '') {
          return '';
        }
      }
      return split.join('%2F');
    };

      /**
     * Replace substrings to another strings
     * @method recursiveReplace
     * @param  {string} string The string to do replacement
     * @param  {array} list_of_replacement An array of couple
     * ["substring to select", "selected substring replaced by this string"].
     * @return {string} The replaced string
     */
    priv.recursiveReplace = function (string, list_of_replacement) {
      var i, split_string = string.split(list_of_replacement[0][0]);
      if (list_of_replacement[1]) {
        for (i = 0; i < split_string.length; i += 1) {
          split_string[i] = priv.recursiveReplace(
            split_string[i],
            list_of_replacement.slice(1)
          );
        }
      }
      return split_string.join(list_of_replacement[0][1]);
    };

    /**
     * Changes / to %2F, % to %25 and . to _.
     * @method secureName
     * @param  {string} name The name to secure
     * @return {string} The secured name
     */
    priv.secureName = function (name) {
      return priv.recursiveReplace(name, [["/", "%2F"], ["%", "%25"]]);
    };

    /**
     * Restores the original name from a secured name
     * @method restoreName
     * @param  {string} secured_name The secured name to restore
     * @return {string} The original name
     */
    priv.restoreName = function (secured_name) {
      return priv.recursiveReplace(secured_name, [["%2F", "/"], ["%25", "%"]]);
    };

    /**
     * Convert document id and attachment id to a file name
     * @method idsToFileName
     * @param  {string} doc_id The document id
     * @param  {string} attachment_id The attachment id (optional)
     * @return {string} The file name
     */
    priv.idsToFileName = function (doc_id, attachment_id) {
      doc_id = priv.secureName(doc_id).split(".").join("_.");
      if (typeof attachment_id === "string") {
        attachment_id = priv.secureName(attachment_id).split(".").join("_.");
        return doc_id + "." + attachment_id;
      }
      return doc_id;
    };

    /**
     * Convert a file name to a document id (and attachment id if there)
     * @method fileNameToIds
     * @param  {string} file_name The file name to convert
     * @return {array} ["document id", "attachment id"] or ["document id"]
     */
    priv.fileNameToIds = function (file_name) {
      var separator_index = -1, split = file_name.split(".");
      split.slice(0, -1).forEach(function (file_name_part, index) {
        if (file_name_part.slice(-1) !== "_") {
          separator_index = index;
        }
      });
      if (separator_index === -1) {
        return [priv.restoreName(priv.restoreName(
          file_name
        ).split("_.").join("."))];
      }
      return [
        priv.restoreName(priv.restoreName(
          split.slice(0, separator_index + 1).join(".")
        ).split("_.").join(".")),
        priv.restoreName(priv.restoreName(
          split.slice(separator_index + 1).join(".")
        ).split("_.").join("."))
      ];
    };

    /**
     * Removes the last character if it is a "/". "/a/b/c/" become "/a/b/c"
     * @method removeSlashIfLast
     * @param  {string} string The string to modify
     * @return {string} The modified string
     */
    priv.removeSlashIfLast = function (string) {
      if (string[string.length - 1] === "/") {
        return string.slice(0, -1);
      }
      return string;
    };



    that.documentObjectUpdate = function (doc, new_doc) {
      var k;
      for (k in doc) {
        if (doc.hasOwnProperty(k)) {
          if (k[0] !== '_') {
            delete doc[k];
          }
        }
      }
      for (k in new_doc) {
        if (new_doc.hasOwnProperty(k)) {
          if (k[0] !== '_') {
            doc[k] = new_doc[k];
          }
        }
      }
    };

    /**
     * Checks if an object has no enumerable keys
     * @method objectIsEmpty
     * @param  {object} obj The object
     * @return {boolean} true if empty, else false
     */

    that.objectIsEmpty = function (obj) {
      var k;
      for (k in obj) {
        if (obj.hasOwnProperty(k)) {
          return false;
        }
      }
      return true;
    };

    // ===================== overrides ======================
    that.specToStore = function () {
      return {
        "username": priv.username,
        "password": priv.password,
        "server": priv.server,
        "acl": priv.acl
      };
    };

    that.validateState = function () {
      // xxx complete error message
      // jjj completion below

      if (typeof priv.AWSIdentifier === "string" && priv.AWSIdentifier === '') {
        return 'Need at least one parameter "Aws login".';
      }
      if (typeof priv.password === "string" && priv.password === '') {
        return 'Need at least one parameter "password".';
      }
      if (typeof priv.server === "string" && priv.server === '') {
        return 'Need at least one parameter "server".';
      }
      return '';
    };

    // =================== S3 Specifics =================
    /**
     * Encoding the signature using a stringToSign
     * Encoding the policy
     * @method buildStringToSign
     * @param  {string} http_verb The HTTP method
     * @param  {string} content_md5 The md5 content
     * @param  {string} content_type The content type
     * @param  {number} expires The expires time
     * @param  {string} x_amz_headers The specific amazon headers
     * @param  {string} path_key The path of the document
     * @return {string} The generated signature
     */

    // xxx no need to make it public, use private -> "priv" (not "that")
    priv.buildStringToSign = function (http_verb, content_md5, content_type,
                                      expires, x_amz_headers, path_key) {
      //example :
      // var StringToSign = S3.buildStringToSign(S3.httpVerb,'','','',
      //   'x-amz-date:'+S3.requestUTC,'/jio1st/prive.json');

      var StringToSign = http_verb + '\n'
        + content_md5 + '\n'//content-md5
        + content_type + '\n'//content-type
        + expires + '\n'//expires
        + x_amz_headers + '\n'//x-amz headers
        + path_key;//path key

      return StringToSign;
    };




    that.encodePolicy = function (form) {
      //generates the policy
      //enables the choice for the http response code
      var http_code, s3_policy, Signature = '';
      s3_policy = {
        "expiration": "2020-01-01T00:00:00Z",
        "conditions": [
          {"bucket": priv.server },
          ["starts-with", "$key", ""],
          {"acl": priv.acl },
          {"success_action_redirect": ""},
          {"success_action_status": http_code },
          ["starts-with", "$Content-Type", ""],
          ["content-length-range", 0, 524288000]
        ]
      };

      //base64 encoding of the policy (native base64 js >>
      // .btoa() = encode, .atob() = decode)
      priv.b64_policy = btoa(JSON.stringify(s3_policy));
      //generates the signature value using the policy and the secret access key
      //use of sha1.js to generate the signature
      Signature = that.signature(priv.b64_policy);

    };

    that.signature = function (string) {
      var Signature = b64_hmac_sha1(priv.password, string);
      return Signature;
    };

    function xhr_onreadystatechange(docId,
      command,
      obj,
      http,
      jio,
      isAttachment,
      callback) {
      obj.onreadystatechange = function () {
        var response, err = '';
        if (obj.readyState === 4) {
          if (this.status === 204 || this.status === 201 ||
              this.status === 200) {
            switch (http) {
            case "POST":
              that.success({
                ok: true,
                id: docId
              });
              break;
            case 'PUT':
              if (jio === true) {
                that.success({
                  ok: true,
                  id: command.getDocId()
                });
              } else {
                callback(this.responseText);
              }
              break;
            case 'GET':
              if (jio === true) {
                if (typeof this.responseText !== 'string') {
                  response = JSON.parse(this.responseText);
                  response._attachments = response._attachments || {};
                  delete response._attachments;
                  that.success(JSON.stringify(response));
                } else {
                  if (isAttachment === true) {
                    that.success(this.responseText);
                  } else {
                    that.success(JSON.parse(this.responseText));
                  }
                }
              } else {
                callback(this.responseText);
              }
              break;
            case 'DELETE':
              if (jio === true) {
                if (isAttachment === false) {
                  that.success({
                    ok: true,
                    id: command.getDocId()
                  });
                } else {
                  that.success({
                    ok: true,
                    id: command.getDocId(),
                    attachment: command.getAttachmentId()
                  });
                }
              } else {
                callback(this.responseText);
              }
              break;
            }
          } else {
            err = this;
            if (this.status === 405) {
                //status
                //statustext "Not Found"
                //error
                //reason "reason"
                //message "did not work"
              err.error = "not_allowed";
              that.error(err);
            }
            if (this.status === 404) {
              if (http === 'GET') {
                if (jio === true) {
                  //status
                  //statustext "Not Found"
                  //error
                  //reason "reason"
                  //message "did not work"
                  err.statustext = "not_foud";
                  err.reason = "file does not exist";
                  err.error = "not_found";
                  that.error(err);
                } else {

                  callback('404');
                }
              } else {
                //status
                //statustext "Not Found"
                //error
                //reason "reason"
                //message "did not work"
                err.error = "not_found";
                that.error(err);
              }
            }
            if (this.status === 409) {
                //status
                //statustext "Not Found"
                //error
                //reason "reason"
                //message "did not work"
              err.error = "already_exists";
              that.error(err);
            }
          }
        }
      };
    }

    priv.updateMeta = function (doc, docid, attachid, action, data) {
      doc._attachments = doc._attachments || {};
      switch (action) {
      case "add":
        doc._attachments[attachid] = data;
        //nothing happens
        doc = JSON.stringify(doc);
        break;
      case "remove":
        if (doc._attachments !== undefined) {
          delete doc._attachments[attachid];
        }
        doc = JSON.stringify(doc);
        break;
      case "update":
        doc._attachments[attachid] = data;
        //update happened in the put request
        doc = JSON.stringify(doc);
        break;
      }
      return doc;
    };

    priv.createError = function (status, message, reason) {
      var error = {
        "status": status,
        "message": message,
        "reason": reason
      };
      switch (status) {
      case 404:
        error.statusText = "Not found";
        break;
      case 405:
        error.statusText = "Method Not Allowed";
        break;
      case 409:
        error.statusText = "Conflicts";
        break;
      case 24:
        error.statusText = "Corrupted Document";
        break;
      }
      error.error = error.statusText.toLowerCase().split(" ").join("_");
      return error;
    };

    that.encodeAuthorization = function (key, mime) {
      //GET oriented method
      var requestUTC, httpVerb, StringToSign, Signature;
      requestUTC = new Date().toUTCString();
      httpVerb = "GET";
      StringToSign = priv.buildStringToSign(
        httpVerb,
        '',
        'application/json',
        '',
        'x-amz-date:' + requestUTC,
        '/' + priv.server + '/' + key
      );
      Signature = b64_hmac_sha1(priv.password, StringToSign);
      return Signature;
    };

    that.XHRwrapper = function (command,
                        docId,
                        attachId,
                        http,
                        mime,
                        data,
                        jio,
                        is_attachment,
                        callback) {

      var docFile, requestUTC, StringToSign, url, Signature, xhr;
      docFile = priv.secureName(priv.idsToFileName(docId,
        attachId || undefined));

      requestUTC = new Date().toUTCString();

      StringToSign = priv.buildStringToSign(
        http,
        '',
        mime,
        '',
        'x-amz-date:' + requestUTC,
        '/' + priv.server + '/' + docFile
      );

      url = 'http://s3.amazonaws.com/' + priv.server + '/' + docFile;

      Signature = b64_hmac_sha1(priv.password, StringToSign);
      xhr = new XMLHttpRequest();

      xhr.open(http, url, true);
      xhr.setRequestHeader("HTTP-status-code", "100");
      xhr.setRequestHeader("x-amz-date", requestUTC);
      xhr.setRequestHeader("Authorization", "AWS "
        + priv.AWSIdentifier
        + ":"
        + Signature);
      xhr.setRequestHeader("Content-Type", mime);
      xhr.responseType = 'text';

      xhr_onreadystatechange(docId,
        command,
        xhr,
        http,
        jio,
        is_attachment,
        callback);

      if (http === 'PUT') {
        xhr.send(data);
      } else {
        xhr.send(null);
      }
    };

    // ==================== commands ====================
    /**
     * Create a document in local storage.
     * @method post
     * @param  {object} command The JIO command
    **/

    that.post = function (command) {
      //as S3 encoding key are directly inserted within the FormData(),
      //use of XHRwrapper function ain't pertinent

      var doc, doc_id, mime;
      doc = command.cloneDoc();
      doc_id = command.getDocId();

      function postDocument() {
        var http_response, fd, Signature, xhr;
        doc_id = priv.secureName(priv.idsToFileName(doc_id));
        //Meant to deep-serialize in order to avoid
        //conflicts due to the multipart enctype
        doc = JSON.stringify(doc);
        http_response = '';
        fd = new FormData();
        //virtually builds the form fields
        //filename
        fd.append('key', doc_id);
        //file access authorizations
        priv.acl = "";
        fd.append('acl', priv.acl);
        //content-type
        priv.contenTType = "text/plain";
        fd.append('Content-Type', priv.contenTType);
        //allows specification of a success url redirection
        fd.append('success_action_redirect', '');
        //allows to specify the http code response if the request is successful
        fd.append('success_action_status', http_response);
        //login AWS
        fd.append('AWSAccessKeyId', priv.AWSIdentifier);
        //exchange policy with the amazon s3 service
        //can be common to all uploads or specific
        that.encodePolicy(fd);
        //priv.b64_policy = that.encodePolicy(fd);
        fd.append('policy', priv.b64_policy);
        //signature through the base64.hmac.sha1(secret key, policy) method
        Signature = b64_hmac_sha1(priv.password, priv.b64_policy);
        fd.append('signature', Signature);
        //uploaded content !!may must be a string rather than an object
        fd.append('file', doc);
        xhr = new XMLHttpRequest();
        xhr_onreadystatechange(doc_id, command, xhr, 'POST', true, false, '');
        xhr.open('POST', 'https://' + priv.server + '.s3.amazonaws.com/', true);
        xhr.send(fd);
      }

      if (doc_id === '' || doc_id === undefined) {
        doc_id = 'no_document_id_'
          + ((Math.random() * 10).toString().split('.'))[1];
        doc._id = doc_id;
      }

      mime = 'text/plain; charset=UTF-8';
      that.XHRwrapper(command, doc_id, '', 'GET', mime, '', false, false,
        function (response) {
          if (response === '404') {
            postDocument();
          } else {
          //si ce n'est pas une 404,
          //alors on renvoit une erreur 405
            return that.error(priv.createError(
              409,
              "Cannot create document",
              "Document already exists"
            ));
          }
        }
        );
    };

    /**
    * Get a document or attachment
    * @method get
    * @param  {object} command The JIO command
    **/

    that.get = function (command) {
      var docId, attachId, isJIO, mime;
      docId = command.getDocId();
      attachId = command.getAttachmentId() || '';
      isJIO = true;
      mime = 'text/plain; charset=UTF-8';
      that.XHRwrapper(command, docId, attachId, 'GET', mime, '', isJIO, false);
    };

    that.getAttachment = function (command) {
      var docId, attachId, isJIO, mime;
      docId = command.getDocId();
      attachId = command.getAttachmentId();
      isJIO = true;
      mime = 'text/plain; charset=UTF-8';
      that.XHRwrapper(command, docId, attachId, 'GET', mime, '', isJIO, true);
    };

    /**
     * Create or update a document in local storage.
     * @method put
     * @param  {object} command The JIO command
     **/

    that.put = function (command) {
      var doc, docId, mime;
      doc = command.cloneDoc();
      docId = command.getDocId();
      mime = 'text/plain; charset=UTF-8';
      //pas d'attachment dans un put simple
      function putDocument() {
        var attachId, data, isJIO;
        attachId = '';
        data  = JSON.stringify(doc);
        isJIO = true;
        that.XHRwrapper(command,
          docId,
          attachId,
          'PUT',
          mime,
          data,
          isJIO,
          false);
      }

      that.XHRwrapper(command, docId, '', 'GET', mime, '', false, false,
        function (response) {
          //if (response === '404') {}
          if (response._attachments !== undefined) {
            doc._attachments = response._attachments;
          }
          putDocument();
        }
        );
    };

    that.putAttachment = function (command) {
      var mon_document,
        docId,
        attachId,
        mime,
        attachment_id,
        attachment_data,
        attachment_md5,
        attachment_mimetype,
        attachment_length;

      mon_document = null;
      docId = command.getDocId();
      attachId = command.getAttachmentId() || '';
      mime = 'text/plain; charset=UTF-8';
      //récupération des variables de l'attachement

      attachment_id = command.getAttachmentId();
      attachment_data = command.getAttachmentData();
      attachment_md5 = command.md5SumAttachmentData();
      attachment_mimetype = command.getAttachmentMimeType();
      attachment_length = command.getAttachmentLength();

      function putAttachment() {
        that.XHRwrapper(command,
          docId,
          attachId,
          'PUT',
          mime,
          attachment_data,
          false,
          true,
          function (reponse) {
            that.success({
              // response
              "ok": true,
              "id": docId,
              "attachment": attachId
              //"rev": current_revision
            });
          }
          );
      }

      function putDocument() {
        var attachment_obj, data, doc;
        attachment_obj = {
          //"revpos": 3, // optional
          "digest": attachment_md5,
          "content_type": attachment_mimetype,
          "length": attachment_length
        };
        data = JSON.parse(mon_document);

        doc = priv.updateMeta(data, docId, attachId, "add", attachment_obj);

        that.XHRwrapper(command, docId, '', 'PUT', mime, doc, false, false,
          function (reponse) {
            putAttachment();
          }
          );
      }

      function getDocument() {
        //XHRwrapper(command,'PUT','text/plain; charset=UTF-8',true);
        that.XHRwrapper(command, docId, '', 'GET', mime, '', false, false,
          function (reponse) {
            if (reponse === '404') {
              return that.error(priv.createError(
                404,
                "Cannot find document",
                "Document does not exist"
              ));
            }
            mon_document = reponse;
            putDocument();
          }
          );
      }
      getDocument();
    };

    /**
     * Remove a document or attachment
     * @method remove
     * @param  {object} command The JIO command
     */

    that.remove = function (command) {
      var docId, mime;
      docId = command.getDocId();
      mime = 'text/plain; charset=UTF-8';

      function deleteDocument() {
        that.XHRwrapper(command, docId, '', 'DELETE', mime, '', true, false,
          function (reponse) {
            that.success({
              // response
              "ok": true,
              "id": docId
              //"rev": current_revision
            });
          }
          );
      }

      function myCallback(response) {
      }

      that.XHRwrapper(command, docId, '', 'GET', mime, '', false, false,
        function (response) {
          var attachKeys, keys;
          attachKeys = (JSON.parse(response))._attachments;
          for (keys in attachKeys) {
            if (attachKeys.hasOwnProperty(keys)) {
              that.XHRwrapper(command,
                docId,
                keys,
                'DELETE',
                mime,
                '',
                false,
                false,
                myCallback
                );
            }
          }
          deleteDocument();
        }
        );
    };

    that.removeAttachment = function (command) {
      var mon_document,
        docId,
        attachId,
        mime,
        attachment_id,
        attachment_data,
        attachment_md5,
        attachment_mimetype,
        attachment_length;

      mon_document = null;
      docId = command.getDocId();
      attachId = command.getAttachmentId() || '';
      mime = 'text/plain; charset=UTF-8';
      //récupération des variables de l'attachement

      attachment_id = command.getAttachmentId();
      attachment_data = command.getAttachmentData();
      attachment_md5 = command.md5SumAttachmentData();
      attachment_mimetype = command.getAttachmentMimeType();
      attachment_length = command.getAttachmentLength();

      function removeAttachment() {
        that.XHRwrapper(command, docId, attachId, 'DELETE', mime, '', true,
          true, function (reponse) {
          }
          );
      }

      function putDocument() {
        var data, doc;
        data = JSON.parse(mon_document);
        doc = priv.updateMeta(data, docId, attachId, "remove", '');
        that.XHRwrapper(command, docId, '', 'PUT', mime, doc,
          false, false, function (reponse) {
            removeAttachment();
          }
          );
      }

      function getDocument() {
        that.XHRwrapper(command, docId, '', 'GET', mime, '', false, false,
          function (reponse) {
            mon_document = reponse;
            putDocument();
          }
          );
      }
      getDocument();
    };

    /**
     * Get all filenames belonging to a user from the document index
     * @method allDocs
     * @param  {object} command The JIO command
    **/

    that.allDocs = function (command) {
      var mon_document, mime;
      mon_document = null;
      mime = 'text/plain; charset=UTF-8';

      function makeJSON() {
        var keys,
          resultTable,
          counter,
          allDocResponse,
          count,
          countB,
          dealCallback,
          errCallback,
          i,
          keyId,
          Signature,
          callURL,
          requestUTC,
          parse,
          checkCounter;

        keys = $(mon_document).find('Key');

        resultTable = [];
        counter = 0;

        keys.each(function (index) {
          var that, filename, docId;
          that = $(this);
          filename = that.context.textContent;
          docId = priv.idsToFileName(priv.fileNameToIds(filename)[0]);
          if (counter === 0) {
            counter += 1;
            resultTable.push(docId);
          } else if (docId !== resultTable[counter - 1]) {
            counter += 1;
            resultTable.push(docId);
          }
        });

        allDocResponse = {
          // document content will be added to response
          "total_rows": resultTable.length,
          "offset": 0,
          "rows": []
        };

        //needed to save the index within the $.ajax.success() callback
        count = resultTable.length - 1;
        countB = 0;

        dealCallback = function (i, countB, allDoc) {
          return function (doc, statustext, response) {
            allDoc.rows[i].doc = response.responseText;
            if (count === 0) {
              that.success(allDoc);
            } else {
              count -= 1;
            }
          };
        };

        errCallback = function (err) {
          if (err.status === 404) {
            //status
            //statustext "Not Found"
            //error
            //reason "reason"
            //message "did not work"
            err.error = "not_found";
            that.error(err);
          } else {
            return that.retry(err);
          }
        };

        i = resultTable.length - 1;

        if (command.getOption("include_docs") === true) {

          for (i; i >= 0; i -= 1) {
            keyId = resultTable[i];
            Signature = that.encodeAuthorization(keyId);
            callURL = 'http://' + priv.server + '.s3.amazonaws.com/' + keyId;
            requestUTC = new Date().toUTCString();
            parse = true;

            allDocResponse.rows[i] = {
              "id": priv.fileNameToIds(keyId).join(),
              "key": keyId,
              "value": {}
            };
            checkCounter = i;

            $.ajax({
              contentType : '',
              crossdomain : true,
              url : callURL,
              type : 'GET',
              headers : {
                'Authorization' : "AWS"
                  + " "
                  + priv.AWSIdentifier
                  + ":"
                  + Signature,
                'x-amz-date' : requestUTC,
                'Content-Type' : 'application/json'
                //'Content-MD5' : ''
                //'Content-Length' : ,
                //'Expect' : ,
                //'x-amz-security-token' : ,
              },
              success : dealCallback(i, countB, allDocResponse),
              error : errCallback(that.error)
            });
            countB += 1;
          }
        } else {
          for (i; i >= 0; i -= 1) {
            keyId = resultTable[i];
            allDocResponse.rows[i] = {
              "id": priv.fileNameToIds(keyId).join(),
              "key": keyId,
              "value": {}
            };
          }
          that.success(allDocResponse);
        }
      }

      function getXML() {
        //XHRwrapper(command,'PUT','text/plain; charset=UTF-8',true);
        that.XHRwrapper(command, '', '', 'GET', mime, '', false, false,
          function (reponse) {
            mon_document = reponse;
            makeJSON();
          }
          );
      }

      getXML();
      //fin alldocs
    };
    return that;
  });

}));
