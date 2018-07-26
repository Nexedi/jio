/*
 * Copyright 2015, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global Rusha*/

/**
 * JIO Sha Storage. Type = 'sha'.
 */

(function (Rusha) {
  "use strict";

  var rusha = new Rusha();

  function ShaStorage(spec, utils) {
    this._utils = utils;
    this._sub_storage = jIO.createJIO(spec.sub_storage, utils);
  }

  ShaStorage.prototype.post = function (param) {
    return this._sub_storage.put(
      rusha.digestFromString(JSON.stringify(param)),
      param
    );
  };

  ShaStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  ShaStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  ShaStorage.prototype.hasCapacity = function () {
    return this._sub_storage.hasCapacity.apply(this._sub_storage, arguments);
  };
  ShaStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage, arguments);
  };
  ShaStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  ShaStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  ShaStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };
  ShaStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  ShaStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };

  jIO.addStorage('sha', ShaStorage);

}(Rusha));
