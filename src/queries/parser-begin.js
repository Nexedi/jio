/**
 * Parse a text request to a json query object tree
 *
 * @param  {String} string The string to parse
 * @return {Object} The json query tree
 */
function parseStringToObject(string) {

var arrayExtend = function () {
  var j, i, newlist = [], list_list = arguments;
  for (j = 0; j < list_list.length; j += 1) {
    for (i = 0; i < list_list[j].length; i += 1) {
      newlist.push(list_list[j][i]);
    }
  }
  return newlist;

}, mkSimpleQuery = function (key, value, operator) {
  var object = {"type": "simple", "key": key, "value": value};
  if (operator !== undefined) {
    object.operator = operator;
  }
  return object;

}, mkNotQuery = function (query) {
  if (query.operator === "NOT") {
    return query.query_list[0];
  }
  return {"type": "complex", "key": "", "operator": "NOT", "query_list": [query]};

}, mkComplexQuery = function (key, operator, query_list) {
  var i, query_list2 = [];
  for (i = 0; i < query_list.length; i += 1) {
    if (query_list[i].operator === operator) {
      query_list2 = arrayExtend(query_list2, query_list[i].query_list);
    } else {
      query_list2.push(query_list[i]);
    }
  }
  return {type:"complex",key:key,operator:operator,query_list:query_list2};

}, querySetKey = function (query, key) {
  if (({simple: 1, complex: 1})[query.type] && !query.key) {
    query.key = key;
    return true;
  }
  return false;
},
  error_offsets = [],
  error_lookaheads = [],
  error_count = 0,
  result;
