OUT			= jio.js
UGLY_OUT	= jio.min.js
# npm install jslint
LINT_CMD	= $(shell which jslint || echo node ~/node_modules/jslint/bin/jslint.js) --terse
# npm install uglify-js
UGLIFY_CMD	= $(shell which uglifyjs || echo node ~/node_modules/uglify-js/bin/uglifyjs)
FILE_DIR	= src/jio
STORAGE_DIR = src/jio.storage

# The order is important!
LINT_FILES  = exceptions jio.intro storages/* commands/* jobs/status/* jobs/job announcements/announcement activityUpdater announcements/announcer jobs/jobIdHandler jobs/jobManager jobs/jobRules jio.outro jioNamespace
FILES		= intro $(LINT_FILES) outro
STORAGE_FILES = *

auto: build lint
build: concat uglify

# concat source FILES to build jio.js
concat:
	cat $(FILES:%=$(FILE_DIR)/%.js) > "$(OUT)"

# uglify jio.js to build jio.min.js
uglify:
	$(UGLIFY_CMD) "$(OUT)" > "$(UGLY_OUT)"

# lint all files in FILES and STORAGE_FILES
# command: jslint [options] file
# [options] are defined at the top of the source file:
# Example:
# /*jslint indent: 2, maxlen: 80 */
# /*global hex_sha256: true, jQuery: true */
lint:
	$(LINT_CMD) $(LINT_FILES:%=$(FILE_DIR)/%.js)

.phony: clean
clean:
	find -name '*~' -delete

realclean:
	rm -f "$(OUT)"
	rm -f "$(UGLY_OUT)"
