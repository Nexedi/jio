/*jslint nomen: true*/
/*global RSVP, FileReader, Blob*/
//JIO AttachAsProperty Storage Description :
//description = {
//  type: "attachasproperty",
//  map: {
//    attach_id: {
//      // name of property containing body of attachment
//      body_name: 'property_id',
//      // name of property containing content_type of attachment
//      content_type_name: 'content_type'
//    },
//    attach1_id: {
//      body_name: 'property1_id',
//      content_type_name: 'content_type'
//    }
//  },
//  sub_storage: {}
//};

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
        var arg_list = [],
          attach_name;
        for (attach_name in map) {
          if (map.hasOwnProperty(attach_name)) {
            arg_list.push(attach_name);
          }
        }
        return RSVP.all(arg_list.map(function (attach_name) {
          var body_name = map[attach_name].body_name || attach_name,
            content_type_name = map[attach_name].content_type_name;
          return sub_storage.getAttachment(key, attach_name)
            .push(function (value) {
              if (content_type_name) {
                result[content_type_name] = value.type;
              }
              return jIO.util.readBlobAsText(value)
                .then(function (r) {
                  result[body_name] = r.target.result;
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
      body_name,
      content_type_name,
      content_type,
      value,
      sub_storage = this._sub_storage;
    for (attach_name in this.map) {
      if (this.map.hasOwnProperty(attach_name)) {
        body_name = this.map[attach_name].body_name || attach_name;
        value = value_to_save[body_name];
        if (value !== undefined) {
          content_type_name = this.map[attach_name].content_type_name;
          if (content_type_name) {
            content_type = value_to_save[content_type_name];
          } else {
            content_type = null;
          }
          delete value_to_save[body_name];
          args_list.push([attach_name, value, content_type]);
        }
      }
    }
    return sub_storage.put.apply(sub_storage, arguments)
      .push(function () {
        return RSVP.all(args_list.map(function (a) {
          var content_type = a[2],
            body;
          if (content_type) {
            body = new Blob([a[1]], {type: content_type});
          } else {
            body = a[1];
          }
          return sub_storage.putAttachment(key, a[0], body);
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
