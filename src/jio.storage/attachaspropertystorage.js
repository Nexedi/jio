/*jslint nomen: true*/
/*global RSVP, FileReader*/
// JIO AttachAsProperty Storage Description :
// {
//   type: "attachasproperty",
//   map: {
//           attach_id: 'property_ud',
//           attach1_id: 'property1_ud',
//        },
//   sub_storage: {
//     }
// }

(function (jIO, RSVP) {
  "use strict";

  /**
   * The jIO AttachAsProperty extension
   *
   * @class AttachAsProperty
   * @constructor
   */
  function AttachAsProperty(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this.map = spec.map || {};
  }

  function substorage(method_name) {
    return function () {
      return this._sub_storage[method_name].apply(this._sub_storage, arguments);
    };
  }

  AttachAsProperty.prototype.get = function (key) {
    var map = this.map,
      sub_storage = this._sub_storage;
    return this._sub_storage.get.apply(this._sub_storage, arguments)
      .push(function (result) {
        var property_name,
          arg_list = [],
          attach_name;
        for (attach_name in map) {
          if (map.hasOwnProperty(attach_name)) {
            property_name = map[attach_name] || attach_name;
            arg_list.push(attach_name);
          }
        }
        return RSVP.all(arg_list.map(function (attach_name) {
          return sub_storage.getAttachment(key, attach_name)
            .push(function (value) {
              return jIO.util.readBlobAsText(value)
                .then(function (r) {
                  result[property_name] = r.target.result;
                });
            })
            .push(undefined, function (error) {
              if (error.status_code !== 404) {
                throw error;
              }
            });
        })).then(function () {
          return result;
        });
      });
  };

  AttachAsProperty.prototype.put = function (key, value_to_save) {
    var attach_name,
      args_list = [],
      property_name,
      value,
      sub_storage = this._sub_storage;
    for (attach_name in this.map) {
      if (this.map.hasOwnProperty(attach_name)) {
        property_name = this.map[attach_name] || attach_name;
        value = value_to_save[property_name];
        if (value !== undefined) {
          delete value_to_save[property_name];
          args_list.push([attach_name, value]);
        }
      }
    }
    return sub_storage.put.apply(sub_storage, arguments)
      .push(function () {
        return RSVP.all(args_list.map(function (a) {
          return sub_storage.putAttachment(key, a[0], a[1]);
        }));
      });
  };

  AttachAsProperty.prototype.post = substorage('post');
  AttachAsProperty.prototype.remove = substorage('remove');
  AttachAsProperty.prototype.repair = substorage('repair');
  AttachAsProperty.prototype.hasCapacity = substorage('hasCapacity');
  AttachAsProperty.prototype.buildQuery = substorage('buildQuery');
  AttachAsProperty.prototype.allAttachments = substorage('allAttachments');
  AttachAsProperty.prototype.getAttachment = substorage('getAttachment');
  AttachAsProperty.prototype.putAttachment = substorage('putAttachment');
  AttachAsProperty.prototype.removeAttachment = substorage('removeAttachment');

  jIO.addStorage('attachasproperty', AttachAsProperty);

}(jIO, RSVP));
