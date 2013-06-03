/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global newClass: true, sortFunction: true, parseStringToObject: true,
         _export: true */

/**
 * The query to use to filter a list of objects.
 * This is an abstract class.
 *
 * @class Query
 * @constructor
 */
var Query = newClass(function (spec) {

  /**
   * The wildcard character used to extend comparison action
   *
   * @property wildcard_character
   * @type String
   */
  this.wildcard_character = spec.wildcard_character || "%";

  /**
   * Filter the item list with matching item only
   *
   * @method exec
   * @param  {Array} item_list The list of object
   * @param  {Object} [option={}] Some operation option
   * @param  {String} [option.wildcard_character="%"] The wildcard character
   * @param  {Array} [option.select_list=undefined] A object keys to retrieve
   * @param  {Array} [option.sort_on=[]] Couples of object keys
   *                                     and "ascending" or "descending"
   * @param  {Array} [option.limit=undefined] Couple of integer, first is an
   *                                          index and second is the length.
   */
  this.exec = function (item_list, option) {
    var i = 0;
    while (i < item_list.length) {
      if (!this.match(item_list[i], option.wildcard_character)) {
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
    if (option.select_list) {
      Query.filterListSelect(option.select_list, item_list);
    }
  };

  /**
   * Test if an item matches this query
   *
   * @method match
   * @param  {Object} item The object to test
   * @return {Boolean} true if match, false otherwise
   */
  this.match = null; // function (item, wildcard_character) {};


  /**
   * Convert this query to a parsable string.
   *
   * @method toString
   * @return {String} The string version of this query
   */
  this.toString = null; // function () {};

  /**
   * Convert this query to an jsonable object in order to be remake thanks to
   * QueryFactory class.
   *
   * @method serialized
   * @return {Object} The jsonable object
   */
  this.serialized = null; // function () {};

}, {"static_methods": {

  /**
   * Filter a list of items, modifying them to select only wanted keys.
   *
   * @method filterListSelect
   * @param  {Array} select_option Key list to keep
   * @param  {Array} list The item list to filter
   */
  "filterListSelect": function (select_option, list) {
    list.forEach(function (item, index) {
      var new_item = {};
      select_option.forEach(function (key) {
        new_item[key] = item[key];
      });
      list[index] = new_item;
    });
  },

  /**
   * Sort a list of items, according to keys and directions.
   *
   * @method sortOn
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
   * @param  {String} string The string to parse
   * @return {Object} The json query tree
   */
  "parseStringToObject": parseStringToObject
}});

_export("Query", Query);
