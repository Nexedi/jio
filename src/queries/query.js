/*global RSVP, window, parseStringToObject*/
/*jslint nomen: true, maxlen: 90*/
(function (RSVP, window, parseStringToObject) {
  "use strict";

  var query_class_dict = {},
    regexp_escape = /[\-\[\]{}()*+?.,\\\^$|#\s]/g,
    regexp_percent = /%/g,
    regexp_underscore = /_/g,
    regexp_operator = /^(?:AND|OR|NOT)$/i,
    regexp_comparaison = /^(?:!?=|<=?|>=?)$/i;

  /**
   * Convert metadata values to array of strings. ex:
   *
   *     "a" -> ["a"],
   *     {"content": "a"} -> ["a"]
   *
   * @param  {Any} value The metadata value
   * @return {Array} The value in string array format
   */
  function metadataValueToStringArray(value) {
    var i, new_value = [];
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      value = [value];
    }
    for (i = 0; i < value.length; i += 1) {
      if (typeof value[i] === 'object') {
        new_value[i] = value[i].content;
      } else {
        new_value[i] = value[i];
      }
    }
    return new_value;
  }

  /**
   * A sort function to sort items by key
   *
   * @param  {String} key The key to sort on
   * @param  {String} [way="ascending"] 'ascending' or 'descending'
   * @return {Function} The sort function
   */
  function sortFunction(key, way) {
    var result;
    if (way === 'descending') {
      result = 1;
    } else if (way === 'ascending') {
      result = -1;
    } else {
      throw new TypeError("Query.sortFunction(): " +
                          "Argument 2 must be 'ascending' or 'descending'");
    }
    return function (a, b) {
      // this comparison is 5 times faster than json comparison
      var i, l;
      a = metadataValueToStringArray(a[key]) || [];
      b = metadataValueToStringArray(b[key]) || [];
      l = a.length > b.length ? a.length : b.length;
      for (i = 0; i < l; i += 1) {
        if (a[i] === undefined) {
          return result;
        }
        if (b[i] === undefined) {
          return -result;
        }
        if (a[i] > b[i]) {
          return -result;
        }
        if (a[i] < b[i]) {
          return result;
        }
      }
      return 0;
    };
  }

  /**
   * Sort a list of items, according to keys and directions.
   *
   * @param  {Array} sort_on_option List of couples [key, direction]
   * @param  {Array} list The item list to sort
   * @return {Array} The filtered list
   */
  function sortOn(sort_on_option, list) {
    var sort_index;
    if (!Array.isArray(sort_on_option)) {
      throw new TypeError("jioquery.sortOn(): " +
                          "Argument 1 is not of type 'array'");
    }
    for (sort_index = sort_on_option.length - 1; sort_index >= 0;
         sort_index -= 1) {
      list.sort(sortFunction(
        sort_on_option[sort_index][0],
        sort_on_option[sort_index][1]
      ));
    }
    return list;
  }

  /**
   * Limit a list of items, according to index and length.
   *
   * @param  {Array} limit_option A couple [from, length]
   * @param  {Array} list The item list to limit
   * @return {Array} The filtered list
   */
  function limit(limit_option, list) {
    if (!Array.isArray(limit_option)) {
      throw new TypeError("jioquery.limit(): " +
                          "Argument 1 is not of type 'array'");
    }
    if (!Array.isArray(list)) {
      throw new TypeError("jioquery.limit(): " +
                          "Argument 2 is not of type 'array'");
    }
    list.splice(0, limit_option[0]);
    if (limit_option[1]) {
      list.splice(limit_option[1]);
    }
    return list;
  }

  /**
   * Filter a list of items, modifying them to select only wanted keys.
   *
   * @param  {Array} select_option Key list to keep
   * @param  {Array} list The item list to filter
   * @return {Array} The filtered list
   */
  function select(select_option, list) {
    var i, j, new_item;
    if (!Array.isArray(select_option)) {
      throw new TypeError("jioquery.select(): " +
                          "Argument 1 is not of type Array");
    }
    if (!Array.isArray(list)) {
      throw new TypeError("jioquery.select(): " +
                          "Argument 2 is not of type Array");
    }
    for (i = 0; i < list.length; i += 1) {
      new_item = {};
      for (j = 0; j < select_option.length; j += 1) {
        if (list[i].hasOwnProperty([select_option[j]])) {
          new_item[select_option[j]] = list[i][select_option[j]];
        }
      }
      for (j in new_item) {
        if (new_item.hasOwnProperty(j)) {
          list[i] = new_item;
          break;
        }
      }
    }
    return list;
  }

  /**
   * The query to use to filter a list of objects.
   * This is an abstract class.
   *
   * @class Query
   * @constructor
   */
  function Query() {

    /**
     * Called before parsing the query. Must be overridden!
     *
     * @method onParseStart
     * @param  {Object} object The object shared in the parse process
     * @param  {Object} option Some option gave in parse()
     */
  //   this.onParseStart = emptyFunction;

    /**
     * Called when parsing a simple query. Must be overridden!
     *
     * @method onParseSimpleQuery
     * @param  {Object} object The object shared in the parse process
     * @param  {Object} option Some option gave in parse()
     */
  //   this.onParseSimpleQuery = emptyFunction;

    /**
     * Called when parsing a complex query. Must be overridden!
     *
     * @method onParseComplexQuery
     * @param  {Object} object The object shared in the parse process
     * @param  {Object} option Some option gave in parse()
     */
  //   this.onParseComplexQuery = emptyFunction;

    /**
     * Called after parsing the query. Must be overridden!
     *
     * @method onParseEnd
     * @param  {Object} object The object shared in the parse process
     * @param  {Object} option Some option gave in parse()
     */
  //   this.onParseEnd = emptyFunction;

    return;
  }

  /**
   * Filter the item list with matching item only
   *
   * @method exec
   * @param  {Array} item_list The list of object
   * @param  {Object} [option] Some operation option
   * @param  {Array} [option.select_list] A object keys to retrieve
   * @param  {Array} [option.sort_on] Couples of object keys and "ascending"
   *                 or "descending"
   * @param  {Array} [option.limit] Couple of integer, first is an index and
   *                 second is the length.
   */
  Query.prototype.exec = function (item_list, option) {
    if (!Array.isArray(item_list)) {
      throw new TypeError("Query().exec(): Argument 1 is not of type 'array'");
    }
    if (option === undefined) {
      option = {};
    }
    if (typeof option !== 'object') {
      throw new TypeError("Query().exec(): " +
                          "Optional argument 2 is not of type 'object'");
    }
    var context = this,
      i;
    for (i = item_list.length - 1; i >= 0; i -= 1) {
      if (!context.match(item_list[i])) {
        item_list.splice(i, 1);
      }
    }

    if (option.sort_on) {
      sortOn(option.sort_on, item_list);
    }

    if (option.limit) {
      limit(option.limit, item_list);
    }

    select(option.select_list || [], item_list);

    return new RSVP.Queue()
      .push(function () {
        return item_list;
      });
  };

  /**
   * Test if an item matches this query
   *
   * @method match
   * @param  {Object} item The object to test
   * @return {Boolean} true if match, false otherwise
   */
  Query.prototype.match = function () {
    return true;
  };

  /**
   * Browse the Query in deep calling parser method in each step.
   *
   * `onParseStart` is called first, on end `onParseEnd` is called.
   * It starts from the simple queries at the bottom of the tree calling the
   * parser method `onParseSimpleQuery`, and go up calling the
   * `onParseComplexQuery` method.
   *
   * @method parse
   * @param  {Object} option Any options you want (except 'parsed')
   * @return {Any} The parse result
   */
  Query.prototype.parse = function (option) {
    var that = this,
      object;
    /**
     * The recursive parser.
     *
     * @param  {Object} object The object shared in the parse process
     * @param  {Object} options Some options usable in the parseMethods
     * @return {Any} The parser result
     */
    function recParse(object, option) {
      var query = object.parsed,
        queue = new RSVP.Queue(),
        i;

      function enqueue(j) {
        queue
          .push(function () {
            object.parsed = query.query_list[j];
            return recParse(object, option);
          })
          .push(function () {
            query.query_list[j] = object.parsed;
          });
      }

      if (query.type === "complex") {


        for (i = 0; i < query.query_list.length; i += 1) {
          enqueue(i);
        }

        return queue
          .push(function () {
            object.parsed = query;
            return that.onParseComplexQuery(object, option);
          });

      }
      if (query.type === "simple") {
        return that.onParseSimpleQuery(object, option);
      }
    }
    object = {
      parsed: JSON.parse(JSON.stringify(that.serialized()))
    };
    return new RSVP.Queue()
      .push(function () {
        return that.onParseStart(object, option);
      })
      .push(function () {
        return recParse(object, option);
      })
      .push(function () {
        return that.onParseEnd(object, option);
      })
      .push(function () {
        return object.parsed;
      });

  };

  /**
   * Convert this query to a parsable string.
   *
   * @method toString
   * @return {String} The string version of this query
   */
  Query.prototype.toString = function () {
    return "";
  };

  /**
   * Convert this query to an jsonable object in order to be remake thanks to
   * QueryFactory class.
   *
   * @method serialized
   * @return {Object} The jsonable object
   */
  Query.prototype.serialized = function () {
    return undefined;
  };

  /**
   * Provides static methods to create Query object
   *
   * @class QueryFactory
   */
  function QueryFactory() {
    return;
  }

  /**
   * Escapes regexp special chars from a string.
   *
   * @param  {String} string The string to escape
   * @return {String} The escaped string
   */
  function stringEscapeRegexpCharacters(string) {
    return string.replace(regexp_escape, "\\$&");
  }

  /**
   * Inherits the prototype methods from one constructor into another. The
   * prototype of `constructor` will be set to a new object created from
   * `superConstructor`.
   *
   * @param  {Function} constructor The constructor which inherits the super one
   * @param  {Function} superConstructor The super constructor
   */
  function inherits(constructor, superConstructor) {
    constructor.super_ = superConstructor;
    constructor.prototype = Object.create(superConstructor.prototype, {
      "constructor": {
        "configurable": true,
        "enumerable": false,
        "writable": true,
        "value": constructor
      }
    });
  }

  /**
   * Convert a search text to a regexp.
   *
   * @param  {String} string The string to convert
   * @param  {Boolean} [use_wildcard_character=true] Use wildcard "%" and "_"
   * @return {RegExp} The search text regexp
   */
  function searchTextToRegExp(string, use_wildcard_characters) {
    if (typeof string !== 'string') {
      throw new TypeError("jioquery.searchTextToRegExp(): " +
                          "Argument 1 is not of type 'string'");
    }
    if (use_wildcard_characters === false) {
      return new RegExp("^" + stringEscapeRegexpCharacters(string) + "$");
    }
    return new RegExp("^" + stringEscapeRegexpCharacters(string)
      .replace(regexp_percent, '[\\s\\S]*')
      .replace(regexp_underscore, '.') + "$", "i");
  }

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
    if (!(regexp_operator.test(operator))) {
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
    var result = true,
      i = 0;

    while (result && (i !== this.query_list.length)) {
      result = this.query_list[i].match(item);
      i += 1;
    }
    return result;

  };

  /**
   * Comparison operator, test if one of the sub queries matches the
   * item value
   *
   * @method OR
   * @param  {Object} item The item to match
   * @return {Boolean} true if one match, false otherwise
   */
  ComplexQuery.prototype.OR = function (item) {
    var result = false,
      i = 0;

    while ((!result) && (i !== this.query_list.length)) {
      result = this.query_list[i].match(item);
      i += 1;
    }

    return result;
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
    return !this.query_list[0].match(item);
  };

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

  function objectToSearchText(query) {
    var str_list = [];
    if (query.type === "complex") {
      str_list.push("(");
      (query.query_list || []).forEach(function (sub_query) {
        str_list.push(objectToSearchText(sub_query));
        str_list.push(query.operator);
      });
      str_list.length -= 1;
      str_list.push(")");
      return str_list.join(" ");
    }
    if (query.type === "simple") {
      return (query.key ? query.key + ": " : "") +
        (query.operator || "") + ' "' + query.value + '"';
    }
    throw new TypeError("This object is not a query");
  }

  function checkKeySchema(key_schema) {
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
  }

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
     * @optional
     */
    this.operator = spec.operator;

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

  SimpleQuery.prototype.type = "simple";

  function checkKey(key) {
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
  }

  /**
   * #crossLink "Query/match:method"
   */
  SimpleQuery.prototype.match = function (item) {
    var object_value = null,
      equal_match = null,
      cast_to = null,
      matchMethod = null,
      operator = this.operator,
      value = null,
      key = this.key,
      k;

    if (!(regexp_comparaison.test(operator))) {
      // `operator` is not correct, we have to change it to "like" or "="
      if (regexp_percent.test(this.value)) {
        // `value` contains a non escaped `%`
        operator = "like";
      } else {
        // `value` does not contain non escaped `%`
        operator = "=";
      }
    }

    matchMethod = this[operator];

    if (this._key_schema.key_set && this._key_schema.key_set[key] !== undefined) {
      key = this._key_schema.key_set[key];
    }

    // match with all the fields if key is empty
    if (key === '') {
      matchMethod = this.like;
      value = '%' + this.value + '%';
      for (k in item) {
        if (item.hasOwnProperty(k)) {
          if (k !== '__id' && item[k]) {
            if (matchMethod(item[k], value) === true) {
              return true;
            }
          }
        }
      }
      return false;
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
        matchMethod = (operator === "=" || operator === "like" ?
                       equal_match : matchMethod);
      }

      value = this.value;
      cast_to = key.cast_to;
      if (cast_to) {
        // cast_to can be a string
        if (typeof cast_to === 'string') {
          // XXX raise error if cast_to not in cast_lookup
          cast_to = this._key_schema.cast_lookup[cast_to];
        }

        try {
          value = cast_to(value);
        } catch (e) {
          value = undefined;
        }

        try {
          object_value = cast_to(object_value);
        } catch (e) {
          object_value = undefined;
        }
      }
    } else {
      object_value = item[key];
      value = this.value;
    }
    if (object_value === undefined || value === undefined) {
      return false;
    }
    return matchMethod(object_value, value);
  };

  /**
   * #crossLink "Query/toString:method"
   */
  SimpleQuery.prototype.toString = function () {
    return (this.key ? this.key + ":" : "") +
      (this.operator ? " " + this.operator : "") + ' "' + this.value + '"';
  };

  /**
   * #crossLink "Query/serialized:method"
   */
  SimpleQuery.prototype.serialized = function () {
    var object = {
      "type": "simple",
      "key": this.key,
      "value": this.value
    };
    if (this.operator !== undefined) {
      object.operator = this.operator;
    }
    return object;
  };
  SimpleQuery.prototype.toJSON = SimpleQuery.prototype.serialized;

  /**
   * Comparison operator, test if this query value matches the item value
   *
   * @method =
   * @param  {String} object_value The value to compare
   * @param  {String} comparison_value The comparison value
   * @return {Boolean} true if match, false otherwise
   */
  SimpleQuery.prototype["="] = function (object_value, comparison_value) {
    var value, i;
    if (!Array.isArray(object_value)) {
      object_value = [object_value];
    }
    for (i = 0; i < object_value.length; i += 1) {
      value = object_value[i];
      if (typeof value === 'object' && value.hasOwnProperty('content')) {
        value = value.content;
      }
      if (typeof value.cmp === "function") {
        return (value.cmp(comparison_value) === 0);
      }
      if (comparison_value.toString() === value.toString()) {
        return true;
      }
    }
    return false;
  };

  /**
   * Comparison operator, test if this query value matches the item value
   *
   * @method like
   * @param  {String} object_value The value to compare
   * @param  {String} comparison_value The comparison value
   * @return {Boolean} true if match, false otherwise
   */
  SimpleQuery.prototype.like = function (object_value, comparison_value) {
    var value, i;
    if (!Array.isArray(object_value)) {
      object_value = [object_value];
    }
    for (i = 0; i < object_value.length; i += 1) {
      value = object_value[i];
      if (typeof value === 'object' && value.hasOwnProperty('content')) {
        value = value.content;
      }
      if (typeof value.cmp === "function") {
        return (value.cmp(comparison_value) === 0);
      }
      if (
        searchTextToRegExp(comparison_value.toString()).test(value.toString())
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
   * @return {Boolean} true if not match, false otherwise
   */
  SimpleQuery.prototype["!="] = function (object_value, comparison_value) {
    var value, i;
    if (!Array.isArray(object_value)) {
      object_value = [object_value];
    }
    for (i = 0; i < object_value.length; i += 1) {
      value = object_value[i];
      if (typeof value === 'object' && value.hasOwnProperty('content')) {
        value = value.content;
      }
      if (typeof value.cmp === "function") {
        return (value.cmp(comparison_value) !== 0);
      }
      if (comparison_value.toString() === value.toString()) {
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
    if (typeof value.cmp === "function") {
      return (value.cmp(comparison_value) < 0);
    }
    return (value < comparison_value);
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
    if (typeof value.cmp === "function") {
      return (value.cmp(comparison_value) <= 0);
    }
    return (value <= comparison_value);
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
    if (typeof value.cmp === "function") {
      return (value.cmp(comparison_value) > 0);
    }
    return (value > comparison_value);
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
    if (typeof value.cmp === "function") {
      return (value.cmp(comparison_value) >= 0);
    }
    return (value >= comparison_value);
  };

  query_class_dict.simple = SimpleQuery;
  query_class_dict.complex = ComplexQuery;

  Query.parseStringToObject = parseStringToObject;
  Query.objectToSearchText = objectToSearchText;

  window.Query = Query;
  window.SimpleQuery = SimpleQuery;
  window.ComplexQuery = ComplexQuery;
  window.QueryFactory = QueryFactory;

}(RSVP, window, parseStringToObject));
