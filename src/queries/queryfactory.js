/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global _export: true, ComplexQuery: true, SimpleQuery: true,
         newClass: true, Query: true */

// XXX
var query_class_dict = {}, QueryFactory;

QueryFactory = newClass({
  "secure_methods": true,
  "static_methods": {
    // XXX
    "create": function (object) {
      if (object === "") {
        return new Query();
      }
      if (typeof object === "string") {
        object = Query.parseStringToObject(object);
      }
      if (typeof (object || {}).type === "string" &&
          query_class_dict[object.type]) {
        return new query_class_dict[object.type](object);
      }
      return null;
    }
  }
}, function () {});

_export("QueryFactory", QueryFactory);
