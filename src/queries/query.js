/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global newClass: true, sortFunction: true, parseStringToObject: true,
         _export: true, stringEscapeRegexpCharacters: true */

/**
 * The query to use to filter a list of objects.
 * This is an abstract class.
 *
 * @class Query
 * @constructor
 */
var Query = newClass(function () {

  var that = this, emptyFunction = function () {};

  /**
   * Filter the item list with matching item only
   *
   * @method exec
   * @param  {Array} item_list The list of object
   * @param  {Object} [option] Some operation option
   * @param  {String} [option.wildcard_character="%"] The wildcard character
   * @param  {Array} [option.select_list] A object keys to retrieve
   * @param  {Array} [option.sort_on] Couples of object keys and "ascending"
   *                 or "descending"
   * @param  {Array} [option.limit] Couple of integer, first is an index and
   *                 second is the length.
   */
  that.exec = function (item_list, option) {
    var i = 0;
    while (i < item_list.length) {
      if (!that.match(item_list[i], option.wildcard_character)) {
        item_list.splice(i, 1);
      } else {
        i += 1;
      }
    }
    if (option.sort_on) {
      Query.sortOn(option.sort_on, item_list);
    }
    if (option.limit) {
      item_list.splice(0, option.limit[0]);
      if (option.limit[1]) {
        item_list.splice(option.limit[1]);
      }
    }
    Query.filterListSelect(option.select_list || [], item_list);
  };

  /**
   * Test if an item matches this query
   *
   * @method match
   * @param  {Object} item The object to test
   * @return {Boolean} true if match, false otherwise
   */
  that.match = function (item, wildcard_character) {
    return true;
  };

  /**
   * The recursive parser.
   *
   * @method recParse
   * @private
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} options Some options usable in the parseMethods
   * @return {Any} The parser result
   */
  function recParse(object, option) {
    var i, query = object.parsed;
    if (query.type === "complex") {
      for (i = 0; i < query.query_list.length; i += 1) {
        object.parsed = query.query_list[i];
        recParse(object, option);
        query.query_list[i] = object.parsed;
      }
      object.parsed = query;
      that.onParseComplexQuery(object, option);
    } else if (query.type === "simple") {
      that.onParseSimpleQuery(object, option);
    }
  }

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
  that.parse = function (option) {
    var object;
    object = {"parsed": JSON.parse(JSON.stringify(that.serialized()))};
    that.onParseStart(object, option);
    recParse(object, option);
    that.onParseEnd(object, option);
    return object.parsed;
  };

  /**
   * Called before parsing the query. Must be overridden!
   *
   * @method onParseStart
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} option Some option gave in parse()
   */
  that.onParseStart = emptyFunction;

  /**
   * Called when parsing a simple query. Must be overridden!
   *
   * @method onParseSimpleQuery
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} option Some option gave in parse()
   */
  that.onParseSimpleQuery = emptyFunction;

  /**
   * Called when parsing a complex query. Must be overridden!
   *
   * @method onParseComplexQuery
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} option Some option gave in parse()
   */
  that.onParseComplexQuery = emptyFunction;

  /**
   * Called after parsing the query. Must be overridden!
   *
   * @method onParseEnd
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} option Some option gave in parse()
   */
  that.onParseEnd = emptyFunction;

  /**
   * Convert this query to a parsable string.
   *
   * @method toString
   * @return {String} The string version of this query
   */
  that.toString = function () {
    return "";
  };

  /**
   * Convert this query to an jsonable object in order to be remake thanks to
   * QueryFactory class.
   *
   * @method serialized
   * @return {Object} The jsonable object
   */
  that.serialized = function () {
    return undefined;
  };

}, {"static_methods": {

  /**
   * Filter a list of items, modifying them to select only wanted keys.
   *
   * @method filterListSelect
   * @static
   * @param  {Array} select_option Key list to keep
   * @param  {Array} list The item list to filter
   */
  "filterListSelect": function (select_option, list) {
    var i, j, new_item;
    for (i = 0; i < list.length; i += 1) {
      new_item = {};
      for (j = 0; j < select_option.length; j += 1) {
        new_item[select_option[j]] = list[i][select_option[j]];
      }
      for (j in new_item) {
        if (new_item.hasOwnProperty(j)) {
          list[i] = new_item;
          break;
        }
      }
    }
  },

  /**
   * Sort a list of items, according to keys and directions.
   *
   * @method sortOn
   * @static
   * @param  {Array} sort_on_option List of couples [key, direction]
   * @param  {Array} list The item list to sort
   */
  "sortOn": function (sort_on_option, list) {
    var sort_index;
    for (sort_index = sort_on_option.length - 1; sort_index >= 0;
         sort_index -= 1) {
      list.sort(sortFunction(
        sort_on_option[sort_index][0],
        sort_on_option[sort_index][1]
      ));
    }
  },

  /**
   * Parse a text request to a json query object tree
   *
   * @method parseStringToObject
   * @static
   * @param  {String} string The string to parse
   * @return {Object} The json query tree
   */
  "parseStringToObject": parseStringToObject,

  /**
   * Convert a search text to a regexp.
   *
   * @method convertStringToRegExp
   * @static
   * @param  {String} string The string to convert
   * @param  {String} [wildcard_character=undefined] The wildcard chararter
   * @return {RegExp} The search text regexp
   */
  "convertStringToRegExp": function (string, wildcard_character) {
    return new RegExp("^" + stringEscapeRegexpCharacters(string).replace(
      stringEscapeRegexpCharacters(wildcard_character),
      '.*'
    ) + "$");
  }
}});

_export("Query", Query);
