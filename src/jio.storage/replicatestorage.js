/*
 * JIO extension for resource replication.
 * Copyright (C) 2013, 2015  Nexedi SA
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

/*jslint nomen: true*/
/*global jIO, RSVP, Rusha*/

(function (jIO, RSVP, Rusha, stringify) {
  "use strict";

  var rusha = new Rusha(),
    CONFLICT_THROW = 0,
    CONFLICT_KEEP_LOCAL = 1,
    CONFLICT_KEEP_REMOTE = 2,
    CONFLICT_CONTINUE = 3,

    // 0 - 99 error
    LOG_UNEXPECTED_ERROR = 0,
    LOG_UNRESOLVED_CONFLICT = 74,
    LOG_UNEXPECTED_LOCAL_ATTACHMENT = 49,
    LOG_UNEXPECTED_REMOTE_ATTACHMENT = 47,
    LOG_UNRESOLVED_ATTACHMENT_CONFLICT = 75,
    // 100 - 199 solving conflict
    LOG_FORCE_PUT_REMOTE = 116,
    LOG_FORCE_DELETE_REMOTE = 136,
    LOG_FORCE_PUT_REMOTE_ATTACHMENT = 117,
    LOG_FORCE_DELETE_REMOTE_ATTACHMENT = 137,
    LOG_FORCE_PUT_LOCAL = 118,
    LOG_FORCE_DELETE_LOCAL = 138,
    LOG_FORCE_PUT_LOCAL_ATTACHMENT = 119,
    LOG_FORCE_DELETE_LOCAL_ATTACHMENT = 139,
    // 200 - 299 pushing change
    LOG_PUT_REMOTE = 216,
    LOG_POST_REMOTE = 226,
    LOG_DELETE_REMOTE = 236,
    LOG_PUT_REMOTE_ATTACHMENT = 217,
    LOG_DELETE_REMOTE_ATTACHMENT = 237,
    LOG_PUT_LOCAL = 218,
    LOG_POST_LOCAL = 228,
    LOG_DELETE_LOCAL = 238,
    LOG_PUT_LOCAL_ATTACHMENT = 219,
    LOG_DELETE_LOCAL_ATTACHMENT = 239,
    LOG_FALSE_CONFLICT = 284,
    LOG_FALSE_CONFLICT_ATTACHMENT = 285,
    // 300 - 399 nothing to do
    LOG_SKIP_LOCAL_CREATION = 348,
    LOG_SKIP_LOCAL_MODIFICATION = 358,
    LOG_SKIP_LOCAL_DELETION = 368,
    LOG_SKIP_REMOTE_CREATION = 346,
    LOG_SKIP_REMOTE_MODIFICATION = 356,
    LOG_SKIP_REMOTE_DELETION = 366,
    LOG_SKIP_LOCAL_ATTACHMENT_CREATION = 349,
    LOG_SKIP_LOCAL_ATTACHMENT_MODIFICATION = 359,
    LOG_SKIP_LOCAL_ATTACHMENT_DELETION = 369,
    LOG_SKIP_REMOTE_ATTACHMENT_CREATION = 347,
    LOG_SKIP_REMOTE_ATTACHMENT_MODIFICATION = 357,
    LOG_SKIP_REMOTE_ATTACHMENT_DELETION = 367,
    LOG_SKIP_CONFLICT = 374,
    LOG_SKIP_CONFLICT_ATTACHMENT = 375,
    LOG_NO_CHANGE = 384,
    LOG_NO_CHANGE_ATTACHMENT = 385;

  function ReplicateReport(log_level, log_console) {
    this._list = [];
    this.name = 'ReplicateReport';
    this.message = this.name;
    this.has_error = false;
    this._log_level = log_level;
    this._log_console = log_console;
  }

  ReplicateReport.prototype = {
    constructor: ReplicateReport,

    LOG_UNEXPECTED_ERROR: LOG_UNEXPECTED_ERROR,
    LOG_UNRESOLVED_CONFLICT: LOG_UNRESOLVED_CONFLICT,
    LOG_UNEXPECTED_LOCAL_ATTACHMENT: LOG_UNEXPECTED_LOCAL_ATTACHMENT,
    LOG_UNEXPECTED_REMOTE_ATTACHMENT: LOG_UNEXPECTED_REMOTE_ATTACHMENT,
    LOG_UNRESOLVED_ATTACHMENT_CONFLICT: LOG_UNRESOLVED_ATTACHMENT_CONFLICT,
    LOG_FORCE_PUT_REMOTE: LOG_FORCE_PUT_REMOTE,
    LOG_FORCE_DELETE_REMOTE: LOG_FORCE_DELETE_REMOTE,
    LOG_FORCE_PUT_LOCAL: LOG_FORCE_PUT_LOCAL,
    LOG_FORCE_DELETE_LOCAL: LOG_FORCE_DELETE_LOCAL,
    LOG_FORCE_PUT_REMOTE_ATTACHMENT: LOG_FORCE_PUT_REMOTE_ATTACHMENT,
    LOG_FORCE_DELETE_REMOTE_ATTACHMENT: LOG_FORCE_DELETE_REMOTE_ATTACHMENT,
    LOG_FORCE_PUT_LOCAL_ATTACHMENT: LOG_FORCE_PUT_LOCAL_ATTACHMENT,
    LOG_FORCE_DELETE_LOCAL_ATTACHMENT: LOG_FORCE_DELETE_LOCAL_ATTACHMENT,
    LOG_PUT_REMOTE: LOG_PUT_REMOTE,
    LOG_POST_REMOTE: LOG_POST_REMOTE,
    LOG_DELETE_REMOTE: LOG_DELETE_REMOTE,
    LOG_PUT_REMOTE_ATTACHMENT: LOG_PUT_REMOTE_ATTACHMENT,
    LOG_DELETE_REMOTE_ATTACHMENT: LOG_DELETE_REMOTE_ATTACHMENT,
    LOG_PUT_LOCAL: LOG_PUT_LOCAL,
    LOG_DELETE_LOCAL: LOG_DELETE_LOCAL,
    LOG_PUT_LOCAL_ATTACHMENT: LOG_PUT_LOCAL_ATTACHMENT,
    LOG_DELETE_LOCAL_ATTACHMENT: LOG_DELETE_LOCAL_ATTACHMENT,
    LOG_FALSE_CONFLICT: LOG_FALSE_CONFLICT,
    LOG_FALSE_CONFLICT_ATTACHMENT: LOG_FALSE_CONFLICT_ATTACHMENT,
    LOG_SKIP_LOCAL_CREATION: LOG_SKIP_LOCAL_CREATION,
    LOG_SKIP_LOCAL_MODIFICATION: LOG_SKIP_LOCAL_MODIFICATION,
    LOG_SKIP_LOCAL_DELETION: LOG_SKIP_LOCAL_DELETION,
    LOG_SKIP_REMOTE_CREATION: LOG_SKIP_REMOTE_CREATION,
    LOG_SKIP_REMOTE_MODIFICATION: LOG_SKIP_REMOTE_MODIFICATION,
    LOG_SKIP_REMOTE_DELETION: LOG_SKIP_REMOTE_DELETION,
    LOG_SKIP_LOCAL_ATTACHMENT_CREATION: LOG_SKIP_LOCAL_ATTACHMENT_CREATION,
    LOG_SKIP_LOCAL_ATTACHMENT_MODIFICATION:
      LOG_SKIP_LOCAL_ATTACHMENT_MODIFICATION,
    LOG_SKIP_LOCAL_ATTACHMENT_DELETION: LOG_SKIP_LOCAL_ATTACHMENT_DELETION,
    LOG_SKIP_REMOTE_ATTACHMENT_CREATION: LOG_SKIP_REMOTE_ATTACHMENT_CREATION,
    LOG_SKIP_REMOTE_ATTACHMENT_MODIFICATION:
      LOG_SKIP_REMOTE_ATTACHMENT_MODIFICATION,
    LOG_SKIP_REMOTE_ATTACHMENT_DELETION: LOG_SKIP_REMOTE_ATTACHMENT_DELETION,
    LOG_SKIP_CONFLICT: LOG_SKIP_CONFLICT,
    LOG_SKIP_CONFLICT_ATTACHMENT: LOG_SKIP_CONFLICT_ATTACHMENT,
    LOG_NO_CHANGE: LOG_NO_CHANGE,
    LOG_NO_CHANGE_ATTACHMENT: LOG_NO_CHANGE_ATTACHMENT,

    logConsole: function (code, a, b, c) {
      if (!this._log_console) {
        return;
      }
      var txt,
        parsed_code = code,
        log;

      // Check severity level
      if (parsed_code >= 300) {
        txt = 'SKIP ';
        log = console.info;
      } else if (parsed_code >= 200) {
        txt = 'SOLVE ';
        log = console.log;
      } else if (parsed_code >= 100) {
        txt = 'FORCE ';
        log = console.warn;
      } else {
        txt = 'ERROR ';
        log = console.error;
      }

      // Check operation
      parsed_code = code % 100;
      if (parsed_code >= 80) {
        txt += 'idem ';
      } else if (parsed_code >= 70) {
        txt += 'conflict ';
      } else if (parsed_code >= 60) {
        txt += 'deleted ';
      } else if (parsed_code >= 50) {
        txt += 'modified ';
      } else if (parsed_code >= 40) {
        txt += 'created ';
      } else if (parsed_code >= 30) {
        txt += 'delete ';
      } else if (parsed_code >= 20) {
        txt += 'post ';
      } else if (parsed_code >= 10) {
        txt += 'put ';
      }

      // Check document
      parsed_code = code % 10;
      if (parsed_code >= 8) {
        txt += 'local ';
      } else if (parsed_code >= 6) {
        txt += 'remote ';
      }
      if (parsed_code !== 0) {
        txt += (parsed_code % 2 === 0) ? 'document' : 'attachment';
      }
      log(code, txt, a, b, c);
    },

    log: function (id, type, extra) {
      if (type === undefined) {
        if (extra === undefined) {
          extra = 'Unknown type: ' + type;
        }
        type = LOG_UNEXPECTED_ERROR;
      }
      if (type < this._log_level) {
        if (extra === undefined) {
          this.logConsole(type, id);
          this._list.push([type, id]);
        } else {
          this.logConsole(type, id, extra);
          this._list.push([type, id, extra]);
        }
        if (type < 100) {
          this.has_error = true;
        }
      }
    },

    logAttachment: function (id, name, type, extra) {
      if (type === undefined) {
        if (extra === undefined) {
          extra = 'Unknown type: ' + type;
        }
        type = LOG_UNEXPECTED_ERROR;
      }
      if (type < this._log_level) {
        if (extra === undefined) {
          this.logConsole(type, id, name);
          this._list.push([type, id, name]);
        } else {
          this.logConsole(type, id, name, extra);
          this._list.push([type, id, name, extra]);
        }
        if (type < 100) {
          this.has_error = true;
        }
      }
    },

    toString: function () {
      return this._list.toString();
    }
  };

  function SkipError(message) {
    if ((message !== undefined) && (typeof message !== "string")) {
      throw new TypeError('You must pass a string.');
    }
    this.message = message || "Skip some asynchronous code";
  }
  SkipError.prototype = new Error();
  SkipError.prototype.constructor = SkipError;

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
    this._log_level = spec.report_level || 100;
    this._log_console = spec.debug || false;
    if (spec.signature_hash_key !== undefined) {
      this._query_options.select_list = [spec.signature_hash_key];
    }
    this._signature_hash_key = spec.signature_hash_key;

    this._local_sub_storage = jIO.createJIO(spec.local_sub_storage);
    this._remote_sub_storage = jIO.createJIO(spec.remote_sub_storage);

    if (spec.hasOwnProperty('signature_sub_storage')) {
      this._signature_sub_storage = jIO.createJIO(spec.signature_sub_storage);
      this._custom_signature_sub_storage = true;
    } else {
      this._signature_hash = "_replicate_" + generateHash(
        stringify(spec.local_sub_storage) +
          stringify(spec.remote_sub_storage) +
          stringify(this._query_options)
      );
      this._signature_sub_storage = jIO.createJIO({
        type: "query",
        sub_storage: {
          type: "document",
          document_id: this._signature_hash,
          sub_storage: spec.local_sub_storage
        }
      });
      this._custom_signature_sub_storage = false;
    }

    this._use_remote_post = spec.use_remote_post || false;
    // Number of request we allow browser execution for attachments
    this._parallel_operation_attachment_amount =
      spec.parallel_operation_attachment_amount || 1;
    // Number of request we allow browser execution for documents
    this._parallel_operation_amount =
      spec.parallel_operation_amount || 1;

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
      this._check_local_attachment_modification = false;
    }
    this._check_local_attachment_creation =
      spec.check_local_attachment_creation;
    if (this._check_local_attachment_creation === undefined) {
      this._check_local_attachment_creation = false;
    }
    this._check_local_attachment_deletion =
      spec.check_local_attachment_deletion;
    if (this._check_local_attachment_deletion === undefined) {
      this._check_local_attachment_deletion = false;
    }
    this._check_remote_attachment_modification =
      spec.check_remote_attachment_modification;
    if (this._check_remote_attachment_modification === undefined) {
      this._check_remote_attachment_modification = false;
    }
    this._check_remote_attachment_creation =
      spec.check_remote_attachment_creation;
    if (this._check_remote_attachment_creation === undefined) {
      this._check_remote_attachment_creation = false;
    }
    this._check_remote_attachment_deletion =
      spec.check_remote_attachment_deletion;
    if (this._check_remote_attachment_deletion === undefined) {
      this._check_remote_attachment_deletion = false;
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

  function dispatchQueue(context, function_used, argument_list,
                         number_queue) {
    var result_promise_list = [],
      i;

    function pushAndExecute(queue) {
      queue
        .push(function () {
          if (argument_list.length > 0) {
            var argument_array = argument_list.shift(),
              sub_queue = new RSVP.Queue();
            argument_array[0] = sub_queue;
            function_used.apply(context, argument_array);
            pushAndExecute(queue);
            return sub_queue;
          }
        });
    }
    for (i = 0; i < number_queue; i += 1) {
      result_promise_list.push(new RSVP.Queue());
      pushAndExecute(result_promise_list[i]);
    }
    if (number_queue > 1) {
      return RSVP.all(result_promise_list);
    }
    return result_promise_list[0];
  }

  function callAllDocsOnStorage(context, storage, cache, cache_key) {
    return new RSVP.Queue()
      .push(function () {
        if (!cache.hasOwnProperty(cache_key)) {
          return storage.allDocs(context._query_options)
            .push(function (result) {
              var i,
                cache_entry = {};
              for (i = 0; i < result.data.total_rows; i += 1) {
                cache_entry[result.data.rows[i].id] = result.data.rows[i].value;
              }
              cache[cache_key] = cache_entry;
            });
        }
      })
      .push(function () {
        return cache[cache_key];
      });
  }

  function propagateAttachmentDeletion(context,
                                       destination,
                                       id, name,
                                       conflict, from_local, report) {
    if (conflict) {
      report.logAttachment(id, name, from_local ?
                                     LOG_FORCE_DELETE_REMOTE_ATTACHMENT :
                                     LOG_FORCE_DELETE_LOCAL_ATTACHMENT);
    } else {
      report.logAttachment(id, name, from_local ? LOG_DELETE_REMOTE_ATTACHMENT :
                                                  LOG_DELETE_LOCAL_ATTACHMENT);
    }
    return destination.removeAttachment(id, name)
      .push(function () {
        return context._signature_sub_storage.removeAttachment(id, name);
      });
  }

  function propagateAttachmentModification(context,
                                           destination,
                                           blob, hash, id, name,
                                           from_local, is_conflict, report) {
    if (is_conflict) {
      report.logAttachment(id, name, from_local ?
                                     LOG_FORCE_PUT_REMOTE_ATTACHMENT :
                                     LOG_FORCE_PUT_LOCAL_ATTACHMENT);
    } else {
      report.logAttachment(id, name, from_local ? LOG_PUT_REMOTE_ATTACHMENT :
                                                  LOG_PUT_LOCAL_ATTACHMENT);
    }
    return destination.putAttachment(id, name, blob)
      .push(function () {
        return context._signature_sub_storage.putAttachment(id, name,
                                                            JSON.stringify({
            hash: hash
          }));
      });
  }

  function checkAndPropagateAttachment(context,
                                       skip_attachment_dict,
                                       status_hash, local_hash, blob,
                                       source, destination, id, name,
                                       conflict_force, conflict_revert,
                                       conflict_ignore, from_local, report) {
    // No need to check twice
    skip_attachment_dict[name] = null;
    var remote_blob;
    return destination.getAttachment(id, name)
      .push(function (result) {
        remote_blob = result;
        return jIO.util.readBlobAsArrayBuffer(remote_blob);
      })
      .push(function (evt) {
        return generateHashFromArrayBuffer(
          evt.target.result
        );
      }, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          remote_blob = null;
          return null;
        }
        throw error;
      })
      .push(function (remote_hash) {
        if (local_hash === remote_hash) {
          // Same modifications on both side
          report.logAttachment(id, name, LOG_FALSE_CONFLICT_ATTACHMENT);
          if (local_hash === null) {
            // Deleted on both side, drop signature
            return context._signature_sub_storage.removeAttachment(id, name);
          }

          return context._signature_sub_storage.putAttachment(id, name,
            JSON.stringify({
              hash: local_hash
            }));
        }

        if ((remote_hash === status_hash) || (conflict_force === true)) {
          // Modified only locally. No conflict or force
          if (local_hash === null) {
            // Deleted locally
            return propagateAttachmentDeletion(context,
                                               destination,
                                               id, name,
                                               (remote_hash !== status_hash),
                                               from_local, report);
          }
          return propagateAttachmentModification(context,
                                       destination, blob,
                                       local_hash, id, name,
                                       from_local,
                                       (remote_hash !== status_hash),
                                       report);
        }

        // Conflict cases
        if (conflict_ignore === true) {
          report.logAttachment(id, name, LOG_SKIP_CONFLICT_ATTACHMENT);
          return;
        }

        if ((conflict_revert === true) || (local_hash === null)) {
          // Automatically resolve conflict or force revert
          if (remote_hash === null) {
            // Deleted remotely
            return propagateAttachmentDeletion(context,
                                               source, id, name,
                                               (local_hash !== status_hash),
                                               !from_local, report);
          }
          return propagateAttachmentModification(
            context,
            source,
            remote_blob,
            remote_hash,
            id,
            name,
            !from_local,
            (local_hash !== status_hash),
            report
          );
        }

        // Minimize conflict if it can be resolved
        if (remote_hash === null) {
          // Copy remote modification remotely
          return propagateAttachmentModification(context,
                                       destination, blob,
                                       local_hash, id, name, from_local,
                                       false,
                                       report);
        }
        report.logAttachment(id, name, LOG_UNRESOLVED_ATTACHMENT_CONFLICT);
      })
      .push(undefined, function (error) {
        report.logAttachment(id, name, LOG_UNEXPECTED_ERROR, error);
      });
  }

  function checkAttachmentSignatureDifference(queue, context,
                                              skip_attachment_dict,
                                              source,
                                              destination, id, name,
                                              conflict_force,
                                              conflict_revert,
                                              conflict_ignore,
                                              is_creation, is_modification,
                                              from_local,
                                              report) {
    var blob,
      status_hash;
    queue
      .push(function () {
        // Optimisation to save a get call to signature storage
        if (is_creation === true) {
          return RSVP.all([
            source.getAttachment(id, name),
            {hash: null}
          ]);
        }
        if (is_modification === true) {
          return RSVP.all([
            source.getAttachment(id, name),
            context._signature_sub_storage.getAttachment(
              id,
              name,
              {format: 'json'}
            )
          ]);
        }
        throw new jIO.util.jIOError("Unexpected call of"
                                    + " checkAttachmentSignatureDifference",
                                    409);
      })
      .push(function (result_list) {
        blob = result_list[0];
        status_hash = result_list[1].hash;
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (evt) {
        var array_buffer = evt.target.result,
          local_hash = generateHashFromArrayBuffer(array_buffer);

        if (local_hash === status_hash) {
          if (!from_local) {
            report.logAttachment(id, name, LOG_NO_CHANGE_ATTACHMENT);
          }
          return;
        }
        return checkAndPropagateAttachment(context,
                                           skip_attachment_dict,
                                           status_hash, local_hash, blob,
                                           source, destination, id, name,
                                           conflict_force, conflict_revert,
                                           conflict_ignore,
                                           from_local,
                                           report);
      });
  }

  function checkAttachmentLocalDeletion(queue, context,
                              skip_attachment_dict,
                              destination, id, name, source,
                              conflict_force, conflict_revert,
                              conflict_ignore, from_local, report) {
    var status_hash;
    queue
      .push(function () {
        return context._signature_sub_storage.getAttachment(id, name,
                                                            {format: 'json'});
      })
      .push(function (result) {
        status_hash = result.hash;
        return checkAndPropagateAttachment(context,
                                 skip_attachment_dict,
                                 status_hash, null, null,
                                 source, destination, id, name,
                                 conflict_force, conflict_revert,
                                 conflict_ignore, from_local, report);
      });
  }

  function pushDocumentAttachment(context,
                                  skip_attachment_dict, id, source,
                                  destination, signature_allAttachments,
                                  report, options) {
    var local_dict = {},
      signature_dict = {},
      from_local = options.from_local;
    return source.allAttachments(id)
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return {};
        }
        throw error;
      })
      .push(function (source_allAttachments) {
        var is_modification,
          is_creation,
          key,
          argument_list = [];
        for (key in source_allAttachments) {
          if (source_allAttachments.hasOwnProperty(key)) {
            if (!skip_attachment_dict.hasOwnProperty(key)) {
              local_dict[key] = null;
            }
          }
        }
        for (key in signature_allAttachments) {
          if (signature_allAttachments.hasOwnProperty(key)) {
            if (!skip_attachment_dict.hasOwnProperty(key)) {
              signature_dict[key] = null;
            }
          }
        }

        for (key in local_dict) {
          if (local_dict.hasOwnProperty(key)) {
            is_modification = signature_dict.hasOwnProperty(key)
              && options.check_modification;
            is_creation = !signature_dict.hasOwnProperty(key)
              && options.check_creation;
            if (is_modification === true || is_creation === true) {
              argument_list.push([undefined,
                                  context,
                                  skip_attachment_dict,
                                  source,
                                  destination, id, key,
                                  options.conflict_force,
                                  options.conflict_revert,
                                  options.conflict_ignore,
                                  is_creation,
                                  is_modification,
                                  from_local,
                                  report]);
            } else {
              if (signature_dict.hasOwnProperty(key)) {
                report.logAttachment(id, key, from_local ?
                                     LOG_SKIP_LOCAL_ATTACHMENT_MODIFICATION :
                                     LOG_SKIP_REMOTE_ATTACHMENT_MODIFICATION);
              } else {
                report.logAttachment(id, key, from_local ?
                                     LOG_SKIP_LOCAL_ATTACHMENT_CREATION :
                                     LOG_SKIP_REMOTE_ATTACHMENT_CREATION);
              }
            }
          }
        }
        return dispatchQueue(
          context,
          checkAttachmentSignatureDifference,
          argument_list,
          context._parallel_operation_attachment_amount
        );
      })
      .push(function () {
        var key, argument_list = [];
        for (key in signature_dict) {
          if (signature_dict.hasOwnProperty(key)) {
            if (!local_dict.hasOwnProperty(key)) {
              if (options.check_deletion === true) {
                argument_list.push([undefined,
                                             context,
                                             skip_attachment_dict,
                                             destination, id, key,
                                             source,
                                             options.conflict_force,
                                             options.conflict_revert,
                                             options.conflict_ignore,
                                             from_local,
                                             report]);
              } else {
                report.logAttachment(id, key, from_local ?
                                     LOG_SKIP_LOCAL_ATTACHMENT_DELETION :
                                     LOG_SKIP_REMOTE_ATTACHMENT_DELETION);
              }
            }
          }
        }
        return dispatchQueue(
          context,
          checkAttachmentLocalDeletion,
          argument_list,
          context._parallel_operation_attachment_amount
        );
      });
  }

  function propagateFastAttachmentDeletion(queue, id, name, storage, signature,
                                           from_local, report) {
    report.logAttachment(id, name, from_local ? LOG_DELETE_REMOTE_ATTACHMENT :
                                                LOG_DELETE_LOCAL_ATTACHMENT);
    return queue
      .push(function () {
        return storage.removeAttachment(id, name);
      })
      .push(function () {
        return signature.removeAttachment(id, name);
      });
  }

  function propagateFastSignatureDeletion(queue, id, name, signature,
                                          report) {
    report.logAttachment(id, name, LOG_FALSE_CONFLICT_ATTACHMENT);
    return queue
      .push(function () {
        return signature.removeAttachment(id, name);
      });
  }

  function propagateFastAttachmentModification(queue, id, key, source,
                                               destination, signature, hash,
                                               from_local, report) {
    return queue
      .push(function () {
        return signature.getAttachment(id, key, {format: 'json'})
          .push(undefined, function (error) {
            if ((error instanceof jIO.util.jIOError) &&
                (error.status_code === 404)) {
              return {hash: null};
            }
            throw error;
          })
          .push(function (result) {
            if (result.hash !== hash) {
              report.logAttachment(id, key, from_local ?
                                            LOG_PUT_REMOTE_ATTACHMENT :
                                            LOG_PUT_LOCAL_ATTACHMENT);
              return source.getAttachment(id, key)
                .push(function (blob) {
                  return destination.putAttachment(id, key, blob);
                })
                .push(function () {
                  return signature.putAttachment(id, key, JSON.stringify({
                    hash: hash
                  }));
                });
            }
          });

      });
  }

  function repairFastDocumentAttachment(context, id,
                                        signature_hash,
                                        signature_attachment_hash,
                                        signature_from_local,
                                        report) {
    if (signature_hash === signature_attachment_hash) {
      // No replication to do
      return;
    }
    return new RSVP.Queue()
      .push(function () {
        return RSVP.all([
          context._signature_sub_storage.allAttachments(id),
          context._local_sub_storage.allAttachments(id),
          context._remote_sub_storage.allAttachments(id)
        ]);
      })
      .push(function (result_list) {
        var key,
          source_attachment_dict,
          destination_attachment_dict,
          source,
          destination,
          push_argument_list = [],
          delete_argument_list = [],
          delete_signature_argument_list = [],
          signature_attachment_dict = result_list[0],
          local_attachment_dict = result_list[1],
          remote_attachment_list = result_list[2],
          check_local_modification =
            context._check_local_attachment_modification,
          check_local_creation = context._check_local_attachment_creation,
          check_local_deletion = context._check_local_attachment_deletion,
          check_remote_modification =
            context._check_remote_attachment_modification,
          check_remote_creation = context._check_remote_attachment_creation,
          check_remote_deletion = context._check_remote_attachment_deletion,
          from_local;

        if (signature_from_local) {
          source_attachment_dict = local_attachment_dict;
          destination_attachment_dict = remote_attachment_list;
          source = context._local_sub_storage;
          destination = context._remote_sub_storage;
          from_local = true;
        } else {
          source_attachment_dict = remote_attachment_list;
          destination_attachment_dict = local_attachment_dict;
          source = context._remote_sub_storage;
          destination = context._local_sub_storage;
          check_local_modification = check_remote_modification;
          check_local_creation = check_remote_creation;
          check_local_deletion = check_remote_deletion;
          check_remote_creation = check_local_creation;
          check_remote_deletion = check_local_deletion;
          from_local = false;
        }

        // Push all source attachments
        for (key in source_attachment_dict) {
          if (source_attachment_dict.hasOwnProperty(key)) {

            if ((check_local_creation &&
                 !signature_attachment_dict.hasOwnProperty(key)) ||
                (check_local_modification &&
                 signature_attachment_dict.hasOwnProperty(key))) {
              push_argument_list.push([
                undefined,
                id,
                key,
                source,
                destination,
                context._signature_sub_storage,
                signature_hash,
                from_local,
                report
              ]);
            } else {
              if (signature_attachment_dict.hasOwnProperty(key)) {
                report.logAttachment(id, key, from_local ?
                                     LOG_SKIP_LOCAL_ATTACHMENT_MODIFICATION :
                                     LOG_SKIP_REMOTE_ATTACHMENT_MODIFICATION);
              } else {
                report.logAttachment(id, key, from_local ?
                                     LOG_SKIP_LOCAL_ATTACHMENT_CREATION :
                                     LOG_SKIP_REMOTE_ATTACHMENT_CREATION);
              }
            }
          }
        }

        // Delete remaining signature + remote attachments
        for (key in signature_attachment_dict) {
          if (signature_attachment_dict.hasOwnProperty(key)) {
            if (check_local_deletion &&
                !source_attachment_dict.hasOwnProperty(key) &&
                !destination_attachment_dict.hasOwnProperty(key)) {
              delete_signature_argument_list.push([
                undefined,
                id,
                key,
                context._signature_sub_storage,
                report
              ]);
            }
          }
        }

        for (key in destination_attachment_dict) {
          if (destination_attachment_dict.hasOwnProperty(key)) {
            if (!source_attachment_dict.hasOwnProperty(key)) {
              if ((check_local_deletion &&
                   signature_attachment_dict.hasOwnProperty(key)) ||
                  (check_remote_creation &&
                   !signature_attachment_dict.hasOwnProperty(key))) {
                delete_argument_list.push([
                  undefined,
                  id,
                  key,
                  destination,
                  context._signature_sub_storage,
                  from_local,
                  report
                ]);
              } else {
                if (signature_attachment_dict.hasOwnProperty(key)) {
                  report.logAttachment(id, key, from_local ?
                       LOG_SKIP_LOCAL_ATTACHMENT_DELETION :
                       LOG_SKIP_REMOTE_ATTACHMENT_DELETION);
                } else {
                  report.logAttachment(id, key, from_local ?
                       LOG_SKIP_LOCAL_ATTACHMENT_CREATION :
                       LOG_SKIP_REMOTE_ATTACHMENT_CREATION);
                }
              }
            }
          }
        }

        return RSVP.all([
          dispatchQueue(
            context,
            propagateFastAttachmentModification,
            push_argument_list,
            context._parallel_operation_attachment_amount
          ),
          dispatchQueue(
            context,
            propagateFastAttachmentDeletion,
            delete_argument_list,
            context._parallel_operation_attachment_amount
          ),
          dispatchQueue(
            context,
            propagateFastSignatureDeletion,
            delete_signature_argument_list,
            context._parallel_operation_attachment_amount
          )
        ]);
      })
      .push(function () {
        // Mark that all attachments have been synchronized
        return context._signature_sub_storage.put(id, {
          hash: signature_hash,
          attachment_hash: signature_hash,
          from_local: signature_from_local
        });
      });
  }

  function repairDocumentAttachment(context, id, report, signature_hash_key,
                                    signature_hash,
                                    signature_attachment_hash,
                                    signature_from_local) {
    if (signature_hash_key !== undefined) {
      return repairFastDocumentAttachment(context, id,
                                    signature_hash,
                                    signature_attachment_hash,
                                    signature_from_local, report);
    }

    var skip_attachment_dict = {};
    return new RSVP.Queue()
      .push(function () {
        if (context._check_local_attachment_modification ||
            context._check_local_attachment_creation ||
            context._check_local_attachment_deletion ||
            context._check_remote_attachment_modification ||
            context._check_remote_attachment_creation ||
            context._check_remote_attachment_deletion) {
          return context._signature_sub_storage.allAttachments(id);
        }
        return {};
      })
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return {};
        }
        throw error;
      })
      .push(function (signature_allAttachments) {
        if (context._check_local_attachment_modification ||
            context._check_local_attachment_creation ||
            context._check_local_attachment_deletion) {
          return pushDocumentAttachment(
            context,
            skip_attachment_dict,
            id,
            context._local_sub_storage,
            context._remote_sub_storage,
            signature_allAttachments,
            report,
            {
              conflict_force: (context._conflict_handling ===
                               CONFLICT_KEEP_LOCAL),
              conflict_revert: (context._conflict_handling ===
                                CONFLICT_KEEP_REMOTE),
              conflict_ignore: (context._conflict_handling ===
                                CONFLICT_CONTINUE),
              check_modification:
                context._check_local_attachment_modification,
              check_creation: context._check_local_attachment_creation,
              check_deletion: context._check_local_attachment_deletion,
              from_local: true
            }
          )
            .push(function () {
              return signature_allAttachments;
            });
        }
        return signature_allAttachments;
      })
      .push(function (signature_allAttachments) {
        if (context._check_remote_attachment_modification ||
            context._check_remote_attachment_creation ||
            context._check_remote_attachment_deletion) {
          return pushDocumentAttachment(
            context,
            skip_attachment_dict,
            id,
            context._remote_sub_storage,
            context._local_sub_storage,
            signature_allAttachments,
            report,
            {
              use_revert_post: context._use_remote_post,
              conflict_force: (context._conflict_handling ===
                               CONFLICT_KEEP_REMOTE),
              conflict_revert: (context._conflict_handling ===
                                CONFLICT_KEEP_LOCAL),
              conflict_ignore: (context._conflict_handling ===
                                CONFLICT_CONTINUE),
              check_modification:
                context._check_remote_attachment_modification,
              check_creation: context._check_remote_attachment_creation,
              check_deletion: context._check_remote_attachment_deletion,
              from_local: false
            }
          );
        }
      });
  }

  function propagateModification(context, source, destination, doc, hash, id,
                                 skip_document_dict,
                                 skip_deleted_document_dict,
                                 report,
                                 options) {
    var result = new RSVP.Queue(),
      post_id,
      from_local,
      conflict;
    if (options === undefined) {
      options = {};
    }
    from_local = options.from_local;
    conflict = options.conflict || false;

    if (doc === null) {
      result
        .push(function () {
          return source.get(id);
        })
        .push(function (source_doc) {
          doc = source_doc;
        }, function (error) {
          if ((error instanceof jIO.util.jIOError) &&
              (error.status_code === 404)) {
            throw new SkipError(id);
          }
          throw error;
        });
    }
    if (options.use_post) {
      result
        .push(function () {
          report.log(id, from_local ? LOG_POST_REMOTE : LOG_POST_LOCAL);
          return destination.post(doc);
        })
        .push(function (new_id) {
          post_id = new_id;
          return source.put(post_id, doc);
        })
        .push(function () {
          // Copy all attachments
          // This is not related to attachment replication
          // It's just about not losing user data
          return source.allAttachments(id);
        })
        .push(function (attachment_dict) {
          var key,
            copy_queue = new RSVP.Queue();

          function copyAttachment(name) {
            copy_queue
              .push(function () {
                return source.getAttachment(id, name);
              })
              .push(function (blob) {
                return source.putAttachment(post_id, name, blob);
              });
          }

          for (key in attachment_dict) {
            if (attachment_dict.hasOwnProperty(key)) {
              copyAttachment(key);
            }
          }
          return copy_queue;
        })
        .push(function () {
          return source.remove(id);
        })
        .push(function () {
          return context._signature_sub_storage.remove(id);
        })
        .push(function () {
          return context._signature_sub_storage.put(post_id, {
            hash: hash,
            from_local: from_local
          });
        })
        .push(function () {
          skip_document_dict[post_id] = null;
        });
    } else {
      result
        .push(function () {
          if (conflict) {
            report.log(id, from_local ? LOG_FORCE_PUT_REMOTE :
                                        LOG_FORCE_PUT_LOCAL);
          } else {
            report.log(id, from_local ? LOG_PUT_REMOTE : LOG_PUT_LOCAL);
          }
          // Drop signature if the destination document was empty
          // but a signature exists
          if (options.create_new_document === true) {
            delete skip_deleted_document_dict[id];
            return context._signature_sub_storage.remove(id);
          }
        })
        .push(function () {
          return destination.put(id, doc);
        })
        .push(function () {
          return context._signature_sub_storage.put(id, {
            hash: hash,
            from_local: from_local
          });
        });
    }
    return result
      .push(undefined, function (error) {
        if (error instanceof SkipError) {
          return;
        }
        throw error;
      });
  }

  function propagateDeletion(context, destination, id,
                             skip_deleted_document_dict, report, options) {
    // Do not delete a document if it has an attachment
    // ie, replication should prevent losing user data
    // Synchronize attachments before, to ensure
    // all of them will be deleted too
    var result;
    if (context._signature_hash_key !== undefined) {
      if (options.conflict) {
        report.log(id, options.from_local ? LOG_FORCE_DELETE_REMOTE :
                                            LOG_FORCE_DELETE_LOCAL);
      } else {
        report.log(id, options.from_local ? LOG_DELETE_REMOTE :
                                            LOG_DELETE_LOCAL);
      }
      result = destination.remove(id)
        .push(function () {
          return context._signature_sub_storage.remove(id);
        });
    } else {
      result = repairDocumentAttachment(context, id, report)
        .push(function () {
          return destination.allAttachments(id);
        })
        .push(function (attachment_dict) {
          if (JSON.stringify(attachment_dict) === "{}") {
            if (options.conflict) {
              report.log(id, options.from_local ? LOG_FORCE_DELETE_REMOTE :
                                                  LOG_FORCE_DELETE_LOCAL);
            } else {
              report.log(id, options.from_local ? LOG_DELETE_REMOTE :
                                                  LOG_DELETE_LOCAL);
            }
            return destination.remove(id)
              .push(function () {
                return context._signature_sub_storage.remove(id);
              });
          }
          report.log(id, options.from_local ? LOG_UNEXPECTED_REMOTE_ATTACHMENT :
                                              LOG_UNEXPECTED_LOCAL_ATTACHMENT);
        }, function (error) {
          if ((error instanceof jIO.util.jIOError) &&
              (error.status_code === 404)) {
            return;
          }
          throw error;
        });
    }
    return result
      .push(function () {
        // No need to sync attachment twice on this document
        skip_deleted_document_dict[id] = null;
      });
  }

  function checkAndPropagate(context, skip_document_dict,
                             skip_deleted_document_dict,
                             cache, destination_key,
                             status_hash, local_hash, doc,
                             source, destination, id,
                             conflict_force, conflict_revert,
                             conflict_ignore,
                             report,
                             options) {
    // No need to check twice
    skip_document_dict[id] = null;
    var from_local = options.from_local;
    return new RSVP.Queue()
      .push(function () {
        if (options.signature_hash_key !== undefined) {
          return callAllDocsOnStorage(context, destination,
                                      cache, destination_key)
            .push(function (result) {
              if (result.hasOwnProperty(id)) {
                return [null, result[id][options.signature_hash_key]];
              }
              return [null, null];
            });
        }
        return destination.get(id)
          .push(function (remote_doc) {
            return [remote_doc, generateHash(stringify(remote_doc))];
          }, function (error) {
            if ((error instanceof jIO.util.jIOError) &&
                (error.status_code === 404)) {
              return [null, null];
            }
            throw error;
          });
      })

      .push(function (remote_list) {
        var remote_doc = remote_list[0],
          remote_hash = remote_list[1];
        if (local_hash === remote_hash) {
          // Same modifications on both side
          report.log(id, LOG_FALSE_CONFLICT);
          if (local_hash === null) {
            // Deleted on both side, drop signature
            return context._signature_sub_storage.remove(id);
          }

          return context._signature_sub_storage.put(id, {
            hash: local_hash,
            from_local: from_local
          });
        }

        if ((remote_hash === status_hash) || (conflict_force === true)) {
          // Modified only locally. No conflict or force
          if (local_hash === null) {
            // Deleted locally
            return propagateDeletion(context, destination, id,
                                     skip_deleted_document_dict,
                                     report,
                                     {from_local: from_local,
                                      conflict: (remote_hash !== status_hash)
                                      });
          }
          return propagateModification(context, source, destination, doc,
                                       local_hash, id, skip_document_dict,
                                       skip_deleted_document_dict,
                                       report,
                                       {use_post: ((options.use_post) &&
                                                   (remote_hash === null)),
                                        conflict: (remote_hash !== status_hash),
                                        from_local: from_local,
                                        create_new_document:
                                          ((remote_hash === null) &&
                                           (status_hash !== null))
                                        });
        }

        // Conflict cases
        if (conflict_ignore === true) {
          report.log(id, LOG_SKIP_CONFLICT);
          return;
        }

        if ((conflict_revert === true) || (local_hash === null)) {
          // Automatically resolve conflict or force revert
          if (remote_hash === null) {
            // Deleted remotely
            return propagateDeletion(context, source, id,
                                     skip_deleted_document_dict, report,
                                     {from_local: !from_local,
                                      conflict: (local_hash !== null)
                                     });
          }
          return propagateModification(
            context,
            destination,
            source,
            remote_doc,
            remote_hash,
            id,
            skip_document_dict,
            skip_deleted_document_dict,
            report,
            {use_post: ((options.use_revert_post) &&
                        (local_hash === null)),
              from_local: !from_local,
              conflict: true,
              create_new_document: ((local_hash === null) &&
                                    (status_hash !== null))}
          );
        }

        // Minimize conflict if it can be resolved
        if (remote_hash === null) {
          // Copy remote modification remotely
          return propagateModification(context, source, destination, doc,
                                       local_hash, id, skip_document_dict,
                                       skip_deleted_document_dict,
                                       report,
                                       {use_post: options.use_post,
                                        conflict: true,
                                        from_local: from_local,
                                        create_new_document:
                                          (status_hash !== null)});
        }
        report.log(id, LOG_UNRESOLVED_CONFLICT);
      })
      .push(undefined, function (error) {
        report.log(id, LOG_UNEXPECTED_ERROR, error);
      });
  }

  function checkLocalDeletion(queue, context, skip_document_dict,
                              skip_deleted_document_dict,
                              cache, destination_key,
                              destination, id, source,
                              conflict_force, conflict_revert,
                              conflict_ignore, report, options) {
    var status_hash;
    queue
      .push(function () {
        return context._signature_sub_storage.get(id);
      })
      .push(function (result) {
        status_hash = result.hash;
        return checkAndPropagate(context, skip_document_dict,
                                 skip_deleted_document_dict,
                                 cache, destination_key,
                                 status_hash, null, null,
                                 source, destination, id,
                                 conflict_force, conflict_revert,
                                 conflict_ignore, report,
                                 options);
      });
  }

  function checkSignatureDifference(queue, context, skip_document_dict,
                                    skip_deleted_document_dict,
                                    cache, destination_key,
                                    source, destination, id,
                                    conflict_force, conflict_revert,
                                    conflict_ignore,
                                    local_hash, status_hash, report,
                                    options) {
    queue
      .push(function () {
        if (local_hash === null) {
          // Hash was not provided by the allDocs query
          return source.get(id);
        }
        return null;
      })
      .push(function (doc) {
        if (local_hash === null) {
          // Hash was not provided by the allDocs query
          local_hash = generateHash(stringify(doc));
        }

        if (local_hash !== status_hash) {
          return checkAndPropagate(context, skip_document_dict,
                                   skip_deleted_document_dict,
                                   cache, destination_key,
                                   status_hash, local_hash, doc,
                                   source, destination, id,
                                   conflict_force, conflict_revert,
                                   conflict_ignore,
                                   report,
                                   options);
        }
        if (!options.from_local) {
          report.log(id, LOG_NO_CHANGE);
        }
      });
  }

  function pushStorage(context, skip_document_dict,
                       skip_deleted_document_dict,
                       cache, source_key, destination_key,
                       source, destination, signature_allDocs,
                       report, options) {
    var argument_list = [],
      argument_list_deletion = [];
    if (!options.hasOwnProperty("use_post")) {
      options.use_post = false;
    }
    if (!options.hasOwnProperty("use_revert_post")) {
      options.use_revert_post = false;
    }
    return callAllDocsOnStorage(context, source, cache, source_key)
      .push(function (source_allDocs) {
        var i,
          local_dict = {},
          signature_dict = {},
          is_modification,
          is_creation,
          status_hash,
          local_hash,
          key,
          queue = new RSVP.Queue();
        for (key in source_allDocs) {
          if (source_allDocs.hasOwnProperty(key)) {
            if (!skip_document_dict.hasOwnProperty(key)) {
              local_dict[key] = source_allDocs[key];
            }
          }
        }
        /*
        for (i = 0; i < source_allDocs.data.total_rows; i += 1) {
          if (!skip_document_dict.hasOwnProperty(
              source_allDocs.data.rows[i].id
            )) {
            local_dict[source_allDocs.data.rows[i].id] =
              source_allDocs.data.rows[i].value;
          }
        }
        */
        for (i = 0; i < signature_allDocs.data.total_rows; i += 1) {
          if (!skip_document_dict.hasOwnProperty(
              signature_allDocs.data.rows[i].id
            )) {
            signature_dict[signature_allDocs.data.rows[i].id] =
              signature_allDocs.data.rows[i].value.hash;
          }
        }
        for (key in local_dict) {
          if (local_dict.hasOwnProperty(key)) {
            is_modification = signature_dict.hasOwnProperty(key)
              && options.check_modification;
            is_creation = !signature_dict.hasOwnProperty(key)
              && options.check_creation;

            if (is_creation === true) {
              status_hash = null;
            } else if (is_modification === true) {
              status_hash = signature_dict[key];
            }

            local_hash = null;
            if (options.signature_hash_key !== undefined) {
              local_hash = local_dict[key][options.signature_hash_key];
              if (is_modification === true) {
                // Bypass fetching all documents and calculating the sha
                // Compare the select list values returned by allDocs calls
                is_modification = false;
                if (local_hash !== status_hash) {
                  is_modification = true;
                }
              }
            }

            if (is_modification === true || is_creation === true) {
              argument_list.push([undefined, context, skip_document_dict,
                                  skip_deleted_document_dict,
                                  cache, destination_key,
                                  source, destination,
                                  key,
                                  options.conflict_force,
                                  options.conflict_revert,
                                  options.conflict_ignore,
                                  local_hash, status_hash,
                                  report,
                                  options]);
            } else if (local_hash === status_hash) {
              report.log(key, LOG_NO_CHANGE);
            } else {
              if (signature_dict.hasOwnProperty(key)) {
                report.log(key, options.from_local ?
                           LOG_SKIP_LOCAL_MODIFICATION :
                           LOG_SKIP_REMOTE_MODIFICATION);
              } else {
                report.log(key, options.from_local ? LOG_SKIP_LOCAL_CREATION :
                                                     LOG_SKIP_REMOTE_CREATION);
              }
            }
          }
        }
        queue
          .push(function () {
            return dispatchQueue(
              context,
              checkSignatureDifference,
              argument_list,
              options.operation_amount
            );
          });
        for (key in signature_dict) {
          if (signature_dict.hasOwnProperty(key)) {
            if (!local_dict.hasOwnProperty(key)) {
              if (options.check_deletion === true) {
                argument_list_deletion.push([undefined,
                                             context,
                                             skip_document_dict,
                                             skip_deleted_document_dict,
                                             cache, destination_key,
                                             destination, key,
                                             source,
                                             options.conflict_force,
                                             options.conflict_revert,
                                             options.conflict_ignore,
                                             report,
                                             options]);
              } else {
                report.log(key, options.from_local ? LOG_SKIP_LOCAL_DELETION :
                                                     LOG_SKIP_REMOTE_DELETION);
                skip_deleted_document_dict[key] = null;
              }
            }
          }
        }
        if (argument_list_deletion.length !== 0) {
          queue.push(function () {
            return dispatchQueue(
              context,
              checkLocalDeletion,
              argument_list_deletion,
              options.operation_amount
            );
          });
        }
        return queue;
      });
  }

  function repairDocument(queue, context, id, report, signature_hash_key,
                          signature_hash, signature_attachment_hash,
                          signature_from_local) {
    queue.push(function () {
      return repairDocumentAttachment(context, id, report, signature_hash_key,
                                      signature_hash,
                                      signature_attachment_hash,
                                      signature_from_local);
    });
  }

  ReplicateStorage.prototype.repair = function () {
    var context = this,
      argument_list = arguments,
      skip_document_dict = {},
      skip_deleted_document_dict = {},
      cache = {},
      report = new ReplicateReport(this._log_level, this._log_console);

    return new RSVP.Queue()
      .push(function () {
        // Ensure that the document storage is usable
        if (context._custom_signature_sub_storage === false) {
          // Do not sync the signature document
          skip_document_dict[context._signature_hash] = null;

          return context._signature_sub_storage.__storage._sub_storage
                                               .__storage._sub_storage.get(
              context._signature_hash
            );
        }
      })
      .push(undefined, function (error) {
        if ((error instanceof jIO.util.jIOError) &&
            (error.status_code === 404)) {
          return context._signature_sub_storage.__storage._sub_storage
                                               .__storage._sub_storage.put(
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
            context._check_local_deletion ||
            context._check_remote_modification ||
            context._check_remote_creation ||
            context._check_remote_deletion) {
          return context._signature_sub_storage.allDocs({
            select_list: ['hash']
          });
        }
      })

      .push(function (signature_allDocs) {
        if (context._check_local_modification ||
            context._check_local_creation ||
            context._check_local_deletion) {
          return pushStorage(context, skip_document_dict,
                             skip_deleted_document_dict,
                             cache, 'local', 'remote',
                             context._local_sub_storage,
                             context._remote_sub_storage,
                             signature_allDocs, report,
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
              check_deletion: context._check_local_deletion,
              operation_amount: context._parallel_operation_amount,
              signature_hash_key: context._signature_hash_key,
              from_local: true
            })
              .push(function () {
              return signature_allDocs;
            });
        }
        return signature_allDocs;
      })
      .push(function (signature_allDocs) {
        if (context._check_remote_modification ||
            context._check_remote_creation ||
            context._check_remote_deletion) {
          return pushStorage(context, skip_document_dict,
                             skip_deleted_document_dict,
                             cache, 'remote', 'local',
                             context._remote_sub_storage,
                             context._local_sub_storage,
                             signature_allDocs,
                             report, {
              use_revert_post: context._use_remote_post,
              conflict_force: (context._conflict_handling ===
                               CONFLICT_KEEP_REMOTE),
              conflict_revert: (context._conflict_handling ===
                                CONFLICT_KEEP_LOCAL),
              conflict_ignore: (context._conflict_handling ===
                                CONFLICT_CONTINUE),
              check_modification: context._check_remote_modification,
              check_creation: context._check_remote_creation,
              check_deletion: context._check_remote_deletion,
              operation_amount: context._parallel_operation_amount,
              signature_hash_key: context._signature_hash_key,
              from_local: false
            });
        }
      })
      .push(function () {
        if (context._check_local_attachment_modification ||
            context._check_local_attachment_creation ||
            context._check_local_attachment_deletion ||
            context._check_remote_attachment_modification ||
            context._check_remote_attachment_creation ||
            context._check_remote_attachment_deletion) {
          // Attachments are synchronized if and only if their parent document
          // has been also marked as synchronized.
          return context._signature_sub_storage.allDocs({
            select_list: ['hash', 'attachment_hash', 'from_local']
          })
            .push(function (result) {
              var i,
                local_argument_list = [],
                row,
                len = result.data.total_rows;

              for (i = 0; i < len; i += 1) {
                row = result.data.rows[i];
                // Do not synchronize attachment if one version of the document
                // is deleted but not pushed to the other storage
                if (!skip_deleted_document_dict.hasOwnProperty(row.id)) {
                  local_argument_list.push(
                    [undefined, context, row.id, report,
                      context._signature_hash_key,
                      row.value.hash, row.value.attachment_hash,
                      row.value.from_local, report]
                  );
                }
              }
              return dispatchQueue(
                context,
                repairDocument,
                local_argument_list,
                context._parallel_operation_amount
              );
            });
        }
      })
      .push(function () {
        if (report.has_error) {
          throw report;
        }
        return report;
      });
  };

  jIO.addStorage('replicate', ReplicateStorage);

}(jIO, RSVP, Rusha, jIO.util.stringify));
