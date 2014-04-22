/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global parseStringToObject: true, emptyFunction: true, sortOn: true, limit:
  true, select: true, exports, stringEscapeRegexpCharacters: true,
  deepClone, RSVP, sequence, background, jIO, metadataValueToStringArray,
  sortFunction, setTimeout, clearTimeout */

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
  this.onParseStart = emptyFunction;

  /**
   * Called when parsing a simple query. Must be overridden!
   *
   * @method onParseSimpleQuery
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} option Some option gave in parse()
   */
  this.onParseSimpleQuery = emptyFunction;

  /**
   * Called when parsing a complex query. Must be overridden!
   *
   * @method onParseComplexQuery
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} option Some option gave in parse()
   */
  this.onParseComplexQuery = emptyFunction;

  /**
   * Called after parsing the query. Must be overridden!
   *
   * @method onParseEnd
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} option Some option gave in parse()
   */
  this.onParseEnd = emptyFunction;

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
  if (!background.removeUnmatchedSortLimitAndSelect) {
    background.removeUnmatchedSortLimitAndSelect = function (event) {
      var j, task = event.data.option, array = event.data.item_list;
      // remove unmatched documents
      for (j = array.length - 1; j >= 0; j -= 1) {
        if (!array[j]) {
          array.splice(j, 1);
        }
      }
      // sort documents
      if (task.sort_on) {
        sortOn(task.sort_on, array);
      }
      // limit documents
      if (task.limit) {
        limit(task.limit, array);
      }
      // select values
      select(task.select_list || [], array);
      /*global resolve */
      resolve(array);
    };
    background.removeUnmatchedSortLimitAndSelect = jIO.util.worker(
      metadataValueToStringArray.toString() +
        sortFunction.toString() +
        sortOn.toString() +
        limit.toString() +
        select.toString() +
        "onmessage = " + background.removeUnmatchedSortLimitAndSelect.toString()
    );
  }
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
  function sleep(delay, value) {
    var ident;
    return new RSVP.Promise(function (done) {
      ident = setTimeout(done, delay, value);
    }, function () {
      clearTimeout(ident);
    });
  }
  var this_ = this;
  return sequence([function () {
    // sequential operation
    var begin = Date.now();
    return jIO.util.forEach(item_list, function (value, i) {
      if (value) {
        return sequence([function () {
          return this_.match(item_list[i]);
        }, function (answer) {
          if (!answer) {
            item_list[i] = false;
          }
          var now = Date.now();
          if (begin <= now - 50) {
            begin = now;
            return sleep(4);
          }
        }]);
      }
      item_list[i] = false;
    });
    // // parallel operation
    // var i, promises = [];
    // function setToFalseIfNotMatch(i) {
    //   return function (a) {
    //     if (!a) {
    //       item_list[i] = false;
    //     }
    //   };
    // }
    // for (i = 0; i < item_list.length; i += 1) {
    //   if (!item_list[i]) {
    //     promises.push(RSVP.resolve(false));
    //   } else {
    //   promises.push(this_.match(item_list[i]).then(setToFalseIfNotMatch(i)));
    //   }
    // }
    // return RSVP.all(promises);
  }, function () {
    option = {
      "limit": option.limit,
      "sort_on": option.sort_on,
      "select_list": option.select_list
    };
    var tmp = background.removeUnmatchedSortLimitAndSelect({
      "item_list": item_list,
      "option": option
    });
    item_list = undefined; // free memory
    return tmp;
  }]);
};

/**
 * Test if an item matches this query
 *
 * @method match
 * @param  {Object} item The object to test
 * @return {Boolean} true if match, false otherwise
 */
Query.prototype.match = function () {
  return RSVP.resolve(true);
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
  var that = this, object;
  /**
   * The recursive parser.
   *
   * @param  {Object} object The object shared in the parse process
   * @param  {Object} options Some options usable in the parseMethods
   * @return {Any} The parser result
   */
  function recParse(object, option) {
    var query = object.parsed;
    if (query.type === "complex") {
      return sequence([function () {
        return sequence(query.query_list.map(function (v, i) {
          /*jslint unparam: true */
          return function () {
            return sequence([function () {
              object.parsed = query.query_list[i];
              return recParse(object, option);
            }, function () {
              query.query_list[i] = object.parsed;
            }]);
          };
        }));
      }, function () {
        object.parsed = query;
        return that.onParseComplexQuery(object, option);
      }]);
    }
    if (query.type === "simple") {
      return that.onParseSimpleQuery(object, option);
    }
  }
  object = {"parsed": JSON.parse(JSON.stringify(that.serialized()))};
  return sequence([function () {
    return that.onParseStart(object, option);
  }, function () {
    return recParse(object, option);
  }, function () {
    return that.onParseEnd(object, option);
  }, function () {
    return object.parsed;
  }]);
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

exports.Query = Query;
