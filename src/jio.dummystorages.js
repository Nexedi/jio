/*global window, define */
// Adds 5 dummy storages to JIO
// type:
//     - dummyallok
//     - dummyallfail
//     - dummyallnotfound
//     - dummyall3tries
//     - dummyalldocs
//     - dummyallfound
(function () {
    'use strict';
    var jioDummyStorageLoader = function (jIO) {

        /////////////////////////////////////////////////////////////////
        // Dummy Storage 1 : all ok
        var newDummyStorageAllOk = function (spec, my) {
            var that = my.basicStorage(spec, my);

            that.specToStore = function () {
                return {
                    "username": spec.username
                };
            };

            that.post = function (command) {
                window.setTimeout(function () {
                    that.success({
                        "ok": true,
                        "id": command.getDocId()
                    });
                }, 100); // 100 ms, for jiotests simple job waiting
            }; // end post

            that.put = function (command) {
                window.setTimeout(function () {
                    that.success({
                        "ok": true,
                        "id": command.getDocId()
                    });
                }, 100); // 100 ms, for jiotests simple job waiting
            }; // end put

            that.putAttachment = function (command) {
                window.setTimeout(function () {
                    that.success({
                        "ok": true,
                        "id": command.getDocId() + "/" +
                            command.getAttachmentId()
                    });
                }, 100); // 100 ms, for jiotests simple job waiting
            }; // end putAttachment

            that.get = function (command) {
                window.setTimeout(function () {
                    if (command.getAttachmentId()) {
                        return that.success('0123456789');
                    }
                    that.success({
                        "_id": command.getDocId(),
                        "title": 'get_title'
                    });
                }, 100); // 100 ms, for jiotests simple job waiting
            }; // end get

            that.allDocs = function (command) {
                window.setTimeout(function () {
                    that.error({
                        "status": 405,
                        "statusText": "Method Not Allowed",
                        "error": "method_not_allowed",
                        "message": "Your are not allowed to use" +
                            "this command",
                        "reason": "LocalStorage forbids AllDocs" +
                            "command executions"
                    });
                });
            }; // end allDocs

            that.remove = function (command) {
                window.setTimeout(function () {
                    if (command.getAttachmentId()) {
                        that.success({
                            "ok": true,
                            "id": command.getDocId() + "/" +
                                command.getAttachmentId()
                        });
                    } else {
                        that.success({
                            "ok": true,
                            "id": command.getDocId()
                        });
                    }
                }, 100); // 100 ms, for jiotests simple job waiting
            }; // end remove

            return that;
        },
        // end Dummy Storage All Ok

        /////////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////////
        // Dummy Storage 2 : all fail
            newDummyStorageAllFail = function (spec, my) {
                var that = my.basicStorage(spec, my),
                    priv = {};

                priv.error = function () {
                    window.setTimeout(function () {
                        that.error({
                            status: 0,
                            statusText: 'Unknown Error',
                            error: 'unknown_error',
                            message: 'Execution encountred an error.',
                            reason: 'Execution encountred an error'
                        });
                    }, 100);
                };

                that.post = function (command) {
                    priv.error();
                }; // end post

                that.put = function (command) {
                    priv.error();
                }; // end put

                that.putAttachment = function (command) {
                    priv.error();
                }; // end put

                that.get = function (command) {
                    priv.error();
                }; // end get

                that.allDocs = function (command) {
                    window.setTimeout(function () {
                        that.error({
                            "status": 405,
                            "statusText": "Method Not Allowed",
                            "error": "method_not_allowed",
                            "message": "Your are not allowed to use" +
                                "this command",
                            "reason": "LocalStorage forbids AllDocs" +
                                "command executions"
                        });
                    });
                }; // end allDocs

                that.remove = function (command) {
                    priv.error();
                }; // end remove
                return that;
            },
        // end Dummy Storage All Fail
        /////////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////////
        // Dummy Storage 3 : all not found
            newDummyStorageAllNotFound = function (spec, my) {
                var that = my.basicStorage(spec, my);

                that.post = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId()
                        });
                    }, 100);
                }; // end post

                that.put = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId()
                        });
                    }, 100);
                }; // end put

                that.putAttachment = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId() + "/" +
                                command.getAttachmentId()
                        });
                    }, 100);
                }; // end put

                that.get = function (command) {
                    window.setTimeout(function () {
                        that.error({
                            "status": 404,
                            "statusText": "Not Found",
                            "error": "not_found",
                            "message": "Document '" + command.getDocId() +
                                "' not found",
                            "reason": "Document '" + command.getDocId() +
                                "'does not exist"
                        });
                    }, 100);
                }; // end get
                that.allDocs = function (command) {
                    window.setTimeout(function () {
                        that.error({
                            "status": 405,
                            "statusText": "Method Not Allowed",
                            "error": "method_not_allowed",
                            "message": "Your are not allowed to use" +
                                "this command",
                            "reason": "LocalStorage forbids AllDocs" +
                                "command executions"
                        });
                    });
                }; // end allDocs
                that.remove = function (command) {
                    window.setTimeout(function () {
                        that.error({
                            "status": 404,
                            "statusText": "Not Found",
                            "error": "not_found",
                            "message": "Cannot remove an unexistant" +
                                "document",
                            "reason": "missing" // or deleted
                        });
                    }, 100);
                }; // end remove
                return that;
            },
        // end Dummy Storage All Not Found
        /////////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////////
        // Dummy Storage 4 : all 3 tries
            newDummyStorageAll3Tries = function (spec, my) {
                var that = my.basicStorage(spec, my),
                    priv = {};
                // this specToStore method is used to make simple
                // difference between two dummyall3tries storages:
                // so  {type:'dummyall3tries',a:'b'} differs from
                //     {type:'dummyall3tries',c:'d'}.
                that.specToStore = function () {
                    return {
                        "application_name": spec.application_name
                    };
                };
                priv.doJob = function (command, if_ok_return) {
                    // wait a little to simulate asynchronous operation
                    window.setTimeout(function () {
                        priv.Try3OKElseFail(command.getTried(),
                            if_ok_return);
                    }, 100);
                };
                priv.Try3OKElseFail = function (tries, if_ok_return) {
                    if (tries === 'undefined') {
                        return that.error({
                            "status": 0,
                            "statusText": "Unknown Error",
                            "error": "unknown_error",
                            "message": "Cannot get tried",
                            "reason": "Unknown"
                        });
                    }
                    if (tries < 3) {
                        return that.retry({
                            message: 'Now' + (3 - tries) + ' tries left.'
                        });
                    }
                    if (tries === 3) {
                        return that.success(if_ok_return);
                    }
                    if (tries > 3) {
                        return that.error({
                            "status": 1,
                            "statusText": "Too Much Tries",
                            "error": "too_much_tries",
                            "message": "Too much tries",
                            "reason": "Too much tries"
                        });
                    }
                };
                that.post = function (command) {
                    priv.doJob(command, {
                        "ok": true,
                        "id": command.getDocId()
                    });
                }; // end post
                that.put = function (command) {
                    priv.doJob(command, {
                        "ok": true,
                        "id": command.getDocId()
                    });
                }; // end put
                that.putAttachment = function (command) {
                    priv.doJob(command, {
                        "ok": true,
                        "id": command.getDocId() + "/" +
                            command.getAttachmentId()
                    });
                }; // end put
                that.get = function (command) {
                    if (command.getAttachmentId()) {
                        priv.doJob(command, "0123456789");
                    } else {
                        priv.doJob(command, {
                            "_id": command.getDocId(),
                            "title": 'Title of ' + command.getDocId()
                        });
                    }
                }; // end get
                that.allDocs = function (command) {
                    window.setTimeout(function () {
                        that.error({
                            "status": 405,
                            "statusText": "Method Not Allowed",
                            "error": "method_not_allowed",
                            "message": "Your are not allowed to use" +
                                "this command",
                            "reason": "LocalStorage forbids AllDocs" +
                                "command executions"
                        });
                    });
                }; // end allDocs
                that.remove = function (command) {
                    if (command.getAttachmentId()) {
                        priv.doJob(command, {
                            "ok": true,
                            "id": command.getDocId() + "/" +
                                command.getAttachmentId()
                        });
                    } else {
                        priv.doJob(command, {
                            "ok": true,
                            "id": command.getDocId()
                        });
                    }
                }; // end remove
                return that;
            },
        // end Dummy Storage All 3 Tries
        /////////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////////
        // Dummy Storage 5 : all docs
            newDummyStorageAllDocs = function (spec, my) {
                var that = my.basicStorage(spec, my);
                that.specToStore = function () {
                    return {
                        "username": spec.username
                    };
                };
                that.post = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId()
                        });
                    }, 100); // 100 ms, for jiotests simple job waiting
                }; // end post
                that.put = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId()
                        });
                    }, 100); // 100 ms, for jiotests simple job waiting
                }; // end put
                that.putAttachment = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId() + "/" +
                                command.getAttachmentId()
                        });
                    }, 100); // 100 ms, for jiotests simple job waiting
                }; // end putAttachment
                that.get = function (command) {
                    window.setTimeout(function () {
                        if (command.getAttachmentId()) {
                            return that.success('0123456789');
                        }
                        that.success({
                            "_id": command.getDocId(),
                            "title": "get_title"
                        });
                    }, 100); // 100 ms, for jiotests simple job waiting
                }; // end get
                that.allDocs = function (command) {
                    window.setTimeout(function () {
                        var addRow,
                            o = {
                                "total_rows": 0,
                                "rows": []
                            };
                        addRow = function (id, key, doc) {
                            var row = {
                                    "id": "file",
                                    "key": "file",
                                    "value": {}
                                };
                            if (command.getOption("include_docs")) {
                                row.doc = doc;
                            }
                            o.rows.push(row);
                            o.total_rows += 1;
                        };
                        addRow("file", "file", {
                            "_id": "file",
                            "Title": "myFile"
                        });
                        addRow("mylongtitledfilethatidontliketowriteby" +
                            "handonablackboard", "mylongtialias1", {
                                "_id": "mylongtitledfilethatidontlike" +
                                    "towritebyhandonablackboard",
                                "Title": "myLongFile"
                            });
                        that.success(o);
                    });
                }; // end allDocs
                that.remove = function (command) {
                    window.setTimeout(function () {
                        if (command.getAttachmentId()) {
                            that.success({
                                "ok": true,
                                "id": command.getDocId() + "/" +
                                    command.getAttachmentId()
                            });
                        } else {
                            that.success({
                                "ok": true,
                                "id": command.getDocId()
                            });
                        }
                    }, 100); // 100 ms, for jiotests simple job waiting
                }; // end remove
                return that;
            },
        // end Dummy Storage All Docs
        /////////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////////
        // Dummy Storage 6 : all found
            newDummyStorageAllFound = function (spec, my) {
                var that = my.basicStorage(spec, my);

                that.post = function (command) {
                    window.setTimeout(function () {
                        that.error({
                            "status": 409,
                            "statusText": "Conflicts",
                            "error": "conflicts",
                            "message": "Cannot create a new document",
                            "reason": "Document already exists"
                        });
                    }, 100);
                }; // end post
                that.put = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId()
                        });
                    }, 100);
                }; // end put
                that.putAttachment = function (command) {
                    window.setTimeout(function () {
                        that.success({
                            "ok": true,
                            "id": command.getDocId() + "/" +
                                command.getAttachmentId()
                        });
                    }, 100);
                }; // end put
                that.get = function (command) {
                    window.setTimeout(function () {
                        if (command.getAttachmentId()) {
                            return that.success('0123456789');
                        }
                        that.success({
                            "_id": command.getDocId(),
                            "title": 'get_title'
                        });
                    }, 100); // 100 ms, for jiotests simple job waiting
                }; // end get
                that.allDocs = function (command) {
                    window.setTimeout(function () {
                        that.error({
                            "status": 405,
                            "statusText": "Method Not Allowed",
                            "error": "method_not_allowed",
                            "message": "Your are not allowed to use" +
                                "this command",
                            "reason": "LocalStorage forbids AllDocs" +
                                "command executions"
                        });
                    });
                }; // end allDocs
                that.remove = function (command) {
                    window.setTimeout(function () {
                        if (command.getAttachmentId()) {
                            that.success({
                                "ok": true,
                                "id": command.getDocId() + "/" +
                                    command.getAttachmentId()
                            });
                        } else {
                            that.success({
                                "ok": true,
                                "id": command.getDocId()
                            });
                        }
                    }, 100); // 100 ms, for jiotests simple job waiting
                }; // end remove
                return that;
            };
        // end Dummy Storage All Not Found
        /////////////////////////////////////////////////////////////////
        // add key to storageObjectType of global jio
        jIO.addStorageType('dummyallok', newDummyStorageAllOk);
        jIO.addStorageType('dummyallfail', newDummyStorageAllFail);
        jIO.addStorageType('dummyallnotfound',
            newDummyStorageAllNotFound);
        jIO.addStorageType('dummyall3tries', newDummyStorageAll3Tries);
        jIO.addStorageType('dummyalldocs', newDummyStorageAllDocs);
        jIO.addStorageType('dummyallfound', newDummyStorageAllFound);
    };
    if (window.requirejs) {
        define('JIODummyStorages', ['jIO'], jioDummyStorageLoader);
    } else {
        jioDummyStorageLoader(jIO);
    }
}());