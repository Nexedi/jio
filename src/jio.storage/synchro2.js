var that = {};
var priv = {};
var RESPONSES = {"put":[],"get":[]};
var todo = function (string) {
  global.todo = global.todo || {};
  if (!global.todo[string]) {
    global.todo[string] = true;
    console.log('TODO: ' + string);
  }
};
priv.clone = function (object) {
  var tmp = JSON.stringify(object);
  if (tmp === undefined) {
    return undefined;
  }
  return JSON.parse(tmp);
};
that.addJob = function (method, storage_spec, doc, option, success, error) {
  console.log(method + " "+ JSON.stringify(storage_spec) +
              " " + JSON.stringify(doc) + " " + JSON.stringify(option));
  var r = RESPONSES[method].shift();
  setTimeout(function () {
    if (r.ok === true) {
      success(r);
    } else {
      error(r);
    }
  }, Math.floor(Math.random() * 500)); // {0..500}
};
priv.send = function (method, index, doc, option, callback) {
  console.log("send " + method + " " +
              JSON.stringify(priv.storage_list[index]) + " " +
              JSON.stringify(doc) + " " + JSON.stringify(option));
  var wrapped_callback_success, wrapped_callback_error;
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
priv.sendToAll = function (method, doc, option, callback) {
  console.log("sendToAll " + method + " " + JSON.stringify(doc) + " " +
              JSON.stringify(option));
  var i;
  for (i = 0; i < priv.storage_list.length; i += 1) {
    priv.send(method, i, doc, option, callback);
  }
};
priv.emptyFunction = function () {};
////////////////////////////////////////////////////////////////////////////////
// NEW
priv.replicateRevToDistantRev = function (revision, storage_index) {
  throw {"name": "NotImplementedError", "message": "replicateRevToDistantRev"};
};
// Check pass only if:
// - all the substorages answer the requests
// - they respond exactly the same thing
// - consistency is correct
// Consistency is correct if:
// - it has a correct revision
// If answers differ, the good answer is the first one which is more returned
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
priv.repair = function (doc, option, repair, callback) {
  callback = callback || priv.emptyFunction;
  option = option || {};
  var begin = function () {
    var param = {
      "doc": doc,
      "option": option,
      "repair": repair,
      "responses": {
        "count": 0,
        "list": [
          // 0: response0
          // 1: response1
          // 2: response2
        ],
        "stats": {
          // responseA: [0, 1]
          // responseB: [2]
        },
        "stats_items": [
          // 0: [responseA, [0, 1]]
          // 1: [responseB, [2]]
        ]
      }
    };
    getAllDocuments(param);
  },
  getAllDocuments = function (param) {
    var i, doc = priv.clone(param.doc), option = priv.clone(param.option);
    option.conflicts = true;
    option.revs = true;
    option.revs_info = true;
    for (i = 0; i < priv.storage_list.length; i += 1) {
      doc._rev = priv.replicateRevToDistantRev(doc._rev, i);
      priv.send("get", i, doc, option, dealResults(param));
    }
  },
  dealResults = function (param) {
    var deal_result_state = "ok";
    return function (method, index, err, response) {
      if (deal_result_state !== "ok") {
        // deal result is in a wrong state, exit
        return;
      }
      if (err) {
        if (err.status !== 404) {
          // get document failed, exit
          deal_result_state = "error";
          callback({
            "status": 40,
            "statusText": "Check Failed",
            "error": "check_failed",
            "message": "An error occured on the sub storage",
            "reason": err.reason
          });
          return;
        }
      }
      // success to get the document
      // add the response in memory
      param.responses.count += 1;
      param.responses.list[index] = response;
      param.responses.revs[response._rev] = response;
      if (param.responses.count !== param.responses.list.length) {
        // this is not the last response, wait for the next response
        return;
      }
      // this is now the last response

      makeResponsesStats(param.responses);
      if (param.responses.stats_items.length === 1) {
        // the responses are equals!
        callback(undefined, {
          "ok": true,
          "id": param.doc._id,
          "rev": priv.distantRevToReplicateRev(
            typeof param.responses.list[0] === "object" ?
              param.responses.list[0]._rev : undefined
          )
        });
        return;
      }
      // the responses are different
      if (param.repair === false) {
        // do not repair
        callback({
          "status": 41,
          "statusText": "Check Not Ok",
          "error": "check_not_ok",
          "message": "Some documents are different in the sub storages",
          "reason": "Storage contents differ"
        });
        return;
      }
      // repair
      synchronizeAllSubStorage(param);
    };
  },
  makeResponsesStats = function (responses) {
    var i;
    for (i = 0; i < responses.count; i += 1) {
      var str_response = JSON.stringify(responses.list[i]);
      if (responses.stats[str_response] === undefined) {
        responses.stats[str_response] = [];
        responses.stats_items.push(
          str_response,
          responses.stats[str_responses]
        );
      }
      responses.stats[str_response].push(i);
    }
  },
  synchronizeAllSubStorage = function (param) {
    var i, j, len = param.responses.stats_items.length;
    for (i = 0; i < len; i += 1) {
      // browsing responses
      for (j = 0; j < len; j += 1) {
        // browsing storage list
        if (i !== j) {
          synchronizeAllSubStorage(
            param,
            param.responses.stats_items[i][0],
            param.responses.stats_items[j][1]
          );
        }
      }
    }
  },
  synchronizeResponseToSubStorage = function (param, response, storage_list) {
    throw {"name": "NotImplementedError", "message": "synchronizeResponseToSubStorage"};
  };
  begin();
};
////////////////////////////////////////////////////////////////////////////////
// TEST


RESPONSES.get.push({"_id": "doc1", "_rev": "2-222"});
priv.storage_list = ["revision1"];
priv.repair({"_id": "doc1", "_rev": "2-2"}, {}, function (err, response) {
  console.log("END");
  console.log(err || response);
});

// priv.storage_list = ["revision1", "revision2", "revision3"];
// priv.repair({"_id": "doc1", "_rev": "2-222"}, function (err, response) {
//   console.log("END");
//   console.log(err || response);
// });
