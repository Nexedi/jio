OUT			= jio.js
UGLY_OUT	= jio.min.js
LINT_CMD	= jslint --terse --indent 2 --maxlen 80
UGLIFY_CMD	= uglifyjs
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
	$(UGLIFY_CMD) -- "$(OUT)" > "$(UGLY_OUT)"

# lint all files in FILES and STORAGE_FILES
# command: jslint [options] file
# [options] are defined in the source file:
# The file can contain a line beginning by:
# // -*- jslint: [options] -*-
# If there is several such lines, only the first is used. Example:
# // -*- jslint: --sloppy --maxlen 80 --predef hex_sha256 -*-
lint:
	bash -c "result=0 ; for file in $(LINT_FILES:%=$(FILE_DIR)/%.js) $(STORAGE_FILES:%=$(STORAGE_DIR)/%.js) ; do out=\"\$$($(LINT_CMD) \$$(grep '^//  *-\*-  *jslint: .* -\*-' \$$file | head -1 | sed 's/^\/\/  *-\*-  *jslint: \(.*\) -\*-/\1/') \$$file)\" ; res=\$$? ; [ \$$res != 0 ] && echo \"\$$out\" ; [ \$$res -gt \$$result ] && result=\$$res ; done ; exit \$$result ;"

.phony: clean
clean:
	find -name '*~' -delete

realclean:
	rm -f "$(OUT)"
	rm -f "$(UGLY_OUT)"
