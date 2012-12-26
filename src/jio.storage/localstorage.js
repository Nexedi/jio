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

    /**
     * Checks if an object has no enumerable keys
     * @method objectIsEmpty
     * @param  {object} obj The object
     * @return {boolean} true if empty, else false
     */
    priv.objectIsEmpty = function (obj) {
        var k;
        for (k in obj) {
            return false;
        }
        return true;
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
            var doc = command.getDocId();
            if (!(typeof doc === "string" && doc !== "")) {
                that.error({
                    "status": 405,
                    "statusText": "Method Not Allowed",
                    "error": "method_not_allowed",
                    "message": "Cannot create document which id is undefined",
                    "reason": "Document id is undefined"
                });
                return;
            }
            doc = localstorage.getItem(
                priv.localpath + "/" + doc);
            if (doc === null) {
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
            if (doc === null) {
                //  the document does not exists
                doc = command.cloneDoc();
            } else {
                // the document already exists
                priv.documentObjectUpdate(doc, command.cloneDoc());
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
            if (doc === null) {
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
                priv.localpath + "/" + command.getDocId() + "/" +
                    command.getAttachmentId(),
                command.getAttachmentData()
            );
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
     * @method get
     * @param  {object} command The JIO command
     */
    that.get = function (command) {
        setTimeout (function () {
            var doc;
            if (typeof command.getAttachmentId() === "string") {
                // seeking for an attachment
                doc = localstorage.getItem(
                    priv.localpath + "/" + command.getDocId() + "/" +
                        command.getAttachmentId());
                if (doc !== null) {
                    that.success(doc);
                } else {
                    that.error({
                        "status": 404,
                        "statusText": "Not Found",
                        "error": "not_found",
                        "message": "Cannot find the attachment ",
                        "reason": "attachment does not exists"
                    });
                }
            } else {
                // seeking for a document
                doc = localstorage.getItem(
                    priv.localpath + "/" + command.getDocId());
                if (doc !== null) {
                    that.success(doc);
                } else {
                    that.error({
                        "status": 404,
                        "statusText": "Not Found",
                        "error": "not_found",
                        "message": "Cannot find the document",
                        "reason": "Document does not exists"
                    });
                }
            }
        });
    };

    /**
     * Remove a document or attachment
     * @method remove
     * @param  {object} command The JIO command
     */
    that.remove = function (command) {
        setTimeout (function () {
            var doc;
            doc = localstorage.getItem(
                priv.localpath + "/" + command.getDocId());
            if (typeof command.getAttachmentId() === "string") {
                // seeking for an attachment
                localstorage.deleteItem(
                    priv.localpath + "/" + command.getDocId() + "/" +
                        command.getAttachmentId());
                // remove attachment from document
                if (doc !== null && typeof doc === "object" &&
                    typeof doc["_attachments"] === "object") {
                    delete doc["_attachments"][command.getAttachmentId()];
                    if (priv.objectIsEmpty(doc["_attachments"])) {
                        delete doc["_attachments"];
                    }
                    localstorage.setItem(
                        priv.localpath + "/" + command.getDocId(),
                        doc);
                }
                that.success({
                    "ok": true,
                    "id": command.getDocId()+"/"+command.getAttachmentId()
                });
            } else {
                // seeking for a document
                var attachment_list = [], i;
                if (doc !== null && typeof doc === "object" &&
                    typeof doc["_attachments"] === "object") {
                    // prepare list of attachments
                    for (i in doc["_attachments"]) {
                        attachment_list.push(i);
                    }
                }
                localstorage.deleteItem(
                    priv.localpath + "/" + command.getDocId());
                // delete all attachments
                for (i = 0; i < attachment_list.length; i += 1) {
                    localstorage.deleteItem(
                        priv.localpath+"/"+command.getDocId()+"/"+
                            attachment_list[i]);
                }
                that.success({
                    "ok": true,
                    "id": command.getDocId()
                });
            }
        });
    };

    /**
     * Get all filenames belonging to a user from the document index
     * @method allDocs
     * @param  {object} command The JIO command
     */
    that.allDocs = function (command) {
        setTimeout(function () {
            that.error({
                "status": 405,
                "statusText": "Method Not Allowed",
                "error": "method_not_allowed",
                "message": "Your are not allowed to use this command",
                "reason": "LocalStorage forbids AllDocs command executions"
            });
        });
    };

    return that;
};
jIO.addStorageType('local', newLocalStorage);
