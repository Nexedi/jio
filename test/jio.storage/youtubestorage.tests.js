/*jslint nomen: true */
/*global Blob, sinon, JSON*/
(function (jIO, QUnit, sinon, JSON) {
  "use strict";

  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    query = "",
    api_key = "sample_key",
    sample_id = "sample_id",
    token = "sample_token",
    domain = "https://www.googleapis.com/youtube/v3/",
    get_reply = {
      "kind": "youtube#videoListResponse",
      "pageInfo": {"totalResults": 1, "resultsPerPage": 1},
      "items": [{"kind": "youtube#video", "id": "sample_id"}]
    };

  function getSample() {
    return JSON.stringify({
      "nextPageToken": "sample_token",
      "items": [{"id": "0B4kh3jbjOf5LamRlX21MZ"}]
    });
  }
  function getSampleCont() {
    return JSON.stringify({"items": [{"id": "0B4kh3jbjOf5LamRlVCYXM"}]});
  }
  function getUrl() {
    return domain + "videos?part=snippet,statistics,contentDetails" +
      "&id=" + sample_id + "&key=" + api_key;
  }
  function listUrl(token) {
    return domain + "search?part=snippet&pageToken=" + token +
      "&q=" + query + "&type=video&maxResults=10&key=" + api_key;
  }
  function getItem(id) {
    return {"id": id, "value": {}};
  }
  function getResponse(item, has_token) {
    var obj = {"data": {"rows": [], "total_rows": 1}};
    obj.data.rows.push(item);
    if (has_token) {
      obj.nextPageToken = token;
    }
    return obj;
  }

  function error404Tester(fun, encl, blob) {
    stop();
    expect(3);

    this.jio[fun]("inexistent", encl ? "enclosure" : undefined,
                  blob || undefined)
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: inexistent");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  }

  /////////////////////////////////////////////////////////////////
  // Youtube Storage constructor
  /////////////////////////////////////////////////////////////////
  module("Youtube Storage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "youtube",
      api_key: api_key
    });
    equal(jio.__type, "youtube");
    deepEqual(jio.__storage._api_key, api_key);
  });

  /////////////////////////////////////////////////////////////////
  // Youtube Storage.get
  /////////////////////////////////////////////////////////////////
  module("Youtube Storage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "youtube",
        api_key: api_key
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get inexistent document", function () {
    var tester = error404Tester.bind(this);
    tester("get");
  });

  test("get document", function () {
    var url = getUrl(),
      body = get_reply;

    this.server.respondWith("GET", url, [200, {
      "Content-Type": "application/json; charset=UTF-8"
    }, JSON.stringify(body)
                                        ]);
    stop();
    expect(1);

    this.jio.get(sample_id)
      .then(function (result) {
        deepEqual(result, get_reply);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // Youtube Storage.allDocs
  /////////////////////////////////////////////////////////////////
  module("Youtube Storage.allDocs", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "youtube",
        api_key: api_key
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get all docs", function () {
    var object_result_1 = getResponse(getItem("0B4kh3jbjOf5LamRlVCYXM")),
      server = this.server;

    this.server.respondWith("GET", listUrl(""), [200, {
    }, getSampleCont()]);
    stop();
    expect(7);

    this.jio.allDocs()
      .then(function (res) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, listUrl(""));
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, getSampleCont());
        deepEqual(res, object_result_1);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allDocs with sequential API requests (nextPageToken)", function () {
    var context = this,
      server = this.server,
      object_result_2;

    this.server.respondWith("GET", listUrl("sample_token"), [200, {
    }, getSampleCont()]);
    this.server.respondWith("GET", listUrl(""), [200, {
    }, getSample()]);
    stop();
    expect(14);

    object_result_2 = getResponse(getItem("0B4kh3jbjOf5LamRlX21MZ", true));

    context.jio.allDocs()
      .then(function (res) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, listUrl(""));
        equal(server.requests[0].status, 200);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].responseText, getSample());
        deepEqual(res, object_result_2);

        object_result_2 = getResponse(getItem("0B4kh3jbjOf5LamRlVCYXM"));
        return context.jio.allDocs({"token": token});
      })
      .then(function (res) {
        equal(server.requests.length, 2);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, listUrl(token));
        equal(server.requests[1].status, 200);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].responseText, getSampleCont());
        deepEqual(res, object_result_2);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, sinon, JSON));
