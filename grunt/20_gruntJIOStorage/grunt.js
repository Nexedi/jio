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
                      '<file_strip_banner:../../src/<%= pkg.name %>/intro.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/localstorage.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/davstorage.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/replicatestorage.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/indexstorage.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/cryptstorage.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/conflictmanagerstorage.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/outro.js>'],
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
            files: []
        },
        lint: {
            files: ['grunt.js','../../<%= pkg.name %>.js']
        },
        watch: {
            files: '<config:lint.files>',
            tasks: 'lint'
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
                jQuery: true,
                sjcl: true,
                Base64: true,
                MD5: true,
                hex_sha256: true,
                jIO: true,
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
    grunt.registerTask('default', 'concat lint min');

};
