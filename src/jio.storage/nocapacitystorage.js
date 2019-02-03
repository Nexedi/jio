/*
 e Copyright 2019, Nexedi SA
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

(function (dependencies, module) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        return define(dependencies, module);
    }
    if (typeof exports === 'object') {
        return module(
            exports,
            require('jio'),
            require('rsvp')
        );
    }
    window.no_capacity_storage = {};
    module(window.no_capacity_storage, jIO, RSVP);
}([
    'exports',
    'jio',
    'rsvp',
], function (exports, jIO, RSVP) {
    "use strict";

    function NoCapacityStorage(spec) {
        this._sub_storage = jIO.createJIO(spec.sub_storage);
    }

    NoCapacityStorage.prototype.hasCapacity = function (name) {
        return false;
    }

    NoCapacityStorage.prototype.get = function () {
        return this._sub_storage.get.apply(this._sub_storage, arguments);
    };

    NoCapacityStorage.prototype.post = function () {
        return this._sub_storage.post.apply(this._sub_storage, arguments);
    };

    NoCapacityStorage.prototype.put = function () {
        return this._sub_storage.put.apply(this._sub_storage, arguments);
    };

    NoCapacityStorage.prototype.remove = function () {
        return this._sub_storage.remove.apply(this._sub_storage, arguments);
    };

    jio.addStorage('nocapacity', NoCapacityStorage);

});
