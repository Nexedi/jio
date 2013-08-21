/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global arrayValuesToTypeDict, dictClear, Deferred, deepClone */

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
// - command object

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
    var promise, callback, type_dict, param = {};
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
    param.options = deepClone(type_dict.object.shift()) || {};
    //param.deferred = new IODeferred(method, param.kwargs, param.options);
    param.deferred = new Deferred();
    promise = param.deferred.promise();
    type_dict['function'] = type_dict['function'] || [];
    if (type_dict['function'].length === 1) {
      callback = type_dict['function'].shift();
      promise.done(function (answer) {
        callback(undefined, answer);
      });
      promise.fail(function (answer) {
        callback(answer, undefined);
      });
    } else if (type_dict['function'].length > 1) {
      promise.done(type_dict['function'].shift());
      promise.fail(type_dict['function'].shift());
      if (type_dict['function'].length === 1) {
        promise.always(type_dict['function'].shift());
      }
    }
    type_dict = dictClear(type_dict);
    param.storage_spec = storage_spec;
    param.method = method;
    shared.emit(method, param);
    return promise;
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
