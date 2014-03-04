/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global Query: true, query_class_dict: true, inherits: true,
         exports, QueryFactory, RSVP, sequence */

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
  this.operator = spec.operator || "AND";

  /**
   * The sub Query list which are used to query an item.
   *
   * @attribute query_list
   * @type Array
   * @default []
   * @optional
   */
  this.query_list = spec.query_list || [];
  /*jslint unparam: true*/
  this.query_list = this.query_list.map(
    // decorate the map to avoid sending the index as key_schema argument
    function (o, i) { return QueryFactory.create(o, key_schema); }
  );
  /*jslint unparam: false*/

}
inherits(ComplexQuery, Query);

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
  var str_list = ["("], this_operator = this.operator;
  this.query_list.forEach(function (query) {
    str_list.push(query.toString());
    str_list.push(this_operator);
  });
  str_list[str_list.length - 1] = ")"; // replace last operator
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
    s.query_list.push(query.serialized());
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
  var j, promises = [];
  for (j = 0; j < this.query_list.length; j += 1) {
    promises.push(this.query_list[j].match(item));
  }

  function cancel() {
    var i;
    for (i = 0; i < promises.length; i += 1) {
      if (typeof promises.cancel === 'function') {
        promises.cancel();
      }
    }
  }

  return new RSVP.Promise(function (resolve, reject) {
    var i, count = 0;
    function resolver(value) {
      if (!value) {
        resolve(false);
      }
      count += 1;
      if (count === promises.length) {
        resolve(true);
      }
    }

    function rejecter(err) {
      reject(err);
      cancel();
    }

    for (i = 0; i < promises.length; i += 1) {
      promises[i].then(resolver, rejecter);
    }
  }, cancel);
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
  var j, promises = [];
  for (j = 0; j < this.query_list.length; j += 1) {
    promises.push(this.query_list[j].match(item));
  }

  function cancel() {
    var i;
    for (i = 0; i < promises.length; i += 1) {
      if (typeof promises.cancel === 'function') {
        promises.cancel();
      }
    }
  }

  return new RSVP.Promise(function (resolve, reject) {
    var i, count = 0;
    function resolver(value) {
      if (value) {
        resolve(true);
      }
      count += 1;
      if (count === promises.length) {
        resolve(false);
      }
    }

    function rejecter(err) {
      reject(err);
      cancel();
    }

    for (i = 0; i < promises.length; i += 1) {
      promises[i].then(resolver, rejecter);
    }
  }, cancel);
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
  return sequence([function () {
    return this.query_list[0].match(item);
  }, function (answer) {
    return !answer;
  }]);
};

query_class_dict.complex = ComplexQuery;

exports.ComplexQuery = ComplexQuery;
