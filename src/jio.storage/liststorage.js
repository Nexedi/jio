/*
 * Copyright 2019, Nexedi SA
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
/*global Set*/
(function (jIO) {
  "use strict";

  function ListStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._signature_storage = jIO.createJIO(spec.signature_storage);
  }

  ListStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  ListStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  ListStorage.prototype.post = function (value) {
    var gadget = this;
    return gadget._sub_storage.post(value)
      .push(function (id) {
        return gadget._signature_storage.put(id, {"id": id})
          .push(function () {
            return id;
          });
      });
  };
  ListStorage.prototype.put = function (id, value) {
    var gadget = this;
    return gadget._sub_storage.put(id, value)
      .push(function (result) {
        return gadget._signature_storage.put(id, {"id": id})
          .push(function () {
            return result;
          });
      });
  };
  ListStorage.prototype.remove = function (id) {
    var gadget = this;
    return gadget._sub_storage.remove(id)
      .push(function (result) {
        return gadget._signature_storage.remove(id)
          .push(function () {
            return result;
          });
      });
  };
  ListStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  ListStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  ListStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
      arguments);
  };
  ListStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };
  ListStorage.prototype.hasCapacity = function (name) {
    if (name === "list") {
      return true;
    }
  };
  ListStorage.prototype.buildQuery = function () {
    return this._signature_storage.buildQuery({})
      .push(function (result) {
        return result;
      });
  };

  jIO.addStorage('list', ListStorage);

}(jIO));