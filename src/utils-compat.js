/*
 * Copyright 2014, Nexedi SA
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

/* global window, WeakMap, Buffer, ArrayBuffer, Uint8Array */

/**
 * Compatibility functions with node.js
 */

import process from 'process';

var EventTarget,
  Blob,
  FileReader,
  html5weakmap;

try {
  EventTarget = window.EventTarget;
  Blob = window.Blob;
  FileReader = window.FileReader;
} catch (error) {
  html5weakmap = new WeakMap();

  EventTarget = function EventTarget() {
    html5weakmap.set(this, Object.create(null));
  };

  EventTarget.prototype.addEventListener = function (type, listener) {
    if (typeof listener !== 'function') {
      return;
    }
    var em = html5weakmap.get(this);
    type = type.toString();
    if (em[type]) {
      em[type].push(listener);
    } else {
      em[type] = [listener];
    }
  };

  EventTarget.prototype.removeEventListener = function (type, listener) {
    if (typeof listener !== 'function') {
      return;
    }
    var em = html5weakmap.get(this),
      i,
      listeners = em[type];

    type = type.toString();

    if (listeners) {
      for (i = 0; i < listeners.length; ++i) {
        if (listeners[i] === listener) {
          if (listeners.length === 1) {
            delete em[type];
            return;
          }
          listeners.splice(i, 1);
          return;
        }
      }
    }
  };

  EventTarget.prototype.dispatchEvent = function (event) {
    var type = event.type.toString(),
      em = html5weakmap.get(this),
      ontype = 'on' + type,
      i,
      listeners;

    if (typeof this[ontype] === 'function') {
      try {
        this[ontype](event);
      } catch (ignore) {}
    }
    listeners = em[type];
    if (listeners) {
      for (i = 0; i < listeners.length; ++i) {
        try {
          listeners[i](event);
        } catch (ignore) {}
      }
    }
  };

  Blob = function Blob(blobParts, options) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Blob
    var i,
      priv = {},
      buffers = [];

    html5weakmap.set(this, priv);
    for (i = 0; i < blobParts.length; ++i) {
      if (Buffer.isBuffer(blobParts[i])) {
        buffers.push(blobParts[i]);
      } else if (blobParts[i] instanceof Blob) {
        buffers.push(html5weakmap.get(blobParts[i]).data);
      } else if (blobParts[i] instanceof ArrayBuffer) {
        buffers.push(new Buffer(new Uint8Array(blobParts[i])));
      } else {
        buffers.push(new Buffer('' + blobParts[i]));
      }
    }
    priv.data = Buffer.concat(buffers);
    Object.defineProperty(this, 'size', {
      enumerable: true,
      value: priv.data.length
    });
    Object.defineProperty(this, 'type', {
      enumerable: true,
      value: options ? '' + (options.type || '') : ''
    });
  };
  Blob.prototype.size = 0;
  Blob.prototype.type = '';
  Blob.prototype.slice = function (start, end, contentType) {
    return new Blob([html5weakmap.get(this).data.slice(start, end)], {
      type: contentType
    });
  };

  FileReader = function FileReader() {
    EventTarget.call(this);
  };
  FileReader.prototype = Object.create(EventTarget.prototype);
  Object.defineProperty(FileReader, 'constructor', {
    value: FileReader
  });
  FileReader.prototype.readAsText = function (blob) {
    var target = this,
      priv = html5weakmap.get(blob),
      result = priv.data.toString(),
      event = Object.freeze({
        type: 'load',
        target: target
      });

    process.nextTick(function () {
      target.result = result;
      target.dispatchEvent(event);
    });
  };
  FileReader.prototype.readAsArrayBuffer = function (blob) {
    var target = this,
      priv = html5weakmap.get(blob),
      result = new Uint8Array(priv.data).buffer,
      event = Object.freeze({
        type: 'load',
        target: target
      });

    process.nextTick(function () {
      target.result = result;
      target.dispatchEvent(event);
    });
  };
  FileReader.prototype.readAsDataURL = function (blob) {
    var target = this,
      priv = html5weakmap.get(blob),
      result = 'data:' + blob.type + ';base64,' + priv.data.toString('base64'),
      event = Object.freeze({
        type: 'load',
        target: target
      });

    process.nextTick(function () {
      target.result = result;
      target.dispatchEvent(event);
    });
  };
}

function atob(str) {
  try {
    return window.atob(str);
  }
  catch (err) {
    var buffer;
    if (str instanceof Buffer) {
      buffer = str;
    }
    else {
      buffer = Buffer.from(str.toString(), 'base64');
    }
    return buffer.toString('binary');
  }
}

function btoa(str) {
  try {
    return window.btoa(str);
  }
  catch (err) {
    var buffer;
    if (str instanceof Buffer) {
      buffer = str;
    }
    else {
      buffer = Buffer.from(str.toString(), 'binary');
    }
    return buffer.toString('base64');
  }
}

export {
  EventTarget,
  Blob,
  FileReader,
  atob,
  btoa
};
