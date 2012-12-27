"use strict";
var localStorage = {};
// clear
Object.defineProperty(localStorage,"clear",{
    configurable:false,enumerable:false,writable:false,value:function () {
        var k;
        for (k in this) {
            delete this[k];
        }
    }
});
// key
Object.defineProperty(localStorage,"key",{
    configurable:false,enumerable:false,writable:false,value:function (n) {
        var i, k;
        if (n < 0 || n >= this.length) {
            return null;
        }
        for (k in this) {
            if (i === n) {
                return k;
            }
            i += 1
        }
        return null;
    }
});
// length
Object.defineProperty(localStorage,"length",{
    configurable:false,enumerable:false,writable:true,value:0
});
// toString
Object.defineProperty(localStorage,"toString",{
    configurable:false,enumerable:false,writable:false,value:function (k, v) {
        return "[object Storage]";
    }
});
// setItem
Object.defineProperty(localStorage,"setItem",{
    configurable:false,enumerable:false,writable:false,value:function (k, v) {
        if (typeof this[k] === "undefined" &&
            typeof v !== "undefined") {
            this.length += 1;
        }
        this[k] = v.toString();
    }
});
// getItem
Object.defineProperty(localStorage,"getItem",{
    configurable:false,enumerable:false,writable:false,value:function (k) {
        return this[k] === undefined? null: this[k];
    }
});
// removeItem
Object.defineProperty(localStorage,"removeItem",{
    configurable:false,enumerable:false,writable:false,value:function (k) {
        if (typeof this[k] !== "undefined") {
            this.length -= 1;
        }
        delete this[k];
    }
});
