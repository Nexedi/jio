(function () { var jioWaitStorageLoader = function ( jIO ) {

    var newWaitStorage = function ( spec, my ) {
        var that = my.basicStorage( spec, my ), priv = {};

        var validatestate_sub_storage = spec.storage || false;
        priv.sub_storage_spec = spec.storage || {type:'base'};
        priv.delay = spec.delay || 5000;
        priv.save = spec.save || true;
        priv.load = spec.load || false;
        priv.getlist = spec.getlist || false;
        priv.remove = spec.remove || false;

        that.validateState = function () {
            if (!validatestate_sub_storage) {
                return 'Need at least one parameter: "storage" '+
                    'containing storage specifications.';
            }
            return '';
        };

        that.specToStore = function () {
            var o = {};
            o.delay = priv.delay;
            o.storage = priv.sub_storage_spec;
            o.save = priv.save;
            o.load = priv.load;
            o.getlist = priv.getlist;
            o.remove = priv.remove;
            return o;
        };

        priv.doJob = function (command,timeout_or_not_timeout) {
            var delay = 0;
            if (timeout_or_not_timeout) {
                delay = priv.delay;
            }
            setTimeout (function () {
                that.addJob ( that.newStorage(priv.sub_storage_spec),
                              command );
                that.end();
            }, delay);
        };

        that.saveDocument = function (command) {
            priv.doJob (command,priv.save);
        }; // end saveDocument

        that.loadDocument = function (command) {
            priv.doJob (command,priv.load);
        }; // end loadDocument

        that.getDocumentList = function (command) {
            priv.doJob (command,priv.getlist);
        }; // end getDocumentList

        that.removeDocument = function (command) {
            priv.doJob (command,priv.remove);
        }; // end removeDocument
        return that;
    };

    Jio.addStorageType('wait', newWaitStorage);
};

if (window.requirejs) {
    define ('JIOWaitStorages',['jIO'], jioWaitStorageLoader);
} else {
    jioWaitStorageLoader ( jIO );
}

}());
