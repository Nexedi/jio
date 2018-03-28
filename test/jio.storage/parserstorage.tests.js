/*jslint nomen: true */
/*global jIO, QUnit, Blob*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom RSS test substorage definition
  /////////////////////////////////////////////////////////////////
  function RSSStorage200() {
    return this;
  }

  RSSStorage200.prototype.getAttachment = function (id, name) {
    equal(id, 'foo');
    equal(name, 'bar');
    var txt = '<?xml version="1.0" encoding="UTF-8" ?>' +
      '<rss version="2.0">' +
      '<channel>' +
      // Add a text element to ensure xml parser handle it
      ' ' +
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
      '</rss>';
    return new Blob([txt]);
  };

  jIO.addStorage('rssstorage200', RSSStorage200);
  /////////////////////////////////////////////////////////////////
  // Custom atom test substorage definition
  /////////////////////////////////////////////////////////////////
  function ATOMStorage200() {
    return this;
  }

  ATOMStorage200.prototype.getAttachment = function (id, name) {
    equal(id, 'foo');
    equal(name, 'bar');
    var txt = '<?xml version="1.0" encoding="utf-8"?>' +
      '<feed xmlns="http://www.w3.org/2005/Atom">' +
      '<title>Example Feed</title>' +
      '<subtitle>A subtitle.</subtitle>' +
      '<link href="http://example.org/feed/" rel="self" />' +
      '<link href="http://example.org/" />' +
      '<id>urn:uuid:60a76c80-d399-11d9-b91C-0003939e0af6</id>' +
      '<updated>2003-12-13T18:30:02Z</updated>' +
      '<entry>' +
      '<id>tag:example.org,2018-03-29:81102</id>' +
      '<title>Atom-Powered Robots Run Amok</title>' +
      '<link href="/2003/12/13/atom03" />' +
      '<link rel="alternate" type="text/html" ' +
      'href="http://example.org/2003/12/13/atom03.html"/>' +
      '<link rel="edit" href="http://example.org/2003/12/13/atom03/edit"/>' +
      '<author>' +
      '<name>John Doe</name>' +
      '<email>johndoe@example.com</email>' +
      '</author>' +
      '<updated>2003-12-13T18:30:02Z</updated>' +
      '<summary>Some text.</summary>' +
      '</entry>' +
      '<entry>' +
      '<title>Atom-Powered Robots Run Amok</title>' +
      '<link href="http://example.org/2003/12/13/atom03" />' +
      '<link rel="alternate" type="text/html" ' +
      'href="http://example.org/2003/12/13/atom03.html"/>' +
      '<link rel="edit" href="http://example.org/2003/12/13/atom03/edit"/>' +
      '<id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>' +
      '<author>' +
      '<name>John Doe</name>' +
      '<email>johndoe@example.com</email>' +
      '</author>' +
      '<updated>2004-12-13T18:30:02Z</updated>' +
      '<summary>Some text.</summary>' +
      '</entry>' +
      '</feed>';
    return new Blob([txt]);
  };

  jIO.addStorage('atomstorage200', ATOMStorage200);
  /////////////////////////////////////////////////////////////////
  // Custom OPML test substorage definition
  /////////////////////////////////////////////////////////////////
  function OPMLStorage200() {
    return this;
  }

  OPMLStorage200.prototype.getAttachment = function (id, name) {
    equal(id, 'foo');
    equal(name, 'bar');
    var txt = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
      '<opml version="1.0">' +
      '<head>' +
      '<title>feedOnFeeds.xml</title>' +
      // Add a text element to ensure xml parser handle it
      ' ' +
      '<dateCreated>Thu, 12 Sep 2003 23:35:52 GMT</dateCreated>' +
      '<dateModified>Fri, 12 Sep 2003 23:45:37 GMT</dateModified>' +
      '<ownerName>SomeUser</ownerName>' +
      '<ownerEmail>newsfor@example.com</ownerEmail>' +
      '<link>http://opml.example.com/opml.xml</link>' +
      '</head>' +
      '<body>' +
      '<outline text="Sample OPML">' +
      '<outline text="Mobile News"  type="link" url="http://opml.example.' +
      'com/feeds/mobile.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT"/>' +
      '<outline text="Syndication News"  type="link" url="http://opml.examp' +
      'le.com/feeds/syndication.xml" dateCreated="Thu, 12 Sep 2003 23:35:52' +
      'GMT"/>' +
      '</outline>' +
      '<outline text="World News">' +
      '<outline text="Politics"  type="link" url="http://opml.example.com/' +
      'feeds/politics.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT"/>' +
      '<outline text="Sports"  type="link" url="http://opml.example.com/fee' +
      'ds/sports.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT"/>' +
      '</outline>' +
      '<outline text="Various">' +
      '<outline text="Weather"  type="link" url="http://opml.example.com/fe' +
      'eds/weather.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT"/>' +
      '<outline text="Entertainment"  type="link" url="http://opml.example.' +
      'com/feeds/ent.xml" dateCreated="Thu, 12 Sep 2003 23:35:52 GMT"/>' +
      '</outline>' +
      '</body>' +
      '</opml>';
    return new Blob([txt]);
  };

  jIO.addStorage('opmlstorage200', OPMLStorage200);

  /////////////////////////////////////////////////////////////////
  // Constructor
  /////////////////////////////////////////////////////////////////
  module("ParserStorage.constructor");

  test("Storage stores parameters", function () {
    var jio = jIO.createJIO({
      type: 'parser',
      document_id: 'fooname',
      attachment_id: 'barname',
      parser: 'fooparser',
      sub_storage: {
        type: 'memory'
      }
    });

    equal(jio.__storage._sub_storage.__type, "memory");
    equal(jio.__storage._document_id, "fooname");
    equal(jio.__storage._attachment_id, "barname");
    equal(jio.__storage._parser_name, "fooparser");
    equal(jio.__storage._parser, undefined);
  });

  /////////////////////////////////////////////////////////////////
  // ParserStorage.allDocs
  /////////////////////////////////////////////////////////////////
  module("ParserStorage.allDocs");

  test("get all IDs from RSS", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'rss',
      sub_storage: {
        type: 'rssstorage200'
      }
    });

    var expected_dict = {
      "data": {
        "rows": [
          {
            "id": "/0",
            "value": {}
          },
          {
            "id": "/0/0",
            "value": {}
          },
          {
            "id": "/0/1",
            "value": {}
          }
        ],
        "total_rows": 3
      }
    };

    stop();
    expect(3);

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

  test("get all documents from RSS", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'rss',
      sub_storage: {
        type: 'rssstorage200'
      }
    });

    var expected_dict = {
      "data": {
        "rows": [
          {
            "doc": {
              "description": "This is an example of an RSS feed",
              "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 ",
              "link": "http://www.domain.com/link.htm",
              "pubDate": "Tue, 29 Aug 2006 09:00:00 -0400",
              "title": "RSS Example"
            },
            "id": "/0",
            "value": {}
          },
          {
            "doc": {
              "description": "This is an example of an Item",
              "guid": "1102345",
              "guid_isPermaLink": "false",
              "link": "http://www.domain.com/link.htm",
              "pubDate": "Tue, 29 Aug 2006 09:00:00 -0400",
              "title": "Item Example"
            },
            "id": "/0/0",
            "value": {}
          },
          {
            "doc": {
              "description": "This is another example of an Item",
              "guid": "11023-258",
              "guid_isPermaLink": "false",
              "link": "http://www.domain.com/link2.htm",
              "pubDate": "Tue, 29 Aug 2006 09:00:00 -0400",
              "title": "Item Example"
            },
            "id": "/0/1",
            "value": {}
          }
        ],
        "total_rows": 3
      }
    };

    stop();
    expect(3);

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

  test("get all IDs from ATOM", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'atom',
      sub_storage: {
        type: 'atomstorage200'
      }
    });

    var expected_dict = {
      "data": {
        "rows": [
          {
            "id": "/0",
            "value": {}
          },
          {
            "id": "/0/0",
            "value": {}
          },
          {
            "id": "/0/1",
            "value": {}
          }
        ],
        "total_rows": 3
      }
    };

    stop();
    expect(3);

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

  test("get all documents from ATOM", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'atom',
      sub_storage: {
        type: 'atomstorage200'
      }
    });

    var expected_dict = {
      "data": {
        "rows": [
          {
            "doc": {
              "id": "urn:uuid:60a76c80-d399-11d9-b91C-0003939e0af6",
              "link": "http://example.org/feed/",
              "link_href": "http://example.org/feed/",
              "link_rel": "self",
              "subtitle": "A subtitle.",
              "title": "Example Feed",
              "updated": "2003-12-13T18:30:02Z"
            },
            "id": "/0",
            "value": {}
          },
          {
            "doc": {
              "author": "John Doejohndoe@example.com",
              "id": "tag:example.org,2018-03-29:81102",
              "link": "http://example.org/2003/12/13/atom03",
              "link_href": "/2003/12/13/atom03",
              "link_rel": "alternate",
              "link_type": "text/html",
              "summary": "Some text.",
              "title": "Atom-Powered Robots Run Amok",
              "updated": "2003-12-13T18:30:02Z"
            },
            "id": "/0/0",
            "value": {}
          },
          {
            "doc": {
              "author": "John Doejohndoe@example.com",
              "id": "urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a",
              "link": "http://example.org/2003/12/13/atom03",
              "link_href": "http://example.org/2003/12/13/atom03",
              "link_rel": "alternate",
              "link_type": "text/html",
              "summary": "Some text.",
              "title": "Atom-Powered Robots Run Amok",
              "updated": "2004-12-13T18:30:02Z"
            },
            "id": "/0/1",
            "value": {}
          }
        ],
        "total_rows": 3
      }
    };

    stop();
    expect(3);

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

  test("get all IDs from OPML", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'opml',
      sub_storage: {
        type: 'opmlstorage200'
      }
    });

    var expected_dict = {
      "data": {
        "rows": [
          {
            "id": "/0",
            "value": {}
          },
          {
            "id": "/1/0",
            "value": {}
          },
          {
            "id": "/1/0/1",
            "value": {}
          },
          {
            "id": "/1/0/0",
            "value": {}
          },
          {
            "id": "/1/1",
            "value": {}
          },
          {
            "id": "/1/1/1",
            "value": {}
          },
          {
            "id": "/1/1/0",
            "value": {}
          },
          {
            "id": "/1/2",
            "value": {}
          },
          {
            "id": "/1/2/1",
            "value": {}
          },
          {
            "id": "/1/2/0",
            "value": {}
          }
        ],
        "total_rows": 10
      }
    };

    stop();
    expect(3);

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

  test("get all documents from OPML", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'opml',
      sub_storage: {
        type: 'opmlstorage200'
      }
    });

    var expected_dict = {
      "data": {
        "rows": [
          {
            "doc": {
              "dateCreated": "Thu, 12 Sep 2003 23:35:52 GMT",
              "dateModified": "Fri, 12 Sep 2003 23:45:37 GMT",
              "link": "http://opml.example.com/opml.xml",
              "ownerEmail": "newsfor@example.com",
              "ownerName": "SomeUser",
              "title": "feedOnFeeds.xml"
            },
            "id": "/0",
            "value": {}
          },
          {
            "doc": {
              "text": "Sample OPML"
            },
            "id": "/1/0",
            "value": {}
          },
          {
            "doc": {
              "dateCreated": "Thu, 12 Sep 2003 23:35:52GMT",
              "text": "Syndication News",
              "type": "link",
              "url": "http://opml.example.com/feeds/syndication.xml"
            },
            "id": "/1/0/1",
            "value": {}
          },
          {
            "doc": {
              "dateCreated": "Thu, 12 Sep 2003 23:35:52 GMT",
              "text": "Mobile News",
              "type": "link",
              "url": "http://opml.example.com/feeds/mobile.xml"
            },
            "id": "/1/0/0",
            "value": {}
          },
          {
            "doc": {
              "text": "World News"
            },
            "id": "/1/1",
            "value": {}
          },
          {
            "doc": {
              "dateCreated": "Thu, 12 Sep 2003 23:35:52 GMT",
              "text": "Sports",
              "type": "link",
              "url": "http://opml.example.com/feeds/sports.xml"
            },
            "id": "/1/1/1",
            "value": {}
          },
          {
            "doc": {
              "dateCreated": "Thu, 12 Sep 2003 23:35:52 GMT",
              "text": "Politics",
              "type": "link",
              "url": "http://opml.example.com/feeds/politics.xml"
            },
            "id": "/1/1/0",
            "value": {}
          },
          {
            "doc": {
              "text": "Various"
            },
            "id": "/1/2",
            "value": {}
          },
          {
            "doc": {
              "dateCreated": "Thu, 12 Sep 2003 23:35:52 GMT",
              "text": "Entertainment",
              "type": "link",
              "url": "http://opml.example.com/feeds/ent.xml"
            },
            "id": "/1/2/1",
            "value": {}
          },
          {
            "doc": {
              "dateCreated": "Thu, 12 Sep 2003 23:35:52 GMT",
              "text": "Weather",
              "type": "link",
              "url": "http://opml.example.com/feeds/weather.xml"
            },
            "id": "/1/2/0",
            "value": {}
          }
        ],
        "total_rows": 10
      }
    };

    stop();
    expect(3);

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

  /////////////////////////////////////////////////////////////////
  // ParserStorage.get
  /////////////////////////////////////////////////////////////////
  module("ParserStorage.get");

  test("get RSS channel", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'rss',
      sub_storage: {
        type: 'rssstorage200'
      }
    });

    stop();
    expect(3);

    this.jio.get('/0')
      .then(function (result) {
        deepEqual(result, {
          "description": "This is an example of an RSS feed",
          "lastBuildDate": "Mon, 28 Aug 2006 11:12:55 -0400 ",
          "link": "http://www.domain.com/link.htm",
          "pubDate": "Tue, 29 Aug 2006 09:00:00 -0400",
          "title": "RSS Example"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get RSS item", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'rss',
      sub_storage: {
        type: 'rssstorage200'
      }
    });

    stop();
    expect(3);

    this.jio.get('/0/1')
      .then(function (result) {
        deepEqual(result, {
          "description": "This is another example of an Item",
          "guid": "11023-258",
          "guid_isPermaLink": "false",
          "link": "http://www.domain.com/link2.htm",
          "pubDate": "Tue, 29 Aug 2006 09:00:00 -0400",
          "title": "Item Example"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get unknown RSS item", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'rss',
      sub_storage: {
        type: 'rssstorage200'
      }
    });

    stop();
    expect(5);

    this.jio.get('foo')
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError, error);
        equal(error.message, "Cannot find parsed document: foo");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });
  test("get Atom feed", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'atom',
      sub_storage: {
        type: 'atomstorage200'
      }
    });

    stop();
    expect(3);

    this.jio.get('/0')
      .then(function (result) {
        deepEqual(result, {
          "id": "urn:uuid:60a76c80-d399-11d9-b91C-0003939e0af6",
          "link": "http://example.org/feed/",
          "link_href": "http://example.org/feed/",
          "link_rel": "self",
          "subtitle": "A subtitle.",
          "title": "Example Feed",
          "updated": "2003-12-13T18:30:02Z"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get ATOM entry", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'atom',
      sub_storage: {
        type: 'atomstorage200'
      }
    });

    stop();
    expect(3);

    this.jio.get('/0/1')
      .then(function (result) {
        deepEqual(result, {
          "author": "John Doejohndoe@example.com",
          "id": "urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a",
          "link": "http://example.org/2003/12/13/atom03",
          "link_href": "http://example.org/2003/12/13/atom03",
          "link_rel": "alternate",
          "link_type": "text/html",
          "summary": "Some text.",
          "title": "Atom-Powered Robots Run Amok",
          "updated": "2004-12-13T18:30:02Z"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get unknown atom entry", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'atom',
      sub_storage: {
        type: 'atomstorage200'
      }
    });

    stop();
    expect(5);

    this.jio.get('foo')
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError, error);
        equal(error.message, "Cannot find parsed document: foo");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

  test("get OPML head", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'opml',
      sub_storage: {
        type: 'opmlstorage200'
      }
    });

    stop();
    expect(3);

    this.jio.get('/0')
      .then(function (result) {
        deepEqual(result, {
          "dateCreated": "Thu, 12 Sep 2003 23:35:52 GMT",
          "dateModified": "Fri, 12 Sep 2003 23:45:37 GMT",
          "link": "http://opml.example.com/opml.xml",
          "ownerEmail": "newsfor@example.com",
          "ownerName": "SomeUser",
          "title": "feedOnFeeds.xml"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get OPML outline", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'opml',
      sub_storage: {
        type: 'opmlstorage200'
      }
    });

    stop();
    expect(3);

    this.jio.get('/1/0/1')
      .then(function (result) {
        deepEqual(result, {
          "dateCreated": "Thu, 12 Sep 2003 23:35:52GMT",
          "text": "Syndication News",
          "type": "link",
          "url": "http://opml.example.com/feeds/syndication.xml"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get unknown OPML outline", function () {
    this.jio = jIO.createJIO({
      type: 'parser',
      document_id: 'foo',
      attachment_id: 'bar',
      parser: 'opml',
      sub_storage: {
        type: 'opmlstorage200'
      }
    });

    stop();
    expect(5);

    this.jio.get('foo')
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError, error);
        equal(error.message, "Cannot find parsed document: foo");
        equal(error.status_code, 404);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
