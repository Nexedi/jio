/**
 * JIO Local Storage. Type = 'local'.
 * Local browser "database" storage.
 */
var newLocalStorage = function (spec, my) {

    spec = spec || {};
    var that, priv, localstorage;
    that = my.basicStorage(spec, my);
    priv = {};

    /*
     * Wrapper for the localStorage used to simplify instion of any kind of
     * values
     */
    localstorage = {
        getItem: function (item) {
            return JSON.parse(localStorage.getItem(item));
        },
        setItem: function (item, value) {
            return localStorage.setItem(item, JSON.stringify(value));
        },
        deleteItem: function (item) {
            delete localStorage[item];
        }
    };

    // attributes
    priv.username = spec.username || '';
    priv.applicationname = spec.applicationname || 'untitled';

    priv.localpath = 'jio/localstorage/' +
        priv.username + '/' + priv.applicationname;

    // ==================== Tools ====================
    /**
     * Update [doc] the document object and remove [doc] keys
     * which are not in [new_doc]. It only changes [doc] keys not starting
     * with an underscore.
     * ex: doc:     {key:value1,_key:value2} with
     *     new_doc: {key:value3,_key:value4} updates
     *     doc:     {key:value3,_key:value2}.
     * @param  {object} doc The original document object.
     * @param  {object} new_doc The new document object
     */
    priv.documentObjectUpdate = function (doc, new_doc) {
        var k;
        for (k in doc) {
            if (k[0] !== '_') {
                delete doc[k];
            }
        }
        for (k in new_doc) {
            if (k[0] !== '_') {
                doc[k] = new_doc[k];
            }
        }
    };

    // ===================== overrides ======================
    that.serialized = function () {
        return {
            "applicationname": priv.applicationname,
            "username": priv.username
        };
    };

    that.validateState = function() {
        if (typeof priv.username === "string" &&
            priv.username !== '') {
            return '';
        }
        return 'Need at least one parameter: "username".';
    };

    // ==================== commands ====================
    /**
     * Create a document in local storage.
     * @method post
     * @param  {object} command The JIO command
     */
    that.post = function (command) {
        setTimeout (function () {
            var doc;
            doc = localstorage.getItem(
                priv.localpath + "/" + command.getDocId());
            if (typeof doc === "undefined") {
                // the document does not exists
                localstorage.setItem(
                    priv.localpath + "/" + command.getDocId(),
                    command.cloneDoc());
                that.success({"ok":true,"id":command.getDocId()});
            } else {
                // the document already exists
                that.error({
                    "status": 409,
                    "statusText": "Conflicts",
                    "error": "conflicts",
                    "message": "Cannot create a new document",
                    "reason": "Document already exists"
                });
            }
        });
    };

    /**
     * Create or update a document in local storage.
     * @method put
     * @param  {object} command The JIO command
     */
    that.put = function (command) {
        setTimeout(function () {
            var doc;
            doc = localstorage.getItem(
                priv.localpath + "/" + command.getDocId());
            if (typeof doc === "undefined") {
                //  the document does not exists
                doc = command.cloneDoc();
            } else {
                // the document already exists
                priv.documentObjectUpdate(doc, command.getDocId());
            }
            // write
            localstorage.setItem(
                priv.localpath + "/" + command.getDocId(),
                doc);
            that.success({"ok":true,"id":command.getDocId()});
        });
    };

    /**
     * Add an attachment to a document
     * @method  putAttachment
     * @param  {object} command The JIO command
     */
    that.putAttachment = function (command) {
        setTimeout(function () {
            var doc;
            doc = localstorage.getItem(
                priv.localpath + "/" + command.getDocId());
            if (typeof doc === "undefined") {
                //  the document does not exists
                that.error({
                    "status": 404,
                    "statusText": "Not Found",
                    "error": "not_found",
                    "message": "Impossible to add attachment",
                    "reason": "Document not found"
                });
                return;
            } else {
                // the document already exists
                doc["_attachments"] = doc["_attachments"] || {};
                doc["_attachments"][command.getAttachmentId()] = {
                    "content_type": command.getAttachmentMimeType(),
                    "digest": "md5-"+command.md5SumAttachmentData(),
                    "length": command.getAttachmentLength()
                };
            }
            // upload data
            localstorage.setItem(
                priv.localpath + "/" + command.getAttachmentId(),
                command.getAttachmentData());
            // write document
            localstorage.setItem(
                priv.localpath + "/" + command.getDocId(),
                doc);
            that.success({
                "ok":true,
                "_id":command.getDocId()+"/"+command.getAttachmentId()
            });
        });
    };

    /**
     * Get a document or attachment
     * @method  get
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     */
    that._get = function (command) {
        setTimeout (function () {
            that.success( priv.getDocument(command) );
        });

    };

    /**
     * Remove a document or attachment
     * @method  remove
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     */
    that._remove = function (command) {
        setTimeout (function () {
            that.success( priv.deleteDocument(command) );
        });
    };

    /**
     * get all filenames belonging to a user from the document index
     * @method  allDocs
     * @param  {object} command The JIO command
     *
     * Available options:
     * - {boolean} conflicts Add a conflicts object to the response
     * - {boolean} revs Add the revisions history of the document
     * - {boolean} revs_info Add revisions informations
     * - {boolean} include_docs Include documents with index
     */
    that._allDocs = function (command) {
        setTimeout(function () {
            var new_array = [],
                array = priv.getFileNameArray(),
                i,l,
                path = 'jio/local/'+priv.username+'/'+priv.applicationname,
                include_docs = command.getOption('include_docs'),
                doc, item;

            for (i = 0, l = array.length; i < l; i += 1) {
                item = array[i];

                if (include_docs === true){
                    doc = that._get(path+'/'+item.id+'/'+item.value.key );
                    new_array.push({
                        "id":item.id,
                        "key":item.key,
                        "value":item.value,
                        "doc":doc
                    });
                } else {
                    new_array.push({
                        "id":item.id,
                        "key":item.key,
                        "value":item.value
                    });
                }
            }
            that.success ({total_rows:new_array.length,rows:new_array});
        });
    };

    return that;
};
jIO.addStorageType('local', newLocalStorage);
