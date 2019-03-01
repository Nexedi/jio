#############################################
# Copyright 2018, Nexedi SA
#
# This program is free software: you can Use, Study, Modify and Redistribute
# it under the terms of the GNU General Public License version 3, or (at your
# option) any later version, as published by the Free Software Foundation.
#
# You can also Link and Combine this program with other software covered by
# the terms of any of the Free Software licenses or any of the Open Source
# Initiative approved licenses and Convey the resulting work. Corresponding
# source of such a combination shall include the source code for all other
# software used.
#
# This program is distributed WITHOUT ANY WARRANTY; without even the implied
# warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
#
# See COPYING file for full licensing terms.
# See https://www.nexedi.com/licensing for rationale and options.
#############################################
include config.mk

DISTDIR = dist
SRCDIR = src
LINTDIR = lint
TESTDIR = test
EXAMPLEDIR = examples
EXTERNALDIR = external

VERSION = 3.36.1
JIOVERSION = ${DISTDIR}/jio-v${VERSION}.js
JIOLATEST = ${DISTDIR}/jio-latest.js
JIONODEVERSION = ${DISTDIR}/jio-v${VERSION}-node.js
JIONODELATEST = ${DISTDIR}/jio-latest-node.js

all: fetch lint build

#############################################
# Lint
#############################################
LINTOPTS = --maxlen 80 --indent 2 --maxerr 3 --terse

${LINTDIR}/jio.storage/%.js: ${SRCDIR}/jio.storage/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} --predef jIO --predef window $<
	@cat $< > $@

${LINTDIR}/jio.js: ${SRCDIR}/jio.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} --nomen true $<
	@cat $< > $@

${LINTDIR}/jio.date/%.js: ${SRCDIR}/jio.date/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} $<
	@cat $< > $@

${LINTDIR}/queries/query.js: ${SRCDIR}/queries/query.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} $<
	@cat $< > $@

${LINTDIR}/${TESTDIR}/jio.storage/%.js: ${TESTDIR}/jio.storage/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} --predef QUnit --predef RSVP --predef jIO $<
	@cat $< > $@

${LINTDIR}/${TESTDIR}/queries/%.js: ${TESTDIR}/queries/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} --predef QUnit --predef RSVP --predef jIO $<
	@cat $< > $@

${LINTDIR}/${TESTDIR}/jio/%.js: ${TESTDIR}/jio/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} --predef QUnit --predef RSVP --predef jIO $<
	@cat $< > $@

${LINTDIR}/${EXAMPLEDIR}/%.js: ${EXAMPLEDIR}/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} --predef RSVP --predef window --predef QUnit --predef jIO --predef rJS $<
	@cat $< > $@

${LINTDIR}/node/%.js: ${SRCDIR}/node/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} --nomen true $<
	@cat $< > $@

${LINTDIR}/${TESTDIR}/%.js: ${TESTDIR}/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} $<
	@cat $< > $@

${LINTDIR}/${TESTDIR}/node/%.js: ${TESTDIR}/node/%.js
	@mkdir -p $(@D)
	${JSLINT} ${LINTOPTS} $<
	@cat $< > $@

