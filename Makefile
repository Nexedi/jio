# dir
QUERIES_DIR = src/queries

# files
JIO         = jio.js
JIO_MIN     = jio.min.js
JIODATE_MIN = jiodate.min.js
PARSER_PAR  = $(QUERIES_DIR)/core/parser.par
PARSER_OUT  = $(QUERIES_DIR)/build/parser.js
UGLIFY      = ./node_modules/grunt-contrib-uglify/node_modules/uglify-js/bin/uglifyjs
ZIP_FULL    = jio.zip
ZIP_MINI    = jio-min.zip

# npm install jscc-node
JSCC_CMD   	= node ./node_modules/jscc-node/jscc.js -t ./node_modules/jscc-node/driver_node.js_

auto: compile

compile:
	mkdir -p $(dir $(PARSER_OUT))
	$(JSCC_CMD) -o $(PARSER_OUT) $(PARSER_PAR)

TMPDIR := $(shell mktemp -d)
zip:
	@echo "Preparing $(ZIP_FULL)"
	@mkdir $(TMPDIR)/jio
	@mkdir $(TMPDIR)/jio/storage
	@cp jio.js                              $(TMPDIR)/jio/
	@cp src/sha1.amd.js                     $(TMPDIR)/jio/
	@cp src/sha2.amd.js                     $(TMPDIR)/jio/
	@cp src/sha256.amd.js                   $(TMPDIR)/jio/
	@cp src/jio.date/jiodate.js             $(TMPDIR)/jio/
	@cp lib/rsvp/rsvp-custom.js             $(TMPDIR)/jio/
	@cp lib/rsvp/rsvp-custom.amd.js         $(TMPDIR)/jio/
	@cp lib/jquery/jquery.js                $(TMPDIR)/jio/
	@cp lib/require/require.js              $(TMPDIR)/jio/
	@cp src/jio.storage/localstorage.js     $(TMPDIR)/jio/storage/
	@cp src/jio.storage/davstorage.js       $(TMPDIR)/jio/storage/
	@cp src/jio.storage/dropboxstorage.js   $(TMPDIR)/jio/storage/
	@cp src/jio.storage/erp5storage.js      $(TMPDIR)/jio/storage/
	@cp src/jio.storage/indexstorage.js     $(TMPDIR)/jio/storage/
	@cp src/jio.storage/gidstorage.js       $(TMPDIR)/jio/storage/
	@cp src/jio.storage/replicatestorage.js $(TMPDIR)/jio/storage/
	@cp src/jio.storage/splitstorage.js     $(TMPDIR)/jio/storage/
	@cp src/jio.storage/cryptstorage.js     $(TMPDIR)/jio/storage/
	@cp src/jio.storage/revisionstorage.js  $(TMPDIR)/jio/storage/
	@cp src/jio.storage/zipstorage.js       $(TMPDIR)/jio/storage/
	@cp src/jio.storage/websqlstorage.js       $(TMPDIR)/jio/storage/
	@cp src/jio.storage/replicaterevisionstorage.js     $(TMPDIR)/jio/storage/
	@cp src/jio.storage/s3storage.js        $(TMPDIR)/jio/storage/
	@cp src/jio.storage/splitstorage.js     $(TMPDIR)/jio/storage/
	@cp src/jio.storage/xwikistorage.js     $(TMPDIR)/jio/storage/
	@cd $(TMPDIR) && zip -q $(ZIP_FULL) -r jio
	@mv $(TMPDIR)/$(ZIP_FULL) ./
	@rm -rf $(TMPDIR)/jio
	@echo "Preparing $(ZIP_MINI)"
	@mkdir $(TMPDIR)/jio
	@mkdir $(TMPDIR)/jio/storage
	@echo "Minimizing JS..."
	@cp jio.min.js                                 $(TMPDIR)/jio/
	@cp jio.min.map                                $(TMPDIR)/jio/
	@cp jiodate.min.js                             $(TMPDIR)/jio/
	@cp jiodate.min.map                            $(TMPDIR)/jio/
	@$(UGLIFY) src/sha1.amd.js                     >$(TMPDIR)/jio/sha1.amd.min.js 2>/dev/null
	@$(UGLIFY) src/sha2.amd.js                     >$(TMPDIR)/jio/sha2.amd.min.js 2>/dev/null
	@$(UGLIFY) src/sha256.amd.js                   >$(TMPDIR)/jio/sha256.amd.min.js 2>/dev/null
	@$(UGLIFY) lib/rsvp/rsvp-custom.js             >$(TMPDIR)/jio/rsvp-custom.min.js 2>/dev/null
	@$(UGLIFY) lib/rsvp/rsvp-custom.amd.js         >$(TMPDIR)/jio/rsvp-custom.amd.min.js 2>/dev/null
	@cp lib/jquery/jquery.min.js                   $(TMPDIR)/jio/
	@$(UGLIFY) lib/require/require.js              >$(TMPDIR)/jio/require.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/localstorage.js     >$(TMPDIR)/jio/storage/localstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/davstorage.js       >$(TMPDIR)/jio/storage/davstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/dropboxstorage.js   >$(TMPDIR)/jio/storage/dropboxstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/erp5storage.js      >$(TMPDIR)/jio/storage/erp5storage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/indexstorage.js     >$(TMPDIR)/jio/storage/indexstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/gidstorage.js       >$(TMPDIR)/jio/storage/gidstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/replicatestorage.js >$(TMPDIR)/jio/storage/replicatestorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/splitstorage.js     >$(TMPDIR)/jio/storage/splitstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/cryptstorage.js     >$(TMPDIR)/jio/storage/cryptstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/revisionstorage.js     >$(TMPDIR)/jio/storage/revisionstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/replicaterevisionstorage.js     >$(TMPDIR)/jio/storage/replicaterevisionstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/zipstorage.js						 >$(TMPDIR)/jio/storage/zipstorage.min.js 2>/dev/null
  @$(UGLIFY) src/jio.storage/websqlstorage.js             >$(TMPDIR)/jio/storage/websqlstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/s3storage.js        >$(TMPDIR)/jio/storage/s3storage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/splitstorage.js     >$(TMPDIR)/jio/storage/splitstorage.min.js 2>/dev/null
	@$(UGLIFY) src/jio.storage/xwikistorage.js     >$(TMPDIR)/jio/storage/xwikistorage.min.js 2>/dev/null
	@cd $(TMPDIR) && zip -q $(ZIP_MINI) -r jio
	@mv $(TMPDIR)/$(ZIP_MINI) ./
	@rm -rf $(TMPDIR)



.phony: clean
clean:
	find -name '*~' -delete

realclean:
	rm -f "$(JIO)"
	rm -f "$(JIO_MIN)"
	rm -f "$(JIODATE_MIN)"
	rm -f "$(PARSER_OUT)"
