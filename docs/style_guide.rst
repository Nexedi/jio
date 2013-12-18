
.. _style-guide:

JavaScript Style Guide
======================

This document defines JavaScript style conventions, which are split into essential, coding and naming conventions.

Essential Conventions
---------------------

Essential conventions include generic patterns that you should adhere to in order to write *readable*, *consistent* and *maintainable* code.

Minimizing Globals
^^^^^^^^^^^^^^^^^^

Variable declarations should always be done using *var* to not declare them as
global variables. This avoids conflicts from using a variable name across
different functions as well as conflicts with global variables declared by third
party plugins.

.. XXX always pub good+bad or bad+good examples in the same order

Good Example

.. code-block:: javascript

  function sum(x, y) { 
    var result = x + y; 
    return result; 
  }

Bad Example

.. code-block:: javascript

  function sum(x, y) { 
    // missing var declaration, implied global 
    result = x + y; 
    return result; 
  }


Using JSLint
^^^^^^^^^^^^

`JSLint <http://www.jslint.com/>`_ is a quality tool that inspects code and warns
about potential problems. It can be used online and can also be integrated
into several development environments, so errors can be highlighted while
writing code.

Before validating your code in JSLint, you should use a code
beautifier to fix basic syntax errors (like indentation) automatically. There
are a number of beautifiers available online. The following ones seem to work best:

* `JSbeautifier.org <http://jsbeautifier.org/>`_
* `JS-Beautify <http://alexis.m2osw.com/js-beautify/>`_

In this project, JavaScript sources have to begin with the header:

.. code-block:: javascript

    /*jslint indent: 2, maxlen: 80, nomen: true */
    
which means it uses two spaces indentation, 80
maximum characters per line and allows variable names starting with '_'.
Other JSLint options can be added in sub functions if necessary.

Some allowed options are:

* ``ass: true`` if assignment should be allowed outside of statement position.
* ``bitwise: true`` if bitwise operators should be allowed.
* ``continue: true`` if the continue statement should be allowed.
* ``newcap: true`` if Initial Caps with constructor function is optional.
* ``regexp: true`` if ``.`` and ``[^...]`` should be allowed in RegExp literals. They match more material than might be expected, allowing attackers to confuse applications. These forms should not be used when validating in secure applications.
* ``unparam: true`` if warnings should be silenced for unused parameters.


Coding Conventions
------------------

Coding conventions include generic patterns that ensure the written code is consistently formatted.


Using two-space indentation
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Tabs and 2-space indentation are being used equally. Since a lot of errors on
JSLint often result from mixed use of space and tab, using 2 spaces throughout
prevents these errors up front.


Good Example

.. code-block:: javascript

  function outer(a, b) {
    var c = 1,
      d = 2,
      inner;
    if (a > b) {
      inner = function () {
        return {
          "r": c - d
        };
      };
    } else {
      inner = function () {
        return {
          "r": c + d
        };
      };
    }
    return inner; 
  }  

Bad Example

.. code-block:: javascript

  function outer(a, b) { 
  var c = 1, 
  d = 2, 
  inner; 
    
  if (a > b) { 
  inner = function () { 
  return { 
  r: c - d 
  }}}};


Using shorthand for conditional statements
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

An alternative for using braces is the shorthand notation for conditional
statements. When using multiple conditions, the conditional statement can be
split on multiple lines.

Good Example

.. code-block:: javascript

  // single line
  var results = test === true ? alert(1) : alert(2);

  // multiple lines
  var results = (test === true && number === undefined ?
                 alert(1) : alert(2));

  var results = (test === true ?
                 alert(1) : number === undefined ?
                 alert(2) : alert(3));

Bad Example

.. code-block:: javascript

  // multiple conditions
  var results = (test === true && number === undefined) ?
    alert(1) :
    alert(2);

Opening Brace Location
^^^^^^^^^^^^^^^^^^^^^^

Always put the opening brace on the same line as the previous statement.

Bad Example

.. code-block:: javascript

  function func() 
  {
    return 
    { 
      "name": "Batman" 
    }; 
  }


Good Example

.. code-block:: javascript

  function func() { 
    return { 
      "name": "Batman" 
    };
  }


Closing Brace Location
^^^^^^^^^^^^^^^^^^^^^^

The closing brace should be on the same indent level as the original function call.

Bad Example

.. code-block:: javascript

  function func() {
    return { 
             "name": "Batman" 
           }; 
  }

Good Example

.. code-block:: javascript

  function func() { 
    return { 
      "name": "Batman" 
    }; 
  }


Function Declaration Location
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Non anonymous functions should be declared before use.

Bad Example

.. code-block:: javascript

  return {
    "namedFunction": function namedFunction() {
      return;
    }
  };

Good Example

.. code-block:: javascript

  function namedFunction() {
    return;
  }
  return {
    "namedFunction": namedFunction
  };


Naming Conventions
------------------

Naming conventions include generic patterns for setting names and identifiers throughout a script.

Constructors
^^^^^^^^^^^^

Constructor functions (called with the ``new`` statement) should always start with a capital letter:

