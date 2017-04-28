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
    domain = "http://opml.example.com",
    opml_url = domain + "/opml.xml";

  /////////////////////////////////////////////////////////////////
  // Opml constructor
  /////////////////////////////////////////////////////////////////
  module("OPMLStorage.constructor");

  test("Storage store URL", function () {
    var jio = jIO.createJIO({
      type: 'opml',
      url: opml_url
    });

    deepEqual(jio.__storage._url, opml_url);
  });

  /////////////////////////////////////////////////////////////////
  // OPMLStorage.get
  /////////////////////////////////////////////////////////////////

  module("OPMLStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: 'opml',
        url: opml_url
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get inexistent document", function () {
    this.server.respondWith("GET", opml_url, [404, {
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

  test("get document", function () {
    var id = "http://opml.example.com/feeds/syndication.xml",
      expected_dict = {
        "category": "",
        "create_date": "Thu, 12 Sep 2003 23:35:52 GMT",
        "created": "",
        "htmlurl": "",
        "modified_date": "Fri, 12 Sep 2003 23:45:37 GMT",
        "opml_link": "http://opml.example.com/opml.xml",
        "opml_title": "feedOnFeeds.xml",
        "owner_email": "newsfor@example.com",
        "owner_name": "SomeUser",
        "text": "Syndication News",
        "title": "",
        "type": "link",
        "url": "http://opml.example.com/feeds/syndication.xml",
        "version": "",
        "xmlurl": ""
      };

    this.server.respondWith("GET", opml_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="ISO-8859-1"?>' +
        '<opml version="1.0">' +
        '<head>' +
        '<title>feedOnFeeds.xml</title>' +
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
        '</opml>'
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
  // OPMLStorage.allDocs
  /////////////////////////////////////////////////////////////////

  module("OPMLStorage.allDocs", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: 'opml',
        url: opml_url
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get all document with include_docs false", function () {
    var expected_dict = {
        "data": {
          "rows": [
            {
              "id": "http://opml.example.com/feeds/mobile.xml",
              "value": {}
            },
            {
              "id": "http://opml.example.com/feeds/syndication.xml",
              "value": {}
            }
          ],
          "total_rows": 2
        }
      };

    this.server.respondWith("GET", opml_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="ISO-8859-1"?>' +
        '<opml version="1.0">' +
        '<head>' +
        '<title>feedOnFeeds.xml</title>' +
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
        '</body>' +
        '</opml>'
      ]);

    stop();
    expect(1);

    this.jio.allDocs({include_docs: false})
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

  test("get all documents", function () {
    var expected_dict = {
        "data": {
          "rows": [
            {
              "doc": {
                "category": "",
                "create_date": "Thu, 12 Sep 2003 23:35:52 GMT",
                "created": "",
                "htmlurl": "",
                "modified_date": "Fri, 12 Sep 2003 23:45:37 GMT",
                "opml_link": "http://opml.example.com/opml.xml",
                "opml_title": "feedOnFeeds.xml",
                "owner_email": "newsfor@example.com",
                "owner_name": "SomeUser",
                "text": "Mobile News",
                "title": "",
                "type": "link",
                "url": "http://opml.example.com/feeds/mobile.xml",
                "version": "",
                "xmlurl": ""
              },
              "id": "http://opml.example.com/feeds/mobile.xml",
              "value": {}
            },
            {
              "doc": {
                "category": "",
                "create_date": "Thu, 12 Sep 2003 23:35:52 GMT",
                "created": "",
                "htmlurl": "",
                "modified_date": "Fri, 12 Sep 2003 23:45:37 GMT",
                "opml_link": "http://opml.example.com/opml.xml",
                "opml_title": "feedOnFeeds.xml",
                "owner_email": "newsfor@example.com",
                "owner_name": "SomeUser",
                "text": "Syndication News",
                "title": "",
                "type": "link",
                "url": "http://opml.example.com/feeds/syndication.xml",
                "version": "",
                "xmlurl": ""
              },
              "id": "http://opml.example.com/feeds/syndication.xml",
              "value": {}
            },
            {
              "doc": {
                "category": "",
                "create_date": "Thu, 12 Sep 2003 23:35:52 GMT",
                "created": "",
                "htmlurl": "",
                "modified_date": "Fri, 12 Sep 2003 23:45:37 GMT",
                "opml_link": "http://opml.example.com/opml.xml",
                "opml_title": "feedOnFeeds.xml",
                "owner_email": "newsfor@example.com",
                "owner_name": "SomeUser",
                "text": "Politics",
                "title": "",
                "type": "link",
                "url": "http://opml.example.com/feeds/politics.xml",
                "version": "",
                "xmlurl": ""
              },
              "id": "http://opml.example.com/feeds/politics.xml",
              "value": {}
            },
            {
              "doc": {
                "category": "",
                "create_date": "Thu, 12 Sep 2003 23:35:52 GMT",
                "created": "",
                "htmlurl": "",
                "modified_date": "Fri, 12 Sep 2003 23:45:37 GMT",
                "opml_link": "http://opml.example.com/opml.xml",
                "opml_title": "feedOnFeeds.xml",
                "owner_email": "newsfor@example.com",
                "owner_name": "SomeUser",
                "text": "Sports",
                "title": "",
                "type": "link",
                "url": "http://opml.example.com/feeds/sports.xml",
                "version": "",
                "xmlurl": ""
              },
              "id": "http://opml.example.com/feeds/sports.xml",
              "value": {}
            },
            {
              "doc": {
                "category": "",
                "create_date": "Thu, 12 Sep 2003 23:35:52 GMT",
                "created": "",
                "htmlurl": "",
                "modified_date": "Fri, 12 Sep 2003 23:45:37 GMT",
                "opml_link": "http://opml.example.com/opml.xml",
                "opml_title": "feedOnFeeds.xml",
                "owner_email": "newsfor@example.com",
                "owner_name": "SomeUser",
                "text": "Weather",
                "title": "",
                "type": "link",
                "url": "http://opml.example.com/feeds/weather.xml",
                "version": "",
                "xmlurl": ""
              },
              "id": "http://opml.example.com/feeds/weather.xml",
              "value": {}
            },
            {
              "doc": {
                "category": "",
                "create_date": "Thu, 12 Sep 2003 23:35:52 GMT",
                "created": "",
                "htmlurl": "",
                "modified_date": "Fri, 12 Sep 2003 23:45:37 GMT",
                "opml_link": "http://opml.example.com/opml.xml",
                "opml_title": "feedOnFeeds.xml",
                "owner_email": "newsfor@example.com",
                "owner_name": "SomeUser",
                "text": "Entertainment",
                "title": "",
                "type": "link",
                "url": "http://opml.example.com/feeds/ent.xml",
                "version": "",
                "xmlurl": ""
              },
              "id": "http://opml.example.com/feeds/ent.xml",
              "value": {}
            }
          ],
          "total_rows": 6
        }
      };

    this.server.respondWith("GET", opml_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="ISO-8859-1"?>' +
        '<opml version="1.0">' +
        '<head>' +
        '<title>feedOnFeeds.xml</title>' +
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
        '</opml>'
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

}(jIO, QUnit, sinon));