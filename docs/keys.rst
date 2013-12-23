
Search Keys
===========

Features like case insensitive, accent-removing, full-text searches and more can be implemented
by customizing jIO's query behavior.

Let's start with a simple search:

.. code-block:: javascript

  var query = {
    type: 'simple',
    key: 'someproperty',
    value: comparison_value,
    operator: '='
  }

Each of the ``.someproperty`` attribute in objects' metadata is compared with
``comparison_value`` through a function defined by the '=' operator.

Such comparison functions (=, !=, <...) are predefined in jIO, but you can provide your own:

.. code-block:: javascript

  var strictEqual = function (object_value, comparison_value,
                              wildcard_character) {
    return comparison_value === object_value;
  };

  var query = {
    type: 'simple',
    key: {
      read_from: 'someproperty',
      default_match: strictEqual
    },
    value: comparison_value
  }

Note: ``default_match`` will only be used if no ``operator`` is specified.
You may decide to interpret the ``wildcard_character`` or just ignore it, as in this case.


If you need to convert or preprocess the values before comparison, you can provide
a conversion function:

.. code-block:: javascript

  var numberType = function (obj) {
    return parseFloat('3.14');
  };

  var query = {
    type: 'simple',
    key: {
      read_from: 'someproperty',
      cast_to: numberType
    },
    value: comparison_value
  }


In this case, the operator is still the default '='.
You can combine ``cast_to`` and ``default_match``:

.. code-block:: javascript

  var query = {
    type: 'simple',
    key: {
      read_from: 'someproperty',
      cast_to: numberType,
      default_match: strictEqual
    },
    value: comparison_value
  }

Now the query returns all objects for which the following is true:

.. code-block:: javascript

    strictEqual(numberType(metadata.someproperty),
                numberType(comparison_value))


For a more useful example, the following function removes the accents
from any string:


.. code-block:: javascript

  var accentFold = function (s) {
    var map = [
      [new RegExp('[àáâãäå]', 'gi'), 'a'],
      [new RegExp('æ', 'gi'), 'ae'],
      [new RegExp('ç', 'gi'), 'c'],
      [new RegExp('[èéêë]', 'gi'), 'e'],
      [new RegExp('[ìíîï]', 'gi'), 'i'],
      [new RegExp('ñ', 'gi'), 'n'],
      [new RegExp('[òóôõö]', 'gi'), 'o'],
      [new RegExp('œ', 'gi'), 'oe'],
      [new RegExp('[ùúûü]', 'gi'), 'u'],
      [new RegExp('[ýÿ]', 'gi'), 'y']
    ];

    map.forEach(function (o) {
      var rep = function (match) {
        if (match.toUpperCase() === match) {
          return o[1].toUpperCase();
        }
        return o[1];
      };
      s = s.replace(o[0], rep);
    });
    return s;
  };


A more robust solution to manage diacritics is recommended for production
environments, with unicode normalization, like (untested):
https://github.com/walling/unorm/



Key Schemas
-----------

Instead of providing the key object for each attribute you want to filter,
you can group all of them in a schema object for reuse:

.. code-block:: javascript

  var key_schema = {
    key_set: {
      date_day: {
        read_from: 'date',
        cast_to: 'dateType',
        default_match: 'sameDay'
      },
      date_month: {
        read_from: 'date',
        cast_to: 'dateType',
        default_match: 'sameMonth'
      }
    },
    cast_lookup: {
      dateType: function (obj) {
        if (Object.prototype.toString.call(obj) === '[object Date]') {
          return obj;
        }
        return new Date(obj);
      }
    },
    match_lookup: {
      sameDay: function (a, b) {
        return (
          (a.getFullYear() === b.getFullYear()) &&
            (a.getMonth() === b.getMonth()) &&
              (a.getDate() === b.getDate())
        );
      },
      sameMonth: function (a, b) {
        return (
          (a.getFullYear() === b.getFullYear()) &&
            (a.getMonth() === b.getMonth())
        );
      }
    }
  }


With this schema, we have created two 'virtual' metadata attributes,
``date_day`` and ``date_month``. When queried, they match values that
happen to be in the same day, ignoring the time, or the same month, ignoring
both time and day.


A key_schema object can have three properties:

* ``key_set`` - required.

* ``cast_lookup`` - optional, a mapping of name: function that will
  be used if cast_to is a string. If cast_lookup is not provided,
  then cast_to must be a function.

* ``match_lookup`` - optional, a mapping of name: function that will
  be used if default_match is a string. If match_lookup is not provided,
  then default_match must be a function.


Using a schema
^^^^^^^^^^^^^^

A schema can be used:

* In a query constructor. The same schema will be applied to all the sub-queries:

.. code-block:: javascript

  complex_queries.QueryFactory.create({...}, key_schema).exec(...);


* In the ``jIO.createJIO()`` method. The same schema will be used
  by all the queries created with the ``.allDocs()`` method:

.. code-block:: javascript

  var jio = jIO.createJIO({
    type: 'local',
    username: '...',
    application_name: '...',
    key_schema: key_schema
  });


