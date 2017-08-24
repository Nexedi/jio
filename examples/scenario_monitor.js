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
    opml_mock_options,
    rss_mock_options,
    opml_mock_options2 = {},
    rss_mock_options2 = {},
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

  function ParserMockStorage(spec) {
    this._sub_storage = jIO.createJIO({
      type: "parser",
      document_id: spec.document_id,
      attachment_id: spec.attachment_id,
      parser: spec.parser,
      sub_storage: spec.sub_storage
    });
    if (spec.parser === "opml") {
      if (spec.document_id === "http://example2.com/opml.xml") {
        this._options = opml_mock_options2;
      } else {
        this._options = opml_mock_options;
      }
    } else if (spec.parser === "rss") {
      if (spec.document_id === "http://example2.com/rss.xml") {
        this._options = rss_mock_options2;
      } else {
        this._options = rss_mock_options;
      }
    }
    resetCount(this._options.count);
  }

  ParserMockStorage.prototype.hasCapacity = function (name) {
    return this._sub_storage.hasCapacity(name);
  };

  function mockFunction(name) {
    ParserMockStorage.prototype[name] = function () {
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

  jIO.addStorage('parsermock', ParserMockStorage);

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
            storage.get(result.data.rows[i].id)
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

      this.jio = jIO.createJIO({
        type: "replicatedopml",
        remote_parser_storage_type: "parsermock",
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
          '<outline text="instance foo" xmlUrl="http://example.com/' +
          'rss.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT" ' +
          'htmlUrl="http://example.com/" title="opml item foo" type="link"/>' +
          '</outline>' +
          '</body>' +
          '</opml>'
        ]);

      this.server.respondWith("GET", "http://example2.com/opml.xml", [200,
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
          '<outline text="instance foo" xmlUrl="http://example2.com/' +
          'rss.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT" ' +
          'htmlUrl="http://example2.com/" title="opml item foo" type="link"/>' +
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

      this.server.respondWith("GET", "http://example2.com/rss.xml", [200,
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
          '<guid isPermaLink="false">11026875</guid>' +
          '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
          '</item>' +
          '</channel>' +
          '</rss>'
        ]);

      opml_mock_options = {
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
      rss_mock_options = {
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

      console.log(new Blob([JSON.stringify({toto: ""})]));
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
    this.jio.repair()
      .then(function () {
        return RSVP.all([
          isEmptyStorage(test.jio),
          deepEqual(test.jio.__storage._remote_storage_dict,
                    {},
                    'SubStorage empty'),
          equalsubStorageCallCount(
            opml_mock_options.count,
            {}
          ),
          equalsubStorageCallCount(
            rss_mock_options.count,
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
  // complete sync - one opml, one sub storages
  ///////////////////////////////////////////////////////
  test("complete storage sync", function () {
    expect(3);
    stop();

    var test = this,
      opml_doc = {
        title: "opml item foo",
        url: "http://example.com/opml.xml",
        portal_type: "opml",
        basic_login: "cred foo",
        active: true
      },
      opml_id = generateHash(opml_doc.url),
      opml_outline_id = "/1/0/0",
      opml_outline = {
        opml_title: "opml foo",
        dateCreated: "Thu, 12 Sep 2003 23:35:52 GMT",
        dateModified: "Fri, 12 Sep 2003 23:45:37 GMT",
        text: "instance foo",
        type: "link",
        htmlUrl: "http://example.com/",
        xmlUrl: "http://example.com/rss.xml",
        title: "opml item foo",
        portal_type: "opml-outline",
        parent_id: opml_id,
        parent_url: opml_doc.url,
        reference: generateHash(opml_id + opml_outline_id),
        active: true
      },
      promise_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0/0"),
      promise_item = {
        link: "http://www.domain.com/link.htm",
        title: "Item Example",
        category: "ERROR",
        description: "This is an example of an Item",
        guid: "1102345",
        guid_isPermaLink: "false",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        channel: "This is an example of an RSS feed",
        channel_item: "instance foo",
        parent_id: opml_outline.reference,
        reference: promise_id,
        status: "ERROR",
        portal_type: "promise",
        active: true
      },
      rss_item_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0"),
      rss_item = {
        title: "instance foo",
        description: "This is an example of an RSS feed",
        link: "http://www.domain.com/link.htm",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        parent_id: opml_outline.reference,
        reference: rss_item_id,
        portal_type: "rss",
        active: true
      };

    test.jio.put(opml_doc.url, opml_doc)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [
            [opml_doc.url, opml_doc],
            [opml_outline.reference, opml_outline],
            [rss_item_id, rss_item],
            [promise_id, promise_item]
          ]),
          equalsubStorageCallCount(
            opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            rss_mock_options.count,
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
  // remote document update
  ///////////////////////////////////////////////////////
  test("remote document modified", function () {
    expect(3);
    stop();

    var test = this,
      opml_doc = {
        title: "opml item foo",
        url: "http://example.com/opml.xml",
        portal_type: "opml",
        basic_login: "cred foo",
        active: true
      },
      opml_id = generateHash(opml_doc.url),
      opml_outline_id = "/1/0/0",
      opml_outline = {
        opml_title: "opml foo",
        dateCreated: "Thu, 12 Sep 2003 23:35:52 GMT",
        dateModified: "Fri, 12 Sep 2003 23:45:37 GMT",
        text: "instance foo",
        type: "link",
        htmlUrl: "http://example.com/",
        xmlUrl: "http://example.com/rss.xml",
        title: "opml item foo",
        portal_type: "opml-outline",
        parent_id: opml_id,
        parent_url: opml_doc.url,
        reference: generateHash(opml_id + opml_outline_id),
        active: true
      },
      promise_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0/0"),
      promise_item = {
        link: "http://www.domain.com/link.htm",
        title: "Item Example",
        category: "ERROR",
        description: "This is an example of an Item",
        guid: "1102345",
        guid_isPermaLink: "false",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        channel: "This is an example of an RSS feed",
        channel_item: "instance foo",
        parent_id: opml_outline.reference,
        reference: promise_id,
        status: "ERROR",
        portal_type: "promise",
        active: true
      },
      rss_item_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0"),
      rss_item = {
        title: "instance foo",
        description: "This is an example of an RSS feed",
        link: "http://www.domain.com/link.htm",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        parent_id: opml_outline.reference,
        reference: rss_item_id,
        portal_type: "rss",
        active: true
      },
      updated_promise = JSON.parse(JSON.stringify(promise_item));

    test.jio.put(opml_doc.url, opml_doc)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        rss_mock_options.mock.buildQuery = function () {
          return [
            {
              "id": "/0",
              "value": {},
              "doc": {
                "title": "instance foo",
                "description": "This is an example of an RSS feed",
                "link": "http://www.domain.com/link.htm",
                "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 ",
                "pubDate": "Tue, 29 Aug 2006 09:00:00 -0400"
              }
            },
            {
              "id": "/0/0",
              "value": {},
              "doc": {
                "link": "http://www.domain.com/link.htm",
                "pubDate": "Tue, 29 Aug 2006 10:00:00 -0400", //Changed
                "title": "Item Example",
                "category": "OK", // changed to OK
                "description": "This is an example of an Item",
                "guid": "1102345",
                "guid_isPermaLink": "false"
              }
            }
          ];
        };
        updated_promise.pubDate = "Tue, 29 Aug 2006 10:00:00 -0400";
        updated_promise.category = "OK";
        updated_promise.status = "OK";
        resetCount(opml_mock_options.count);
        resetCount(rss_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [
            [opml_doc.url, opml_doc],
            [opml_outline.reference, opml_outline],
            [rss_item_id, rss_item],
            [promise_id, updated_promise]
          ]),
          equalsubStorageCallCount(
            opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            rss_mock_options.count,
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
    expect(4);
    stop();

    var test = this,
      opml_doc = {
        title: "opml item foo",
        url: "http://example.com/opml.xml",
        portal_type: "opml",
        basic_login: "cred foo",
        active: true
      },
      opml_id = generateHash(opml_doc.url),
      opml_outline_id = "/1/0/0",
      opml_outline = {
        opml_title: "opml foo",
        dateCreated: "Thu, 12 Sep 2003 23:35:52 GMT",
        dateModified: "Fri, 12 Sep 2003 23:45:37 GMT",
        text: "instance foo",
        type: "link",
        htmlUrl: "http://example.com/",
        xmlUrl: "http://example.com/rss.xml",
        title: "opml item foo",
        portal_type: "opml-outline",
        parent_id: opml_id,
        parent_url: opml_doc.url,
        reference: generateHash(opml_id + opml_outline_id),
        active: true
      },
      promise_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0/0"),
      promise_item = {
        link: "http://www.domain.com/link.htm",
        title: "Item Example",
        category: "ERROR",
        description: "This is an example of an Item",
        guid: "1102345",
        guid_isPermaLink: "false",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        channel: "This is an example of an RSS feed",
        channel_item: "instance foo",
        parent_id: opml_outline.reference,
        reference: promise_id,
        status: "ERROR",
        portal_type: "promise",
        active: true
      },
      rss_item_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0"),
      rss_item = {
        title: "instance foo",
        description: "This is an example of an RSS feed",
        link: "http://www.domain.com/link.htm",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        parent_id: opml_outline.reference,
        reference: rss_item_id,
        portal_type: "rss",
        active: true
      };

    test.jio.put(opml_doc.url, opml_doc)
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [
            [opml_doc.url, opml_doc],
            [opml_outline.reference, opml_outline],
            [rss_item_id, rss_item],
            [promise_id, promise_item]
          ])
        ]);
      })
      .then(function () {
        rss_mock_options.mock.buildQuery = function () {
          return [{
            "id": "/0",
            "value": {},
            "doc": {
              "title": "instance foo",
              "description": "This is an example of an RSS feed",
              "link": "http://www.domain.com/link.htm",
              "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 ",
              "pubDate": "Tue, 29 Aug 2006 09:00:00 -0400"
            }
          }];
        };
        resetCount(opml_mock_options.count);
        resetCount(rss_mock_options.count);
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [
            [opml_doc.url, opml_doc],
            [opml_outline.reference, opml_outline],
            [rss_item_id, rss_item]
          ]),
          equalsubStorageCallCount(
            opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            rss_mock_options.count,
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

  //////////////////////////////////////////////////////////
  // complete sync - more than one opml with sub storages
  //////////////////////////////////////////////////////////
  test("multi opml storage sync", function () {
    expect(5);
    stop();

    var test = this,
      opml_doc = {
        title: "opml item foo",
        url: "http://example.com/opml.xml",
        portal_type: "opml",
        basic_login: "cred foo",
        active: true
      },
      opml_id = generateHash(opml_doc.url),
      opml_outline_id = "/1/0/0",
      opml_outline = {
        opml_title: "opml foo",
        dateCreated: "Thu, 12 Sep 2003 23:35:52 GMT",
        dateModified: "Fri, 12 Sep 2003 23:45:37 GMT",
        text: "instance foo",
        type: "link",
        htmlUrl: "http://example.com/",
        xmlUrl: "http://example.com/rss.xml",
        title: "opml item foo",
        portal_type: "opml-outline",
        parent_id: opml_id,
        parent_url: opml_doc.url,
        reference: generateHash(opml_id + opml_outline_id),
        active: true
      },
      promise_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0/0"),
      promise_item = {
        link: "http://www.domain.com/link.htm",
        title: "Item Example",
        category: "ERROR",
        description: "This is an example of an Item",
        guid: "1102345",
        guid_isPermaLink: "false",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        channel: "This is an example of an RSS feed",
        channel_item: "instance foo",
        parent_id: opml_outline.reference,
        reference: promise_id,
        status: "ERROR",
        portal_type: "promise",
        active: true
      },
      rss_item_id = generateHash(opml_outline.reference + opml_outline.xmlUrl +
                                 "/0"),
      rss_item = {
        title: "instance foo",
        description: "This is an example of an RSS feed",
        link: "http://www.domain.com/link.htm",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        parent_id: opml_outline.reference,
        reference: rss_item_id,
        portal_type: "rss",
        active: true
      },
      opml_doc2 = {
        title: "opml item bar",
        url: "http://example2.com/opml.xml",
        portal_type: "opml",
        basic_login: "cred bar",
        active: true
      },
      opml_id2 = generateHash(opml_doc2.url),
      opml_outline2 = {
        opml_title: "opml foo",
        dateCreated: "Thu, 12 Sep 2003 23:35:52 GMT",
        dateModified: "Fri, 12 Sep 2003 23:45:37 GMT",
        text: "instance foo",
        type: "link",
        htmlUrl: "http://example2.com/",
        xmlUrl: "http://example2.com/rss.xml",
        title: "opml item foo",
        portal_type: "opml-outline",
        parent_id: opml_id2,
        parent_url: opml_doc2.url,
        reference: generateHash(opml_id2 + opml_outline_id),
        active: true
      },
      promise_id2 = generateHash(opml_outline2.reference +
                                 opml_outline2.xmlUrl + "/0/0"),
      promise_item2 = {
        link: "http://www.domain.com/link.htm",
        title: "Item Example",
        category: "ERROR",
        description: "This is an example of an Item",
        guid: "11026875",
        guid_isPermaLink: "false",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        channel: "This is an example of an RSS feed",
        channel_item: "instance foo",
        parent_id: opml_outline2.reference,
        reference: promise_id2,
        status: "ERROR",
        portal_type: "promise",
        active: true
      },
      rss_item_id2 = generateHash(opml_outline2.reference +
                                  opml_outline2.xmlUrl + "/0"),
      rss_item2 = {
        title: "instance foo",
        description: "This is an example of an RSS feed",
        link: "http://www.domain.com/link.htm",
        lastBuildDate: "Mon, 28 Aug 2006 11:12:55 -0400 ",
        pubDate: "Tue, 29 Aug 2006 09:00:00 -0400",
        parent_id: opml_outline2.reference,
        reference: rss_item_id2,
        portal_type: "rss",
        active: true
      };

    opml_mock_options2 = {
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
    rss_mock_options2 = {
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

    test.jio.put(opml_doc.url, opml_doc)
      .then(function () {
        return test.jio.put(opml_doc2.url, opml_doc2);
      })
      .then(function () {
        return test.jio.repair();
      })
      .then(function () {
        return RSVP.all([
          equalStorage(test.jio, [
            [opml_doc.url, opml_doc],
            [opml_doc2.url, opml_doc2],
            [opml_outline.reference, opml_outline],
            [rss_item_id, rss_item],
            [promise_id, promise_item],
            [opml_outline2.reference, opml_outline2],
            [rss_item_id2, rss_item2],
            [promise_id2, promise_item2]
          ]),
          equalsubStorageCallCount(
            opml_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            rss_mock_options.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            opml_mock_options2.count,
            {buildQuery: 1}
          ),
          equalsubStorageCallCount(
            rss_mock_options2.count,
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