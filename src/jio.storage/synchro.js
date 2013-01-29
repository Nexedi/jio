/*
  Synchronisation prototype
*/
var that = {};
var priv = {};
var global = {};
var GLOBAL = global;
var RESPONSES = [];
var storage = {};
var functions = {};
var todo = function (string) {
  global.todo = global.todo || {};
  if (!global.todo[string]) {
    global.todo[string] = true;
    console.log('TODO: ' + string);
  }
};
global.objectItems = function (object) {
  var array_of_couple = [], k;
  for (k in object) {
    if (object.hasOwnProperty(k)) {
      array_of_couple.push([k, object[k]])
    }
  }
  return array_of_couple;
};
global.clone = function (object) {
  var tmp = JSON.stringify(object);
  if (tmp === undefined) {
    return undefined;
  }
  return JSON.parse(tmp);
};
that.addJob = function (method, storage_spec, doc, option, success, error) {
  var r = RESPONSES.shift();
  setTimeout(function () {
    // if (doc._id) {
    //   // storage[doc._id] = doc;
    //   success(r);
    // } else {
    //   // var doc = storage[docid];
    //   // if (doc) {
    //   //   for (var k in r) {
    //   //     doc[k] = r[k];
    //   //   }
    //   //   success(doc);
    //   // }
    //   success(r);
    // }
    console.log(method + " " + JSON.stringify(storage_spec) + " " + JSON.stringify(doc) + " " + JSON.stringify(option));
    if (r.status) {
      error(r);
    } else {
      success(r);
    }
  }, 100);
};
that.error = function (err) {
  console.log("ERROR: " + JSON.stringify(err));
};
that.success = function (response) {
  console.log("SUCCESS: " + JSON.stringify(response));
};
priv.sendToAll = function (method, doc, option, callback) {
  var i;
  for (i = 0; i < priv.storage_list.length; i += 1) {
    priv.send(method, i, doc, option, callback);
  }
};
priv.storage_list = ['revision', 'revision', 'revision'];
////////////////////////////////////////////////////////////////////////////////
// TOOLS
////////////////////////////////////////////////////////////////////////////////
priv.emptyFunction = function () {};
priv.arrayFilter = function (array_list, array_value) {
  var i, j, add, newlist = [];
  for (i = 0; i < array_list.length; i += 1) {
    add = true;
    for (j = 0; j < array_value.length; j += 1) {
      if (array_list[i] === array_value[j]) {
        add = false;
        break;
      }
    }
    if (add === true) {
      newlist.push(array_list[i]);
    }
  }
  return newlist;
};
priv.makeArrayIndexes = function (length) {
  var i, newlist = [];
  for (i = 0; i < length; i += 1) {
    newlist.push(i);
  }
  return newlist;
};
////////////////////////////////////////////////////////////////////////////////
// CHECK CONSISTENCY
////////////////////////////////////////////////////////////////////////////////
that.check = function (command) {
  priv.check(
    command.cloneDoc(),
    command.cloneOption(),
    that.success,
    that.error
  );
};
that.repair = function (command) {
  priv.repair(
    command.cloneDoc(),
    command.cloneOption(),
    true,
    that.success,
    that.error
  );
};
priv.check = function (doc, option, success, error) {
  priv.repair(doc, option, false, success, error);
};
// Check pass only if:
// - all the substorages answer the requests
// - they respond exactly the same thing
// - consistency is correct
// Consistency is correct if:
// - it has a correct revision
// If answers differ, the good answer is the first one which is more returned
priv.repair = function (doc, option, repair, success, error) {
  var i, callback, callbackWrapper, responses = {
    "count": 0,
    "list": [],
    "stats": {}
  };
  success = success || priv.emptyFunction;
  error = error || priv.emptyFunction;
  responses.list.length = priv.storage_list.length;

  callbackWrapper = function () {
    callback.apply(callback, arguments);
  };

  callback = function (method, index, err, response) {
    var items, i, count;
    if (err) {
      if (err.status === 404) {
        // do nothing
      } else {
        // get document failed
        callback = priv.emptyFunction;
        error({
          "status": 40,
          "statusText": "Check Failed",
          "error": "check_failed",
          "message": "An error occured on the sub storage",
          "reason": err.reason
        });
        return;
      }
    }
    responses.count += 1;
    // success to get the document
    // keep the response in memory
    responses.list[index] = JSON.stringify(response || null);
    if (responses.count !== responses.list.length) {
      // this is not the last response
      return;
    }
    // this is the last response
    // create stats with all the responses
    for (i = 0; i < responses.count; i += 1) {
      if (responses.stats[responses.list[i]] === undefined) {
        responses.stats[responses.list[i]] = [];
      }
      responses.stats[responses.list[i]].push(i);
    }
    items = global.objectItems(responses.stats);
    if (items.length === 1) {
      // there is no difference between the responses, all is ok
      success({
        "ok": true,
        "id": doc.id,
        "rev": responses.list[0] !== "null" ? JSON.parse(responses.list[0])._rev : undefined
      });
      return;
    }
    // the response are not the similar
    if (repair === false) {
      // do not repair
      error({
        "status": 41,
        "statusText": "Check Not Ok",
        "error": "check_not_ok",
        "message": "Some documents are different in the sub storages",
        "reason": "Responses are different"
      });
      return;
    }
    // repair
    priv.synchronize(responses, option, success, error);
  };

  // get the documents to check
  priv.sendToAll("get", doc.id, {
    "conflicts": true,
    "revs": true,
    "revs_info": true,
    "rev": doc.rev
  }, callbackWrapper);
};
////////////////////////////////////////////////////////////////////////////////
// SYNCHRO METHOD
////////////////////////////////////////////////////////////////////////////////
priv.send = function (method, index, doc, option, callback) {
  var wrapped_callback_success, wrapped_callback_error, cloned_doc;
  callback = callback || priv.emptyFunction;
  wrapped_callback_success = function (response) {
    callback(method, index, undefined, response);
  };
  wrapped_callback_error = function (err) {
    callback(method, index, err, undefined);
  };
  that.addJob(
    method,
    priv.storage_list[index],
    doc,
    option,
    wrapped_callback_success,
    wrapped_callback_error
  );
};
// responses
// { count
//   list []
//   stats { responseA: []
//           responseB: [] }
// }
priv.synchronize = function (responses, option, success, error) {
  var response, storage_list_indexes, functions = {};
  storage_list_indexes = priv.makeArrayIndexes(priv.storage_list.length);
  functions.callback_count = 0;
  functions.callback_max = 0;
  functions.callback = function (err, response) {
    functions.callback_count += 1;
    if (err) {
      error(err);
      functions.callback = priv.emptyFunction;
      return;
    }
    if (functions.callback_max === functions.callback_count) {
      success(response);
    }
  };
  functions.callbackWrapper = function () {
    functions.callback.apply(functions.callback, arguments);
  };
  functions.syncSuccess = function (response) {
    functions.callbackWrapper(
      undefined,
      {"ok": response.ok, "id": "truc", "rev": response.rev}
    );
  };
  functions.syncError = function (err) {
    err.status = 43;
    err.statusText = "Repair Failed";
    err.error = "repair_failed";
    err.message = "Impossible to repair";
    functions.callbackWrapper(err, undefined);
  };
  for (response in responses.stats) {
    if (responses.stats.hasOwnProperty(response)) {
      var filtered_indexes = priv.arrayFilter(
        storage_list_indexes,
        responses.stats[response]
      );
      functions.callback_max += filtered_indexes.length;
      priv.synchronizeStorages(
        JSON.parse(response),
        option,
        filtered_indexes,
        functions.syncSuccess,
        functions.syncError
      );
    }
  }
};
priv.synchronizeStorages = function (doc, option, storage_index_list,
                                     success, error) {
  var i, callback = function (method, index, err, response) {
    if (err) {
      error(err);
      return;
    }
    success(response);
  };
  if (doc === null) {
    return;
  }
  success = success || priv.emptyFunction;
  error = error || priv.emptyFunction;
  if (doc._revs === undefined) {
    error({
      "status": 43,
      "statusText": "Fail To Repair",
      "error": "fail_to_repair",
      "message": "Impossible to repair this storage",
      "reason": "The response has no revision history"
    });
    return;
  }
  for (i = 0; i < storage_index_list.length; i += 1) {
    priv.send("put", storage_index_list[i], doc, option, callback);
  }
  if (option.synchronize_conflicting_versions !== false && doc._conflicts) {
    for (i = 0; i < doc._conflicts.length; i += 1) {
      var option_clone = global.clone(option);
      option_clone.synchronize_conflicting_versions = false;
      priv.repair({"id": "truc", "rev": doc._conflicts[i]}, option_clone, true);
    }
  }
};
////////////////////////////////////////////////////////////////////////////////
// Tests
////////////////////////////////////////////////////////////////////////////////
// RESPONSES.push({"_id": "truc", "_rev": "1-a", "_revs": {"start": 1, "ids": ["a"]}});
// RESPONSES.push({"_id": "truc", "_rev": "1-a", "_revs": {"start": 1, "ids": ["a"]}});
// //RESPONSES.push({"_id": "truc", "_rev": "1-a", "_revs": {"start": 1, "ids": ["a"]}});
// RESPONSES.push({"_id": "truc", "title": "autretruc", "_rev": "2-b", "_revs": {"start": 2, "ids": ["b","a"]}, "_conflicts": ["2-c"]});
// RESPONSES.push({"ok": true, "id": "truc", "rev": "1-a"});
// RESPONSES.push({"ok": true, "id": "truc", "rev": "2-b"});
// RESPONSES.push({"ok": true, "id": "truc", "rev": "2-b"});
// //RESPONSES.push({"status": 409, "statusText": "conflicts", "reason": "blue"});
// priv.repair({"id": "truc"}, true, {}, function (response) {
//   console.log('--- ok');
//   console.log(response);
// }, function (err) {
//   console.log('--- err');
//   console.log(err);
// });

