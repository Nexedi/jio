/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global _export: true, ComplexQuery: true, SimpleQuery: true,
         newClass: true, Query: true */


var query_class_dict = {}, QueryFactory;

/**
 * Provides static methods to create Query object
 *
 * @class QueryFactory
 */
QueryFactory = newClass({
  "static_methods": {

    /**
     * Creates Query object from a search text string or a serialized version
     * of a Query.
     *
     * @method create
     * @static
     * @param  {Object,String} object The search text or the serialized version
     *         of a Query
     * @return {Query} A Query object
     */
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
