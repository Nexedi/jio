/*jslint sloppy: true */
/*global window, Query, parseStringToObject, query_class_dict */

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
QueryFactory.create = function (object, key_schema) {
  if (object === "") {
    return new Query();
  }
  if (typeof object === "string") {
    object = parseStringToObject(object);
  }
  if (typeof (object || {}).type === "string" &&
      query_class_dict[object.type]) {
    return new query_class_dict[object.type](object, key_schema);
  }
  throw new TypeError("QueryFactory.create(): " +
                      "Argument 1 is not a search text or a parsable object");
};

window.QueryFactory = QueryFactory;
