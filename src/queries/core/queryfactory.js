/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global _export: true, ComplexQuery: true, SimpleQuery: true, Query: true,
  parseStringToObject: true */


var query_class_dict = {};

/**
 * Provides static methods to create Query object
 *
 * @class QueryFactory
 */
function QueryFactory() {
  return;
}

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
QueryFactory.create = function (object) {
  if (object === "") {
    return new Query();
  }
  if (typeof object === "string") {
    object = parseStringToObject(object);
  }
  if (typeof (object || {}).type === "string" &&
      query_class_dict[object.type]) {
    return new query_class_dict[object.type](object);
  }
  throw new TypeError("QueryFactory.create(): " +
                      "Argument 1 is not a search text or a parsable object");
};

_export("QueryFactory", QueryFactory);
