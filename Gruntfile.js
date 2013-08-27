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
          'src/jio/core/globals.js',
          'src/jio/core/util.js',
          'src/jio/core/**/*.js',
          'src/jio/features/**/*.js',
          'src/jio/outro.js'
        ],
        dest: 'jio.js'
      },
      queries: {
        src: [
          'src/queries/begin.js',
          'src/queries/parser-begin.js',
          'src/queries/build/parser.js',
          'src/queries/parser-end.js',
          'src/queries/core/globals.js',
          'src/queries/core/tools.js',
          'src/queries/core/**/*.js',
          'src/queries/end.js'
        ],
        dest: 'complex_queries.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      jio: {
        src: 'jio.js', // '<%= pkg.name %>.js'
        dest: 'jio.min.js'
      },
      queries: {
        src: 'complex_queries.js',
        dest: 'complex_queries.min.js'
      }
    },
    qunit: {
      // grunt doesn't like requirejs
      // phantomjs daesn't know Blobs !!
      files: ['test/tests.html']
    }
  });

  grunt.loadNpmTasks('grunt-jslint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');

  grunt.registerTask('default', ['jslint', 'concat', 'uglify']); //, 'qunit']);

  grunt.registerTask('lint', ['jslint']);
  grunt.registerTask('build', ['concat', 'uglify']);
  grunt.registerTask('test', ['jslint', 'qunit']);
};
