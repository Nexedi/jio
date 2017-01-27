/*
 * JIO Service Worker Storage Backend.
 */

// this polyfill provides Cache.add(), Cache.addAll(), and CacheStorage.match(),
// should not be needed for Chromium > 47 And Firefox > 39
// see https://developer.mozilla.org/en-US/docs/Web/API/Cache
// importScripts('./serviceworker-cache-polyfill.js');

// debug:
// chrome://cache/
// chrome://inspect/#service-workers
// chrome://serviceworker-internals/
//
// bar = new Promise(function (resolve, reject) {
//   return caches.keys()
//     .then(function (result) {
//      console.log(result);
//      return caches.open(result[0])
//        .then(function(cache){
//          return cache.keys()
//            .then(function (request_list) {
//              console.log(request_list);
//              console.log("DONE");
//              resolve();
//            });
//        });
//    });
//});

// clear last cache
// caches.keys().then(function(key_list) {console.log(key_list);return caches.open(key_list[0]);}).then(function(cache) {return cache.keys().then(function(request_list) {console.log(request_list); return cache.delete(request_list[0]);})});
// list caches
// caches.keys().then(function(key_list) {console.log(key_list);return caches.open(key_list[0]);}).then(function(cache) {return cache.keys().then(function(request_list) {console.log(request_list);})});

// multiple serviceworkers => https://github.com/w3c/ServiceWorker/issues/921
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
// intro http://www.html5rocks.com/en/tutorials/service-worker/introduction/
// selective cache https://github.com/GoogleChrome/samples/blob/gh-pages/service-worker/selective-caching/service-worker.js
// handling POST with indexedDB: https://serviceworke.rs/request-deferrer.html

// versioning allows to keep a clean cache, current_cache is accessed on fetch
var CURRENT_CACHE_VERSION = 1;
var CURRENT_CACHE;
var CURRENT_CACHE_DICT = {
  "self": "self-v" + CURRENT_CACHE_VERSION
};

// runs while an existing worker runs or nothing controls the page (update here)
//self.addEventListener('install', function (event) {
//
//});

// runs active page, changes here (like deleting old cache) breaks page
self.addEventListener("activate", function (event) {

  var expected_cache_name_list = Object.keys(CURRENT_CACHE_DICT).map(function(key) {
    return CURRENT_CACHE_DICT[key];
  });

  event.waitUntil(caches.keys()
    .then(function(cache_name_list) {
      return Promise.all(
        cache_name_list.map(function(cache_name) {
          version = cache_name.split("-v")[1];

          // removes caches which are out of version
          if (!(version && parseInt(version, 10) === CURRENT_CACHE_VERSION)) {
            return caches.delete(cache_name);
          }

          // removes caches which are not on the list of expected names 
          if (expected_cache_name_list.indexOf(cache_name) === -1) {
            return caches.delete(cache_name);
          }
        })
      );
    })
  );
});

// XXX "Server"
// intercept GET/POST network requests, serve from cache or network
/*
self.addEventListener("fetch", function (event) {
  var url = event.request.url,
    cacheable_list = [],
    isCacheable = function (el) {
      return url.indexOf(el) >= 0;
    };

  if (event.request.method === "GET") {
    event.respondWith(caches.open(CURRENT_CACHE_DICT["self"])
      .then(function(cache) {
        return cache.match(event.request)
          .then(function(response) {
  
            // cached, return from cache
            if (response) {
              return response;

            // not cached, fetch from network
            }

            // clone call, because any operation like fetch/put... will
            // consume the request, so we need a copy of the original
            // (see https://fetch.spec.whatwg.org/#dom-request-clone)
            return fetch(event.request.clone())
              .then(function(response) {

                // add resource to cache
                if (response.status < 400 && cacheable_list.some(isCacheable)) {
                  cache.put(event.request, response.clone());
                }
                return response;
              });
            });
      })
      .catch(function(error) {

        // This catch() will handle exceptions that arise from the match()
        // or fetch() operations. Note that a HTTP error response (e.g.
        // 404) will NOT trigger an exception. It will return a normal 
        // response object that has the appropriate error code set.
        throw error;
      })
    );

  // XXX handle post with indexedDB here
  //} else {
  //  event.respondWith(fetch(event.request));
  }
});
*/

