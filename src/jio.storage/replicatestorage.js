/*
 * JIO extension for resource replication.
 * Copyright (C) 2013, 2015  Nexedi SA
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
/*global jIO, RSVP, Rusha*/

(function (jIO, RSVP, Rusha) {
  "use strict";

  var rusha = new Rusha();

  /****************************************************
   Use a local jIO to read/write/search documents
   Synchronize in background those document with a remote jIO.
   Synchronization status is stored for each document as an local attachment.
  ****************************************************/

  function generateHash(content) {
    // XXX Improve performance by moving calculation to WebWorker
    return rusha.digestFromString(content);
  }

  function ReplicateStorage(spec) {
    this._query_options = spec.query || {};

    this._local_sub_storage = jIO.createJIO(spec.local_sub_storage);
    this._remote_sub_storage = jIO.createJIO(spec.remote_sub_storage);

    this._signature_hash = "_replicate_" + generateHash(
      JSON.stringify(spec.local_sub_storage) +
        JSON.stringify(spec.remote_sub_storage) +
        JSON.stringify(this._query_options)
    );
    this._signature_sub_storage = jIO.createJIO({
      type: "document",
      document_id: this._signature_hash,
      sub_storage: spec.local_sub_storage
    });

    this._use_remote_post = spec.use_remote_post || false;
  }

  ReplicateStorage.prototype.remove = function (id) {
    if (id === this._signature_hash) {
      throw new jIO.util.jIOError(this._signature_hash + " is frozen",
                                  403);
    }
    return this._local_sub_storage.remove.apply(this._local_sub_storage,
                                                arguments);
  };
  ReplicateStorage.prototype.post = function () {
    return this._local_sub_storage.post.apply(this._local_sub_storage,
                                              arguments);
  };
  ReplicateStorage.prototype.put = function (id) {
    if (id === this._signature_hash) {
      throw new jIO.util.jIOError(this._signature_hash + " is frozen",
                                  403);
    }
    return this._local_sub_storage.put.apply(this._local_sub_storage,
                                             arguments);
  };
  ReplicateStorage.prototype.get = function () {
    return this._local_sub_storage.get.apply(this._local_sub_storage,
                                             arguments);
  };
  ReplicateStorage.prototype.hasCapacity = function () {
    return this._local_sub_storage.hasCapacity.apply(this._local_sub_storage,
                                                     arguments);
  };
  ReplicateStorage.prototype.buildQuery = function () {
    // XXX Remove signature document?
    return this._local_sub_storage.buildQuery.apply(this._local_sub_storage,
                                                    arguments);
  };

  ReplicateStorage.prototype.repair = function () {
    var context = this,
      argument_list = arguments,
      skip_document_dict = {};

    // Do not sync the signature document
    skip_document_dict[context._signature_hash] = null;

    function propagateModification(destination, doc, hash, id, options) {
      var result,
        to_skip = true;
      if (options === undefined) {
        options = {};
      }
      if (options.use_post) {
        result = destination.post(doc)
          .push(function () {
            to_skip = false;
          });
      } else {
        result = destination.put(id, doc);
      }
      return result
        .push(function () {
          return context._signature_sub_storage.put(id, {
            "hash": hash
          });
        })
        .push(function () {
          if (to_skip) {
            skip_document_dict[id] = null;
          }
        });
    }

    function checkLocalCreation(queue, source, destination, id, options) {
      var remote_doc;
      queue
        .push(function () {
          return destination.get(id);
        })
        .push(function (doc) {
          remote_doc = doc;
        }, function (error) {
          if ((error instanceof jIO.util.jIOError) &&
              (error.status_code === 404)) {
            // This document was never synced.
            // Push it to the remote storage and store sync information
            return;
          }
          throw error;
        })
        .push(function () {
          // This document was never synced.
          // Push it to the remote storage and store sync information
          return source.get(id);
        })
        .push(function (doc) {
          var local_hash = generateHash(JSON.stringify(doc)),
            remote_hash;
          if (remote_doc === undefined) {
            return propagateModification(destination, doc, local_hash, id,
                                         options);
          }

          remote_hash = generateHash(JSON.stringify(remote_doc));
          if (local_hash === remote_hash) {
            // Same document
            return context._signature_sub_storage.put(id, {
              "hash": local_hash
            })
              .push(function () {
                skip_document_dict[id] = null;
              });
          }
          // Already exists on destination
          throw new jIO.util.jIOError("Conflict on '" + id + "'",
                                      409);
        });
    }

    function checkLocalDeletion(queue, destination, id, source) {
      var status_hash;
      queue
        .push(function () {
          return context._signature_sub_storage.get(id);
        })
        .push(function (result) {
          status_hash = result.hash;
          return destination.get(id)
            .push(function (doc) {
              var remote_hash = generateHash(JSON.stringify(doc));
              if (remote_hash === status_hash) {
                return destination.remove(id)
                  .push(function () {
                    return context._signature_sub_storage.remove(id);
                  })
                  .push(function () {
                    skip_document_dict[id] = null;
                  });
              }
              // Modifications on remote side
              // Push them locally
              return propagateModification(source, doc, remote_hash, id);
            }, function (error) {
              if ((error instanceof jIO.util.jIOError) &&
                  (error.status_code === 404)) {
                return context._signature_sub_storage.remove(id)
                  .push(function () {
                    skip_document_dict[id] = null;
                  });
              }
              throw error;
            });
        });
    }

    function checkSignatureDifference(queue, source, destination, id) {
      queue
        .push(function () {
          return RSVP.all([
            source.get(id),
            context._signature_sub_storage.get(id)
          ]);
        })
        .push(function (result_list) {
          var doc = result_list[0],
            local_hash = generateHash(JSON.stringify(doc)),
            status_hash = result_list[1].hash;

          if (local_hash !== status_hash) {
            // Local modifications
            return destination.get(id)
              .push(function (remote_doc) {
                var remote_hash = generateHash(JSON.stringify(remote_doc));
                if (remote_hash !== status_hash) {
                  // Modifications on both sides
                  if (local_hash === remote_hash) {
                    // Same modifications on both side \o/
                    return context._signature_sub_storage.put(id, {
                      "hash": local_hash
                    })
                      .push(function () {
                        skip_document_dict[id] = null;
                      });
                  }
                  throw new jIO.util.jIOError("Conflict on '" + id + "'",
                                              409);
                }
                return propagateModification(destination, doc, local_hash, id);
              }, function (error) {
                if ((error instanceof jIO.util.jIOError) &&
                    (error.status_code === 404)) {
                  // Document has been deleted remotely
                  return propagateModification(destination, doc, local_hash,
                                               id);
                }
                throw error;
              });
          }
        });
    }

    function pushStorage(source, destination, options) {
      var queue = new RSVP.Queue();
      if (!options.hasOwnProperty("use_post")) {
        options.use_post = false;
      }
      return queue
        .push(function () {
          return RSVP.all([
            source.allDocs(context._query_options),
            context._signature_sub_storage.allDocs()
          ]);
        })
        .push(function (result_list) {
          var i,
            local_dict = {},
            signature_dict = {},
            key;
          for (i = 0; i < result_list[0].data.total_rows; i += 1) {
            if (!skip_document_dict.hasOwnProperty(
                result_list[0].data.rows[i].id
              )) {
              local_dict[result_list[0].data.rows[i].id] = i;
            }
          }
          for (i = 0; i < result_list[1].data.total_rows; i += 1) {
            if (!skip_document_dict.hasOwnProperty(
                result_list[1].data.rows[i].id
              )) {
              signature_dict[result_list[1].data.rows[i].id] = i;
            }
          }
          for (key in local_dict) {
            if (local_dict.hasOwnProperty(key)) {
              if (!signature_dict.hasOwnProperty(key)) {
                checkLocalCreation(queue, source, destination, key, options);
              }
            }
          }
          for (key in signature_dict) {
            if (signature_dict.hasOwnProperty(key)) {
              if (local_dict.hasOwnProperty(key)) {
                checkSignatureDifference(queue, source, destination, key);
              } else {
                checkLocalDeletion(queue, destination, key, source);
              }
            }
          }
        });
    }

    return new RSVP.Queue()
      .push(function () {
        // Ensure that the document storage is usable
        return context._signature_sub_storage.__storage._sub_storage.get(
          context._signature_hash
        );
      })
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return context._signature_sub_storage.__storage._sub_storage.put(
            context._signature_hash,
            {}
          );
        }
        throw error;
      })

      .push(function () {
        return RSVP.all([
// Don't repair local_sub_storage twice
//           context._signature_sub_storage.repair.apply(
//             context._signature_sub_storage,
//             argument_list
//           ),
          context._local_sub_storage.repair.apply(
            context._local_sub_storage,
            argument_list
          ),
          context._remote_sub_storage.repair.apply(
            context._remote_sub_storage,
            argument_list
          )
        ]);
      })

      .push(function () {
        return pushStorage(context._local_sub_storage,
                           context._remote_sub_storage,
                           {use_post: context._use_remote_post});
      })
      .push(function () {
        return pushStorage(context._remote_sub_storage,
                           context._local_sub_storage, {});
      });
  };

  jIO.addStorage('replicate', ReplicateStorage);

}(jIO, RSVP, Rusha));
