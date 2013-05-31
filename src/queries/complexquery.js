// XXX
var ComplexQuery = newClass(Query, function (spec) {

  /**
   * Logical operator to use to compare object values
   *
   * @property operator
   * @type String
   * @default "AND"
   */
  this.operator = spec.operator || "AND";

  this.query_list = todo;

  /**
   * Filter the item list only if all the sub queries match this item according
   * to the logical operator.
   * See {{#crossLink "Query/exec:method"}}{{/crossLink}}
   */
  this.exec = function (item_list, option) {
    todo
  };

  // XXX
  this["AND"] = function (item, wildcard_character) {
    var i;
    for (i = 0; i < this.query_list.length; i += 1) {
      if (!this.query_list[i].match(item, wildcard_character)) {
        return false;
      }
    }
    return true;
  };

  // XXX
  this["OR"] =  function (item, wildcard_character) {
    var i;
    for (i = 0; i < this.query_list.length; i += 1) {
      if (this.query_list[i].match(item, wildcard_character)) {
        return true;
      }
    }
    return false;
  };

  // XXX
  this["NOT"] = function (item, wildcard_character) {
    return !this.query_list[0].match(item, wildcard_character);
  };
});

query_class_dict.complex = ComplexQuery;

_export("ComplexQuery", ComplexQuery);
