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
    add_url = domain + "lets?add=somedocument",
    bulk_url = domain + "lets?run=bulk",
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
      },
      "_actions": {
        add: {
          href: add_url
        },
        bulk: {
          href: bulk_url
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

  test("putAttachment convert array property", function () {
    var submit_url = domain + "/Form_view/Base_edit",
      id = "fake",
      form_json = {
        "multiple_value": ["fooé", "barè"]
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
        equal(context.spy.firstCall.args[0], "multiple_value",
              "First append call");
        equal(context.spy.firstCall.args[1], "fooé", "First append call");
        equal(context.spy.secondCall.args[0], "multiple_value",
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

  /////////////////////////////////////////////////////////////////
  // erp5Storage.put
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.put", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.spy = sinon.spy(FormData.prototype, "append");

      this.jio = jIO.createJIO({
        type: "erp5",
        url: domain,
        default_view_reference: "bar_view"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
    }
  });

  test("put inexistent document", function () {
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

    this.jio.put(id)
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

  test("put ERP5 document", function () {
    var id = "person_module/20150119_azerty",
      context = this,
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=bar_view",
      put_url = domain + "azertytrea?f=g",
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
                href: put_url
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
    this.server.respondWith("POST", put_url, [204, {
      "Content-Type": "text/html"
    }, ""]);

    stop();
    expect(21);

    this.jio.put(id, {title: "barè", id: "foo"})
      .then(function (result) {
        equal(result, id);
        equal(server.requests.length, 3);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
        equal(server.requests[2].method, "POST");
        equal(server.requests[2].url, put_url);
        ok(server.requests[2].requestBody instanceof FormData);
        equal(server.requests[2].withCredentials, true);

        equal(context.spy.callCount, 3, "FormData.append count");
        equal(context.spy.firstCall.args[0], "form_id", "First append call");
        equal(context.spy.firstCall.args[1], "Base_view", "First append call");
        equal(context.spy.secondCall.args[0], "field_my_title",
              "Second append call");
        equal(context.spy.secondCall.args[1], "barè", "Second append call");
        equal(context.spy.thirdCall.args[0], "field_my_id",
              "Third append call");
        equal(context.spy.thirdCall.args[1], "foo", "Third append call");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put ERP5 document with non accepted property", function () {
    var id = "person_module/20150119_azerty",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=bar_view",
      put_url = domain + "azertytrea?f=g",
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
                href: put_url
              }
            }
          }
        }
      });

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("GET", traverse_url, [200, {
      "Content-Type": "application/hal+json"
    }, document_hateoas]);
    this.server.respondWith("POST", put_url, [204, {
      "Content-Type": "text/html"
    }, ""]);

    stop();
    expect(3);

    this.jio.put(id, {title: "barè", title_non_editable: "foo"})
      .then(function (result) {
        ok(false, result);
      })
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message,
              "ERP5: can not store property: title_non_editable");
        equal(error.status_code, 400);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.post
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.post", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.spy = sinon.spy(FormData.prototype, "append");

      this.jio = jIO.createJIO({
        type: "erp5",
        url: domain,
        default_view_reference: "bar_view"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
    }
  });

  test("post ERP5 document", function () {
    var id = "person_module/20150119_azerty",
      context = this,
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=bar_view",
      put_url = domain + "azertytrea?f=g",
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
                href: put_url
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
    this.server.respondWith("POST", put_url, [204, {
      "Content-Type": "text/html"
    }, ""]);
    this.server.respondWith("POST", add_url, [201, {
      "Content-Type": "text/html",
      "X-Location": "urn:jio:get:" + id
    }, ""]);

    stop();
    expect(33);

    this.jio.post({
      title: "barè",
      id: "foo",
      portal_type: "Foo",
      parent_relative_url: "foo_module"
    })
      .then(function (result) {
        equal(result, id);
        equal(server.requests.length, 5);

        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);

        equal(server.requests[1].method, "POST");
        equal(server.requests[1].url, add_url);
        ok(server.requests[1].requestBody instanceof FormData);
        equal(server.requests[1].withCredentials, true);

        equal(server.requests[2].method, "GET");
        equal(server.requests[2].url, domain);
        equal(server.requests[2].requestBody, undefined);
        equal(server.requests[2].withCredentials, true);

        equal(server.requests[3].method, "GET");
        equal(server.requests[3].url, traverse_url);
        equal(server.requests[3].requestBody, undefined);
        equal(server.requests[3].withCredentials, true);

        equal(server.requests[4].method, "POST");
        equal(server.requests[4].url, put_url);
        ok(server.requests[4].requestBody instanceof FormData);
        equal(server.requests[4].withCredentials, true);

        equal(context.spy.callCount, 5, "FormData.append count");

        equal(context.spy.firstCall.args[0], "portal_type",
              "First append call");
        equal(context.spy.firstCall.args[1], "Foo", "First append call");
        equal(context.spy.secondCall.args[0], "parent_relative_url",
              "Second append call");
        equal(context.spy.secondCall.args[1], "foo_module",
              "Second append call");

        equal(context.spy.thirdCall.args[0], "form_id", "Third append call");
        equal(context.spy.thirdCall.args[1], "Base_view", "Third append call");
        equal(context.spy.getCall(3).args[0], "field_my_title",
              "Fourthappend call");
        equal(context.spy.getCall(3).args[1], "barè", "Fourth append call");
        equal(context.spy.getCall(4).args[0], "field_my_id",
              "Fifth append call");
        equal(context.spy.getCall(4).args[1], "foo", "Fifth append call");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // erp5Storage.bulk
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.bulk", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.spy = sinon.spy(FormData.prototype, "append");

      this.jio = jIO.createJIO({
        type: "erp5",
        url: domain,
        default_view_reference: "bar_view"
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
    }
  });

  test("bulk get ERP5 document list", function () {
    var id = "person_module/20150119_azerty",
      id2 = "person_module/20150219_azerty",
      context = this,
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
      document_hateoas2 = JSON.stringify({
        // Kept property
        "title": "foo2",
        // Remove all _ properties
        "_bar": "john doo2",
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
      bulk_hateoas = JSON.parse(root_hateoas),
      server = this.server;

    bulk_hateoas.result_list = [
      JSON.parse(document_hateoas),
      JSON.parse(document_hateoas2)
    ];
    bulk_hateoas = JSON.stringify(bulk_hateoas);

    this.server.respondWith("GET", domain, [200, {
      "Content-Type": "application/hal+json"
    }, root_hateoas]);
    this.server.respondWith("POST", bulk_url, [200, {
      "Content-Type": "application/hal+json"
    }, bulk_hateoas]);

    stop();
    expect(15);

    this.jio.bulk([{
      method: "get",
      parameter_list: [id]
    }, {
      method: "get",
      parameter_list: [id2]
    }])
      .then(function (result_list) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);

        equal(server.requests[1].method, "POST");
        equal(server.requests[1].url, bulk_url);
        // XXX Check form data
        ok(server.requests[1].requestBody instanceof FormData);

        ok(context.spy.calledOnce, "FormData.append count " +
           context.spy.callCount);
        equal(context.spy.firstCall.args[0], "bulk_list", "First append call");
        equal(context.spy.firstCall.args[1],
              JSON.stringify([{
            relative_url: "person_module/20150119_azerty",
            view: "bar_view"
          }, {
            relative_url: "person_module/20150219_azerty",
            view: "bar_view"
          }]),
              "First append call");

        equal(server.requests[1].withCredentials, true);

        var result = result_list[0],
          result2 = result_list[1];
        equal(result_list.length, 2);
        deepEqual(result, {
          portal_type: "Person",
          title: "foo"
        }, "Check document");
        deepEqual(result2, {
          portal_type: "Person"
        }, "Check document2");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon, encodeURIComponent, FormData));
