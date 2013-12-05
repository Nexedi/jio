/*jslint indent: 2, nomen: true, sloppy: true */
/*global setTimeout, window, navigator */

(function () {
  ////////////////////////////////////////////////////////////
  // https://github.com/TristanCavelier/notesntools/blob/\
  // master/javascript/stringToUtf8Bytes.js
  /**
   * Converts a string into a Utf8 raw string (0 <= char <= 255)
   *
   * @param  {String} input String to convert
   * @return {String} Utf8 byte string
   */
  function stringToUtf8ByteString(input) {
    /*jslint bitwise: true */
    var output = "", i, x, y, l = input.length;

    for (i = 0; i < l; i += 1) {
      /* Decode utf-16 surrogate pairs */
      x = input.charCodeAt(i);
      y = i + 1 < l ? input.charCodeAt(i + 1) : 0;
      if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
        x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
        i += 1;
      }

      /* Encode output as utf-8 */
      if (x <= 0x7F) {
        output += String.fromCharCode(x);
      } else if (x <= 0x7FF) {
        output += String.fromCharCode(
          0xC0 | ((x >>> 6) & 0x1F),
          0x80 | (x & 0x3F)
        );
      } else if (x <= 0xFFFF) {
        output += String.fromCharCode(
          0xE0 | ((x >>> 12) & 0x0F),
          0x80 | ((x >>> 6) & 0x3F),
          0x80 | (x & 0x3F)
        );
      } else if (x <= 0x1FFFFF) {
        output += String.fromCharCode(
          0xF0 | ((x >>> 18) & 0x07),
          0x80 | ((x >>> 12) & 0x3F),
          0x80 | ((x >>> 6) & 0x3F),
          0x80 | (x & 0x3F)
        );
      }
    }
    return output;
  }

  /**
   * Converts a Utf8 raw string (0 <= char <= 255) into a real string
   *
   * @param  {String} input Utf8 encoded Bytes to convert
   * @return {String} Real string
   */
  function utf8ByteStringToString(input) {
    /*jslint bitwise: true */
    var output = "", i, x, l = input.length;

    for (i = 0; i < l; i += 1) {
      x = input.charCodeAt(i);
      if ((x & 0xF0) === 0xF0) {
        i += 1;
        x = ((x & 0x07) << 18) | (
          i < l ? (input.charCodeAt(i) & 0x3F) << 12 : 0
        );
        i += 1;
        x = x | (
          i < l ? (input.charCodeAt(i) & 0x3F) << 6 : 0
        );
        i += 1;
        x = x | (
          i < l ? input.charCodeAt(i) & 0x3F : 0
        );
        if (0x10000 <= x && x <= 0x10FFFF) {
          output += String.fromCharCode(
            (((x - 0x10000) >>> 10) & 0x03FF) | 0xD800,
            (x & 0x03FF) | 0xDC00
          );
        } else {
          output += String.fromCharCode(x);
        }
      } else if ((x & 0xE0) === 0xE0) {
        i += 1;
        x = ((x & 0x0F) << 12) | (
          i < l ? (input.charCodeAt(i) & 0x3F) << 6 : 0
        );
        i += 1;
        output += String.fromCharCode(x | (
          i < l ? input.charCodeAt(i) & 0x3F : 0
        ));
      } else if ((x & 0xC0) === 0xC0) {
        i += 1;
        output += String.fromCharCode(((x & 0x1F) << 6) | (
          i < l ? input.charCodeAt(i) & 0x3F : 0
        ));
      } else {
        output += String.fromCharCode(x);
      }
    }
    return output;
  }

  ////////////////////////////////////////////////////////////

  function Blob(parts, properties) {
    var i, part, raw = '', type;
    type = (properties && properties.type && properties.type.toString()) || "";
    if (!Array.isArray(parts)) {
      throw new TypeError("The method parameter is missing or invalid.");
    }
    if (properties !== undefined &&
        (typeof properties !== 'object' ||
         Object.getPrototypeOf(properties || []) !== Object.prototype)) {
      throw new TypeError("Value can't be converted to a dictionnary.");
    }
    for (i = 0; i < parts.length; i += 1) {
      part = parts[i];
      if (part instanceof Blob) {
        raw += part._data;
      } else if (part) {
        raw += stringToUtf8ByteString(part.toString());
      } else if (part === undefined) {
        raw += "undefined";
      }
    }
    Object.defineProperty(this, "_data", {
      "configurable": true,
      "enumerable": false,
      "writable": true,
      "value": raw
    });
    Object.defineProperty(this, "size", {
      "configurable": false,
      "enumerable": true,
      "writable": false,
      "value": raw.length
    });
    Object.defineProperty(this, "type", {
      "configurable": false,
      "enumerable": true,
      "writable": false,
      "value": type
    });
  }
  Blob.prototype.type = "";
  Blob.prototype.size = 0;
  Blob.prototype.slice = function (start, end, contentType) {
    var data, blob, i, fake_data = '';
    data = this._data.slice(start, end);
    for (i = 0; i < data.length; i += 1) {
      fake_data += 'a';
    }
    blob = new Blob([fake_data], {"type": contentType});
    blob._data = data;
    return blob;
  };

  ////////////////////////////////////////////////////////////
  // https://github.com/TristanCavelier/notesntools/blob/\
  // master/javascript/emitter.js
  function FileReader() {
    return;
  }

  FileReader.prototype.addEventListener = function (eventName, callback) {
    // Check parameters
    if (typeof callback !== "function") {
      return;
    }

    // assign callback to event
    this._events = this._events || {};
    this._events[eventName] = this._events[eventName] || [];
    this._events[eventName].push(callback);
  };

  function dispatchEvent(fr, eventName) {
    var args, i, funs = fr._events && fr._events[eventName] &&
      fr._events[eventName].slice();

    // for html5 EventTarget compatibility
    if (fr.hasOwnProperty('on' + eventName) &&
        typeof fr['on' + eventName] === "function") {
      funs = funs || [];
      funs.before = fr['on' + eventName];
    }

    if (funs) {
      args = [].slice.call(arguments, 2);

      // for html5 EventTarget compatibility
      if (funs.before) {
        // no try catch wraps listeners on EventTarget API
        funs.before.apply(fr, args);
      }

      // call funs
      for (i = 0; i < funs.length; i += 1) {
        funs[i].apply(fr, args);
      }
    }
  }

  FileReader.prototype.removeEventListener = function (eventName, callback) {
    var i, funs = this._events && this._events[eventName];

    if (funs) {
      for (i = 0; i < funs.length; i += 1) {
        if (funs[i] === callback) {
          funs.splice(i, 1);
          break;
        }
      }
    }
  };

  FileReader.prototype.abort = function () {
    this.dispatchEvent("abort", {"target": this});
    delete this._events;
  };

  FileReader.prototype.readAsBinaryString = function (blob) {
    var that = this;
    setTimeout(function () {
      dispatchEvent(that, "progress", {
        "loaded": blob.size,
        "total": blob.size,
        "target": that
      });
      that.result = blob._data;
      dispatchEvent(that, "load", {
        "loaded": blob.size,
        "total": blob.size,
        "target": that
      });
    });
  };

  FileReader.prototype.readAsText = function (blob) {
    var that = this;
    setTimeout(function () {
      dispatchEvent(that, "progress", {
        "loaded": blob.size,
        "total": blob.size,
        "target": that
      });
      that.result = utf8ByteStringToString(blob._data);
      dispatchEvent(that, "load", {
        "loaded": blob.size,
        "total": blob.size,
        "target": that
      });
    });
  };

  ////////////////////////////////////////////////////////////

  if (typeof Blob !== 'function' || typeof FileReader !== 'function' ||
      (/\bPhantomJS\b/i).test(navigator.userAgent)) {
    window.Blob = Blob;
    window.FileReader = FileReader;
  }

}());
