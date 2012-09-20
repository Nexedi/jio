var LocalOrCookieStorage =
(function () { var local_cookie_loader_function = function () {
    // localorcookiestorage.js
    // Creates an object that can store persistent information in localStorage.
    // If it is not supported by the browser, it will store in cookies.
    // Methods :
    //     - LocalOrCookieStorage.setItem('name',value);
    //         Sets an item with its value.
    //     - LocalOrCookieStorage.getItem('name');
    //         Returns a copy of the item.
    //     - LocalOrCookieStorage.deleteItem('name');
    //         Deletes an item forever.
    //     - LocalOrCookieStorage.getAll();
    //         Returns a new object containing all items and their values.


    ////////////////////////////////////////////////////////////////////////////
    // cookies & localStorage
    var BrowserStorage = function () {
    };
    BrowserStorage.prototype = {
        getItem: function (name) {
            return JSON.parse(localStorage.getItem(name));
        },
        setItem: function (name,value) {
            if (name) {
                return localStorage.setItem(name,JSON.stringify(value));
            }
        },
        getAll: function() {
            return localStorage;
        },
        deleteItem: function (name) {
            if (name) {
                delete localStorage[name];
            }
        }
    };
    var CookieStorage = function () {
    };
    CookieStorage.prototype = {
        getItem: function (name) {
            var cookies = document.cookie.split(';'), i;
            for (i = 0; i < cookies.length; i += 1) {
                var x = cookies[i].substr(0, cookies[i].indexOf('=')),
                y = cookies[i].substr(cookies[i].indexOf('=')+1);
                x = x.replace(/^\s+|\s+$/g,"");
                if( x === name ) { return unescape(y); }
            }
            return null;
        },
        setItem: function (name,value) {
            // function to store into cookies
            if (value !== undefined) {
                document.cookie = name+'='+JSON.stringify(value)+';domain='+
                    window.location.hostname+
                    ';path='+window.location.pathname;
                return true;
            }
            return false;
        },
        getAll: function() {
            var retObject = {}, i,
            cookies = document.cookie.split(':');
            for (i = 0; i < cookies.length; i += 1) {
                var x = cookies[i].substr(0, cookies[i].indexOf('=')),
                y = cookies[i].substr(cookies[i].indexOf('=')+1);
                x = x.replace(/^\s+|\s+$/g,"");
                retObject[x] = unescape(y);
            }
            return retObject;
        },
        deleteItem: function (name) {
            document.cookie = name+'=null;domain='+window.location.hostname+
                ';path='+window.location.pathname+
                ';expires=Thu, 01-Jan-1970 00:00:01 GMT';
        }
    };
    // set good localStorage
    try {
        if (localStorage.getItem) {
            return new BrowserStorage();
        } else {
            return new CookieStorage();
        }
    }
    catch (e) {
        return new CookieStorage();
    }
    // end cookies & localStorages
    ////////////////////////////////////////////////////////////////////////////

};

if (window.requirejs) {
    define ('LocalOrCookieStorage',[], local_cookie_loader_function);
    return undefined;
} else {
    return local_cookie_loader_function ();
}

}());
