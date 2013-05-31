/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global _export: true, ComplexQuery: true, SimpleQuery: true,
         newClass: true,
         sortFunction: true, convertSearchTextToRegExp: true */

// XXX
var query_class_dict = {}, query_factory = {};

newClass.apply(query_factory, [{
  "secure_methods": true
}, function () {
  // XXX
  this.create = function (object) {
    if (typeof object.type === "string" &&
        query_class_dict[object.type]) {
      return new query_class_dict[object.type](object);
    }
    return null;
  };
}]); // end QueryFactory

_export("factory", query_factory);
