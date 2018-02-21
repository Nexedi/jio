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
            data.querySelector('string').textContent,
            to
          );
        }
        error = new jIO.util.jIOError('Conversion failed', 500);
        error.detail = data.querySelector('string').textContent;
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
    this._sub_storage = jIO.createJIO(spec.sub_storage);
  }

  CloudoooStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  CloudoooStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };

  CloudoooStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };

  CloudoooStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };

  CloudoooStorage.prototype.putAttachment = function (id, name, blob) {
    var storage = this;
    return storage.get(id)
      .push(function (doc) {
        return convert(storage._url, blob, doc.from, doc.to);
      })
      .push(function (converted_blob) {
        return storage._sub_storage.putAttachment(id, name, converted_blob);
      });
  };

  CloudoooStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };

  CloudoooStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  CloudoooStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };

  CloudoooStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
  };

  jIO.addStorage('cloudooo', CloudoooStorage);

}(jIO, RSVP, DOMParser, XMLSerializer));
