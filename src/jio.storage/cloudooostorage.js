/*
 * Copyright 2018, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */

/*jslint nomen: true*/
/*global jIO, RSVP, DOMParser, XMLSerializer*/
(function (jIO, RSVP, DOMParser, XMLSerializer) {
  "use strict";

  var parser = new DOMParser(),
    serializer = new XMLSerializer();

  function makeXmlRpcRequest(file, from, to, conversion_kw) {
    var xml = parser.parseFromString(
      '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
        '<methodName>convertFile</methodName><params>' +
        '<param><value><string></string></value></param>' +
        '<param><value><string></string></value></param>' +
        '<param><value><string></string></value></param>' +
        '<param><value><boolean>0</boolean></value></param>' +
        '<param><value><boolean>0</boolean></value></param>' +
        '<param><struct></struct></param>' +
        '</params></methodCall>',
      'text/xml'
    ),
      element_value,
      member,
      key,
      struct = xml.getElementsByTagName('struct'),
      string_list = xml.getElementsByTagName('string');
    string_list[0].textContent = file;
    string_list[1].textContent = from;
    string_list[2].textContent = to;
    if (conversion_kw) {
      for (key in conversion_kw) {
        if (conversion_kw.hasOwnProperty(key)) {
          element_value = parser.parseFromString(
            '<' + conversion_kw[key][1] + '></' + conversion_kw[key][1] + '>',
            'text/xml'
          ).firstChild;
          member = parser.parseFromString(
            '<member><name></name><value></value></member>',
            'text/xml'
          ).firstChild;
          element_value.textContent = conversion_kw[key][0];
          member.getElementsByTagName('name')[0].textContent = key;
          member.getElementsByTagName('value')[0].appendChild(element_value);
          struct[0].appendChild(member);
        }
      }
    }
    return serializer.serializeToString(xml);
  }

  /**
   * convert a blob 
   * from a format to another
   * return converted blob.
   **/
  function convert(url, blob, from, to, conversion_kw) {
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
            to,
            conversion_kw
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

  CloudoooStorage.prototype.putAttachment = function (id, name, blob,
    conversion_kw) {
    var storage = this;
    return storage.get(id)
      .push(function (doc) {
        return convert(storage._url, blob, doc.from, doc.to, conversion_kw);
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
