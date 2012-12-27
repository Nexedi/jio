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
                      '<file_strip_banner:../../src/<%= pkg.name %>/intro.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/exceptions.js>',
                      // Jio wrapper top
                      '<file_strip_banner:../../src/<%= pkg.name %>/jio.intro.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/storages/storage.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/commands/command.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/commands/allDocsCommand.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/commands/getCommand.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/commands/removeCommand.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/commands/putAttachmentCommand.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/commands/putCommand.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/commands/postCommand.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/status/jobStatus.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/status/doneStatus.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/status/failStatus.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/status/initialStatus.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/status/onGoingStatus.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/status/waitStatus.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/job.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/announcements/announcement.js>',
                      // Singletons
                      '<file_strip_banner:../../src/<%= pkg.name %>/activityUpdater.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/announcements/announcer.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/jobIdHandler.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/jobManager.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jobs/jobRules.js>',
                      // Jio wrappor bottem
                      '<file_strip_banner:../../src/<%= pkg.name %>/jio.outro.js>',
                      '<file_strip_banner:../../src/<%= pkg.name %>/jioNamespace.js>',
                      // Wrapper bottom
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
            files: [// '../../test/jiotests.html',
                    '../../test/jiotests_withoutrequirejs.html']
        },
        lint: {
            files: ['grunt.js',
                    '../../<%= pkg.name %>.js']
                    // '../../js/base64.requirejs_module.js',
                    // '../../src/jio.dummystorages.js',
                    // '../../js/jquery.requirejs_module.js',
                    // '../../test/jiotests.js',
                    // '../../test/jiotests.loader.js']
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
                hex_md5: true,
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
