/*jslint sloppy: true */
/*global Query*/

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
Query.objectToSearchText = objectToSearchText;