RESPONSES.push({"status": 404, "reason": "missing"});
RESPONSES.push({"status": 404, "reason": "missing"});
//RESPONSES.push({"status": 404, "reason": "missing"});
RESPONSES.push({"_id": "truc", "title": "autretruc", "_rev": "2-b", "_revs": {"start": 2, "ids": ["b","a"]}, "_conflicts": ["2-c"]});
// RESPONSES.push({"ok": true, "id": "truc", "rev": "1-a"});
RESPONSES.push({"ok": true, "id": "truc", "rev": "2-b"});
RESPONSES.push({"ok": true, "id": "truc", "rev": "2-b"});
RESPONSES.push({"status": 404, "reason": "missing"});
RESPONSES.push({"status": 404, "reason": "missing"});
//RESPONSES.push({"status": 404, "reason": "missing"});
RESPONSES.push({"_id": "truc", "title": "autretruc", "_rev": "2-c", "_revs": {"start": 2, "ids": ["c","a"]}, "_conflicts": ["2-b"]});
// RESPONSES.push({"ok": true, "id": "truc", "rev": "1-a"});
RESPONSES.push({"ok": true, "id": "truc", "rev": "2-c"});
RESPONSES.push({"ok": true, "id": "truc", "rev": "2-c"});
//RESPONSES.push({"status": 409, "statusText": "conflicts", "reason": "blue"});
priv.repair({"id": "truc", "rev": "2-b"}, {}, true, function (response) {
  console.log('--- ok');
  console.log(response);
}, function (err) {
  console.log('--- err');
  console.log(err);
});






