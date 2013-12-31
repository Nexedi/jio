
jIO Complex Queries
===================

What are Complex Queries?
-------------------------

In jIO, a complex query can ask a storage server to select, filter, sort, or
limit a document list before sending it back. If the server is not able to do
so, the complex query tool can do the filtering by itself on the client. Only the
``.allDocs()`` method can use complex queries.

A query can either be a string (using a specific language useful for writing
queries), or it can be a tree of objects (useful to browse queries). To handle
complex queries, jIO uses a parsed grammar file which is compiled using `JSCC <http://jscc.phorward-software.com/>`_.

Why use Complex Queries?
------------------------

Complex queries can be used like database queries, for tasks such as:

* search a specific document
* sort a list of documents in a certain order
* avoid retrieving a list of ten thousand documents
* limit the list to show only N documents per page

For some storages (like localStorage), complex queries can be a powerful tool
to query accessible documents. When querying documents on a distant storage,
some server-side logic should be run to avoid returning too many documents
to the client. If distant storages are static, an alternative would be to use
an indexStorage with appropriate indices as complex queries will always try
to run the query on the index before querying documents itself.

How to use Complex Queries with jIO?
------------------------------------

Complex queries can be triggered by including the option named **query** in the ``.allDocs()`` method call.

Example:

.. code-block:: javascript

    var options = {};

    // search text query
    options.query = '(creator:"John Doe") AND (format:"pdf")';

    // OR query tree
    options.query = {
      type: 'complex',
      operator: 'AND',
      query_list: [{
        type: 'simple',
        key: 'creator',
        value: 'John Doe'
      }, {
        type: 'simple',
        key: 'format',
        value: 'pdf'
      }]
    };

    // FULL example using filtering criteria
    options = {
      query: '(creator:"% Doe") AND (format:"pdf")',
      limit: [0, 100],
      sort_on: [
        ['last_modified', 'descending'],
        ['creation_date', 'descending']
      ],
      select_list: ['title'],
      wildcard_character: '%'
    };

    // execution
    jio_instance.allDocs(options, callback);


How to use Complex Queries outside jIO?
---------------------------------------

.. XXX 404 page missing on complex_example.html

Complex Queries provides an API - which namespace is complex_queries.
Refer to the `Complex Queries sample page <http://git.erp5.org/gitweb/jio.git/blob/HEAD:/examples/complex_example.html?js=1>`_
for how to use these methods, in and outside jIO. The module provides:

.. code-block:: javascript

    {
      parseStringToObject: [Function: parseStringToObject],
      stringEscapeRegexpCharacters: [Function: stringEscapeRegexpCharacters],
      select: [Function: select],
      sortOn: [Function: sortOn],
      limit: [Function: limit],
      convertStringToRegExp: [Function: convertStringToRegExp],
      QueryFactory: { [Function: QueryFactory] create: [Function] },
      Query: [Function: Query],
      SimpleQuery: {
          [Function: SimpleQuery] super_: [Function: Query]
      },
      ComplexQuery: {
          [Function: ComplexQuery] super_: [Function: Query]
      }
    }

(Reference API coming soon.)

Basic example:

.. code-block:: javascript

    // object list (generated from documents in storage or index)
    var object_list = [
      {"title": "Document number 1", "creator": "John Doe"},
      {"title": "Document number 2", "creator": "James Bond"}
    ];

    // the query to run
    var query = 'title: "Document number 1"';

    // running the query
    var result = complex_queries.QueryFactory.create(query).exec(object_list);
    // console.log(result);
    // [ { "title": "Document number 1", "creator": "John Doe"} ]


Other example:

.. code-block:: javascript

    var result = complex_queries.QueryFactory.create(query).exec(
      object_list,
      {
        "select": ['title', 'year'],
        "limit": [20, 20], // from 20th to 40th document
        "sort_on": [['title', 'ascending'], ['year', 'descending']],
        "other_keys_and_values": "are_ignored"
      }
    );
    // this case is equal to:
    var result = complex_queries.QueryFactory.
                                create(query).exec(object_list);
    complex_queries.sortOn([
                            ['title', 'ascending'],
                            ['year', 'descending']
                           ], result);
    complex_queries.limit([20, 20], result);
    complex_queries.select(['title', 'year'], result);


Complex Queries in storage connectors
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The query exec method must only be used if the server is not able to pre-select
documents. As mentioned before, you could use an indexStorage to maintain
indices with key information on all documents in a storage. This index file
will then be used to run queries, if all of the fields required in the query answer
are available in the index.

Matching properties
^^^^^^^^^^^^^^^^^^^

