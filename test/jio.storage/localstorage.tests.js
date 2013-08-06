/*jslint indent: 2, maxlen: 80, nomen: true */
/*global define, jIO, jio_tests, window, test, ok, deepEqual, sinon, expect */

// define([module_name], [dependencies], module);
(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  module(jIO, jio_tests);
}(['jio', 'jio_tests', 'localstorage'], function (jIO, util) {
  "use strict";

  function generateTools() {
    return {
      clock: sinon.useFakeTimers(),
      spy: util.ospy,
      tick: util.otick
    };
  }

  module("LocalStorage");

  test("Post", function () {
    expect(5);
    var clock = sinon.useFakeTimers(), jio = jIO.newJio({
      "type": "local",
      "username": "upost",
      "application_name": "apost"
    });

    // post without id
    jio.post({}, function (err, response) {
      var uuid;
      util.
        spyJioCallback('jobstatus', 'done', "Post without id")(err, response);
      uuid = (err || response).id;
      ok(util.isUuid(uuid), "Uuid should look like " +
         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx : " + uuid);
    });
    clock.tick(1000);

    // post non empty document
    jio.post(
      {"_id": "post1", "title": "myPost1"},
      util.spyJioCallback("value", {"ok": true, "id": "post1"}, "Post")
    );
    clock.tick(1000);

    deepEqual(
      util.jsonlocalstorage.getItem("jio/localstorage/upost/apost/post1"),
      {
        "_id": "post1",
        "title": "myPost1"
      },
      "Check document"
    );

    // post but document already exists
    jio.post({"_id": "post1", "title": "myPost2"}, util.spyJioCallback(
      "status",
      409,
      "Post but document already exists"
    ));
    clock.tick(1000);

    util.closeAndcleanUpJio(jio);
  });

  test("Put", function () {
    expect(5);
    var clock = sinon.useFakeTimers(), jio = jIO.newJio({
      "type": "local",
      "username": "uput",
      "application_name": "aput"
    });

    // put without id
    // error 20 -> document id required
    jio.put({}, util.spyJioCallback("status", 20, "Put without id"));
    clock.tick(1000);

    // put non empty document
    jio.put({"_id": "put1", "title": "myPut1"}, util.spyJioCallback("value", {
      "ok": true,
      "id": "put1"
    }, "Creates a document"));
    clock.tick(1000);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem("jio/localstorage/uput/aput/put1"),
      {
        "_id": "put1",
        "title": "myPut1"
      },
      "Check document"
    );

    // put but document already exists
    jio.put({"_id": "put1", "title": "myPut2"}, util.spyJioCallback("value", {
      "ok": true,
      "id": "put1"
    }, "Update the document"));
    clock.tick(1000);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem("jio/localstorage/uput/aput/put1"),
      {
        "_id": "put1",
        "title": "myPut2"
      },
      "Check document"
    );

    util.closeAndcleanUpJio(jio);
  });

  test("PutAttachment", function () {

    var o = generateTools(this);

    o.jio = jIO.newJio({
      "type": "local",
      "username": "uputattmt",
      "application_name": "aputattmt"
    });

    // putAttachment without doc id
    // error 20 -> document id required
    o.spy(o, "status", 20, "PutAttachment without doc id");
    o.jio.putAttachment({}, o.f);
    o.tick(o);

    // putAttachment without attachment id
    // error 22 -> attachment id required
    o.spy(o, "status", 22, "PutAttachment without attachment id");
    o.jio.putAttachment({"_id": "putattmt1"}, o.f);
    o.tick(o);

    // putAttachment without document
    // error 404 -> not found
    o.spy(o, "status", 404, "PutAttachment without document");
    o.jio.putAttachment({"_id": "putattmt1", "_attachment": "putattmt2"}, o.f);
    o.tick(o);

    // adding a document
    util.jsonlocalstorage.setItem(
      "jio/localstorage/uputattmt/aputattmt/putattmt1",
      {
        "_id": "putattmt1",
        "title": "myPutAttmt1"
      }
    );

    // putAttachment with document
    o.spy(o, "value",
          {"ok": true, "id": "putattmt1", "attachment": "putattmt2"},
          "PutAttachment with document, without data");
    o.jio.putAttachment({"_id": "putattmt1", "_attachment": "putattmt2"}, o.f);
    o.tick(o);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem(
        "jio/localstorage/uputattmt/aputattmt/putattmt1"
      ),
      {
        "_id": "putattmt1",
        "title": "myPutAttmt1",
        "_attachments": {
          "putattmt2": {
            "length": 0,
            // md5("")
            "digest": "md5-d41d8cd98f00b204e9800998ecf8427e"
          }
        }
      },
      "Check document"
    );

    // check attachment
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/uputattmt/aputattmt/putattmt1/putattmt2"
    ), "", "Check attachment");

    // update attachment
    o.spy(o, "value",
          {"ok": true, "id": "putattmt1", "attachment": "putattmt2"},
          "Update Attachment, with data");
    o.jio.putAttachment({
      "_id": "putattmt1",
      "_attachment": "putattmt2",
      "_data": "abc"
    }, o.f);
    o.tick(o);

    // check document
    deepEqual(
      util.jsonlocalstorage.getItem(
        "jio/localstorage/uputattmt/aputattmt/putattmt1"
      ),
      {
        "_id": "putattmt1",
        "title": "myPutAttmt1",
        "_attachments": {
          "putattmt2": {
            "length": 3,
            // md5("abc")
            "digest": "md5-900150983cd24fb0d6963f7d28e17f72"
          }
        }
      },
      "Check document"
    );

    // check attachment
    deepEqual(util.jsonlocalstorage.getItem(
      "jio/localstorage/uputattmt/aputattmt/putattmt1/putattmt2"
    ), "abc", "Check attachment");

    util.closeAndcleanUpJio(o.jio);
  });

  test("Get", function () {

    var o = generateTools(this);

    o.jio = jIO.newJio({
      "type": "local",
      "username": "uget",
      "application_name": "aget"
    });

    // get inexistent document
    o.spy(o, "status", 404, "Get inexistent document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment
    o.spy(o, "status", 404, "Get inexistent attachment");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // adding a document
    o.doc_get1 = {
      "_id": "get1",
      "title": "myGet1"
    };
    util.jsonlocalstorage.setItem(
      "jio/localstorage/uget/aget/get1",
      o.doc_get1
    );

    // get document
    o.spy(o, "value", o.doc_get1, "Get document");
    o.jio.get({"_id": "get1"}, o.f);
    o.tick(o);

    // get inexistent attachment (document exists)
    o.spy(o, "status", 404, "Get inexistent attachment (document exists)");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    // adding an attachment
    o.doc_get1._attachments = {
      "get2": {
        "length": 2,
        // md5("de")
        "digest": "md5-5f02f0889301fd7be1ac972c11bf3e7d"
      }
    };
    util.jsonlocalstorage.setItem(
      "jio/localstorage/uget/aget/get1",
      o.doc_get1
    );
    util.jsonlocalstorage.setItem("jio/localstorage/uget/aget/get1/get2", "de");

    // get attachment
    o.spy(o, "value", "de", "Get attachment");
    o.jio.getAttachment({"_id": "get1", "_attachment": "get2"}, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

  test("Remove", function () {

    var o = generateTools(this);

    o.jio = jIO.newJio({
      "type": "local",
      "username": "uremove",
      "application_name": "aremove"
    });

    // remove inexistent document
    o.spy(o, "status", 404, "Remove inexistent document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // remove inexistent attachment
    o.spy(o, "status", 404, "Remove inexistent attachment");
    o.jio.removeAttachment({"_id": "remove1", "_attachment": "remove2"}, o.f);
    o.tick(o);

    // adding a document + attmt
    util.jsonlocalstorage.setItem("jio/localstorage/uremove/aremove/remove1", {
      "_id": "remove1",
      "title": "myRemove1",
      "_attachments": {
        "remove2": {
          "length": 4,
          "digest": "md5-blahblah"
        }
      }
    });
    util.jsonlocalstorage.setItem(
      "jio/localstorage/uremove/aremove/remove1/remove2",
      "fghi"
    );

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "remove1", "attachment": "remove2"},
          "Remove document");
    o.jio.removeAttachment({"_id": "remove1", "_attachment": "remove2"}, o.f);
    o.tick(o);

    // remove document
    o.spy(o, "value", {"ok": true, "id": "remove1"}, "Remove document");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);

    // check document
    ok(util.jsonlocalstorage.getItem(
      "jio/localstorage/uremove/aremove/remove1"
    ) === null, "Check document is removed");

    // adding a document + attmt
    util.jsonlocalstorage.setItem("jio/localstorage/uremove/aremove/remove1", {
      "_id": "remove1",
      "title": "myRemove1",
      "_attachments": {
        "remove2": {
          "length": 4,
          "digest": "md5-blahblah"
        }
      }
    });
    util.jsonlocalstorage.setItem(
      "jio/localstorage/uremove/aremove/remove1/remove2", "fghi");

    // remove attachment
    o.spy(o, "value", {"ok": true, "id": "remove1"},
          "Remove document and attachment");
    o.jio.remove({"_id": "remove1"}, o.f);
    o.tick(o);
    ok(util.jsonlocalstorage.getItem(
      "jio/localstorage/uremove/aremove/remove1"
    ) === null, "Check document is removed");
    ok(util.jsonlocalstorage.getItem(
      "jio/localstorage/uremove/aremove/remove1/remove2"
    ) === null, "Check attachment is removed");

    util.closeAndcleanUpJio(o.jio);
  });

  test("AllDocs", function () {

    var o = generateTools(this), i, m = 15;

    o.jio = jIO.newJio({
      "type": "local",
      "username": "ualldocs",
      "application_name": "aalldocs"
    });
    o.localpath = "jio/localstorage/ualldocs/aalldocs";

    // sample data
    o.titles = [
      "Shawshank Redemption",
      "Godfather",
      "Godfather 2",
      "Pulp Fiction",
      "The Good, The Bad and The Ugly",
      "12 Angry Men",
      "The Dark Knight",
      "Schindlers List",
      "Lord of the Rings - Return of the King",
      "Fight Club",
      "Star Wars Episode V",
      "Lord Of the Rings - Fellowship of the Ring",
      "One flew over the Cuckoo's Nest",
      "Inception",
      "Godfellas"
    ];
    o.years = [
      1994,
      1972,
      1974,
      1994,
      1966,
      1957,
      2008,
      1993,
      2003,
      1999,
      1980,
      2001,
      1975,
      2010,
      1990
    ];
    o.director = [
      "Frank Darabont",
      "Francis Ford Coppola",
      "Francis Ford Coppola",
      "Quentin Tarantino",
      "Sergio Leone",
      "Sidney Lumet",
      "Christopher Nolan",
      "Steven Spielberg",
      "Peter Jackson",
      "David Fincher",
      "Irvin Kershner",
      "Peter Jackson",
      "Milos Forman",
      "Christopher Nolan",
      "Martin Scorsese"
    ];

    for (i = 0; i < m; i += 1) {
      o.fakeDoc = {};
      o.fakeDoc._id = "doc_"+(i < 10 ? "0"+i : i);
      o.fakeDoc.title = o.titles[i];
      o.fakeDoc.year = o.years[i];
      o.fakeDoc.author = o.director[i];
      if (i === 5) {
        o.fakeDoc._attachments = {
          "att": {
            "digest": "md5-dontcare",
            "content_type": "text/plain",
            "length": 3
          }
        };
        util.jsonlocalstorage.setItem(o.localpath + "/doc_05/att", "abc");
      }
      util.jsonlocalstorage.setItem(
        o.localpath+"/doc_"+(i < 10 ? "0"+i : i),
        o.fakeDoc
      );
    }

    // response
    o.allDocsResponse = {};
    o.allDocsResponse.rows = [];
    o.allDocsResponse.total_rows = 15;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse.rows.push({
        "id": "doc_"+(i < 10 ? "0"+i : i),
        "key": "doc_"+(i < 10 ? "0"+i : i),
        "value": {}
      });
    }
    // alldocs
    o.spy(o, "value", o.allDocsResponse, "All docs");
    o.jio.allDocs(function (err, response) {
      if (response && response.rows) {
        response.rows.sort(function (a, b) {
          return a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
        });
      }
      o.f(err, response);
    });
    o.tick(o);

    // include docs
    o.allDocsResponse = {};
    o.allDocsResponse.rows = [];
    o.allDocsResponse.total_rows = m;
    for (i = 0; i < m; i += 1) {
      o.allDocsResponse.rows.push({
        "id": "doc_"+(i < 10 ? "0"+i : i),
        "key": "doc_"+(i < 10 ? "0"+i : i),
        "value": {},
        "doc": util.jsonlocalstorage.getItem(
          o.localpath+"/doc_"+(i < 10 ? "0"+i : i)
        )
      });
    }

    // alldocs
    o.spy(o, "value", o.allDocsResponse, "All docs (include docs)");
    o.jio.allDocs({"include_docs": true}, function (err, response) {
      if (response && response.rows) {
        response.rows.sort(function (a, b) {
          return a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
        });
      }
      o.f(err, response);
    });
    o.tick(o);

    // complex queries
    o.thisShouldBeTheAnswer4 = {"total_rows": 0, "rows": []};
    o.allDocsResponse.rows.forEach(function (row) {
      var new_row;
      if (row.doc.year >= 1980) {
        new_row = JSON.parse(JSON.stringify(row));
        new_row.value.title = row.doc.title;
        new_row.value.year = row.doc.year;
        delete new_row.doc;
        o.thisShouldBeTheAnswer4.rows.push(new_row);
        o.thisShouldBeTheAnswer4.total_rows += 1;
      }
    });
    o.thisShouldBeTheAnswer4.rows.sort(function (a, b) {
      return a.value.year > b.value.year ? -1 :
        a.value.year < b.value.year ? 1 : 0;
    });
    o.thisShouldBeTheAnswer4.total_rows = 5;
    o.thisShouldBeTheAnswer4.rows.length = 5;

    o.spy(o, "value", o.thisShouldBeTheAnswer4,
          "allDocs (complex queries year >= 1980, all query options)");
    o.jio.allDocs({
      "query": '(year: >= "1980")',
      "limit": [0,5],
      "sort_on": [["year", "descending"]],
      "select_list": ["title", "year"]
    }, o.f);
    o.tick(o);

    // empty query returns all
    o.thisShouldBeTheAnswer5 = {"total_rows": 0, "rows": []};
    o.allDocsResponse.rows.forEach(function (row) {
      var new_row = JSON.parse(JSON.stringify(row));
      new_row.value.title = row.doc.title;
      o.thisShouldBeTheAnswer5.rows.push(new_row);
      o.thisShouldBeTheAnswer5.total_rows += 1;
    });
    o.thisShouldBeTheAnswer5.rows.sort(function (a, b) {
      return a.value.title > b.value.title ? -1 :
        a.value.title < b.value.title ? 1 : 0;
    });

    o.spy(o, "value", o.thisShouldBeTheAnswer5,
          "allDocs (empty query in complex query)");

    o.jio.allDocs({
      "sort_on": [["title", "descending"]],
      "select_list": ["title"],
      "include_docs": true
    }, o.f);
    o.tick(o);

    util.closeAndcleanUpJio(o.jio);
  });

}));
