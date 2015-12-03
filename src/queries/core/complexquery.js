/*jslint sloppy: true */
/*global Query: true, query_class_dict: true, inherits: true,
         window, QueryFactory, RSVP */

/**
 * The ComplexQuery inherits from Query, and compares one or several metadata
 * values.
 *
 * @class ComplexQuery
 * @extends Query
 * @param  {Object} [spec={}] The specifications
 * @param  {String} [spec.operator="AND"] The compare method to use
 * @param  {String} spec.key The metadata key
 * @param  {String} spec.value The value of the metadata to compare
 */
function ComplexQuery(spec, key_schema) {
  Query.call(this);

  /**
   * Logical operator to use to compare object values
   *
   * @attribute operator
   * @type String
   * @default "AND"
   * @optional
   */
  this.operator = spec.operator;

  /**
   * The sub Query list which are used to query an item.
   *
   * @attribute query_list
   * @type Array
   * @default []
   * @optional
   */
  this.query_list = spec.query_list || [];
  this.query_list = this.query_list.map(
    // decorate the map to avoid sending the index as key_schema argument
    function (o) { return QueryFactory.create(o, key_schema); }
  );

}
inherits(ComplexQuery, Query);

ComplexQuery.prototype.operator = "AND";
ComplexQuery.prototype.type = "complex";

/**
 * #crossLink "Query/match:method"
 */
ComplexQuery.prototype.match = function (item) {
  var operator = this.operator;
  if (!(/^(?:AND|OR|NOT)$/i.test(operator))) {
    operator = "AND";
  }
  return this[operator.toUpperCase()](item);
};

/**
 * #crossLink "Query/toString:method"
 */
ComplexQuery.prototype.toString = function () {
  var str_list = [], this_operator = this.operator;
  if (this.operator === "NOT") {
    str_list.push("NOT (");
    str_list.push(this.query_list[0].toString());
    str_list.push(")");
    return str_list.join(" ");
  }
  this.query_list.forEach(function (query) {
    str_list.push("(");
    str_list.push(query.toString());
    str_list.push(")");
    str_list.push(this_operator);
  });
  str_list.length -= 1;
  return str_list.join(" ");
};

/**
 * #crossLink "Query/serialized:method"
 */
ComplexQuery.prototype.serialized = function () {
  var s = {
    "type": "complex",
    "operator": this.operator,
    "query_list": []
  };
  this.query_list.forEach(function (query) {
    s.query_list.push(
      typeof query.toJSON === "function" ? query.toJSON() : query
    );
  });
  return s;
};
ComplexQuery.prototype.toJSON = ComplexQuery.prototype.serialized;

/**
 * Comparison operator, test if all sub queries match the
 * item value
 *
 * @method AND
 * @param  {Object} item The item to match
 * @return {Boolean} true if all match, false otherwise
 */
ComplexQuery.prototype.AND = function (item) {
  var queue = new RSVP.Queue(),
    context = this,
    i = 0;

  function executeNextIfNotFalse(result) {
    if (result === false) {
      // No need to evaluate the other elements, as one is false
      return result;
    }
    if (context.query_list.length === i) {
      // No new element to loop on
      return true;
    }
    queue
      .push(function () {
        var sub_result = context.query_list[i].match(item);
        i += 1;
        return sub_result;
      })
      .push(executeNextIfNotFalse);
  }

  executeNextIfNotFalse(true);
  return queue;
};

/**
 * Comparison operator, test if one of the sub queries matches the
 * item value
 *
 * @method OR
 * @param  {Object} item The item to match
 * @return {Boolean} true if one match, false otherwise
 */
ComplexQuery.prototype.OR =  function (item) {
  var queue = new RSVP.Queue(),
    context = this,
    i = 0;

  function executeNextIfNotTrue(result) {
    if (result === true) {
      // No need to evaluate the other elements, as one is true
      return result;
    }
    if (context.query_list.length === i) {
      // No new element to loop on
      return false;
    }
    queue
      .push(function () {
        var sub_result = context.query_list[i].match(item);
        i += 1;
        return sub_result;
      })
      .push(executeNextIfNotTrue);
  }

  executeNextIfNotTrue(false);
  return queue;
};

/**
 * Comparison operator, test if the sub query does not match the
 * item value
 *
 * @method NOT
 * @param  {Object} item The item to match
 * @return {Boolean} true if one match, false otherwise
 */
ComplexQuery.prototype.NOT = function (item) {
  return new RSVP.Queue()
    .push(function () {
      return this.query_list[0].match(item);
    })
    .push(function (answer) {
      return !answer;
    });
};

query_class_dict.complex = ComplexQuery;

window.ComplexQuery = ComplexQuery;
