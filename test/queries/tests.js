/*
 * Copyright 2013, Nexedi SA
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
/*global jiodate*/
(function (jIO, jiodate) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    deepEqual = QUnit.deepEqual,
    expect = QUnit.expect,
    ok = QUnit.ok,
    module = QUnit.module;

  module('Query');

  // XXX test documentation
  test('Empty Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    stop();
    expect(1);
    jIO.QueryFactory.create('').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a"},
          {"identifier": ["b", "c"]}
        ], 'Nothing done on the list');
      }).always(start);
  });

  test('Simple Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    stop();
    expect(2);
    jIO.QueryFactory.create('identifier: "a"').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a"}
        ], 'Document with several identifier should be removed');

        doc_list = [
          {"identifier": "a"},
          {"identifier": ["a", "b"]}
        ];

        return jIO.QueryFactory.create('identifier: "a"').
          exec(doc_list);
      }).then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a"},
          {"identifier": ["a", "b"]}
        ], 'Document with several identifier should be kept');
      }).always(start);
  });

  test('Complex Query', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": ["b", "c"]}
    ];
    stop();
    expect(3);
    jIO.QueryFactory.create(
      'identifier: "b" AND identifier: "c"'
    ).exec(doc_list).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": ["b", "c"]}
      ], 'Document with only one identifier should be removed');

      doc_list = [
        {"identifier": "a"},
        {"identifier": ["b", "c"]}
      ];
      return jIO.QueryFactory.create(
        'identifier: "a" OR identifier: "c"'
      ).exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a"},
        {"identifier": ["b", "c"]}
      ], 'All document matches');

      doc_list = [
        {"identifier": "a", "title": "o"},
        {"identifier": ["b", "c"]}
      ];

      return jIO.QueryFactory.create(
        '(identifier: "a" OR identifier: "b") AND title: "o"'
      ).exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a", "title": "o"}
      ], 'Only first document should be kept');
    }).always(start);
  });

  test('Chinese Character', function () {
    var doc_list = [
      {"identifier": ["测试一", "测试四"]},
      {"identifier": ["测试一", "测试五"]},
      {"identifier": ["a", "b"]}
    ];
    stop();
    expect(4);
    jIO.QueryFactory.create(
      '(identifier: "%测试一%" OR identifier: "%测试二%") AND identifier: "%测试四%"'
    )
      .exec(
        doc_list
      ).then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": ["测试一", "测试四"]}
        ], 'Only first document should be kept');

        doc_list = [
          {"identifier": ["测试一", "测试四"]},
          {"identifier": ["测试一", "测试五"]},
          {"identifier": ["测试四", "b"]}
        ];
        return jIO.QueryFactory.create('identifier: "%测试%"')
          .exec(doc_list);
      })
      .then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": ["测试一", "测试四"]},
          {"identifier": ["测试一", "测试五"]},
          {"identifier": ["测试四", "b"]}
        ], 'All document should be kept');

        doc_list = [
          {"identifier": "测试一"},
          {"identifier": "测试一", "title": "标题"},
          {"identifier": "测试一", "title": "b"}
        ];
        return jIO.QueryFactory.create('identifier: "%测试%" AND title: "标题"')
          .exec(doc_list);
      })
      .then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "测试一", "title": "标题"}
        ], 'Only second document should be kept');

        return jIO.QueryFactory.create('测试')
          .exec(doc_list);
      })
      .then(function (doc_list) {
        deepEqual(doc_list, [{"identifier": "测试一", "title": "标题"}
          ], 'Full text query matched document should be returned');
      })
      .fail(function (error) {
        ok(false, error);
      }).always(start);
  });

  test('Wildcard Character', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": "a%"},
      {"identifier": "a\\%"},
      {"identifier": ["ab", "b"]}
    ];
    stop();
    expect(4);
    jIO.QueryFactory.create('identifier: "a%"').exec(
      doc_list
    ).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ], 'All documents should be kept');

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ];

      return jIO.QueryFactory.create('identifier: "a\\%"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a\\%"}
      ], 'Only third document should be kept');
      // yes.. it's weird but ERP5 acts like that.
      // `\` (or "\\") is taken literaly (= /\\/)

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ];

      return jIO.QueryFactory.create('identifier: "__"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
      ], 'Should keep nothing');

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ];

      return jIO.QueryFactory.create('identifier: "__%"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a%"},
        {"identifier": "a\\%"},
        {"identifier": ["ab", "b"]}
      ], 'First should not be kept');
      // yes.. it's weird but ERP5 acts like that.
      // `_` is not considered as wildcard (= /./)
    }).always(start);
  });

  test("Additional Filters", function () {
    var doc_list = [
      {"identifier": "b", "title": "e"},
      {"identifier": "a", "title": "f"},
      {"identifier": "b", "title": "d"}
    ];
    stop();
    expect(1);
    jIO.QueryFactory.create('').exec(doc_list, {
      "select_list": ["title"],
      "limit": [2, 1],
      "sort_on": [["identifier", "ascending"], ["title", "descending"]]
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"title": "d"}
      ], 'The first document should be kept');
    }).always(start);
  });

  test("JSON query", function () {
    var jsoned = jIO.QueryFactory.create(
      "NOT(a:=b OR c:% AND d:<2)"
    ).toJSON();
    deepEqual(
      jsoned,
      {
        "type": "complex",
        "operator": "NOT",
        "query_list": [{
          "type": "complex",
          "operator": "OR",
          "query_list": [{
            "key": "a",
            "operator": "=",
            "type": "simple",
            "value": "b"
          }, {
            "type": "complex",
            "operator": "AND",
            "query_list": [{
              "key": "c",
              "type": "simple",
              "value": "%"
            }, {
              "key": "d",
              "operator": "<",
              "type": "simple",
              "value": "2"
            }]
          }]
        }]
      },
      "\"NOT(a:=b OR c:% AND d:<2)\".toJSON()"
    );
    deepEqual(
      jIO.Query.parseStringToObject("NOT(a:=b OR c:% AND d:<2)"),
      jsoned,
      "parseStringToObject(\"NOT(a:=b OR c:% AND d:<2)\");"
    );

    deepEqual(
      jIO.QueryFactory.create(
        "NOT(a:=b OR c:% AND d:<2)"
      ),
      jIO.QueryFactory.create(
        jIO.QueryFactory.create(
          "NOT(a:=b OR c:% AND d:<2)"
        )
      ),
      "create(create(\"NOT(a:=b OR c:% AND d:<2)\"));"
    );

    deepEqual(
      jIO.QueryFactory.create(
        jIO.QueryFactory.create(
          "NOT(a:=b OR c:% AND d:<2)"
        )
      ).toString(),
      "NOT ( ( a: = b OR ( c:  % AND d: < 2 ) ) )",
      "create(create(\"NOT(a:=b OR c:% AND d:<2)\")).toString();"
    );

    deepEqual(
      jIO.QueryFactory.create(jIO.Query.objectToSearchText(jsoned)).toJSON(),
      jsoned,
      "create( objectToSearchText(create(\"NOT(a:=b OR c:% AND d:<2)\")" +
        ".toJSON()) ).toJSON()"
    );

    deepEqual(
      jIO.QueryFactory.create("a:(b OR c)").toString(),
      "a: (  b OR  c )",
      "create( \"a:(b OR c)\" ).toString()"
    );

    deepEqual(
      jIO.QueryFactory.create("(a:b OR a:c)").toString(),
      "a: (  b OR  c )",
      "create( \"(a:b OR a:c)\" ).toString()"
    );

    deepEqual(
      jIO.QueryFactory.create({
        "type": "complex",
        "query_list": [{
          "type": "simple",
          "value": "a"
        }, {
          "type": "simple",
          "value": "b"
        }]
      }).toString(),
      "(  a   b )",
      "{complex query without operator}.toString()"
    );

    deepEqual(
      jIO.QueryFactory.create({
        "type": "simple",
        "value": "b\\a"
      }).toString(),
      " b\\a",
      "{simple query with value: \"b\\\\a\"}.toString()"
    );

    deepEqual(
      jIO.QueryFactory.create({
        "type": "simple",
        "value": "b\\"
      }).toString(),
      " b\\",
      "{simple query with value: \"b\\\\\"}.toString()"
    );

    deepEqual(
      jIO.QueryFactory.create({
        "type": "simple",
        "value": '"a b"'
      }).toString(),
      " \"\\\"a b\\\"\"",
      "{simple query with value: '\"a b\"'}.toString()"
    );

    deepEqual(
      jIO.QueryFactory.create({
        "type": "simple",
        "value": "a b\\"
      }).toString(),
      " \"a b\"",  // ending backslash is lost to avoid to create an invalid query
      "{simple query with value: \"a b\\\\\"}.toString() -> XXX Is this really expected behavior ?"
    );

    deepEqual(
      jIO.Query.parseStringToObject('"\\"a b\\""'),
      {
        "type": "simple",
        "key": "",
        "value": '"a b"',
      },
      "parseStringToObject('\"\\\"a b\\\"\"')"
    );

    deepEqual(
      jIO.Query.parseStringToObject('a=b'),
      {
        "type": "simple",
        "key": "",
        "value": 'a=b',
      },
      "parseStringToObject('a=b')"
    );

    deepEqual(
      jIO.QueryFactory.create('identifier: "\\"').toJSON(),
      {
        "key": undefined,  // could not exist as JSON.stringify removes it
        "type": "simple",
        "value": 'identifier: "\\"',
      },
      "'identifier: \"\\\"'.toJSON()"
    );

    deepEqual(
      jIO.QueryFactory.create('identifier: "\\"').toString(),
      ' "identifier: \\"\\\\""',
      "'identifier: \"\\\"'.toString()"
    );

  });

  test('Docs with space, tab, and newline', function () {
    var doc_list = [
      {"identifier": "a"},
      {"identifier": "a "}
    ];
    stop();
    expect(3);
    jIO.QueryFactory.create('identifier: "%a%"').exec(
      doc_list
    ).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a"},
        {"identifier": "a "}
      ], 'Document with space is matched');

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a \t"}
      ];

      return jIO.QueryFactory.create('identifier: "%a%"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a"},
        {"identifier": "a \t"}
      ], 'Document with tab is matched');

      doc_list = [
        {"identifier": "a"},
        {"identifier": "a\n"},
        {"identifier": "\na\nb\nc\n"}
      ];

      return jIO.QueryFactory.create('identifier: "%a%"').
        exec(doc_list);
    }).then(function (doc_list) {
      deepEqual(doc_list, [
        {"identifier": "a"},
        {"identifier": "a\n"},
        {"identifier": "\na\nb\nc\n"}
      ], 'Documents with newlines are matched');
    }).always(start);
  });

  test('Default operator for complex query', function () {
    var doc_list = [
      {"identifier": "a", "value": "test1", "time": "2016"},
      {"identifier": "a", "value": "test", "time": "2016"},
      {"identifier": "c", "value": "test1", "time": "2017"}
    ];
    stop();
    expect(1);
    jIO.QueryFactory.create('identifier:%a% value:"%test1%" time:%2016%')
      .exec(doc_list)
      .then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a", "value": "test1", "time": "2016"}],
            'Document which matches all the fields is matched');
      }).always(start);
  });

  test('Full text query with single word', function () {
    var doc_list = [
      {"identifier": "a", "value": "test", "time": "2016"},
      {"identifier": "b", "value": "test 1", "time": "2017"},
      {"identifier": "c", "value": "test 2016", "time": "2017"}
    ];
    stop();
    expect(2);
    jIO.QueryFactory.create('test').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a", "value": "test", "time": "2016"},
          {"identifier": "b", "value": "test 1", "time": "2017"},
          {"identifier": "c", "value": "test 2016", "time": "2017"}
        ], 'Documents which have test in any column are matched');

        doc_list = [
          {"identifier": "a", "value": "test", "time": "2016"},
          {"identifier": "b", "value": "test 1", "time": "2017"},
          {"identifier": "c", "value": "test 2016", "time": "2017"}
        ];

        return jIO.QueryFactory.create('2016').exec(doc_list).
          then(function (doc_list) {
            deepEqual(doc_list, [
              {"identifier": "a", "value": "test", "time": "2016"},
              {"identifier": "c", "value": "test 2016", "time": "2017"}
            ], 'Documents which have 2016 in any column are matched');
          }).always(start);
      });
  });

  test('Full text query with multiple words', function () {
    var doc_list = [
      {"identifier": "a", "value": "test post", "time": "2016"},
      {"identifier": "b", "value": "test post 1", "time": "2017"},
      {"identifier": "c", "value": "test post 2016", "time": "2017"}
    ];
    stop();
    expect(2);
    jIO.QueryFactory.create('test post').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a", "value": "test post", "time": "2016"},
          {"identifier": "b", "value": "test post 1", "time": "2017"},
          {"identifier": "c", "value": "test post 2016", "time": "2017"}
        ], 'Documents which have test post in any column are matched');

        doc_list = [
          {"identifier": "a", "value": "test post", "time": "2016"},
          {"identifier": "b", "value": "test post 1", "time": "2017"},
          {"identifier": "c", "value": "test post 2016", "time": "2017"}
        ];

        return jIO.QueryFactory.create('test post 2016').exec(doc_list).
          then(function (doc_list) {
            deepEqual(doc_list, [
              {"identifier": "a", "value": "test post", "time": "2016"},
              {"identifier": "c", "value": "test post 2016", "time": "2017"}
            ], 'Documents which have test post 2016 in any column are matched');
          }).always(start);
      });
  });

  // Test queries which have components with key and without it.
  // Default operator used if not present is AND.
  test('Mixed query', function () {
    var doc_list = [
      {"identifier": "a", "value": "test1", "time": "2016"},
      {"identifier": "b", "value": "test2", "time": "2017"},
      {"identifier": "c", "value": "test3", "time": "2017"}
    ];
    stop();
    expect(2);
    jIO.QueryFactory.create('test2 time:%2017%').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "b", "value": "test2", "time": "2017"}
        ], 'Document with test2 in any column and 2017 in time is matched');

        doc_list = [
          {"identifier": "a", "value": "test post 1", "time": "2016"},
          {"identifier": "b", "value": "test post 2", "time": "2017"},
          {"identifier": "c", "value": "test post 3", "time": "2018"}
        ];

        return jIO.QueryFactory.create('value:"%test post 2%" OR c OR ' +
          '2016').exec(doc_list).
          then(function (doc_list) {
            deepEqual(doc_list, [
              {"identifier": "a", "value": "test post 1", "time": "2016"},
              {"identifier": "b", "value": "test post 2", "time": "2017"},
              {"identifier": "c", "value": "test post 3", "time": "2018"}
            ], 'Documents with "test post 2" in value or "c" or "2016" ' +
              'anywhere are matched');
          }).always(start);
      });
  });

  test('Case insensitive queries', function () {
    var doc_list = [
      {"identifier": "a", "value": "Test Post", "time": "2016"},
      {"identifier": "b", "value": "test post", "time": "2017"},
      {"identifier": "c", "value": "test3", "time": "2018"}
    ];
    stop();
    expect(2);
    jIO.QueryFactory.create('test post').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "a", "value": "Test Post", "time": "2016"},
          {"identifier": "b", "value": "test post", "time": "2017"}
        ], 'Documunts with the value irrespective of case are matched');

        doc_list = [
          {"identifier": "a", "value": "Test Post", "time": "2016"},
          {"identifier": "b", "value": "test post", "time": "2017"},
          {"identifier": "c", "value": "test3", "time": "2018"}
        ];

        return jIO.QueryFactory.create('value:"test post"').exec(doc_list).
          then(function (doc_list) {
            deepEqual(doc_list, [
              {"identifier": "b", "value": "test post", "time": "2017"}
            ], 'If value is in quotes, only match if exactly same');
          }).always(start);
      });
  });

  test('Query & sort_on option', function () {
    var doc_list = [
      {
        idendifier: 'a',
        date: "Fri, 08 Sep 2017 07:46:27 +0000"
      },
      {
        identifier: 'c',
        date: "Wed, 06 Sep 2017 00:27:13 +0000"
      },
      {
        identifier: 'b',
        date: "Thu, 07 Sep 2017 18:59:23 +0000"
      }
    ];
    stop();
    expect(2);
    jIO.QueryFactory.create("").exec(
      doc_list,
      {sort_on: [['date', 'descending']]}
    ).
      then(function (list) {
        var key_schema =
          {
            key_set: {
              date: {
                read_from: 'date',
                cast_to: 'dateType'
              }
            },
            cast_lookup: {
              dateType: function (str) {
                return jiodate.JIODate(new Date(str).toISOString());
              }
            }
          };
        deepEqual(list, [
          {
            identifier: 'c',
            date: "Wed, 06 Sep 2017 00:27:13 +0000"
          },
          {
            identifier: 'b',
            date: "Thu, 07 Sep 2017 18:59:23 +0000"
          },
          {
            idendifier: 'a',
            date: "Fri, 08 Sep 2017 07:46:27 +0000"
          }
        ], 'Document list is sorted');
        return jIO.QueryFactory.create("", key_schema).exec(
          doc_list,
          {sort_on: [['date', 'ascending']]}
        );
      })
      .then(function (list) {
        deepEqual(list, [
          {
            identifier: 'c',
            date: "Wed, 06 Sep 2017 00:27:13 +0000"
          },
          {
            identifier: 'b',
            date: "Thu, 07 Sep 2017 18:59:23 +0000"
          },
          {
            idendifier: 'a',
            date: "Fri, 08 Sep 2017 07:46:27 +0000"
          }
        ], 'Document list is sorted with key_schema');
      }).always(start);
  });
  // Asterisk wildcard is not supported yet.
/*  test('Full text query with asterisk', function () {
    var doc_list = [
      {"identifier": "abc"},
      {"identifier": "ab"}
    ];
    stop();
    expect(1);
    jIO.QueryFactory.create('a*').exec(doc_list).
      then(function (doc_list) {
        deepEqual(doc_list, [
          {"identifier": "abc"},
          {"identifier": "ab"}
        ], 'Documents which satisfy the asterisk wildcard should be returned')
          .always(start);
      });
  });*/

  test('Multiple sort_on options', function () {
    var i,
      len = 1000,
      doc_list = [];
    for (i = 0; i < len; i += 1) {
      doc_list.push({s: 'b', i: i});
    }

    stop();
    expect(1);
    jIO.QueryFactory.create("").exec(
      doc_list,
      {
        sort_on: [['s', 'ascending'], ['i', 'ascending']],
        limit: [0, 2]
      }
    )
      .then(function (list) {
        deepEqual(list, [
          {s: 'b', i: 0},
          {s: 'b', i: 1}
        ], 'Document list is sorted');
      }).always(start);
  });

}(jIO, jiodate));
