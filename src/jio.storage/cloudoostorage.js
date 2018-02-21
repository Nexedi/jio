/*jslint nomen: true*/
/*global jIO*/
(function (jIO) {
  "use strict";

  /**
   * The jIO CloudooStorage extension
   *
   * Convert attachment : att_id:format  ?!
   * cloudoo_info : 
   * {
   * portal_type: "Cloudoo Conversion"
   * base_format: format de base ( content_type du document )
   * to_convert_list: [liste des format a convertir pendant la synchro]
   * format_avaible_list : [liste des formats deja disponible]
   * }
   * 
   * @class CloudooStorage
   * @constructor
   */
  function CloudooStorage(spec) {
    this._serveur_url = spec.serveur_url;
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
  CloudooStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.putAttachment = function () {
    // putAttachment sur l'id de base suprime les conversions existente
    // Les refaire sur la synchro ?
    // 
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                arguments);
  };
  CloudooStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };
  CloudooStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };
  CloudooStorage.prototype.buildQuery = function () {
    return this._sub_storage.buildQuery.apply(this._sub_storage,
                                              arguments);
  };

  jIO.addStorage('cloudoo', CloudooStorage);

}(jIO));
