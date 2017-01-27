/**
 * JIO Service Worker Storage Type = "serviceworker".
 * Servieworker "filesystem" storage.
 */
/*global Blob, jIO, RSVP, navigator MessageChannel*/
/*jslint indent: 2 nomen: true maxerr: 3*/

(function (jIO, RSVP, navigator) {
  "use strict";

  // no need to validate attachment name, because serviceworker.js will throw
  function restrictDocumentId(id) {
    if (id.indexOf("/") > -1) {
      throw new jIO.util.jIOError("id should be a name, not a path)", 400);
    }
    return id;
  }

  // validate browser support, serviceworker registration must be done in gadget
  function validateConnection() {
    if ("serviceWorker" in navigator === false) {
      throw new jIO.util.jIOError("Serviceworker not available in browser", 503);
    }
  }

  // This wraps the message posting/response in a promise, which will resolve if
  // the response doesn't contain an error, and reject with the error if it does.
  // Alternatively, onmessage handle and controller.postMessage() could be used
  function sendMessage(message) {
    return new RSVP.Promise(function (resolve, reject, notify) {
      var messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = function (event) {
        if (event.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data.data);
        }
      };

      // This sends the message data as well as transferring
      // messageChannel.port2 to the service worker. The service worker can then
      // use the transferred port to reply via postMessage(), which will in turn
      // trigger the onmessage handler on messageChannel.port1.
      // See https://html.spec.whatwg.org/multipage/workers.html
      return navigator.serviceWorker.controller
        .postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * The JIO Serviceworker Storage extension
   *
   * @class ServiceWorkerStorage
   * @constructor
   */
  function ServiceWorkerStorage () {}

  ServiceWorkerStorage.prototype.post = function () {
    throw new jIO.util.jIOError("Storage requires 'put' to create new cache",
                                400);
  };

  ServiceWorkerStorage.prototype.get = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "get",
          id: restrictDocumentId(id)
        });
      })
      .push(undefined, function (error) {
        if (error.status === 404) {
          throw new jIO.util.jIOError(error.message, 404);
        }
        throw error;
      });
  };

  ServiceWorkerStorage.prototype.put = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "get",
          id: restrictDocumentId(id)
        });
      })
      .push(undefined, function (error) {
        if (error.status === 404) {
          return new RSVP.Queue()
            .push(function () {
              return sendMessage({
                command: "put",
                id: id
              });
            });
          }
          throw error;
      });
  };

  ServiceWorkerStorage.prototype.remove = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "allAttachments",
          id: restrictDocumentId(id)
        });
      })
      .push(function (attachment_dict) {
        var url_list = [],
          url;
        for (url in attachment_dict) {
          if (attachment_dict.hasOwnProperty(url)) {
            url_list.append(sendMessage({
              command: "removeAttachment",
              id: url
            }));
          }
        }
        return RSVP.all(url_list);
      })
      .push(function () {
        return sendMessage({
          command: "remove",
          id: restrictDocumentId(id)
        });
      });
  };

  ServiceWorkerStorage.prototype.removeAttachment = function (id, url) {
    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "removeAttachment",
          id: restrictDocumentId(id),
          name: url
        });
      });
  };

  ServiceWorkerStorage.prototype.getAttachment = function (id, url) {

    // NOTE: alternatively get could also be run "official" way via
    // an ajax request, which the serviceworker would catch via fetch listener!
    // for a filesystem equivalent however, we don't assume fetching resources
    // from the network, so all methods will go through sendMessage

    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "getAttachment",
          id: restrictDocumentId(id),
          name: url
        });
      })
      .push(function (my_blob_response) {
        return my_blob_response;
      });
  };

  ServiceWorkerStorage.prototype.putAttachment = function (id, name, param) {
    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "putAttachment",
          id: id,
          name: name,
          content: param
        });
      });
  };

  ServiceWorkerStorage.prototype.allAttachments = function (id) {
    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "allAttachments",
          id: restrictDocumentId(id)
        });
      });
  };

  ServiceWorkerStorage.prototype.hasCapacity = function (name) {
    return (name === "list");
  };

  // returns a list of all caches ~ folders
  ServiceWorkerStorage.prototype.allDocs = function (options) {
    var context = this;

    if (options === undefined) {
      options = {};
    }

    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        if (context.hasCapacity("list")) {
          return context.buildQuery(options);
        }
      })
      .push(function (result) {
        return result;
      });
  };

  ServiceWorkerStorage.prototype.buildQuery = function (options) {
    return new RSVP.Queue()
      .push(function () {
        return validateConnection();
      })
      .push(function () {
        return sendMessage({
          command: "allDocs",
          options: options
        });
      });
  };

  jIO.addStorage("serviceworker", ServiceWorkerStorage);

}(jIO, RSVP, navigator, MessageChannel));
