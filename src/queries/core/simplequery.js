/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global Query: true, inherits: true, query_class_dict: true, _export: true,
  convertStringToRegExp: true */

var checkKeySchema = function (key_schema) {
  var prop;

  if (key_schema !== undefined) {
    if (typeof key_schema !== 'object') {
      throw new TypeError("SimpleQuery().create(): " +
                          "key_schema is not of type 'object'");
    }
    // key_set is mandatory
    if (key_schema.key_set === undefined) {
      throw new TypeError("SimpleQuery().create(): " +
                          "key_schema has no 'key_set' property");
    }
    for (prop in key_schema) {
      if (key_schema.hasOwnProperty(prop)) {
        switch (prop) {
        case 'key_set':
        case 'cast_lookup':
        case 'match_lookup':
          break;
        default:
          throw new TypeError("SimpleQuery().create(): " +
                             "key_schema has unknown property '" + prop + "'");
        }
      }
    }
  }
};


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
function SimpleQuery(spec, key_schema) {
  Query.call(this);

  checkKeySchema(key_schema);

  this._key_schema = key_schema || {};

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


var checkKey = function (key) {
  var prop;

  if (key.read_from === undefined) {
    throw new TypeError("Custom key is missing the read_from property");
  }

  for (prop in key) {
    if (key.hasOwnProperty(prop)) {
      switch (prop) {
      case 'read_from':
      case 'cast_to':
      case 'equal_match':
        break;
      default:
        throw new TypeError("Custom key has unknown property '" +
                            prop + "'");
      }
    }
  }
};


/**
 * #crossLink "Query/match:method"
 */
SimpleQuery.prototype.match = function (item, wildcard_character) {
  var object_value = null,
    equal_match = null,
    cast_to = null,
    matchMethod = null,
    value = null,
    key = this.key;

  matchMethod = this[this.operator];

  if (this._key_schema.key_set && this._key_schema.key_set[key] !== undefined) {
    key = this._key_schema.key_set[key];
  }

  if (typeof key === 'object') {
    checkKey(key);
    object_value = item[key.read_from];

    equal_match = key.equal_match;

    // equal_match can be a string
    if (typeof equal_match === 'string') {
      // XXX raise error if equal_match not in match_lookup
      equal_match = this._key_schema.match_lookup[equal_match];
    }

    // equal_match overrides the default '=' operator
    if (equal_match !== undefined) {
      matchMethod = (this.operator === '=') ? equal_match : matchMethod;
    }

    value = this.value;
    cast_to = key.cast_to;
    if (cast_to) {
      // cast_to can be a string
      if (typeof cast_to === 'string') {
        // XXX raise error if cast_to not in cast_lookup
        cast_to = this._key_schema.cast_lookup[cast_to];
      }

      value = cast_to(value);
      object_value = cast_to(object_value);
    }
  } else {
    object_value = item[key];
    value = this.value;
  }
  return matchMethod(object_value, value, wildcard_character);
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
  var value, i;
  if (!Array.isArray(object_value)) {
    object_value = [object_value];
  }
  for (i = 0; i < object_value.length; i += 1) {
    value = object_value[i];
    if (typeof value === 'object' && value.hasOwnProperty('content')) {
      value = value.content;
    }
    if (comparison_value === undefined) {
      if (value === undefined) {
        return true;
      }
      return false;
    }
    if (value === undefined) {
      return false;
    }
    if (value.eq !== undefined) {
      return value.eq(comparison_value);
    }
    if (
      convertStringToRegExp(
        comparison_value.toString(),
        wildcard_character
      ).test(value.toString())
    ) {
      return true;
    }
  }
  return false;
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
  var value, i;
  if (!Array.isArray(object_value)) {
    object_value = [object_value];
  }
  for (i = 0; i < object_value.length; i += 1) {
    value = object_value[i];
    if (typeof value === 'object' && value.hasOwnProperty('content')) {
      value = value.content;
    }
    if (comparison_value === undefined) {
      if (value === undefined) {
        return false;
      }
      return true;
    }
    if (value === undefined) {
      return true;
    }
    if (value.ne !== undefined) {
      return value.ne(comparison_value);
    }
    if (value.eq !== undefined) {
      return !value.eq(comparison_value);
    }
    if (
      convertStringToRegExp(
        comparison_value.toString(),
        wildcard_character
      ).test(value.toString())
    ) {
      return false;
    }
  }
  return true;
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
  var value;
  if (!Array.isArray(object_value)) {
    object_value = [object_value];
  }
  value = object_value[0];
  if (typeof value === 'object' && value.hasOwnProperty('content')) {
    value = value.content;
  }
  if (value.lt !== undefined) {
    return value.lt(comparison_value);
  }
  return value < comparison_value;
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
  var value;
  if (!Array.isArray(object_value)) {
    object_value = [object_value];
  }
  value = object_value[0];
  if (typeof value === 'object' && value.hasOwnProperty('content')) {
    value = value.content;
  }
  if (value.le !== undefined) {
    return value.le(comparison_value);
  }
  if (value.lt !== undefined && value.eq !== undefined) {
    return value.lt(comparison_value) || value.eq(comparison_value);
  }
  return value <= comparison_value;
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
  var value;
  if (!Array.isArray(object_value)) {
    object_value = [object_value];
  }
  value = object_value[0];
  if (typeof value === 'object' && value.hasOwnProperty('content')) {
    value = value.content;
  }
  if (value.gt !== undefined) {
    return value.gt(comparison_value);
  }
  if (value.lt !== undefined && value.eq !== undefined) {
    return !(value.lt(comparison_value) || value.eq(comparison_value));
  }
  return value > comparison_value;
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
  var value;
  if (!Array.isArray(object_value)) {
    object_value = [object_value];
  }
  value = object_value[0];
  if (typeof value === 'object' && value.hasOwnProperty('content')) {
    value = value.content;
  }
  if (value.ge !== undefined) {
    return value.ge(comparison_value);
  }
  if (value.lt !== undefined) {
    return !value.lt(comparison_value);
  }
  return value >= comparison_value;
};

query_class_dict.simple = SimpleQuery;

_export("SimpleQuery", SimpleQuery);
