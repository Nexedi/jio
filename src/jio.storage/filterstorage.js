/*
 * JIO extension for resource replication.
 * Copyright (C) 2013, 2016  Nexedi SA
 *
 *   This library is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This library is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jslint nomen: true*/
/*global jIO, ComplexQuery*/

(function (jIO, ComplexQuery) {
  "use strict";

  /****************************************************

  ****************************************************/
  function FilterStorage(spec) {
    this._sub_storage = jIO.createJIO(spec.sub_storage);
    this._query = spec.query;
  }

  FilterStorage.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.allAttachments = function () {
    return this._sub_storage.allAttachments.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.post = function () {
    return this._sub_storage.post.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.put = function () {
    return this._sub_storage.put.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.remove = function () {
    return this._sub_storage.remove.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
                                                    arguments);
  };
  FilterStorage.prototype.repair = function () {
    return this._sub_storage.repair.apply(this._sub_storage, arguments);
  };
  FilterStorage.prototype.buildQuery = function (options) {
    var sub_storage = this._sub_storage;
    if (sub_storage.hasCapacity("query")) {
      if (options.query !== undefined) {
        options.query = new ComplexQuery({
          operator: "AND",
          query_list: [
            options.query,
            this._query
          ]
        }).toString();
      } else {
        options.query = this._query;
      }
    }
    return sub_storage.buildQuery(options);
  };
  FilterStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };

  jIO.addStorage('filter', FilterStorage);

}(jIO, ComplexQuery));