#############################################
# Check test files
#############################################
lint: $(patsubst ${TESTDIR}/jio.storage/%.js, ${LINTDIR}/${TESTDIR}/jio.storage/%.js, $(wildcard ${TESTDIR}/jio.storage/*.js)) \
	$(patsubst ${TESTDIR}/queries/%.js, ${LINTDIR}/${TESTDIR}/queries/%.js, $(wildcard ${TESTDIR}/queries/*.js)) \
	$(patsubst ${TESTDIR}/jio/%.js, ${LINTDIR}/${TESTDIR}/jio/%.js, $(wildcard ${TESTDIR}/jio/*.js)) \
	$(patsubst ${EXAMPLEDIR}/%.js, ${LINTDIR}/${EXAMPLEDIR}/%.js, $(wildcard ${EXAMPLEDIR}/*.js)) \
	$(patsubst ${EXAMPLEDIR}/%.js, ${LINTDIR}/${EXAMPLEDIR}/%.js, $(wildcard ${EXAMPLEDIR}/*.js)) \
	${LINTDIR}/queries/query.js \
	${LINTDIR}/jio.date/jiodate.js \
	${LINTDIR}/jio.js \
	${LINTDIR}/node/jio.js \
	${LINTDIR}/${TESTDIR}/node.js \
	${LINTDIR}/${TESTDIR}/node/node-require.js \
	$(patsubst ${SRCDIR}/jio.storage/%.js, ${LINTDIR}/jio.storage/%.js, $(wildcard ${SRCDIR}/jio.storage/*.js))

#############################################
# Build
#############################################
build: ${JIOLATEST} ${JIONODELATEST}

${JIOLATEST}: ${JIOVERSION}
	@mkdir -p $(@D)
	cp $< $@

${JIOVERSION}: ${EXTERNALDIR}/URI.js \
	${EXTERNALDIR}/uritemplate.js \
	${EXTERNALDIR}/lz-string.js \
	${EXTERNALDIR}/moment.js \
	${SRCDIR}/queries/parser-begin.js \
	${SRCDIR}/queries/build/parser.js \
	${SRCDIR}/queries/parser-end.js \
	${SRCDIR}/queries/query.js \
	${SRCDIR}/jio.date/jiodate.js \
	${SRCDIR}/jio.js \
	${EXTERNALDIR}/rusha.js \
	${SRCDIR}/jio.storage/replicatestorage.js \
	${SRCDIR}/jio.storage/shastorage.js \
	${SRCDIR}/jio.storage/uuidstorage.js \
	${SRCDIR}/jio.storage/memorystorage.js \
	${SRCDIR}/jio.storage/zipstorage.js \
	${SRCDIR}/jio.storage/parserstorage.js \
	${SRCDIR}/jio.storage/httpstorage.js \
	${SRCDIR}/jio.storage/dropboxstorage.js \
	${SRCDIR}/jio.storage/davstorage.js \
	${SRCDIR}/jio.storage/gdrivestorage.js \
	${SRCDIR}/jio.storage/unionstorage.js \
	${SRCDIR}/jio.storage/linsharestorage.js \
	${SRCDIR}/jio.storage/erp5storage.js \
	${SRCDIR}/jio.storage/querystorage.js \
	${SRCDIR}/jio.storage/drivetojiomapping.js \
	${SRCDIR}/jio.storage/documentstorage.js \
	${SRCDIR}/jio.storage/localstorage.js \
	${SRCDIR}/jio.storage/indexeddbstorage.js \
	${SRCDIR}/jio.storage/cryptstorage.js \
	${SRCDIR}/jio.storage/fbstorage.js \
	${SRCDIR}/jio.storage/cloudooostorage.js
	@mkdir -p $(@D)
	cat $^ > $@

#############################################
# Node
#############################################
${JIONODELATEST}: ${JIONODEVERSION}
	@mkdir -p $(@D)
	cp $< $@

${JIONODEVERSION}: ${SRCDIR}/node/jio-start.js \
	${EXTERNALDIR}/rsvp-2.0.4.js \
	${EXTERNALDIR}/moment.js \
	${EXTERNALDIR}/URI.js \
	${EXTERNALDIR}/uritemplate.js \
	${EXTERNALDIR}/rusha.js \
	${SRCDIR}/node/jio-external.js \
	${EXTERNALDIR}/xhr2.js \
	${SRCDIR}/queries/parser-begin.js \
	${SRCDIR}/queries/build/parser.js \
	${SRCDIR}/queries/parser-end.js \
	${SRCDIR}/queries/query.js \
	${SRCDIR}/node/jio-compat.js \
	${SRCDIR}/jio.date/jiodate.js \
	${SRCDIR}/jio.js \
	${SRCDIR}/node/jio.js \
	${SRCDIR}/jio.storage/replicatestorage.js \
	${SRCDIR}/jio.storage/shastorage.js \
	${SRCDIR}/jio.storage/uuidstorage.js \
	${SRCDIR}/jio.storage/memorystorage.js \
	${SRCDIR}/jio.storage/dropboxstorage.js \
	${SRCDIR}/jio.storage/gdrivestorage.js \
	${SRCDIR}/jio.storage/unionstorage.js \
	${SRCDIR}/jio.storage/erp5storage.js \
	${SRCDIR}/jio.storage/querystorage.js \
	${SRCDIR}/jio.storage/drivetojiomapping.js \
	${SRCDIR}/jio.storage/documentstorage.js \
	${SRCDIR}/jio.storage/fbstorage.js \
	${SRCDIR}/node/jio-end.js
	@mkdir -p $(@D)
	cat $^ > $@

#############################################
# Jison
#############################################
${SRCDIR}/queries/build/parser.js: ${SRCDIR}/queries/core/parser.par
	@mkdir -p $(@D)
	${JISON} -m js -o $@ $<

#############################################
# Dependencies
#############################################
fetch: ${EXTERNALDIR}/uritemplate.js \
	${EXTERNALDIR}/lz-string.js \
	${EXTERNALDIR}/moment.js \
	${EXTERNALDIR}/rusha.js \
	${EXTERNALDIR}/rsvp-2.0.4.js \
	${EXTERNALDIR}/qunit.css \
	${EXTERNALDIR}/qunit.js \
	${EXTERNALDIR}/sinon.js \
	${EXTERNALDIR}/renderjs-latest.js

${EXTERNALDIR}/uritemplate.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://lab.nexedi.com/nexedi/uritemplate-js/raw/master/bin/uritemplate.js

${EXTERNALDIR}/lz-string.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://raw.githubusercontent.com/pieroxy/lz-string/1.4.4/libs/lz-string.js

${EXTERNALDIR}/moment.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://raw.githubusercontent.com/moment/moment/2.22.1/moment.js

${EXTERNALDIR}/rusha.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://raw.githubusercontent.com/srijs/rusha/v0.8.2/rusha.js

${EXTERNALDIR}/rsvp-2.0.4.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://lab.nexedi.com/nexedi/rsvp.js/raw/master/dist/rsvp-2.0.4.js

${EXTERNALDIR}/qunit.css:
	@mkdir -p $(@D)
	curl -s -o $@ https://code.jquery.com/qunit/qunit-1.12.0.css

${EXTERNALDIR}/qunit.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://code.jquery.com/qunit/qunit-1.12.0.js

${EXTERNALDIR}/sinon.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://sinonjs.org/releases/sinon-1.7.3.js

${EXTERNALDIR}/renderjs-latest.js:
	@mkdir -p $(@D)
	curl -s -o $@ https://lab.nexedi.com/nexedi/renderjs/raw/master/dist/renderjs-latest.js

.PHONY: clean ${JIOVERSION} ${JIONODEVERSION}

clean:
	rm -rf ${LINTDIR}

forceclean: clean
	rm -rf ${EXTERNALDIR} ${SRCDIR}/queries/build/parser.js
