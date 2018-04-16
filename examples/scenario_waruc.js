/*global Blob, console, indexedDB*/
/*jslint nomen: true, maxlen: 80*/
(function (QUnit, jIO) {
  "use strict";
  var test = QUnit.test,
    expect = QUnit.expect,
    ok = QUnit.ok,
    stop = QUnit.stop,
    start = QUnit.start,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module,
    i,
    name_list = ['get', 'post', 'put', 'buildQuery', 'remove'];


  ///////////////////////////////////////////////////////
  // Fake Storage
  ///////////////////////////////////////////////////////
  function resetCount(count) {
    for (i = 0; i < name_list.length; i += 1) {
      count[name_list[i]] = 0;
    }
  }

  function MockStorage(spec) {
    this._erp5_storage = jIO.createJIO({
      type: "erp5",
      url: "http://example.org"
    });
    this._sub_storage = jIO.createJIO({
      type: "query",
      sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });
    this._options = spec.options;
    resetCount(spec.options.count);
  }

  function mockFunction(name) {
    MockStorage.prototype[name] = function () {
      this._options.count[name] += 1;
      if (this._options.mock.hasOwnProperty(name)) {
        return this._options.mock[name].apply(this, arguments);
      }
      return this._sub_storage[name].apply(this._sub_storage, arguments);
    };
  }

  for (i = 0; i < name_list.length; i += 1) {
    mockFunction(name_list[i]);
  }

  MockStorage.prototype.hasCapacity = function (name) {
    return this._erp5_storage.hasCapacity(name);
  };

  jIO.addStorage('mock', MockStorage);

  ///////////////////////////////////////////////////////
  // Helpers
  ///////////////////////////////////////////////////////
  function putFullDoc(storage, id, doc) {
    return storage.__storage._sub_storage.put(id, doc);
  }

  function equalStorage(storage, doc_tuple_list) {
    return storage.__storage._sub_storage.allDocs()
      .push(function (result) {
        var i,
          promise_list = [];
        for (i = 0; i < result.data.rows.length; i += 1) {
          promise_list.push(RSVP.all([
            storage.__storage._sub_storage.get(result.data.rows[i].id)
          ]));
        }
        return RSVP.all(promise_list);
      })
      .push(function (result) {
        deepEqual(result, doc_tuple_list, 'Storage content');
      });
  }

  ///////////////////////////////////////////////////////
  // Module
  ///////////////////////////////////////////////////////
  module("scenario_waruc", {
    setup: function () {
      this.cam_mock_options = {
        mock: {
          remove: function (doc) {
            return this._sub_storage.remove(doc);
            //throw new Error('remove not supported');
          },
          post: function (doc) {
            console.log("cam.POST", doc);
            var context = this;
            return this._sub_storage.post(doc)
              .push(function (post_id) {
                context._options.last_post_id = post_id;
                return post_id;
              });
          },
          put: function (id, doc) {
            console.log("cam.PUT", id, doc);
            var context = this;
            return this._sub_storage.put(id, doc)
              .push(function (post_id) {
                context._options.last_post_id = post_id;
                return post_id;
              });
          }
        },
        count: {}
      };
      this.clearroad_mock_options = {
        mock: {
          remove: function (doc) {
            return this._sub_storage.remove(doc);
          },
          post: function (doc) {
            console.log("clearroad.POST", doc);
            var context = this;
            return this._sub_storage.post(doc)
              .push(function (post_id) {
                context._options.last_post_id = post_id;
                return post_id;
              });
          }
        },
        count: {}
      };
      var DATABASE = "waruc",
//        clearroad_odo_query = 'validation_state:"validated"',
//        am_txn_query = 'simulation_state:"delivered"',
        am_account_query = 'validation_state:("validated" OR "invalidated"' +
          ' OR "discontinued")';
      this.jio_toll_account = jIO.createJIO({
        type: "replicate",
        parallel_operation_amount: 10,
        use_remote_post: false,
        conflict_handling: 1,
        signature_hash_key: 'source_reference',
        signature_sub_storage: {
          type: "query",
          sub_storage: {
            type: "indexeddb",
            database: DATABASE + "-signatures"
          }
        },
        check_local_modification: false,
        check_local_creation: true, // we want to get toll account from ERP5 AM
        check_local_deletion: false,
        check_remote_modification: false,
        check_remote_creation: false,
        check_remote_deletion: false,
        query: {
          limit: [0, 12345667890]
        },
        local_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" : ["equalValue", "Toll Account"]},
          query: {
            query : am_account_query
          },
          sub_storage: {
            type: "mock",
            options: this.cam_mock_options
          }
        },
        remote_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" :
                     ["equalValue", "Road Account Message"],
                     "parent_relative_url" :
                     ["equalValue", "road_account_message_module"]
                    },
          sub_storage: {
            type: "mock",
            options: this.clearroad_mock_options
          }
        }

      });

      this.jio_road_event = jIO.createJIO({
        type: "replicate",
        parallel_operation_amount: 10,
        use_remote_post: false,
        conflict_handling: 1,
        signature_hash_key: 'source_reference',
        signature_sub_storage: {
          type: "query",
          sub_storage: {
            type: "indexeddb",
            database: DATABASE + "-signatures"
          }
        },
        query: {
          limit: [0, 1234567890]
        },
        check_local_modification: false,
        check_local_creation: true,
        check_local_deletion: false,
        check_remote_modification: false,
        check_remote_creation: false,
        check_remote_deletion: false,
        local_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" : ["equalValue", "Road Event"]},
          sub_storage: {
            type: "mock",
            options: this.clearroad_mock_options
          }
        },
        remote_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" : ["equalValue", "Road Event Message"],
                     "parent_relative_url" :
                     ["equalValue", "road_event_message_module"]
                    },
          sub_storage: {
            type: "mock",
            options: this.cam_mock_options
          }
        }
      });
      // Sync Road Transactions from Clearroad to AM
      this.jio_road_transaction = jIO.createJIO({
        type: "replicate",
        parallel_operation_amount: 1,
        use_remote_post: false,
        conflict_handling: 1,
        signature_hash_key: 'source_reference',
        signature_sub_storage: {
          type: "query",
          sub_storage: {
            type: "indexeddb",
            database: DATABASE + "-signatures"
          }
        },
        query: {
          limit: [0, 1234567890]
        },
        check_local_modification: false,
        check_local_creation: true,
        check_local_deletion: false,
        check_remote_modification: false,
        check_remote_creation: false,
        check_remote_deletion: false,
        local_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" : ["equalValue", "Road Transaction"]},
          sub_storage: {
            type: "mock",
            options: this.clearroad_mock_options
          }
        },
        remote_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" : ["equalValue", "Road Transaction Message"],
                     "parent_relative_url" :
                     ["equalValue", "road_transaction_message_module"]
                    },
          sub_storage: {
            type: "mock",
            options: this.cam_mock_options
          }
        }
      });

      // Sync Odometer Readings from Clearroad to AM
      this.jio_odometer_reading = jIO.createJIO({
        type: "replicate",
        parallel_operation_amount: 1,
        use_remote_post: false,
        conflict_handling: 1,
        signature_hash_key: 'source_reference',
        signature_sub_storage: {
          type: "query",
          sub_storage: {
            type: "indexeddb",
            database: DATABASE + "-signatures"
          }
        },
        query: {
          limit: [0, 1234567890]
        },
        check_local_modification: false,
        check_local_creation: true,
        check_local_deletion: false,
        check_remote_modification: false,
        check_remote_creation: false,
        check_remote_deletion: false,
        local_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" : ["equalValue", "Odometer Reading"]},
          sub_storage: {
            type: "mock",
            options: this.clearroad_mock_options
          }
        },
        remote_sub_storage: {
          type: "mapping",
          id: ["equalSubProperty", "source_reference"],
          property: {"portal_type" : ["equalValue", "Odometer Reading Message"],
                     "parent_relative_url" :
                     ["equalValue", "odometer_reading_message_module"]
                    },
          sub_storage: {
            type: "mock",
            options: this.cam_mock_options
          }
        }
      });
    }
  });

  ///////////////////////////////////////////////////////
  // Tests
  ///////////////////////////////////////////////////////

  // Test sync of Toll Accounts from CAM into Road Account Message on Clearroad
  test("one toll account synced into one road account message", function () {
    expect(1);
    stop();
    indexedDB.deleteDatabase("jio:waruc-signatures");
    var test = this,
      expected_doc = {},
      doc_id = 'toll_account_module/1',
      doc = {portal_type: "Toll Account",
             source_reference: 'a', validation_state: 'validated',
             account_manager: "warucem", vehicle_reference: "VINTEST",
             parent_relative_url: "toll_account_module"},
      new_doc = {portal_type: "Road Account Message",
                   parent_relative_url: "road_account_message_module"
                  };

    putFullDoc(this.jio_toll_account.__storage._local_sub_storage, doc_id, doc)
      .then(function () {
        console.log("repair1");
        return test.jio_toll_account.repair();
      })
      .then(function () {
        expected_doc =  Object.assign({}, doc, new_doc);
        return RSVP.all([
          equalStorage(test.jio_toll_account.__storage._remote_sub_storage,
                       [[expected_doc]])
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("draft toll account not synced", function () {
    expect(1);
    stop();
    indexedDB.deleteDatabase("jio:waruc-signatures");
    var test = this,
      doc_id = 'toll_account_module/1',
      doc = {portal_type: "Toll Account",
             source_reference: 'a', validation_state: 'draft',
             account_manager: "warucem", vehicle_reference: "VINTEST",
             parent_relative_url: "toll_account_module"};

    putFullDoc(this.jio_toll_account.__storage._local_sub_storage, doc_id, doc)
      .then(function () {
        console.log("repair1");
        return test.jio_toll_account.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio_toll_account.__storage._remote_sub_storage,
                       [])
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("same toll account modified get synced into a new message", function () {
    expect(1);
    stop();
    indexedDB.deleteDatabase("jio:waruc-signatures");
    var test = this,
      expected_doc1 = {},
      expected_doc2 = {},
      doc_id = 'toll_account_module/1',
      doc1 = {portal_type: "Toll Account",
             source_reference: 'a', validation_state: 'validated',
             account_manager: "warucem", vehicle_reference: "VINTEST",
             parent_relative_url: "toll_account_module"},
      doc2 = {portal_type: "Toll Account",
             source_reference: 'b', validation_state: 'invalidated',
             account_manager: "warucem", vehicle_reference: "VINTEST",
             parent_relative_url: "toll_account_module"},
      new_doc = {portal_type: "Road Account Message",
                   parent_relative_url: "road_account_message_module"
                  };

    putFullDoc(this.jio_toll_account.__storage._local_sub_storage, doc_id, doc1)
      .then(function () {
        console.log("repair1");
        return test.jio_toll_account.repair();
      })
      .then(function () {
        // simulate the toll account being modified on CAM side
        return putFullDoc(test.jio_toll_account.__storage._local_sub_storage,
                   doc_id, doc2);
      })
      .then(function () {
        console.log("repair2");
        return test.jio_toll_account.repair();
      })
      .then(function () {
        expected_doc1 =  Object.assign({}, doc1, new_doc);
        expected_doc2 =  Object.assign({}, doc2, new_doc);
        return RSVP.all([
          equalStorage(test.jio_toll_account.__storage._remote_sub_storage,
                       [[expected_doc1], [expected_doc2]])
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("toll account deletion is not propagated", function () {
    expect(1);
    stop();
    indexedDB.deleteDatabase("jio:waruc-signatures");
    var test = this,
      expected_doc1 = {},
      doc_id = 'toll_account_module/1',
      doc1 = {portal_type: "Toll Account",
             source_reference: 'a', validation_state: 'validated',
             account_manager: "warucem", vehicle_reference: "VINTEST",
             parent_relative_url: "toll_account_module"},
      new_doc = {portal_type: "Road Account Message",
                   parent_relative_url: "road_account_message_module"
                  };

    putFullDoc(this.jio_toll_account.__storage._local_sub_storage, doc_id, doc1)
      .then(function () {
        console.log("repair1");
        return test.jio_toll_account.repair();
      })
      .then(function () {
        // simulate the deletion of the toll account
        return RSVP.all([
          test.jio_toll_account.__storage.
            _local_sub_storage.__storage._sub_storage.remove(doc_id)

          //test.jio_toll_account.__storage._local_sub_storage.remove(doc1)
        ]);
      })
      .then(function () {
        console.log("repair2");
        return test.jio_toll_account.repair();
      })
      .then(function () {
        expected_doc1 =  Object.assign({}, doc1, new_doc);
        return RSVP.all([
          equalStorage(test.jio_toll_account.__storage._remote_sub_storage,
                       [[expected_doc1]])
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  // Test sync of Road Event from Clearroad into road road event message in CAM
  test("one road event synced into one road event message", function () {
    expect(1);
    stop();
    indexedDB.deleteDatabase("jio:waruc-signatures");
    var test = this,
      expected_doc = {},
      doc_id = 'road_event_module/1',
      doc = {portal_type: "Road Event",
               source_reference: 're', state: 'acknowledged',
               event_type: "EVENT_MRD_5", vehicle_reference: "VINTEST2",
               parent_relative_url: "road_event_module"},
      new_doc = {portal_type: "Road Event Message",
                   parent_relative_url: "road_event_message_module"
                  };

    putFullDoc(this.jio_road_event.__storage._local_sub_storage, doc_id, doc)
      .then(function () {
        console.log("repair1");
        return test.jio_road_event.repair();
      })
      .then(function () {
        expected_doc =  Object.assign({}, doc, new_doc);
        return RSVP.all([
          equalStorage(test.jio_road_event.__storage._remote_sub_storage,
                       [[expected_doc]])
        ]);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  // Test sync of Odometer Reading from Clearroad into odometer reading
  // message in CAM
  test("one odometer reading synced into one odometer reading message",
    function () {
      expect(1);
      stop();
      indexedDB.deleteDatabase("jio:waruc-signatures");
      var test = this,
        expected_doc = {},
        doc_id = 'odometer_reading_module/1',
        doc = {portal_type: "Odometer Reading",
                 source_reference: 'ore', quantity: '5100',
                 reading_date: "2018-03-10T00:31:00Z",
                 vehicle_reference: "VINTEST2",
                 parent_relative_url: "odometer_reading_module"},
        new_doc = {portal_type: "Odometer Reading Message",
                     parent_relative_url: "odometer_reading_message_module"
                    };

      putFullDoc(this.jio_odometer_reading.__storage._local_sub_storage,
                 doc_id, doc)
        .then(function () {
          console.log("repair1");
          return test.jio_odometer_reading.repair();
        })
        .then(function () {
          expected_doc =  Object.assign({}, doc, new_doc);
          return RSVP.all([
            equalStorage(
              test.jio_odometer_reading.__storage._remote_sub_storage,
              [[expected_doc]]
            )
          ]);
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  // Test sync of Road Transaction from Clearroad into road
  // transaction message in CAM
  test("one road transaction synced into one road transaction message",
    function () {
      expect(1);
      stop();
      indexedDB.deleteDatabase("jio:waruc-signatures");
      var test = this,
        expected_doc = {},
        doc_id = 'road_transaction_module/1',
        doc = {portal_type: "Road Transaction",
                 source_reference: 'rt', state: 'delivered',
                 transaction_type: "MRP", vehicle_reference: "VINTEST3",
                 parent_relative_url: "road_transaction_module"},
        new_doc = {portal_type: "Road Transaction Message",
                     parent_relative_url: "road_transaction_message_module"
                    };

      putFullDoc(this.jio_road_transaction.__storage._local_sub_storage,
                 doc_id, doc)
        .then(function () {
          console.log("repair1");
          return test.jio_road_transaction.repair();
        })
        .then(function () {
          expected_doc =  Object.assign({}, doc, new_doc);
          return RSVP.all([
            equalStorage(
              test.jio_road_transaction.__storage._remote_sub_storage,
              [[expected_doc]]
            )
          ]);
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("one road transaction rejected synced then delivered",
    function () {
      expect(1);
      stop();
      indexedDB.deleteDatabase("jio:waruc-signatures");
      var test = this,
        expected_doc = {},
        doc_id = 'road_transaction_module/1',
        doc1 = {portal_type: "Road Transaction",
                 source_reference: 'rt', state: 'rejected',
                 transaction_type: "MRP", vehicle_reference: "VINTEST3",
                 parent_relative_url: "road_transaction_module"},
        doc2 = {portal_type: "Road Transaction",
                 source_reference: 'rt', state: 'delivered',
                 transaction_type: "MRP", vehicle_reference: "VINTEST3",
                 parent_relative_url: "road_transaction_module"},
        new_doc = {portal_type: "Road Transaction Message",
                     parent_relative_url: "road_transaction_message_module"
                    };

      putFullDoc(this.jio_road_transaction.__storage._local_sub_storage,
                 doc_id, doc1)
        .then(function () {
          console.log("repair1");
          return test.jio_road_transaction.repair();
        })
        .then(function () {
          // simulate the deletion of the toll account
          return test.jio_toll_account.__storage.
            _local_sub_storage.__storage._sub_storage.remove(doc_id);
        })
        .then(function () {
          // simulate the toll account being modified on CAM side
          return putFullDoc(test.jio_toll_account.__storage._local_sub_storage,
                            doc_id, doc2);
        })
        .then(function () {
          console.log("repair1");
          return test.jio_road_transaction.repair();
        })
        .then(function () {
          expected_doc =  Object.assign({}, doc1, new_doc);
          return RSVP.all([
            equalStorage(
              test.jio_road_transaction.__storage._remote_sub_storage,
              [[expected_doc]]
            )
          ]);
        })
        .fail(function (error) {
          ok(false, error);
        })
        .always(function () {
          start();
        });
    });

}(QUnit, jIO, Blob));
