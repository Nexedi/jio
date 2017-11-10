/*jslint nomen: true */
/*global Blob, sinon*/
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
    throws = QUnit.throws,
    token = "sample_token",
    user_id = "sample_user_id";

  /////////////////////////////////////////////////////////////////
  // Facebook Storage constructor
  /////////////////////////////////////////////////////////////////

  module("FacebookStorage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "facebook",
      access_token: token,
      user_id: user_id
    });
    equal(jio.__type, "facebook");
    deepEqual(jio.__storage._access_token, token);
    deepEqual(jio.__storage._user_id, user_id);
  });

  test("reject non string token", function () {

    throws(
      function () {
        jIO.createJIO({
          type: "facebook",
          access_token: 42,
          user_id: user_id,
          default_field_list: ['id', 'message', 'created_time']
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(error.message,
          "Access Token must be a string which contains more than " +
          "one character.");
        return true;
      }
    );
  });

  test("reject non string user_id", function () {

    throws(
      function () {
        jIO.createJIO({
          type: "facebook",
          access_token: '42',
          user_id: 1
        });
      },
      function (error) {
        ok(error instanceof TypeError);
        equal(error.message,
          "User ID must be a string which contains more than one " +
          "character.");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // Facebook Storage.get
  /////////////////////////////////////////////////////////////////
  module("FacebookStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "facebook",
        access_token: token,
        user_id: user_id,
        default_field_list: ['id', 'created_time', 'message', 'story']
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get post", function () {
    var url = "https://graph.facebook.com/v2.9/sampleID" +
      "?fields=id,created_time,message,story&access_token=sample_token",
      body = '{"id": "sampleID",' +
      '"created_time": "2017-07-13T09:37:13+0000",' +
      '"message": "Test post", "story": "test"}';

    this.server.respondWith("GET", url, [200, {
      "Content-Type": "text/xml"
    }, body
                                        ]);
    stop();
    expect(1);

    this.jio.get("sampleID")
      .then(function (result) {
        deepEqual(result,
                  {"id": "sampleID",
                   "created_time": "2017-07-13T09:37:13+0000",
                   "message": "Test post",
                   "story": "test"}, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // Facebook Storage.allDocs
  /////////////////////////////////////////////////////////////////
  module("FacebookStorage.allDocs", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "facebook",
        access_token: token,
        user_id: user_id,
        default_field_list: ["id", "message", "created_time"]
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get all posts with single page returned", function () {
    var url1 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields' +
      '=created_time,id,message,link&limit=500&since=&access_token=' +
      'sample_token',
      url2 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields=' +
      'created_time,id,message,link&limit=500&since=&access_token=' +
      'sample_token&__paging_token=sample_paging_token',
      body1 = '{"data": [{"created_time": "2016", "id": "1", ' +
      '"message": "Test 1", "link": "https://test.com", ' +
      '"story": "Test story"}, {"created_time": "2016", "id": "2", ' +
      '"message": "Test 2", "link": "https://jio.com", "story": "Test post"}' +
      ', {"created_time": "2016", "id":"3", "message": "Test 3", ' +
      '"link": "https://renderjs.com", "story": "Test story"}], ' +
      '"paging": {"next": "' + url2 + '", "previous": null}}',
      body2 = '{"data": [], "paging": {"next": null, "previous": null}}',
      server = this.server,
      return_object = {"data": {
        "rows": [
          {
            "id": "1",
            "value": {
              "created_time":  "2016",
              "id":  "1",
              "message":  "Test 1",
              "link":  "https://test.com"
            }
          },
          {
            "id": "2",
            "value":  {
              "created_time":  "2016",
              "id":  "2",
              "message":  "Test 2",
              "link":  "https://jio.com"
            }
          },
          {
            "id": "3",
            "value":  {
              "created_time":  "2016",
              "id":  "3",
              "message":  "Test 3",
              "link":  "https://renderjs.com"
            }
          }
        ],
        "total_rows": 3
      }
        };
    this.server.respondWith("GET", url1, [200, {
      "Content-Type": "text/xml"
    }, body1
                                         ]);
    this.server.respondWith("GET", url2, [200, {
      "Content-Type": "text/xml"
    }, body2
                                         ]);
    stop();
    expect(10);

    this.jio.allDocs({select_list: ["created_time", "id", "message",
      "link"]})
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[1].method, "GET");
        equal(server.requests[0].url, url1);
        equal(server.requests[1].url, url2);
        equal(server.requests[0].status, 200);
        equal(server.requests[1].status, 200);
        equal(server.requests[0].responseText, body1);
        equal(server.requests[1].responseText, body2);
        deepEqual(result, return_object);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all posts with multiple paged result", function () {
    var url1 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields' +
      '=created_time,id,message,link&limit=500&since=&access_token=' +
      'sample_token',
      url2 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields=' +
      'created_time,id,message,link&limit=500&since=&access_token=' +
      'sample_token&__paging_token=sample_paging_token1',
      url3 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields=' +
      'created_time,id,message,link&limit=500&since=&access_token=' +
      'sample_token&__paging_token=sample_paging_token2',
      body1 = '{"data": [{"created_time": "2016", "id": "1", ' +
      '"message": "Test 1", "link": "https://test.com"}, {"created_time": ' +
      '"2016", "id": "2", "message": "Test 2", "link": ' +
      '"https://jio.com"}, {"created_time": "2016", "id": "3", ' +
      '"message": "Test 3", "link": "https://renderjs.com"}], "paging": ' +
      '{"next": "' + url2 + '", "previous": null}}',
      body2 = '{"data": [{"created_time": "2016", "id": "4", "message": "Test' +
      ' 4", "link": null}], "paging": {"next": "' + url3 + '", "previous": ' +
      'null}}',
      body3 = '{"data": [], "paging": {"next": null, "previous": null}}',
      server = this.server,
      return_object = {"data": {
        "rows": [
          {
            "id": "1",
            "value": {
              "created_time":  "2016",
              "id":  "1",
              "link":  "https://test.com",
              "message":  "Test 1"
            }
          },
          {
            "id": "2",
            "value":  {
              "created_time":  "2016",
              "id":  "2",
              "link":  "https://jio.com",
              "message":  "Test 2"
            }
          },
          {
            "id": "3",
            "value":  {
              "created_time":  "2016",
              "id":  "3",
              "link":  "https://renderjs.com",
              "message":  "Test 3"
            }
          },
          {
            "id": "4",
            "value": {
              "created_time": "2016",
              "id": "4",
              "link": null,
              "message": "Test 4"
            }
          }
        ],
        "total_rows": 4
      }
        };
    this.server.respondWith("GET", url1, [200, {
      "Content-Type": "text/xml"
    }, body1
                                         ]);
    this.server.respondWith("GET", url2, [200, {
      "Content-Type": "text/xml"
    }, body2
                                         ]);
    this.server.respondWith("GET", url3, [200, {
      "Content-Type": "text/xml"
    }, body3
                                         ]);
    stop();
    expect(8);

    this.jio.allDocs({select_list: ["created_time", "id", "message",
      "link"]})
      .then(function (result) {
        equal(server.requests.length, 3);
        equal(server.requests[0].url, url1);
        equal(server.requests[1].url, url2);
        equal(server.requests[2].url, url3);
        equal(server.requests[0].responseText, body1);
        equal(server.requests[1].responseText, body2);
        equal(server.requests[2].responseText, body3);
        deepEqual(result, return_object);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all posts without parameter", function () {
    var url1 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields' +
      '=&limit=500&since=&access_token=' +
      'sample_token',
      url2 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields' +
      '=&limit=500&since=&access_token=' +
      'sample_token&__paging_token=sample_paging_token',
      body1 = '{"data": [{"created_time": "2016", "id": "1", ' +
      '"message": "Test 1"}, {"created_time": "2016", "id": "2", "message": ' +
      '"Test 2"}, {"created_time": "2016", "id": "3", "message": "Test 3"}]' +
      ', "paging": {"next": "' + url2 + '", "previous": null}}',
      body2 = '{"data": [], "paging": {"next": null, "previous": null}}',
      server = this.server,
      return_object = {"data": {
        "rows": [
          {
            "id": "1",
            "value": {}
          },
          {
            "id": "2",
            "value":  {}
          },
          {
            "id": "3",
            "value":  {}
          }
        ],
        "total_rows": 3
      }
        };
    this.server.respondWith("GET", url1, [200, {
      "Content-Type": "text/xml"
    }, body1
                                         ]);
    this.server.respondWith("GET", url2, [200, {
      "Content-Type": "text/xml"
    }, body2
                                         ]);
    stop();
    expect(10);

    this.jio.allDocs()
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[1].method, "GET");
        equal(server.requests[0].url, url1);
        equal(server.requests[1].url, url2);
        equal(server.requests[0].status, 200);
        equal(server.requests[1].status, 200);
        equal(server.requests[0].responseText, body1);
        equal(server.requests[1].responseText, body2);
        deepEqual(result, return_object);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all posts with include_docs", function () {
    var url1 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields' +
      '=id,message,created_time&limit=500&since=&access_token=' +
      'sample_token',
      url2 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields=' +
      'id,message,created_time&limit=500&since=&access_token=' +
      'sample_token&__paging_token=sample_paging_token',
      body1 = '{"data": [{"created_time": "2016", "id": "1", "message": "Test' +
      ' 1"}, {"created_time": "2016", "id": "2", "message": "Test 2"}, ' +
      '{"created_time": "2016", "id": "3", "message": "Test 3"}], "paging": ' +
      '{"next": "' + url2 + '", "previous": null}}',
      body2 = '{"data": [], "paging": {"next": null, "previous": null}}',
      server = this.server,
      return_object = {"data": {
        "rows": [
          {
            "id": "1",
            "value": {
              "created_time":  "2016",
              "id":  "1",
              "message":  "Test 1"
            }
          },
          {
            "id": "2",
            "value":  {
              "created_time":  "2016",
              "id":  "2",
              "message":  "Test 2"
            }
          },
          {
            "id": "3",
            "value":  {
              "created_time":  "2016",
              "id":  "3",
              "message":  "Test 3"
            }
          }
        ],
        "total_rows": 3
      }
        };
    this.server.respondWith("GET", url1, [200, {
      "Content-Type": "text/xml"
    }, body1
                                         ]);
    this.server.respondWith("GET", url2, [200, {
      "Content-Type": "text/xml"
    }, body2
                                         ]);
    stop();
    expect(10);

    this.jio.allDocs({include_docs: true})
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[1].method, "GET");
        equal(server.requests[0].url, url1);
        equal(server.requests[1].url, url2);
        equal(server.requests[0].status, 200);
        equal(server.requests[1].status, 200);
        equal(server.requests[0].responseText, body1);
        equal(server.requests[1].responseText, body2);
        deepEqual(result, return_object);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all posts with include_docs and select_list", function () {
    var url1 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields=id' +
        ',message,created_time,story&limit=500&since=&acces' +
        's_token=sample_token',
      url2 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields=' +
        'id,message,story,created_time&limit=500&since=&acc' +
        'ess_token=sample_token&__paging_token=sample_paging_token',
      body1 = '{"data": [{"created_time": "2016", "id": "1", ' +
        '"message": "Test 1", "story": "Test story"}, {"created_time": "2016"' +
        ', "id": "2", "message": "Test 2", "story": "Test story"}, ' +
        '{"created_time": "2016", "id": "3", "message": "Test 3", ' +
        '"story": "Test story"}], "paging": {"next": "' + url2 + '",' +
        '"previous": null}}',
      body2 = '{"data": [], "paging": {"next": null, "previous": null}}',
      server = this.server,
      return_object = {"data": {
        "rows": [
          {
            "id": "1",
            "value": {
              "created_time":  "2016",
              "id":  "1",
              "message":  "Test 1",
              "story": "Test story"
            }
          },
          {
            "id": "2",
            "value":  {
              "created_time":  "2016",
              "id":  "2",
              "message":  "Test 2",
              "story": "Test story"
            }
          },
          {
            "id": "3",
            "value":  {
              "created_time":  "2016",
              "id":  "3",
              "message":  "Test 3",
              "story": "Test story"
            }
          }
        ],
        "total_rows": 3
      }
        };
    this.server.respondWith("GET", url1, [200, {
      "Content-Type": "text/xml"
    }, body1
                                         ]);
    this.server.respondWith("GET", url2, [200, {
      "Content-Type": "text/xml"
    }, body2
                                         ]);
    stop();
    expect(10);

    this.jio.allDocs({select_list: ['story'], include_docs: true})
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[1].method, "GET");
        equal(server.requests[0].url, url1);
        equal(server.requests[1].url, url2);
        equal(server.requests[0].status, 200);
        equal(server.requests[1].status, 200);
        equal(server.requests[0].responseText, body1);
        equal(server.requests[1].responseText, body2);
        deepEqual(result, return_object);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all posts with limit", function () {
    var url1 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields' +
        '=&limit=5&since=&access_token=' +
        'sample_token',
      url2 = 'https://graph.facebook.com/v2.9/sample_user_id/feed?fields' +
        '=&limit=5&since=&access_token=' +
        'sample_token&__paging_token=sample_paging_token',
      body1 = '{"data": [{"created_time": "2016", "id": "1", ' +
        '"message": "Test 1"}, {"created_time": "2016", "id": "2", ' +
        '"message": "Test 2"}, {"created_time": "2016", "id": "3", ' +
        '"message": "Test 3"}, {"created_time": "2016", "id": "4", ' +
        '"message": "Test 4"}, {"created_time": "2016", "id": "5", ' +
        '"message": "Test 5"}, {"created_time": "2016", "id": "6", ' +
        '"message": "Test 6"}, {"created_time": "2016", "id": "7", ' +
        '"message": "Test 7"}], "paging": {"next":"' + url2 + '", ' +
        '"previous": null}}',
      body2 = '{"data": [], "paging": {"next": null, "previous": null}}',
      server = this.server,
      return_object = {"data": {
        "rows": [
          {
            "id": "3",
            "value": {}
          },
          {
            "id": "4",
            "value":  {}
          },
          {
            "id": "5",
            "value":  {}
          }
        ],
        "total_rows": 3
      }
        };
    this.server.respondWith("GET", url1, [200, {
      "Content-Type": "text/xml"
    }, body1
                                         ]);
    this.server.respondWith("GET", url2, [200, {
      "Content-Type": "text/xml"
    }, body2
                                         ]);
    stop();
    expect(10);

    this.jio.allDocs({'limit': [2, 5]})
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[1].method, "GET");
        equal(server.requests[0].url, url1);
        equal(server.requests[1].url, url2);
        equal(server.requests[0].status, 200);
        equal(server.requests[1].status, 200);
        equal(server.requests[0].responseText, body1);
        equal(server.requests[1].responseText, body2);
        deepEqual(result, return_object);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, sinon));