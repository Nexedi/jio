var sinon = require('sinon');

global.sinon = sinon;

sinon.fakeServer = (function () {
  var push = [].push;
  function F() { }

  function create(proto) {
    F.prototype = proto;
    return new F();
  }

  function responseArray(handler) {
    var response = handler;

    if (Object.prototype.toString.call(handler) != "[object Array]") {
      response = [200, {}, handler];
    }

    if (typeof response[2] != "string") {
      throw new TypeError("Fake server response body should be string, but was " +
        typeof response[2]);
    }

    return response;
  }

  var wloc = typeof window !== "undefined" ? window.location : {};
  var rCurrLoc = new RegExp("^" + wloc.protocol + "//" + wloc.host);

  function matchOne(response, reqMethod, reqUrl) {
    var rmeth = response.method;
    var matchMethod = !rmeth || rmeth.toLowerCase() == reqMethod.toLowerCase();
    var url = response.url;
    var matchUrl = !url || url == reqUrl || (typeof url.test == "function" && url.test(reqUrl));

    return matchMethod && matchUrl;
  }

  function match(response, request) {
    var requestMethod = this.getHTTPMethod(request);
    var requestUrl = request.url;

    if (!/^https?:\/\//.test(requestUrl) || rCurrLoc.test(requestUrl)) {
      requestUrl = requestUrl.replace(rCurrLoc, "");
    }

    if (matchOne(response, this.getHTTPMethod(request), requestUrl)) {
      if (typeof response.response == "function") {
        var ru = response.url;
        var args = [request].concat(!ru ? [] : requestUrl.match(ru).slice(1));
        return response.response.apply(response, args);
      }

      return true;
    }

    return false;
  }

  function log(response, request) {
    var str;

    str = "Request:\n" + sinon.format(request) + "\n\n";
    str += "Response:\n" + sinon.format(response) + "\n\n";

    sinon.log(str);
  }

  return {
    create: function () {
      var server = create(this);
      this.xhr = sinon.useFakeXMLHttpRequest();
      server.requests = [];

      this.xhr.onCreate = function (xhrObj) {
        server.addRequest(xhrObj);
      };

      return server;
    },

    addRequest: function addRequest(xhrObj) {
      var server = this;
      push.call(this.requests, xhrObj);

      xhrObj.onSend = function () {
        server.handleRequest(this);
      };

      if (this.autoRespond && !this.responding) {
        setTimeout(function () {
          server.responding = false;
          server.respond();
        }, this.autoRespondAfter || 10);

        this.responding = true;
      }
    },

    getHTTPMethod: function getHTTPMethod(request) {
      if (this.fakeHTTPMethods && /post/i.test(request.method)) {
        var matches = (request.requestBody || "").match(/_method=([^\b;]+)/);
        return !!matches ? matches[1] : request.method;
      }

      return request.method;
    },

    handleRequest: function handleRequest(xhr) {
      if (xhr.async) {
        if (!this.queue) {
          this.queue = [];
        }

        push.call(this.queue, xhr);
      } else {
        this.processRequest(xhr);
      }
    },

    respondWith: function respondWith(method, url, body) {
      if (arguments.length == 1 && typeof method != "function") {
        this.response = responseArray(method);
        return;
      }

      if (!this.responses) { this.responses = []; }

      if (arguments.length == 1) {
        body = method;
        url = method = null;
      }

      if (arguments.length == 2) {
        body = url;
        url = method;
        method = null;
      }

      push.call(this.responses, {
        method: method,
        url: url,
        response: typeof body == "function" ? body : responseArray(body)
      });
    },

    respond: function respond() {
      if (arguments.length > 0) this.respondWith.apply(this, arguments);
      var queue = this.queue || [];
      var request;

      while (request = queue.shift()) {
        this.processRequest(request);
      }
    },

    processRequest: function processRequest(request) {
      try {
        if (request.aborted) {
          return;
        }

        var response = this.response || [404, {}, ""];

        if (this.responses) {
          for (var i = 0, l = this.responses.length; i < l; i++) {
            if (match.call(this, this.responses[i], request)) {
              response = this.responses[i].response;
              break;
            }
          }
        }

        if (request.readyState != 4) {
          log(response, request);

          request.respond(response[0], response[1], response[2]);
        }
      } catch (e) {
        sinon.logError("Fake server request processing", e);
      }
    },

    restore: function restore() {
      return this.xhr.restore && this.xhr.restore.apply(this.xhr, arguments);
    }
  };
}());

