/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global Query: true, inherits: true, query_class_dict: true, _export: true,
  convertStringToRegExp: true */

/**
 * The SimpleQuery inherits from Query, and compares one metadata value
 *
 * @class SimpleQuery
 * @extends Query
 * @param  {Object} [spec={}] The specifications
 * @param  {String} [spec.operator="="] The compare method to use
 * @param  {String} spec.key The metadata key
 * @param  {String} spec.value The value of the metadata to compare
 */
function SimpleQuery(spec) {
  Query.call(this);

  /**
   * Operator to use to compare object values
   *
   * @attribute operator
   * @type String
   * @default "="
   * @optional
   */
  this.operator = spec.operator || "=";

  /**
   * Key of the object which refers to the value to compare
   *
   * @attribute key
   * @type String
   */
  this.key = spec.key;

  /**
   * Value is used to do the comparison with the object value
   *
   * @attribute value
   * @type String
   */
  this.value = spec.value;

}
inherits(SimpleQuery, Query);
SimpleQuery.prototype.constructor = SimpleQuery;

/**
 * #crossLink "Query/match:method"
 */
SimpleQuery.prototype.match = function (item, wildcard_character) {
  return this[this.operator](item[this.key], this.value, wildcard_character);
};

/**
 * #crossLink "Query/toString:method"
 */
SimpleQuery.prototype.toString = function () {
  return (this.key ? this.key + ": " : "") + (this.operator || "=") + ' "' +
    this.value + '"';
};

/**
 * #crossLink "Query/serialized:method"
 */
SimpleQuery.prototype.serialized = function () {
  return {
    "type": "simple",
    "operator": this.operator,
    "key": this.key,
    "value": this.value
  };
};

/**
 * Comparison operator, test if this query value matches the item value
 *
 * @method =
 * @param  {String} object_value The value to compare
 * @param  {String} comparison_value The comparison value
 * @param  {String} wildcard_character The wildcard_character
 * @return {Boolean} true if match, false otherwise
 */
SimpleQuery.prototype["="] = function (object_value, comparison_value,
                      wildcard_character) {
  return convertStringToRegExp(
    comparison_value.toString(),
    wildcard_character || "%"
  ).test(object_value.toString());
};

/**
 * Comparison operator, test if this query value does not match the item value
 *
 * @method !=
 * @param  {String} object_value The value to compare
 * @param  {String} comparison_value The comparison value
 * @param  {String} wildcard_character The wildcard_character
 * @return {Boolean} true if not match, false otherwise
 */
SimpleQuery.prototype["!="] = function (object_value, comparison_value,
                       wildcard_character) {
  return !convertStringToRegExp(
    comparison_value.toString(),
    wildcard_character || "%"
  ).test(object_value.toString());
};

/**
 * Comparison operator, test if this query value is lower than the item value
 *
 * @method <
 * @param  {Number, String} object_value The value to compare
 * @param  {Number, String} comparison_value The comparison value
 * @return {Boolean} true if lower, false otherwise
 */
SimpleQuery.prototype["<"] = function (object_value, comparison_value) {
  return object_value < comparison_value;
};

/**
 * Comparison operator, test if this query value is equal or lower than the
 * item value
 *
 * @method <=
 * @param  {Number, String} object_value The value to compare
 * @param  {Number, String} comparison_value The comparison value
 * @return {Boolean} true if equal or lower, false otherwise
 */
SimpleQuery.prototype["<="] = function (object_value, comparison_value) {
  return object_value <= comparison_value;
};

/**
 * Comparison operator, test if this query value is greater than the item
 * value
 *
 * @method >
 * @param  {Number, String} object_value The value to compare
 * @param  {Number, String} comparison_value The comparison value
 * @return {Boolean} true if greater, false otherwise
 */
SimpleQuery.prototype[">"] = function (object_value, comparison_value) {
  return object_value > comparison_value;
};

/**
 * Comparison operator, test if this query value is equal or greater than the
 * item value
 *
 * @method >=
 * @param  {Number, String} object_value The value to compare
 * @param  {Number, String} comparison_value The comparison value
 * @return {Boolean} true if equal or greater, false otherwise
 */
SimpleQuery.prototype[">="] = function (object_value, comparison_value) {
  return object_value >= comparison_value;
};

query_class_dict.simple = SimpleQuery;

_export("SimpleQuery", SimpleQuery);
