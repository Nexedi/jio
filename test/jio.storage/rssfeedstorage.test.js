/*jslint nomen: true */
/*global jIO, QUnit, sinon*/
(function (jIO, QUnit, sinon) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    domain = "https://example.org",
    feed_url = domain + "/feed.xml";

  /////////////////////////////////////////////////////////////////
  // Feed constructor
  /////////////////////////////////////////////////////////////////
  module("RSSStorage.constructor");

  test("Storage store URL", function () {
    var jio = jIO.createJIO({
      type: 'rss',
      url: feed_url
    });

    deepEqual(jio.__storage._url, feed_url);
  });

  /////////////////////////////////////////////////////////////////
  // RSSStorage.get
  /////////////////////////////////////////////////////////////////

  module("RSSStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: 'rss',
        url: feed_url
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get inexistent document", function () {
    this.server.respondWith("GET", feed_url, [404, {
      "Content-Type": "text/html"
    }, "foo"]);

    stop();
    expect(3);

    this.jio.get('nofounditem')
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get inexistent rss entry", function () {
    this.server.respondWith("GET", feed_url, [404, {
      "Content-Type": "text/html"
    }, '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<rss version="2.0">' +
        '<channel>' +
        '<title>RSS Example</title>' +
        '<description>This is an example of an RSS feed</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<lastBuildDate>Mon, 28 Aug 2006 11:12:55 -0400 </lastBuildDate>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '<item>' +
        '<title>Item Example</title>' +
        '<description>This is an example of an Item</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<guid isPermaLink="false">1102345</guid>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '</item>' +
        '</channel>' +
        '</rss>'
      ]);

    stop();
    expect(3);

    this.jio.get('BAD_RSS_GUID')
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get document", function () {
    var id = "1102345",
      expected_dict = {
        "author": undefined,
        "category": undefined,
        "comments": undefined,
        "date": "Tue, 29 Aug 2006 09:00:00 -0400",
        "description": "This is an example of an Item",
        "guid": "1102345",
        "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 ",
        "link": "http://www.domain.com/link.htm",
        "reference": "This is an example of an RSS feed",
        "siteDocs": undefined,
        "siteGenerator": undefined,
        "siteLink": "http://www.domain.com/link.htm",
        "siteTitle": "RSS Example",
        "source": undefined,
        "sourceUrl": undefined,
        "title": "Item Example"
      };

    this.server.respondWith("GET", feed_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<rss version="2.0">' +
        '<channel>' +
        '<title>RSS Example</title>' +
        '<description>This is an example of an RSS feed</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<lastBuildDate>Mon, 28 Aug 2006 11:12:55 -0400 </lastBuildDate>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '<item>' +
        '<title>Item Example</title>' +
        '<description>This is an example of an Item</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<guid isPermaLink="false">1102345</guid>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '</item>' +
        '<item>' +
        '<title>Item Example</title>' +
        '<description>This is another example of an Item</description>' +
        '<link>http://www.domain.com/link2.htm</link>' +
        '<guid isPermaLink="false">11023-258</guid>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '</item>' +
        '</channel>' +
        '</rss>'
      ]);

    stop();
    expect(1);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, expected_dict, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // RSSStorage.allDocs
  /////////////////////////////////////////////////////////////////

  module("RSSStorage.allDocs", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: 'rss',
        url: feed_url
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("empty documents", function () {
    var expected_dict = {
        "data": {
          "rows": [],
          "total_rows": 0
        }
      };
    this.server.respondWith("GET", feed_url, [200, {
      "Content-Type": "text/html"
    }, '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<rss version="2.0">' +
        '<channel>' +
        '</channel>' +
        '</rss>'
      ]);

    stop();
    expect(1);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, expected_dict, "Check documents");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents", function () {
    var expected_dict = {
        "data": {
          "rows": [
            {
              "doc": {
                "author": undefined,
                "category": undefined,
                "comments": undefined,
                "date": "Tue, 29 Aug 2006 09:00:00 -0400",
                "description": "This is an example of an Item",
                "guid": "1102345",
                "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 ",
                "link": "http://www.domain.com/link.htm",
                "reference": "This is an example of an RSS feed",
                "siteDocs": undefined,
                "siteGenerator": undefined,
                "siteLink": "http://www.domain.com/link.htm",
                "siteTitle": "RSS Example",
                "source": undefined,
                "sourceUrl": undefined,
                "title": "Item Example"
              },
              "id": "1102345",
              "value": {}
            },
            {
              "doc": {
                "author": undefined,
                "category": undefined,
                "comments": undefined,
                "date": "Tue, 29 Aug 2006 09:00:00 -0400",
                "description": "This is another example of an Item",
                "guid": "11023-258",
                "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 ",
                "link": "http://www.domain.com/link2.htm",
                "reference": "This is an example of an RSS feed",
                "siteDocs": undefined,
                "siteGenerator": undefined,
                "siteLink": "http://www.domain.com/link.htm",
                "siteTitle": "RSS Example",
                "source": undefined,
                "sourceUrl": undefined,
                "title": "Item Example"
              },
              "id": "11023-258",
              "value": {}
            }
          ],
          "total_rows": 2
        }
      };

    this.server.respondWith("GET", feed_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<rss version="2.0">' +
        '<channel>' +
        '<title>RSS Example</title>' +
        '<description>This is an example of an RSS feed</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<lastBuildDate>Mon, 28 Aug 2006 11:12:55 -0400 </lastBuildDate>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '<item>' +
        '<title>Item Example</title>' +
        '<description>This is an example of an Item</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<guid isPermaLink="false">1102345</guid>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '</item>' +
        '<item>' +
        '<title>Item Example</title>' +
        '<description>This is another example of an Item</description>' +
        '<link>http://www.domain.com/link2.htm</link>' +
        '<guid isPermaLink="false">11023-258</guid>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '</item>' +
        '</channel>' +
        '</rss>'
      ]);

    stop();
    expect(1);

    this.jio.allDocs({include_docs: true})
      .then(function (result) {
        deepEqual(result, expected_dict, "Check documents");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents with include_docs false", function () {
    var expected_dict = {
        "data": {
          "rows": [
            {
              "id": "1102345",
              "value": {}
            }
          ],
          "total_rows": 1
        }
      };

    this.server.respondWith("GET", feed_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<rss version="2.0">' +
        '<channel>' +
        '<title>RSS Example</title>' +
        '<description>This is an example of an RSS feed</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<lastBuildDate>Mon, 28 Aug 2006 11:12:55 -0400 </lastBuildDate>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '<item>' +
        '<title>Item Example</title>' +
        '<description>This is an example of an Item</description>' +
        '<link>http://www.domain.com/link.htm</link>' +
        '<guid isPermaLink="false">1102345</guid>' +
        '<pubDate>Tue, 29 Aug 2006 09:00:00 -0400</pubDate>' +
        '</item>' +
        '</channel>' +
        '</rss>'
      ]);

    stop();
    expect(1);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, expected_dict, "Check documents");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, sinon));