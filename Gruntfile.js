/*jslint indent: 2, maxlen: 80 */
/*global module */

module.exports = function (grunt) {
  "use strict";

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jslint: {
      grunt: {
        src: ['Gruntfile.js'],
        options: {
          errorsOnly: true
        }
      },
      jio: {
        src: ['src/jio/**/*.js'],
        exclude: ['src/jio/intro.js', 'src/jio/outro.js'],
        options: {
          errorsOnly: true
        }
      },
      jio_storages: {
        src: ['src/jio.storage/**/*.js'],
        options: {
          errorsOnly: true
        }
      },
      jiodate: {
        src: ['src/jio.date/jiodate.js']
      },
      tests: {
        src: ['test/**/*.js'],
        options: {
          errorsOnly: true
        }
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
      }
    },
    concat: {
      jio: {
        // duplicate files are ignored
        src: [
          'src/jio/intro.js',

          // core
          'src/jio/core/globals.js',
          'src/jio/core/util.js',
          'src/jio/core/**/*.js',
          'src/jio/features/**/*.js',

          // queries
          'src/queries/core/globals.js',
          'src/queries/core/query.js',
          'src/queries/parser-begin.js',
          'src/queries/build/parser.js',
          'src/queries/parser-end.js',
          'src/queries/core/tools.js',
          'src/queries/core/**/*.js',

          'src/jio/outro.js'
        ],
        dest: 'jio.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      jio: {
        src: 'jio.js', // '<%= pkg.name %>.js'
        dest: 'jio.min.js',
        options: {
          sourceMap: "jio.min.map"
        }
      },
      jiodate: {
        src: 'src/jio.date/jiodate.js',
        dest: 'jiodate.min.js',
        options: {
          sourceMap: "jiodate.min.map"
        }
      }
    },
    qunit: {
      // grunt doesn't like requirejs
      files: ['test/tests.html'],
      options: {
        timeout: 30000 // if no test occurs for 30 seconds, then timeout
      }
    }
  });

  grunt.loadNpmTasks('grunt-jslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');

  grunt.registerTask('default', ['jslint', 'concat', 'uglify', 'qunit']);

  grunt.registerTask('lint', ['jslint']);
  grunt.registerTask('build', ['concat', 'uglify']);
  grunt.registerTask('test', ['jslint', 'qunit']);
};
