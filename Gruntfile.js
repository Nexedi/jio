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
          maxerr: 3,
          predef: [
            'module'
          ]
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
      jio: {
        src: ['src/jio.js', 'src/jio/**/*.js', 'src/jio/*.js'],
        exclude: ['src/jio/intro.js', 'src/jio/outro.js'],
        directives: {
          maxlen: 80,
          indent: 2,
          maxerr: 3,
          nomen: true
        }
      },
      jio_storages: {
        src: ['src/jio.storage/**/*.js'],
        directives: {
          maxlen: 80,
          indent: 2,
          maxerr: 3,
          predef: [
            'define',
            'exports',
            'require',
            'window',
            'jIO',
            'complex_queries'
          ]
        }
      },
      jiodate: {
        src: ['src/jio.date/jiodate.js'],
        directives: {
          maxlen: 80,
          indent: 2,
          maxerr: 3,
          predef: [
            'jIO'
          ]
        },
      },
      tests: {
        src: ['test/**/*.js'],
        directives: {
          maxlen: 80,
          indent: 2,
          maxerr: 3,
          predef: [
            'RSVP',
            'QUnit',
            'jIO'
          ]
        },
      },
      queries: {
        src: ['src/queries/core/**/*.js'],
        exclude: [
          'src/queries/begin.js',
          'src/queries/end.js',
          'src/queries/parser-begin.js',
          'src/queries/parser-end.js'
        ],
        options: {
          errorsOnly: true
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
        },
      },
    },
    concat: {
      options: {
        separator: ';'
      },
      jio: {
        // duplicate files are ignored
        src: [
          'lib/uri/URI.js',
          'node_modules/uritemplate/bin/uritemplate.js',
//           'node_modules/moment/moment.js',
          'lib/moment/moment-2.5.0.js',
//           'src/*.js',
//           'src/jio/intro.js',
// 
//           // core
//           'src/jio/core/globals.js',
//           'src/jio/core/util.js',
//           'src/jio/core/**/*.js',
//           'src/jio/features/**/*.js',

          // queries
          'src/queries/core/globals.js',
          'src/queries/core/query.js',
          'src/queries/parser-begin.js',
          'src/queries/build/parser.js',
          'src/queries/parser-end.js',
          'src/queries/core/tools.js',
          'src/queries/core/**/*.js',

          'src/jio.date/*.js',
//           'src/jio/outro.js',

          'src/jio.js',

          'src/jio.storage/localstorage.js',
          'src/jio.storage/davstorage.js',
          'src/jio.storage/unionstorage.js',
          'src/jio.storage/erp5storage.js',
          'src/jio.storage/querystorage.js',
          'src/jio.storage/drivetojiomapping.js',
          'src/jio.storage/documentstorage.js',
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
          src: '<%= uglify.jio.src %>',
          dest: "dist/<%= pkg.name %>-latest.js"
        }, {
          src: '<%= uglify.jio.dest %>',
          dest: "dist/<%= pkg.name %>-latest.min.js"
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
          '<%= jslint.jio.src %>',
          '<%= jslint.jiodate.src %>',
          '<%= jslint.jio_storages.src %>',
          '<%= jslint.tests.src %>',
          '<%= jslint.queries.src %>',
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
  grunt.registerTask('lint', ['jslint']);
  grunt.registerTask('test', ['qunit']);
  grunt.registerTask('server', ['connect:client', 'watch']);
  grunt.registerTask('build', ['concat', 'uglify', 'copy']);
};
