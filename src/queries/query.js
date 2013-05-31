/**
 * The query to use to filter a list of objects.
 * This is an abstract class.
 *
 * @class Query
 * @constructor
 */
var Query = newClass(function() {
  /**
   * Creates a new item list with matching item only
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
   * @return {Array} The new item list
   */
  this.exec = function (item_list, option) {};

  /**
   * Test if an item matches this query
   * @method match
   * @param  {Object} item The object to test
   * @return {Boolean} true if match, false otherwise
   */
  this.match = function (item, wildcard_character) {};


  /**
   * Convert this query to a parsable string.
   * @method toString
   * @return {String} The string version of this query
   */
  this.toString = function () {};

  /**
   * Convert this query to an jsonable object in order to be remake thanks to
   * QueryFactory class.
   *
   * @method serialized
   * @return {Object} The jsonable object
   */
  this.serialized = function () {};
}, {"static_methods": {
  // XXX
  "filterListSelect": function (select_option, list) {
    list.forEach(function (item, index) {
      var new_item = {};
      select_option.forEach(function (key) {
        new_item[key] = item[key];
      });
      list[index] = new_item;
    });
  },
  // XXX
  "sortOn": function (sort_on_option, list) {
    var sort_index;
    for (sort_index = sort_on_option.length - 1; sort_index >= 0;
         sort_index += 1) {
      list.sort(sortFunction(
        sort_on_option[sort_index][0],
        sort_on_option[sort_index][1]
      ));
    }
  },
  "parseStringToQuery": parseStringToQuery
}});

_export("Query", Query);


function query(query, object_list) {
  var wildcard_character = typeof query.wildcard_character === "string" ?
    query.wildcard_character : "%",
  // A list of methods according to operators
    operator_actions = {
      "=": function (value1, value2) {
        value1 = value1.toString();
        return value1.match(convertToRegexp(
          value2, wildcard_character
        )) || false && true;
      },
      '!=':  function (value1, value2) {
        value1 = value1.toString();
        return !(value1.match(convertToRegexp(
          value2, wildcard_character
        )));
      },
      '<':   function (value1, value2) { return value1 < value2; },
      '<=':  function (value1, value2) { return value1 <= value2; },
      '>':   function (value1, value2) { return value1 > value2; },
      '>=':  function (value1, value2) { return value1 >= value2; },
      'AND': function (item, query_list) {
        var i;
        for (i=0; i<query_list.length; ++i) {
          if (! itemMatchesQuery (item, query_list[i])) {
            return false;
          }
        }
        return true;
      },
      'OR':  function (item, query_list) {
        var i;
        for (i=0; i<query_list.length; ++i) {
          if (itemMatchesQuery (item, query_list[i])) {
            return true;
          }
        }
        return false;
      },
      'NOT': function (item, query_list) {
        return !itemMatchesQuery(item, query_list[0]);
      }
    },
    convertToRegexp = function (string) {
      return subString('^' + string.replace(
        new RegExp(
          '([\\{\\}\\(\\)\\^\\$\\&\\.\\*\\?\\\/\\+\\|\\[\\]\\-\\\\])'.
            replace(wildcard_character ?
                    "\\" + wildcard_character : undefined, ""),
          "g"
        ),
        "\\$1"
      ) + '$',(wildcard_character||undefined), '.*');
    },
    subString = function (string, substring, newsubstring) {
      var res = '', i = 0;
      if (substring === undefined) {
        return string;
      }
      while (true) {
        var tmp = string.indexOf(substring, i);
        if (tmp === -1) {
          break;
        }
        for (; i < tmp; i += 1) {
          res += string[i];
        }
        res += newsubstring;
        i += substring.length;
      }
      for (; i < string.length; i += 1) {
        res += string[i];
      }
      return res;
    },
  itemMatchesQuery = function (item, query_object) {
    var i;
    if (query_object.type === 'complex') {
      return operator_actions[query_object.operator](
        item, query_object.query_list
      );
    } else {
      if (query_object.id) {
        if (typeof item[query_object.id] !== 'undefined') {
          return operator_actions[query_object.operator](
            item[query_object.id], query_object.value
          );
        } else {
          return false;
        }
      } else {
        return true;
      }
    }
  },
  select = function (list, select_list) {
    var i;
    if (select_list.length === 0) {
      return;
    }
    for (i=0; i<list.length; ++i) {
      var list_value = {}, k;
      for (k=0; k<select_list.length; ++k) {
        list_value[select_list[k]] =
          list[i][select_list[k]];
      }
      list[i] = list_value;
    }
  },
  sortFunction = function (key, asc) {
    if (asc === 'descending') {
      return function (a,b) {
        return a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0;
      };
    }
    return function (a,b) {
      return a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0;
    };
  },
  mergeList = function (list, list_to_merge, index) {
    var i,j;
    for (i = index,j = 0; i < list_to_merge.length + index; ++i, ++j) {
      list[i] = list_to_merge[j];
    }
  },
  sort = function (list, sort_list) {
    var i, tmp, key, asc, sortAndMerge = function() {
      sort(tmp,sort_list.slice(1));
      mergeList(list,tmp,i-tmp.length);
      tmp = [list[i]];
    };
    if (list.length < 2) {
      return;
    }
    if (sort_list.length === 0) {
      return;
    }
    key = sort_list[0][0];
    asc = sort_list[0][1];
    list.sort (sortFunction (key,asc));
    tmp = [list[0]];
    for (i = 1; i < list.length; ++i) {
      if (tmp[0][key] === list[i][key]) {
        tmp.push(list[i]);
      } else {
        sortAndMerge();
      }
    }
    sortAndMerge();
  },
  limit = function (list, limit_list) {
    var i;
    if (typeof limit_list[0] !== 'undefined') {
      if (typeof limit_list[1] !== 'undefined') {
        if (list.length > limit_list[1] + limit_list[0]) {
          list.length = limit_list[1] + limit_list[0];
        }
        list.splice(0,limit_list[0]);
      } else {
        list.length = limit_list[0];
      }
    }
  },
  ////////////////////////////////////////////////////////////
  result_list = [], result_list_tmp = [], j;
  object_list = object_list || [];
  if (query.query === undefined) {
    result_list = object_list;
  } else {
    for (j=0; j<object_list.length; ++j) {
      if ( itemMatchesQuery (
        object_list[j], scope.ComplexQueries.parse (query.query)
      )) {
        result_list.push(object_list[j]);
      }
    }
  }
  if (query.filter) {
    select(result_list,query.filter.select_list || []);
    sort(result_list,query.filter.sort_on || []);
    limit(result_list,query.filter.limit || []);
  }
  return result_list;
}
