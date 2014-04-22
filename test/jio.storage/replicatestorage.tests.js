/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, RSVP, jIO, fake_storage, module, test, stop, start, deepEqual,
  setTimeout, clearTimeout, XMLHttpRequest, window, ok */

(function (dependencies, factory) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, factory);
  }
  factory(RSVP, jIO, fake_storage);
}([
  "rsvp",
  "jio",
  "fakestorage",
  "replicatestorage"
], function (RSVP, jIO, fake_storage) {
  "use strict";

  var all = RSVP.all, chain = RSVP.resolve, Promise = RSVP.Promise;

  /**
   *     sleep(delay, [value]): promise< value >
   *
   * Produces a new promise which will resolve with `value` after `delay`
   * milliseconds.
   *
   * @param  {Number} delay The time to sleep.
   * @param  {Any} [value] The value to resolve.
   * @return {Promise} A new promise.
   */
  function sleep(delay, value) {
    var ident;
    return new Promise(function (resolve) {
      ident = setTimeout(resolve, delay, value);
    }, function () {
      clearTimeout(ident);
    });
  }

  function jsonClone(object, replacer) {
    if (object === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(object, replacer));
  }

  function reverse(promise) {
    return promise.then(function (a) { throw a; }, function (e) { return e; });
  }

  function orderRowsById(a, b) {
    return a.id > b.id ? 1 : b.id > a.id ? -1 : 0;
  }

  module("Replicate + GID + Local");

  test("Get", function () {
    var shared = {}, i, jio_list, replicate_jio;

    // this test can work with at least 2 sub storages
    shared.gid_description = {
      "type": "gid",
      "constraints": {
        "default": {
          "identifier": "list"
        }
      },
      "sub_storage": null
    };

    shared.storage_description_list = [];
    for (i = 0; i < 4; i += 1) {
      shared.storage_description_list[i] = jsonClone(shared.gid_description);
      shared.storage_description_list[i].sub_storage = {
        "type": "local",
        "username": "replicate scenario test for get method - " + (i + 1),
        "mode": "memory"
      };
    }

    shared.replicate_storage_description = {
      "type": "replicate",
      "storage_list": shared.storage_description_list
    };

    shared.workspace = {};
    shared.jio_option = {
      "workspace": shared.workspace,
      "max_retry": 0
    };

    jio_list = shared.storage_description_list.map(function (description) {
      return jIO.createJIO(description, shared.jio_option);
    });
    replicate_jio = jIO.createJIO(
      shared.replicate_storage_description,
      shared.jio_option
    );

    stop();

    shared.modified_date_list = [
      new Date("1995"),
      new Date("2000"),
      null,
      new Date("Invalid Date")
    ];
    shared.winner_modified_date = shared.modified_date_list[1];

    function setFakeStorage() {
      setFakeStorage.original = shared.storage_description_list[0].sub_storage;
      shared.storage_description_list[0].sub_storage = {
        "type": "fake",
        "id": "replicate scenario test for get method - 1"
      };
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function unsetFakeStorage() {
      shared.storage_description_list[0].sub_storage = setFakeStorage.original;
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function putSimilarDocuments() {
      return all(jio_list.map(function (jio) {
        return jio.post({
          "identifier": "a",
          "modified": shared.modified_date_list[0]
        });
      }));
    }

    function getDocumentNothingToSynchronize() {
      return replicate_jio.get({"_id": "{\"identifier\":[\"a\"]}"});
    }

    function getDocumentNothingToSynchronizeTest(answer) {
      deepEqual(answer, {
        "data": {
          "_id": "{\"identifier\":[\"a\"]}",
          "identifier": "a",
          "modified": shared.modified_date_list[0].toJSON()
        },
        "id": "{\"identifier\":[\"a\"]}",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get document, nothing to synchronize.");

      // check storage state
      return sleep(1000).
        // possible synchronization in background (should not occur)
        then(function () {
          return all(jio_list.map(function (jio) {
            return jio.get({"_id": "{\"identifier\":[\"a\"]}"});
          }));
        }).then(function (answers) {
          answers.forEach(function (answer) {
            deepEqual(answer, {
              "data": {
                "_id": "{\"identifier\":[\"a\"]}",
                "identifier": "a",
                "modified": shared.modified_date_list[0].toJSON()
              },
              "id": "{\"identifier\":[\"a\"]}",
              "method": "get",
              "result": "success",
              "status": 200,
              "statusText": "Ok"
            }, "Check storage content");
          });
        });
    }

    function putDifferentDocuments() {
      return all(jio_list.map(function (jio, i) {
        return jio.post({
          "identifier": "b",
          "modified": shared.modified_date_list[i]
        });
      }));
    }

    function getDocumentWithSynchronization() {
      return replicate_jio.get({"_id": "{\"identifier\":[\"b\"]}"});
    }

    function getDocumentWithSynchronizationTest(answer) {
      if (answer && answer.data) {
        ok(shared.modified_date_list.map(function (v) {
          return (v && v.toJSON()) || undefined;
        }).indexOf(answer.data.modified) !== -1, "Should be a known date");
        delete answer.data.modified;
      }
      deepEqual(answer, {
        "data": {
          "_id": "{\"identifier\":[\"b\"]}",
          "identifier": "b"
        },
        "id": "{\"identifier\":[\"b\"]}",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get document, pending synchronization.");

      // check storage state
      return sleep(1000).
        // synchronizing in background
        then(function () {
          return all(jio_list.map(function (jio) {
            return jio.get({"_id": "{\"identifier\":[\"b\"]}"});
          }));
        }).then(function (answers) {
          answers.forEach(function (answer) {
            deepEqual(answer, {
              "data": {
                "_id": "{\"identifier\":[\"b\"]}",
                "identifier": "b",
                "modified": shared.winner_modified_date.toJSON()
              },
              "id": "{\"identifier\":[\"b\"]}",
              "method": "get",
              "result": "success",
              "status": 200,
              "statusText": "Ok"
            }, "Check storage content");
          });
        });
    }

    function putOneDocument() {
      return jio_list[1].post({
        "identifier": "c",
        "modified": shared.modified_date_list[1]
      });
    }

    function getDocumentWith404Synchronization() {
      return replicate_jio.get({"_id": "{\"identifier\":[\"c\"]}"});
    }

    function getDocumentWith404SynchronizationTest(answer) {
      if (answer && answer.data) {
        ok(shared.modified_date_list.map(function (v) {
          return (v && v.toJSON()) || undefined;
        }).indexOf(answer.data.modified) !== -1, "Should be a known date");
        delete answer.data.modified;
      }
      deepEqual(answer, {
        "data": {
          "_id": "{\"identifier\":[\"c\"]}",
          "identifier": "c"
        },
        "id": "{\"identifier\":[\"c\"]}",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get document, synchronizing with not found document.");

      // check storage state
      return sleep(1000).
        // synchronizing in background
        then(function () {
          return all(jio_list.map(function (jio) {
            return jio.get({"_id": "{\"identifier\":[\"c\"]}"});
          }));
        }).then(function (answers) {
          answers.forEach(function (answer) {
            deepEqual(answer, {
              "data": {
                "_id": "{\"identifier\":[\"c\"]}",
                "identifier": "c",
                "modified": shared.winner_modified_date.toJSON()
              },
              "id": "{\"identifier\":[\"c\"]}",
              "method": "get",
              "result": "success",
              "status": 200,
              "statusText": "Ok"
            }, "Check storage content");
          });
        });
    }

    function putDifferentDocuments2() {
      return all(jio_list.map(function (jio, i) {
        return jio.post({
          "identifier": "d",
          "modified": shared.modified_date_list[i]
        });
      }));
    }

    function getDocumentWithUnavailableStorage() {
      setFakeStorage();
      setTimeout(function () {
        fake_storage.commands[
          "replicate scenario test for get method - 1/allDocs"
        ].error({"status": 0});
      }, 100);
      return replicate_jio.get({"_id": "{\"identifier\":[\"d\"]}"});
    }

    function getDocumentWithUnavailableStorageTest(answer) {
      if (answer && answer.data) {
        ok(shared.modified_date_list.map(function (v) {
          return (v && v.toJSON()) || undefined;
        }).indexOf(answer.data.modified) !== -1, "Should be a known date");
        delete answer.data.modified;
      }
      deepEqual(answer, {
        "data": {
          "_id": "{\"identifier\":[\"d\"]}",
          "identifier": "d"
        },
        "id": "{\"identifier\":[\"d\"]}",
        "method": "get",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Get document, synchronizing with unavailable storage.");

      unsetFakeStorage();
      // check storage state
      return sleep(1000).
        // synchronizing in background
        then(function () {
          return all(jio_list.map(function (jio) {
            return jio.get({"_id": "{\"identifier\":[\"d\"]}"});
          }));
        }).then(function (answers) {
          deepEqual(answers[0], {
            "data": {
              "_id": "{\"identifier\":[\"d\"]}",
              "identifier": "d",
              "modified": shared.modified_date_list[0].toJSON()
            },
            "id": "{\"identifier\":[\"d\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
          answers.slice(1).forEach(function (answer) {
            deepEqual(answer, {
              "data": {
                "_id": "{\"identifier\":[\"d\"]}",
                "identifier": "d",
                "modified": shared.winner_modified_date.toJSON()
              },
              "id": "{\"identifier\":[\"d\"]}",
              "method": "get",
              "result": "success",
              "status": 200,
              "statusText": "Ok"
            }, "Check storage content");
          });
        });
    }

    function unexpectedError(error) {
      if (error instanceof Error) {
        deepEqual([
          error.name + ": " + error.message,
          error
        ], "NO ERROR", "Unexpected error");
      } else {
        deepEqual(error, "NO ERROR", "Unexpected error");
      }
    }

    chain().
      // get without synchronizing anything
      then(putSimilarDocuments).
      then(getDocumentNothingToSynchronize).
      then(getDocumentNothingToSynchronizeTest).
      // get with synchronization
      then(putDifferentDocuments).
      then(getDocumentWithSynchronization).
      then(getDocumentWithSynchronizationTest).
      // get with 404 synchronization
      then(putOneDocument).
      then(getDocumentWith404Synchronization).
      then(getDocumentWith404SynchronizationTest).
      // XXX get with attachment synchronization
      // get with unavailable storage
      then(putDifferentDocuments2).
      then(getDocumentWithUnavailableStorage).
      then(getDocumentWithUnavailableStorageTest).
      // End of scenario
      then(null, unexpectedError).
      then(start, start);
  });

  test("Post + Put", function () {
    var shared = {}, i, jio_list, replicate_jio;

    // this test can work with at least 2 sub storages
    shared.gid_description = {
      "type": "gid",
      "constraints": {
        "default": {
          "identifier": "list"
        }
      },
      "sub_storage": null
    };

    shared.storage_description_list = [];
    for (i = 0; i < 4; i += 1) {
      shared.storage_description_list[i] = jsonClone(shared.gid_description);
      shared.storage_description_list[i].sub_storage = {
        "type": "local",
        "username": "replicate scenario test for post method - " + (i + 1),
        "mode": "memory"
      };
    }

    shared.replicate_storage_description = {
      "type": "replicate",
      "storage_list": shared.storage_description_list
    };

    shared.workspace = {};
    shared.jio_option = {
      "workspace": shared.workspace,
      "max_retry": 0
    };

    jio_list = shared.storage_description_list.map(function (description) {
      return jIO.createJIO(description, shared.jio_option);
    });
    replicate_jio = jIO.createJIO(
      shared.replicate_storage_description,
      shared.jio_option
    );

    stop();

    function setFakeStorage() {
      setFakeStorage.original = shared.storage_description_list[0].sub_storage;
      shared.storage_description_list[0].sub_storage = {
        "type": "fake",
        "id": "replicate scenario test for post method - 1"
      };
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function unsetFakeStorage() {
      shared.storage_description_list[0].sub_storage = setFakeStorage.original;
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function createDocument() {
      return replicate_jio.post({"identifier": "a"});
    }

    function createDocumentTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"a\"]}",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post document");

      return sleep(100);
    }

    function checkStorageContent() {
      // check storage state
      return all(jio_list.map(function (jio) {
        return jio.get({"_id": "{\"identifier\":[\"a\"]}"});
      })).then(function (answers) {
        answers.forEach(function (answer) {
          deepEqual(answer, {
            "data": {
              "_id": "{\"identifier\":[\"a\"]}",
              "identifier": "a"
            },
            "id": "{\"identifier\":[\"a\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
        });
      });
    }

    function updateDocument() {
      return replicate_jio.put({
        "_id": "{\"identifier\":[\"a\"]}",
        "identifier": "a",
        "title": "b"
      });
    }

    function updateDocumentTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"a\"]}",
        "method": "put",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Update document");

      return sleep(100);
    }

    function checkStorageContent3() {
      // check storage state
      return all(jio_list.map(function (jio) {
        return jio.get({"_id": "{\"identifier\":[\"a\"]}"});
      })).then(function (answers) {
        answers.forEach(function (answer) {
          deepEqual(answer, {
            "data": {
              "_id": "{\"identifier\":[\"a\"]}",
              "identifier": "a",
              "title": "b"
            },
            "id": "{\"identifier\":[\"a\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
        });
      });
    }

    function createDocumentWithUnavailableStorage() {
      setFakeStorage();
      setTimeout(function () {
        fake_storage.commands[
          "replicate scenario test for post method - 1/allDocs"
        ].error({"status": 0});
      }, 100);
      return replicate_jio.post({"identifier": "b"});
    }

    function createDocumentWithUnavailableStorageTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"b\"]}",
        "method": "post",
        "result": "success",
        "status": 201,
        "statusText": "Created"
      }, "Post document with unavailable storage");

      return sleep(100);
    }

    function checkStorageContent2() {
      unsetFakeStorage();
      // check storage state
      return all(jio_list.map(function (jio, i) {
        if (i === 0) {
          return reverse(jio.get({"_id": "{\"identifier\":[\"b\"]}"}));
        }
        return jio.get({"_id": "{\"identifier\":[\"b\"]}"});
      })).then(function (answers) {
        deepEqual(answers[0], {
          "error": "not_found",
          "id": "{\"identifier\":[\"b\"]}",
          "message": "Cannot get document",
          "method": "get",
          "reason": "missing",
          "result": "error",
          "status": 404,
          "statusText": "Not Found"
        }, "Check storage content");
        answers.slice(1).forEach(function (answer) {
          deepEqual(answer, {
            "data": {
              "_id": "{\"identifier\":[\"b\"]}",
              "identifier": "b"
            },
            "id": "{\"identifier\":[\"b\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
        });
      });
    }

    function unexpectedError(error) {
      if (error instanceof Error) {
        deepEqual([
          error.name + ": " + error.message,
          error
        ], "NO ERROR", "Unexpected error");
      } else {
        deepEqual(error, "NO ERROR", "Unexpected error");
      }
    }

    chain().
      // create a document
      then(createDocument).
      then(createDocumentTest).
      then(checkStorageContent).
      // update document
      then(updateDocument).
      then(updateDocumentTest).
      then(checkStorageContent3).
      // create a document with unavailable storage
      then(createDocumentWithUnavailableStorage).
      then(createDocumentWithUnavailableStorageTest).
      then(checkStorageContent2).
      // End of scenario
      then(null, unexpectedError).
      then(start, start);
  });

  test("Remove", function () {
    var shared = {}, i, jio_list, replicate_jio;

    // this test can work with at least 2 sub storages
    shared.gid_description = {
      "type": "gid",
      "constraints": {
        "default": {
          "identifier": "list"
        }
      },
      "sub_storage": null
    };

    shared.storage_description_list = [];
    for (i = 0; i < 4; i += 1) {
      shared.storage_description_list[i] = jsonClone(shared.gid_description);
      shared.storage_description_list[i].sub_storage = {
        "type": "local",
        "username": "replicate scenario test for remove method - " + (i + 1),
        "mode": "memory"
      };
    }

    shared.replicate_storage_description = {
      "type": "replicate",
      "storage_list": shared.storage_description_list
    };

    shared.workspace = {};
    shared.jio_option = {
      "workspace": shared.workspace,
      "max_retry": 0
    };

    jio_list = shared.storage_description_list.map(function (description) {
      return jIO.createJIO(description, shared.jio_option);
    });
    replicate_jio = jIO.createJIO(
      shared.replicate_storage_description,
      shared.jio_option
    );

    stop();

    function setFakeStorage() {
      setFakeStorage.original = shared.storage_description_list[0].sub_storage;
      shared.storage_description_list[0].sub_storage = {
        "type": "fake",
        "id": "replicate scenario test for remove method - 1"
      };
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function unsetFakeStorage() {
      shared.storage_description_list[0].sub_storage = setFakeStorage.original;
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function putSomeDocuments() {
      return all(jio_list.map(function (jio) {
        return jio.post({"identifier": "a"});
      }));
    }

    function removeDocument() {
      return replicate_jio.remove({"_id": "{\"identifier\":[\"a\"]}"});
    }

    function removeDocumentTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"a\"]}",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove document");

      return sleep(100);
    }

    function checkStorageContent() {
      // check storage state
      return all(jio_list.map(function (jio) {
        return reverse(jio.get({"_id": "{\"identifier\":[\"a\"]}"}));
      })).then(function (answers) {
        answers.forEach(function (answer) {
          deepEqual(answer, {
            "error": "not_found",
            "id": "{\"identifier\":[\"a\"]}",
            "message": "Cannot get document",
            "method": "get",
            "reason": "missing",
            "result": "error",
            "status": 404,
            "statusText": "Not Found"
          }, "Check storage content");
        });
      });
    }

    function putSomeDocuments2() {
      return all(jio_list.map(function (jio) {
        return jio.post({"identifier": "b"});
      }));
    }

    function removeDocumentWithUnavailableStorage() {
      setFakeStorage();
      setTimeout(function () {
        fake_storage.commands[
          "replicate scenario test for remove method - 1/allDocs"
        ].error({"status": 0});
      }, 100);
      return replicate_jio.remove({"_id": "{\"identifier\":[\"b\"]}"});
    }

    function removeDocumentWithUnavailableStorageTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"b\"]}",
        "method": "remove",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Remove document with unavailable storage");

      return sleep(100);
    }

    function checkStorageContent2() {
      unsetFakeStorage();
      // check storage state
      return all(jio_list.map(function (jio, i) {
        if (i === 0) {
          return jio.get({"_id": "{\"identifier\":[\"b\"]}"});
        }
        return reverse(jio.get({"_id": "{\"identifier\":[\"b\"]}"}));
      })).then(function (answers) {
        deepEqual(answers[0], {
          "data": {
            "_id": "{\"identifier\":[\"b\"]}",
            "identifier": "b"
          },
          "id": "{\"identifier\":[\"b\"]}",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, "Check storage content");
        answers.slice(1).forEach(function (answer) {
          deepEqual(answer, {
            "error": "not_found",
            "id": "{\"identifier\":[\"b\"]}",
            "message": "Cannot get document",
            "method": "get",
            "reason": "missing",
            "result": "error",
            "status": 404,
            "statusText": "Not Found"
          }, "Check storage content");
        });
      });
    }

    function unexpectedError(error) {
      if (error instanceof Error) {
        deepEqual([
          error.name + ": " + error.message,
          error
        ], "NO ERROR", "Unexpected error");
      } else {
        deepEqual(error, "NO ERROR", "Unexpected error");
      }
    }

    chain().
      // remove document
      then(putSomeDocuments).
      then(removeDocument).
      then(removeDocumentTest).
      then(checkStorageContent).
      // remove document with unavailable storage
      then(putSomeDocuments2).
      then(removeDocumentWithUnavailableStorage).
      then(removeDocumentWithUnavailableStorageTest).
      then(checkStorageContent2).
      // End of scenario
      then(null, unexpectedError).
      then(start, start);
  });

  test("AllDocs", function () {
    var shared = {}, i, jio_list, replicate_jio;

    // this test can work with at least 2 sub storages
    shared.gid_description = {
      "type": "gid",
      "constraints": {
        "default": {
          "identifier": "list"
        }
      },
      "sub_storage": null
    };

    shared.storage_description_list = [];
    for (i = 0; i < 2; i += 1) {
      shared.storage_description_list[i] = jsonClone(shared.gid_description);
      shared.storage_description_list[i].sub_storage = {
        "type": "local",
        "username": "replicate scenario test for allDocs method - " + (i + 1),
        "mode": "memory"
      };
    }

    shared.replicate_storage_description = {
      "type": "replicate",
      "storage_list": shared.storage_description_list
    };

    shared.workspace = {};
    shared.jio_option = {
      "workspace": shared.workspace,
      "max_retry": 0
    };

    jio_list = shared.storage_description_list.map(function (description) {
      return jIO.createJIO(description, shared.jio_option);
    });
    replicate_jio = jIO.createJIO(
      shared.replicate_storage_description,
      shared.jio_option
    );

    stop();

    shared.modified_date_list = [
      new Date("2000"),
      new Date("1995"),
      null,
      new Date("Invalid Date")
    ];

    function postSomeDocuments() {
      return all([
        jio_list[0].post({
          "identifier": "a",
          "modified": shared.modified_date_list[0]
        }),
        jio_list[0].post({
          "identifier": "b",
          "modified": shared.modified_date_list[1]
        }),
        jio_list[1].post({
          "identifier": "b",
          "modified": shared.modified_date_list[0]
        })
      ]);
    }

    function listDocuments() {
      return replicate_jio.allDocs({"include_docs": true});
    }

    function listDocumentsTest(answer) {
      answer.data.rows.sort(orderRowsById);
      deepEqual(answer, {
        "data": {
          "total_rows": 2,
          "rows": [
            {
              "id": "{\"identifier\":[\"a\"]}",
              "doc": {
                "_id": "{\"identifier\":[\"a\"]}",
                "identifier": "a",
                "modified": shared.modified_date_list[0].toJSON()
              },
              "value": {}
            },
            {
              "id": "{\"identifier\":[\"b\"]}",
              "doc": {
                "_id": "{\"identifier\":[\"b\"]}",
                "identifier": "b",
                "modified": shared.modified_date_list[1].toJSON()
                // there's no winner detection here
              },
              "value": {}
            }
          ]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Document list should be merged correctly");
    }

    function setFakeStorage() {
      shared.storage_description_list[0].sub_storage = {
        "type": "fake",
        "id": "replicate scenario test for allDocs method - 1"
      };
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function listDocumentsWithUnavailableStorage() {
      setTimeout(function () {
        fake_storage.commands[
          "replicate scenario test for allDocs method - 1/allDocs"
        ].error({"status": 0});
      }, 100);
      return replicate_jio.allDocs({"include_docs": true});
    }

    function listDocumentsWithUnavailableStorageTest(answer) {
      deepEqual(answer, {
        "data": {
          "total_rows": 1,
          "rows": [
            {
              "id": "{\"identifier\":[\"b\"]}",
              "doc": {
                "_id": "{\"identifier\":[\"b\"]}",
                "identifier": "b",
                "modified": shared.modified_date_list[0].toJSON()
              },
              "value": {}
            }
          ]
        },
        "method": "allDocs",
        "result": "success",
        "status": 200,
        "statusText": "Ok"
      }, "Document list with only one available storage");
    }

    function unexpectedError(error) {
      if (error instanceof Error) {
        deepEqual([
          error.name + ": " + error.message,
          error
        ], "NO ERROR", "Unexpected error");
      } else {
        deepEqual(error, "NO ERROR", "Unexpected error");
      }
    }

    chain().
      // list documents
      then(postSomeDocuments).
      then(listDocuments).
      then(listDocumentsTest).
      // set fake storage
      then(setFakeStorage).
      // list documents with unavailable storage
      then(listDocumentsWithUnavailableStorage).
      then(listDocumentsWithUnavailableStorageTest).
      // End of scenario
      then(null, unexpectedError).
      then(start);
  });

  test("Repair", function () {
    var shared = {}, i, jio_list, replicate_jio;

    // this test can work with at least 2 sub storages
    shared.gid_description = {
      "type": "gid",
      "constraints": {
        "default": {
          "identifier": "list"
        }
      },
      "sub_storage": null
    };

    shared.storage_description_list = [];
    for (i = 0; i < 4; i += 1) {
      shared.storage_description_list[i] = jsonClone(shared.gid_description);
      shared.storage_description_list[i].sub_storage = {
        "type": "local",
        "username": "replicate scenario test for repair method - " + (i + 1),
        "mode": "memory"
      };
    }

    shared.replicate_storage_description = {
      "type": "replicate",
      "storage_list": shared.storage_description_list
    };

    shared.workspace = {};
    shared.jio_option = {
      "workspace": shared.workspace,
      "max_retry": 0
    };

    jio_list = shared.storage_description_list.map(function (description) {
      return jIO.createJIO(description, shared.jio_option);
    });
    replicate_jio = jIO.createJIO(
      shared.replicate_storage_description,
      shared.jio_option
    );

    stop();

    shared.modified_date_list = [
      new Date("1995"),
      new Date("2000"),
      null,
      new Date("Invalid Date")
    ];
    shared.winner_modified_date = shared.modified_date_list[1];

    function setFakeStorage() {
      setFakeStorage.original = shared.storage_description_list[0].sub_storage;
      shared.storage_description_list[0].sub_storage = {
        "type": "fake",
        "id": "replicate scenario test for repair method - 1"
      };
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function unsetFakeStorage() {
      shared.storage_description_list[0].sub_storage = setFakeStorage.original;
      jio_list[0] = jIO.createJIO(
        shared.storage_description_list[0],
        shared.jio_option
      );
      replicate_jio = jIO.createJIO(
        shared.replicate_storage_description,
        shared.jio_option
      );
    }

    function putSimilarDocuments() {
      return all(jio_list.map(function (jio) {
        return jio.post({
          "identifier": "a",
          "modified": shared.modified_date_list[0]
        });
      }));
    }

    function repairDocumentNothingToSynchronize() {
      return replicate_jio.repair({"_id": "{\"identifier\":[\"a\"]}"});
    }

    function repairDocumentNothingToSynchronizeTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"a\"]}",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document, nothing to synchronize.");

      // check storage state
      return all(jio_list.map(function (jio) {
        return jio.get({"_id": "{\"identifier\":[\"a\"]}"});
      })).then(function (answers) {
        answers.forEach(function (answer) {
          deepEqual(answer, {
            "data": {
              "_id": "{\"identifier\":[\"a\"]}",
              "identifier": "a",
              "modified": shared.modified_date_list[0].toJSON()
            },
            "id": "{\"identifier\":[\"a\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
        });
      });
    }

    function putDifferentDocuments() {
      return all(jio_list.map(function (jio, i) {
        return jio.post({
          "identifier": "b",
          "modified": shared.modified_date_list[i]
        });
      }));
    }

    function repairDocumentWithSynchronization() {
      return replicate_jio.repair({"_id": "{\"identifier\":[\"b\"]}"});
    }

    function repairDocumentWithSynchronizationTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"b\"]}",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document, synchronization should be done.");

      // check storage state
      return all(jio_list.map(function (jio) {
        return jio.get({"_id": "{\"identifier\":[\"b\"]}"});
      })).then(function (answers) {
        answers.forEach(function (answer) {
          deepEqual(answer, {
            "data": {
              "_id": "{\"identifier\":[\"b\"]}",
              "identifier": "b",
              "modified": shared.winner_modified_date.toJSON()
            },
            "id": "{\"identifier\":[\"b\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
        });
      });
    }

    function putOneDocument() {
      return jio_list[1].post({
        "identifier": "c",
        "modified": shared.modified_date_list[1]
      });
    }

    function repairDocumentWith404Synchronization() {
      return replicate_jio.repair({"_id": "{\"identifier\":[\"c\"]}"});
    }

    function repairDocumentWith404SynchronizationTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"c\"]}",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document, synchronizing with not found document.");

      // check storage state
      return all(jio_list.map(function (jio) {
        return jio.get({"_id": "{\"identifier\":[\"c\"]}"});
      })).then(function (answers) {
        answers.forEach(function (answer) {
          deepEqual(answer, {
            "data": {
              "_id": "{\"identifier\":[\"c\"]}",
              "identifier": "c",
              "modified": shared.winner_modified_date.toJSON()
            },
            "id": "{\"identifier\":[\"c\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
        });
      });
    }

    function putDifferentDocuments2() {
      return all(jio_list.map(function (jio, i) {
        return jio.post({
          "identifier": "d",
          "modified": shared.modified_date_list[i]
        });
      }));
    }

    function repairDocumentWithUnavailableStorage() {
      setFakeStorage();
      setTimeout(function () {
        fake_storage.commands[
          "replicate scenario test for repair method - 1/allDocs"
        ].error({"status": 0});
      }, 250);
      setTimeout(function () {
        fake_storage.commands[
          "replicate scenario test for repair method - 1/allDocs"
        ].error({"status": 0});
      }, 500);
      return replicate_jio.repair({"_id": "{\"identifier\":[\"d\"]}"});
    }

    function repairDocumentWithUnavailableStorageTest(answer) {
      deepEqual(answer, {
        "id": "{\"identifier\":[\"d\"]}",
        "method": "repair",
        "result": "success",
        "status": 204,
        "statusText": "No Content"
      }, "Repair document, synchronizing with unavailable storage.");

      unsetFakeStorage();
      // check storage state
      return all(jio_list.map(function (jio) {
        return jio.get({"_id": "{\"identifier\":[\"d\"]}"});
      })).then(function (answers) {
        deepEqual(answers[0], {
          "data": {
            "_id": "{\"identifier\":[\"d\"]}",
            "identifier": "d",
            "modified": shared.modified_date_list[0].toJSON()
          },
          "id": "{\"identifier\":[\"d\"]}",
          "method": "get",
          "result": "success",
          "status": 200,
          "statusText": "Ok"
        }, "Check storage content");
        answers.slice(1).forEach(function (answer) {
          deepEqual(answer, {
            "data": {
              "_id": "{\"identifier\":[\"d\"]}",
              "identifier": "d",
              "modified": shared.winner_modified_date.toJSON()
            },
            "id": "{\"identifier\":[\"d\"]}",
            "method": "get",
            "result": "success",
            "status": 200,
            "statusText": "Ok"
          }, "Check storage content");
        });
      });
    }

    function unexpectedError(error) {
      if (error instanceof Error) {
        deepEqual([
          error.name + ": " + error.message,
          error
        ], "NO ERROR", "Unexpected error");
      } else {
        deepEqual(error, "NO ERROR", "Unexpected error");
      }
    }

    chain().
      // get without synchronizing anything
      then(putSimilarDocuments).
      then(repairDocumentNothingToSynchronize).
      then(repairDocumentNothingToSynchronizeTest).
      // repair with synchronization
      then(putDifferentDocuments).
      then(repairDocumentWithSynchronization).
      then(repairDocumentWithSynchronizationTest).
      // repair with 404 synchronization
      then(putOneDocument).
      then(repairDocumentWith404Synchronization).
      then(repairDocumentWith404SynchronizationTest).
      // XXX repair with attachment synchronization
      // repair with unavailable storage
      then(putDifferentDocuments2).
      then(repairDocumentWithUnavailableStorage).
      then(repairDocumentWithUnavailableStorageTest).
      // End of scenario
      then(null, unexpectedError).
      then(start, start);
  });

}));
