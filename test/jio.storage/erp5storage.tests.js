/*
 * Copyright 2015, Nexedi SA
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
    search_template = domain + "?mode=search{&query,select_list*,limit*," +
      "sort_on*,group_by*,local_roles*,selection_domain*}",
    add_url = domain + "lets?add=somedocument",
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
    equal(jio.__storage._access_token, undefined);
  });

  test("Storage store access_token", function () {
    var jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      default_view_reference: "bar_view",
      access_token: 'foo'
    });

    equal(jio.__type, "erp5");
    deepEqual(jio.__storage._url, domain);
    deepEqual(jio.__storage._default_view_reference, "bar_view");
    equal(jio.__storage._access_token, 'foo');
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

  test("get ERP5 document with access token", function () {
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
          }
        },
        "_embedded": {
          "_view": {
            form_id: {
              key: "form_id",
              "default": "Base_view"
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
    expect(12);

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      default_view_reference: "bar_view",
      access_token: 'footoken'
    });

    this.jio.get(id)
      .then(function (result) {
        deepEqual(result, {
          portal_type: "Person"
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, false);
        deepEqual(server.requests[0].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, false);
        deepEqual(server.requests[1].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
          }
        },
        "_embedded": {
          "_view": {
            form_id: {
              key: "form_id",
              "default": "Base_view"
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
    expect(12);

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
        deepEqual(server.requests[0].requestHeaders, {});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {});
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
          },
          parent: {
            href: "urn:jio:get:foo_module"
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
              key: "field_your_reference",
              "default": "bar",
              editable: true,
              type: "StringField"
            },
            your_reference_non_editable: {
              key: "field_your_reference_non_editable",
              "default": "bar",
              editable: false,
              type: "StringField"
            },
            sort_index: {
              key: "field_sort_index",
              "default": "foobar",
              editable: true,
              type: "StringField"
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
          parent_relative_url: "foo_module",
          reference: "bar",
          reference_non_editable: "bar",
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

  test("allAttachments ERP5 document with access token", function () {
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      access_token: 'footoken'
    });

    this.jio.allAttachments(id)
      .then(function (result) {
        deepEqual(result, {
          links: {}
        }, "Check document");
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, false);
        deepEqual(server.requests[0].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, false);
        deepEqual(server.requests[1].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
        deepEqual(server.requests[0].requestHeaders, {});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {});
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
      this.spy_ajax = sinon.spy(jIO.util, "ajax");
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
      this.spy.restore();
      delete this.spy;
      this.spy_ajax.restore();
      delete this.spy_ajax;
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


  test("putAttachment submit ERP5 form with access token", function () {
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
    expect(18);

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      access_token: 'footoken'
    });

    this.jio.putAttachment(
      id,
      submit_url,
      new Blob([JSON.stringify(form_json)])
    )
      .then(function () {
        ok(context.spy_ajax.calledOnce, "ajax count " +
           context.spy_ajax.callCount);
        equal(context.spy_ajax.firstCall.args[0].type, "POST");
        equal(context.spy_ajax.firstCall.args[0].url, submit_url);
        equal(context.spy_ajax.firstCall.args[0].dataType, "blob");
        deepEqual(context.spy_ajax.firstCall.args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.firstCall.args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        ok(context.spy_ajax.firstCall.args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.firstCall.args[0].data);

        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, submit_url);
        equal(server.requests[0].status, 204);

        ok(context.spy.calledTwice, "FormData.append count " +
           context.spy.callCount);
        equal(context.spy.firstCall.args[0], "my_title", "First append call");
        equal(context.spy.firstCall.args[1], "fooé", "First append call");
        equal(context.spy.secondCall.args[0], "your_reference",
              "Second append call");
        equal(context.spy.secondCall.args[1], "barè", "Second append call");

        equal(server.requests[0].withCredentials, false);
        equal(server.requests[0].requestHeaders['X-ACCESS-TOKEN'], 'footoken');
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
    expect(16);

    this.jio.putAttachment(
      id,
      submit_url,
      new Blob([JSON.stringify(form_json)])
    )
      .then(function () {
        ok(context.spy_ajax.calledOnce, "ajax count " +
           context.spy_ajax.callCount);
        equal(context.spy_ajax.firstCall.args[0].type, "POST");
        equal(context.spy_ajax.firstCall.args[0].url, submit_url);
        equal(context.spy_ajax.firstCall.args[0].dataType, "blob");
        deepEqual(context.spy_ajax.firstCall.args[0].xhrFields, {
          withCredentials: true
        });
        ok(context.spy_ajax.firstCall.args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.firstCall.args[0].data);

        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, submit_url);
        equal(server.requests[0].status, 204);

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
    expect(16);

    this.jio.putAttachment(
      id,
      submit_url,
      new Blob([JSON.stringify(form_json)])
    )
      .then(function () {
        ok(context.spy_ajax.calledOnce, "ajax count " +
           context.spy_ajax.callCount);
        equal(context.spy_ajax.firstCall.args[0].type, "POST");
        equal(context.spy_ajax.firstCall.args[0].url, submit_url);
        equal(context.spy_ajax.firstCall.args[0].dataType, "blob");
        deepEqual(context.spy_ajax.firstCall.args[0].xhrFields, {
          withCredentials: true
        });
        ok(context.spy_ajax.firstCall.args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.firstCall.args[0].data);

        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, submit_url);
        equal(server.requests[0].status, 204);

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

  test("putAttachment convert data URL", function () {
    var submit_url = domain + "/Form_view/Base_edit",
      id = "fake",
      form_json = {
        my_foo_file: {
          url: 'data:text/plain;charset=utf-8;base64,Zm9v',
          file_name: 'bar.stream'
        }
      },
      context = this,
      server = this.server;

    this.server.respondWith("POST", submit_url, [204, {
      "Content-Type": "text/xml"
    }, ""]);

    stop();
    expect(17);

    this.jio.putAttachment(
      id,
      submit_url,
      new Blob([JSON.stringify(form_json)])
    )
      .then(function () {
        ok(context.spy_ajax.calledOnce, "ajax count " +
           context.spy_ajax.callCount);
        equal(context.spy_ajax.firstCall.args[0].type, "POST");
        equal(context.spy_ajax.firstCall.args[0].url, submit_url);
        equal(context.spy_ajax.firstCall.args[0].dataType, "blob");
        deepEqual(context.spy_ajax.firstCall.args[0].xhrFields, {
          withCredentials: true
        });
        ok(context.spy_ajax.firstCall.args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.firstCall.args[0].data);

        equal(server.requests.length, 1);
        equal(server.requests[0].method, "POST");
        equal(server.requests[0].url, submit_url);
        equal(server.requests[0].status, 204);

        ok(context.spy.calledOnce, "FormData.append count " +
           context.spy.callCount);
        equal(context.spy.firstCall.args[0], "my_foo_file",
              "First append call");
        ok(context.spy.firstCall.args[1] instanceof Blob,
           "First append call");
        equal(context.spy.firstCall.args[1].type, "text/plain;charset=utf-8",
              "First append call");
        equal(context.spy.firstCall.args[2], "bar.stream",
              "First append call");

        equal(server.requests[0].withCredentials, true);
        return jIO.util.readBlobAsText(context.spy.firstCall.args[1]);
      })
      .then(function (evt) {
        equal(evt.target.result, 'foo');
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

  test("getAttachment: view uses default form with access token", function () {
    var id = "person_module/1",
      traverse_url = domain + "?mode=traverse&relative_url=" +
                     encodeURIComponent(id) + "&view=foo_view",
      document_hateoas = JSON.stringify({
        "title": "foo",
        "_bar": "john doo",
        "_embedded": "youhou",
        "_links": {
          type: {
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
    expect(14);

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      default_view_reference: "foo_view",
      access_token: 'footoken'
    });

    this.jio.getAttachment(id, "view")
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, false);
        deepEqual(server.requests[0].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, false);
        deepEqual(server.requests[1].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});

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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
    expect(14);

    this.jio.getAttachment(id, "view")
      .then(function (result) {
        equal(server.requests.length, 2);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {});

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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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

  test("getAttachment: non-JSON callable url", function () {
    var callable_url = domain + "foobar",
      id = "fake",
      server = this.server;

    this.server.respondWith("GET", callable_url, [200, {
      "Content-Type": "text/plain"
    }, "foo\nbaré"]);

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
        deepEqual(result.type, "text/plain", "Check mimetype");
        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        var expected = "foo\nbaré";
        equal(result.target.result, expected, "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("getAttachment: slicing parameters", function () {
    var callable_url = domain + "foobar",
      id = "fake",
      server = this.server;

    this.server.respondWith("GET", callable_url, [200, {
      "Content-Type": "application/octet-stream"
    }, "foo\nbaré"]);

    stop();
    expect(8);

    this.jio.getAttachment(id, callable_url,
                           {start: 123, end: 456})
      .then(function (result) {
        equal(server.requests.length, 1);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, callable_url);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        equal(server.requests[0].requestHeaders.Range, "bytes=123-456");

        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "application/octet-stream", "Check mimetype");
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
    ok(this.jio.hasCapacity("group"));
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


  test("get all documents with access token", function () {
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
    expect(12);

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      access_token: 'footoken'
    });

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
        equal(server.requests[0].withCredentials, false);
        deepEqual(server.requests[0].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, search_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, false);
        deepEqual(server.requests[1].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
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
    expect(12);

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
        deepEqual(server.requests[0].requestHeaders, {});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, search_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {});
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
                     "select_list=destination&select_list=source&limit=5&" +
                     "sort_on=%5B%22title%22%2C%22descending%22%5D&" +
                     "sort_on=%5B%22id%22%2C%22descending%22%5D&" +
                     "group_by=a_foo_grouping&" +
                     "group_by=a_bar_grouping",
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
      query: 'title: "two"',
      sort_on: [["title", "descending"], ["id", "descending"]],
      group_by: ["a_foo_grouping", "a_bar_grouping"]
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

  // Local roles tests
  test("extract simple single local_roles", function () {
    var search_url = domain + "?mode=search&" +
                     "select_list=destination&select_list=source&limit=5" +
                     "&local_roles=Assignee",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'local_roles:"Assignee"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract simple multiple local_roles", function () {
    var search_url = domain + "?mode=search&" +
                     "select_list=destination&select_list=source&limit=5&" +
                     "local_roles=Assignee&" +
                     "local_roles=Assignor",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'local_roles:"Assignee" OR local_roles:"Assignor"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract complex AND single local_roles", function () {
    var search_url = domain + "?mode=search&" +
                     "query=portal_type%3A%20%20%22Person%22&" +
                     "select_list=destination&select_list=source&limit=5&" +
                     "local_roles=Assignee",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'portal_type:"Person" AND local_roles:"Assignee"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract complex OR single local_roles", function () {
    var search_url = domain + "?mode=search&" +
                     "query=portal_type%3A%22Person%22%20OR%20" +
                     "local_roles%3A%22Assignee%22&" +
                     "select_list=destination&select_list=source&limit=5",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'portal_type:"Person" OR local_roles:"Assignee"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract sub multiple local_roles", function () {
    var search_url = domain + "?mode=search&" +
                     "query=portal_type%3A%20%20%22Person%22&" +
                     "select_list=destination&select_list=source&limit=5&" +
                     "local_roles=Assignee&local_roles=Assignor",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'portal_type:"Person" AND (local_roles:"Assignee" OR ' +
             'local_roles:"Assignor")'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  // Selection Domain tests
  test("extract simple single domain", function () {
    var search_url = domain + "?mode=search&" +
                     "select_list=destination&select_list=source&limit=5" +
                     "&selection_domain=%7B%22region%22%3A%22foo%2Fbar%22%7D",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'selection_domain_region:"foo/bar"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract complex AND single domains", function () {
    var search_url = domain + "?mode=search&" +
                     "query=portal_type%3A%20%20%22Person%22&" +
                     "select_list=destination&select_list=source&limit=5&" +
                     "selection_domain=%7B%22group%22%3A%22bar%2Ffoo%22%7D",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'portal_type:"Person" AND selection_domain_group:"bar/foo"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract complex OR single domains", function () {
    var search_url = domain + "?mode=search&" +
                     "query=portal_type%3A%22Person%22%20OR%20" +
                     "selection_domain_group%3A%22bar%2Ffoo%22&" +
                     "select_list=destination&select_list=source&limit=5",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'portal_type:"Person" OR selection_domain_group:"bar/foo"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract sub multiple domains", function () {
    var search_url = domain + "?mode=search&" +
                     "query=%28%20portal_type%3A%20%20%22Person%22%20AND%20" +
                     "title%3A%20%20%22atitle%22%20%29&" +
                     "select_list=destination&select_list=source&limit=5&" +
                     "local_roles=Assignee&" +
                     "selection_domain=%7B%22group%22%3A%22bar%2Ffoo%22%2C" +
                     "%22region%22%3A%22foo%2Fbar%22%7D",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'portal_type:"Person" AND selection_domain_group:"bar/foo" AND ' +
             'selection_domain_region:"foo/bar" AND ' +
             'local_roles:"Assignee" AND title:"atitle"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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

  test("extract multiple values for a single domains", function () {
    var search_url = domain + "?mode=search&" +
                     "query=%28%20portal_type%3A%20%20%22Person%22%20AND%20" +
                     "selection_domain_group%3A%20%20%22foo%2Fbar%22%20AND%20" +
                     "title%3A%20%20%22atitle%22%20%29&" +
                     "select_list=destination&select_list=source&limit=5&" +
                     "local_roles=Assignee&" +
                     "selection_domain=%7B%22group%22%3A%22bar%2Ffoo%22%7D",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      query: 'portal_type:"Person" AND selection_domain_group:"bar/foo" AND ' +
             'selection_domain_group:"foo/bar" AND ' +
             'local_roles:"Assignee" AND title:"atitle"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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
        console.log(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("extract local_roles and selection_domain", function () {
    var search_url = domain + "?mode=search&" +
                     "query=&" +
                     "select_list=uid&limit=5&" +
                     "local_roles=Assignee&" +
                     "selection_domain=%7B%22region%22%3A%22foo%2Fbar%22%7D",
      search_hateoas = JSON.stringify({
        "_embedded": {
          "contents": []
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
      select_list: ["uid"],
      query: 'local_roles:"Assignee" AND selection_domain_region:"foo/bar"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
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
      this.spy_ajax = sinon.spy(jIO.util, "ajax");

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
      this.spy_ajax.restore();
      delete this.spy_ajax;
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

  test("put ERP5 document with access token", function () {
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
              key: "field_your_reference",
              "default": "bar",
              editable: true,
              type: "StringField"
            },
            your_reference_non_editable: {
              key: "field_your_reference_non_editable",
              "default": "bar",
              editable: false,
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
    expect(44);

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      default_view_reference: "bar_view",
      access_token: 'footoken'
    });

    this.jio.put(id, {title: "barè", id: "foo", reference: "bar2"})
      .then(function (result) {
        equal(result, id);

        equal(context.spy_ajax.callCount, 3, "ajax count");
        equal(context.spy_ajax.getCall(0).args[0].type, "GET");
        equal(context.spy_ajax.getCall(0).args[0].url, domain);
        equal(context.spy_ajax.getCall(0).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(0).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(0).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        equal(context.spy_ajax.getCall(0).args[0].data, undefined);

        equal(context.spy_ajax.getCall(1).args[0].type, "GET");
        equal(context.spy_ajax.getCall(1).args[0].url, traverse_url);
        equal(context.spy_ajax.getCall(1).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(1).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(1).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        equal(context.spy_ajax.getCall(1).args[0].data, undefined);

        equal(context.spy_ajax.getCall(2).args[0].type, "POST");
        equal(context.spy_ajax.getCall(2).args[0].url, put_url);
        equal(context.spy_ajax.getCall(2).args[0].dataType, "blob");
        deepEqual(context.spy_ajax.getCall(2).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(2).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        ok(context.spy_ajax.getCall(2).args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.getCall(2).args[0].data);

        equal(server.requests.length, 3);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, false);
        equal(
          server.requests[0].requestHeaders['X-ACCESS-TOKEN'],
          'footoken'
        );
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, false);
        equal(
          server.requests[1].requestHeaders['X-ACCESS-TOKEN'],
          'footoken'
        );
        equal(server.requests[2].method, "POST");
        equal(server.requests[2].url, put_url);
        equal(server.requests[2].withCredentials, false);
        equal(
          server.requests[2].requestHeaders['X-ACCESS-TOKEN'],
          'footoken'
        );

        equal(context.spy.callCount, 4, "FormData.append count");
        equal(context.spy.firstCall.args[0], "form_id", "First append call");
        equal(context.spy.firstCall.args[1], "Base_view", "First append call");
        equal(context.spy.secondCall.args[0], "field_my_title",
              "Second append call");
        equal(context.spy.secondCall.args[1], "barè", "Second append call");
        equal(context.spy.thirdCall.args[0], "field_my_id",
              "Third append call");
        equal(context.spy.thirdCall.args[1], "foo", "Third append call");
        equal(context.spy.getCall(3).args[0], "field_your_reference",
              "Fourth append call");
        equal(context.spy.getCall(3).args[1], "bar2", "Fourth append call");
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
              key: "field_your_reference",
              "default": "bar",
              editable: true,
              type: "StringField"
            },
            your_reference_non_editable: {
              key: "field_your_reference_non_editable",
              "default": "bar",
              editable: false,
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
    expect(43);

    this.jio.put(id, {title: "barè", id: "foo", reference: "bar2"})
      .then(function (result) {
        equal(result, id);

        equal(context.spy_ajax.callCount, 3, "ajax count");
        equal(context.spy_ajax.getCall(0).args[0].type, "GET");
        equal(context.spy_ajax.getCall(0).args[0].url, domain);
        equal(context.spy_ajax.getCall(0).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(0).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(0).args[0].headers, undefined);
        equal(context.spy_ajax.getCall(0).args[0].data, undefined);

        equal(context.spy_ajax.getCall(1).args[0].type, "GET");
        equal(context.spy_ajax.getCall(1).args[0].url, traverse_url);
        equal(context.spy_ajax.getCall(1).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(1).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(1).args[0].headers, undefined);
        equal(context.spy_ajax.getCall(1).args[0].data, undefined);

        equal(context.spy_ajax.getCall(2).args[0].type, "POST");
        equal(context.spy_ajax.getCall(2).args[0].url, put_url);
        equal(context.spy_ajax.getCall(2).args[0].dataType, "blob");
        deepEqual(context.spy_ajax.getCall(2).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(2).args[0].headers, undefined);
        ok(context.spy_ajax.getCall(2).args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.getCall(2).args[0].data);

        equal(server.requests.length, 3);
        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {});
        equal(server.requests[1].method, "GET");
        equal(server.requests[1].url, traverse_url);
        equal(server.requests[1].requestBody, undefined);
        equal(server.requests[1].withCredentials, true);
        deepEqual(server.requests[1].requestHeaders, {});
        equal(server.requests[2].method, "POST");
        equal(server.requests[2].url, put_url);
        equal(server.requests[2].withCredentials, true);

        equal(context.spy.callCount, 4, "FormData.append count");
        equal(context.spy.firstCall.args[0], "form_id", "First append call");
        equal(context.spy.firstCall.args[1], "Base_view", "First append call");
        equal(context.spy.secondCall.args[0], "field_my_title",
              "Second append call");
        equal(context.spy.secondCall.args[1], "barè", "Second append call");
        equal(context.spy.thirdCall.args[0], "field_my_id",
              "Third append call");
        equal(context.spy.thirdCall.args[1], "foo", "Third append call");
        equal(context.spy.getCall(3).args[0], "field_your_reference",
              "Fourth append call");
        equal(context.spy.getCall(3).args[1], "bar2", "Fourth append call");
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
              key: "field_your_reference",
              "default": "bar",
              editable: true,
              type: "StringField"
            },
            your_reference_non_editable: {
              key: "field_your_reference_non_editable",
              "default": "bar",
              editable: false,
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

  test("put non editable ERP5 document", function () {
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
    expect(12);

    this.jio.put(id, {title: "barè"})
      .fail(function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.message, "ERP5: can not modify document: " + id);
        equal(error.status_code, 403);

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
  // erp5Storage.post
  /////////////////////////////////////////////////////////////////
  module("erp5Storage.post", {
    setup: function () {

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.spy = sinon.spy(FormData.prototype, "append");
      this.spy_ajax = sinon.spy(jIO.util, "ajax");

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
      this.spy_ajax.restore();
      delete this.spy_ajax;
    }
  });

  test("post ERP5 document with access token", function () {
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
              key: "field_your_reference",
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
    expect(67);

    this.jio = jIO.createJIO({
      type: "erp5",
      url: domain,
      default_view_reference: "bar_view",
      access_token: 'footoken'
    });

    this.jio.post({
      title: "barè",
      id: "foo",
      portal_type: "Foo",
      parent_relative_url: "foo_module",
      reference: "bar2"
    })
      .then(function (result) {
        equal(result, id);

        equal(context.spy_ajax.callCount, 5, "ajax count");
        equal(context.spy_ajax.getCall(0).args[0].type, "GET");
        equal(context.spy_ajax.getCall(0).args[0].url, domain);
        equal(context.spy_ajax.getCall(0).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(0).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(0).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        equal(context.spy_ajax.getCall(0).args[0].data, undefined);

        equal(context.spy_ajax.getCall(1).args[0].type, "POST");
        equal(context.spy_ajax.getCall(1).args[0].url, add_url);
        equal(context.spy_ajax.getCall(1).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(1).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(1).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        ok(context.spy_ajax.getCall(1).args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.getCall(1).args[0].data);

        equal(context.spy_ajax.getCall(2).args[0].type, "GET");
        equal(context.spy_ajax.getCall(2).args[0].url, domain);
        equal(context.spy_ajax.getCall(2).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(2).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(2).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        equal(context.spy_ajax.getCall(2).args[0].data, undefined);

        equal(context.spy_ajax.getCall(3).args[0].type, "GET");
        equal(context.spy_ajax.getCall(3).args[0].url, traverse_url);
        equal(context.spy_ajax.getCall(3).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(3).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(3).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        equal(context.spy_ajax.getCall(3).args[0].data, undefined);

        equal(context.spy_ajax.getCall(4).args[0].type, "POST");
        equal(context.spy_ajax.getCall(4).args[0].url, put_url);
        equal(context.spy_ajax.getCall(4).args[0].dataType, "blob");
        deepEqual(context.spy_ajax.getCall(4).args[0].xhrFields, {
          withCredentials: false
        });
        deepEqual(context.spy_ajax.getCall(4).args[0].headers, {
          'X-ACCESS-TOKEN': 'footoken'
        });
        ok(context.spy_ajax.getCall(4).args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.getCall(4).args[0].data);

        equal(server.requests.length, 5);

        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, false);
        deepEqual(server.requests[0].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});

        equal(server.requests[1].method, "POST");
        equal(server.requests[1].url, add_url);
        equal(server.requests[1].withCredentials, false);

        equal(server.requests[2].method, "GET");
        equal(server.requests[2].url, domain);
        equal(server.requests[2].requestBody, undefined);
        equal(server.requests[2].withCredentials, false);
        deepEqual(server.requests[2].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});

        equal(server.requests[3].method, "GET");
        equal(server.requests[3].url, traverse_url);
        equal(server.requests[3].requestBody, undefined);
        equal(server.requests[3].withCredentials, false);
        deepEqual(server.requests[3].requestHeaders,
                  {'X-ACCESS-TOKEN': 'footoken'});

        equal(server.requests[4].method, "POST");
        equal(server.requests[4].url, put_url);
        equal(server.requests[4].withCredentials, false);

        equal(context.spy.callCount, 6, "FormData.append count");

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
        equal(context.spy.getCall(5).args[0], "field_your_reference",
              "Sixth append call");
        equal(context.spy.getCall(5).args[1], "bar2", "Sixth append call");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
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
            name: "Translated Person",
            href: "urn:jio:get:portal_types/Person"
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
              key: "field_your_reference",
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
    expect(67);

    this.jio.post({
      title: "barè",
      id: "foo",
      portal_type: "Foo",
      parent_relative_url: "foo_module",
      reference: "bar2"
    })
      .then(function (result) {
        equal(result, id);


        equal(context.spy_ajax.callCount, 5, "ajax count");
        equal(context.spy_ajax.getCall(0).args[0].type, "GET");
        equal(context.spy_ajax.getCall(0).args[0].url, domain);
        equal(context.spy_ajax.getCall(0).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(0).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(0).args[0].headers, undefined);
        equal(context.spy_ajax.getCall(0).args[0].data, undefined);

        equal(context.spy_ajax.getCall(1).args[0].type, "POST");
        equal(context.spy_ajax.getCall(1).args[0].url, add_url);
        equal(context.spy_ajax.getCall(1).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(1).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(1).args[0].headers, undefined);
        ok(context.spy_ajax.getCall(1).args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.getCall(1).args[0].data);

        equal(context.spy_ajax.getCall(2).args[0].type, "GET");
        equal(context.spy_ajax.getCall(2).args[0].url, domain);
        equal(context.spy_ajax.getCall(2).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(2).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(2).args[0].headers, undefined);
        equal(context.spy_ajax.getCall(2).args[0].data, undefined);

        equal(context.spy_ajax.getCall(3).args[0].type, "GET");
        equal(context.spy_ajax.getCall(3).args[0].url, traverse_url);
        equal(context.spy_ajax.getCall(3).args[0].dataType, undefined);
        deepEqual(context.spy_ajax.getCall(3).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(3).args[0].headers, undefined);
        equal(context.spy_ajax.getCall(3).args[0].data, undefined);

        equal(context.spy_ajax.getCall(4).args[0].type, "POST");
        equal(context.spy_ajax.getCall(4).args[0].url, put_url);
        equal(context.spy_ajax.getCall(4).args[0].dataType, "blob");
        deepEqual(context.spy_ajax.getCall(4).args[0].xhrFields, {
          withCredentials: true
        });
        deepEqual(context.spy_ajax.getCall(4).args[0].headers, undefined);
        ok(context.spy_ajax.getCall(4).args[0].data instanceof FormData,
           'FormData expected: ' + context.spy_ajax.getCall(4).args[0].data);

        equal(server.requests.length, 5);

        equal(server.requests[0].method, "GET");
        equal(server.requests[0].url, domain);
        equal(server.requests[0].requestBody, undefined);
        equal(server.requests[0].withCredentials, true);
        deepEqual(server.requests[0].requestHeaders, {});

        equal(server.requests[1].method, "POST");
        equal(server.requests[1].url, add_url);
        equal(server.requests[1].withCredentials, true);

        equal(server.requests[2].method, "GET");
        equal(server.requests[2].url, domain);
        equal(server.requests[2].requestBody, undefined);
        equal(server.requests[2].withCredentials, true);
        deepEqual(server.requests[2].requestHeaders, {});

        equal(server.requests[3].method, "GET");
        equal(server.requests[3].url, traverse_url);
        equal(server.requests[3].requestBody, undefined);
        equal(server.requests[3].withCredentials, true);
        deepEqual(server.requests[3].requestHeaders, {});

        equal(server.requests[4].method, "POST");
        equal(server.requests[4].url, put_url);
        equal(server.requests[4].withCredentials, true);

        equal(context.spy.callCount, 6, "FormData.append count");

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
        equal(context.spy.getCall(5).args[0], "field_your_reference",
              "Sixth append call");
        equal(context.spy.getCall(5).args[1], "bar2", "Sixth append call");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, sinon, encodeURIComponent, FormData));
