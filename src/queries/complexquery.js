/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global newClass: true, Query: true, query_class_dict: true,
         _export: true, QueryFactory: true */

/**
 * The ComplexQuery inherits from Query, and compares one or several metadata
 * values.
 *
 * @class ComplexQuery
 * @param  {Object} [spec={}] The specifications
 * @param  {String} [spec.operator="AND"] The compare method to use
 * @param  {String} spec.key The metadata key
 * @param  {String} spec.value The value of the metadata to compare
 * @param  {String} [spec.wildcard_character="%"] The wildcard character
 */
var ComplexQuery = newClass(Query, function (spec) {

  /**
   * Logical operator to use to compare object values
   *
   * @property operator
   * @type String
   * @default "AND"
   */
  this.operator = spec.operator || "AND";

  /**
   * The sub Query list which are used to query an item.
   *
   * @property query_list
   * @type Array
   * @default []
   */
  this.query_list = spec.query_list || [];
  this.query_list = this.query_list.map(QueryFactory.create);

  /**
   * #crossLink "Query/match:method"
   */
  this.match = function (item, wildcard_character) {
    return this[this.operator](item, wildcard_character);
  };

  /**
   * #crossLink "Query/toString:method"
   */
  this.toString = function () {
    var str_list = ["("], this_operator = this.operator;
    this.query_list.forEach(function (query) {
      str_list.push(query.toString());
      str_list.push(this_operator);
    });
    str_list.pop(); // remove last operator
    str_list.push(")");
    return str_list.join(" ");
  };

  /**
   * #crossLink "Query/serialized:method"
   */
  this.serialized = function () {
    var s = {
      "type": "complex",
      "operator": this.operator,
      "query_list": []
    };
    this.query_list.forEach(function (query) {
      s.query_list.push(query.serialized());
    });
    return s;
  };

  /**
   * Comparison operator, test if all sub queries match the
   * item value
   *
   * @method AND
   * @param  {Object} item The item to match
   * @param  {String} wildcard_character The wildcard character
   * @return {Boolean} true if all match, false otherwise
   */
  this.AND = function (item, wildcard_character) {
    var i;
    for (i = 0; i < this.query_list.length; i += 1) {
      if (!this.query_list[i].match(item, wildcard_character)) {
        return false;
      }
    }
    return true;
  };

  /**
   * Comparison operator, test if one of the sub queries matches the
   * item value
   *
   * @method OR
   * @param  {Object} item The item to match
   * @param  {String} wildcard_character The wildcard character
   * @return {Boolean} true if one match, false otherwise
   */
  this.OR =  function (item, wildcard_character) {
    var i;
    for (i = 0; i < this.query_list.length; i += 1) {
      if (this.query_list[i].match(item, wildcard_character)) {
        return true;
      }
    }
    return false;
  };

  /**
   * Comparison operator, test if the sub query does not match the
   * item value
   *
   * @method NOT
   * @param  {Object} item The item to match
   * @param  {String} wildcard_character The wildcard character
   * @return {Boolean} true if one match, false otherwise
   */
  this.NOT = function (item, wildcard_character) {
    return !this.query_list[0].match(item, wildcard_character);
  };
});

query_class_dict.complex = ComplexQuery;

_export("ComplexQuery", ComplexQuery);
