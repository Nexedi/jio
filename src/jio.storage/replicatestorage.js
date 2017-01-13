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

(function (jIO, RSVP, Rusha, stringify) {
  "use strict";

  var rusha = new Rusha(),
    CONFLICT_THROW = 0,
    CONFLICT_KEEP_LOCAL = 1,
    CONFLICT_KEEP_REMOTE = 2,
    CONFLICT_CONTINUE = 3;

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
      stringify(spec.local_sub_storage) +
        stringify(spec.remote_sub_storage) +
        stringify(this._query_options)
    );
    this._signature_sub_storage = jIO.createJIO({
      type: "document",
      document_id: this._signature_hash,
      sub_storage: spec.signature_storage || spec.local_sub_storage
    });

    this._use_remote_post = spec.use_remote_post || false;

    this._conflict_handling = spec.conflict_handling || 0;
    // 0: no resolution (ie, throw an Error)
    // 1: keep the local state
    //    (overwrites the remote document with local content)
    //    (delete remote document if local is deleted)
    // 2: keep the remote state
    //    (overwrites the local document with remote content)
    //    (delete local document if remote is deleted)
    // 3: keep both copies (leave documents untouched, no signature update)
    if ((this._conflict_handling !== CONFLICT_THROW) &&
        (this._conflict_handling !== CONFLICT_KEEP_LOCAL) &&
        (this._conflict_handling !== CONFLICT_KEEP_REMOTE) &&
        (this._conflict_handling !== CONFLICT_CONTINUE)) {
      throw new jIO.util.jIOError("Unsupported conflict handling: " +
                                  this._conflict_handling, 400);
    }

    this._check_local_modification = spec.check_local_modification;
    if (this._check_local_modification === undefined) {
      this._check_local_modification = true;
    }
    this._check_local_creation = spec.check_local_creation;
    if (this._check_local_creation === undefined) {
      this._check_local_creation = true;
    }
    this._check_local_deletion = spec.check_local_deletion;
    if (this._check_local_deletion === undefined) {
      this._check_local_deletion = true;
    }
    this._check_remote_modification = spec.check_remote_modification;
    if (this._check_remote_modification === undefined) {
      this._check_remote_modification = true;
    }
    this._check_remote_creation = spec.check_remote_creation;
    if (this._check_remote_creation === undefined) {
      this._check_remote_creation = true;
    }
    this._check_remote_deletion = spec.check_remote_deletion;
    if (this._check_remote_deletion === undefined) {
      this._check_remote_deletion = true;
    }
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

    function propagateModification(source, destination, doc, hash, id,
                                   options) {
      var result,
        post_id,
        to_skip = true;
      if (options === undefined) {
        options = {};
      }
      if (options.use_post) {
        result = destination.post(doc)
          .push(function (new_id) {
            to_skip = false;
            post_id = new_id;
            return source.put(post_id, doc);
          })
          .push(function () {
            return source.remove(id);
          })
          .push(function () {
            return context._signature_sub_storage.remove(id);
          })
          .push(function () {
            to_skip = true;
            return context._signature_sub_storage.put(post_id, {
              "hash": hash
            });
          })
          .push(function () {
            skip_document_dict[post_id] = null;
          });
      } else {
        result = destination.put(id, doc)
          .push(function () {
            return context._signature_sub_storage.put(id, {
              "hash": hash
            });
          });
      }
      return result
        .push(function () {
          if (to_skip) {
            skip_document_dict[id] = null;
          }
        });
    }

    function propagateDeletion(destination, id) {
      return destination.remove(id)
        .push(function () {
          return context._signature_sub_storage.remove(id);
        })
        .push(function () {
          skip_document_dict[id] = null;
        });
    }

    function checkAndPropagate(status_hash, local_hash, doc,
                               source, destination, id,
                               conflict_force, conflict_revert,
                               conflict_ignore,
                               options) {
      return destination.get(id)
        .push(function (remote_doc) {
          return [remote_doc, generateHash(stringify(remote_doc))];
        }, function (error) {
          if ((error instanceof jIO.util.jIOError) &&
              (error.status_code === 404)) {
            return [null, null];
          }
          throw error;
        })
        .push(function (remote_list) {
          var remote_doc = remote_list[0],
            remote_hash = remote_list[1];

          if (local_hash === remote_hash) {
            // Same modifications on both side
            if (local_hash === null) {
              // Deleted on both side, drop signature
              return context._signature_sub_storage.remove(id)
                .push(function () {
                  skip_document_dict[id] = null;
                });
            }

            return context._signature_sub_storage.put(id, {
              "hash": local_hash
            })
              .push(function () {
                skip_document_dict[id] = null;
              });
          }

          if ((remote_hash === status_hash) || (conflict_force === true)) {
            // Modified only locally. No conflict or force
            if (local_hash === null) {
              // Deleted locally
              return propagateDeletion(destination, id);
            }
            return propagateModification(source, destination, doc,
                                         local_hash, id,
                                         {use_post: ((options.use_post) &&
                                                     (remote_hash === null))});
          }

          // Conflict cases
          if (conflict_ignore === true) {
            return;
          }

          if ((conflict_revert === true) || (local_hash === null)) {
            // Automatically resolve conflict or force revert
            if (remote_hash === null) {
              // Deleted remotely
              return propagateDeletion(source, id);
            }
            return propagateModification(
              destination,
              source,
              remote_doc,
              remote_hash,
              id,
              {use_post: ((options.use_revert_post) &&
                          (local_hash === null))}
            );
          }

          // Minimize conflict if it can be resolved
          if (remote_hash === null) {
            // Copy remote modification remotely
            return propagateModification(source, destination, doc,
                                         local_hash, id,
                                         {use_post: options.use_post});
          }
          throw new jIO.util.jIOError("Conflict on '" + id + "': " +
                                      stringify(doc || '') + " !== " +
                                      stringify(remote_doc || ''),
                                      409);
        });
    }

    function checkLocalDeletion(queue, destination, id, source,
                                conflict_force, conflict_revert,
                                conflict_ignore, options) {
      var status_hash;
      queue
        .push(function () {
          return context._signature_sub_storage.get(id);
        })
        .push(function (result) {
          status_hash = result.hash;
          return checkAndPropagate(status_hash, null, null,
                                   source, destination, id,
                                   conflict_force, conflict_revert,
                                   conflict_ignore,
                                   options);
        });
    }

    function checkSignatureDifference(queue, source, destination, id,
                                      conflict_force, conflict_revert,
                                      conflict_ignore,
                                      is_creation, is_modification,
                                      getMethod, options) {
      queue
        .push(function () {
          // Optimisation to save a get call to signature storage
          if (is_creation === true) {
            return RSVP.all([
              getMethod(id),
              {hash: null}
            ]);
          }
          if (is_modification === true) {
            return RSVP.all([
              getMethod(id),
              context._signature_sub_storage.get(id)
            ]);
          }
          throw new jIO.util.jIOError("Unexpected call of"
                                      + " checkSignatureDifference",
                                      409);
        })
        .push(function (result_list) {
          var doc = result_list[0],
            local_hash = generateHash(stringify(doc)),
            status_hash = result_list[1].hash;

          if (local_hash !== status_hash) {
            return checkAndPropagate(status_hash, local_hash, doc,
                                     source, destination, id,
                                     conflict_force, conflict_revert,
                                     conflict_ignore,
                                     options);
          }
        });
    }

    function checkBulkSignatureDifference(queue, source, destination, id_list,
                                          document_status_list, options,
                                          conflict_force, conflict_revert,
                                          conflict_ignore) {
      queue
        .push(function () {
          return source.bulk(id_list);
        })
        .push(function (result_list) {
          var i,
            sub_queue = new RSVP.Queue();

          function getResult(j) {
            return function (id) {
              if (id !== id_list[j].parameter_list[0]) {
                throw new Error("Does not access expected ID " + id);
              }
              return result_list[j];
            };
          }

          for (i = 0; i < result_list.length; i += 1) {
            checkSignatureDifference(sub_queue, source, destination,
                               id_list[i].parameter_list[0],
                               conflict_force, conflict_revert,
                               conflict_ignore,
                               document_status_list[i].is_creation,
                               document_status_list[i].is_modification,
                               getResult(i), options);
          }
          return sub_queue;
        });
    }

    function pushStorage(source, destination, options) {
      var queue = new RSVP.Queue();
      if (!options.hasOwnProperty("use_post")) {
        options.use_post = false;
      }
      if (!options.hasOwnProperty("use_revert_post")) {
        options.use_revert_post = false;
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
            document_list = [],
            document_status_list = [],
            signature_dict = {},
            is_modification,
            is_creation,
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
              is_modification = signature_dict.hasOwnProperty(key)
                && options.check_modification;
              is_creation = !signature_dict.hasOwnProperty(key)
                && options.check_creation;
              if (is_modification === true || is_creation === true) {
                if (options.use_bulk_get === true) {
                  document_list.push({
                    method: "get",
                    parameter_list: [key]
                  });
                  document_status_list.push({
                    is_creation: is_creation,
                    is_modification: is_modification
                  });
                } else {
                  checkSignatureDifference(queue, source, destination, key,
                                           options.conflict_force,
                                           options.conflict_revert,
                                           options.conflict_ignore,
                                           is_creation, is_modification,
                                           source.get.bind(source),
                                           options);
                }
              }
            }
          }
          if (options.check_deletion === true) {
            for (key in signature_dict) {
              if (signature_dict.hasOwnProperty(key)) {
                if (!local_dict.hasOwnProperty(key)) {
                  checkLocalDeletion(queue, destination, key, source,
                                     options.conflict_force,
                                     options.conflict_revert,
                                     options.conflict_ignore,
                                     options);
                }
              }
            }
          }
          if ((options.use_bulk_get === true) && (document_list.length !== 0)) {
            checkBulkSignatureDifference(queue, source, destination,
                                         document_list, document_status_list,
                                         options,
                                         options.conflict_force,
                                         options.conflict_revert,
                                         options.conflict_ignore);
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
        if (context._check_local_modification ||
            context._check_local_creation ||
            context._check_local_deletion) {
          return pushStorage(context._local_sub_storage,
                             context._remote_sub_storage,
                             {
              use_post: context._use_remote_post,
              conflict_force: (context._conflict_handling ===
                               CONFLICT_KEEP_LOCAL),
              conflict_revert: (context._conflict_handling ===
                                CONFLICT_KEEP_REMOTE),
              conflict_ignore: (context._conflict_handling ===
                                CONFLICT_CONTINUE),
              check_modification: context._check_local_modification,
              check_creation: context._check_local_creation,
              check_deletion: context._check_local_deletion
            });
        }
      })
      .push(function () {
        // Autoactivate bulk if substorage implements it
        // Keep it like this until the bulk API is stabilized
        var use_bulk_get = false;
        try {
          use_bulk_get = context._remote_sub_storage.hasCapacity("bulk_get");
        } catch (error) {
          if (!((error instanceof jIO.util.jIOError) &&
               (error.status_code === 501))) {
            throw error;
          }
        }
        if (context._check_remote_modification ||
            context._check_remote_creation ||
            context._check_remote_deletion) {
          return pushStorage(context._remote_sub_storage,
                             context._local_sub_storage, {
              use_bulk_get: use_bulk_get,
              use_revert_post: context._use_remote_post,
              conflict_force: (context._conflict_handling ===
                               CONFLICT_KEEP_REMOTE),
              conflict_revert: (context._conflict_handling ===
                                CONFLICT_KEEP_LOCAL),
              conflict_ignore: (context._conflict_handling ===
                                CONFLICT_CONTINUE),
              check_modification: context._check_remote_modification,
              check_creation: context._check_remote_creation,
              check_deletion: context._check_remote_deletion
            });
        }
      });
  };

  jIO.addStorage('replicate', ReplicateStorage);

}(jIO, RSVP, Rusha, jIO.util.stringify));
