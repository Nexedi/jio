/*jslint indent: 2, maxlen: 80, sloppy: true, nomen: true */
/*global uniqueJSONStringify, methodType */

var defaults = {}, constants = {};

defaults.storage_types = {};

constants.dcmi_types = {
  'Collection': 'Collection',
  'Dataset': 'Dataset',
  'Event': 'Event',
  'Image': 'Image',
  'InteractiveResource': 'InteractiveResource',
  'MovingImage': 'MovingImage',
  'PhysicalObject': 'PhysicalObject',
  'Service': 'Service',
  'Software': 'Software',
  'Sound': 'Sound',
  'StillImage': 'StillImage',
  'Text': 'Text'
};
// if (dcmi_types.Collection === 'Collection') { is a DCMI type }
// if (typeof dcmi_types[name] === 'string')   { is a DCMI type }

constants.http_status_text = {
  "0": "Unknown",
  "550": "Internal JIO Error",
  "551": "Internal Storage Error",
  "Unknown": "Unknown",
  "Internal JIO Error": "Internal JIO Error",
  "Internal Storage Error": "Internal Storage Error",
  "unknown": "Unknown",
  "internal_jio_error": "Internal JIO Error",
  "internal_storage_error": "Internal Storage Error",

  "200": "Ok",
  "201": "Created",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Request Entity Too Large",
  "414": "Request-URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Requested Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "419": "Authentication Timeout",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "507": "Insufficient Storage",

  "Ok": "Ok",
  "Created": "Created",
  "No Content": "No Content",
  "Reset Content": "Reset Content",
  "Partial Content": "Partial Content",
  "Bad Request": "Bad Request",
  "Unauthorized": "Unauthorized",
  "Payment Required": "Payment Required",
  "Forbidden": "Forbidden",
  "Not Found": "Not Found",
  "Method Not Allowed": "Method Not Allowed",
  "Not Acceptable": "Not Acceptable",
  "Proxy Authentication Required": "Proxy Authentication Required",
  "Request Timeout": "Request Timeout",
  "Conflict": "Conflict",
  "Gone": "Gone",
  "Length Required": "Length Required",
  "Precondition Failed": "Precondition Failed",
  "Request Entity Too Large": "Request Entity Too Large",
  "Request-URI Too Long": "Request-URI Too Long",
  "Unsupported Media Type": "Unsupported Media Type",
  "Requested Range Not Satisfiable": "Requested Range Not Satisfiable",
  "Expectation Failed": "Expectation Failed",
  "I'm a teapot": "I'm a teapot",
  "Authentication Timeout": "Authentication Timeout",
  "Internal Server Error": "Internal Server Error",
  "Not Implemented": "Not Implemented",
  "Bad Gateway": "Bad Gateway",
  "Service Unavailable": "Service Unavailable",
  "Gateway Timeout": "Gateway Timeout",
  "Insufficient Storage": "Insufficient Storage",

  "ok": "Ok",
  "created": "Created",
  "no_content": "No Content",
  "reset_content": "Reset Content",
  "partial_content": "Partial Content",
  "bad_request": "Bad Request",
  "unauthorized": "Unauthorized",
  "payment_required": "Payment Required",
  "forbidden": "Forbidden",
  "not_found": "Not Found",
  "method_not_allowed": "Method Not Allowed",
  "not_acceptable": "Not Acceptable",
  "proxy_authentication_required": "Proxy Authentication Required",
  "request_timeout": "Request Timeout",
  "conflict": "Conflict",
  "gone": "Gone",
  "length_required": "Length Required",
  "precondition_failed": "Precondition Failed",
  "request_entity_too_large": "Request Entity Too Large",
  "request-uri_too_long": "Request-URI Too Long",
  "unsupported_media_type": "Unsupported Media Type",
  "requested_range_not_satisfiable": "Requested Range Not Satisfiable",
  "expectation_failed": "Expectation Failed",
  "im_a_teapot": "I'm a teapot",
  "authentication_timeout": "Authentication Timeout",
  "internal_server_error": "Internal Server Error",
  "not_implemented": "Not Implemented",
  "bad_gateway": "Bad Gateway",
  "service_unavailable": "Service Unavailable",
  "gateway_timeout": "Gateway Timeout",
  "insufficient_storage": "Insufficient Storage"
};