self.addEventListener("message", function (event) {
  var param = event.data,
    item,
    mime_type,
    result_list;

  switch (param.command) {
    
    // case "post" not supported
    
    // test if cache exits
    case "get":
      caches.keys().then(function(key_list) {
        var i, len;
        CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
        for (i = 0, len = key_list.length; i < len; i += 1) {
          if (key_list[i] === CURRENT_CACHE) {
            event.ports[0].postMessage({
              error: null
            });
          }
        }

        // event.ports[0] corresponds to the MessagePort that was transferred 
        // as part of the controlled page's call to controller.postMessage(). 
        // Therefore, event.ports[0].postMessage() will trigger the onmessage
        // handler from the controlled page. It's up to you how to structure 
        // the messages that you send back; this is just one example.
        event.ports[0].postMessage({
          error: {
            "status": 404,
            "message": "Cache does not exist."
          }
        });
      })
      .catch(function(error) {
        event.ports[0].postMessage({
          error: {"message": error.toString()}
        });
      });

      break;

    // create new cache by opening it. this will only run once per cache/folder
    case "put":
      if (param.id === "self") {
        event.port[0].postMessage({
          error: {
            "status": 406,
            "message": "Reserved cache name. Please choose a different name."
          }
        });
      }
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      CURRENT_CACHE_DICT[param.id] = CURRENT_CACHE;
      caches.open(CURRENT_CACHE)
        .then(function() {
          event.ports[0].postMessage({
            error: null,
            data: param.id
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {"message": error.toString()}
          });
        });
    break;

    // remove a cache
    case "remove":
      delete CURRENT_CACHE_DICT[param.id];
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      caches.delete(CURRENT_CACHE)
        .then(function() {
          event.ports[0].postMessage({
            error: null
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {"message": error.toString()}
          });
        });
    break;

    // return list of caches ~ folders
    case "allDocs":
      caches.keys().then(function(key_list) {
        var result_list = [],
          id,
          i;
        for (i = 0; i < key_list.length; i += 1) {
          id = key_list[i].split("-v")[0];
          if (id !== "self") {
            result_list.push({
              "id": id,
              "value": {}
            });
          }
        }
        event.ports[0].postMessage({
          error: null,
          data: result_list
        });
      })
      .catch(function(error) {
        event.ports[0].postMessage({
          error: {"message": error.toString()}
        });
      });
    break;

    // return all urls stored in a cache
    case "allAttachments":
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;

      // returns a list of the URLs corresponding to the Request objects
      // that serve as keys for the current cache. We assume all files
      // are kept in cache, so there will be no network requests.

      caches.open(CURRENT_CACHE)
        .then(function(cache) {
          cache.keys()
          .then(function (request_list) {
            var result_list = request_list.map(function(request) {
              return request.url;
            }),
              attachment_dict = {},
              i, 
              len;

            for (i = 0, len = result_list.length; i < len; i += 1) {
              attachment_dict[result_list[i]] = {};
            }
            event.ports[0].postMessage({
              error: null,
              data: attachment_dict
            });
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {"message": error.toString()}
          });
        });
    break;

    case "removeAttachment":
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;

      caches.open(CURRENT_CACHE)
        .then(function(cache) {
          request = new Request(param.name, {mode: 'no-cors'});
          cache.delete(request)
            .then(function(success) {
              event.ports[0].postMessage({
                error: success ? null : {
                  "status": 404,
                  "message": "Item not found in cache."
                }
              });
            });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;

    case "getAttachment":
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      caches.open(CURRENT_CACHE)
        .then(function(cache) {
          return cache.match(param.name)
          .then(function(response) {

            // the response body is a ReadableByteStream which cannot be
            // passed back through postMessage apparently. This link
            // https://jakearchibald.com/2015/thats-so-fetch/ explains
            // what can be done to get a Blob to return
            
            // XXX Improve
            // However, calling blob() does not allow to set mime-type, so
            // for currently the blob is created, read, stored as new blob
            // and returned (to be read again)
            // https://github.com/whatwg/streams/blob/master/docs/ReadableByteStream.md
            mime_type = response.headers.get("Content-Type");
            return response.clone().blob();
          })
          .then(function (response_as_blob) {
            return new Promise(function(resolve) {
              var blob_reader = new FileReader();
              blob_reader.onload = resolve;
              blob_reader.readAsText(response_as_blob);
            });
          })
          .then(function (reader_response) {
            return new Blob([reader_response.target.result], {
              "type": mime_type
            });
          })
          .then(function (converted_response) {
            if (converted_response) {
              event.ports[0].postMessage({
                error: null,
                data: converted_response
              });
            } else {
              event.ports[0].postMessage({
                error: {
                  "status": 404,
                  "message": "Item not found in cache."
                }
              });
            }
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {'message': error.toString()}
          });
        });
    break;  

    case "putAttachment":
      CURRENT_CACHE = param.id + "-v" + CURRENT_CACHE_VERSION;
      caches.open(CURRENT_CACHE)
        .then(function(cache) {

          // If event.data.url isn't a valid URL, new Request() will throw a 
          // TypeError which will be handled by the outer .catch().
          // Hardcode {mode: 'no-cors} since the default for new Requests 
          // constructed from strings is to require CORS, and we don't have any 
          // way of knowing whether an arbitrary URL that a user entered 
          // supports CORS.
          request = new Request(param.name, {mode: "no-cors"});
          response = new Response(param.content);
          return cache.put(request, response);
        })
        .then(function() {
          event.ports[0].postMessage({
            error: null
          });
        })
        .catch(function(error) {
          event.ports[0].postMessage({
            error: {"message": error.toString()}
          });
        });
    break;

    // refuse all else
    default:
      throw "Unknown command: " + event.data.command;
  }
});  
