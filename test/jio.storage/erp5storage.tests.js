/*jslint nomen: true*/
/*global Blob, sinon, encodeURIComponent, FormData*/
(function (jIO, QUnit, Blob, sinon, encodeURIComponent, FormData) {
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
    traverse_template = domain + "?mode=traverse{&relative_url,view}",
    search_template = domain + "?mode=search{&query,select_list*,limit*}",
    root_hateoas = JSON.stringify({
      "_links": {
        traverse: {
          href: traverse_template,
          templated: true
        },
        raw_search: {
          href: search_template,
          templated: true
        }
      }
    });

  /////////////////////////////////////////////////////////////////
  // erp5Storage constructor
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.constructor");

  test("Storage store URL", function () {
    var jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      default_view_reference: "bar_view"
    });

    equal(jio.__type, "erp5");
    deepEqual(jio.__storage._url, domain);
    deepEqual(jio.__storage._default_view_reference, "bar_view");
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.get
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.get", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "erp5",
        url: domain,
        default_view_reference: "bar_view"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get inexistent document", function () {
    var id = "person_module/20150119_azerty",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id);

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [404, {
      "Content-Type": "text/html"
    }, ""]);

    stop();
    expect(3);

    this.jio.get(id)
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get ERP5 document with empty form", function () {
    var id = "person_module/20150119_azerty",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=bar_view",
      document_hateoas = JSON.stringify({
        // Kept property
        "title": "foo",
        // Remove all _ properties
        "_bar": "john doo",
        "_links": {
          type: {
            name: "Person"
          }
        },
        "_embedded": {
          "_view": {
            form_id: {
              key: "form_id",
              "default": "Base_view"
            },
            "_actions": {
              put: {
                href: "one erp5 url"
              }
            }
          }
        }
      }),
      server = this.server;

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [200, {
      "Content-Type": "application/hal+json"
    }, document_hateoas]);

    stop();
    expect(10);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          portal_type: "Person"
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("get ERP5 document", function () {
    var id = "person_module/20150119_azerty",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=bar_view",
      document_hateoas = JSON.stringify({
        // Kept property
        "title": "foo",
        // Remove all _ properties
        "_bar": "john doo",
        "_links": {
          type: {
            name: "Person"
          }
        },
        "_embedded": {
          "_view": {
            form_id: {
              key: "form_id",
              "default": "Base_view"
            },
            my_title: {
              key: "field_my_title",
              "default": "foo",
              editable: true,
              type: "StringField"
            },
            my_id: {
              key: "field_my_id",
              "default": "",
              editable: true,
              type: "StringField"
            },
            my_title_non_editable: {
              key: "field_my_title_non_editable",
              "default": "foo",
              editable: false,
              type: "StringField"
            },
            my_start_date: {
              key: "field_my_start_date",
              "default": "foo",
              editable: true,
              type: "DateTimeField"
            },
            your_reference: {
              key: "field_your_title",
              "default": "bar",
              editable: true,
              type: "StringField"
            },
            sort_index: {
              key: "field_sort_index",
              "default": "foobar",
              editable: true,
              type: "StringField"
            },
            "_actions": {
              put: {
                href: "one erp5 url"
              }
            }
          }
        }
      }),
      server = this.server;

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [200, {
      "Content-Type": "application/hal+json"
    }, document_hateoas]);

    stop();
    expect(10);

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          portal_type: "Person",
          title: "foo"
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.allAttachments", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "erp5",
        url: domain
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("allAttachments on inexistent document", function () {
    var id = "person_module/20150119_azerty",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id);

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [404, {
      "Content-Type": "text/html"
    }, ""]);

    stop();
    expect(3);

    this.jio.allAttachments(id)
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allAttachments ERP5 document", function () {
    var id = "person_module/20150119_azerty",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id),
      document_hateoas = JSON.stringify({
        // Kept property
        "title": "foo",
        // Remove all _ properties
        "_bar": "john doo",
        "_links": {
          type: {
            name: "Person"
          }
        }
      }),
      server = this.server;

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [200, {
      "Content-Type": "application/hal+json"
    }, document_hateoas]);

    stop();
    expect(10);

    this.jio.allAttachments(id)
      .then(function (result) {
        deepEqual(result, {
          links: {}
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("allAttachments ERP5 document with default view", function () {
    var id = "person_module/20150119_azerty",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id),
      document_hateoas = JSON.stringify({
        // Kept property
        "title": "foo",
        // Remove all _ properties
        "_bar": "john doo",
        "_links": {
          type: {
            name: "Person"
          }
        }
      }),
      server = this.server;

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      default_view_reference: "bar_view"
    });

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [200, {
      "Content-Type": "application/hal+json"
    }, document_hateoas]);

    stop();
    expect(10);

    this.jio.allAttachments(id)
      .then(function (result) {
        deepEqual(result, {
          links: {},
          view: {}
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.putAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "erp5",
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

  test("reject any attachment name by default", function () {
    stop();
    expect(3);

    this.jio.putAttachment(
      "putAttachment1/",
      "attachment1",
      new Blob(["foo"])
    )
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Can not store outside ERP5: attachment1");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment submit ERP5 form", function () {
    var submit_url = domain + "/Form_view/Base_edit",
      id = "fake",
      form_json = {
        "my_title": "fooé",
        "your_reference": "barè"
        // XXX Check FileUpload
      },
      context = this,
      server = this.server;

    this.server.respondWith("POST", submit_url, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(11);

    this.jio.putAttachment(
      id,
      submit_url,
      new Blob([JSON.stringify(form_json)])
    )
      .then(function () {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, submit_url);
        equal(server.requests[0].status, 204);
        ok(server.requests[0].requestBody instanceof FormData);

        ok(context.spy.calledTwice, "FormData.append count " +
           context.spy.callCount);
        equal(context.spy.firstCall.args[0], "my_title", "First append call");
        equal(context.spy.firstCall.args[1], "fooé", "First append call");
        equal(context.spy.secondCall.args[0], "your_reference",
              "Second append call");
        equal(context.spy.secondCall.args[1], "barè", "Second append call");

        equal(server.requests[0].withCredentials, true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.getAttachment", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "erp5",
        url: domain,
        default_view_reference: "foo_view"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("reject any attachment name by default", function () {
    stop();
    expect(3);

    this.jio.getAttachment("getAttachment1/", "attachment1")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "ERP5: not support get attachment: attachment1");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment: view on inexistent document", function () {
    var id = "person_module/1",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=foo_view";

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [404, {
      "Content-Type": "text/html"
    }, ""]);

    stop();
    expect(3);

    this.jio.getAttachment(id, "view")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment: view uses default form", function () {
    var id = "person_module/1",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=foo_view",
      document_hateoas = JSON.stringify({
        "title": "foo",
        "_bar": "john doo",
        "_embedded": "youhou",
        "_links": {
          type: {
            name: "Person"
          }
        }
      }),
      server = this.server;

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [200, {
      "Content-Type": "application/hal+json"
    }, document_hateoas]);

    stop();
    expect(12);

    this.jio.getAttachment(id, "view")
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);

        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "application/hal+json", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = JSON.parse(document_hateoas);
        expected._id = id;
        expected.portal_type = "Person";
        deepEqual(JSON.parse(result.target.result), expected,
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment: view without being specified", function () {
    var id = "person_module/1";

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain
    });

    stop();
    expect(3);

    this.jio.getAttachment(id, "view")
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find attachment view for: " + id);
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment: links on inexistent document", function () {
    var id = "person_module/1",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id);

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [404, {
      "Content-Type": "text/html"
    }, ""]);

    stop();
    expect(3);

    this.jio.getAttachment(id, "links")
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "Cannot find document: " + id);
        equal(error.status_code, 404);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment: links uses no form", function () {
    var id = "person_module/1",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id),
      document_hateoas = JSON.stringify({
        "title": "foo",
        "_bar": "john doo",
        "_embedded": "youhou",
        "_links": {
          type: {
            name: "Person"
          }
        }
      }),
      server = this.server;

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [200, {
      "Content-Type": "application/hal+json"
    }, document_hateoas]);

    stop();
    expect(12);

    this.jio.getAttachment(id, "links")
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);

        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "application/hal+json", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = JSON.parse(document_hateoas);
        deepEqual(JSON.parse(result.target.result), expected,
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment: JSON callable url", function () {
    var callable_url = domain + "foobar",
      id = "fake",
      document_hateoas = JSON.stringify({
        "title": "foo",
        "_bar": "john doo",
        "_embedded": "youhou",
        "_links": {
          type: {
            name: "Person"
          }
        }
      }),
      server = this.server;

    this.server.respondWith("GET", callable_url, [200, {
      "Content-Type": "application/json"
    }, document_hateoas]);

    stop();
    expect(8);

    this.jio.getAttachment(id, callable_url)
      .then(function (result) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, callable_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);

        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "application/json", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = JSON.parse(document_hateoas);
        expected._id = id;
        deepEqual(JSON.parse(result.target.result), expected,
              "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.hasCapacity", {
    setup: function () {
      this.jio = jIO.createJIO({
        "type": "erp5",
        "url": domain
      });
    }
  });

  test("check capacities", function () {
    ok(this.jio.hasCapacity("list"));
    ok(this.jio.hasCapacity("query"));
    ok(this.jio.hasCapacity("select"));
    ok(this.jio.hasCapacity("limit"));
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.allDocs
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.allDocs", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "erp5",
        url: domain
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("get all documents", function () {
    var search_url = domain + "?mode=search&select_list=title" +
                     "&select_list=reference",
      search_hateoas = JSON.stringify({

        "_embedded": {
          "contents": [
            {
              "_links": {
                "self": {
                  "href": "urn:jio:get:person_module/2"
                }
              },
              "reference": "foo2",
              "title": "bar2"
            },
            {
              "_links": {
                "self": {
                  "href": "urn:jio:get:organisation_module/3"
                }
              },
              "title": "bar3"
            }
          ]
        }
      }),
      server = this.server;

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/hal+json"
    }, search_hateoas]);

    stop();
    expect(10);

    this.jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "person_module/2",
              value: {
                reference: "foo2",
                title: "bar2"
              }
            }, {
              id: "organisation_module/3",
              value: {
                title: "bar3"
              }
            }],
            total_rows: 2
          }
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, search_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("filter documents", function () {
    var search_url = domain + "?mode=search&query=title%3A%20%22two%22&" +
                     "select_list=destination&select_list=source&limit=5",
      search_hateoas = JSON.stringify({

        "_embedded": {
          "contents": [
            {
              "_links": {
                "self": {
                  "href": "urn:jio:get:person_module/2"
                }
              },
              "reference": "foo2",
              "title": "bar2"
            },
            {
              "_links": {
                "self": {
                  "href": "urn:jio:get:organisation_module/3"
                }
              },
              "title": "bar3"
            }
          ]
        }
      }),
      server = this.server;

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", search_url, [200, {
      "Content-Type": "application/hal+json"
    }, search_hateoas]);

    stop();
    expect(10);

    this.jio.allDocs({
      limit: [5],
      select_list: ["destination", "source"],
      query: 'title: "two"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "person_module/2",
              value: {
                reference: "foo2",
                title: "bar2"
              }
            }, {
              id: "organisation_module/3",
              value: {
                title: "bar3"
              }
            }],
            total_rows: 2
          }
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, search_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon, encodeURIComponent, FormData));
