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

  function generateHashFromArrayBuffer(content) {
    // XXX Improve performance by moving calculation to WebWorker
    return rusha.digestFromArrayBuffer(content);
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
      sub_storage: spec.local_sub_storage
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
    this._check_local_attachment_modification =
      spec.check_local_attachment_modification;
    if (this._check_local_attachment_modification === undefined) {
      this._check_local_attachment_modification = true;
    }
    this._check_local_attachment_creation =
      spec.check_local_attachment_creation;
    if (this._check_local_attachment_creation === undefined) {
      this._check_local_attachment_creation = true;
    }
    this._check_local_attachment_deletion =
      spec.check_local_attachment_deletion;
    if (this._check_local_attachment_deletion === undefined) {
      this._check_local_attachment_deletion = true;
    }
    this._check_remote_attachment_modification =
      spec.check_remote_attachment_modification;
    if (this._check_remote_attachment_modification === undefined) {
      this._check_remote_attachment_modification = true;
    }
    this._check_remote_attachment_creation =
      spec.check_remote_attachment_creation;
    if (this._check_remote_attachment_creation === undefined) {
      this._check_remote_attachment_creation = true;
    }
    this._check_remote_attachment_deletion =
      spec.check_remote_attachment_deletion;
    if (this._check_remote_attachment_deletion === undefined) {
      this._check_remote_attachment_deletion = true;
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
  ReplicateStorage.prototype.getAttachment = function () {
    return this._local_sub_storage.getAttachment.apply(this._local_sub_storage,
                                                       arguments);
  };
  ReplicateStorage.prototype.allAttachments = function () {
    return this._local_sub_storage.allAttachments.apply(this._local_sub_storage,
                                                       arguments);
  };
  ReplicateStorage.prototype.putAttachment = function (id) {
    if (id === this._signature_hash) {
      throw new jIO.util.jIOError(this._signature_hash + " is frozen",
                                  403);
    }
    return this._local_sub_storage.putAttachment.apply(this._local_sub_storage,
                                                       arguments);
  };
  ReplicateStorage.prototype.removeAttachment = function (id) {
    if (id === this._signature_hash) {
      throw new jIO.util.jIOError(this._signature_hash + " is frozen",
                                  403);
    }
    return this._local_sub_storage.removeAttachment.apply(
      this._local_sub_storage,
      arguments
    );
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
      skip_document_dict = {},
      signature_dict = {};

    // Do not sync the signature document
    skip_document_dict[context._signature_hash] = {
      skip: true,
      skip_attachments: true
    };

    function isElementSkippable(id, attachment_id) {
      if (attachment_id === undefined) {
        return skip_document_dict[id] !== undefined
          && skip_document_dict[id].skip === true;
      }
      return skip_document_dict[id] !== undefined
        && (skip_document_dict[id].skip_attachments === true
        || (skip_document_dict[id].attachments !== undefined
            && skip_document_dict[id].attachments[attachment_id] === true));
    }

    function addElementToSkipList(id, attachment_id) {
      if (skip_document_dict[id] === undefined) {
        skip_document_dict[id] = {
          skip: false,
          skip_attachments: false,
          attachments: {}
        };
      }
      if (attachment_id === undefined) {
        skip_document_dict[id].skip = true;
      } else {
        skip_document_dict[id].attachments[attachment_id] = true;
      }
    }


    function updateAttachmentAndHash(queue,
                                     source, destination,
                                     source_id, destination_id,
                                     attachment_id,
                                     hash_document,
                                     garbage_collect,
                                     attachment_blob_dict) {
      var attachment_blob;
      if (isElementSkippable(destination_id, attachment_id)) {
        return;
      }
      queue
        .push(function () {
          return source.getAttachment(source_id, attachment_id);
        })
        .push(function (result) {
          attachment_blob = result;
          if (attachment_blob_dict !== undefined) {
            attachment_blob_dict[attachment_id] = attachment_blob;
          }
          if (destination !== undefined && destination_id !== undefined) {
            return destination.putAttachment(
              destination_id,
              attachment_id,
              attachment_blob
            );
          }
          return;
        })
        .push(function () {
          if (hash_document !== undefined) {
            return new RSVP.Queue()
              .push(function () {
                return jIO.util.readBlobAsArrayBuffer(attachment_blob);
              })
              .push(function (evt) {
                return generateHashFromArrayBuffer(
                  evt.target.result
                );
              })
              .push(function (hash) {
                hash_document.attachments_hash[attachment_id] = hash;
                hash_document.updated = true;
                return;
              });
          }
          return;
        })
        .push(function () {
          if (garbage_collect === true) {
          // XXX Do we need to make our own garbage collect? Shouldn't we
          // trust jIO garbage collect?
            return source.removeAttachment(source_id, attachment_id);
          }
        });
    }

    function copyDocumentAndAttachments(source, destination,
                                        source_id, destination_id,
                                        doc,
                                        hash_document,
                                        garbage_collect) {
      if (garbage_collect === undefined) {
        garbage_collect = false;
      }
      return new RSVP.Queue()
        .push(function () {
          if (doc !== undefined) {
            return doc;
          }
          return source.get(source_id);
        })
        .push(function (result) {
          if (hash_document.hash === undefined) {
            hash_document.hash = generateHash(result);
          }
          return destination.put(destination_id, result);
        })
        .push(function () {
          return source.allAttachments(source_id);
        })
        .push(function (attachments_dict) {
          var queue = new RSVP.Queue(),
            attachment_id;
          for (attachment_id in attachments_dict) {
            if (attachments_dict.hasOwnProperty(attachment_id)) {
              updateAttachmentAndHash(queue,
                                      source, destination,
                                      source_id, destination_id,
                                      attachment_id,
                                      hash_document,
                                      garbage_collect);
            }
          }
          return queue;
        })
        .push(function () {
          if (source_id === destination_id) {
            skip_document_dict[destination_id] = {
              skip: true,
              skip_attachments: true
            };
          }
          if (garbage_collect === true) {
            return source.remove(source_id);
          }
          return;
        })
        .push(function () {
          if (garbage_collect === true) {
            delete signature_dict[source_id];
            skip_document_dict[source_id] = {
              skip: true,
              skip_attachments: true
            };
            return context._signature_sub_storage.remove(source_id);
          }
          return;
        });
    }

    function propagateModification(source, destination, doc, id, hash,
                                   options) {
      var result,
        post_id;
      if (options === undefined) {
        options = {};
      }
      if (options.use_post) {
        result = destination.post(doc)
          .push(function (new_id) {
            var hash_document = {
              hash: hash,
              attachments_hash: {},
              updated: true
            };
            post_id = new_id;
            signature_dict[post_id] = hash_document;
            return copyDocumentAndAttachments(source, source,
                                              id, post_id,
                                              doc,
                                              hash_document,
                                              true);
          })
          .push(function () {
            return copyDocumentAndAttachments(source, destination,
                                              post_id, post_id,
                                              doc,
                                              signature_dict[post_id]);
          })
          .push(function () {
            return post_id;
          });
      } else {
        result = destination.put(id, doc)
          .push(function () {
            signature_dict[id].hash = hash;
            signature_dict[id].updated = true;
            addElementToSkipList(id);
            return id;
          });
      }
      return result;
    }

    function pushAttachment(queue, destination,
                            id, attachment_id, attachment_blob) {
      queue
        .push(function () {
          return destination.putAttachment(id, attachment_id, attachment_blob);
        });
    }

    function checkLocalDeletion(queue, destination, id, source) {
      var remote_hash_document = {
          hash: undefined,
          attachments_hash: {}
        },
        attachment_blob_dict = {};
      // XXX Not sure it needs to be checked there
      if (isElementSkippable(id)) {
        return;
      }
      queue
        .push(function () {
          return context._signature_sub_storage.get(id);
        })
        .push(function (result) {
          var hash_document = result;
          signature_dict[id] = hash_document;
          return destination.get(id)
            .push(function (doc) {
              // We first fetch the integrality the document to see if it can
              //  be removed or it needs to be updated on the source
              remote_hash_document.hash = generateHash(stringify(doc));
              return destination.allAttachments(id)
                .push(function (attachment_dict) {
                  var attachment_id,
                    attachment_queue = new RSVP.Queue();
                  // All attachments are fetch and their hash is calculated
                  // XXX I do not see anyway to optimize this at the moment
                  // Case A: No change, everything is fetch to be sure
                  // Case B: Everything needs to be fetch to be store in the
                  //    source
                  for (attachment_id in attachment_dict) {
                    if (attachment_dict.hasOwnProperty(attachment_id)) {
                      updateAttachmentAndHash(attachment_queue,
                                              destination, undefined,
                                              id, undefined,
                                              attachment_id,
                                              remote_hash_document,
                                              false,
                                              attachment_blob_dict);
                    }
                  }
                  return attachment_queue;
                })
                .push(function () {
                  var attachment_id,
                    attachments_hash = hash_document.attachments_hash,
                    remote_attachments_hash =
                      remote_hash_document.attachments_hash,
                    modified =
                      remote_hash_document.hash !== hash_document.hash;
                  // Compare all hash to looking for a change
                  for (attachment_id in remote_attachments_hash) {
                    if (remote_attachments_hash.hasOwnProperty(attachment_id)) {
                      modified =
                        attachments_hash[attachment_id] !==
                          remote_attachments_hash[attachment_id];
                      if (modified === true) {
                        break;
                      }
                    }
                  }
                  if (modified === false) {
                    // No Modification. Remove the destination version
                    return destination.remove(id)
                      .push(function () {
                        delete signature_dict[id];
                        return context._signature_sub_storage.remove(id);
                      })
                      .push(function () {
                        skip_document_dict[id] = {
                          skip: true,
                          skip_attachments: true
                        };
                        return;
                      });
                  }
                  // Modifications on destination side
                  // Push them locally
                  return propagateModification(destination, source, doc, id,
                                               remote_hash_document.hash)
                    .push(function () {
                      var attachment_id,
                        attachment_dict =
                          remote_hash_document.attachments_hash,
                        attachment_queue = new RSVP.Queue();
                      for (attachment_id in attachment_dict) {
                        if (attachment_dict.hasOwnProperty(attachment_id)) {
                          pushAttachment(attachment_queue,
                                         source,
                                         id, attachment_id,
                                         attachment_blob_dict[attachment_id]
                                         );
                        }
                      }
                      return attachment_queue;
                    })
                    .push(function () {
                      signature_dict[id] = remote_hash_document;
                      signature_dict[id].updated = true;
                      skip_document_dict[id] = {
                        skip: true,
                        skip_attachments: true
                      };
                      return;
                    });
                });
            }, function (error) {
              if ((error instanceof jIO.util.jIOError) &&
                  (error.status_code === 404)) {
                // Document has also been removed at destination
                return context._signature_sub_storage.remove(id)
                  .push(function () {
                    skip_document_dict[id] = {
                      skip: true,
                      skip_attachments: true
                    };
                    delete signature_dict[id];
                    return;
                  });
              }
              throw error;
            });
        })
        .push(function () {
          if (signature_dict[id] !== undefined
              && signature_dict[id].updated === true) {
            delete signature_dict[id].updated;
            return context._signature_sub_storage.put(
              id,
              signature_dict[id]
            );
          }
        });
    }

    function checkLocalAttachmentDeletion(queue, destination,
                                          id, attachment_id,
                                          source) {
      var status_hash,
        attachment_blob,
        hash_document = signature_dict[id],
        attachment_signature_dict = hash_document.attachments_hash;
      if (isElementSkippable(id, attachment_id)) {
        return;
      }
      queue
        .push(function () {
          // NOTE: If we get here, it means a signature exists for the
          //   attachment but it is no longer present in attachment list
          status_hash = attachment_signature_dict[attachment_id];
          return destination.getAttachment(id, attachment_id)
            .push(function (result) {
              attachment_blob = result;
              // Calculate Attachment Hash
              return new RSVP.Queue()
                .push(function () {
                  return jIO.util.readBlobAsArrayBuffer(attachment_blob);
                })
                .push(function (evt) {
                  return generateHashFromArrayBuffer(evt.target.result);
                })
                .push(function (remote_hash) {
                  if (remote_hash === status_hash) {
                    // No modification. Attachment can be removed.
                    return destination.removeAttachment(id, attachment_id)
                      .push(function () {
                        hash_document.updated = true;
                        delete attachment_signature_dict[attachment_id];
                        addElementToSkipList(id, attachment_id);
                      });
                  }
                  // Modifications on remote side
                  // Push them locally
                  return source.putAttachment(
                    id,
                    attachment_id,
                    attachment_blob
                  ).push(function () {
                    hash_document.updated = true;
                    attachment_signature_dict[attachment_id] = remote_hash;
                    addElementToSkipList(id, attachment_id);
                  });
                });
            }, function (error) {
              if ((error instanceof jIO.util.jIOError) &&
                  (error.status_code === 404)) {
                // Note that here destination document deletion is not checked
                hash_document.updated = true;
                delete attachment_signature_dict[attachment_id];
                addElementToSkipList(id, attachment_id);
                return;
              }
              throw error;
            });
        });

    }

    function checkAttachmentSignatureDifference(queue, source, destination,
                                                id, attachment_id,
                                                options) {
      var attachment_blob,
        hash_document = signature_dict[id],
        attachment_signature_dict = hash_document.attachments_hash;
      if (isElementSkippable(id, attachment_id)) {
        return;
      }
      queue
        .push(function () {
          return source.getAttachment(id, attachment_id);
        })
        .push(function (result) {
          attachment_blob = result;
          // Calculate Attachment Hash
          return new RSVP.Queue()
            .push(function () {
              return jIO.util.readBlobAsArrayBuffer(attachment_blob);
            })
            .push(function (evt) {
              return generateHashFromArrayBuffer(evt.target.result);
            });
        })
        .push(function (local_hash) {
          var status_hash = attachment_signature_dict[attachment_id];
          if (local_hash !== status_hash) {
            // Local modification
            return destination.getAttachment(id, attachment_id,
                                             {format: "array_buffer"})
              .push(function (remote_attachment) {
                var remote_hash = generateHashFromArrayBuffer(
                  remote_attachment
                );
                if (remote_hash !== status_hash) {
                  // Modification on  both Side
                  if (remote_hash === local_hash) {
                    // Same modification on both side.
                    hash_document.updated = true;
                    attachment_signature_dict[attachment_id] = local_hash;
                    addElementToSkipList(id, attachment_id);
                    return;
                  }
                  if (options.conflict_ignore === true) {
                    // There is a conflict, but noone care
                    return;
                  }
                  if (options.conflict_force !== true) {
                    throw new jIO.util.jIOError("Conflict on '" + id
                                                + "' with attachment '"
                                                + attachment_id + "'",
                                                409);
                  }
                }
                return destination.putAttachment(id, attachment_id,
                                                 attachment_blob)
                  .push(function () {
                    hash_document.updated = true;
                    attachment_signature_dict[attachment_id] = local_hash;
                    addElementToSkipList(id, attachment_id);
                  });
              }, function (error) {
                if ((error instanceof jIO.util.jIOError) &&
                    (error.status_code === 404)) {
                  // Destination attachment do not exists or has been removed
                  return destination.putAttachment(id, attachment_id,
                                                   attachment_blob)
                    .push(function () {
                      hash_document.updated = true;
                      attachment_signature_dict[attachment_id] = local_hash;
                      addElementToSkipList(id, attachment_id);
                    }, function (error) {
                        // Destination document has been removed
                        // NOTE: We expect 404 error to raise when putting an
                        // attachment to a non-existent attachment.
                      if ((error instanceof jIO.util.jIOError) &&
                          (error.status_code === 404)) {
                        return copyDocumentAndAttachments(
                          source,
                          destination,
                          id,
                          id,
                          undefined,
                          hash_document
                        );
                      }
                      throw error;
                    });
                }
                throw error;
              });
          }
        });
    }

    function checkSignatureDifference(queue, source, destination, id,
                                      conflict_force, conflict_ignore,
                                      is_creation, is_modification,
                                      getMethod, options) {
      var hash_document;
      if (skip_document_dict[id] !== undefined
            && skip_document_dict[id].skip === true
            && skip_document_dict[id].skip_attachments === true) {
        return;
      }
      queue
        .push(function () {
          // Optimisation to save a get call to signature storage
          if (is_creation === true) {
            return RSVP.all([
              getMethod(id),
              {hash: undefined, attachments_hash: {}}
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
            local_hash,
            status_hash = result_list[1].hash;
          signature_dict[id] = result_list[1];
          hash_document = signature_dict[id];
          // XXX Hackish
          hash_document.updated = false;
          if (isElementSkippable(id)) {
            // Move directly to checking attachments
            return id;
          }
          local_hash = generateHash(stringify(doc));
          if (local_hash !== status_hash) {
            // Local modifications
            return destination.get(id)
              .push(function (remote_doc) {
                var remote_hash = generateHash(stringify(remote_doc));
                if (remote_hash !== status_hash) {
                  // Modifications on both sides
                  if (local_hash === remote_hash) {
                    // Same modifications on both side \o/
                    hash_document.updated = true;
                    hash_document.hash = local_hash;
                    return id;
                  }
                  if (conflict_ignore === true) {
                    return id;
                  }
                  if (conflict_force !== true) {
                    throw new jIO.util.jIOError("Conflict on '" + id + "': " +
                                                stringify(doc) + " !== " +
                                                stringify(remote_doc),
                                                409);
                  }
                }
                return propagateModification(source, destination, doc, id,
                                             local_hash);
              }, function (error) {
                var use_post;
                if ((error instanceof jIO.util.jIOError) &&
                    (error.status_code === 404)) {
                  if (is_creation) {
                    // Remote document does not exists, create it following
                    // provided options
                    use_post = options.use_post;
                  } else {
                    // Remote document has been erased, put it to save
                    // modification
                    use_post = false;
                  }
                  return propagateModification(source, destination, doc, id,
                                               local_hash,
                                               {use_post: use_post});
                }
                throw error;
              });
          }
          return id;
        })
        .push(function (current_id) {
          id = current_id;
          hash_document = signature_dict[id];
          if (skip_document_dict[id] !== undefined
              && skip_document_dict.skip_attachments === true) {
              // No attachments to check
            return {};
          }
          return source.allAttachments(id);
        })
        .push(function (local_attachment_dict) {
          var attachment_id,
            attachment_creation,
            attachment_modification,
            attachment_signature_dict = hash_document.attachments_hash,
            attachment_queue = new RSVP.Queue();
          for (attachment_id in local_attachment_dict) {
            if (local_attachment_dict.hasOwnProperty(attachment_id)) {
              attachment_modification = options.check_attachment_modification
                && attachment_signature_dict.hasOwnProperty(attachment_id);
              attachment_creation = options.check_attachment_creation
                && !attachment_signature_dict.hasOwnProperty(attachment_id);
              if (attachment_creation || attachment_modification) {
                checkAttachmentSignatureDifference(attachment_queue,
                                                   source, destination,
                                                   id, attachment_id,
                                                   options);
              }
            }
          }
          if (options.check_attachment_deletion === true) {
            for (attachment_id in attachment_signature_dict) {
              if (attachment_signature_dict.hasOwnProperty(attachment_id)) {
                if (!local_attachment_dict.hasOwnProperty(attachment_id)) {
                  checkLocalAttachmentDeletion(attachment_queue, destination,
                                               id, attachment_id,
                                               source);
                }
              }
            }
          }
          return attachment_queue;
        })
        .push(function () {
          if (hash_document.updated === true) {
            delete hash_document.updated;
            return context._signature_sub_storage.put(id, hash_document);
          }
        });
    }


    function checkBulkSignatureDifference(queue, source, destination, id_list,
                                          document_status_list, options,
                                          conflict_force, conflict_ignore) {
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
                               conflict_force, conflict_ignore,
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
            local_dict[result_list[0].data.rows[i].id] = i;
          }
          for (i = 0; i < result_list[1].data.total_rows; i += 1) {
            signature_dict[result_list[1].data.rows[i].id] = i;
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
                  checkLocalDeletion(queue, destination, key, source);
                }
              }
            }
          }
          if ((options.use_bulk_get === true) && (document_list.length !== 0)) {
            checkBulkSignatureDifference(queue, source, destination,
                                         document_list, document_status_list,
                                         options,
                                         options.conflict_force,
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
              conflict_ignore: ((context._conflict_handling ===
                                 CONFLICT_CONTINUE) ||
                                (context._conflict_handling ===
                                 CONFLICT_KEEP_REMOTE)),
              check_modification: context._check_local_modification,
              check_creation: context._check_local_creation,
              check_deletion: context._check_local_deletion,
              check_attachment_modification:
                context._check_local_attachment_modification,
              check_attachment_creation:
                context._check_local_attachment_creation,
              check_attachment_deletion:
                context._check_local_attachment_deletion
            });
        }
      })
      .push(function () {
        // Autoactivate bulk if substorage implements it
        // Keep it like this until the bulk API is stabilized
        var use_bulk_get = false;
        try {
          use_bulk_get = context._remote_sub_storage.hasCapacity("bulk");
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
              conflict_force: (context._conflict_handling ===
                               CONFLICT_KEEP_REMOTE),
              conflict_ignore: (context._conflict_handling ===
                                CONFLICT_CONTINUE),
              check_modification: context._check_remote_modification,
              check_creation: context._check_remote_creation,
              check_deletion: context._check_remote_deletion,
              check_attachment_modification:
                context._check_remote_attachment_modification,
              check_attachment_creation:
                context._check_remote_attachment_creation,
              check_attachment_deletion:
                context._check_remote_attachment_deletion
            });
        }
      });
  };

  jIO.addStorage('replicate', ReplicateStorage);

}(jIO, RSVP, Rusha, jIO.util.stringify));
