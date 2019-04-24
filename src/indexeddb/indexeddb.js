/*
 * Copyright 2019, Nexedi SA
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
/*jslint nomen: true */
/*global indexedDB, RSVP, IDBOpenDBRequest, DOMError, Event, Set, DOMException,
  window*/

(function (indexedDB, RSVP, IDBOpenDBRequest, DOMError, DOMException) {
  "use strict";

  function waitForIDBRequest(request) {
    return new RSVP.Promise(function (resolve, reject) {
      request.onerror = reject;
      request.onsuccess = resolve;
    });
  }

  function waitForAllSynchronousCursor(request, callback) {
    var force_cancellation = false;

    function canceller() {
      force_cancellation = true;
    }

    function resolver(resolve, reject) {
      request.onerror = reject;
      request.onsuccess = function (evt) {
        var cursor = evt.target.result;
        if (cursor && !force_cancellation) {
          try {
            callback(cursor);
          } catch (error) {
            reject(error);
          }
          // continue to next iteration
          cursor["continue"]();
        } else {
          resolve();
        }
      };
    }
    return new RSVP.Promise(resolver, canceller);
  }

  function waitForOpenIndexedDB(db_name, version, upgrade_handler, callback) {
    var request;

    function canceller() {
      if ((request !== undefined) && (request.result !== undefined)) {
        request.result.close();
      }
    }

    function resolver(resolve, reject) {
      // Open DB //
      request = indexedDB.open(db_name, version);
      request.onerror = function (error) {
        canceller();
        if ((error !== undefined) &&
            (error.target instanceof IDBOpenDBRequest) &&
            ((error.target.error instanceof DOMError) ||
            (error.target.error instanceof DOMException))) {
          reject("Connection to: " + db_name + " failed: " +
                 error.target.error.message);
        } else {
          reject(error);
        }
      };

      request.onabort = function () {
        canceller();
        reject("Aborting connection to: " + db_name);
      };

      request.ontimeout = function () {
        reject("Connection to: " + db_name + " timeout");
      };

      request.onblocked = function () {
        canceller();
        reject("Connection to: " + db_name + " was blocked");
      };

      // Create DB if necessary //
      request.onupgradeneeded = upgrade_handler;

      request.onversionchange = function () {
        canceller();
        reject(db_name + " was upgraded");
      };

      request.onsuccess = function () {
        var result;
        try {
          result = callback(request.result);
        } catch (error) {
          reject(error);
        }
        return new RSVP.Queue()
          .push(function () {
            return result;
          })
          .push(function (final_result) {
            canceller();
            resolve(final_result);
          }, function (error) {
            canceller();
            reject(error);
          });
      };
    }

    return new RSVP.Promise(resolver, canceller);
  }

  function waitForRepairableOpenIndexedDB(db_name, version, index_keys,
    sub_storage_description, signature_storage_name, upgrade_handler,
    callback) {
    var handleUpgradeNeeded = function (evt) {
      return upgrade_handler(evt, index_keys, sub_storage_description,
        signature_storage_name);
    };
    return waitForOpenIndexedDB(db_name, version, handleUpgradeNeeded,
      callback);
  }

  function waitForTransaction(db, stores, flag, callback) {
    var tx = db.transaction(stores, flag);
    function canceller() {
      try {
        tx.abort();
      } catch (unused) {
        // Transaction already finished
        return;
      }
    }
    function resolver(resolve, reject) {
      var result;
      try {
        result = callback(tx);
      } catch (error) {
        reject(error);
      }
      tx.oncomplete = function () {
        return new RSVP.Queue()
          .push(function () {
            return result;
          })
          .push(resolve, function (error) {
            canceller();
            reject(error);
          });
      };
      tx.onerror = function (error) {
        canceller();
        reject(error);
      };
      tx.onabort = function (evt) {
        reject(evt.target);
      };
      return tx;
    }
    return new RSVP.Promise(resolver, canceller);
  }

  window.waitForTransaction = waitForTransaction;
  window.waitForOpenIndexedDB = waitForOpenIndexedDB;
  window.waitForIDBRequest = waitForIDBRequest;
  window.waitForAllSynchronousCursor = waitForAllSynchronousCursor;
  window.waitForRepairableOpenIndexedDB = waitForRepairableOpenIndexedDB;

}(indexedDB, RSVP, IDBOpenDBRequest, DOMError, DOMException));