constants.http_status = {
  "0": 0,
  "550": 550,
  "551": 551,
  "Unknown": 0,
  "Internal JIO Error": 550,
  "Internal Storage Error": 551,
  "unknown": 0,
  "internal_jio_error": 550,
  "internal_storage_error": 551,

  "200": 200,
  "201": 201,
  "204": 204,
  "205": 205,
  "206": 206,
  "400": 400,
  "401": 401,
  "402": 402,
  "403": 403,
  "404": 404,
  "405": 405,
  "406": 406,
  "407": 407,
  "408": 408,
  "409": 409,
  "410": 410,
  "411": 411,
  "412": 412,
  "413": 413,
  "414": 414,
  "415": 415,
  "416": 416,
  "417": 417,
  "418": 418,
  "419": 419,
  "500": 500,
  "501": 501,
  "502": 502,
  "503": 503,
  "504": 504,
  "507": 507,

  "Ok": 200,
  "Created": 201,
  "No Content": 204,
  "Reset Content": 205,
  "Partial Content": 206,
  "Bad Request": 400,
  "Unauthorized": 401,
  "Payment Required": 402,
  "Forbidden": 403,
  "Not Found": 404,
  "Method Not Allowed": 405,
  "Not Acceptable": 406,
  "Proxy Authentication Required": 407,
  "Request Timeout": 408,
  "Conflict": 409,
  "Gone": 410,
  "Length Required": 411,
  "Precondition Failed": 412,
  "Request Entity Too Large": 413,
  "Request-URI Too Long": 414,
  "Unsupported Media Type": 415,
  "Requested Range Not Satisfiable": 416,
  "Expectation Failed": 417,
  "I'm a teapot": 418,
  "Authentication Timeout": 419,
  "Internal Server Error": 500,
  "Not Implemented": 501,
  "Bad Gateway": 502,
  "Service Unavailable": 503,
  "Gateway Timeout": 504,
  "Insufficient Storage": 507,

  "ok": 200,
  "created": 201,
  "no_content": 204,
  "reset_content": 205,
  "partial_content": 206,
  "bad_request": 400,
  "unauthorized": 401,
  "payment_required": 402,
  "forbidden": 403,
  "not_found": 404,
  "method_not_allowed": 405,
  "not_acceptable": 406,
  "proxy_authentication_required": 407,
  "request_timeout": 408,
  "conflict": 409,
  "gone": 410,
  "length_required": 411,
  "precondition_failed": 412,
  "request_entity_too_large": 413,
  "request-uri_too_long": 414,
  "unsupported_media_type": 415,
  "requested_range_not_satisfiable": 416,
  "expectation_failed": 417,
  "im_a_teapot": 418,
  "authentication_timeout": 419,
  "internal_server_error": 500,
  "not_implemented": 501,
  "bad_gateway": 502,
  "service_unavailable": 503,
  "gateway_timeout": 504,
  "insufficient_storage": 507
};

constants.http_action = {
  "0": "error",
  "550": "error",
  "551": "error",
  "Unknown": "error",
  "Internal JIO Error": "error",
  "Internal Storage Error": "error",
  "unknown": "error",
  "internal_jio_error": "error",
  "internal_storage_error": "error",

  "200": "success",
  "201": "success",
  "204": "success",
  "205": "success",
  "206": "success",
  "400": "error",
  "401": "error",
  "402": "error",
  "403": "error",
  "404": "error",
  "405": "error",
  "406": "error",
  "407": "error",
  "408": "error",
  "409": "error",
  "410": "error",
  "411": "error",
  "412": "error",
  "413": "error",
  "414": "error",
  "415": "error",
  "416": "error",
  "417": "error",
  "418": "error",
  "419": "retry",
  "500": "retry",
  "501": "error",
  "502": "error",
  "503": "retry",
  "504": "retry",
  "507": "error",

  "Ok": "success",
  "Created": "success",
  "No Content": "success",
  "Reset Content": "success",
  "Partial Content": "success",
  "Bad Request": "error",
  "Unauthorized": "error",
  "Payment Required": "error",
  "Forbidden": "error",
  "Not Found": "error",
  "Method Not Allowed": "error",
  "Not Acceptable": "error",
  "Proxy Authentication Required": "error",
  "Request Timeout": "error",
  "Conflict": "error",
  "Gone": "error",
  "Length Required": "error",
  "Precondition Failed": "error",
  "Request Entity Too Large": "error",
  "Request-URI Too Long": "error",
  "Unsupported Media Type": "error",
  "Requested Range Not Satisfiable": "error",
  "Expectation Failed": "error",
  "I'm a teapot": "error",
  "Authentication Timeout": "retry",
  "Internal Server Error": "retry",
  "Not Implemented": "error",
  "Bad Gateway": "error",
  "Service Unavailable": "retry",
  "Gateway Timeout": "retry",
  "Insufficient Storage": "error",

  "ok": "success",
  "created": "success",
  "no_content": "success",
  "reset_content": "success",
  "partial_content": "success",
  "bad_request": "error",
  "unauthorized": "error",
  "payment_required": "error",
  "forbidden": "error",
  "not_found": "error",
  "method_not_allowed": "error",
  "not_acceptable": "error",
  "proxy_authentication_required": "error",
  "request_timeout": "error",
  "conflict": "error",
  "gone": "error",
  "length_required": "error",
  "precondition_failed": "error",
  "request_entity_too_large": "error",
  "request-uri_too_long": "error",
  "unsupported_media_type": "error",
  "requested_range_not_satisfiable": "error",
  "expectation_failed": "error",
  "im_a_teapot": "error",
  "authentication_timeout": "retry",
  "internal_server_error": "retry",
  "not_implemented": "error",
  "bad_gateway": "error",
  "service_unavailable": "retry",
  "gateway_timeout": "retry",
  "insufficient_storage": "error"
};

