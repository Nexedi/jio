OUT			= jio.js
UGLY_OUT	= jio.min.js
# npm install jslint
LINT_CMD	= $(shell which jslint || echo node ~/node_modules/jslint/bin/jslint.js) --terse
# npm install uglify-js
UGLIFY_CMD	= $(shell which uglifyjs || echo node ~/node_modules/uglify-js/bin/uglifyjs)
FILE_DIR	= src/jio
STORAGE_DIR = src/jio.storage

# The order is important!
CONCAT_NAMES = intro exceptions jio.intro storages/* commands/* jobs/status/* jobs/job announcements/announcement activityUpdater announcements/announcer jobs/jobIdHandler jobs/jobManager jobs/jobRules jio.core jio.outro jioNamespace outro
STORAGE_NAMES = *
LINT_NAMES  = exceptions storages/* commands/* jobs/status/* jobs/* announcements/* activityUpdater jio.core jioNamespace

CONCAT_FILES = $(CONCAT_NAMES:%=$(FILE_DIR)/%.js)
LINT_FILES  = $(LINT_NAMES:%=$(FILE_DIR)/%.js) $(STORAGE_NAMES:%=$(STORAGE_DIR)/%.js)

auto: build lint
build: concat uglify

# concat source FILES to build jio.js
concat:
	cat $(CONCAT_FILES) > "$(OUT)"

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
	$(LINT_CMD) $(LINT_FILES)

.phony: clean
clean:
	find -name '*~' -delete

realclean:
	rm -f "$(OUT)"
	rm -f "$(UGLY_OUT)"
