/*jslint nomen: true*/
/*global jIO, RSVP, Blob, Uint8Array, DOMParser*/
(function (jIO, Uint8Array, Blob, RSVP, DOMParser) {
  "use strict";

  var content_type_dict = {
    "application/x-asc-text": "docy",
    "application/x-asc-presentation": "",
    "application/x-asc-spreadsheet": ""
  };

  function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = window.atob(b64Data),
      byteArrays = [],
      slice,
      byteArray,
      byteNumbers = [],
      offset,
      i;

    for (offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      slice = byteCharacters.slice(offset, offset + sliceSize);
      for (i = 0; i < slice.length; i += 1) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {type: contentType});
  }

  function getInfoDocId(id, attachment_id) {
    return 'cloudoo/' + id + '/' + attachment_id;
  }

  function convert(storage, blob, from, to) {
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsDataURL(blob);
      })
      .push(function (result) {
        // WIP: use something cleaner
        var file = result.target.result.split('base64,')[1],
          xml = '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
            '<methodName>convertFile</methodName><params>' +
            '<param><value><string>' + file + '</string></value></param>' +
            '<param><value><string>' + from + '</string></value></param>' +
            '<param><value><string>' + to +
            '</string></value></param></params></methodCall>';
        return jIO.util.ajax({
          type: 'POST',
          url: storage._url,
          data: xml
        });
      })
      .push(function (result) {
        var data = (new DOMParser().parseFromString(
          result.currentTarget.response,
          "application/xml"
        )),
          content = data.getElementsByTagName('string')[0].textContent;
        if (content !== undefined) {
          return b64toBlob(content, to);
        }
        throw new jIO.util.jIOError('conversion failed', 400);
      });
  }

  function getOrCreateInfoDoc(storage, id, attachment_id) {
    return storage.get(getInfoDocId(id, attachment_id))
      .push(undefined, function (error) {
        if (error instanceof jIO.util.jIOError && error.status_code === 404) {
          return storage.get(id)
            .push(function (doc) {
              var format = doc.content_type || undefined;
              if (content_type_dict.hasOwnProperty(format)) {
                format = content_type_dict[format];
              }
              return {
                portal_type: "Conversion Info",
                convert_dict: {},
                format: format,
                attachment_id: attachment_id,
                doc_id: id
              };
            });
        }
        throw error;
      });
  }

  function convertAttachment(storage, id, attachment_id, format) {
    var info_doc;
    return getOrCreateInfoDoc(storage, id, attachment_id)
      .push(function (doc) {
        info_doc = doc;
        return storage.getAttachment(id, attachment_id)
          .push(function (blob) {
            return convert(storage, blob, info_doc.format, format);
          })
          .push(function (blob) {
            return storage.putAttachment(id, attachment_id + '?' + format)
              .push(function () {
                info_doc.convert_dict[format] = true;
                return storage.put(
                  getInfoDocId(id, attachment_id),
                  info_doc
                );
              })
              .push(function () {
                return blob;
              });
          }, undefined, function (error) {
            info_doc.convert_dict[format] = false;
            return storage.put(
              getInfoDocId(id, attachment_id),
              info_doc
            )
              .push(function () {
                throw error;
              });
          });
      });
  }

  function removeConvertedAttachment(storage, id, attachment_id) {
    var doc_info;
    return getOrCreateInfoDoc(storage, id, attachment_id)
      .push(function (doc) {
        var format, promise_list = [];
        doc_info = doc;
        for (format in doc.convert_list) {
          if (doc.convert_list.hasOwnProperty(format)) {
            if (doc.convert_list[format]) {
              promise_list.push(
                storage.removeAttachment(id, attachment_id + '?' + format)
              );
            }
          }
        }
        return RSVP.all(promise_list);
      })
      .push(function () {
        doc_info.convert_list = {};
        return doc_info;
      });
  }

  /**
   * The jIO CloudooStorage extension
   *
   * Convert attachment : att_id?format
   * cloudoo_info : 
   * {
   * portal_type: "Conversion Info"
   * base_format: format de base ( content_type du document )
   * to_convert_list: [liste des format a convertir pendant la synchro]
   * format_avaible_list : [liste des formats deja disponible]
   * }
   * 
   * @class CloudooStorage
   * @constructor
   */
  function CloudooStorage(spec) {
    this._url = spec.url;
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  CloudooStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.getAttachment = function (id, attachment_id) {
    var storage = this;
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments)
      .push(undefined, function (error) {
        var att_id_list = attachment_id.split('?');
        if (error instanceof jIO.util.jIOError &&
            error.status_code === 404 &&
            att_id_list.length > 1) {
          return convertAttachment(
            storage,
            id,
            att_id_list[0],
            att_id_list[1]
          );
        }
        throw error;
      });
  };
  CloudooStorage.prototype.putAttachment = function (id, attachment_id) {
    var storage = this;
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments)
      .push(function () {
        var att_id_list = attachment_id.split('?');
        if (att_id_list.length === 1) {
          return removeConvertedAttachment(storage, id, attachment_id)
            .push(function (doc_info) {
              return storage.put(getInfoDocId(id, attachment_id), doc_info);
            });
        }
      });
  };
  CloudooStorage.prototype.removeAttachment = function (id, attachment_id) {
    var storage = this;
    return this._sub_storage.removeAttachment.apply(
      this._sub_storage,
      arguments
    )
      .push(function () {
        var att_id_list = attachment_id.split('?');
        if (att_id_list.length === 1) {
          return removeConvertedAttachment(storage, id, attachment_id)
            .push(function () {
              return storage.remove(getInfoDocId(id, attachment_id));
            });
        }
      });
  };
  CloudooStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.repair = function () {
    var storage = this;
    return this._sub_storage.repair.apply(this._sub_storage, arguments)
      .push(function () {
        return storage.allDocs({
          query: 'portal_type: "Conversion Info"',
          select_list: ['convert_list', 'doc_id', 'attachment_id']
        });
      })
      .push(function (result) {
        var i, promise_list = [], format, value;
        for (i = 0; i < result.data.total_rows; i += 1) {
          value = result.data.rows[i].value;
          for (format in value.convert_list) {
            if (value.convert_list.hasOwnProperty(format) &&
                value.convert_list[format] === false) {
              promise_list.push(convertAttachment(
                storage,
                value.doc_id,
                value.attachment_id,
                format
              ));
            }
          }
        }
        return RSVP.all(promise_list);
      });
  };
  CloudooStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };
  CloudooStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage,
                                              arguments);
  };

  jIO.addStorage('cloudoo', CloudooStorage);

}(jIO, Uint8Array, Blob, RSVP, DOMParser));