// sinon/lib/sinon/util/fake_xml_http_request

sinon.xhr = { XMLHttpRequest: global.XMLHttpRequest };

// wrapper for global
(function () {
  var xhr = sinon.xhr;
  xhr.GlobalXMLHttpRequest = global.XMLHttpRequest;
  xhr.GlobalActiveXObject = global.ActiveXObject;
  xhr.supportsActiveX = typeof xhr.GlobalActiveXObject != "undefined";
  xhr.supportsXHR = typeof xhr.GlobalXMLHttpRequest != "undefined";
  xhr.workingXHR = xhr.supportsXHR ? xhr.GlobalXMLHttpRequest : xhr.supportsActiveX
    ? function () { return new xhr.GlobalActiveXObject("MSXML2.XMLHTTP.3.0") } : false;

  /*jsl:ignore*/
  var unsafeHeaders = {
    "Accept-Charset": true,
    "Accept-Encoding": true,
    "Connection": true,
    "Content-Length": true,
    "Cookie": true,
    "Cookie2": true,
    "Content-Transfer-Encoding": true,
    "Date": true,
    "Expect": true,
    "Host": true,
    "Keep-Alive": true,
    "Referer": true,
    "TE": true,
    "Trailer": true,
    "Transfer-Encoding": true,
    "Upgrade": true,
    "User-Agent": true,
    "Via": true
  };
  /*jsl:end*/

  function FakeXMLHttpRequest() {
    this.readyState = FakeXMLHttpRequest.UNSENT;
    this.requestHeaders = {};
    this.requestBody = null;
    this.status = 0;
    this.statusText = "";

    var xhr = this;
    var events = ["loadstart", "load", "abort", "loadend"];

    function addEventListener(eventName) {
      xhr.addEventListener(eventName, function (event) {
        var listener = xhr["on" + eventName];

        if (listener && typeof listener == "function") {
          listener(event);
        }
      });
    }

    for (var i = events.length - 1; i >= 0; i--) {
      addEventListener(events[i]);
    }

    if (typeof FakeXMLHttpRequest.onCreate == "function") {
      FakeXMLHttpRequest.onCreate(this);
    }
  }

  function verifyState(xhr) {
    if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
      throw new Error("INVALID_STATE_ERR");
    }

    if (xhr.sendFlag) {
      throw new Error("INVALID_STATE_ERR");
    }
  }

  // filtering to enable a white-list version of Sinon FakeXhr,
  // where whitelisted requests are passed through to real XHR
  function each(collection, callback) {
    if (!collection) return;
    for (var i = 0, l = collection.length; i < l; i += 1) {
      callback(collection[i]);
    }
  }
  function some(collection, callback) {
    for (var index = 0; index < collection.length; index++) {
      if (callback(collection[index]) === true) return true;
    };
    return false;
  }
  // largest arity in XHR is 5 - XHR#open
  var apply = function (obj, method, args) {
    switch (args.length) {
      case 0: return obj[method]();
      case 1: return obj[method](args[0]);
      case 2: return obj[method](args[0], args[1]);
      case 3: return obj[method](args[0], args[1], args[2]);
      case 4: return obj[method](args[0], args[1], args[2], args[3]);
      case 5: return obj[method](args[0], args[1], args[2], args[3], args[4]);
    };
  };

  FakeXMLHttpRequest.filters = [];
  FakeXMLHttpRequest.addFilter = function (fn) {
    this.filters.push(fn)
  };
  var IE6Re = /MSIE 6/;
  FakeXMLHttpRequest.defake = function (fakeXhr, xhrArgs) {
    var xhr = new sinon.xhr.workingXHR();
    each(["open", "setRequestHeader", "send", "abort", "getResponseHeader",
      "getAllResponseHeaders", "addEventListener", "overrideMimeType", "removeEventListener"],
      function (method) {
        fakeXhr[method] = function () {
          return apply(xhr, method, arguments);
        };
      });

    var copyAttrs = function (args) {
      each(args, function (attr) {
        try {
          fakeXhr[attr] = xhr[attr]
        } catch (e) {
          if (!IE6Re.test(navigator.userAgent)) throw e;
        }
      });
    };

    var stateChange = function () {
      fakeXhr.readyState = xhr.readyState;
      if (xhr.readyState >= FakeXMLHttpRequest.HEADERS_RECEIVED) {
        copyAttrs(["status", "statusText"]);
      }
      if (xhr.readyState >= FakeXMLHttpRequest.LOADING) {
        copyAttrs(["responseText"]);
      }
      if (xhr.readyState === FakeXMLHttpRequest.DONE) {
        copyAttrs(["responseXML"]);
      }
      if (fakeXhr.onreadystatechange) fakeXhr.onreadystatechange.call(fakeXhr);
    };
    if (xhr.addEventListener) {
      for (var event in fakeXhr.eventListeners) {
        if (fakeXhr.eventListeners.hasOwnProperty(event)) {
          each(fakeXhr.eventListeners[event], function (handler) {
            xhr.addEventListener(event, handler);
          });
        }
      }
      xhr.addEventListener("readystatechange", stateChange);
    } else {
      xhr.onreadystatechange = stateChange;
    }
    apply(xhr, "open", xhrArgs);
  };
  FakeXMLHttpRequest.useFilters = false;

  function verifyRequestSent(xhr) {
    if (xhr.readyState == FakeXMLHttpRequest.DONE) {
      throw new Error("Request done");
    }
  }

  function verifyHeadersReceived(xhr) {
    if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
      throw new Error("No headers received");
    }
  }

  function verifyResponseBodyType(body) {
    if (typeof body != "string") {
      var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
        body + ", which is not a string.");
      error.name = "InvalidBodyException";
      throw error;
    }
  }

  sinon.extend(FakeXMLHttpRequest.prototype, sinon.EventTarget, {
    async: true,

    open: function open(method, url, async, username, password) {
      this.method = method;
      this.url = url;
      this.async = typeof async == "boolean" ? async : true;
      this.username = username;
      this.password = password;
      this.responseText = null;
      this.responseXML = null;
      this.requestHeaders = {};
      this.sendFlag = false;
      if (sinon.FakeXMLHttpRequest.useFilters === true) {
        var xhrArgs = arguments;
        var defake = some(FakeXMLHttpRequest.filters, function (filter) {
          return filter.apply(this, xhrArgs)
        });
        if (defake) {
          return sinon.FakeXMLHttpRequest.defake(this, arguments);
        }
      }
      this.readyStateChange(FakeXMLHttpRequest.OPENED);
    },

    readyStateChange: function readyStateChange(state) {
      this.readyState = state;

      if (typeof this.onreadystatechange == "function") {
        try {
          this.onreadystatechange();
        } catch (e) {
          sinon.logError("Fake XHR onreadystatechange handler", e);
        }
      }

      this.dispatchEvent(new sinon.Event("readystatechange"));

      switch (this.readyState) {
        case FakeXMLHttpRequest.DONE:
          this.dispatchEvent(new sinon.Event("load", false, false, this));
          this.dispatchEvent(new sinon.Event("loadend", false, false, this));
          break;
      }
    },

    setRequestHeader: function setRequestHeader(header, value) {
      verifyState(this);

      if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
        throw new Error("Refused to set unsafe header \"" + header + "\"");
      }

      if (this.requestHeaders[header]) {
        this.requestHeaders[header] += "," + value;
      } else {
        this.requestHeaders[header] = value;
      }
    },

    // Helps testing
    setResponseHeaders: function setResponseHeaders(headers) {
      this.responseHeaders = {};

      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
          this.responseHeaders[header] = headers[header];
        }
      }

      if (this.async) {
        this.readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
      } else {
        this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
      }
    },

    // Currently treats ALL data as a DOMString (i.e. no Document)
    send: function send(data) {
      verifyState(this);

      if (!/^(get|head)$/i.test(this.method)) {
        if (this.requestHeaders["Content-Type"]) {
          var value = this.requestHeaders["Content-Type"].split(";");
          this.requestHeaders["Content-Type"] = value[0] + ";charset=utf-8";
        } else {
          this.requestHeaders["Content-Type"] = "text/plain;charset=utf-8";
        }

        this.requestBody = data;
      }

      this.errorFlag = false;
      this.sendFlag = this.async;
      this.readyStateChange(FakeXMLHttpRequest.OPENED);

      if (typeof this.onSend == "function") {
        this.onSend(this);
      }

      this.dispatchEvent(new sinon.Event("loadstart", false, false, this));
    },

    abort: function abort() {
      this.aborted = true;
      this.responseText = null;
      this.errorFlag = true;
      this.requestHeaders = {};

      if (this.readyState > sinon.FakeXMLHttpRequest.UNSENT && this.sendFlag) {
        this.readyStateChange(sinon.FakeXMLHttpRequest.DONE);
        this.sendFlag = false;
      }

      this.readyState = sinon.FakeXMLHttpRequest.UNSENT;

      this.dispatchEvent(new sinon.Event("abort", false, false, this));
      if (typeof this.onerror === "function") {
        this.onerror();
      }
    },

    getResponseHeader: function getResponseHeader(header) {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return null;
      }

      if (/^Set-Cookie2?$/i.test(header)) {
        return null;
      }

      header = header.toLowerCase();

      for (var h in this.responseHeaders) {
        if (h.toLowerCase() == header) {
          return this.responseHeaders[h];
        }
      }

      return null;
    },

    getAllResponseHeaders: function getAllResponseHeaders() {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return "";
      }

      var headers = "";

      for (var header in this.responseHeaders) {
        if (this.responseHeaders.hasOwnProperty(header) &&
          !/^Set-Cookie2?$/i.test(header)) {
          headers += header + ": " + this.responseHeaders[header] + "\r\n";
        }
      }

      return headers;
    },

    setResponseBody: function setResponseBody(body) {
      verifyRequestSent(this);
      verifyHeadersReceived(this);
      verifyResponseBodyType(body);

      var chunkSize = this.chunkSize || 10;
      var index = 0;
      this.responseText = "";

      do {
        if (this.async) {
          this.readyStateChange(FakeXMLHttpRequest.LOADING);
        }

        this.responseText += body.substring(index, index + chunkSize);
        index += chunkSize;
      } while (index < body.length);

      var type = this.getResponseHeader("Content-Type");

      if (this.responseText &&
        (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
        try {
          this.responseXML = FakeXMLHttpRequest.parseXML(this.responseText);
        } catch (e) {
          // Unable to parse XML - no biggie
        }
      }

      if (this.async) {
        this.readyStateChange(FakeXMLHttpRequest.DONE);
      } else {
        this.readyState = FakeXMLHttpRequest.DONE;
      }
    },

    respond: function respond(status, headers, body) {
      this.setResponseHeaders(headers || {});
      this.status = typeof status == "number" ? status : 200;
      this.statusText = FakeXMLHttpRequest.statusCodes[this.status];
      this.setResponseBody(body || "");
      if (typeof this.onload === "function") {
        this.onload();
      }

    }
  });

  sinon.extend(FakeXMLHttpRequest, {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4
  });

  // Borrowed from JSpec
  FakeXMLHttpRequest.parseXML = function parseXML(text) {
    var xmlDoc;

    if (typeof DOMParser != "undefined") {
      var parser = new DOMParser();
      xmlDoc = parser.parseFromString(text, "text/xml");
    } else {
      xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async = "false";
      xmlDoc.loadXML(text);
    }

    return xmlDoc;
  };

  FakeXMLHttpRequest.statusCodes = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    300: "Multiple Choice",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported"
  };

  sinon.useFakeXMLHttpRequest = function () {
    sinon.FakeXMLHttpRequest.restore = function restore(keepOnCreate) {
      if (xhr.supportsXHR) {
        global.XMLHttpRequest = xhr.GlobalXMLHttpRequest;
      }

      if (xhr.supportsActiveX) {
        global.ActiveXObject = xhr.GlobalActiveXObject;
      }

      delete sinon.FakeXMLHttpRequest.restore;

      if (keepOnCreate !== true) {
        delete sinon.FakeXMLHttpRequest.onCreate;
      }
    };
    if (xhr.supportsXHR) {
      global.XMLHttpRequest = sinon.FakeXMLHttpRequest;
    }

    if (xhr.supportsActiveX) {
      global.ActiveXObject = function ActiveXObject(objId) {
        if (objId == "Microsoft.XMLHTTP" || /^Msxml2\.XMLHTTP/i.test(objId)) {

          return new sinon.FakeXMLHttpRequest();
        }

        return new xhr.GlobalActiveXObject(objId);
      };
    }

    return sinon.FakeXMLHttpRequest;
  };

  sinon.FakeXMLHttpRequest = FakeXMLHttpRequest;
})();

module.exports = sinon;