constants.content_type_re =
  /^([a-z]+\/[a-zA-Z0-9\+\-\.]+)(?:\s*;\s*charset\s*=\s*([a-zA-Z0-9\-]+))?$/;

/**
 * Function that does nothing
 */
constants.emptyFunction = function () {
  return;
};

defaults.job_rule_conditions = {};

/**
 * Adds some job rule conditions
 */
(function () {

  /**
   * Compare two jobs and test if they use the same storage description
   *
   * @param  {Object} a The first job to compare
   * @param  {Object} b The second job to compare
   * @return {Boolean} True if equal, else false
   */
  function sameStorageDescription(a, b) {
    return uniqueJSONStringify(a.storage_spec) ===
      uniqueJSONStringify(b.storage_spec);
  }

  /**
   * Compare two jobs and test if they are writers
   *
   * @param  {Object} a The first job to compare
   * @param  {Object} b The second job to compare
   * @return {Boolean} True if equal, else false
   */
  function areWriters(a, b) {
    return methodType(a.method) === 'writer' &&
      methodType(b.method) === 'writer';
  }

  /**
   * Compare two jobs and test if they are readers
   *
   * @param  {Object} a The first job to compare
   * @param  {Object} b The second job to compare
   * @return {Boolean} True if equal, else false
   */
  function areReaders(a, b) {
    return methodType(a.method) === 'reader' &&
      methodType(b.method) === 'reader';
  }

  /**
   * Compare two jobs and test if their methods are the same
   *
   * @param  {Object} a The first job to compare
   * @param  {Object} b The second job to compare
   * @return {Boolean} True if equal, else false
   */
  function sameMethod(a, b) {
    return a.method === b.method;
  }

  /**
   * Compare two jobs and test if their document ids are the same
   *
   * @param  {Object} a The first job to compare
   * @param  {Object} b The second job to compare
   * @return {Boolean} True if equal, else false
   */
  function sameDocumentId(a, b) {
    return a.kwargs._id === b.kwargs._id;
  }

  /**
   * Test if the jobs have a document id.
   *
   * @param  {Object} a The first job to test
   * @param  {Object} b The second job to test
   * @return {Boolean} True if ids exist, else false
   */
  function haveDocumentIds(a, b) {
    if (typeof a.kwargs._id !== "string" || a.kwargs._id === "") {
      return false;
    }
    if (typeof b.kwargs._id !== "string" || b.kwargs._id === "") {
      return false;
    }
    return true;
  }

  /**
   * Compare two jobs and test if their kwargs are equal
   *
   * @param  {Object} a The first job to compare
   * @param  {Object} b The second job to compare
   * @return {Boolean} True if equal, else false
   */
  function sameParameters(a, b) {
    return uniqueJSONStringify(a.kwargs) ===
      uniqueJSONStringify(b.kwargs);
  }

  /**
   * Compare two jobs and test if their options are equal
   *
   * @param  {Object} a The first job to compare
   * @param  {Object} b The second job to compare
   * @return {Boolean} True if equal, else false
   */
  function sameOptions(a, b) {
    return uniqueJSONStringify(a.options) ===
      uniqueJSONStringify(b.options);
  }

  defaults.job_rule_conditions = {
    "sameStorageDescription": sameStorageDescription,
    "areWriters": areWriters,
    "areReaders": areReaders,
    "sameMethod": sameMethod,
    "sameDocumentId": sameDocumentId,
    "sameParameters": sameParameters,
    "sameOptions": sameOptions,
    "haveDocumentIds": haveDocumentIds
  };

}());
