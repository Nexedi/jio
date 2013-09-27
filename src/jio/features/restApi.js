/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global arrayValuesToTypeDict, dictClear, RSVP, deepClone */

// adds methods to JIO
// - post
// - put
// - get
// - remove
// - allDocs
// - putAttachment
// - getAttachment
// - removeAttachment
// - check
// - repair

// event shared objet
// - storage_spec object
// - method string
// - kwargs object
// - options object
// - solver object
// - solver.resolve function
// - solver.reject function
// - solver.notify function
// - cancellers object
// - promise object

function enableRestAPI(jio, shared) { // (jio, shared, options)

  shared.rest_method_names = [
    "post",
    "put",
    "get",
    "remove",
    "allDocs",
    "putAttachment",
    "getAttachment",
    "removeAttachment",
    "check",
    "repair"
  ];

  function prepareParamAndEmit(method, storage_spec, args) {
    var callback, type_dict, param = {};
    type_dict = arrayValuesToTypeDict(Array.prototype.slice.call(args));
    type_dict.object = type_dict.object || [];
    if (method !== 'allDocs') {
      param.kwargs = type_dict.object.shift();
      if (param.kwargs === undefined) {
        throw new TypeError("JIO()." + method +
                            "(): Argument 1 is not of type 'object'");
      }
      param.kwargs = deepClone(param.kwargs);
    } else {
      param.kwargs = {};
    }
    param.solver = {};
    param.options = deepClone(type_dict.object.shift()) || {};
    param.promise = new RSVP.Promise(function (resolve, reject, notify) {
      param.solver.resolve = resolve;
      param.solver.reject = reject;
      param.solver.notify = notify;
    }, function () {
      var k;
      for (k in param.cancellers) {
        if (param.cancellers.hasOwnProperty(k)) {
          param.cancellers[k]();
        }
      }
    });
    type_dict['function'] = type_dict['function'] || [];
    if (type_dict['function'].length === 1) {
      callback = type_dict['function'][0];
      param.promise.then(function (answer) {
        callback(undefined, answer);
      }, function (answer) {
        callback(answer, undefined);
      });
    } else if (type_dict['function'].length > 1) {
      param.promise.then(type_dict['function'][0],
                         type_dict['function'][1],
                         type_dict['function'][2]);
    }
    type_dict = dictClear(type_dict);
    param.storage_spec = storage_spec;
    param.method = method;
    shared.emit(method, param);
    return param.promise;
  }

  shared.createRestApi = function (storage_spec, that) {
    if (that === undefined) {
      that = {};
    }
    shared.rest_method_names.forEach(function (method) {
      that[method] = function () {
        return prepareParamAndEmit(method, storage_spec, arguments);
      };
    });
    return that;
  };

  shared.createRestApi(shared.storage_spec, jio);
}
