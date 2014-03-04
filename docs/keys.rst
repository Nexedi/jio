
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

You can provide your own function to be used as '=' operator:

.. code-block:: javascript

  var strictEqual = function (object_value, comparison_value) {
    return comparison_value === object_value;
  };

  var query = {
    type: 'simple',
    key: {
      read_from: 'someproperty',
      equal_match: strictEqual
    },
    value: comparison_value
  }

Inside ``equal_match``, you can decide to interpret the wildcard character ``%``
or just ignore it, as in this case.

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


In this case, the operator is still the default '=' that works with strings.
You can combine ``cast_to`` and ``equal_match``:

.. code-block:: javascript

  var query = {
    type: 'simple',
    key: {
      read_from: 'someproperty',
      cast_to: numberType,
      equal_match: strictEqual
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

  ...
    cast_to: accentFold
  ...


A more robust solution to manage diacritics is recommended for production
environments, with unicode normalization, like (untested):
https://github.com/walling/unorm/


Overriding operators and sorting
--------------------------------

The advantage of providing an ``equal_match`` function is that it can work with basic types;
you can keep the values as strings or, if you use a ``cast_to`` function, it can return strings,
numbers, arrays... and that's fine if all you need is the '=' operator.

It's also possible to customize the behavior of the other operators: <, >, !=...

To do that, the object returned by ``cast_to`` must contain a ``.cmp``
property, that behaves like the ``compareFunction`` described in
`Array.prototype.sort() <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort>`_:


.. code-block:: javascript

  function myType (...) {
    ...
    return {
      ...
      'cmp': function (b) {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return +1;
        }
        return 0;
      }
    };
  }

  ...
    cast_to: myType
  ...

If the < or > comparison makes no sense for the objects, the function should return ``undefined``.

The ``.cmp()`` property is also used, if present, by the sorting feature of queries.



Partial Date/Time match
-----------------------

As a real life example, consider a list of documents that have a *start_task* property.

The value of ``start_task`` can be an `ISO 8601 <http://en.wikipedia.org/wiki/ISO_8601>`_ string
with date and time information including fractions of a second. Which is, honestly, a bit too
much for most queries.

By using a ``cast_to`` function with custom operators, it is possible to perform queries like
"start_task > 2010-06", or "start_task != 2011". Partial time can be used as well, so
we can ask for projects started after noon of a given day: ``start_task = "2011-04-05" AND start_task > "2011-04-05 12"``

The JIODate type has been implemented on top of the `Moment.js <http://momentjs.com/>`_ library, which
has a rich API with support for multiple languages and timezones. No special support for timezones
is present (yet) in JIODate.

To use JIODate, include the ``jiodate.js`` and ``moment.js`` files in your
application, then set ``cast_to = jiodate.JIODate``.



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
        equal_match: 'sameDay'
      },
      date_month: {
        read_from: 'date',
        cast_to: 'dateType',
        equal_match: 'sameMonth'
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
  be used if ``equal_match`` is a string. If match_lookup is not provided,
  then ``equal_match`` must be a function.


Using a schema
--------------

A schema can be used:

* In a query constructor. The same schema will be applied to all the sub-queries:

.. code-block:: javascript

  jIO.QueryFactory.create({...}, key_schema).exec(...);


* In the ``jIO.createJIO()`` method. The same schema will be used
  by all the queries created with the ``.allDocs()`` method:

.. code-block:: javascript

  var jio = jIO.createJIO({
    type: 'local',
    username: '...',
    application_name: '...',
    key_schema: key_schema
  });
