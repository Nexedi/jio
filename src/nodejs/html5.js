(function (env) {
  "use strict";

  const process = require("process");
  env._html5_weakmap = new WeakMap();

  function EventTarget() { env._html5_weakmap.set(this, Object.create(null)); }
  EventTarget.prototype.addEventListener = function (type, listener) {
    if (typeof listener !== "function") return;
    const em = env._html5_weakmap.get(this);
    type = "" + type;
    if (em[type]) em[type].push(listener);
    else em[type] = [listener];
  };
  EventTarget.prototype.removeEventListener = function (type, listener) {
    if (typeof listener !== "function") return;
    const em = env._html5_weakmap.get(this);
    var i = 0, listeners = em[type];
    type = "" + type;
    if (listeners) for (; i < listeners.length; ++i) if (listeners[i] === listener) {
      if (listeners.length === 1) { delete em[type]; return; }
      listeners.splice(i, 1);
      return;
    }
  };
  EventTarget.prototype.dispatchEvent = function (event) {
    const type = "" + event.type,
          em = env._html5_weakmap.get(this),
          ontype = "on" + type;
    var i = 0, listeners;
    if (typeof this[ontype] === "function") {
      try { this[ontype](event); } catch (ignore) {}
    }
    if (listeners = em[type]) for (; i < listeners.length; ++i) {
      try { listeners[i](event); } catch (ignore) {}
    }
  };
  env.EventTarget = EventTarget;

  function Blob(blobParts, options) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Blob
    var i = 0; const priv = {}, buffers = [];
    env._html5_weakmap.set(this, priv);
    for (; i < blobParts.length; ++i) {
      if (Buffer.isBuffer(blobParts[i])) {
        buffers.push(blobParts[i]);
      } else if (blobParts[i] instanceof Blob) {
        buffers.push(env._html5_weakmap.get(blobParts[i]).data);
      } else if (blobParts[i] instanceof ArrayBuffer) {
        buffers.push(new Buffer(new Uint8Array(blobParts[i])));
      } else {
        buffers.push(new Buffer("" + blobParts[i]));
      }
    }
    priv.data = Buffer.concat(buffers);
    Object.defineProperty(this, "size", {enumerable: true, value: priv.data.length});
    Object.defineProperty(this, "type", {enumerable: true, value: options ? "" + (options.type || "") : ""});
  }
  Blob.prototype.size = 0;
  Blob.prototype.type = "";
  Blob.prototype.slice = function (start, end, contentType) {
    return new Blob([env._html5_weakmap.get(this).data.slice(start, end)], {type: contentType});
  };
  env.Blob = Blob;
  global.Blob = Blob;

  function FileReader() { EventTarget.call(this); }
  FileReader.prototype = Object.create(EventTarget.prototype);
  Object.defineProperty(FileReader, "constructor", {value: FileReader});
  FileReader.prototype.readAsText = function (blob) {
    const priv = env._html5_weakmap.get(blob);
    const text = priv.data.toString();
    const event = Object.freeze({type: "load", target: this});
    process.nextTick(() => {
      this.result = text;
      this.dispatchEvent(event);
    });
  };
  FileReader.prototype.readAsArrayBuffer = function (blob) {
    const priv = env._html5_weakmap.get(blob);
    const arrayBuffer = new Uint8Array(priv.data).buffer;
    const event = Object.freeze({type: "load", target: this});
    process.nextTick(() => {
      this.result = arrayBuffer;
      this.dispatchEvent(event);
    });
  };
  FileReader.prototype.readAsDataURL = function (blob) {
    const priv = env._html5_weakmap.get(blob);
    const dataUrl = "data:" + blob.type + ";base64," + priv.data.toString("base64");
    const event = Object.freeze({type: "load", target: this});
    process.nextTick(() => {
      this.result = dataUrl;
      this.dispatchEvent(event);
    });
  };
  env.FileReader = FileReader;
  global.FileReader = FileReader;

}(this));