.. code-block:: javascript

  // bad example
  var test = new application();

  // good example
  var test = new Application();


Methods/Functions
^^^^^^^^^^^^^^^^^

A method/function should always start with a small letter.

.. code-block:: javascript

  // bad example
  function MyFunction() {...}

  // good example
  function myFunction() {...}


TitleCase, camelCase
^^^^^^^^^^^^^^^^^^^^

Follow the camel case convention, typing the words in lower-case, only capitalizing the first letter in each word.

.. code-block:: javascript

  // Good example constructor = TitleCase
  var test = new PrototypeApplication();

  // Bad example constructor
  var test = new PROTOTYPEAPPLICATION();

  // Good example functions/methods = camelCase
  myFunction();
  calculateArea();

  // Bad example functions/methods
  MyFunction();
  CalculateArea();


Variables
^^^^^^^^^

Variable names with multiple words should always use an underscore between them.

.. code-block:: javascript

  // bad example
  var deliveryNote = 1;

  // good example
  var delivery_note = 1;


Confusing variable names should end with the variable type.

.. code-block:: javascript

  // implicit type
  var my_callback = doSomething();
  var Person = require("./person");

  // confusing names + var type
  var do_something_function = doSomething.bind(context);
  var value_list = getObjectOrArray();
  // value_list can be an object which can be cast into an array

To use camelCase, when sometimes it is not possible to declare a function
directly, the function variable name should match some pattern which shows
that it is a function.

.. code-block:: javascript

  // good example
  var doSomethingFunction = function () { ... };
  // or
  var tool = {"doSomething": function () { ... }};

  // bad example
  var doSomething = function () { ... };


Element Classes and IDs
^^^^^^^^^^^^^^^^^^^^^^^

JavaScript can access elements by their ID attribute and class names. When
assigning IDs and class names with multiple words, these should also be
separated by an underscore (same as variables).

Example

.. code-block:: javascript

  // bad example
  test.setAttribute("id", "uniqueIdentifier");

  // good example
  test.setAttribute("id", "unique_identifier");  

Discuss - checked with jQuery UI/jQuery Mobile, they don't use written name conventions, only

* events names should fit their purpose (pageChange for changing a page)
* element classes use “-” like in ui-shadow
* "ui" should not be used by third party developers
* variables and events use lower camel-case like pageChange and activePage


Underscore Private Methods
^^^^^^^^^^^^^^^^^^^^^^^^^^

Private methods should use a leading underscore to separate them from public methods (although this does not technically make a method private).

Good Example

.. code-block:: javascript

  var person = { 
    "getName": function () { 
      return this._getFirst() + " " + this._getLast(); 
    }, 
    "_getFirst": function () { 
      // ... 
    }, 
    "_getLast": function () { 
      // ... 
    } 
  };  

Bad Example

.. code-block:: javascript

  var person = { 
    "getName": function () { 
      return this.getFirst() + " " + this.getLast(); 
    }, 
    // private function
    "getFirst": function () { 
      // ... 
    }
  };


No Abbreviations
^^^^^^^^^^^^^^^^

Abbreviations should not be used to avoid confusion.

Good Example

.. code-block:: javascript

  // delivery note
  var delivery_note = 1;

Bad Example

.. code-block:: javascript

  // delivery note
  var del_note = 1;


No Plurals
^^^^^^^^^^

Plurals should not be used as variable names.

.. code-block:: javascript

  // good example
  var delivery_note_list = ["one", "two"];

  // bad example
  var delivery_notes = ["one", "two"];


Use Comments
^^^^^^^^^^^^

Comments should be used within reason but include enough information so that a
reader can get a first grasp of what a part of code is supposed to do.

Good Example

.. code-block:: javascript

  var person = {
    // returns full name string
    "getName": function () {
      return this._getFirst() + " " + this._getLast(); 
    }
  }; 

Bad Example

.. code-block:: javascript

  var person = { 
    "getName": function () { 
      return this._getFirst() + " " + this._getLast(); 
    }
  }; 


Documentation
^^^^^^^^^^^^^

You can use `YUIDoc <http://yuilibrary.com/projects/yuidoc>`_ and its custom comment
tags together with Node.js to generate the documentation from the script file
itself. Comments should look like this:

Good Example

.. code-block:: javascript

  /** 
   * Reverse a string
   *
   * @param  {String} input_string String to reverse 
   * @return {String} The reversed string 
   */ 
  function reverse(input_string) { 
    // ... 
    return output_string;
  };

Bad Example

.. code-block:: javascript

  function reverse(input_string) { 
    // ... 
    return output_string;
  };  


Additional Readings
-------------------

Resources, additional reading materials and links:

* `JavaScript Patterns <http://shop.oreilly.com/product/9780596806767.do>`_, main resource used.
* `JSLint <http://www.jslint.com/>`_, code quality tool.
* `JSLint Error Explanations <http://jslinterrors.com/>`_, a useful reference.
* `YUIDoc <http://yuilibrary.com/projects/yuidoc>`_, generate documentation from code.


