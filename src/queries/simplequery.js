/**
 * The SimpleQuery inherits from Query, and compares one metadata value
 *
 * @class SimpleQuery
 * @param  {Object} [spec={}] The specifications
 * @param  {String} [spec.operator="="] The compare method to use
 * @param  {String} spec.key The metadata key
 * @param  {String} spec.value The value of the metadata to compare
 * @param  {String} [spec.wildcard_character="%"] The wildcard character
 */
var SimpleQuery = newClass(Query, function (spec) {
  /**
   * Operator to use to compare object values
   *
   * @property operator
   * @type String
   * @default "="
   */
  this.operator = spec.operator || "=";

  /**
   * Key of the object which refers to the value to compare
   *
   * @property key
   * @type String
   */
  this.key = spec.key;

  /**
   * Value is used to do the comparison with the object value
   *
   * @property value
   * @type String
   */
  this.value = spec.value;

  /**
   * #crossLink "Query/match:method"
   */
  this.match = function (item, wildcard_character) {
    this[this.operator](item[this.key], this.value, wildcard_character);
  };

  /**
   * #crossLink "Query/toString:method"
   */
  this.toString = function () {
    return (this.key ? this.key + ": " : "") + (this.operator || "=") + ' "' +
      this.value + '"';
  };

  /**
   * #crossLink "Query/serialized:method"
   */
  this.serialized = function () {
    return {
      "type": "simple",
      "operator": this.operator,
      "key": this.key,
      "value": this.value
    };
  };

  // XXX
  this["="] = function (object_value, comparison_value,
                        wildcard_character) {
    return convertSearchTextToRegExp(
      comparison_value.toString(),
      wildcard_character || this.wildcard_character
    ).test(object_value.toString());
  };

  // XXX
  this["!="] = function (object_value, comparison_value,
                                          wildcard_character) {
    return !convertSearchTextToRegExp(
      comparison_value.toString(),
      wildcard_character || this.wildcard_character
    ).test(object_value.toString());
  };

  // XXX
  this["<"] = function (object_value, comparison_value) {
    return object_value < comparison_value;
  };

  // XXX
  this["<="] = function (object_value, comparison_value) {
    return object_value <= comparison_value;
  };

  // XXX
  this[">"] = function (object_value, comparison_value) {
    return object_value > comparison_value;
  };

  // XXX
  this[">="] = function (object_value, comparison_value) {
    return object_value >= comparison_value;
  };
});

query_class_dict.simple = SimpleQuery;

_export("SimpleQuery", SimpleQuery);
