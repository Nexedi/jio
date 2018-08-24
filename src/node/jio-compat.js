var html5weakmap = new WeakMap();

function EventTarget() {
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

function Blob(blobParts, options) {
  // https://developer.mozilla.org/en-US/docs/Web/API/Blob
  var i,
    priv = {},
    buffers = [];

  html5weakmap.set(this, priv);
  if (blobParts) {
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

window.Blob = Blob;

function FileReader() {
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
