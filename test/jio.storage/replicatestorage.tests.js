/*
 * Copyright 2014, Nexedi SA
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
/*global Blob*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    start,
    module = QUnit.module,
    big_string = "",
    j;

  for (j = 0; j < 30; j += 1) {
    big_string += "a";
  }

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('replicatestorage200', Storage200);

  function Storage500() {
    return this;
  }
  jIO.addStorage('replicatestorage500', Storage500);

  function Storage2713() {
    return this;
  }
  jIO.addStorage('signaturestorage2713', Storage2713);

  /////////////////////////////////////////////////////////////////
  // replicateStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.constructor");
  test("create substorage", function (assert) {
    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    assert.ok(jio.__storage._local_sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._local_sub_storage.__type,
                 "replicatestorage200");
    assert.ok(jio.__storage._remote_sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._remote_sub_storage.__type,
                 "replicatestorage500");

    assert.deepEqual(jio.__storage._query_options, {});
    assert.equal(jio.__storage._use_remote_post, false);
    assert.equal(jio.__storage._conflict_handling, 0);
    assert.equal(jio.__storage._parallel_operation_attachment_amount, 1);
    assert.equal(jio.__storage._parallel_operation_amount, 1);
    assert.equal(jio.__storage._check_local_creation, true);
    assert.equal(jio.__storage._check_local_deletion, true);
    assert.equal(jio.__storage._check_local_modification, true);
    assert.equal(jio.__storage._check_remote_creation, true);
    assert.equal(jio.__storage._check_remote_deletion, true);
    assert.equal(jio.__storage._check_remote_modification, true);
    assert.equal(jio.__storage._check_local_attachment_creation, false);
    assert.equal(jio.__storage._check_local_attachment_deletion, false);
    assert.equal(jio.__storage._check_local_attachment_modification, false);
    assert.equal(jio.__storage._check_remote_attachment_creation, false);
    assert.equal(jio.__storage._check_remote_attachment_deletion, false);
    assert.equal(jio.__storage._check_remote_attachment_modification, false);
    assert.equal(jio.__storage._signature_hash_key, undefined);

    assert.equal(jio.__storage._custom_signature_sub_storage, false);
    assert.equal(jio.__storage._signature_hash,
          "_replicate_7209dfbcaff00f6637f939fdd71fa896793ed385");

    assert.ok(jio.__storage._signature_sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._signature_sub_storage.__type, "query");

    assert.ok(jio.__storage._signature_sub_storage
          .__storage._sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._signature_sub_storage
             .__storage._sub_storage.__type, "document");

    assert.equal(jio.__storage._signature_sub_storage
             .__storage._sub_storage
             .__storage._document_id,
          jio.__storage._signature_hash);

    assert.ok(jio.__storage._signature_sub_storage
          .__storage._sub_storage
          .__storage._sub_storage
       instanceof jio.constructor);
    assert.equal(jio.__storage._signature_sub_storage
             .__storage._sub_storage
             .__storage._sub_storage.__type,
          "replicatestorage200");

  });

  test("accept parameters", function (assert) {
    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      },
      query: {query: 'portal_type: "Foo"', limit: [0, 1234567890]},
      use_remote_post: true,
      conflict_handling: 3,
      parallel_operation_attachment_amount: 2713,
      parallel_operation_amount: 2711,
      check_local_creation: false,
      check_local_deletion: false,
      check_local_modification: false,
      check_remote_creation: false,
      check_remote_deletion: false,
      check_remote_modification: false,
      check_local_attachment_creation: true,
      check_local_attachment_deletion: true,
      check_local_attachment_modification: true,
      check_remote_attachment_creation: true,
      check_remote_attachment_deletion: true,
      check_remote_attachment_modification: true,
      signature_hash_key: 'bar'
    });

    assert.deepEqual(
      jio.__storage._query_options,
      {query: 'portal_type: "Foo"', limit: [0, 1234567890],
        select_list: ['bar']}
    );
    assert.equal(jio.__storage._use_remote_post, true);
    assert.equal(jio.__storage._conflict_handling, 3);
    assert.equal(jio.__storage._parallel_operation_attachment_amount, 2713);
    assert.equal(jio.__storage._parallel_operation_amount, 2711);
    assert.equal(jio.__storage._check_local_creation, false);
    assert.equal(jio.__storage._check_local_deletion, false);
    assert.equal(jio.__storage._check_local_modification, false);
    assert.equal(jio.__storage._check_remote_creation, false);
    assert.equal(jio.__storage._check_remote_deletion, false);
    assert.equal(jio.__storage._check_remote_modification, false);
    assert.equal(jio.__storage._check_local_attachment_creation, true);
    assert.equal(jio.__storage._check_local_attachment_deletion, true);
    assert.equal(jio.__storage._check_local_attachment_modification, true);
    assert.equal(jio.__storage._check_remote_attachment_creation, true);
    assert.equal(jio.__storage._check_remote_attachment_deletion, true);
    assert.equal(jio.__storage._check_remote_attachment_modification, true);
    assert.equal(jio.__storage._signature_hash_key, 'bar');

    assert.equal(jio.__storage._custom_signature_sub_storage, false);
    assert.ok(jio.__storage._signature_sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._signature_sub_storage.__type, "query");

    assert.ok(jio.__storage._signature_sub_storage
          .__storage._sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._signature_sub_storage
             .__storage._sub_storage.__type, "document");

    assert.equal(jio.__storage._signature_sub_storage
             .__storage._sub_storage
             .__storage._document_id,
          jio.__storage._signature_hash);

    assert.ok(jio.__storage._signature_sub_storage
          .__storage._sub_storage
          .__storage._sub_storage
       instanceof jio.constructor);
    assert.equal(jio.__storage._signature_sub_storage
             .__storage._sub_storage
             .__storage._sub_storage.__type,
          "replicatestorage200");

    assert.equal(jio.__storage._signature_hash,
          "_replicate_291eaf37f6fa1ba6b6b115ab92b44cc88be0bb06");
  });

  test("reject unknow conflict resolution", function (assert) {
    assert.throws(
      function () {
        jIO.createJIO({
          type: "replicate",
          local_sub_storage: {
            type: "replicatestorage200"
          },
          remote_sub_storage: {
            type: "replicatestorage500"
          },
          query: {query: 'portal_type: "Foo"', limit: [0, 1234567890]},
          conflict_handling: 4
        });
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 400);
        assert.equal(error.message,
              "Unsupported conflict handling: 4");
        return true;
      }
    );
  });

  test("signature storage database", function (assert) {

    var jio = jIO.createJIO({
      type: "replicate",
      signature_sub_storage: {
        type: "memory"
      },
      local_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      },
      remote_sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory"
        }
      }
    });

    assert.equal(jio.__storage._custom_signature_sub_storage, true);
    assert.ok(jio.__storage._signature_sub_storage instanceof jio.constructor);
    assert.equal(jio.__storage._signature_sub_storage.__type, "memory");

    assert.ok(!jio.__storage.hasOwnProperty('_signature_hash'),
       jio.__storage._signature_hash);
  });


  /////////////////////////////////////////////////////////////////
  // replicateStorage.get
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.get");
  test("get called substorage get", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    Storage200.prototype.get = function (id) {
      assert.equal(id, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.post
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.post");
  test("post called substorage post", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    Storage200.prototype.post = function (param) {
      assert.deepEqual(param, {title: "bar"}, "post 200 called");
      return "foo";
    };

    jio.post({title: "bar"})
      .then(function (result) {
        assert.equal(result, "foo", "Check id");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.hasCapacity");
  test("hasCapacity return substorage value", function (assert) {
    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    delete Storage200.prototype.hasCapacity;

    assert.throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.status_code, 501);
        assert.equal(error.message,
              "Capacity 'foo' is not implemented on 'replicatestorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.buildQuery = function (options) {
      assert.deepEqual(options, {
        include_docs: false,
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        replicate: 'title: "two"'
      }, "allDocs parameter");
      return "bar";
    };

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      replicate: 'title: "two"'
    })
      .then(function (result) {
        assert.deepEqual(result, {
          data: {
            rows: "bar",
            total_rows: 3
          }
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
  // replicateStorage.put
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.put");
  test("put called substorage put", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    Storage200.prototype.put = function (id, param) {
      assert.equal(id, "bar", "put 200 called");
      assert.deepEqual(param, {"title": "foo"}, "put 200 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("put can not modify the signature", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    delete Storage200.prototype.put;

    jio.put(jio.__storage._signature_hash, {"title": "foo"})
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     jio.__storage._signature_hash + " is frozen");
        assert.equal(error.status_code, 403);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.remove
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.remove");
  test("remove called substorage remove", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    Storage200.prototype.remove = function (id) {
      assert.equal(id, "bar", "remove 200 called");
      return id;
    };

    jio.remove("bar", {"title": "foo"})
      .then(function (result) {
        assert.equal(result, "bar");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("remove can not modify the signature", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });
    delete Storage200.prototype.remove;

    jio.remove(jio.__storage._signature_hash)
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     jio.__storage._signature_hash + " is frozen");
        assert.equal(error.status_code, 403);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.getAttachment");
  test("called substorage getAttachment", function (assert) {
    start = assert.async();
    assert.expect(3);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    }),
      blob = new Blob([big_string]);

    Storage200.prototype.getAttachment = function (id, name) {
      assert.equal(id, "bar", "getAttachment 200 called");
      assert.equal(name, "foo", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        assert.equal(result, blob);
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function (assert) {
    start = assert.async();
    assert.expect(4);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      assert.equal(id, "bar", "putAttachment 200 called");
      assert.equal(name, "foo", "putAttachment 200 called");
      assert.deepEqual(blob2, blob,
                "putAttachment 200 called");
      return "OK";
    };

    jio.putAttachment("bar", "foo", blob)
      .then(function (result) {
        assert.equal(result, "OK");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("putAttachment can not modify the signature", function (assert) {
    start = assert.async();
    assert.expect(3);

    delete Storage200.prototype.putAttachment;

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    }),
      blob = new Blob([""]);

    jio.putAttachment(jio.__storage._signature_hash, "Foo", blob)
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     jio.__storage._signature_hash + " is frozen");
        assert.equal(error.status_code, 403);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment",
       function (assert) {
      start = assert.async();
      assert.expect(3);

      var jio = jIO.createJIO({
        type: "replicate",
        local_sub_storage: {
          type: "replicatestorage200"
        },
        remote_sub_storage: {
          type: "replicatestorage500"
        }
      });

      Storage200.prototype.removeAttachment = function (id, name) {
        assert.equal(id, "bar", "removeAttachment 200 called");
        assert.equal(name, "foo", "removeAttachment 200 called");
        return "OK";
      };

      jio.removeAttachment("bar", "foo")
        .then(function (result) {
          assert.equal(result, "OK");
        })
        .fail(function (error) {
          assert.ok(false, error);
        })
        .always(function () {
          start();
        });
    });

  test("removeAttachment can not modify the signature", function (assert) {
    start = assert.async();
    assert.expect(3);

    delete Storage200.prototype.removeAttachment;

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    jio.removeAttachment(jio.__storage._signature_hash, "Foo")
      .then(function () {
        assert.ok(false);
      })
      .fail(function (error) {
        assert.ok(error instanceof jIO.util.jIOError);
        assert.equal(error.message,
                     jio.__storage._signature_hash + " is frozen");
        assert.equal(error.status_code, 403);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // replicateStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("replicateStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function (assert) {
    start = assert.async();
    assert.expect(2);

    var jio = jIO.createJIO({
      type: "replicate",
      local_sub_storage: {
        type: "replicatestorage200"
      },
      remote_sub_storage: {
        type: "replicatestorage500"
      }
    });

    Storage200.prototype.allAttachments = function (id) {
      assert.equal(id, "bar", "allAttachments, 200 called");
      return {attachmentname: {}};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        assert.deepEqual(result, {
          attachmentname: {}
        }, "Check document");
      })
      .fail(function (error) {
        assert.ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