// ////////////////////////////////////////////////////////////////////////////////
// // SYNCHRO METHOD
// ////////////////////////////////////////////////////////////////////////////////
// priv.send = function (method, index, doc, option, callback) {
//   var wrapped_callback_success, wrapped_callback_error, cloned_doc;
//   callback = callback || function () {};
//   wrapped_callback_success = function (response) {
//     callback(method, index, undefined, response);
//   };
//   wrapped_callback_error = function (err) {
//     callback(method, index, err, undefined);
//   };
//   cloned_doc = global.clone(doc);
//   delete cloned_doc._revs;
//   delete cloned_doc._rev;
//   delete cloned_doc._revs_info;
//   delete cloned_doc._revisions;
//   that.addJob(
//     method,
//     priv.storage_list[index],
//     cloned_doc,
//     option,
//     wrapped_callback_success,
//     wrapped_callback_error
//   );
// };
// priv.storage_list = ['revision', 'revision', 'revision'];
// priv.createSynchronizeObject = function () {
//   var o = {
//     "storages_revisions": [],   // [ rev, rev, rev ]
//     "revs_info_array": [],      // [ revs_info, revs_info ]
//     "attachments_array": [],    // [
//     "responses": {}
//   };
//   o.storages_revisions.length = priv.storage_list.length;
//   o.revs_info_array.length = priv.storage_list.length;
//   return o;
// };
// priv.forEachResponseSynchronizeStorages = function (synchronize_object,
//                                                     method, index, err,
//                                                     response) {
//   var i;
//   todo('replaced, manage err');
//   console.log('Received: ' + JSON.stringify(response));
//   console.log('From: ' + index);
//   for (i = 0; i < synchronize_object.revs_info_array.length; i += 1) {
//     if (synchronize_object.revs_info_array[i] !== undefined) {
//       priv.synchronizeStorages(
//         synchronize_object,
//         response._id,
//         i,
//         index,
//         response._revs_info
//       );
//       todo("get conflicts and synchro again");
//     }
//   }
//   synchronize_object.revs_info_array[index] = response._revs_info;
// };
// priv.synchronizeStorages = function (synchronize_object, docid, index_a,
//                                      index_b, revs_info_b) {
//   var revs_info_a = synchronize_object.revs_info_array[index_a];
//   console.log('synchro ' + index_a + ' <-> ' + index_b);
//   sync = function (revs_info_src, revs_info_dest,
//                    source, destination) {
//     var functions = {};
//     functions.begin = function () {
//       if (revs_info_src.length == 0) {
//         // there is no more revision to check, exit
//         return;
//       }
//       rev_info_src = revs_info_src.shift();
//       rev_info_dest = '';
//       if (revs_info_dest.length > 0) {
//         // there is no more revisions on the destination
//         rev_info_dest = revs_info_dest[0];
//       }
//       if (rev_info_src.rev === rev_info_dest.rev) {
//         // file already exists in destination
//         console.log('    ' + source + ' --> ' + destination +
//                     ' exists ' + rev_info_dest.rev);
//         revs_info_dest.shift();
//         sync(revs_info_src, revs_info_dest, source, destination);
//         return;
//       }
//       if (synchronize_object.responses[rev_info_src.rev]) {
//         // document is already loaded but not in destination
//         functions.synchroDocumentFromCache();
//         return;
//       }
//       if (!synchronize_object.responses[rev_info_src.rev]) {
//         // if document is not loaded
//         functions.getAndSynchoDocument();
//         return;
//       }
//     };
//     functions.synchroDocumentFromCache = function () {
//       console.log('    cache --> ' + destination + ' sending ' +
//                   rev_info_dest.rev);
//       priv.send(
//         "put",
//         destination,
//         synchronize_object.responses[rev_info_src.rev],
//         function (method, index, err, response) {
//           todo('manage err');
//           if (err) {
//             return;
//           }
//           revs_info_src.shift();
//           sync(revs_info_src, revs_info_dest, source, destination);
//         }
//       );
//     };
//     functions.getAndSynchoDocument = function () {
//       console.log('    get   <-- ' + source + ' ' + rev_info_src.rev);
//       priv.send("get", source, docid, {
//         "revs": true,
//         "revs_info": true,
//         "conflicts": true,
//         "rev": rev_info_src.rev
//       }, function (method, index, err, response) {
//         todo('manage err');
//         if (err) {
//           return;
//         }
//         synchronize_object.responses[response._rev] = global.clone(response);
//         functions.synchroDocumentFromCache();
//       });
//     };
//     functions.begin();
//   };
//   sync(
//     global.clone(revs_info_a),
//     global.clone(revs_info_b),
//     index_a,
//     index_b
//   );
//   sync(
//     global.clone(revs_info_b),
//     global.clone(revs_info_a),
//     index_b,
//     index_a
//   );
// };
// ////////////////////////////////////////////////////////////////////////////////
// // INTERNAL FUNCTIONS
// ////////////////////////////////////////////////////////////////////////////////
// functions.forEachResponse = function (method, index, err, response) {
//   var synchronize_object = priv.createSynchronizeObject();
//   synchronize_object.revs_info_array[index] = response._revs_info;
//   todo("manage err");
//   if (err) {
//     return;
//   }
//   synchronize_object.responses[response._rev] = global.clone(response);
//   todo('manage options');
//   // remove conflicts, revs, revs_info only if necessary
//   that.success(response);
//   functions.forEachResponse = function (method, index, err, response) {
//     priv.forEachResponseSynchronizeStorages(
//       synchronize_object,
//       method,
//       index,
//       err,
//       response
//     );
//   };
// };
// functions.forEachResponseWrapper = function () {
//   functions.forEachResponse.apply(functions.forEachResponse, arguments);
// };
// ////////////////////////////////////////////////////////////////////////////////
// // TESTS
// ////////////////////////////////////////////////////////////////////////////////
// global.response_revision = '1-rh1';
// global.response_title = 'YES';
// global.response_revs_info = [{"rev": "1-rh1", "status": "available"}];
// priv.send("get", 0, "mydoc", {
//   "conflict": true,             // to add
//   "revs": true,                 // to add
//   "revs_info": true,            // to add
//   "max_retry": 3                // don't care
// }, functions.forEachResponseWrapper);

// global.response_revision = '1-rh1';
// global.response_title = 'YES';
// global.response_revs_info = [{"rev": "1-rh1", "status": "available"}];
// priv.send("get", 1, "mydoc", {
//   "conflict": true,             // to add
//   "revs": true,                 // to add
//   "revs_info": true,            // to add
//   "max_retry": 3                // don't care
// }, functions.forEachResponseWrapper);

// global.response_revision = '1-rh2';
// global.response_title = 'No';
// global.response_revs_info = [{"rev": "1-rh2", "status": "available"}];
// global.response_conflicts = ['1-rh1']; // try with ['1-rh1', '2-rh3']
// priv.send("get", 2, "mydoc", {
//   "conflict": true,             // to add
//   "revs": true,                 // to add
//   "revs_info": true,            // to add
//   "max_retry": 3                // don't care
// }, functions.forEachResponseWrapper);
