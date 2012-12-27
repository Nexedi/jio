(function (scope, hex_md5) {
    "use strict";
    var localstorage;
    if (typeof localStorage !== "undefined") {
        localstorage = {
            getItem: function (item) {
                var value = localStorage.getItem(item);
                return value === null? null: JSON.parse(value);
            },
            setItem: function (item, value) {
                return localStorage.setItem(item, JSON.stringify(value));
            },
            removeItem: function (item) {
                delete localStorage[item];
            },
            clone: function () {
                return JSON.parse(JSON.stringify(localStorage));
            }
        };
    } else {
        (function () {
            var pseudo_localStorage = {};
            localstorage = {
                getItem: function (item) {
                    var value = pseudo_localStorage[item];
                    return value === undefined?
                        null: JSON.parse(pseudo_localStorage[item]);
                },
                setItem: function (item, value) {
                    return pseudo_localStorage[item] = JSON.stringify(value);
                },
                removeItem: function (item) {
                    delete pseudo_localStorage[item];
                },
                clone: function () {
                    return JSON.parse(JSON.stringify(pseudo_localStorage));
                }
            };
        }());
    }
