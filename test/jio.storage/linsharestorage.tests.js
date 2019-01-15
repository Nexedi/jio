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
/*jslint nomen: true */
/*global Blob*/
(function (jIO, QUnit) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    equal = QUnit.equal,
    deepEqual = QUnit.deepEqual,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // LinshareStorage constructor
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.constructor");

  test("create storage", function () {
    var jio = jIO.createJIO({
      type: "linshare"
    });
    equal(jio.__type, "linshare");
  });

  /////////////////////////////////////////////////////////////////
  // DropboxStorage.put
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.put");

  test("put new document", function () {
    stop();
    expect(2);
    var jio = jIO.createJIO({
      type: "linshare"
    });
    jio.post({"bar": "foo"})
      .then(function (id) {
        return jio.put(id, {"bar": "2713"});
      })
      .then(function (res) {
        console.warn(res);
        equal(res, "foo");
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
  // DropboxStorage.allDocs
  /////////////////////////////////////////////////////////////////
  module("LinshareStorage.allDocs");

  test("allDocs with include docs", function () {
    stop();
    expect(2);
    var jio = jIO.createJIO({
      type: "linshare"
    });
    jio.allDocs({include_docs: true})
      .then(function (result) {
        deepEqual(result, {}, 'check result');
      })
      .fail(function (error) {
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

}(jIO, QUnit));
