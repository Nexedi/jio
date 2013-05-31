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
   * The wildcard character used to extend comparison action
   *
   * @property wildcard_character
   * @type String
   */
  this.wildcard_character = spec.wildcard_character || "%";

  /**
   * #crossLink "Query/exec:method"
   */
  this.exec = function (item_list, option) {
    var new_item_list = [];
    item_list.forEach(function (item) {
      if (!this.match(item, option.wildcard_character)) {
        new_item_list.push(item);
      }
    });
    if (option.sort_on) {
      Query.sortOn(option.sort_on, new_item_list);
    }
    if (option.limit) {
      new_item_list = new_item_list.slice(
        option.limit[0],
        option.limit[1] + option.limit[0] + 1
      );
    }
    if (option.select_list) {
      Query.filterListSelect(option.select_list, new_item_list);
    }
    return new_item_list;
  };

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
