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

module.exports = function (grunt) {
  "use strict";

  var LIVERELOAD_PORT, lrSnippet, livereloadMiddleware;

  // This is the default port that livereload listens on;
  // change it if you configure livereload to use another port.
  LIVERELOAD_PORT = 35729;
  // lrSnippet is just a function.
  // It's a piece of Connect middleware that injects
  // a script into the static served html.
  lrSnippet = require('connect-livereload')({ port: LIVERELOAD_PORT });
  // All the middleware necessary to serve static files.
  livereloadMiddleware = function (connect, options) {
    return [
      // Inject a livereloading script into static files.
      lrSnippet,
      // Serve static files.
      connect.static(options.base),
      // Make empty directories browsable.
      connect.directory(options.base)
    ];
  };

  grunt.loadNpmTasks('gruntify-eslint');
  grunt.loadNpmTasks('grunt-jslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-open');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jslint: {
      npm: {
        src: ['package.json'],
        directives: {
          maxlen: 100,
          indent: 2,
          maxerr: 3
        }
      },
      grunt: {
        src: ['Gruntfile.js'],
        directives: {
          es5: true,
          maxlen: 80,
          indent: 2,
          maxerr: 3,
          predef: [
            'module',
            'require'
          ]
        }
      },
      tests: {
        src: ['test/**/*.js'],
        exclude: [
          'test/node/**/*.js'
        ],
        directives: {
          maxlen: 80,
          indent: 2,
          maxerr: 3,
          predef: [
            'RSVP',
            'QUnit',
            'jIO'
          ]
        }
      },
      examples: {
        src: ['examples/*.js'],
        directives: {
          maxlen: 80,
          indent: 2,
          maxerr: 3,
          predef: [
            'window',
            'RSVP',
            'rJS',
            'QUnit',
            'jIO'
          ]
        }
      }
    },
    eslint: {
      options: {
        maxWarnings: 3
      },
      jio: {
        src: [
          'src/jio.bundle.js',
          'src/jio.js',
          'src/storage.js',
          'src/utils-compat.js',
          'src/utils.js'
        ]
      },
      jio_storages: {
        src: ['src/jio.storage/*.js']
      },
      jiodate: {
        src: ['src/jio.date/jiodate.js']
      },
      queries: {
        src: ['src/queries/query.js']
      },
      nodeTests: {
        src: ['test/node/**/*.js']
      }
    },
    concat: {
      options: {
        separator: ';',
        process: function (src, filepath) {
          // skip process libs
          if (
            filepath.indexOf('node_modules/') === 0 ||
              filepath.indexOf('lib/') === 0
          ) {
            return src;
          }

          var importRegex = new RegExp(
            "import" +
              "(?:[\"'\\s]*([\\w*{}\\n\\r\\t, ]+)from\\s*)?" +
              "[\"'\\s].*([@\\w/_-]+)[\"'\\s].*;" +
              "(\\r\\n\\t|\\n|\\r\\t)?$",
            'gm'
          ),
            exportRegex = new RegExp(
              "export" +
                "(?:[\"'\\s]*([\\w*{}\\n\\r\\t, ]+))?" +
                "[\"'\\s].*([@\\w/_-]+)[\"'\\s].*;" +
                "(\\r\\n\\t|\\n|\\r\\t)?$",
              'gm'
            );

          return src
            // remove import statements
            .replace(importRegex, '')
            // remove export statements
            .replace(exportRegex, '');
        }
      },
      jio: {
        // duplicate files are ignored
        src: [
          'lib/uri/URI.js',
          'node_modules/uritemplate/bin/uritemplate.js',
          'node_modules/lz-string/libs/lz-string.js',
          'node_modules/moment/moment.js',

          // queries
          'src/queries/parser-begin.js',
          'src/queries/build/parser.js',
          'src/queries/parser-end.js',
          'src/queries/query.js',

          'src/jio.date/*.js',

          'src/jio-begin.js',
          'src/jio.js',
          'src/storage.js',
          'src/utils.js',
          'src/jio-end.js',

          'node_modules/rusha/rusha.js',

          'src/jio.storage/replicatestorage.js',
          'src/jio.storage/shastorage.js',
          'src/jio.storage/uuidstorage.js',
          'src/jio.storage/memorystorage.js',
          'src/jio.storage/zipstorage.js',
          'src/jio.storage/parserstorage.js',
          'src/jio.storage/httpstorage.js',
          'src/jio.storage/dropboxstorage.js',
          'src/jio.storage/davstorage.js',
          'src/jio.storage/gdrivestorage.js',
          'src/jio.storage/unionstorage.js',
          'src/jio.storage/erp5storage.js',
          'src/jio.storage/querystorage.js',
          'src/jio.storage/drivetojiomapping.js',
          'src/jio.storage/documentstorage.js',
          'src/jio.storage/localstorage.js',
          'src/jio.storage/indexeddbstorage.js',
          'src/jio.storage/cryptstorage.js',
          'src/jio.storage/websqlstorage.js',
          'src/jio.storage/fbstorage.js',
          'src/jio.storage/cloudooostorage.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
//         dest: 'jio.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      jio: {
        src: "<%= concat.jio.dest %>",
        dest: "dist/<%= pkg.name %>-<%= pkg.version %>.min.js"
//       },
//       jio: {
//         src: 'jio.js', // '<%= pkg.name %>.js'
//         dest: 'jio.min.js',
//         options: {
//           sourceMap: "jio.min.map"
//         }
//       },
//       jiodate: {
//         src: 'src/jio.date/jiodate.js',
//         dest: 'jiodate.min.js',
//         options: {
//           sourceMap: "jiodate.min.map"
//         }
      }
    },

    copy: {
      latest: {
        files: [{
          src: '<%= concat.jio.dest %>',
          dest: "dist/<%= pkg.name %>-latest.js"
/*
        }, {
          src: '<%= uglify.jio.dest %>',
          dest: "dist/<%= pkg.name %>-latest.min.js"
*/
        }]
      }
    },


    qunit: {
      // grunt doesn't like requirejs
      files: ['test/tests.html']
    },

    watch: {
      src: {
        files: [
          '<%= jslint.npm.src %>',
          '<%= jslint.grunt.src %>',
          '<%= jslint.tests.src %>',
          '<%= eslint.jio.src %>',
          '<%= eslint.jiodate.src %>',
          '<%= eslint.jio_storages.src %>',
          '<%= eslint.queries.src %>',
          '<%= concat.jio.src %>',
          '<%= qunit.files %>',
          'test/**/*.js',
          'examples/*'
        ],
        tasks: ['default'],
        options: {
          livereload: LIVERELOAD_PORT
        }
      }
    },


    connect: {
      client: {
        options: {
          port: 9000,
          base: '.',
          directory: '.',
          middleware: livereloadMiddleware
        }
      }
    },

    open: {
      all: {
        // Gets the port from the connect configuration
        path: 'http://localhost:' +
          '<%= connect.client.options.port%>/test/tests.html'
      }
    }


  });

  grunt.registerTask('default', ['all']);
  grunt.registerTask('all', ['lint', 'build']);
  grunt.registerTask('lint', ['jslint', 'eslint']);
  grunt.registerTask('test', ['qunit']);
  grunt.registerTask('server', ['connect:client', 'watch']);
  grunt.registerTask('build', ['concat', 'copy']);
};
