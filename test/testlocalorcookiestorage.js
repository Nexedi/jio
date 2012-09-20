var LocalOrCookieStorage = (function () {
    var tmp = function () {
        this.storage = {};
    };
    tmp.prototype = {
        getItem: function (k) {
            var v = (typeof this.storage[k] === 'undefined' ?
                     null: this.storage[k]);
            return JSON.parse (v);
        },
        setItem: function (k,v) {
            this.storage[k] = JSON.stringify (v);
        },
        deleteItem: function (k) {
            delete this.storage[k];
        },
        getAll: function () {
            return this.storage;
        }
    };
    return new tmp();
}());
