/*jslint nomen: true*/
/*global jIO, RSVP, DOMParser, XMLSerializer*/
(function (jIO, RSVP, DOMParser, XMLSerializer) {
  "use strict";

  var parser = new DOMParser(),
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
        var data = parser.parseFromString(
          result.target.responseText,
          "application/xml"
        ), error;
        if (data.getElementsByTagName('fault').length === 0) {
          return jIO.util.base64toBlob(
            data.getElementsByTagName('string')[0].textContent,
            to
          );
        }
        error = new jIO.util.jIOError('Conversion failed', 500);
        error.detail = data.getElementsByTagName('string')[0].textContent;
        throw error;
      });
  }

  /**
   * The jIO CloudoooStorage extension
   *
   * Convert attachment : att_id?from="format"&to="format"
   * 
   * @class CloudoooStorage
   * @constructor
   */
  function CloudoooStorage(spec) {
    this._url = spec.url;
    this._conversion_stack = {};
  }

  CloudoooStorage.prototype.get = function (id) {
    if (this._conversion_stack.hasOwnProperty(id)) {
      return this._conversion_stack[id].doc;
    }
    throw new jIO.util.jIOError("Can't find document " + id, 404);
  };
  CloudoooStorage.prototype.put = function (id, doc) {
    this._conversion_stack[id] = {doc: doc, attachment_dict: {}};
    return id;
  };
  CloudoooStorage.prototype.remove = function (id) {
    delete this._conversion_stack[id];
    return id;
  };
  CloudoooStorage.prototype.getAttachment = function (id, name) {
    var result;
    if (this._conversion_stack[id].attachment_dict.hasOwnProperty(name)) {
      result = this._conversion_stack[id].attachment_dict[name];
      delete this._conversion_stack[id].attachment_dict[name];
      return result;
    }
    throw jIO.util.jIOError(
      "Can't find attachment " + name + " for document " + id,
      404
    );
  };
  CloudoooStorage.prototype.putAttachment = function (id, name, blob) {
    var storage = this;
    return new RSVP.Queue()
      .push(function () {
        return storage.get(id);
      })
      .push(function (doc) {
        return convert(storage._url, blob, doc.from, doc.to);
      })
      .push(function (converted_blob) {
        storage._conversion_stack[id].attachment_dict[name] = converted_blob;
        return id;
      });
  };
  CloudoooStorage.prototype.allAttachments = function (id) {
    var result = {}, name;
    for (name in this._conversion_stack[id].attachment_dict) {
      if (this._conversion_stack[id].attachment_dict.hasOwnProperty(name)) {
        result[name] = {};
      }
    }
    return result;
  };
  CloudoooStorage.prototype.repair = function () {
    return;
  };
  CloudoooStorage.prototype.hasCapacity = function (name) {
    return name === 'list';
  };
  CloudoooStorage.prototype.buildQuery = function () {
    var result = [], id;
    for (id in this._conversion_stack) {
      if (this._conversion_stack.hasOwnProperty(id)) {
        result.push({id: id, value: {}});
      }
    }
    return result;
  };

  jIO.addStorage('cloudooo', CloudoooStorage);

}(jIO, RSVP, DOMParser, XMLSerializer));
