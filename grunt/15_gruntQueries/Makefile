JSCCDIR   = /opt/jscc
JSCCCMD   = rhino $(JSCCDIR)/jscc.js -t $(JSCCDIR)/driver_web.js_

SRC_DIR   = ../../src/queries
BUILD_DIR = ../../built/queries

OUT   = $(BUILD_DIR)/complex-queries.js

PARSER_PAR   = $(SRC_DIR)/parser.par
PARSER_OUT   = $(BUILD_DIR)/parser.js

auto: prepare parser grunt

prepare:
	mkdir -p $(BUILD_DIR)

parser:
	$(JSCCCMD) $(PARSER_PAR) >> $(PARSER_OUT)

grunt:
	grunt
