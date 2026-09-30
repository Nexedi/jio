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
    start,
    module = QUnit.module,
    domain = "https://example.org/foo";

  function assertRequestHeaders(assert, request, headers) {
    if (!headers.hasOwnProperty('Content-Type')) {
      headers['Content-Type'] = 'text/plain;charset=utf-8';
    }
    assert.deepEqual(request.requestHeaders, headers);
  }

  /////////////////////////////////////////////////////////////////
  // LinshareStorage constructor
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.constructor");

  test("create storage", function (assert) {
    var jio = jIO.createJIO({
      type: "linshare",
      url: "https://example.org/foo"
    });
    assert.equal(jio.__type, "linshare");
    assert.deepEqual(
      jio.__storage._url_template.templateText,
      "https://example.org/foo/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}"
    );
    assert.deepEqual(
      jio.__storage._blob_template.templateText,
      "https://example.org/foo/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}/download"
    );
    assert.equal(jio.__storage._credential_token, undefined);
  });

  test("create storage store access token", function (assert) {
    var jio = jIO.createJIO({
      type: "linshare",
      url: "https://example.org/bar",
      access_token: "azerty"
    });
    assert.equal(jio.__type, "linshare");
    assert.deepEqual(
      jio.__storage._url_template.templateText,
      "https://example.org/bar/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}"
    );
    assert.deepEqual(
      jio.__storage._blob_template.templateText,
      "https://example.org/bar/linshare/webservice/rest/user/" +
        "v2/documents/{uuid}/download"
    );
    assert.equal(jio.__storage._access_token, "azerty");
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage hasCapacity
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.hasCapacity", {
    beforeEach: function () {
      this.jio = jIO.createJIO({
        type: "linshare",
        url: "https://example.org/foo"
      });
    }
  });

  test("check capacities", function (assert) {
    assert.ok(this.jio.hasCapacity("list"));
    assert.ok(this.jio.hasCapacity("include"));
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.allDocs
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.allDocs", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get all documents", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio.allDocs()
      .then(function (result) {
        assert.deepEqual(result, {
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
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents with access token", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio = jIO.createJIO({
      type: "linshare",
      url: domain,
      access_token: token
    });

    this.jio.allDocs()
      .then(function (result) {
        assert.deepEqual(result, {
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
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, false);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json",
          "Authorization": "Basic " + token
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents and include docs", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio.allDocs({include_docs: true})
      .then(function (result) {
        assert.deepEqual(result, {
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
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get all documents, include docs and unexpected metadata",
       function (assert) {
      var search_url = domain + "/linshare/webservice/rest/user/v2/documents/",
        search_result = JSON.stringify([
          {
            uuid: 'uuid1',
            name: 'foo1',
            modificationDate: '2',
            metaData: 'unexpectedfoo'
          }
        ]),
        server = this.server;

      this.server.respondWith("GET", search_url, [200, {
        "Content-Type": "application/json"
      }, search_result]);

      start = assert.async();
      assert.expect(7);

      this.jio.allDocs({include_docs: true})
        .then(function (result) {
          assert.deepEqual(result, {
            data: {
              rows: [{
                _linshare_uuid: "uuid1",
                id: "foo1",
                value: {},
                doc: {}
              }],
              total_rows: 1
            }
          }, "Check document");
          assert.equal(server.requests.length, 1);
          assert.equal(server.requests[0].method, "GET");
          assert.equal(server.requests[0].url, search_url);
          assert.equal(server.requests[0].requestBody, undefined);
          assert.equal(server.requests[0].withCredentials, true);
          assertRequestHeaders(assert, server.requests[0], {
            "Accept": "application/json"
          });
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("get all documents and keep only one doc per name", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio.allDocs()
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: [{
              _linshare_uuid: "uuid1",
              id: "foo",
              value: {}
            }],
            total_rows: 1
          }
        }, "Check document");
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.get
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.get", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get inexistent document", function (assert) {
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
      ]),
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    start = assert.async();
    assert.expect(9);

    this.jio.get('foo')
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Can't find document with id : foo");
        assert.equal(error.status_code, 404);

        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get a document", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio.get('foo')
      .then(function (result) {
        assert.deepEqual(result, {
          title: 'foouuid3'
        }, "Check document");
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.put
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.put", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });

      this.spy = sinon.spy(FormData.prototype, "append");
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
    }
  });

  test("create a document", function (assert) {
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

    start = assert.async();
    assert.expect(24);

    this.jio.put('foo', {foo: 'bar'})
      .then(function (result) {
        assert.deepEqual(result, 'foo', "Check document");
        assert.equal(server.requests.length, 2);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });

        assert.equal(server.requests[1].method, "POST");
        assert.equal(server.requests[1].url, search_url);

        assert.ok(server.requests[1].requestBody instanceof FormData);
        assert.equal(context.spy.callCount, 5, "FormData.append count");

        assert.equal(context.spy.firstCall.args[0], "file",
                     "First append call");
        assert.ok(context.spy.firstCall.args[1] instanceof Blob,
                  "First append call");
        assert.equal(context.spy.firstCall.args[2], "foo", "First append call");

        assert.equal(context.spy.secondCall.args[0], "filesize",
              "Second append call");
        assert.equal(context.spy.secondCall.args[1], 0, "Second append call");

        assert.equal(context.spy.thirdCall.args[0], "filename",
              "Third append call");
        assert.equal(context.spy.thirdCall.args[1], "foo", "Third append call");

        assert.equal(context.spy.getCall(3).args[0], "description",
              "Fourth append call");
        assert.equal(context.spy.getCall(3).args[1], "", "Fourth append call");

        assert.equal(context.spy.getCall(4).args[0], "metadata",
              "Fourth append call");
        assert.equal(context.spy.getCall(4).args[1],
                     JSON.stringify({foo: 'bar'}),
              "Fourth append call");

        assert.equal(server.requests[1].withCredentials, true);
        assert.deepEqual(server.requests[1].requestHeaders, {
          "Accept": "application/json"
        });

      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("update a document", function (assert) {
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

    start = assert.async();
    assert.expect(13);

    this.jio.put('foo', {foo: 'bar'})
      .then(function (result) {
        assert.deepEqual(result, 'foo', "Check document");
        assert.equal(server.requests.length, 2);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });

        assert.equal(server.requests[1].method, "PUT");
        assert.equal(server.requests[1].url, put_url);

        assert.ok(
          server.requests[1].requestBody,
          JSON.stringify({
            foo: 'bar'
          })
        );
        assert.equal(context.spy.callCount, 0, "FormData.append count");

        assert.equal(server.requests[1].withCredentials, true);
        assertRequestHeaders(assert, server.requests[1], {
          "Accept": "application/json",
          "Content-Type": "application/json"
        });

      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.remove
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.remove", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("non existing document", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio.remove('foo')
      .then(function (result) {
        assert.deepEqual(result, 'foo', "Check document");
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove a document", function (assert) {
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

    start = assert.async();
    assert.expect(22);

    this.jio.remove('foo')
      .then(function (result) {
        assert.deepEqual(result, 'foo', "Check document");
        assert.equal(server.requests.length, 4);

        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });

        assert.equal(server.requests[1].method, "DELETE");
        assert.equal(server.requests[1].url, remove_url_1);
        assert.equal(server.requests[1].requestBody, undefined);
        assert.equal(server.requests[1].withCredentials, true);
        assertRequestHeaders(assert, server.requests[1], {
          "Accept": "application/json",
          "Content-Type": "text/plain;charset=utf-8"
        });

        assert.equal(server.requests[2].method, "DELETE");
        assert.equal(server.requests[2].url, remove_url_2);
        assert.equal(server.requests[2].requestBody, undefined);
        assert.equal(server.requests[2].withCredentials, true);
        assertRequestHeaders(assert, server.requests[2], {
          "Accept": "application/json",
          "Content-Type": "text/plain;charset=utf-8"
        });

        assert.equal(server.requests[3].method, "DELETE");
        assert.equal(server.requests[3].url, remove_url_3);
        assert.equal(server.requests[3].requestBody, undefined);
        assert.equal(server.requests[3].withCredentials, true);
        assertRequestHeaders(assert, server.requests[3], {
          "Accept": "application/json",
          "Content-Type": "text/plain;charset=utf-8"
        });

      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.allAttachments", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("non existing document", function (assert) {
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

    start = assert.async();
    assert.expect(9);

    this.jio.allAttachments('foo')
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Can't find document with id : foo");
        assert.equal(error.status_code, 404);

        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("existing document", function (assert) {
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

    start = assert.async();
    assert.expect(7);

    this.jio.allAttachments('foo')
      .then(function (result) {
        assert.deepEqual(result, {enclosure: {}}, "Check document");
        assert.equal(server.requests.length, 1);

        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.putAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });

      this.spy = sinon.spy(FormData.prototype, "append");
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
    }
  });

  test("forbidden attachment", function (assert) {
    var server = this.server;

    start = assert.async();
    assert.expect(4);

    this.jio.putAttachment('foo', 'bar', new Blob())
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "attachment name bar is forbidden in linshare");
        assert.equal(error.status_code, 400);

        assert.equal(server.requests.length, 0);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("non existing document", function (assert) {
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

    start = assert.async();
    assert.expect(9);

    this.jio.putAttachment('foo', 'enclosure', new Blob())
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Can't find document with id : foo");
        assert.equal(error.status_code, 404);

        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("update a document", function (assert) {
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
      context = this,
      blob = new Blob(['barfoo']);

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    this.server.respondWith("POST", search_url, [200, {
      "Content-Type": "application/json"
    }, JSON.stringify({})]);

    start = assert.async();
    assert.expect(24);

    this.jio.putAttachment('foo', 'enclosure', blob)
      .then(function (result) {
        assert.deepEqual(result, {}, "Check document");
        assert.equal(server.requests.length, 2);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });

        assert.equal(server.requests[1].method, "POST");
        assert.equal(server.requests[1].url, search_url);

        assert.ok(server.requests[1].requestBody instanceof FormData);
        assert.equal(context.spy.callCount, 5, "FormData.append count");

        assert.equal(context.spy.firstCall.args[0], "file",
                     "First append call");
        assert.equal(context.spy.firstCall.args[1], blob, "First append call");
        assert.equal(context.spy.firstCall.args[2], "foo", "First append call");

        assert.equal(context.spy.secondCall.args[0], "filesize",
              "Second append call");
        assert.equal(context.spy.secondCall.args[1], blob.size,
                     "Second append call");

        assert.equal(context.spy.thirdCall.args[0], "filename",
              "Third append call");
        assert.equal(context.spy.thirdCall.args[1], "foo", "Third append call");

        assert.equal(context.spy.getCall(3).args[0], "description",
              "Fourth append call");
        assert.equal(context.spy.getCall(3).args[1], "foouuid3",
                     "Fourth append call");

        assert.equal(context.spy.getCall(4).args[0], "metadata",
              "Fourth append call");
        assert.equal(context.spy.getCall(4).args[1],
              JSON.stringify({title: 'foouuid3'}),
              "Fourth append call");

        assert.equal(server.requests[1].withCredentials, true);
        assert.deepEqual(server.requests[1].requestHeaders, {
          "Accept": "application/json"
        });

      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // LinshareStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.getAttachment", {
    beforeEach: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "linshare",
        url: domain
      });
    },
    afterEach: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("forbidden attachment", function (assert) {
    var server = this.server;

    start = assert.async();
    assert.expect(4);

    this.jio.getAttachment('foo', 'bar')
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     "attachment name bar is forbidden in linshare");
        assert.equal(error.status_code, 400);

        assert.equal(server.requests.length, 0);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("non existing document", function (assert) {
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

    start = assert.async();
    assert.expect(9);

    this.jio.getAttachment('foo', 'enclosure')
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message, "Can't find document with id : foo");
        assert.equal(error.status_code, 404);

        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("retrieve a document", function (assert) {
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
      download_url =
        domain + "/linshare/webservice/rest/user/v2/documents/uuid3/download",
      server = this.server;

    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/json"
    }, search_result]);

    this.server.respondWith("GET", download_url, [200, {
      "Content-Type": "text/plain"
    }, "foo\nbaré"]);

    start = assert.async();
    assert.expect(14);

    this.jio.getAttachment('foo', 'enclosure')
      .then(function (result) {
        assert.equal(server.requests.length, 2);
        assert.equal(server.requests[0].method, "GET");
        assert.equal(server.requests[0].url, search_url);
        assert.equal(server.requests[0].requestBody, undefined);
        assert.equal(server.requests[0].withCredentials, true);
        assertRequestHeaders(assert, server.requests[0], {
          "Accept": "application/json"
        });

        assert.equal(server.requests[1].method, "GET");
        assert.equal(server.requests[1].url, download_url);
        assert.equal(server.requests[1].requestBody, undefined);
        assert.equal(server.requests[1].withCredentials, true);
        assertRequestHeaders(assert, server.requests[1], {});
        assert.ok(result instanceof Blob, "Data is Blob");
        assert.deepEqual(result.type, "text/plain", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = "foo\nbaré";
        assert.equal(result.target.result, expected,
                     "Attachment correctly fetched");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon, FormData));
