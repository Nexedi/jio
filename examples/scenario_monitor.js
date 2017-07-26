/*global Blob, Rusha, sinon, console*/
/*jslint nomen: true, maxlen: 80*/
(function (QUnit, jIO, Blob, Rusha, sinon, console) {
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
    this._options = spec.options;
    resetCount(spec.options.count);
  }

  RSSMockStorage.prototype.hasCapacity = function (name) {
    return this._rss_storage.hasCapacity(name);
  };

  function WEBMockStorage(spec) {
    this._web_storage = jIO.createJIO({
      type: "webhttp",
      url: "http://example.com/"
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
      return this._web_storage[name].apply(this._web_storage, arguments);
    };
    RSSMockStorage.prototype[name] = function () {
      this._options.count[name] += 1;
      if (this._options.mock.hasOwnProperty(name)) {
        return this._options.mock[name].apply(this, arguments);
      }
      return this._rss_storage[name].apply(this._rss_storage, arguments);
    };
    OPMLMockStorage.prototype[name] = function () {
      this._options.count[name] += 1;
      if (this._options.mock.hasOwnProperty(name)) {
        return this._options.mock[name].apply(this, arguments);
      }
      return this._opml_storage[name].apply(this._opml_storage, arguments);
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

  ///////////////////////////////////////////////////////
  // Module
  ///////////////////////////////////////////////////////
  module("scenario_monitor", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.rss_mock_options = {
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
      this.opml_mock_options = {
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
            url: "http://example.com/",
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
      this.server.respondWith("GET", "http://example.com/opml.xml", [200,
          { "Content-Type": "text/xml" },
          '<?xml version="1.0" encoding="ISO-8859-1"?>' +
          '<opml version="1.0">' +
          '<head>' +
          '<title>opml foo</title>' +
          '<dateCreated>Thu, 12 Sep 2003 23:35:52 GMT</dateCreated>' +
          '<dateModified>Fri, 12 Sep 2003 23:45:37 GMT</dateModified>' +
          '</head>' +
          '<body>' +
          '<outline text="OPML Item List">' +
          '<outline text="instance foo"  type="link" url="http://example.com/' +
          'rss.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT" ' +
          'htmlUrl="http://example.com/" title="opml item foo" />' +
          '</outline>' +
          '</body>' +
          '</opml>'
        ]);

      this.server.respondWith("GET", "http://example.com/rss.xml", [200,
          { "Content-Type": "text/xml" },
          '<?xml version="1.0" encoding="UTF-8" ?>' +
          '<rss version="2.0">' +
          '<channel>' +
          '<title>instance foo</title>' +
          '<description>This is an example of an RSS feed</description>' +
          '<link>http://www.domain.com/link.htm</link>' +
          '<lastBuildDate>Mon, 28 Aug 2006 11:12:55 -0400 </lastBuildDate>' +
          '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
          '<item>' +
          '<title>Item Example</title>' +
          '<category>ERROR</category>' +
          '<description>This is an example of an Item</description>' +
          '<link>http://www.domain.com/link.htm</link>' +
          '<guid isPermaLink="false">1102345</guid>' +
          '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
          '</item>' +
          '</channel>' +
          '</rss>'
        ]);

      this.server.respondWith("GET", "http://example.com/_document_list", [200,
          { "Content-Type": "text/plain" },
          'monitor.status'
        ]);

      this.server.respondWith(
        "GET",
        "http://example.com/monitor.status.json",
        [200,
          { "Content-Type": "application/json" },
          '{"title": "document fooo", "status": "ERROR",' +
          '"date": "Tue, 29 Aug 2006 09:00:00 -0400",' +
          '"type": "global", "foo_p": "fooo parameter",' +
          '"bar_p": "bar parameter", "total_error": 12345}']
      );
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  ///////////////////////////////////////////////////////
  // Do nothing cases
  ///////////////////////////////////////////////////////
  test("empty: nothing to do", function () {
    expect(4);
    stop();

    var test = this;

    test.opml_mock_options.mock.buildQuery = function () {
      return [];
    };
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
  // complete sync - one opml, 2 sub storages
  ///////////////////////////////////////////////////////
  test("complete storage sync", function () {
    expect(4);
    stop();

    var test = this,
      doc_id = "http://example.com/rss.xml",
      doc = {
        title: "opml item foo",
        htmlurl: "http://example.com/",
        url: "http://example.com/rss.xml",
        text: "instance foo",
        type: "link",
        opml_title: "opml foo",
        created_date: "Thu, 12 Sep 2003 23:35:52 GMT",
        modified_date: "Fri, 12 Sep 2003 23:45:37 GMT"
      },
      parent_id = generateHash(test.sub_opml_storage.url),
      opml_item_id = generateHash(parent_id + doc_id),
      opml_item = {
        name: doc_id,
        opml_title: doc.opml_title,
        parent_id: parent_id,
        reference: generateHash(parent_id + doc_id),
        creation_date: doc.created_date,
        title: doc.title,
        type: "opml-item",
        url: test.sub_opml_storage.url,
        signature: generateHash(JSON.stringify(doc))
      },
      full_opml = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        "link": "http://www.domain.com/link.htm",
        "date": "Tue, 29 Aug 2006 09:00:00 -0400",
        "title": "Item Example",
        "category": "ERROR",
        "description": "This is an example of an Item",
        "guid": "1102345",
        "siteTitle": "instance foo",
        "reference": "This is an example of an RSS feed",
        "siteLink": "http://www.domain.com/link.htm",
        "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 "
      },
      // Sub OPML document (rss)
      rss_feed_url = "http://example.com/rss.xml",
      rss_item_id = generateHash(opml_item.reference + rss_feed_url + rss_id),
      rss_item = {
        name: rss_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: rss_item_id,
        title: rss_doc.title,
        type: rss_doc.type || "rssmock-item",
        url: rss_feed_url,
        status: rss_doc.category,
        creation_date: rss_doc.date,
        signature: generateHash(JSON.stringify(rss_doc))
      },
      full_rss = new Blob([JSON.stringify(rss_doc)]),
      json_id = "monitor.status",
      json_doc = {
        title: "document fooo",
        status: "ERROR",
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        type: "global",
        foo_p: "fooo parameter",
        bar_p: "bar parameter",
        total_error: 12345
      },
      // Sub OPML document (webhttp)
      http_url = "http://example.com/",
      json_item_id = generateHash(opml_item.reference + http_url + json_id),
      json_item = {
        name: json_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: json_item_id,
        title: json_doc.title,
        type: json_doc.type,
        url: http_url,
        status: json_doc.status,
        creation_date: json_doc.date,
        signature: generateHash(JSON.stringify(json_doc))
      },
      full_json = new Blob([JSON.stringify(json_doc)]);

    test.jio.repair()
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_item_id, opml_item, full_opml],
                                  [rss_item_id, rss_item, full_rss],
                                  [json_item_id, json_item, full_json]]),
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
      doc_id = "http://example.com/rss.xml",
      doc = {
        title: "opml item foo",
        htmlurl: "http://example.com/",
        url: "http://example.com/rss.xml",
        text: "instance foo",
        type: "link",
        opml_title: "opml foo",
        created_date: "Thu, 12 Sep 2003 23:35:52 GMT",
        modified_date: "Fri, 12 Sep 2003 23:45:37 GMT"
      },
      parent_id = generateHash(test.sub_opml_storage.url),
      opml_item_id = generateHash(parent_id + doc_id),
      opml_item = {
        name: doc_id,
        opml_title: doc.opml_title,
        parent_id: parent_id,
        reference: generateHash(parent_id + doc_id),
        creation_date: doc.created_date,
        title: doc.title,
        type: "opml-item",
        url: test.sub_opml_storage.url,
        signature: generateHash(JSON.stringify(doc))
      },
      full_opml = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        "link": "http://www.domain.com/link.htm",
        "date": "Tue, 29 Aug 2006 09:00:00 -0400",
        "title": "Item Example",
        "category": "ERROR",
        "description": "This is an example of an Item",
        "guid": "1102345",
        "siteTitle": "instance foo",
        "reference": "This is an example of an RSS feed",
        "siteLink": "http://www.domain.com/link.htm",
        "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 "
      },
      // Sub OPML document (rss)
      rss_feed_url = test.sub_opml_storage.sub_storage_list[0].url,
      rss_item_id = generateHash(opml_item.reference + rss_feed_url + rss_id),
      rss_item2 = {
        name: rss_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: rss_item_id,
        title: rss_doc.title,
        type: rss_doc.type || "rssmock-item",
        url: rss_feed_url,
        status: rss_doc.category,
        creation_date: rss_doc.date
      },
      rss_doc2 = JSON.parse(JSON.stringify(rss_doc)),
      full_rss2,
      json_id = "monitor.status",
      json_doc = {
        title: "document fooo",
        status: "ERROR",
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        type: "global",
        foo_p: "fooo parameter",
        bar_p: "bar parameter",
        total_error: 12345
      },
      // Sub OPML document (webhttp)
      http_url = "http://example.com/",
      json_item_id = generateHash(opml_item.reference + http_url + json_id),
      json_item = {
        name: json_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: json_item_id,
        title: json_doc.title,
        type: json_doc.type,
        url: http_url,
        status: json_doc.status,
        creation_date: json_doc.date,
        signature: generateHash(JSON.stringify(json_doc))
      },
      full_json = new Blob([JSON.stringify(json_doc)]);

    /* Update rss document */
    rss_doc2.date = "new rss date";
    // new signature
    rss_item2.signature = generateHash(JSON.stringify(rss_doc2));
    // modified date
    rss_item2.creation_date = rss_doc2.date;
    // get the full rss item
    full_rss2 = new Blob([JSON.stringify(rss_doc2)]);

    test.jio.repair()
      .then(function () {
        test.rss_mock_options.mock.buildQuery = function () {
          return [{id: rss_id, doc: rss_doc2, value: {}}];
        };
        resetCount(test.opml_mock_options.count);
        resetCount(test.rss_mock_options.count);
        resetCount(test.web_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_item_id, opml_item, full_opml],
                                  [rss_item_id, rss_item2, full_rss2],
                                  [json_item_id, json_item, full_json]]),
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
  // remote document deleted - non exist in result
  ///////////////////////////////////////////////////////
  test("remote document deleted: empty result", function () {
    expect(5);
    stop();

    var test = this,
      doc_id = "http://example.com/rss.xml",
      doc = {
        title: "opml item foo",
        htmlurl: "http://example.com/",
        url: "http://example.com/rss.xml",
        text: "instance foo",
        type: "link",
        opml_title: "opml foo",
        created_date: "Thu, 12 Sep 2003 23:35:52 GMT",
        modified_date: "Fri, 12 Sep 2003 23:45:37 GMT"
      },
      parent_id = generateHash(test.sub_opml_storage.url),
      opml_item_id = generateHash(parent_id + doc_id),
      opml_item = {
        name: doc_id,
        opml_title: doc.opml_title,
        parent_id: parent_id,
        reference: generateHash(parent_id + doc_id),
        creation_date: doc.created_date,
        title: doc.title,
        type: "opml-item",
        url: test.sub_opml_storage.url,
        signature: generateHash(JSON.stringify(doc))
      },
      full_opml = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        "link": "http://www.domain.com/link.htm",
        "date": "Tue, 29 Aug 2006 09:00:00 -0400",
        "title": "Item Example",
        "category": "ERROR",
        "description": "This is an example of an Item",
        "guid": "1102345",
        "siteTitle": "instance foo",
        "reference": "This is an example of an RSS feed",
        "siteLink": "http://www.domain.com/link.htm",
        "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 "
      },
      // Sub OPML document (rss)
      rss_feed_url = "http://example.com/rss.xml",
      rss_item_id = generateHash(opml_item.reference + rss_feed_url + rss_id),
      rss_item = {
        name: rss_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: rss_item_id,
        title: rss_doc.title,
        type: rss_doc.type || "rssmock-item",
        url: rss_feed_url,
        status: rss_doc.category,
        creation_date: rss_doc.date,
        signature: generateHash(JSON.stringify(rss_doc))
      },
      full_rss = new Blob([JSON.stringify(rss_doc)]),
      json_id = "monitor.status",
      json_doc = {
        title: "document fooo",
        status: "ERROR",
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        type: "global",
        foo_p: "fooo parameter",
        bar_p: "bar parameter",
        total_error: 12345
      },
      // Sub OPML document (webhttp)
      http_url = "http://example.com/",
      json_item_id = generateHash(opml_item.reference + http_url + json_id),
      json_item = {
        name: json_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: json_item_id,
        title: json_doc.title,
        type: json_doc.type,
        url: http_url,
        status: json_doc.status,
        creation_date: json_doc.date,
        signature: generateHash(JSON.stringify(json_doc))
      },
      full_json = new Blob([JSON.stringify(json_doc)]);

    new RSVP.Queue()
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_item_id, opml_item, full_opml],
                                  [rss_item_id, rss_item, full_rss],
                                  [json_item_id, json_item, full_json]])
        ]);
      })
      .then(function () {
        test.rss_mock_options.mock.buildQuery = function () {
          return [];
        };
        resetCount(test.opml_mock_options.count);
        resetCount(test.rss_mock_options.count);
        resetCount(test.web_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_item_id, opml_item, full_opml],
                                  [json_item_id, json_item, full_json]]),
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
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  ///////////////////////////////////////////////////////
  // some document remove - id has changed
  ///////////////////////////////////////////////////////
  test("remote document removed", function () {
    expect(5);
    stop();

    var test = this,
      doc_id = "http://example.com/rss.xml",
      doc = {
        title: "opml item foo",
        htmlurl: "http://example.com/",
        url: "http://example.com/rss.xml",
        text: "instance foo",
        type: "link",
        opml_title: "opml foo",
        created_date: "Thu, 12 Sep 2003 23:35:52 GMT",
        modified_date: "Fri, 12 Sep 2003 23:45:37 GMT"
      },
      parent_id = generateHash(test.sub_opml_storage.url),
      opml_item_id = generateHash(parent_id + doc_id),
      opml_item = {
        name: doc_id,
        opml_title: doc.opml_title,
        parent_id: parent_id,
        reference: generateHash(parent_id + doc_id),
        creation_date: doc.created_date,
        title: doc.title,
        type: "opml-item",
        url: test.sub_opml_storage.url,
        signature: generateHash(JSON.stringify(doc))
      },
      full_opml = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        "link": "http://www.domain.com/link.htm",
        "date": "Tue, 29 Aug 2006 09:00:00 -0400",
        "title": "Item Example",
        "category": "ERROR",
        "description": "This is an example of an Item",
        "guid": "1102345",
        "siteTitle": "instance foo",
        "reference": "This is an example of an RSS feed",
        "siteLink": "http://www.domain.com/link.htm",
        "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 "
      },
      // Sub OPML document (rss)
      rss_feed_url = "http://example.com/rss.xml",
      rss_item_id = generateHash(opml_item.reference + rss_feed_url + rss_id),
      rss_item = {
        name: rss_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: rss_item_id,
        title: rss_doc.title,
        type: rss_doc.type || "rssmock-item",
        url: rss_feed_url,
        status: rss_doc.category,
        creation_date: rss_doc.date,
        signature: generateHash(JSON.stringify(rss_doc))
      },
      full_rss = new Blob([JSON.stringify(rss_doc)]),
      json_id = "monitor.status",
      json_doc = {
        title: "document fooo",
        status: "ERROR",
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        type: "global",
        foo_p: "fooo parameter",
        bar_p: "bar parameter",
        total_error: 12345
      },
      // Sub OPML document (webhttp)
      http_url = "http://example.com/",
      json_item_id = generateHash(opml_item.reference + http_url + json_id),
      json_item = {
        name: json_id,
        opml_title: opml_item.opml_title,
        parent_title: opml_item.title,
        parent_id: opml_item.reference,
        reference: json_item_id,
        title: json_doc.title,
        type: json_doc.type,
        url: http_url,
        status: json_doc.status,
        creation_date: json_doc.date,
        signature: generateHash(JSON.stringify(json_doc))
      },
      full_json = new Blob([JSON.stringify(json_doc)]),
      /* rss doc 2 with different id */
      rss_id2 = "1102345-new",
      rss_item2_id = generateHash(opml_item.reference + rss_feed_url + rss_id2),
      rss_item2 = JSON.parse(JSON.stringify(rss_item));

    rss_item2.name = rss_id2;
    rss_item2.reference = rss_item2_id;

    test.jio.repair()
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_item_id, opml_item, full_opml],
                                  [rss_item_id, rss_item, full_rss],
                                  [json_item_id, json_item, full_json]])
        ]);
      })
      .then(function () {
        test.rss_mock_options.mock.buildQuery = function () {
          // return a different document
          return [{id: rss_id2, doc: rss_doc, value: {}}];
        };
        resetCount(test.opml_mock_options.count);
        resetCount(test.rss_mock_options.count);
        resetCount(test.web_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [[opml_item_id, opml_item, full_opml],
                                  [json_item_id, json_item, full_json],
                                  [rss_item2_id, rss_item2, full_rss]]),
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
  // complete sync - 2 opmls, 3 sub storages
  ///////////////////////////////////////////////////////
  test("multi opml storage sync", function () {
    expect(6);
    stop();

    var test = this,
      doc_id = "http://example.com/rss.xml",
      doc = {
        title: "opml item foo",
        htmlurl: "http://example.com/",
        url: "http://example.com/rss.xml",
        text: "instance foo",
        type: "link",
        opml_title: "opml foo",
        created_date: "Thu, 12 Sep 2003 23:35:52 GMT",
        modified_date: "Fri, 12 Sep 2003 23:45:37 GMT"
      },
      full_opml = new Blob([JSON.stringify(doc)]),
      rss_id = "1102345",
      rss_doc = {
        "link": "http://www.domain.com/link.htm",
        "date": "Tue, 29 Aug 2006 09:00:00 -0400",
        "title": "Item Example",
        "category": "ERROR",
        "description": "This is an example of an Item",
        "guid": "1102345",
        "siteTitle": "instance foo",
        "reference": "This is an example of an RSS feed",
        "siteLink": "http://www.domain.com/link.htm",
        "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 "
      },
      full_rss = new Blob([JSON.stringify(rss_doc)]),
      json_id = "monitor.status",
      json_doc = {
        title: "document fooo",
        status: "ERROR",
        date: "Tue, 29 Aug 2006 09:00:00 -0400",
        type: "global",
        foo_p: "fooo parameter",
        bar_p: "bar parameter",
        total_error: 12345
      },
      full_json = new Blob([JSON.stringify(json_doc)]),
      item_dict = {},
      rss_url = "http://example.com/rss.xml",
      rss2_url = "http://example2.com/rss.xml",
      http_url = "http://example.com/";

    // update storage with 2 opmls
    // opml2 has only rss feed substorage
    this.sub_opml_storage2 = {
      type: "opmlmock",
      options: {
        mock: {
        },
        count: {}
      },
      url: "http://example2.com/opml.xml",
      sub_storage_list: [
        {
          type: "rssmock",
          url: "http://example2.com/rss.xml",
          has_include_docs: true,
          options: {
            mock: {
            },
            count: {}
          }
        }
      ]
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

    /* Expected item in indexeddb*/
    item_dict.opml = {
      parent_id: generateHash(test.sub_opml_storage.url),
      reference: generateHash(generateHash(test.sub_opml_storage.url) + doc_id),
      name: doc_id,
      opml_title: doc.opml_title,
      creation_date: doc.created_date,
      title: doc.title,
      type: "opml-item",
      url: test.sub_opml_storage.url,
      signature: generateHash(JSON.stringify(doc))
    };
    item_dict.opml2 = {
      parent_id: generateHash(test.sub_opml_storage2.url),
      reference: generateHash(
        generateHash(test.sub_opml_storage2.url) + doc_id
      ),
      name: doc_id,
      opml_title: doc.opml_title,
      creation_date: doc.created_date,
      title: doc.title,
      type: "opml-item",
      url: test.sub_opml_storage2.url,
      signature: generateHash(JSON.stringify(doc))
    };
    item_dict.rss = {
      name: rss_id,
      opml_title: item_dict.opml.opml_title,
      parent_title: item_dict.opml.title,
      parent_id: item_dict.opml.reference,
      reference: generateHash(item_dict.opml.reference + rss_url + rss_id),
      title: rss_doc.title,
      type: rss_doc.type || "rssmock-item",
      url: rss_url,
      status: rss_doc.category,
      creation_date: rss_doc.date,
      signature: generateHash(JSON.stringify(rss_doc))
    };
    item_dict.rss2 = {
      name: rss_id,
      opml_title: item_dict.opml2.opml_title,
      parent_title: item_dict.opml2.title,
      parent_id: item_dict.opml2.reference,
      reference: generateHash(item_dict.opml2.reference + rss2_url + rss_id),
      title: rss_doc.title,
      type: "rssmock-item",
      url: rss2_url,
      status: rss_doc.category,
      creation_date: rss_doc.date,
      signature: generateHash(JSON.stringify(rss_doc))
    };
    item_dict.json = {
      name: json_id,
      opml_title: item_dict.opml.opml_title,
      parent_title: item_dict.opml.title,
      parent_id: item_dict.opml.reference,
      reference: generateHash(item_dict.opml.reference + http_url + json_id),
      title: json_doc.title,
      type: json_doc.type,
      url: http_url,
      status: json_doc.status,
      creation_date: json_doc.date,
      signature: generateHash(JSON.stringify(json_doc))
    };

    new RSVP.Queue()
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio,
              [[item_dict.opml.reference, item_dict.opml, full_opml],
              [item_dict.rss.reference, item_dict.rss, full_rss],
              [item_dict.json.reference, item_dict.json, full_json],
              [item_dict.opml2.reference, item_dict.opml2, full_opml],
              [item_dict.rss2.reference, item_dict.rss2, full_rss]]
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

}(QUnit, jIO, Blob, Rusha, sinon, console));