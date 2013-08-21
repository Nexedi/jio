module.exports = function (grunt) {
  "use strict";

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
      },
      jio: {
        src: 'jio.js', // '<%= pkg.name %>.js'
        dest: 'jio.min.js',
      }
    },
    jslint: {
      jio: {
        src: ['src/jio/**/*.js'],
        exclude: ['src/jio/intro.js', 'src/jio/outro.js'],
        options: {
          errorsOnly: true,
        }
      },
      tests: {
        src: ['test/**/*.js'],
        options: {
          errorsOnly: true,
        }
      }
      // queries: {
      //   src: ['src/queries/**/*.js'],
      //   exclude: ['src/queries/begin.js', 'src/queries/end.js']
      // }
    },
    concat: {
      jio: {
        //banner: 'src/jio/intro.js',
        //footer: 'src/j',
        src: [
          'src/jio/intro.js',
          'src/jio/core/**/*.js',
          'src/jio/features/**/*.js',
          'src/jio/outro.js',
        ],
        dest: 'jio.js',
      }
    },
    qunit: {
      files: ['test/tests.html'], // grunt doesn't like requirejs
    },
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
