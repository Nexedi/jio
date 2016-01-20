# dir
QUERIES_DIR = src/queries

# files
PARSER_PAR  = $(QUERIES_DIR)/core/parser.par
PARSER_OUT  = $(QUERIES_DIR)/build/parser.js

# npm install jscc-node
JSCC_CMD       = node ./node_modules/.bin/jison -m js

auto: compile

compile:
	mkdir -p $(dir $(PARSER_OUT))
	$(JSCC_CMD) -o $(PARSER_OUT) $(PARSER_PAR)

.phony: clean
clean:
	find -name '*~' -delete

realclean:
	rm -f "$(PARSER_OUT)"
