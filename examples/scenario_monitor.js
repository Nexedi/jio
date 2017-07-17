/*global Blob, Rusha, console*/
/*jslint nomen: true, maxlen: 80*/
(function (QUnit, jIO, Blob, Rusha, console) {
  "use strict";
  var test = QUnit.test,
    // equal = QUnit.equal,
    expect = QUnit.expect,
    ok = QUnit.ok,
    stop = QUnit.stop,
    start = QUnit.start,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module,
    rusha = new Rusha(),
    i,
    name_list = ['get', 'put', 'remove', 'buildQuery',
                  'putAttachment', 'getAttachment', 'allAttachments'];

  ///////////////////////////////////////////////////////
  // Fake Storage
  ///////////////////////////////////////////////////////
  function resetCount(count) {
    for (i = 0; i < name_list.length; i += 1) {
      count[name_list[i]] = 0;
    }
  }

  function RSSMockStorage(spec) {
    this._rss_storage = jIO.createJIO({
      type: "rss",
      url: "http://example.com/rss.xml"
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

  RSSMockStorage.prototype.hasCapacity = function (name) {
    return this._rss_storage.hasCapacity(name);
  };

  function WEBMockStorage(spec) {
    this._web_storage = jIO.createJIO({
      type: "webhttp",
      url: "http://example.com/private/"
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

  WEBMockStorage.prototype.hasCapacity = function (name) {
    return this._web_storage.hasCapacity(name);
  };

  function OPMLMockStorage(spec) {
    this._opml_storage = jIO.createJIO({
      type: "opml",
      url: "http://example.com/opml.xml"
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

  OPMLMockStorage.prototype.hasCapacity = function (name) {
    return this._opml_storage.hasCapacity(name);
  };

  function mockFunction(name) {
    WEBMockStorage.prototype[name] = function () {
      this._options.count[name] += 1;
      if (this._options.mock.hasOwnProperty(name)) {
        return this._options.mock[name].apply(this, arguments);
      }
      return this._sub_storage[name].apply(this._sub_storage, arguments);
    };
    RSSMockStorage.prototype[name] = function () {
      this._options.count[name] += 1;
      if (this._options.mock.hasOwnProperty(name)) {
        return this._options.mock[name].apply(this, arguments);
      }
      return this._sub_storage[name].apply(this._sub_storage, arguments);
    };
    OPMLMockStorage.prototype[name] = function () {
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

  jIO.addStorage('opmlmock', OPMLMockStorage);
  jIO.addStorage('rssmock', RSSMockStorage);
  jIO.addStorage('webmock', WEBMockStorage);

  ///////////////////////////////////////////////////////
  // Helpers
  ///////////////////////////////////////////////////////
  function generateHash(str) {
    return rusha.digestFromString(str);
  }
  function putFullDoc(storage, id, doc) {
    return storage.put(id, doc);
  }

  function equalStorage(storage, doc_tuple_list) {
    return storage.allDocs({include_docs: true})
      .push(function (result) {
        var i,
          promise_list = [];
        for (i = 0; i < result.data.rows.length; i += 1) {
          promise_list.push(RSVP.all([
            result.data.rows[i].id,
            storage.get(result.data.rows[i].id),
            storage.getAttachment(result.data.rows[i].id,
                                  result.data.rows[i].doc.name)
          ]));
        }
        return RSVP.all(promise_list);
      })
      .push(function (result) {
        deepEqual(result, doc_tuple_list, 'Storage content');
      });
  }

  function isEmptyStorage(storage) {
    return equalStorage(storage, []);
  }

  function equalsubStorageCallCount(mock_count, expected_count) {
    for (i = 0; i < name_list.length; i += 1) {
      if (!expected_count.hasOwnProperty(name_list[i])
          && mock_count.hasOwnProperty(name_list[i])) {
        expected_count[name_list[i]] = 0;
      }
    }
    deepEqual(mock_count, expected_count, 'Expected method call count');
  }

  function getOpmlElement(doc, doc_id, url) {
    var element,
      id,
      parent_id;

    parent_id = generateHash(url);
    id = generateHash(parent_id + doc_id);
    element = {
      name: doc_id,
      opml_title: doc.opml_title,
      parent_id: parent_id,
      reference: id,
      creation_date: doc.created_date,
      title: doc.title,
      type: "opml-item",
      url: url
    };
    return {
      id: id,
      doc: element
    };
  }

  function getSubOpmlElement(doc, doc_id, opml_doc, url, type) {
    var id = generateHash(opml_doc.reference + url + doc_id);
    return {
      id: id,
      doc: {
        name: doc_id,
        opml_title: opml_doc.opml_title,
        parent_title: opml_doc.title,
        parent_id: opml_doc.reference,
        reference: id,
        title: doc.title,
        type: doc.type || type + "-item",
        url: url,
        status: doc.status,
        creation_date: doc.date
      }
    };
  }
  ///////////////////////////////////////////////////////
  // Module
  ///////////////////////////////////////////////////////
  module("scenario_monitor", {
    setup: function () {

      this.rss_mock_options = {
        mock: {
          remove: function () {
            throw new Error('remove not supported');
          },
          removehas_include_docs: function () {
            throw new Error('removeAttachment not supported');
          },
          allAttachments: function () {
            return {data: null};
          },
          putAttachment: function () {
            throw new Error('putAttachment not supported');
          }
        },
        count: {}
      };
      this.opml_mock_options = JSON.parse(
        JSON.stringify(this.rss_mock_options)
      );
      this.web_mock_options = {
        mock: {
          remove: function () {
            throw new Error('remove not supported');
          },
          removeAttachment: function () {
            throw new Error('removeAttachment not supported');
          },
          allAttachments: function () {
            return {data: null};
          },
          putAttachment: function () {
            throw new Error('putAttachment not supported');
          }
        },
        count: {}
      };
      this.sub_opml_storage = {
        type: "opmlmock",
        options: this.opml_mock_options,
        url: "http://example.com/opml.xml",
        sub_storage_list: [
          {
            type: "rssmock",
            url: "http://example.com/rss.xml",
            has_include_docs: true,
            options: this.rss_mock_options
          },
          {
            type: "webmock",
            url: "http://example.com/data/",
            has_include_docs: true,
            options: this.web_mock_options
          }
        ],
        basic_login: "YWRtaW46endfEzrJUZGw="
      };
      this.jio = jIO.createJIO({
        type: "replicatedopml",
        opml_storage_list: [
          this.sub_opml_storage
        ],
        local_sub_storage: {
          type: "query",
          sub_storage: {
            type: "uuid",
            sub_storage: {
              type: "memory"
            }
          }
        }
      });
    }
  });

  ///////////////////////////////////////////////////////
  // Do nothing cases
  ///////////////////////////////////////////////////////
  test("empty: nothing to do", function () {
    expect(4);
    stop();

    var test = this;

    this.jio.repair()
      .then(function () {
        return RSVP.all([
          isEmptyStorage(test.jio),
          equalsubStorageCallCount(
            test.opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.rss_mock_options.count,
            {}
          ),
          equalsubStorageCallCount(
            test.web_mock_options.count,
            {}
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

  ///////////////////////////////////////////////////////
  // sync done (XXX - to finish)
  ///////////////////////////////////////////////////////
  test("allready synced: nothing to do", function () {
    expect(2);
    stop();

    var test = this,
      key,
      doc_id = 'opml_foo',
      doc = {
        title: "opml item foo",
        url: "http://example.com/rss.xml",
        modified_date: "aftttt",
        created_date: "adddb",
        opml_title: "opml foo"
      },
      blob = new Blob([JSON.stringify(doc)]);

    // initialise this storage here so we can put data
    key = generateHash("http://example.com/opml.xml");
    this.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
      type: "opmlmock",
      options: this.opml_mock_options
    });
    putFullDoc(this.jio.__storage._remote_storage_dict[key], doc_id, doc)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        resetCount(test.opml_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        var storage_doc = getOpmlElement(doc,
                                         doc_id,
                                         test.sub_opml_storage.url);
        return RSVP.all([
          equalStorage(test.jio, [[storage_doc.id, storage_doc.doc, blob]]),
          equalsubStorageCallCount(
            test.opml_mock_options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // complete sync - one opml, 2 sub storages
  ///////////////////////////////////////////////////////
  test("complete storage sync", function () {
    expect(4);
    stop();

    var test = this,
      key,
      doc_id = 'opml_foo',
      doc = {
        title: "opml item foo",
        url: "http://example.com/rss.xml",
        modified_date: "aftttt",
        created_date: "adddb",
        opml_title: "opml foo"
      },
      blob = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        description: "This is an example of an Item",
        guid: "1102345",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        reference: "This is an example of an RSS feed",
        siteTitle: "RSS Example",
        title: "Item Example",
        status: "OK"
      },
      rss_blob = new Blob([JSON.stringify(rss_doc)]),
      json_id = "promise_runner.status",
      json_doc = {
        title: "promise fooo",
        status: "ERROR",
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        type: "promise",
        foo_p: "fooo parameter",
        bar_p: "bar parameter"
      },
      json_blob = new Blob([JSON.stringify(json_doc)]),
      opml_gen,
      rss_gen,
      json_gen;

    opml_gen = getOpmlElement(doc, doc_id, test.sub_opml_storage.url);
    rss_gen = getSubOpmlElement(
      rss_doc,
      rss_id,
      opml_gen.doc,
      test.sub_opml_storage.sub_storage_list[0].url,
      "rssmock"
    );
    json_gen = getSubOpmlElement(
      json_doc,
      json_id,
      opml_gen.doc,
      test.sub_opml_storage.sub_storage_list[1].url,
      "webmock"
    );

    // initialise this storage here so we can put data
    key = generateHash(test.sub_opml_storage.url);
    this.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
      type: "opmlmock",
      options: this.opml_mock_options
    });

    putFullDoc(this.jio.__storage._remote_storage_dict[key], doc_id, doc)
      .then(function () {
        // put rss doc
        key = generateHash(opml_gen.doc.reference +
                           test.sub_opml_storage.sub_storage_list[0].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "rssmock",
          options: test.rss_mock_options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          rss_id, rss_doc);
      })
      .then(function () {
        // put json doc
        key = generateHash(opml_gen.doc.reference +
                           test.sub_opml_storage.sub_storage_list[1].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "webmock",
          options: test.web_mock_options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          json_id, json_doc);
      })
      .then(function () {
        resetCount(test.opml_mock_options.count);
        resetCount(test.rss_mock_options.count);
        resetCount(test.web_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_gen.id, opml_gen.doc, blob],
                                  [rss_gen.id, rss_gen.doc, rss_blob],
                                  [json_gen.id, json_gen.doc, json_blob]]),
          equalsubStorageCallCount(
            test.opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.rss_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.web_mock_options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // document update
  ///////////////////////////////////////////////////////
  test("remote document modified", function () {
    expect(4);
    stop();

    var test = this,
      key,
      doc_id = 'opml_foo',
      doc = {
        title: "opml item foo",
        url: "http://example.com/rss.xml",
        modified_date: "aftttt",
        created_date: "adddb",
        opml_title: "opml foo"
      },
      blob = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        description: "This is an example of an Item",
        guid: "1102345",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        reference: "This is an example of an RSS feed",
        siteTitle: "RSS Example",
        title: "Item Example",
        status: "OK"
      },
      opml_gen,
      rss_gen,
      rss_doc2 = JSON.parse(JSON.stringify(rss_doc)),
      rss_blob2 = new Blob([JSON.stringify(rss_doc2)]);

    opml_gen = getOpmlElement(doc, doc_id, test.sub_opml_storage.url);
    rss_gen = getSubOpmlElement(
      rss_doc2,
      rss_id,
      opml_gen.doc,
      test.sub_opml_storage.sub_storage_list[0].url,
      "rssmock"
    );

    // initialise this storage here so we can put data
    key = generateHash(test.sub_opml_storage.url);
    this.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
      type: "opmlmock",
      options: this.opml_mock_options
    });

    putFullDoc(this.jio.__storage._remote_storage_dict[key], doc_id, doc)
      .then(function () {
        // put rss doc
        key = generateHash(opml_gen.doc.reference +
                           test.sub_opml_storage.sub_storage_list[0].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "rssmock",
          options: test.rss_mock_options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          rss_id, rss_doc);
      })
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          rss_id, rss_doc2);
      })
      .then(function () {
        resetCount(test.opml_mock_options.count);
        resetCount(test.rss_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_gen.id, opml_gen.doc, blob],
                                  [rss_gen.id, rss_gen.doc, rss_blob2]]),
          equalsubStorageCallCount(
            test.opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.rss_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.web_mock_options.count,
            {}
          )
        ]);
      })
      .fail(function (error) {
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // document remove
  ///////////////////////////////////////////////////////
  test("remote document deleted", function () {
    expect(5);
    stop();

    var test = this,
      key,
      doc_id = 'opml_foo',
      doc = {
        title: "opml item foo",
        url: "http://example.com/rss.xml",
        modified_date: "aftttt",
        created_date: "adddb",
        opml_title: "opml foo"
      },
      blob = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        description: "This is an example of an Item",
        guid: "1102345",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        reference: "This is an example of an RSS feed",
        siteTitle: "RSS Example",
        title: "Item Example",
        status: "OK"
      },
      rss_blob = new Blob([JSON.stringify(rss_doc)]),
      opml_gen,
      rss_gen;

    opml_gen = getOpmlElement(doc, doc_id, test.sub_opml_storage.url);
    rss_gen = getSubOpmlElement(
      rss_doc,
      rss_id,
      opml_gen.doc,
      test.sub_opml_storage.sub_storage_list[0].url,
      "rssmock"
    );

    // initialise this storage here so we can put data
    key = generateHash(test.sub_opml_storage.url);
    this.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
      type: "opmlmock",
      options: this.opml_mock_options
    });

    putFullDoc(this.jio.__storage._remote_storage_dict[key], doc_id, doc)
      .then(function () {
        // put rss doc
        key = generateHash(opml_gen.doc.reference +
                           test.sub_opml_storage.sub_storage_list[0].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "rssmock",
          options: test.rss_mock_options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          rss_id, rss_doc);
      })
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_gen.id, opml_gen.doc, blob],
                                  [rss_gen.id, rss_gen.doc, rss_blob]])
        ]);
      })
      .then(function () {
        test.rss_mock_options.mock.buildQuery = function () {
          return [];
        };
        resetCount(test.opml_mock_options.count);
        resetCount(test.rss_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_gen.id, opml_gen.doc, blob]]),
          equalsubStorageCallCount(
            test.opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.rss_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.web_mock_options.count,
            {}
          )
        ]);
      })
      .fail(function (error) {
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // complete sync - many opml (2 opmls, 4 sub storages)
  ///////////////////////////////////////////////////////
  test("multi opml storage sync", function () {
    expect(7);
    stop();

    var test = this,
      key,
      doc_id = 'opml_foo',
      doc = {
        title: "opml item foo",
        url: "http://example.com/rss.xml",
        modified_date: "aftttt",
        created_date: "adddb",
        opml_title: "opml foo"
      },
      blob = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        description: "This is an example of an Item",
        guid: "1102345",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        reference: "This is an example of an RSS feed",
        siteTitle: "RSS Example",
        title: "Item Example",
        status: "OK"
      },
      rss_blob = new Blob([JSON.stringify(rss_doc)]),
      json_id = "promise_runner.status",
      json_doc = {
        title: "promise fooo",
        status: "ERROR",
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        type: "promise",
        foo_p: "fooo parameter",
        bar_p: "bar parameter"
      },
      json_blob = new Blob([JSON.stringify(json_doc)]),
      gen_dict = {};

    // update storage with 2 opmls
    this.sub_opml_storage2 = {
      type: "opmlmock",
      options: JSON.parse(JSON.stringify(this.opml_mock_options)),
      url: "http://example2.com/opml.xml",
      sub_storage_list: [
        {
          type: "rssmock",
          url: "http://example2.com/rss.xml",
          has_include_docs: true,
          options: JSON.parse(JSON.stringify(this.rss_mock_options))
        },
        {
          type: "webmock",
          url: "http://example2.com/data/",
          has_include_docs: true,
          options: JSON.parse(JSON.stringify(this.web_mock_options))
        }
      ],
      basic_login: "YWRtaW46endfEzrJUZGw="
    };
    this.jio = jIO.createJIO({
      type: "replicatedopml",
      opml_storage_list: [
        this.sub_opml_storage,
        this.sub_opml_storage2
      ],
      local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory"
          }
        }
      }
    });

    gen_dict.opml = getOpmlElement(doc, doc_id, test.sub_opml_storage.url);
    gen_dict.opml2 = getOpmlElement(doc, doc_id, test.sub_opml_storage2.url);
    gen_dict.rss = getSubOpmlElement(
      rss_doc,
      rss_id,
      gen_dict.opml.doc,
      test.sub_opml_storage.sub_storage_list[0].url,
      "rssmock"
    );
    gen_dict.json = getSubOpmlElement(
      json_doc,
      json_id,
      gen_dict.opml.doc,
      test.sub_opml_storage.sub_storage_list[1].url,
      "webmock"
    );
    gen_dict.rss2 = getSubOpmlElement(
      rss_doc,
      rss_id,
      gen_dict.opml2.doc,
      test.sub_opml_storage2.sub_storage_list[0].url,
      "rssmock"
    );
    gen_dict.json2 = getSubOpmlElement(
      json_doc,
      json_id,
      gen_dict.opml2.doc,
      test.sub_opml_storage2.sub_storage_list[1].url,
      "webmock"
    );

    // initialise this storage here so we can put data
    key = generateHash(test.sub_opml_storage.url);
    this.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
      type: "opmlmock",
      options: this.opml_mock_options
    });

    putFullDoc(this.jio.__storage._remote_storage_dict[key], doc_id, doc)
      .then(function () {
        // put second opml doc
        key = generateHash(test.sub_opml_storage2.url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "opmlmock",
          options: test.sub_opml_storage2.options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          doc_id, doc);
      })
      .then(function () {
        // put rss doc1
        key = generateHash(gen_dict.opml.doc.reference +
                           test.sub_opml_storage.sub_storage_list[0].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "rssmock",
          options: test.rss_mock_options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          rss_id, rss_doc);
      })
      .then(function () {
        // put json doc1
        key = generateHash(gen_dict.opml.doc.reference +
                           test.sub_opml_storage.sub_storage_list[1].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "webmock",
          options: test.web_mock_options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          json_id, json_doc);
      })
      .then(function () {
        // put rss doc2
        key = generateHash(gen_dict.opml2.doc.reference +
                           test.sub_opml_storage2.sub_storage_list[0].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "rssmock",
          options: test.sub_opml_storage2.sub_storage_list[0].options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          rss_id, rss_doc);
      })
      .then(function () {
        // put json doc2
        key = generateHash(gen_dict.opml2.doc.reference +
                           test.sub_opml_storage2.sub_storage_list[1].url);
        test.jio.__storage._remote_storage_dict[key] = jIO.createJIO({
          type: "webmock",
          options: test.sub_opml_storage2.sub_storage_list[1].options
        });
        return putFullDoc(test.jio.__storage._remote_storage_dict[key],
                          json_id, json_doc);
      })
      .then(function () {
        resetCount(test.opml_mock_options.count);
        resetCount(test.rss_mock_options.count);
        resetCount(test.web_mock_options.count);
        resetCount(test.sub_opml_storage2.options.count);
        resetCount(test.sub_opml_storage2.sub_storage_list[0].options.count);
        resetCount(test.sub_opml_storage2.sub_storage_list[1].options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio,
              [[gen_dict.opml.id, gen_dict.opml.doc, blob],
              [gen_dict.opml2.id, gen_dict.opml2.doc, blob],
              [gen_dict.rss.id, gen_dict.rss.doc, rss_blob],
              [gen_dict.rss2.id, gen_dict.rss2.doc, rss_blob],
              [gen_dict.json.id, gen_dict.json.doc, json_blob],
              [gen_dict.json2.id, gen_dict.json2.doc, json_blob]]
            ),
          equalsubStorageCallCount(
            test.opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.rss_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.web_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.sub_opml_storage2.options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.sub_opml_storage2.sub_storage_list[0].options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            test.sub_opml_storage2.sub_storage_list[1].options.count,
            {buildQuery: 1}
          )
        ]);
      })
      .fail(function (error) {
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(QUnit, jIO, Blob, Rusha, console));