# dir
QUERIES_DIR = src/queries

# files
JIO         = jio.js
JIO_MIN     = jio.min.js
COMPLEX     = complex_queries.js
COMPLEX_MIN = complex_queries.min.js
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
	rm -f "$(JIO)"
	rm -f "$(JIO_MIN)"
	rm -f "$(COMPLEX)"
	rm -f "$(COMPLEX_MIN)"
	rm -f "$(PARSER_OUT)"