Complex Queries select items which exactly match the value given in the
query. You can use wildcards ('%' is the default wildcard character), and you
can change the wildcard character in the query options object. If you don't
want to use a wildcard, just set the wildcard character to an empty string.

.. code-block:: javascript

    var query = {
      query: 'creator:"* Doe"',
      wildcard_character: '*'
    };


Should default search types be defined in jIO or in user interface components?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Default search types should be defined in the application's user interface
components because criteria like filters will be changed frequently by the
component (change ``limit: [0, 10]`` to ``limit: [10, 10]`` or ``sort_on: [['title',
'ascending']]`` to ``sort_on: [['creator', 'ascending']]``) and each component must
have its own default properties to keep their own behavior.

Convert Complex Queries into another type
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Example, convert Query object into a human readable string:

.. code-block:: javascript

    var query = complex_queries.QueryFactory.
                               create('year: < 2000 OR title: "*a"'),
      option = {
        wildcard_character: '*',
        limit: [0, 10]
      },
      human_read = {
        "<": "is lower than ",
        "<=": "is lower or equal than ",
        ">": "is greater than ",
        ">=": "is greater or equal than ",
        "=": "matches ",
        "!=": "doesn't match "
      };

    query.onParseStart = function (object, option) {
      object.start = "The wildcard character is '" +
        (option.wildcard_character || "%") +
        "' and we need only the " +
        option.limit[1] +
        " elements from the number " +
        option.limit[0] + ". ";
    };

    query.onParseSimpleQuery = function (object, option) {
      object.parsed = object.parsed.key +
        " " + human_read[object.parsed.operator] +
        object.parsed.value;
    };

    query.onParseComplexQuery = function (object, option) {
      object.parsed = "I want all document where " +
        object.parsed.query_list.join(" " +
                              object.parsed.operator.toLowerCase() +
                              " ") +
        ". ";
    };

    query.onParseEnd = function (object, option) {
      object.parsed = object.start + object.parsed + "Thank you!";
    };

    console.log(query.parse(option));
    // logged: "The wildcard character is '*' and we need
    // only the 10 elements from the number 0. I want all
    // document where year is lower than 2000 or title
    // matches *a. Thank you!"


JSON Schemas and Grammar
------------------------

Below you can find schemas for constructing queries.

* Complex Queries JSON Schema:

  .. code-block:: javascript

    {
      "id": "ComplexQuery",
      "properties": {
        "type": {
          "type": "string",
          "format": "complex",
          "default": "complex",
          "description": "Type is used to recognize the query type"
        },
        "operator": {
          "type": "string",
          "format": "(AND|OR|NOT)",
          "required": true,
          "description": "Can be 'AND', 'OR' or 'NOT'."
        },
        "query_list": {
          "type": "array",
          "items": {
            "type": "object"
          },
          "required": true,
          "default": [],
          "description": "query_list is a list of queries which " +
                         "can be in serialized format " +
                         "or in object format."
        }
      }
    }
  
  
* Simple Queries JSON Schema:

  .. code-block:: javascript

    {
      "id": "SimpleQuery",
      "properties": {
        "type": {
          "type": "string",
          "format": "simple",
          "default": "simple",
          "description": "Type is used to recognize the query type."
        },
        "operator": {
          "type": "string",
          "default": "=",
          "format": "(>=?|<=?|!?=)",
          "description": "The operator used to compare."
        },
        "id": {
          "type": "string",
          "default": "",
          "description": "The column id."
        },
        "value": {
          "type": "string",
          "default": "",
          "description": "The value we want to search."
        }
      }
    }



* Complex Queries Grammar::

    search_text
        : and_expression
        | and_expression search_text
        | and_expression OR search_text
  
    and_expression
        : boolean_expression
        | boolean_expression AND and_expression
  
    boolean_expression
        : NOT expression
        | expression
  
    expression
        : ( search_text )
        | COLUMN expression
        | value
  
    value
        : OPERATOR string
        | string
  
    string
        : WORD
        | STRING
  
    terminal:
        OR               -> /OR[ ]/
        AND              -> /AND[ ]/
        NOT              -> /NOT[ ]/
        COLUMN           -> /[^><!= :\(\)"][^ :\(\)"]*:/
        STRING           -> /"(\\.|[^\\"])*"/
        WORD             -> /[^><!= :\(\)"][^ :\(\)"]*/
        OPERATOR         -> /(>=?|<=?|!?=)/
        LEFT_PARENTHESE  -> /\(/
        RIGHT_PARENTHESE -> /\)/
  
    ignore: " "


