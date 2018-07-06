/*
 * Copyright 2013, Nexedi SA
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

  function Uint8Array(one) { // , two, three
    /*jslint bitwise: true */
    this.buffer = this;
    var i;
    if (one instanceof Uint8Array) {
      for (i = 0; i < one.length; i += 1) {
        this[i] = one[i] & 0xFF;
      }
      this.length = one.length;
      return;
    }
    if (typeof one === "number" && isFinite(one)) {
      for (i = 0; i < one; i += 1) {
        this[i] = 0;
      }
      this.length = one;
      return;
    }
    // if (one instanceof ArrayBuffer) {
    //   two === byteOffset
    //   three === length
    // }
    this.length = 0;
  }

  Uint8Array.prototype.set = function () {
    throw new Error("Not implemented");
  };

  Uint8Array.prototype.subarray = function (begin, end) {
    if (typeof begin !== "number" || !isFinite(begin) || begin < 0) {
      begin = 0;
    }
    if (begin > this.length) {
      begin = this.length;
    }
    if (typeof end !== "number" || !isFinite(end) || end > this.length) {
      end = this.length;
    }
    if (end < begin) {
      end = begin;
    }
    var i, j, uint8array = new Uint8Array(end - begin);
    /*jslint bitwise: true */
    for (i = begin, j = 0; i < end; i += 1, j += 1) {
      uint8array[j] = this[i] & 0xFF;
    }
    return uint8array;
  };

  ////////////////////////////////////////////////////////////

  function Blob(parts, properties) {
    var i, j, part, raw = '', type;
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
      } else if (part instanceof Uint8Array) {
        /*jslint bitwise: true */
        for (j = 0; j < part.length; j += 1) {
          raw += String.fromCharCode(part[j] & 0xFF);
        }
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
    window.Uint8Array = Uint8Array;
    //console.warn("Blob, FileReader and Uint8Array have been replaced!");
  }

  if (!Function.prototype.bind) {
    //////////////////////////////////////////////////////////////////////
    // https://github.com/TristanCavelier/notesntools/blob/master/javascript/\
    // bind.js
    /**
     * Creates a new function that, when called, has its `this` keyword set to
     * the provided value, with a given sequence of arguments preceding any
     * provided when the new function is called. See Mozilla Developer Network:
     * Function.prototype.bind
     *
     * In PhantomJS, their is a bug with `Function.prototype.bind`. You can
     * reproduce this bug by testing this code:
     *
     *     function a(str) { console.log(this, str); }
     *     var b = a.bind({"a": "b"}, "test");
     *     b();
     *
     * @param {Object} thisArg The value to be passed as the `this` parameter to
     *   the target function when the bound function is called. The value is
     *   ignored if the bound function is constructed using the `new` operator.
     *
     * @param {Any} [arg]* Arguments to prepend to arguments provided to the
     *   bound function when invoking the target function.
     *
     * @return {Function} The bound function.
     */
    Function.prototype.bind = function (thisArg) {
      var fun = this, args = [].slice.call(arguments, 1);
      return function () {
        args.push.apply(args, arguments);
        return fun.apply(thisArg, args);
      };
    };
    //console.warn("Function.prototype.bind has been replaced!");
  }

}());
