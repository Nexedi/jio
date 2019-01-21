/*
 * Copyright 2019, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */
/*jslint nomen: true */
/*global Blob, sinon, FormData*/
(function (jIO, QUnit, Blob, sinon, FormData) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    equal = QUnit.equal,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module,
    domain = "https://example.org/foo";

  /////////////////////////////////////////////////////////////////
  // LinshareStorage constructor
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "linshare",
      url: "https://example.org/foo"
    });
    equal(jio.__type, "linshare");
    deepEqual(
      jio.__storage._url_template.templateText,
      "https://example.org/foo/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}"
    );
    deepEqual(
      jio.__storage._blob_template.templateText,
      "https://example.org/foo/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}/download"
    );
    equal(jio.__storage._credential_token, undefined);
  });

  test("create storage store access token", function () {
    var jio = jIO.createJIO({
      type: "linshare",
      url: "https://example.org/bar",
      access_token: "azerty"
    });
    equal(jio.__type, "linshare");
    deepEqual(
      jio.__storage._url_template.templateText,
      "https://example.org/bar/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}"
    );
    deepEqual(
      jio.__storage._blob_template.templateText,
      "https://example.org/bar/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}/download"
    );
    equal(jio.__storage._access_token, "azerty");
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage hasCapacity
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.hasCapacity", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "linshare",
        url: "https://example.org/foo"
      });
    }
  });

  test("check capacities", function () {
    ok(this.jio.hasCapacity("list"));
    ok(this.jio.hasCapacity("include"));
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.allDocs
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.allDocs", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get all documents", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2',
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1',
        }
      ]),
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    stop();
    expect(7);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              _linshare_uuid: "uuid1",
              id: "foo1",
              value: {}
            }, {
              _linshare_uuid: "uuid2",
              id: "foo2",
              value: {}
            }],
            total_rows: 2
          }
        }, "Check document");
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents with access token", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2',
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1',
        }
      ]),
      server = this.server,
      token = 'barfoobar';

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    stop();
    expect(7);

    this.jio = jIO.createJIO({
      type: "linshare",
      url: domain,
      access_token: token
    });

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              _linshare_uuid: "uuid1",
              id: "foo1",
              value: {}
            }, {
              _linshare_uuid: "uuid2",
              id: "foo2",
              value: {}
            }],
            total_rows: 2
          }
        }, "Check document");
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, undefined);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json",
          "Authorization": "Basic " + token
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents and include docs", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2',
          metaData: JSON.stringify({
            title: 'foo1title'
          })
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1',
          metaData: JSON.stringify({
            reference: 'foo2reference'
          })
        }
      ]),
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    stop();
    expect(7);

    this.jio.allDocs({include_docs: true})
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              _linshare_uuid: "uuid1",
              id: "foo1",
              value: {},
              doc: {title: "foo1title"}
            }, {
              _linshare_uuid: "uuid2",
              id: "foo2",
              value: {},
              doc: {reference: "foo2reference"}
            }],
            total_rows: 2
          }
        }, "Check document");
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents and keep only one doc per name", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo',
          modificationDate: '3',
        }, {
          uuid: 'uuid2',
          name: 'foo',
          modificationDate: '2',
        }, {
          uuid: 'uuid3',
          name: 'foo',
          modificationDate: '1',
        }
      ]),
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    stop();
    expect(7);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              _linshare_uuid: "uuid1",
              id: "foo",
              value: {}
            }],
            total_rows: 1
          }
        }, "Check document");
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.get
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get inexistent document", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2',
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1'
        }
      ]);

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    stop();
    expect(3);

    this.jio.get('foo')
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Can't find document with id : foo");
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get a document", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2',
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1',
        }, {
          uuid: 'uuid3',
          name: 'foo',
          modificationDate: '3',
          metaData: JSON.stringify({
            title: 'foouuid3'
          })
        }, {
          uuid: 'uuid4',
          name: 'foo',
          modificationDate: '2',
        }, {
          uuid: 'uuid5',
          name: 'foo',
          modificationDate: '1',
        }
      ]),
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    stop();
    expect(7);

    this.jio.get('foo')
      .then(function (result) {
        deepEqual(result, {
          title: 'foouuid3'
        }, "Check document");
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.put
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.put", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });

      this.spy = sinon.spy(FormData.prototype, "append");
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
    }
  });

  test("create a document", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2'
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1'
        }
      ]),
      server = this.server,
      context = this;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    this.server.respondWith("POST", search_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({})]);

    stop();
    expect(24);

    this.jio.put('foo', {foo: 'bar'})
      .then(function (result) {
        deepEqual(result, 'foo', "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });

        equal(server.requests[1].method, "POST");
        equal(server.requests[1].url, search_url);

        ok(server.requests[1].requestBody instanceof FormData);
        equal(context.spy.callCount, 5, "FormData.append count");

        equal(context.spy.firstCall.args[0], "file", "First append call");
        ok(context.spy.firstCall.args[1] instanceof Blob, "First append call");
        equal(context.spy.firstCall.args[2], "foo", "First append call");

        equal(context.spy.secondCall.args[0], "filesize",
              "Second append call");
        equal(context.spy.secondCall.args[1], 0, "Second append call");

        equal(context.spy.thirdCall.args[0], "filename",
              "Third append call");
        equal(context.spy.thirdCall.args[1], "foo", "Third append call");

        equal(context.spy.getCall(3).args[0], "description",
              "Fourth append call");
        equal(context.spy.getCall(3).args[1], "", "Fourth append call");

        equal(context.spy.getCall(4).args[0], "metadata",
              "Fourth append call");
        equal(context.spy.getCall(4).args[1], JSON.stringify({foo: 'bar'}),
              "Fourth append call");

        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {
          "Accept": "application/json",
          "Content-Type": "text/plain;charset=utf-8"
        });

      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("update a document", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      put_url = domain + "/linshare/webservice/rest/user/v2/documents/uuid3",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2'
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1'
        }, {
          uuid: 'uuid4',
          name: 'foo',
          modificationDate: '2',
        }, {
          uuid: 'uuid5',
          name: 'foo',
          modificationDate: '1',
        }, {
          uuid: 'uuid3',
          name: 'foo',
          modificationDate: '3',
          metaData: JSON.stringify({
            title: 'foouuid3'
          })
        }
      ]),
      server = this.server,
      context = this;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    this.server.respondWith("PUT", put_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({})]);

    stop();
    expect(13);

    this.jio.put('foo', {foo: 'bar'})
      .then(function (result) {
        deepEqual(result, 'foo', "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });

        equal(server.requests[1].method, "PUT");
        equal(server.requests[1].url, put_url);

        ok(
          server.requests[1].requestBody,
          JSON.stringify({
            foo: 'bar'
          })
        );
        equal(context.spy.callCount, 0, "FormData.append count");

        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {
          "Accept": "application/json",
          "Content-Type": "application/json;charset=utf-8"
        });

      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });


  /////////////////////////////////////////////////////////////////
  // LinshareStorage.remove
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.remove", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("non existing document", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2'
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1'
        }
      ]),
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    stop();
    expect(7);

    this.jio.remove('foo')
      .then(function (result) {
        deepEqual(result, 'foo', "Check document");
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove a document", function () {
    var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
      remove_url_1 =
        domain + "/linshare/webservice/rest/user/v2/documents/uuid3",
      remove_url_2 =
        domain + "/linshare/webservice/rest/user/v2/documents/uuid4",
      remove_url_3 =
        domain + "/linshare/webservice/rest/user/v2/documents/uuid5",
      search_result = JSON.stringify([
        {
          uuid: 'uuid1',
          name: 'foo1',
          modificationDate: '2'
        }, {
          uuid: 'uuid2',
          name: 'foo2',
          modificationDate: '1'
        }, {
          uuid: 'uuid4',
          name: 'foo',
          modificationDate: '2',
        }, {
          uuid: 'uuid5',
          name: 'foo',
          modificationDate: '1',
        }, {
          uuid: 'uuid3',
          name: 'foo',
          modificationDate: '3',
          metaData: JSON.stringify({
            title: 'foouuid3'
          })
        }
      ]),
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    this.server.respondWith("DELETE", remove_url_1, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({})]);

    this.server.respondWith("DELETE", remove_url_2, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({})]);

    this.server.respondWith("DELETE", remove_url_3, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({})]);

    stop();
    expect(22);

    this.jio.remove('foo')
      .then(function (result) {
        deepEqual(result, 'foo', "Check document");
        equal(server.requests.length, 4);

        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, search_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {
          "Accept": "application/json"
        });

        equal(server.requests[1].method, "DELETE");
        equal(server.requests[1].url, remove_url_1);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {
          "Accept": "application/json",
          "Content-Type": "text/plain;charset=utf-8"
        });

        equal(server.requests[2].method, "DELETE");
        equal(server.requests[2].url, remove_url_2);
        equal(server.requests[2].requestBody, undefined);
        equal(server.requests[2].withCredentials, true);
        deepEqual(server.requests[2].requestHeaders, {
          "Accept": "application/json",
          "Content-Type": "text/plain;charset=utf-8"
        });

        equal(server.requests[3].method, "DELETE");
        equal(server.requests[3].url, remove_url_3);
        equal(server.requests[3].requestBody, undefined);
        equal(server.requests[3].withCredentials, true);
        deepEqual(server.requests[3].requestHeaders, {
          "Accept": "application/json",
          "Content-Type": "text/plain;charset=utf-8"
        });

      })
      .fail(function (error) {
        console.warn(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.getAttachment");

  test("getAttachment retrieve content", function () {
    stop();
    expect(1);
    var jio = jIO.createJIO({
      type: "linshare"
    }),
      doc_id;
    jio.post({})
      .then(function (id) {
        doc_id = id;
        return jio.putAttachment(id, "data", new Blob(['tralalaal']));
      })
      .then(function () {
        return jio.getAttachment(doc_id, "data");
      })
      .then(function (result) {
        deepEqual(new Blob(['tralalaal']), result, "Check Blob");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon, FormData));
