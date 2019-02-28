/*
 * Copyright 2019, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */
/*jslint nomen: true */
/*global indexedDB, jIO, RSVP, IDBOpenDBRequest, IDBKeyRange,
        DOMError, Event, parseStringToObject, Set*/

(function (indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, IDBKeyRange,
  parseStringToObject) {
  "use strict";

  function IndexStorage2(description) {
    if (typeof description.database !== "string" ||
        description.database === "") {
      throw new TypeError("IndexStorage2 'database' description property " +
                          "must be a non-empty string");
    }
    this._sub_storage = jIO.createJIO(description.sub_storage);
    this._database_name = "jio:" + description.database;
    this._index_keys = description.index_keys;
  }

  IndexStorage2.prototype.hasCapacity = function (name) {
    return ((name === "list") || (name === "query"));
  };

  function handleUpgradeNeeded(evt, index_keys) {
    var db = evt.target.result, store, i, j;

    store = db.createObjectStore("index-store", {
      keyPath: "id",
      autoIncrement: false
    });
    for (i = 0; i < Object.keys(index_keys).length; i += 1) {
      for (j = 0; j < index_keys[Object.keys(index_keys)[i]].length; j += 1) {
        if (index_keys[Object.keys(index_keys)[i]][j] === 'normal') {
          store.createIndex("Index-" + Object.keys(index_keys)[i] +
            "-normal", "doc." + Object.keys(index_keys)[i], {unique: false});
        }
        if (index_keys[Object.keys(index_keys)[i]][j] === 'reverse') {
          store.createIndex("Index-" + Object.keys(index_keys)[i] +
            "-reverse", "doc." + Object.keys(index_keys)[i] + "reversed",
            {unique: false});
        }
      }
    }
  }

  function waitForOpenIndexedDB(db_name, index_keys, callback) {
    function resolver(resolve, reject) {
      // Open DB //
      var request = indexedDB.open(db_name);
      request.onerror = function (error) {
        if (request.result) {
          request.result.close();
        }
        if ((error !== undefined) &&
            (error.target instanceof IDBOpenDBRequest) &&
            (error.target.error instanceof DOMError)) {
          reject("Connection to: " + db_name + " failed: " +
                 error.target.error.message);
        } else {
          reject(error);
        }
      };

      request.onabort = function () {
        request.result.close();
        reject("Aborting connection to: " + db_name);
      };

      request.ontimeout = function () {
        request.result.close();
        reject("Connection to: " + db_name + " timeout");
      };

      request.onblocked = function () {
        request.result.close();
        reject("Connection to: " + db_name + " was blocked");
      };

      // Create DB if necessary //
      request.onupgradeneeded = function (evt) {
        handleUpgradeNeeded(evt, index_keys);
      };

      request.onversionchange = function () {
        request.result.close();
        reject(db_name + " was upgraded");
      };

      request.onsuccess = function () {
        return new RSVP.Queue()
          .push(function () {
            return callback(request.result);
          })
          .push(function (result) {
            request.result.close();
            resolve(result);
          }, function (error) {
            request.result.close();
            reject(error);
          });
      };
    }

    return new RSVP.Promise(resolver);
  }

  function waitForTransaction(db, stores, flag, callback) {
    var tx = db.transaction(stores, flag);
    function canceller() {
      try {
        tx.abort();
      } catch (unused) {
        // Transaction already finished
        return;
      }
    }
    function resolver(resolve, reject) {
      var result;
      try {
        result = callback(tx);
      } catch (error) {
        reject(error);
      }
      tx.oncomplete = function () {
        return new RSVP.Queue()
          .push(function () {
            return result;
          })
          .push(resolve, function (error) {
            canceller();
            reject(error);
          });
      };
      tx.onerror = function (error) {
        canceller();
        reject(error);
      };
      tx.onabort = function (evt) {
        reject(evt.target);
      };
      return tx;
    }
    return new RSVP.Promise(resolver, canceller);
  }

  function waitForIDBRequest(request) {
    return new RSVP.Promise(function (resolve, reject) {
      request.onerror = reject;
      request.onsuccess = resolve;
    });
  }

  function waitForAllSynchronousCursor(request, callback) {
    var force_cancellation = false;

    function canceller() {
      force_cancellation = true;
    }

    function resolver(resolve, reject) {
      request.onerror = reject;
      request.onsuccess = function (evt) {
        var cursor = evt.target.result;
        if (cursor && !force_cancellation) {
          try {
            callback(cursor);
          } catch (error) {
            reject(error);
          }
          // continue to next iteration
          cursor["continue"]();
        } else {
          resolve();
        }
      };
    }
    return new RSVP.Promise(resolver, canceller);
  }

  function intersect_array_on_ids(list_a, list_b) {
    var i, get_id = function (value) {return value.id; },
      id_set = new Set(list_a.map(get_id)), result = [];
    for (i = 0; i < list_b.length; i += 1) {
      if (id_set.has(list_b[i].id)) {
        result.push(list_b[i]);
      }
    }
    return result;
  }

  function filter_array_re(array, key, re) {
    var i, result = [];
    for (i = 0; i < array.length; i += 1) {
      if (re.test(array[i].doc[key])) {
        result.push(array[i]);
      }
    }
    return result;
  }

  IndexStorage2.prototype._runCursor = function (tx, index, search_term,
    result) {
    var keyRangeValue;
    function pushCursorValue(cursor) {
      result.push(cursor.value);
    }
    keyRangeValue = IDBKeyRange.bound(search_term, search_term + '\uffff');
    return waitForAllSynchronousCursor(
      tx.objectStore("index-store").index(index).openCursor(keyRangeValue),
      pushCursorValue
    )
      .then(function () {
        return result;
      });
  };

  IndexStorage2.prototype._runQuery = function (index, value) {
    var context = this, search_term, split_term,
      promise_list = [], index_name;
    return new RSVP.Queue()
      .push(function () {
        if (!(context._index_keys.hasOwnProperty(index))) {
          return context._sub_storage.buildQuery({"query": index + ":" + value})
            .then(function (result) {
              return result;
            });
        }
        return waitForOpenIndexedDB(context._database_name,
          context._index_keys, function (db) {
            return waitForTransaction(db, ["index-store"], "readonly",
                                    function (tx) {
                if (value.indexOf('%') !== -1) {
                  split_term = value.split(/(%)/);
                  // Query has preceding term
                  if (split_term[0].length !== 0) {
                    search_term = split_term[0];
                    index_name = "Index-" + index + "-normal";
                    promise_list.push(context._runCursor(tx, index_name,
                      search_term, []));
                  }
                  // Query has ending term
                  if (split_term[split_term.length - 1].length !== 0) {
                    // Does this key have a reversed index?
                    if (context._index_keys[index].indexOf("reverse") !== -1) {
                      search_term = split_term[split_term.length - 1]
                        .split("").reverse().join("");
                      index_name = "Index-" + index + "-reverse";
                      promise_list.push(context._runCursor(tx, index_name,
                        search_term, []));
                    }
                  }
                  return RSVP.all(promise_list)
                    .then(function (result) {
                      if (result.length === 1) {
                        result = result[0];
                      } else {
                        result = intersect_array_on_ids(result[0], result[1]);
                      }
                      // Query has parts which need to be manually matched
                      if (split_term.length > 3) {
                        var re_term = split_term.join("")
                          .replace(/\%/g, '[\\s\\S]*');
                        re_term = new RegExp(re_term);
                        result = filter_array_re(result, index, re_term);
                      }
                      return result;
                    });
                }
                return waitForIDBRequest(tx.objectStore("index-store")
                  .index("Index-" + index + "-normal").getAll(value))
                  .then(function (evt) {
                    return evt.target.result;
                  });
              });
          });
      });
  };

  IndexStorage2.prototype._processQueryObject = function (object) {
    var promise_list = [], context = this, i, j, query_result = new Set();
    return RSVP.Queue()
      .push(function () {
        if (object.type === "simple") {
          return context._runQuery(object.key, object.value);
        }
        if (object.type === "complex") {
          for (i = 0; i < object.query_list.length; i += 1) {
            promise_list.push(context
              ._processQueryObject(object.query_list[i]));
          }
          return RSVP.all(promise_list)
            .then(function (result) {
              if (object.operator === "OR") {
                for (i = 0; i < result.length; i += 1) {
                  for (j = 0; j < result[i].length; j += 1) {
                    query_result.add(result[i][j]);
                  }
                }
                return Array.from(query_result);
              }
              if (object.operator === "AND") {
                var temp_set = new Set();
                for (i = 0; i < result[0].length; i += 1) {
                  query_result.add(result[0][i].id);
                }
                for (i = 1; i < result.length; i += 1) {
                  for (j = 0; j < result[i].length; j += 1) {
                    if (query_result.has(result[i][j].id)) {
                      temp_set.add(result[i][j]);
                    }
                  }
                  query_result = temp_set;
                  temp_set = new Set();
                }
                return Array.from(query_result);
              }
            });
        }
      });
  };

  IndexStorage2.prototype.buildQuery = function (options) {
    return this._processQueryObject(parseStringToObject(options.query))
      .then(function (result) {
        return result.map(function (value) {return value.id; });
      });
  };

  IndexStorage2.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype._filter_doc_values = function (doc, keys) {
    var filtered_doc = {}, i;
    for (i = 0; i < Object.keys(keys).length; i += 1) {
      if (keys[Object.keys(keys)[i]].indexOf("normal") !== -1) {
        filtered_doc[Object.keys(keys)[i]] =
          doc[Object.keys(keys)[i]];
      }
      if (keys[Object.keys(keys)[i]].indexOf("reverse") !== -1) {
        filtered_doc[Object.keys(keys)[i] + "reversed"] =
          doc[Object.keys(keys)[i]].split("").reverse().join("");
      }
    }
    return filtered_doc;
  };

  IndexStorage2.prototype.put = function (id, value) {
    var context = this;
    return context._sub_storage.put(id, value)
      .push(function (result) {
        return waitForOpenIndexedDB(context._database_name,
          context._index_keys, function (db) {
            return waitForTransaction(db, ["index-store"], "readwrite",
                                function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store").put({
                  "id": id,
                  "doc": context._filter_doc_values(value, context._index_keys)
                }))
                  .then(function () {
                    return result;
                  });
              });
          });
      });
  };

  IndexStorage2.prototype.post = function (value) {
    var context = this;
    return context._sub_storage.post(value)
      .push(function (id) {
        return waitForOpenIndexedDB(context._database_name,
          context._index_keys, function (db) {
            return waitForTransaction(db, ["index-store"], "readwrite",
                                function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store").put({
                  "id": id,
                  "doc": context._filter_doc_values(value, context._index_keys)
                }))
                  .then(function () {
                    return id;
                  });
              });
          });
      });
  };

  IndexStorage2.prototype.remove = function (id) {
    var context = this;
    return context._sub_storage.remove(id)
      .push(function (result) {
        return waitForOpenIndexedDB(context._database_name, context._index_keys,
          function (db) {
            return waitForTransaction(db, ["index-store"], "readwrite",
              function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store")
                  .delete(id))
                  .then(function () {
                    return result;
                  });
              });
          });
      });
  };

  IndexStorage2.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
      arguments);
  };

  jIO.addStorage("index2", IndexStorage2);
}(indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, IDBKeyRange,
  parseStringToObject));