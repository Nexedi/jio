/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: '<json:package.json>',
        meta: {
            banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - '+
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> Nexedi;' +
                ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
        },
        concat: {
            dist: {
                src: ['<banner:meta.banner>',
                      // Wrapper top
                      '<file_strip_banner:../../src/queries/begin.js>',
                      // code
                      '<file_strip_banner:../../src/queries/parser-begin.js>',
                      '<file_strip_banner:../../built/queries/parser.js>',
                      '<file_strip_banner:../../src/queries/parser-end.js>',
                      '<file_strip_banner:../../src/queries/serializer.js>',
                      '<file_strip_banner:../../src/queries/query.js>',
                      // Wrapper bottom
                      '<file_strip_banner:../../src/queries/end.js>'],
                dest: '../../<%= pkg.name %>.js'
            }
        },
        min: {
            dist: {
                src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest: '../../<%= pkg.name %>.min.js'
            }
        },
        qunit: {
            files: ['../../test/cq-tests.html']
        },
        lint: {
            files: ['grunt.js',
                    '../../src/queries/serializer.js',
                    '../../src/queries/query.js']
        },
        watch: {
            files: '<config:lint.files>',
            tasks: 'lint qunit'
        },
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                browser: true
            },
            globals: {
                scope: true,
                console: true,
                unescape: true,
                // Needed to avoid "not defined error" with requireJs
                define: true,
                require: true,
                // Needed to avoid "not defined error" with sinonJs
                sinon: true,
                module: true,
                test: true,
                ok: true,
                deepEqual: true,
                expect: true,
                stop: true,
                start: true,
                equal: true
            }
        },
        uglify: {}
    });
    // Default task.
    grunt.registerTask('default', 'lint concat min');
};
