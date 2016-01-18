# dir
QUERIES_DIR = src/queries

# files
PARSER_PAR  = $(QUERIES_DIR)/core/parser.par
PARSER_OUT  = $(QUERIES_DIR)/build/parser.js

# npm install jscc-node
JSCC_CMD   	= node ./node_modules/jscc-node/jscc.js -t ./node_modules/jscc-node/driver_node.js_

auto: compile

compile:
	mkdir -p $(dir $(PARSER_OUT))
	$(JSCC_CMD) -o $(PARSER_OUT) $(PARSER_PAR)

.phony: clean
clean:
	find -name '*~' -delete

realclean:
	rm -f "$(PARSER_OUT)"
