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

  this.query_list = spec.query_list || [];

  // XXX
  this.match = function () {
    todo
  };

  // XXX
  this.toString = function () {
    var str_list = ["("];
    this.query_list.forEach(function (query) {
      str_list.push(query.toString());
      str_list.push(this.operator);
    });
    str_list.pop(); // remove last operator
    str_list.push(")");
    retrun str_list.join(" ");
  };

  // XXX
  this.serialized = function () {
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
