# dir
JIO_DIR		= src/jio
STORAGE_DIR 	= src/jio.storage
QUERIES_DIR 	= src/queries
JSCC_DIR   	= ~/modules/jscc

# files
JIO		= jio.js
JIO_MIN		= jio.min.js
COMPLEX		= complex_queries.js
COMPLEX_MIN	= complex_queries.min.js
PARSER_PAR  	= $(QUERIES_DIR)/parser.par
PARSER_OUT   	= $(QUERIES_DIR)/parser.js

# using rhino
JSCC_CMD   	= rhino $(JSCC_DIR)/jscc.js -t $(JSCC_DIR)/driver_web.js_ 
# npm install jslint
LINT_CMD	= $(shell which jslint || echo node ~/node_modules/jslint/bin/jslint.js) --terse
# npm install uglify-js
UGLIFY_CMD	= $(shell which uglifyjs || echo node ~/node_modules/uglify-js/bin/uglifyjs)

auto: compile build lint
build: concat uglify

# The order is important!
CONCAT_JIO_NAMES = intro exceptions jio.intro storages/* commands/* jobs/status/* jobs/job announcements/announcement activityUpdater announcements/announcer jobs/jobIdHandler jobs/jobManager jobs/jobRules jio.core jio.outro jioNamespace outro
CONCAT_STORAGE_NAMES = *
CONCAT_QUERIES_NAMES = begin parser-begin parser parser-end serializer query end
LINT_NAMES  = exceptions storages/* commands/* jobs/status/* jobs/* announcements/* activityUpdater jio.core jioNamespace

CONCAT_QUERIES_FILES = $(CONCAT_QUERIES_NAMES:%=$(QUERIES_DIR)/%.js)
CONCAT_JIO_FILES = $(CONCAT_JIO_NAMES:%=$(JIO_DIR)/%.js)
LINT_FILES  = $(LINT_NAMES:%=$(JIO_DIR)/%.js) $(CONCAT_STORAGE_NAMES:%=$(STORAGE_DIR)/%.js)

# build parser.js
compile: 
	$(JSCC_CMD) -o $(PARSER_OUT) $(PARSER_PAR)

# concat source files into jio.js and complex-queries.js
concat:
	cat $(CONCAT_JIO_FILES) > "$(JIO)"
	cat $(CONCAT_QUERIES_FILES) > "$(COMPLEX)"

# uglify into jio.min.js and complex.min.js
uglify:
	$(UGLIFY_CMD) "$(JIO)" > "$(JIO_MIN)"
	$(UGLIFY_CMD) "$(COMPLEX)" > "$(COMPLEX_MIN)"

# lint all files in JIO and STORAGE and QUERIES DIR
# command: jslint [options] file
# [options] are defined at the top of the source file:
# Example:
# /*jslint indent: 2, maxlen: 80 */
# /*global hex_sha256: true, jQuery: true */
lint:
	$(LINT_CMD) $(LINT_FILES)

.phony: clean
clean:
	find -name '*~' -delete

realclean:
	rm -f "$(JIO)"
	rm -f "$(JIO_MIN)"
	rm -f "$(COMPLEX)"
	rm -f "$(COMPLEX_MIN)"
	rm -f "$(PARSER_OUT)"