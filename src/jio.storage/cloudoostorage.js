/*jslint nomen: true*/
/*global jIO, RSVP, Blob, Uint8Array, DOMParser, XMLSerializer*/
(function (jIO, Uint8Array, Blob, RSVP, DOMParser, XMLSerializer) {
  "use strict";

  var content_type_dict = {
    "application/x-asc-text": "docy",
    "application/x-asc-presentation": "ppty",
    "application/x-asc-spreadsheet": "xlsy"
  },
    parser = new DOMParser(),
    serializer = new XMLSerializer();

  function makeXmlRpcRequest(file, from, to) {
    var xml = parser.parseFromString(
      '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
        '<methodName>convertFile</methodName><params>' +
        '<param><value><string></string></value></param>' +
        '<param><value><string></string></value></param>' +
        '<param><value><string></string></value></param></params></methodCall>',
      'text/xml'
    ),
      string_list = xml.getElementsByTagName('string');
    string_list[0].textContent = file;
    string_list[1].textContent = from;
    string_list[2].textContent = to;
    return serializer.serializeToString(xml);
  }

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

  /**
   * convert a blob 
   * from a format to another
   * return converted blob.
   **/
  function convert(url, blob, from, to) {
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsDataURL(blob);
      })
      .push(function (result) {

        return jIO.util.ajax({
          type: 'POST',
          url: url,
          data: makeXmlRpcRequest(
            result.target.result.split('base64,')[1],
            from,
            to
          )
        });
      })
      .push(function (result) {
        var data_list = parser.parseFromString(
          result.target.responseText,
          "application/xml"
        ).getElementsByTagName('string');
        if (data_list.length) {
          return b64toBlob(data_list[0].textContent, to);
        }
        // Parse error. And add case.
        throw new jIO.util.jIOError('conversion failed', 404);
      });
  }

  function getCloudooDocumentId(id, attachment_id) {
    return 'cloudoo/' + id + '/' + attachment_id;
  }

  function convertAttachment(storage, cloudoo_id, cloudoo_doc, from, to) {
    return storage._sub_storage.getAttachment(
      cloudoo_doc.doc_id,
      cloudoo_doc.attachment_id
    )
      .push(function (blob) {
        return convert(storage._url, blob, from, to);
      })
      .push(function (blob) {
        var att_id = cloudoo_doc.attachment_id;
        if (to !== cloudoo_doc.format) {
          att_id += "?" + to;
        }
        cloudoo_doc.convert_dict[to] = true;
        return RSVP.all([
          blob,
          storage._sub_storage.putAttachment(cloudoo_doc.doc_id, att_id, blob),
          storage._sub_storage.put(cloudoo_id, cloudoo_doc)
        ]);
      }, undefined, function (error) {
        cloudoo_doc.convert_dict[from] = to;
        return storage._sub_storage.put(
          cloudoo_id,
          cloudoo_doc
        )
          .push(function () {
            throw error;
          });
      });
  }

  function createCloudooDocument(storage, id, attachment_id) {
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

  function removeConvertedAttachments(storage, id, attachment_id) {
    var cloudoo_id = getCloudooDocumentId(id, attachment_id);
    return storage._sub_storage.get(cloudoo_id)
      .push(function (doc) {
        var format, promise_list = [];
        for (format in doc.convert_list) {
          if (doc.convert_list.hasOwnProperty(format)) {
            if (doc.convert_list[format]) {
              promise_list.push(
                storage._sub_storage.removeAttachment(
                  id,
                  attachment_id + '?' + format
                )
              );
            }
          }
        }
        return RSVP.all(promise_list);
      })
      .push(function () {
        return storage._sub_storage.remove(
          cloudoo_id
        );
      })
      .push(undefined, function (error) {
        if (!(error instanceof jIO.util.jIOError
            && error.status_code === 404)) {
          throw error;
        }
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
    var storage = this,
      att_id_list = attachment_id.split('?'),
      cloudoo_id;
    if (att_id_list.length === 1) {
      return this._sub_storage.getAttachment.apply(
        this._sub_storage,
        arguments
      );
    }
    cloudoo_id = getCloudooDocumentId(id, att_id_list[0]);
    return storage._sub_storage.get(cloudoo_id)
      .push(undefined, function (error) {
        if (error instanceof jIO.util.jIOError && error.status_code) {
          return createCloudooDocument(storage, id, att_id_list[0]);
        }
      })
      .push(function (doc) {
        if (doc.convert_dict[att_id_list[0]] === true) {
          return storage._sub_storage.getAttachment(id, attachment_id);
        }
        return convertAttachment(
          storage,
          cloudoo_id,
          doc,
          doc.format,
          att_id_list[1]
        )
          .push(function (result) {
            return result[0];
          });
      });
  };
  CloudooStorage.prototype.putAttachment = function (id, attachment_id, blob) {
    var storage = this;
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments)
      .push(function (result) {
        var att_id_list = attachment_id.split('?'),
          cloudoo_id = getCloudooDocumentId(id, att_id_list[0]);
        return storage._sub_storage.get(cloudoo_id)
          .push(undefined, function (error) {
            if (error instanceof jIO.util.jIOError && error.status_code) {
              return createCloudooDocument(storage, id, att_id_list[0]);
            }
          })
          .push(function (doc) {
            if (att_id_list.length === 1) {
              doc.convert_dict = {};
              doc.convert_dict[doc.format] = true;
              return storage._sub_storage.put(
                getCloudooDocumentId(id, attachment_id),
                doc
              );
            }
            return convert(storage._url, blob, att_id_list[1], doc.format)
              .push(function (result) {
                return storage._sub_storage.putAttachment(
                  id,
                  att_id_list[0],
                  result
                );
              })
              .push(function () {
                doc.convert_dict[doc.format] = true;
                doc.convert_dict[att_id_list[1]] = true;
                return storage._sub_storage.put(cloudoo_id, doc);
              })
              .push(undefined, function (error) {
                doc.convert_dict[doc.format] = att_id_list[1];
                return storage._sub_storage.put(cloudoo_id, doc)
                  .push(function () {
                    throw error;
                  });
              });
          })
          .push(function () {
            return result;
          });
      });
  };
  CloudooStorage.prototype.removeAttachment = function (id, attachment_id) {
    var storage = this;
    return this._sub_storage.removeAttachment.apply(
      this._sub_storage,
      arguments
    )
      .push(function () {
        return removeConvertedAttachments(storage, id, attachment_id);
      });
  };
  CloudooStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.repair = function () {
    var storage = this;
    return this._sub_storage.repair.apply(this._sub_storage, arguments)
      .push(function () {
        return storage._sub_storage.allDocs({
          query: 'portal_type: "Conversion Info"',
          select_list: [
            "portal_type",
            "convert_dict",
            "format",
            "attachment_id",
            "doc_id"
          ]
        });
      })
      .push(function (result) {
        var i, promise_list = [], format, doc;
        for (i = 0; i < result.data.total_rows; i += 1) {
          doc = result.data.rows[i].value;
          for (format in doc.convert_dict) {
            if (doc.convert_dict.hasOwnProperty(format) &&
                doc.convert_dict[format] !== true) {
              promise_list.push(convertAttachment(
                storage,
                result.data.rows[i].id,
                doc,
                doc.convert_dict[format],
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

}(jIO, Uint8Array, Blob, RSVP, DOMParser, XMLSerializer));
